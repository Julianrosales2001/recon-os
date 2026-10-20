RP-1000 SOUNDS
==============

One folder per moment on the RP. Drop a sound file (.mp3, .wav or .m4a) in a folder and the
RP plays it at that moment.

With RP SOUND PUSH on (tools/sfx-autopush, set up once), that's all: it renames your file to
sound.mp3, commits it and pushes it, and the phone has it a minute later.
Without it: name the file sound.mp3 (or .wav / .m4a) yourself, then commit and push.

  sound.mp3      your sound (.mp3 wins if a folder has more than one)
  original.wav   the RP's own sound, in the K folders only. Keep these.

A folder with no sound of yours plays its related sound, and its README.txt says which
(A2-aux-open plays K7-thunk). A5-aux-lamp, S1-scan-ping, B1-boot stay silent until you fill them.
Each folder's README.txt says when it plays.

A sound of yours owns its whole action. It starts the instant the action does (any silence at
the front of the file is skipped), and the RP's own click and landing thud for that action
step aside, so you only hear yours.

TESTING
  • On the RP: MENU › SOUND TEST lists every folder, says what it plays (YOUR FILE, ORIGINAL,
    USES K7-THUNK, SILENT) and plays it when you tap it.
  • On the laptop: run the RP (cd ~/Desktop/apps/recon-os, python3 -m http.server, open
    localhost:8000/v2/) and refresh. Whatever is in the folders plays there.
  • After it's pushed: give GitHub Pages a minute, then close and reopen the RP.

YOUR GAIN, YOUR CUTS. Every file plays exactly as it is; the RP only adds its on/off switch
(MENU › KEY SOUNDS). The originals are quiet clicks, so keep yours short and set the level
before you drop it in. iPhone plays WAV, MP3 and M4A.

The Morse tone (REF › CIPHER) is generated and has no folder.
