# CitizenXP Studio

**A producer-friendly control room and Zoom-simple guest experience for live broadcasts,
built on top of a self-hosted [VDO.Ninja](https://vdo.ninja).**

CitizenXP Studio wraps VDO.Ninja's peer-to-peer video engine in a purpose-built workflow for
running live shows: guests join through one clean link, wait in a branded waiting room, get
admitted to a green room, and are moved on air with a click, while the producer runs
everything from a single dashboard.

> **Live app:** https://citizenxp.github.io/citizenxp-studio/studio/
> **Control room:** https://citizenxp.github.io/citizenxp-studio/studio/admin.html

---

## What it does

- **One guest link** → name prompt → camera check → waiting room → green room → on air.
- **Control room dashboard** with a guest board: Admit, Send to broadcast, per-guest mute /
  camera / record / solo link / notes / kick, and one-click copy for every link you need.
- **Producer comms that never reach the stream:** Listen and Talk per room, IFB-style
  whisper to one guest, on-screen cues and countdown timers.
- **Live monitors**: a video thumbnail of every connected guest, right on the Overview.
- **OBS-ready outputs:** auto-mixed room scenes and per-guest solo feeds as browser sources.
- Noise gate, pro audio, on-air tally, private chat, live captions, branded standby slate,
  auto-record, huddles, and Stream Deck / Companion remote control.

**Full documentation lives in [`studio/README.md`](studio/README.md).**

## Where the code lives

Everything CitizenXP Studio adds is in the [`studio/`](studio/) folder:

| File | Purpose |
|---|---|
| `studio/index.html` | Landing page, Guest or Producer |
| `studio/join.html` | Guest flow: name, camera, waiting room, on-air controls |
| `studio/admin.html` | Password-protected control room |
| `studio/config.js` · `common.js` · `studio.css` | Config, shared helpers, styling |
| `studio/README.md` | Full feature & deployment docs |

The rest of this repository is an **unmodified copy of VDO.Ninja v30.2**. It ships here
intentionally: the wrapper embeds VDO.Ninja and must be served from the **same domain**
for the dashboard and guest pages to read live state from the video frames. None of
VDO.Ninja's own source files are changed, you can update VDO.Ninja underneath the wrapper
at any time.

## Deploying

This repo is served by GitHub Pages. To push updates, run `deploy.ps1` from the project
folder. It commits, pushes, and keeps Pages enabled. See
[`studio/README.md`](studio/README.md#deploying) for details.

---

## Built on VDO.Ninja: credit & license

CitizenXP Studio is a wrapper around **[VDO.Ninja](https://vdo.ninja)**, created by
**[Steve Seguin](https://github.com/steveseguin)**. All of the real-time peer-to-peer video
technology, the hard part, is his work. This project only adds a show-production workflow
on top of it.

- Upstream project: **https://github.com/steveseguin/vdoninja**
- Original VDO.Ninja README (preserved): [`README.vdoninja.md`](README.vdoninja.md)
- Support Steve's work: **https://github.com/sponsors/steveseguin**

VDO.Ninja is licensed under the **[AGPL-3.0](LICENCE.md)** (see also [`AGPLv3.md`](AGPLv3.md)).
Because CitizenXP Studio builds on AGPL-licensed code, the CitizenXP Studio wrapper is likewise
released under **AGPL-3.0**, and this repository is kept public to satisfy the license's
requirement that modifications remain accessible. If you fork this, please keep this notice,
keep your repository public, and consider sponsoring Steve.
