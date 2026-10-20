RP SOUND PUSH
=============

Drop a sound into a v2/sfx folder and it reaches the phone by itself. No renaming, no git.

SET IT UP ONCE
  cd ~/Desktop/apps/recon-os
  bash tools/sfx-autopush/install.sh
  If macOS asks whether "RP Sound Push" can access files in your Desktop folder, click Allow.

WHAT IT DOES
  A small background app (~/Applications/RP Sound Push.app, no Dock icon) looks at v2/sfx every
  10 seconds and starts by itself at login. When a folder gets a new .mp3, .wav or .m4a:
    • it waits until the file has finished copying,
    • renames it to that folder's sound file (sound.mp3 / sound.wav / sound.m4a),
      replacing the sound that was there (the old one stays in git history),
    • commits just that sound ("tweak: sound - A2-aux-open") and pushes.
  A notification says PUSHED A2-aux-open; the phone has it about a minute later.
  Deleting your sound from a folder pushes that too, and the folder goes back to its
  original or related sound.

  It only ever commits sound files in v2/sfx. Anything else you're working on, staged or not,
  stays exactly as it is. Note that the push sends up any commits you already made and
  haven't pushed yet.

WHEN IT SAYS SOMETHING ELSE
  TWO NEW SOUNDS IN …        two files landed in one folder; leave just the one you want
  … WON'T PLAY ON AN IPHONE   use .mp3, .wav or .m4a
  THE PUSH FAILED (OFFLINE?)  it's saved and it retries every minute until it goes up
  CAN'T OPEN THE RECON-OS FOLDER   allow it in System Settings › Privacy & Security ›
                                   Files and Folders › RP Sound Push › Desktop Folder
  It pauses while git is busy (a merge, a rebase, a commit in progress) or you're off main.

  Log: ~/Library/Logs/rp-sound-push.log

TURN IT OFF
  bash tools/sfx-autopush/uninstall.sh
