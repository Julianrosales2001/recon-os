# RP-1000 sounds

Every sound the RP makes has a **slot**. To give a slot your own sound:

1. Name the file after the slot and drop it in this folder: `aux.open.wav`, `key.mp3`, `scan.ping.m4a`.
   WAV, M4A, MP3, AAC and CAF all play on iPhone. Keep them short.
2. Refresh the list: `python3 v2/sfx/build.py`
3. Commit and push as usual.

A slot with no file of its own plays its **parent** (`aux.open` → `thunk`). The parentless slots play the
originals in `stock/`. A slot marked *silent* stays quiet until you give it a file.

Each file plays at its own volume. To change one, edit `"vol"` in `sfx.json` (0 to 1, yours default to 0.7),
for example `"vol": { "aux.open": 0.8 }`. Re-running `build.py` keeps what you set.

MENU ▸ SOUND TEST lists every slot, says what it's playing (your file, stock, inherited or silent) and
plays it when you tap it.

| Slot | Plays when | Parent |
|---|---|---|
| key | any key press | — (stock) |
| jog | each click of the jog dial | — (stock) |
| mark | dropping a mark | — (stock) |
| file | filing or saving something | — (stock) |
| ok | something worked | — (stock) |
| err | something failed | — (stock) |
| thunk | heavy landings | — (stock) |
| drum.roll | the drum lands on a face | thunk |
| drum.press | the drum is pressed | thunk |
| fn.open | the FN cartridge flips out | thunk |
| fn.close | the FN cartridge stows | thunk |
| aux.latch | the AUX grip is tapped | key |
| aux.open | the AUX panel lands at the top | thunk |
| aux.close | the AUX panel lands home | thunk |
| aux.keyup | the SCAN and HERE keys spring up | key |
| aux.lamp | their lamps flicker on | silent |
| scan.ping | each sonar pulse | silent |
| scan.found | a sweep found places | ok |
| scan.empty | a sweep found nothing | key |
| here.fix | HERE takes a fix | ok |
| ring.pick | the category ring moves | jog |
| ring.file | the ring files a mark | file |
| gps.lock | the first GPS lock | ok |
| visit | a visit is logged at a mark | ok |
| boot | startup | silent |

The Morse tone (REF ▸ CIPHER) is generated and has no slot.
`stock/` holds the RP's original sounds, rendered from the synth that made them; keep them as they are.
