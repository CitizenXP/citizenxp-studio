/* Control Room: shared helpers (no dependencies) */
"use strict";

const Studio = (() => {
	const CFG = window.STUDIO_CONFIG || {};

	/* ---------- crypto ---------- */
	async function sha256Hex(str) {
		const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
		return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
	}

	/* ---------- base64url (unicode-safe) for invite payloads ---------- */
	function b64uEncode(obj) {
		const json = JSON.stringify(obj);
		const bytes = new TextEncoder().encode(json);
		let bin = "";
		bytes.forEach(b => (bin += String.fromCharCode(b)));
		return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}
	function b64uDecode(str) {
		try {
			let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
			while (b64.length % 4) b64 += "=";
			const bin = atob(b64);
			const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
			return JSON.parse(new TextDecoder().decode(bytes));
		} catch (e) {
			return null;
		}
	}

	/* ---------- ids / names ---------- */
	function randId(n = 5) {
		const chars = "abcdefghjkmnpqrstuvwxyz23456789";
		let out = "";
		const rnd = new Uint8Array(n);
		crypto.getRandomValues(rnd);
		for (let i = 0; i < n; i++) out += chars[rnd[i] % chars.length];
		return out;
	}
	// VDO.Ninja stream/room IDs: letters, numbers, underscore
	function sanitizeId(str) {
		return (str || "").replace(/[^a-zA-Z0-9_]/g, "");
	}
	// "dir_" and "screen_" are reserved stream-id prefixes: the control room pushes
	// dir_<room>_<rand> and the producer screen source pushes screen_<room>, and both the
	// guest page and the dashboard hide anything carrying those prefixes. A guest whose
	// name happened to slug into one would be invisible to the whole room and absent from
	// the board, with nothing to explain why, so move them clear of it.
	function slugName(name) {
		const s = sanitizeId((name || "guest").trim().replace(/\s+/g, "_")).slice(0, 20) || "guest";
		return /^(dir|screen)_/i.test(s) ? "g_" + s : s;
	}

	/* ---------- URL building ---------- */
	function vdoBase() {
		let p = CFG.vdoPath || "../";
		if (!p.endsWith("/")) p += "/";
		return p;
	}
	// Absolute URL of the VDO.Ninja root (for links that leave this page, e.g. OBS)
	function vdoAbsBase() {
		return new URL(vdoBase(), window.location.href).href;
	}
	// params: object; value === null -> flag param (no "=")
	function buildUrl(base, params) {
		const parts = [];
		for (const [k, v] of Object.entries(params)) {
			if (v === undefined || v === false) continue;
			if (v === null || v === true) parts.push(encodeURIComponent(k));
			else parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
		}
		return base + (parts.length ? "?" + parts.join("&") : "");
	}

	/* ---------- clipboard ---------- */
	async function copyText(text) {
		try {
			await navigator.clipboard.writeText(text);
			return true;
		} catch (e) {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.style.position = "fixed";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			let ok = false;
			try { ok = document.execCommand("copy"); } catch (e2) {}
			ta.remove();
			return ok;
		}
	}

	/* ---------- tiny toast ---------- */
	let toastTimer = null;
	function toast(msg, isError = false) {
		let t = document.getElementById("studioToast");
		if (!t) {
			t = document.createElement("div");
			t.id = "studioToast";
			document.body.appendChild(t);
		}
		t.textContent = msg;
		t.className = "show" + (isError ? " error" : "");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (t.className = ""), 2600);
	}

	/* ---------- iframe messaging ---------- */
	function send(iframe, msg) {
		try {
			if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage(msg, "*");
		} catch (e) {
			console.warn("postMessage failed", e);
		}
	}

	return { CFG, sha256Hex, b64uEncode, b64uDecode, randId, sanitizeId, slugName, vdoBase, vdoAbsBase, buildUrl, copyText, toast, send };
})();
