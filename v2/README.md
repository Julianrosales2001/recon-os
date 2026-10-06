# RECON.OS RX-90 (v2)

Dot-matrix rebuild of RECON.OS. Same data format as v1 (same `recon.os.*`
localStorage keys, backup version 7). v2-only settings live in `recon.os.v2prefs`.

## Run on the laptop

    cd ~/Desktop/apps/recon-os
    python3 -m http.server

Open http://localhost:8000/v2/ — first launch shows NO DATA → IMPORT FILE →
pick your `recon-os-backup-*.json`.

## Keys (laptop)

M mark · 1–6 file / show only · F tools tray · Enter = jog push · Esc = back ·
drag = pan · scroll = zoom · L log · S search · H fast · O objectives ·
G legend · D cycle LCD readout

## Files

    index.html   chassis (keys, lamps, wells, tray)
    rx.css       chassis styling; desktop shows the handset on a desk
    js/font.js     5x7 + 3x5 character ROM, 7x7 pin symbols
    js/matrix.js   dot-matrix display engine (VFD main, STN LCD, amber clock)
    js/store.js    localStorage layer, v1-compatible
    js/geo.js      distances, place names (OpenStreetMap), search
    js/map.js      tile sampler → dots, fog, self-calibrating
    js/ui.js       immediate-mode UI kit drawn into the matrix
    js/screens.js  all screens
    js/main.js     boot, navigation, keys, jog, touch, GPS, lamps
