/*
	Control Room: guest recording
	=============================
	Records the guest's own camera and microphone, at whatever the camera actually
	captures, straight to disk. Nothing here touches the live call: MediaRecorder encodes
	a second copy of a stream the browser already holds, so the picture the room sees and
	the picture that gets recorded are independent. A bad connection cannot spoil the
	recording, and the recording cannot spoil the call.

	Why this exists rather than using VDO.Ninja's own recorder
	---------------------------------------------------------
	VDO's recorder writes through StreamSaver, a service worker pretending to be a
	download. It works until it doesn't, and VDO carries its own "Recording download
	setup failed" alert for when it doesn't. It also puts the browser's download UI in
	the middle of a live show.

	More importantly, we want to own the lifecycle. VDO restarts a failed recording from
	a timer nothing outside it can cancel, which is what caused a stopped recording to
	come back to life mid show.

	Where the bytes go, and why
	---------------------------
	Straight into the origin private file system through a worker, because a sync access
	handle is the only writer in a browser that commits as it goes (see rec-worker.js).
	That means a browser crash costs you the last few seconds rather than the episode,
	and WebM survives being cut off mid file: a truncated, never-closed recording still
	loads and still decodes. WebM is Matroska, which is the same reason a crashed OBS
	recording is still usable.

	The cost of that choice is the one thing to keep in mind: the recording lives in
	browser storage until the guest saves it out, so it needs room for both copies while
	it is being saved, and browser storage is quota limited. quota() reports what is
	actually available so the guest can be warned before a show rather than during one.
*/
"use strict";

