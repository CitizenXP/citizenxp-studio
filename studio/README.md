# Control Room: a producer wrapper for VDO.Ninja

A button-driven control room and a Zoom-simple guest experience, layered on top of a
self-hosted [VDO.Ninja](https://vdo.ninja). **No VDO.Ninja source files are modified**:
everything lives in this `/studio/` folder, so you can update VDO.Ninja itself at any time.

It is built to be re-skinned. The product name and the entire colour scheme come from
two lines of `config.js`, so one codebase can run several differently branded shows.
This deployment is currently configured as **Aebly Media**; see [Branding and themes](#branding-and-themes).

## License & credits

This project builds on **[VDO.Ninja](https://github.com/steveseguin/vdo.ninja)** by
**Steve Seguin**, licensed under the **AGPL-3.0** (see `LICENCE.md` and `AGPLv3.md` in
the repository root). All the real-time video magic is his work. This folder only adds
a workflow wrapper around it.

The `/studio/` wrapper is likewise released under **AGPL-3.0**. The AGPL requires that
modifications to the code stay publicly accessible, and hosting this repository publicly
(e.g. on GitHub) satisfies that requirement. If you fork this, please keep this notice,
keep the repo public, and consider [supporting Steve's work](https://github.com/sponsors/steveseguin).

---

## The three pages

| Page | Who uses it | What it does |
|---|---|---|
| `studio/index.html` | everyone | Landing page: pick Guest or Producer |
| `studio/join.html` | guests | Name prompt → camera/mic pick → **waiting room** → green room → moved to broadcast. Simple mic / camera / chat / settings / leave buttons only. |
| `studio/admin.html` | you + admins | Password-protected control room: both rooms as full director views, a guest board with **Admit / Send to broadcast / Mute / Record / Solo link / Kick** buttons, and one-click copy for every link you'll ever need. |

Set your own admin password before your first real event: Settings → Admin password,
then paste the generated line into `studio/config.js`. Only the SHA-256 hash is stored,
so the password itself never enters this repository.

## How the flow works

1. **You** open the Control Room and copy the **Guest invite link** (Overview tab).
2. **Guest** opens it, types their name, picks camera/mic, presses START.
3. They land in the **waiting room** (VDO.Ninja "hold" mode): they're connected and your
   team can already see & hear them, but they're isolated from everyone else.
4. On the guest board (or the Green Room director view) press **✚ Admit** and they drop
   into the green room and can talk with your tech team / other guests.
5. When it's showtime press **🚀 Send to broadcast** and they're transferred into the main
   room. Their screen flashes "YOU'RE LIVE" so they always know their status.
6. In OBS, add the **Main broadcast, full mix** link as a browser source, or per-guest
   **Solo link**s if you prefer to build your own layout (one browser source per person,
   with "Control audio via OBS" checked → each guest gets their own audio fader/filters).
7. **⏺ Record** on any guest records their feed to the producer's computer (the browser
   downloads a media file per recording). You can also use the full director view for
   Google-Drive/remote recording options.

Both rooms share one password (required so guests can be transferred between rooms).
Additional producers who open the dashboard automatically join as **co-directors** of
both rooms, so two admins can run green room and broadcast simultaneously.

## Producer communication tools (never reach the stream)

Your voice and messages go through the director connection, which is **never part of an
OBS scene**, so the stream cannot hear or see any of this:

- **🎧 Listen** (per room): one click and that room's audio plays in *your* headphones.
  guests aren't notified and the stream is untouched. Exclusive like PFL on a mixing
  desk: listening to one room stops the other. Works identically for co-producers on
  their own dashboards (each listens locally).
- **🎙️ Talk** (per room): your mic to everyone in that room. First use asks for browser
  mic permission (mic only: the control room never sends a camera). Click again to stop.
  You stay **completely invisible** to guests: no video tile, no name in their roster, no
  change to the group layout. They only hear you. Classic use: "we're live in 30 seconds"
  to the green room, or producer notes to the on-air panel (audience hears nothing, though
  if a live guest replies out loud, the stream hears *them*).
- **🎧 Whisper** (per guest): IFB-style, so only that one guest hears you, even mid-show.
  Automatically turns off any other whisper/room-talk in that room.
- **💬 Chat** (the round button, bottom-right of the control room): a proper text
  conversation with your guests, with a tab per room and an unread counter so you can
  keep it closed until something arrives. What you type goes to everyone in the selected
  room, signed **Control Room**; what guests type shows up here with their name. Use it
  for anything that isn't urgent enough to interrupt them: links, spellings of names,
  "your mic gain is a bit hot". Cues and timers stay out of this log, so it reads as a
  real conversation rather than a record of every prompt you fired.
- **📣 Cue** (per guest or per room): canned or custom messages that appear as a large
  banner on the guest's screen for ~9 seconds, with a soft chime. Guests never need to
  open the chat window to get these.
- **⏱ Timer** (per room): a countdown appears on every guest's screen; goes red and
  pulses in the last 15 seconds. "Clear timer" removes it.
- **🔇 Mute all / 🔊 Unmute** (per room): panic button for the broadcast, or quiet the
  green room before a cue.

## Guest tools

Guests get: mic, camera, **background blur**, **✋ raise hand** (shows instantly on your
guest board with an amber highlight), **chat**, settings (device switching), leave. When
they go on air they get a persistent red **ON AIR** pill centred in the top bar, above the
video so it covers nobody's face, plus a brief green
border **flash** (it pulses when they go live, then fades, so it doesn't frame the whole
call the entire time). Cues from the control room appear as a single styled banner.

Guests see the call and our own controls, nothing else. VDO.Ninja's engineer-facing
chrome is suppressed for them: the small expand icon it floats over each tile, and the
right-click menu on video (mirror, rotate, PTZ, buffer size, remote hangup/reload,
picture-in-picture). That menu is built for whoever runs the show from a browser tab, not
for guests, and several of its entries can't work inside our wrapper anyway. Right-click
on the call is simply inert. None of this touches VDO.Ninja's own files: the icon is hidden
with the same injected CSS as the rest, and the menu is cancelled by a capture-phase
listener on the embedded document. Producers who need those controls still have them, in
the full director console behind **Advanced** on either room tab.

**CHAT** slides out a panel on the right: everyone in their room plus the control room,
with a dot on the button when something arrives while it's closed. Messages from you are
marked **Control Room**. Turn on *Private chat* in Settings and guests' messages go only
to producers, and the panel says so, so nobody types something awkward assuming privacy that
isn't there.

## Recording (the Riverside-style part)

There are **two** recordings, and the difference matters.

| | Studio recording | Safety copy |
|---|---|---|
| Where it runs | the **guest's** computer | **your** computer |
| What it captures | their raw camera and mic | the stream after it crossed the internet |
| Affected by a bad connection | **no** | yes: artefacts and dropped frames are baked in |
| Where the file ends up | their Downloads folder | your Downloads folder |
| How you start it | **Studio recordings** panel on the Overview | the small record button on a guest card |

Record both. The studio recording is your master; the safety copy is what saves you
when a guest closes their laptop before sending you anything.

### Running it

1. Pick a quality in the **Studio recordings** panel. 8 Mbps is the sensible default
   for a talking-head podcast; 16 Mbps if you plan to crop or punch in.
2. Press **Start recording everyone**. Each guest's browser begins recording their own
   camera and mic, and shows them a red **REC** pill so nobody is recorded unawares.
3. The panel then shows, per guest, whether they are *actually* recording and for how
   long. That status is **reported by the guest**, not assumed by the dashboard: if it
   says Recording, something on their machine said so.
4. The session stays **ARMED** until you press stop. Anyone who joins late starts
   recording automatically, and so does anyone whose recording dies, which is what
   happens when a guest refreshes the page mid-show. You do not have to notice.
5. Press **Stop recording everyone** at the end. Each guest is told the file is in
   their Downloads folder and asked to send it to you.

### Getting the files into your editor

Recordings arrive as `.webm`. The video inside is already H.264, so turning them into
editable MP4s is a stream copy that takes seconds rather than a re-encode that takes
hours. Drop the files in a folder and run:

```powershell
.\studio\tools\convert-recordings.ps1 -Path C:\path\to\the\webm\files
```

That writes H.264 + AAC MP4s into a `converted` subfolder, which Premiere, Resolve and
Final Cut all open directly. **Convert before editing even if your editor will open a
.webm.** A recording written progressively to disk has no duration in its header, which
makes editors misreport the length or refuse to scrub; the conversion writes a correct
one. It needs ffmpeg (`winget install Gyan.FFmpeg`). The audio
is converted from Opus to AAC because editors refuse Opus inside an MP4; the video is
never re-encoded, so nothing is lost.

### Recording quality is set by the CAMERA, not the bitrate

A guest records their camera exactly as it was captured, so capture resolution is the
ceiling on your masters. Left to itself, VDO.Ninja picks that resolution from a guess
about the guest's hardware, and on an older laptop that guess can be as low as 320x180:
no recording bitrate will rescue it.

**Guest camera quality** in Settings removes the guess. 720p is the sensible default for
a podcast; 1080p gives the best masters but works the guest's machine hardest. It is
applied as a preference, so a webcam that cannot manage it falls back instead of failing,
and nobody ever loses their camera over it. Re-copy the guest links after changing it.

Check it at the sound check: the resolution a guest is actually capturing is what you
will be editing.

### Things worth knowing before you rely on this

- **The files are on your guests' machines.** There is no server here to upload them
  to, which is the one real thing Riverside does that this does not. Tell guests up
  front that they will need to send you a file afterwards, and check they have done it
  before they wander off.
- **A guest who refreshes produces two files**, one per side of the refresh. Both are
  good; join them in your editor.
- **Tell guests to switch off "Ask where to save each file before downloading"** in
  Chrome (Settings > Downloads). The recording is written through a normal browser
  download, so if that setting is on, Chrome interrupts them with a save dialog. No web
  page can turn it off for them: it is a deliberate browser protection. With it off the
  file lands in Downloads silently. One take produces exactly one file and one prompt.
- **Chrome or Edge on a computer.** Safari and iOS recording is unreliable, and the
  panel will say *Cannot record* rather than pretending. Check this at the sound check,
  not at the top of the show: the **Re-check** button asks every guest to re-report.
- **Disk space.** 8 Mbps is roughly 1 GB per guest per 17 minutes. A two-hour show is
  about 7 GB each. Ask guests to check before you start.
- Closing the tab mid-recording now warns the guest first, but it will still truncate
  the take if they insist.

## Playing a video to the room and the stream

**Overview → Play a video to the room → Open media player** opens a tab that joins the
broadcast room as an extra source. Pick a file there and it plays to every guest on air
and into OBS from the same source, so guest reactions line up with what the audience
sees. There is a second button that copies an **OBS link for the clip alone**, for a
full-screen cut; add it as a browser source before the show and it lights up when a clip
plays. Closing the tab removes the clip from the guests and from OBS.

Two things to know:

- **Keep the media tab visible while a clip plays.** Chrome throttles background tabs and
  the playback stalls if you bury it behind the control room. Put it on a second screen.
- The file never leaves your computer: it is streamed into the room like a camera, not
  uploaded anywhere.

## Handing recordings back at the end

Set an **Upload link** in Settings before the show. A Dropbox File Request works best,
because guests can upload without an account; a Google Drive folder usually forces them
to sign in.

When you press **Stop recording everyone**, each guest gets a note telling them the file
is in their Downloads folder, plus an **Upload your recording** button pointing at that
link. It stays on screen rather than timing out, because this is the last thing they need
to do and the only step with no undo. **Send upload link** in the recordings panel shows
it again to anyone who missed it.

## Guest Links: permanent, preloadable links (Guest Links tab)

For repeat events you can build everything **before** show day instead of copying links
while guests trickle in:

1. In the **Guest Links** tab, add each guest by name. Every guest gets a stable **on-air
   ID** derived from their name (e.g. *Jane Smith → `Jane_Smith`*) that never changes.
2. Copy each guest's **personal invite** (their name is pre-filled) and send it to them.
3. Copy each guest's **OBS solo link**, or use **Copy all broadcast OBS links**, and
   preload them as browser sources in OBS ahead of time. They sit dark until needed.
4. On the day: when you send a guest to broadcast, their **pre-loaded OBS source lights up
   automatically**, with no copying stream IDs mid-show.

The links stay valid as long as you keep the same rooms, so they survive across events.
Two things to know:

- **Keep your room names fixed.** The links are tied to your current green/broadcast rooms.
  Running **New event** in Settings generates fresh rooms and invalidates them. For a truly
  permanent setup across machines, set your room names once in Settings (or in
  `studio/config.js` `defaults`) and leave them.
- The roster lives in your browser. The links themselves are reproducible from the guest's
  name + your rooms, so re-adding the same name anywhere regenerates the identical links.

Ad-hoc guests still work exactly as before. The plain **Guest invite link** on the
Overview gives each walk-up guest a random ID.

## Room tabs (Green Room / Main Broadcast)

Each room has its own studio-styled tab, with no raw VDO.Ninja UI anywhere:

- **Live monitor**: a silent auto-mixed view of everyone in the room (exactly what an
  OBS mix source would show), loaded the first time you open the tab. Audio never comes
  from the monitor. Press **Listen** for that.
- The full **room toolbar** (Listen / Talk / Cue all / Timer / Mute all / Unmute) and
  the same guest cards as the Overview board, so you can run the room from either place.
- **Advanced**: opens VDO.Ninja's full director console in a new tab for the rare
  per-guest deep controls (gain, EQ, bitrate caps, scene assignment). Everyday actions
  never need it.

## Live monitors (Overview)

Below the link cards, the Overview shows a **live video thumbnail for every connected
guest**, waiting-room, green room and on-air, each with their name and a room badge
(yellow *Waiting* / green *Green* / red pulsing *On air*). It's a silent video preview:
audio still comes only from the **Listen** button, so nothing here can leak into the mix.
The feeds are mirrored straight from the control room's own connections, so they cost no
extra guest bandwidth beyond what the dashboard already receives.

## Guest board extras

- **Connection dot** on every guest: green/amber/red from live bitrate & packet-loss
  stats. Spot a failing connection before your audience does.
- **📝 Notes**: private per-guest notes only producers see ("needs new mic", "intro at
  :15"). Saved in your browser.
- **⏺ Record** starts instantly at the quality chosen in Settings (no dialog).
  **Auto-record while on air** (checkbox in the OBS card) starts a recording the moment
  any guest lands in the main room; files download to the producer's computer.
- **👥 Huddles** (per guest): private sub-groups inside a room. Guests in different
  huddles can't see or hear each other, but producers, non-huddled guests and the OBS
  feeds still get everyone. Perfect for letting co-hosts confer while another guest is
  being staged. Assign/remove from the huddle button on any guest card (up to 3 huddles
  per room, guests can be in several).
- **Name labels on OBS mixes** (checkbox): re-copy the scene links to include guest
  name overlays.

## Show settings (Settings tab)

All of these are baked into the links you copy, so re-copy the guest invite and OBS links
after changing them:

- **Noise gate**: auto-ducks each guest's mic while they aren't speaking. It kills
  keyboard clatter and room noise from guests in bad rooms.
- **Pro audio**: 256 kbps unprocessed stereo for music and performances. Must be on
  before links are shared (it applies to both guest and OBS links); guests are shown a
  "wear headphones" notice on the join page.
- **On-air tally**: guests get a clear red on-air indicator driven by what's actually
  in your OBS scene (on by default).
- **Private chat**: guest text chat goes only to producers instead of the whole room.
- **Live captions**: guests' speech is transcribed in their browser (Chrome) and shown
  as caption overlays on the OBS scene links: instant accessibility.
- **Standby message / image**: branded "starting soon" slate shown in OBS whenever a
  scene has no live video, instead of black.
- **Recording quality**: 2.5/6/12 Mbps video, or audio-only (Opus 256 kbps for
  podcasts, or lossless PCM). Applies to manual and auto record.
- **Stream Deck & remote control**: generate an API key and the two director
  connections register with VDO.Ninja's remote-control API
  (`https://api.vdo.ninja/<key>/<action>`). Add the keys to the free
  [Bitfocus Companion](https://bitfocus.io/companion) "VDO.Ninja" module, one instance
  per room, and drive mutes, transfers, scenes and more from physical Stream Deck
  buttons. The control room tab must stay open for commands to work.

## Branding and themes

Everything that makes this look like a particular show lives in two fields of
`studio/config.js`:

```js
brandName: "Aebly Media",   // shown on every page, baked into guest invites
theme:     "aebly",         // loads studio/themes/aebly.css
```

Shipped themes: `atdawn` (sunrise orange), `aebly` (brass, Sora and EB Garamond), or `""`
for the neutral base. Switching show is two lines and a deploy.

Set `theme` to `""` and you get the neutral slate-and-blue look built into
`studio.css`: no sunrise glow, no gradient brandmark, nothing that reads as a brand.
That is the starting point for a new show.

### Making a spin-off

1. Copy `studio/themes/atdawn.css` to `studio/themes/yourshow.css`.
2. Change the tokens in it. The whole palette is driven by `--accent` and
   `--accent-rgb` (the same colour twice, once as hex and once as `r, g, b` so it can
   be used inside `rgba()`), plus `--accent-grad`, `--page-glow`, `--brandmark-inset`
   and the two cue-banner colours.
3. Set `brandName` and `theme` in `config.js`.

That is the whole job. `studio.css` holds layout and components and is never forked,
so a fix to the control room benefits every spin-off. There is a full token reference
in `studio/themes/README.md`.

## Deploying

### Pushing updates to GitHub (the normal workflow)

This repo is already connected to **`github.com/CitizenXP/citizenxp-studio`** (branch `main`),
which GitHub Pages serves. The git repo lives in the **web-root** folder
(`vdo.ninja-30.2/vdo.ninja-30.2/`), *not* the top-level project folder, so edit the
files in this `/studio/` folder as usual, then from the top-level project folder run:

```powershell
.\deploy.ps1
```

That one script commits any changes, pushes to `main`, and keeps Pages enabled. The site
goes live 1–3 minutes later at `https://citizenxp.github.io/citizenxp-studio/studio/`.
It only needs a one-time `gh auth login` if the GitHub CLI ever reports you're signed out.

### Hosting options

This folder deploys with the rest of VDO.Ninja, so any static hosting works:

- **GitHub Pages** (easiest, free, SSL included): fork/push this whole repo and enable
  Pages, exactly as described in the tutorial video / `install.md`. Your links become
  `https://<you>.github.io/<repo>/studio/admin.html` etc.
- **Nginx / your own server**: follow `install.md` in the repo root. The `/studio/`
  folder needs no special server config.

Two rules:

1. **HTTPS is required** (browsers refuse camera access otherwise). `http://localhost`
   is fine for testing.
2. Keep `/studio/` on the **same domain** as VDO.Ninja (it ships inside the repo, so it
   is by default). The dashboard and guest status detection read state from the embedded
   frames, which requires same-origin.

## Configuring

Edit `studio/config.js`:

- `brandName`: shown on every page.
- `adminPasswordHash`: SHA-256 of the dashboard password (generate in Settings).
- `vdoPath`: leave as `"../"` unless you moved the folder.
- `defaults`: the event preset (room names, room password) used on first run.
  Day-to-day changes are done in the dashboard's Settings tab and are stored in the
  producer's browser (localStorage), no server edits needed.

## Notes, honestly

- The admin login is a **front gate, not a vault**: this is a static site, so the real
  security is the room password + which links you share. Use unguessable room IDs and
  passwords (the "New event" button generates them), and don't share the admin page URL
  publicly.
- Guest links embed the room password by default for one-click joining. Tick
  *"Guests must type the event password"* to keep it out of the link instead.
- Talking to green-room guests: open the **Green Room** tab and use the director's
  mic/"press to talk" controls. You're a real VDO.Ninja director there, with every
  advanced control (audio gain, EQ, quality, scenes, hand-raise, chat…).
- Recording quality: director-side recording captures the live stream. For mission
  critical audio, VDO.Ninja pro tip: ask guests to also record locally, or use the
  director view's per-guest recording options.
- Updating VDO.Ninja later: replace everything except the `/studio/` folder.
