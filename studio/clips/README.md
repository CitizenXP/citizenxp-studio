# Clips

Videos played to the room during a show. They are served from the same place as the
studio itself, so every guest and the OBS clip source fetches its own copy.

## Why this costs nothing to play

Measured with four guests on air and the producer's dashboard open:

| | producer's upload |
|---|---|
| Show running, nothing playing | 0 kbps |
| Clip staged on everyone, waiting | 0 kbps |
| **Clip playing** | **0 kbps** |
| The same clip streamed from the producer's computer instead | 3883 kbps |

The guests' cameras travel directly between the guests, and a staged clip plays from
each machine's own copy, so the producer's entire upload stays free for OBS. That
matters most when OBS is pushing to several platforms at once.

## Stage, then play

**Stage** downloads a clip onto every guest and into the OBS clip source, where it
waits on its first frame. Nothing is shown to the guests yet, but the OBS source is
showing that frame, so you can cut your scene to it and see it sitting there ready.

**Play** rolls it everywhere at once. Measured spread between four guests: 0.00s.

You can stage the next clip while one is on air and it will not disturb what is
playing, then play it and the swap happens in about a second.

## Adding clips

```powershell
.\studio\tools\add-clip.ps1 "C:\path\to\clip.mp4" -Title "Name"
.\studio\tools\add-clip.ps1 "https://youtu.be/VIDEOID" -Title "Name"
.\studio\tools\add-clip.ps1 -List
.\studio\tools\add-clip.ps1 -Remove some-id
```

A local file is re-encoded for the web. The episode 2 ad set went from 1.3 GB of
1080p masters at 19 Mbps to 232 MB, with the longest clip at 57 MB. **Deploy after
adding**: a clip that has not been deployed does not exist as far as the guests are
concerned.

## Limits worth knowing

- **100 MB per file**, a GitHub limit. The encoder targets well under it and refuses
  rather than producing something that cannot be pushed.
- **These files are public** to anyone with the URL. For embargoed material use an
  unlisted YouTube link instead.
- **A guest who has tabbed away cannot play a clip.** Browsers will not decode video
  in a hidden tab, so they hold the file but would freeze on the first frame. The
  transport line names anyone in that state.
- Stage early. On a weak connection a 57 MB clip takes a while, and **Stage all**
  before the show gets it out of the way.
