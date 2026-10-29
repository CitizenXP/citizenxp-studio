# Clips

Videos you play to the room during a show. One sample clip ships here (`test-pattern`)
so you can prove the whole path works before trusting it with real material.

## Why clips are not streamed

The obvious way to share a video is to publish it into the call as another source.
That turns out to be the worst way. Your machine has to encode the clip and upload
**one separate copy to every guest and another to OBS**, on top of the camera it is
already sending and the guest streams it is already receiving. A home uplink cannot
carry that. WebRTC responds the only way it can, by throttling everything, so the
clip stutters *and* every guest's camera quality drops at the same moment.

So nothing is streamed. Each guest and the OBS source fetch the clip once from the
same CDN that serves the studio, and play their own copy. The call carries only the
few bytes of a play command. A clip now costs the room no bandwidth at all, and
everyone sees it at full quality.

The control room holds the authoritative position and calls it out every few seconds,
so the copies stay in step. In testing, guests and OBS stayed within about 20ms.

## Adding a clip

From the repository root:

```powershell
.\vdo.ninja-30.2\vdo.ninja-30.2\studio\tools\add-clip.ps1 "C:\path\to\clip.mp4" -Title "Cold open"
```

A local file is re-encoded to a web-friendly MP4 and written into this folder.
YouTube links need no upload at all:

```powershell
.\vdo.ninja-30.2\vdo.ninja-30.2\studio\tools\add-clip.ps1 "https://youtu.be/VIDEOID" -Title "The reaction"
```

Then list or remove:

```powershell
.\...\add-clip.ps1 -List
.\...\add-clip.ps1 -Remove cold-open
```

**Deploy after adding.** Clips are served from the published site, so a clip that has
not been deployed does not exist as far as your guests are concerned.

## Limits worth knowing

- **100 MB per file**, enforced by GitHub. The encoder targets well under it and
  refuses rather than producing a file that cannot be pushed. At the default 3 Mbps
  that is roughly four minutes. Trim longer material, or pass `-Bitrate 1800`.
- **These files are public.** Anyone who knows the URL can download them. Do not put
  embargoed or licensed material here; use a YouTube unlisted link instead.
- **Preload before the show.** The control room has a *Preload on everyone* button.
  Press it once your guests are in the green room and watch the Ready count. Measured
  on a 600 kbps connection: a preloaded guest started in under a second, while the
  same guest with no preload took 28 seconds of buffering on air.
- **A guest who has tabbed away cannot play a clip.** Browsers refuse to decode video
  in a hidden tab, so they hold the file but would freeze on the first frame. The
  Ready line names anyone in that state; tell them to come back to the studio tab and
  it clears within a few seconds.

## On the day

1. Guests in the green room, then **Preload on everyone**.
2. Add the **OBS clip link** (control room: *Copy OBS link for clips*) as a browser
   source in your scene. It stays black until you roll something, so it can live in
   the scene permanently.
3. Press **Play** next to a clip. Guests switch to clip-big-faces-in-a-strip, OBS
   cuts to the same frame, and you keep Pause, Resume and Stop in the control room.
