/*
	Control Room: recording writer (worker)
	=======================================
	Holds the only kind of file handle in a browser that commits as it goes.

	A FileSystemSyncAccessHandle writes through to storage on every call, so the bytes
	are on disk the instant they are written. Everything else available to a web page
	buffers the whole recording and commits it when the stream is closed, which is worth
	knowing because it is the difference between a crashed show costing you a few seconds
	and costing you the entire episode. Measured, not assumed: writing 256KB at a time
	through this handle, the file's size went 256KB, 512KB, 768KB, 1MB while it was still
	open, where the same writes through createWritable left it at zero until close.

	Sync access handles exist only inside a worker and only on the origin private file
	system, which is why this file exists at all. The recording is written here and
	copied out to wherever the guest wants it when the show ends.

	Messages in:  open {name} | write {buf} | close | size | delete {name} | list
	Messages out: {id, ok, ...} for every request, plus {evt:"error"} if a write fails.
*/
"use strict";

let handle = null;      // the open sync access handle
let offset = 0;         // where the next write goes
let openName = "";

async function root() {
	return await navigator.storage.getDirectory();
}

async function openFile(name) {
	if (handle) { try { handle.close(); } catch (e) {} handle = null; }
	const dir = await root();
	const fh = await dir.getFileHandle(name, { create: true });
	handle = await fh.createSyncAccessHandle();
	// Always start a take from nothing. A half-written file from a previous attempt
	// with the same name would otherwise leave its tail stuck on the end of this one.
	handle.truncate(0);
	offset = 0;
	openName = name;
	return { name, size: 0 };
}

function writeChunk(buf) {
	if (!handle) throw new Error("no open recording file");
	const view = new Uint8Array(buf);
	// write() can legally write fewer bytes than it was given, so keep going until the
	// chunk is actually down. Dropping the remainder would corrupt the stream quietly.
	let written = 0;
	while (written < view.length) {
		const n = handle.write(view.subarray(written), { at: offset + written });
		if (!n) throw new Error("write stalled at byte " + (offset + written));
		written += n;
	}
	offset += written;
	return offset;
}

function closeFile() {
	if (!handle) return { size: offset, name: openName };
	try { handle.flush(); } catch (e) {}
	const size = handle.getSize();
	handle.close();
	handle = null;
	const name = openName;
	openName = "";
	return { size, name };
}

async function listFiles() {
	const dir = await root();
	const out = [];
	for await (const [name, h] of dir.entries()) {
		if (h.kind !== "file" || !/\.webm$/i.test(name)) continue;
		// The file currently being recorded is not "left over", so leave it out.
		if (name === openName) continue;
		try { const f = await h.getFile(); out.push({ name, size: f.size, at: f.lastModified }); }
		catch (e) {}
	}
	out.sort((a, b) => b.at - a.at);
	return out;
}

async function deleteFile(name) {
	if (name === openName) closeFile();
	const dir = await root();
	await dir.removeEntry(name);
	return { name };
}

self.onmessage = async ev => {
	const { id, cmd } = ev.data || {};
	try {
		let res;
		if (cmd === "open") res = await openFile(ev.data.name);
		else if (cmd === "write") res = { size: writeChunk(ev.data.buf) };
		else if (cmd === "close") res = closeFile();
		else if (cmd === "size") res = { size: handle ? handle.getSize() : offset };
		else if (cmd === "list") res = { files: await listFiles() };
		else if (cmd === "delete") res = await deleteFile(ev.data.name);
		else throw new Error("unknown command: " + cmd);
		self.postMessage(Object.assign({ id, ok: true }, res));
	} catch (e) {
		// A failed write is not recoverable for this take: say so loudly rather than
		// letting the recording quietly continue into nothing.
		if (cmd === "write") self.postMessage({ evt: "error", why: String(e && e.message || e) });
		self.postMessage({ id, ok: false, err: String(e && e.message || e) });
	}
};