const StudioRec = (() => {
	let worker = null, mr = null, chain = Promise.resolve();
	let state = "off";          // off | starting | on | stopping | error
	let current = null;         // { name, startedAt }
	let lastError = null;
	let onChange = null;
	let seq = 0;
	const pending = new Map();

	function supported() {
		return !!(window.Worker && window.MediaRecorder &&
			navigator.storage && navigator.storage.getDirectory);
	}

	function ensureWorker() {
		if (worker) return worker;
		worker = new Worker("rec-worker.js");
		worker.onmessage = ev => {
			const d = ev.data || {};
			if (d.evt === "error") { fail(d.why); return; }
			const p = pending.get(d.id);
			if (!p) return;
			pending.delete(d.id);
			d.ok ? p.resolve(d) : p.reject(new Error(d.err));
		};
		worker.onerror = e => fail("recording worker failed: " + (e.message || "unknown"));
		return worker;
	}

	function ask(cmd, payload, transfer) {
		const id = ++seq;
		const msg = Object.assign({ id, cmd }, payload || {});
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			ensureWorker().postMessage(msg, transfer || []);
			setTimeout(() => {
				if (pending.has(id)) { pending.delete(id); reject(new Error(cmd + " timed out")); }
			}, 20000);
		});
	}

	function set(s) { if (state !== s) { state = s; if (onChange) try { onChange(s); } catch (e) {} } }
	function fail(why) { lastError = why; set("error"); }

	/* ---------- codec ----------
	   VP8 on purpose. H.264 reports as supported on machines whose hardware encoder then
	   throws partway through a take, which looks exactly like a recording that keeps
	   stopping and restarting itself. VDO defaults to VP8 for the same reason, and it
	   was overriding that default that cost a show's masters once already. */
	function mime() {
		const want = [
			"video/webm;codecs=vp8,opus",
			"video/webm;codecs=vp8",
			"video/webm"
		];
		for (const m of want) if (MediaRecorder.isTypeSupported(m)) return m;
		return "";
	}

	/* ---------- storage ---------- */
	async function quota() {
		try {
			const e = await navigator.storage.estimate();
			const quotaBytes = e.quota || 0, usedBytes = e.usage || 0;
			return { quotaBytes, usedBytes, freeBytes: Math.max(0, quotaBytes - usedBytes) };
		} catch (e) { return { quotaBytes: 0, usedBytes: 0, freeBytes: 0 }; }
	}
	// Minutes of recording the remaining quota can hold at a given video bitrate.
	// Audio is counted too, since at low video bitrates it stops being a rounding error.
	function minutesAt(freeBytes, kbps) {
		const bitsPerSec = (kbps + 128) * 1000;
		return Math.floor(freeBytes * 8 / bitsPerSec / 60);
	}
	async function persist() {
		// Asks the browser not to evict this origin's storage under pressure. It may say
		// no, and the recording still works either way, so the answer is informational.
		try { return !!(navigator.storage.persist && await navigator.storage.persist()); }
		catch (e) { return false; }
	}

	/* ---------- recording ---------- */
	function fileName(label, ext) {
		const d = new Date();
		const p = n => String(n).padStart(2, "0");
		const stamp = d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
			"_" + p(d.getHours()) + p(d.getMinutes());
		const who = (label || "guest").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || "guest";
		return who + "_" + stamp + (ext || ".webm");
	}

	// Name the file after what the recorder is actually producing, not what we asked
	// for. Safari ignores a webm request and hands back MP4, so a guest on an iPad would
	// otherwise send a .webm file that is really an .mp4 and break the conversion script.
	function extensionFor(type) {
		if (/mp4|mpeg-4/i.test(type)) return ".mp4";
		if (/matroska|x-matroska/i.test(type)) return ".mkv";
		return ".webm";
	}

	async function start(stream, opts) {
		opts = opts || {};
		if (state === "on" || state === "starting") return current;
		if (!stream || !stream.getTracks().length) throw new Error("no camera stream to record");
		set("starting");
		lastError = null;

		const type = mime();
		const options = { videoBitsPerSecond: (opts.kbps || 8000) * 1000, audioBitsPerSecond: 192000 };
		if (type) options.mimeType = type;
		// Built before the file is opened, because only the live recorder can say what
		// container it settled on. Audio only takes come through here too: the caller
		// hands us a stream with no video track and MediaRecorder works it out.
		try { mr = new MediaRecorder(stream, options); }
		catch (e) { mr = new MediaRecorder(stream); }

		// MP4 is worth flagging: unlike WebM it needs its index written at the end, so a
		// take that is cut off mid show is not recoverable. That is the cost of recording
		// on an iPad, and the reason guests are pointed at a laptop.
		const actual = mr.mimeType || type || "";
		const name = fileName(opts.label, extensionFor(actual));
		await ask("open", { name });

		chain = Promise.resolve();
		mr.ondataavailable = ev => {
			if (!ev.data || !ev.data.size) return;
			// Writes must not overlap, and they must not race the close, so everything
			// goes through one chain. Transferring the buffer avoids copying megabytes
			// of video across the worker boundary every second.
			chain = chain.then(async () => {
				const buf = await ev.data.arrayBuffer();
				await ask("write", { buf }, [buf]);
			}).catch(e => fail(String(e && e.message || e)));
		};
		mr.onerror = ev => {
			const err = ev && ev.error;
			fail("recorder error: " + ((err && (err.name + (err.message ? ": " + err.message : ""))) || "unknown"));
		};
		mr.start(1000); // a chunk a second: small enough that a crash costs little
		current = { name, startedAt: Date.now() };
		set("on");
		return current;
	}

	async function stop() {
		if (!mr) { set("off"); return null; }
		const rec = mr; mr = null;
		set("stopping");
		try {
			if (rec.state !== "inactive") {
				await new Promise(res => {
					rec.onstop = res;
					try { rec.stop(); } catch (e) { res(); }
					setTimeout(res, 5000); // never hang the guest's page on a stuck recorder
				});
			}
		} catch (e) {}
		try { await chain; } catch (e) {}   // let every queued write land first
		let out = null;
		try { out = await ask("close"); } catch (e) { fail(String(e && e.message || e)); }
		const done = current ? Object.assign({}, current, { size: out && out.size }) : null;
		current = null;
		if (state !== "error") set("off");
		return done;
	}

	/* ---------- getting it out ----------
	   Needs a click: the browser will not open a save dialog without one. */
	async function listSaved() {
		try { const r = await ask("list"); return r.files || []; } catch (e) { return []; }
	}
	async function readFile(name) {
		const dir = await navigator.storage.getDirectory();
		const fh = await dir.getFileHandle(name);
		return await fh.getFile();
	}
	// Streams the recording out of browser storage into a real file, in pieces, so a
	// multi gigabyte take never has to exist in memory as one blob.
	async function saveToDisk(name, onProgress) {
		const file = await readFile(name);
		let writable;
		if (window.showSaveFilePicker) {
			const ext = (name.match(/\.[a-z0-9]+$/i) || [".webm"])[0].toLowerCase();
			const mimeOf = { ".mp4": "video/mp4", ".mkv": "video/x-matroska", ".webm": "video/webm" };
			const accept = {}; accept[mimeOf[ext] || "video/webm"] = [ext];
			const handle = await window.showSaveFilePicker({
				suggestedName: name,
				types: [{ description: "Video", accept: accept }]
			});
			writable = await handle.createWritable();
		} else {
			// No file picker: fall back to an ordinary download of the whole thing.
			const url = URL.createObjectURL(file);
			const a = document.createElement("a");
			a.href = url; a.download = name; a.click();
			setTimeout(() => URL.revokeObjectURL(url), 60000);
			return { downloaded: true, size: file.size };
		}
		const CHUNK = 8 * 1024 * 1024;
		let at = 0;
		while (at < file.size) {
			const slice = file.slice(at, Math.min(at + CHUNK, file.size));
			await writable.write(await slice.arrayBuffer());
			at += CHUNK;
			if (onProgress) try { onProgress(Math.min(at, file.size), file.size); } catch (e) {}
		}
		await writable.close();
		return { saved: true, size: file.size };
	}
	async function discard(name) { try { await ask("delete", { name }); return true; } catch (e) { return false; } }

	return {
		supported, quota, minutesAt, persist,
		start, stop,
		state: () => state,
		error: () => lastError,
		currentName: () => current && current.name,
		startedAt: () => current && current.startedAt,
		listSaved, saveToDisk, discard,
		set onstatechange(fn) { onChange = fn; },
		get onstatechange() { return onChange; }
	};
})();
