# RECON.OS RX-90 (v2)

Dot-matrix rebuild of RECON.OS. Same data format as v1 (same `recon.os.*`
localStorage keys, backup version 7). v2-only settings live in `recon.os.v2prefs`.

## Run on the laptop

    cd ~/Desktop/apps/recon-os
    python3 -m http.server

Open http://localhost:8000/v2/ — first launch shows NO DATA → IMPORT FILE →
pick your `recon-os-backup-*.json`.

## Keys (laptop)

M mark · 1–6 file a fresh mark · P AUX slider · A SCAN · W HERE · F tools tray ·
Enter = jog push · Esc = back · drag = pan · scroll = zoom · L log · S search ·
H health (fast · stages · train) · O calendar · G legend · D cycle LCD readout

## Files

    index.html   chassis (keys, lamps, wells, tray)
    rx.css       chassis styling; desktop shows the handset on a desk
    js/font.js     5x7 + 3x5 character ROM, 7x7 pin symbols
    js/matrix.js   dot-matrix display engine (VFD main, STN LCD, amber clock)
    js/store.js    localStorage layer, v1-compatible
    js/geo.js      distances, place names (OpenStreetMap), search
    js/map.js      tile sampler → dots, fog, self-calibrating, state lines when zoomed far out
    data/us-states.json  state lines + US national border (Natural Earth 1:10m)
    js/ui.js       immediate-mode UI kit drawn into the matrix
    js/screens.js  all screens
    js/fit.js      HLTH ▸ TRAIN: exercises (recon.os.moves), one-tap logging into recon.os.workouts, its calendar colours
    js/aux.js      AUX slider (the screen panel rides up to uncover SCAN + HERE), SCAN sweep, HERE readout
    js/sfx.js      sound slots: your files from sfx/, else the parent slot, else the stock originals
    sfx/           drop sounds here named after their slot, then run python3 v2/sfx/build.py (see sfx/README.md)
    js/main.js     boot, navigation, keys, jog, touch, GPS, lamps
