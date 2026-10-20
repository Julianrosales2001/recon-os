RP-1000 SOUNDS
==============

One folder per moment on the RP. Put a sound file in a folder, push, and the RP plays it
at that moment. No script to run: the RP looks for these exact names itself.

  sound.mp3      your sound. sound.wav and sound.m4a work too (.mp3 wins if there's more than one).
  original.wav   the RP's own sound, in the K folders only. Keep these.

A folder with no sound of yours plays its related sound, and its README.txt says which
(A2-aux-open plays K7-thunk). A5-aux-lamp, S1-scan-ping, B1-boot stay silent until you fill them.
Each folder's README.txt says when it plays.

TESTING
  • On the RP: MENU › SOUND TEST lists every folder, says what it plays (YOUR FILE, ORIGINAL,
    USES K7-THUNK, SILENT) and plays it when you tap it.
  • Before pushing: run the RP on the laptop (cd ~/Desktop/apps/recon-os, python3 -m http.server,
    open localhost:8000/v2/). What you just dropped in plays there.
  • After pushing: give GitHub Pages a minute, then close and reopen the RP.

YOUR GAIN, YOUR CUTS. Every file plays exactly as it is; the RP only adds its on/off switch
(MENU › KEY SOUNDS). The originals are quiet clicks, so keep yours short and set the level
before you drop it in. iPhone plays WAV, MP3 and M4A.

The Morse tone (REF › CIPHER) is generated and has no folder.
