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
		var cached = {};

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

		// Pull the whole file into the browser cache, so pressing play starts instantly
		// instead of buffering in front of the audience.
		function prefetch(url) {
			if (cached[url]) return Promise.resolve();
			return fetch(url, { cache: "force-cache" })
				.then(function (r) { return r.ok ? r.blob() : null; })
				.then(function (b) { if (b) cached[url] = true; })
				.catch(function () { /* playback still works, it just buffers */ });
		}

		function prepare(id) {
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
				ytBox.style.display = "none";
				video.style.display = "block";
				var url = "clips/" + c.src;
				setBusy(true, "Loading clip");
				return prefetch(url).then(function () {
					if (video.getAttribute("src") !== url) { video.setAttribute("src", url); video.load(); }
					setBusy(false);
					report("ready", id);
					return c;
				});
			});
		}

		function show(on) {
			if (stage) stage.classList.toggle("clipOn", !!on);
			onShow(!!on);
		}

		function play(id, ms) {
			var p = (current && String(current.id) === String(id)) ? Promise.resolve(current) : prepare(id);
			return p.then(function (c) {
				if (!c) return;
				show(true);
				var at = (ms || 0) / 1000;
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
			if (cmd === "PAUSE") { seekTo(ms, false); report("paused"); }
			else if (cmd === "RESUME") { seekTo(ms, true); report("playing"); }
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
