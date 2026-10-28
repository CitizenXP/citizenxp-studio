# Show day

One page. Keep it open on a second screen.

Control room: `https://citizenxp.github.io/citizenxp-studio/studio/admin.html`

---

## Before anyone arrives

- [ ] Open the control room and log in. If **New event** has not been pressed since your
      last show, your rooms and all your Guest Links are still valid.
- [ ] **Settings**: check the **Event name** says what you want. It shows in the sidebar
      and on the guest's page. It is stored in this browser, not in the theme.
- [ ] **Settings**: set the **Upload link** (a Dropbox File Request works best, because
      guests can upload without an account). Guests get this as a button the moment
      their recording stops.
- [ ] **Guest Links** tab: add every guest by name, copy each one their personal invite.
- [ ] Preload the OBS solo links as browser sources. They sit dark until the guest is live.
- [ ] **Overview → Play a video to the room**: press **Copy OBS link for the clip** and add
      that as a browser source now too. That is your full-screen cut for clips.
- [ ] Install ffmpeg once, so converting the takes afterwards is instant:
      `winget install Gyan.FFmpeg`

Send each guest their invite plus these four lines:

> - Use **Chrome or Edge on a computer**. Not a phone, not Safari.
> - Wear **headphones**.
> - Keep **10 GB free**. Your computer records the master copy.
> - In Chrome, turn **off** Settings → Downloads → *Ask where to save each file before
>   downloading*. Otherwise Chrome interrupts you mid-show to ask.

## Sound check (30 minutes before)

- [ ] Guests join and land in the waiting room. **Wait for every card to appear** on the
      board before admitting anyone.
- [ ] Admit them to the green room. Confirm each card loses its *waiting* chip.
- [ ] **Listen** on the green room. Check every guest individually.
      Do not produce and guest from the same machine: your own mic will sound dead
      to you because the browser cancels it. That is not a fault.
- [ ] Check the **Live monitors** strip: you should see every guest's picture.
- [ ] **Studio recordings → Re-check.** Every guest must say *Not recording*, not
      *Cannot record*. **Fix this now, not at the top of the show.** *Cannot record*
      almost always means Safari or a phone.
- [ ] Run the schedule past them over **Chat**, or just talk using **Talk**.

## Showtime

1. [ ] Send guests to broadcast one at a time. Give each a few seconds and check they
       land in the Main Broadcast column before moving the next.
2. [ ] **Start recording everyone.** Every row should read *Recording* with a clock.
3. [ ] Confirm the panel says **ARMED**. That is what re-starts a guest who refreshes.
4. [ ] Go live in OBS.

## Playing a clip

1. [ ] **Overview → Play a video to the room → Open media player.** A new tab opens.
2. [ ] Pick your video file there. It plays to every guest on air **and** into OBS at the
       same time, so their reactions match what the audience sees.
3. [ ] **Keep that tab visible while it plays.** Chrome throttles background tabs and the
       playback will stall if you bury it. Put it on your second screen.
4. [ ] Cut to the clip's own OBS source for full screen, or leave the room mix up to show
       everyone reacting.
5. [ ] Close the tab when the clip is done. It disappears from the guests and from OBS.

## Wrapping

- [ ] Stop the stream in OBS first. Guests stay connected and talking; only the audience
      is gone.
- [ ] Tell them you are about to stop their recordings and that a button will appear.
- [ ] **Stop recording everyone.** Each guest gets an on-screen note and an **Upload your
      recording** button pointing at your upload link. It stays on screen; it does not
      time out.
- [ ] If anyone misses it, press **Send upload link** to show it again.
- [ ] **Before anyone leaves**, get each guest to confirm they can see their `.webm` file
      and that the upload actually started. This is the one step with no undo.
- [ ] A guest who refreshed mid-show has two files. You want both.
- [ ] Convert them. Do this even if your editor opens .webm: the raw files carry no
      duration in the header, so editors mis-scrub or refuse them.
      `.\studio\tools\convert-recordings.ps1 -Path C:\where\the\files\are`

---

## When something goes wrong

**A guest does not appear on the board.** They have not pressed START yet. Their screen
still shows the camera check. Nothing is wrong.

**A guest is stuck in the waiting room.** Press **Admit** again. If the board was still
empty when you first clicked, the click went nowhere.

**A guest does not reach the broadcast column.** Press **Send to broadcast** again. Check
the Live monitors strip shows them. Moving several guests at once is the usual cause.

**A guest's video freezes but audio is fine.** Leave it. Their studio recording is
unaffected: it never travelled over the network. Ask them to turn their camera off and
on if you need the live picture back.

**A guest says *Cannot record*.** They are on Safari, iOS, or a browser without
MediaRecorder. The live call still works and your safety copy on this machine still
records them. Note it and fix it after the show.

**A guest refreshes or crashes.** They rejoin and recording restarts by itself while
ARMED. They will have two files. Nothing to do live.

**A guest stops recording and you did not ask them to.** Press **Record** on their row.
Stopping one guest on purpose is remembered, so nothing restarts them behind your back.

**The clip stalls halfway.** The media tab lost focus. Click back onto it.

**The whole call goes sideways.** Guests' recordings keep running on their own machines
regardless of what the connection does. Get the files afterwards; the show is probably
salvageable even if the live feed was not.

**You accidentally close the control room.** It warns you first. If it happens, guests
keep recording regardless. Reopen the dashboard and log in: within about fifteen seconds
the panel re-discovers who is rolling and re-ARMS itself. Do nothing else. In particular
do **not** press the big record button to "start it again": by then it reads **Stop
recording everyone**, and pressing it would end the takes.
