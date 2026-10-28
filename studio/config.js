/*
	Control Room: deployment configuration
	======================================
	This is the ONLY file you need to edit when deploying, and the only file a
	spin-off has to change to look like its own product.

	brandName:
		The product name shown on every page. Change it and the whole UI follows.

	theme:
		Which themes/<name>.css to load on top of the neutral default built into
		studio.css. "" or "default" = the neutral slate-and-blue look.
		See studio/themes/README.md for how to make your own.

	adminPasswordHash:
		SHA-256 hex of the producer/admin password. Set your own before your first
		real event: admin.html -> Settings -> "Change admin password" generates the
		hash to paste below. Only the hash lives here, never the password.

	vdoPath:
		Path from the /studio/ folder to the VDO.Ninja install.
		"../" is correct when /studio/ lives inside the VDO.Ninja web root.
		You may also use an absolute URL (e.g. "https://vdo.yourdomain.com/").
*/
window.STUDIO_CONFIG = {
	brandName: "Aebly Media",
	tagline: "Remote Guest Green Room & Broadcast Control",

	// "" or "default" for the neutral look; otherwise loads themes/<theme>.css
	theme: "aebly",

	// optional browser-tab icon, relative to /studio/
	favicon: "themes/aebly-mark.png",

	vdoPath: "../",

	// SHA-256 of the admin password (set via admin.html -> Settings -> "Change admin password")
	adminPasswordHash: "f2790c00722d7c0ffa891afbc46bbf2d02d5766e56fcc4103068b5acadb7fcb5",

	// Defaults used the first time the dashboard runs (editable in Settings).
	// Leave the room fields empty: the dashboard then generates unguessable random
	// room names and a random password on first run. This matters because this file
	// is public if you host the repo publicly (which the AGPL license encourages).
	defaults: {
		eventName: "Live Show",
		greenRoom: "",   // "" = auto-generate a random, unguessable room id
		mainRoom: "",    // "" = auto-generate
		roomPassword: "", // "" = auto-generate; shared by both rooms (needed for transfers)
		requirePasswordEntry: false // if true, guests must type the room password to join
	}
};
