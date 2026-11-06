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
- [ ] **Overview: Screen source**: if you are showing videos or articles this week,
      press **Rehearse in the green room** once and check it looks and sounds right.
      Press **Copy OBS link** (not Copy share link) and paste it into an OBS browser
      source now; it stays black until you join as a screen.
- [ ] Install ffmpeg once, so converting the takes afterwards is instant:
      `winget install Gyan.FFmpeg`

Send each guest their invite plus these four lines:

> - Use **Chrome or Edge on a computer**. A phone can join and go live, but it cannot
>   record your master copy, and a laptop screen is the only way to see the rest of
>   the panel properly.
> - **On a phone, open the link in Safari (iPhone) or Chrome (Android) itself.** If you
>   tap the link inside Instagram, Facebook, Messenger, LINE or TikTok, it opens in that
>   app's own browser, which usually refuses to give a website the camera. You then sit
>   on a loading screen and never arrive, and the producer sees nothing. Tap the share
>   or three dots button and choose "Open in Safari" or "Open in Chrome" first.
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

## Showing a video or an article

You join the room again as an extra participant whose picture is a window on your
machine. The guests see it in their call, and OBS gets it as a normal guest feed.

1. [ ] In **Overview**, under **Screen source**, set the **Name on screen** if you want
       something other than "Screen", and check the quality box. The figure beside it
       is what it will cost your upload with the panel you have on air.
2. [ ] Press **Join the broadcast as a screen**. A new tab opens.
3. [ ] Pick the **tab** you want to show, and **tick the box that shares its audio**.
       Miss the box and it goes out silent. Pick the whole screen instead of a tab and
       you send your control room monitoring with it, so the guests hear themselves
       delayed. A video on your PC counts as a tab: drag the file into Chrome.
4. [ ] It now appears on the board like a guest. Spotlight it or put it on air exactly
       as you would a person, and cut your OBS scene to it.
5. [ ] To change what you are showing, use the share controls in that tab. To finish,
       stop the share or close the tab.

Leave that tab open while it runs, but you do not need to be looking at it. It shows
and plays nothing from the room on purpose, so it cannot feed your own audio back into
the show.

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

**The screen source is silent.** Either the share audio box in the browser's dialog
was not ticked, or you shared a window, which Chrome gives no audio for. Stop the
share in that tab and pick a tab instead.

**Guests say they can hear themselves echoing.** You shared your whole screen, so your
control room monitoring is going out with it. Stop the share and pick just the tab.

**A guest says they clicked the link but never appeared on your board.** They are stuck
before the room, so nothing reaches you: there is no card to miss. Almost always the
camera permission. Ask them what is on screen. The join page now detects this and shows
them the steps, with a Reload and try again button. The usual cause on a phone is that
the link was opened inside another app's browser; the fix is to open it in Safari or
Chrome. Second most likely: they never pressed the large START button after picking
their camera.

**The whole call goes sideways.** Guests' recordings keep running on their own machines
regardless of what the connection does. Get the files afterwards; the show is probably
salvageable even if the live feed was not.

**You accidentally close the control room.** It warns you first. If it happens, guests
keep recording regardless. Reopen the dashboard and log in: within about fifteen seconds
the panel re-discovers who is rolling and re-ARMS itself. Do nothing else. In particular
do **not** press the big record button to "start it again": by then it reads **Stop
recording everyone**, and pressing it would end the takes.
