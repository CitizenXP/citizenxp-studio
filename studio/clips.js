/* Shared clip engine, used by the guest page and by the OBS clip source.

   Why clips are not streamed
   --------------------------
   Publishing a clip into the room as another WebRTC source makes the producer's
   machine encode it and upload one full copy to every guest and to OBS, on top of
   the camera it is already sending and the guest streams it is receiving. A home
   uplink cannot carry that, and WebRTC's congestion control responds by degrading
   the whole room, so the clip stutters AND everyone's camera gets worse at the
   same moment.

   Here every participant fetches the clip once from the CDN that serves the studio
   and plays their own copy. The call carries only the handful of bytes in a play
   command, so a clip costs the room no bandwidth and everyone sees full quality.
   The cost is that playback has to be kept in step, which SYNC below handles. */
(function () {
	"use strict";

	var MANIFEST = "clips/clips.json";
	var DRIFT = 0.75; // seconds out of step before a receiver quietly re-seeks

	function create(opts) {
		var layer = opts.layer;             // element that holds the players
		var video = opts.video;             // <video> for file clips
		var ytBox = opts.yt;                // <div> the YouTube player replaces
		var stage = opts.stage;             // element carrying the "clipOn" class
		var busyEl = opts.busy || null;     // optional spinner wrapper
		var busyText = opts.busyText || null;
		var report = opts.onReport || function () {};
		var onShow = opts.onShow || function () {};

		var manifest = null, current = null, yt = null, ytReady = false, ytApi = null;
		var playing = false;   // something is on air: staging must not touch the element
		var cached = {};    // clip url -> blob url
		var prepping = {};  // clip id -> in-flight prepare promise

		function setBusy(on, text) {
			if (busyEl) busyEl.classList.toggle("busy", !!on);
			if (text && busyText) busyText.textContent = text;
		}

		function getManifest() {
			if (manifest) return Promise.resolve(manifest);
			return fetch(MANIFEST, { cache: "no-cache" })
				.then(function (r) { return r.ok ? r.json() : []; })
				.catch(function () { return []; })
				.then(function (list) { manifest = Array.isArray(list) ? list : []; return manifest; });
		}

		function find(id) {
			return getManifest().then(function (list) {
				for (var i = 0; i < list.length; i++) {
					if (String(list[i].id) === String(id)) return list[i];
				}
				return null;
			});
		}

		function loadYtApi() {
			if (window.YT && window.YT.Player) { ytReady = true; return Promise.resolve(); }
			if (ytApi) return ytApi;
			ytApi = new Promise(function (resolve) {
				var prev = window.onYouTubeIframeAPIReady;
				window.onYouTubeIframeAPIReady = function () {
					ytReady = true;
					if (typeof prev === "function") { try { prev(); } catch (e) {} }
					resolve();
				};
				var s = document.createElement("script");
				s.src = "https://www.youtube.com/iframe_api";
				document.head.appendChild(s);
				setTimeout(resolve, 8000); // never hang a live show on a third party
			});
			return ytApi;
		}

		// Hold the whole clip in the page as a blob rather than trusting the HTTP cache.
		// Two things make the cache unreliable for this: a <video> element fetches by
		// byte range, which is a different cache entry from the plain GET a preload
		// makes, and GitHub Pages only marks these files cacheable for ten minutes, so
		// a clip preloaded in the green room can be gone by the time it is played. A
		// blob URL is immune to both, and playback then starts from memory instantly.
		function prefetch(url) {
			if (cached[url]) return Promise.resolve(cached[url]);
			return fetch(url)
				.then(function (r) { return r.ok ? r.blob() : null; })
				.then(function (b) {
					if (!b || !b.size) return null;
					cached[url] = URL.createObjectURL(b);
					return cached[url];
				})
				.catch(function () { return null; }); // fall back to streaming from the network
		}

		// Preparing is cached per clip and returns a promise that only settles once the
		// element actually has a source. Without that, a PLAY arriving while a LOAD is
		// still downloading would call play() on an empty element, which rejects, and
		// the guest would sit frozen until the next sync heartbeat rescued them.
		function prepare(id) {
			if (prepping[id]) return prepping[id];
			var p = prepareNow(id).catch(function (e) { delete prepping[id]; throw e; });
			prepping[id] = p;
			return p;
		}

		function prepareNow(id) {
			return find(id).then(function (c) {
				if (!c) { report("fail", "clip " + id + " is not published"); return null; }
				current = c;
				if (c.type === "youtube") {
					return loadYtApi().then(function () {
						if (!ytReady) { report("fail", "youtube unavailable"); return null; }
						video.style.display = "none";
						ytBox.style.display = "block";
						if (yt && yt.cueVideoById) {
							yt.cueVideoById(c.src);
						} else {
							yt = new window.YT.Player(ytBox, {
								videoId: c.src,
								playerVars: { controls: 0, disablekb: 1, modestbranding: 1, rel: 0, playsinline: 1, fs: 0 }
							});
						}
						report("ready", id);
						return c;
					});
				}
				var url = "clips/" + c.src;
				setBusy(true, "Loading clip");
				return prefetch(url).then(function (blobUrl) {
					setBusy(false);
					if (!blobUrl) { report("fail", "could not download the clip"); return c; }

					// Queuing must never disturb what is on air. If a clip is already
					// rolling, staging the next one stops at downloading it: the element
					// is left alone and the swap happens when it is actually played.
					if (playing) { report("ready", id); return c; }

					ytBox.style.display = "none";
					video.style.display = "block";
					if (video.getAttribute("src") !== blobUrl) { video.setAttribute("src", blobUrl); video.load(); }
					return decoded(video).then(function (ok) {
						// Staged: hold on the first frame rather than starting. The OBS
						// source shows that frame, so the producer can cut their scene to
						// the clip and see it sitting there ready, then roll it when the
						// conversation gets there. Guests see nothing until it rolls.
						try { video.pause(); video.currentTime = 0; } catch (e) {}
						if (opts.showOnLoad) show(true);
						// Holding the bytes is not the same as being able to play them: a
						// browser will not decode media in a hidden tab, so a guest who has
						// alt-tabbed away looks ready but would freeze on the first frame.
						report(ok ? "ready" : "hidden", id);
						return c;
					});
				});
			});
		}

		// Resolves true once the element has actually buffered a frame, false if it has
		// not managed it within a couple of seconds (the usual reason being a hidden
		// tab, where browsers decline to decode at all).
		function decoded(el) {
			if (el.readyState >= 2) return Promise.resolve(true);
			return new Promise(function (resolve) {
				var done = false;
				var finish = function (v) { if (done) return; done = true; el.removeEventListener("loadeddata", ok); resolve(v); };
				var ok = function () { finish(true); };
				el.addEventListener("loadeddata", ok);
				setTimeout(function () { finish(el.readyState >= 2); }, 2500);
			});
		}

		// A tab that comes back to the front can decode at last. Kick the element then,
		// and let the producer's next sync heartbeat put the guest back in step.
		document.addEventListener("visibilitychange", function () {
			if (document.hidden || !current || current.type === "youtube") return;
			if (video.readyState >= 2) return;
			try { video.load(); } catch (e) {}
			decoded(video).then(function (ok) { if (ok) report("ready", current.id); });
		});

		function show(on) {
			if (stage) stage.classList.toggle("clipOn", !!on);
			onShow(!!on);
		}

		function play(id, ms) {
			// always go through prepare: it is cached, and it is the only thing that
			// guarantees the file is in hand before play() is called
			return prepare(id).then(function (c) {
				if (!c) return;
				playing = true;
				current = c;
				show(true);
				var at = (ms || 0) / 1000;
				// take ownership of the element now, which also performs the swap when
				// this clip was queued behind another one
				if (c.type !== "youtube") {
					ytBox.style.display = "none";
					video.style.display = "block";
					var want = cached["clips/" + c.src] || ("clips/" + c.src);
					if (video.getAttribute("src") !== want) { video.setAttribute("src", want); video.load(); }
				}
				if (c.type === "youtube") {
					if (!yt || !yt.playVideo) return;
					try { yt.seekTo(at, true); yt.playVideo(); report("playing", id); }
					catch (e) { report("fail", "youtube error"); }
					return;
				}
				try { video.currentTime = at; } catch (e) {}
				video.play().then(function () { report("playing", id); }).catch(function () {
					// Some browsers refuse to start audio without a fresh gesture. Ask for
					// one rather than silently showing a frozen frame.
					setBusy(true, "Tap to start the clip");
					var go = function () {
						layer.removeEventListener("click", go);
						video.play().then(function () { setBusy(false); report("playing", id); })
							.catch(function () { report("fail", "playback blocked"); });
					};
					layer.addEventListener("click", go);
					report("fail", "waiting for a tap");
				});
			});
		}

		function seekTo(ms, playing) {
			var at = (ms || 0) / 1000;
			if (current && current.type === "youtube") {
				if (yt && yt.seekTo) yt.seekTo(at, true);
				if (yt) { if (playing) { yt.playVideo(); } else { yt.pauseVideo(); } }
				return;
			}
			try { video.currentTime = at; } catch (e) {}
			if (playing) { video.play().catch(function () {}); } else { video.pause(); }
		}

		function position() {
			if (current && current.type === "youtube") {
				return (yt && yt.getCurrentTime) ? yt.getCurrentTime() : null;
			}
			var t = video.currentTime;
			return isNaN(t) ? null : t;
		}

		function sync(ms) {
			if (!current) return;
			var have = position();
			if (have === null) return;
			if (Math.abs(have - (ms || 0) / 1000) > DRIFT) seekTo(ms, true);
		}

		function stop() {
			playing = false;
			show(false);
			setBusy(false);
			try { video.pause(); } catch (e) {}
			try { if (yt && yt.stopVideo) yt.stopVideo(); } catch (e) {}
			report("stopped");
		}

		// "⏺CLIP PLAY my-clip 12000" and friends. Every command carries an absolute
		// position in milliseconds so a receiver that missed one still lands correctly.
		function handle(raw) {
			var m = String(raw).match(/^⏺CLIP\s+(LOAD|PLAY|PAUSE|RESUME|SEEK|SYNC|STOP)(?:\s+(\S+))?(?:\s+(\d+))?/i);
			if (!m) return false;
			var cmd = m[1].toUpperCase();
			if (cmd === "STOP") { stop(); return true; }
			if (cmd === "LOAD") { prepare(m[2]); return true; }
			if (cmd === "PLAY") { play(m[2], parseInt(m[3] || "0", 10)); return true; }
			var ms = parseInt((/^\d+$/.test(m[2] || "") ? m[2] : m[3]) || "0", 10);
			if (cmd === "PAUSE") { playing = false; seekTo(ms, false); report("paused"); }
			else if (cmd === "RESUME") { playing = true; seekTo(ms, true); report("playing"); }
			else if (cmd === "SEEK") { seekTo(ms, true); }
			else if (cmd === "SYNC") { sync(ms); }
			return true;
		}

		return {
			handle: handle, prepare: prepare, play: play, stop: stop,
			position: position, manifest: getManifest,
			current: function () { return current; }
		};
	}

	window.StudioClips = { create: create };
})();
