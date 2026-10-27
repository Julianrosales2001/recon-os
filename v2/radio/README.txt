RP-1000 RADIO
=============

Four stations, each a folder:

  88.1  BAROQUE      92.7  ROMANTIC      97.3  NOCTURNE      101.5  SYMPHONY

The built-in music (v2/data/radio.json) streams public-domain recordings from Wikimedia Commons,
mostly from Musopen. Anything you drop in a station folder joins that station's rotation.

ADD MUSIC
  • Drop an .mp3 or .m4a into a station folder.
  • Name it "Composer - Piece.mp3" (for example "Erik Satie - Gymnopedie No. 1.mp3") and the
    radio shows it that way. Without the " - " the whole name shows as the piece.
  • With RP Sound Push on (tools/sfx-autopush, set up once, run install.sh again after this
    update), that's all: it rebuilds index.json, commits just v2/radio and pushes.
    The notification says RADIO ▸ NOCTURNE; it's on air about a minute later.
  • Without it: add the file to index.json by hand ({"file":"radio/NOCTURNE/x.mp3","len":seconds}),
    then commit and push.

ONLY PUBLIC-DOMAIN OR FREE MUSIC
  The recording has to be free to use, not just the composition. Musopen, U.S. military band
  recordings, CC0 uploads and recordings made before 1926 are safe. A track ripped from Spotify
  or a CD is not.

SIZE
  Music lives in the repo, so keep it to a few dozen tracks; 128 kbps MP3 is about 1 MB a minute.

Each station plays its list on a loop on a clock, so when you tune in you join mid-piece, like
real radio.
