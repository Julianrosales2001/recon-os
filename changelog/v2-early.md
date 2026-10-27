# v2 early · RX-90 dot-matrix rebuild

**Shipped:** 2026-10-06  
**Snapshot:** [the whole repo at this version](https://github.com/Julianrosales2001/recon-os/tree/d35bf7e)  
**Against the version before:** 87 files · +5554 / −0 lines

The rebuild as a physical device: the dot-matrix VFD, the STN LCD and the amber clock, before releases were numbered.

## New

- **RX-90 v2 dot-matrix rebuild (VFD + STN LCD)**  `05b71db` · [05b71db](https://github.com/Julianrosales2001/recon-os/commit/05b71db) · 2026-10-06
- **hold or double-tap jog dial to recenter + reset zoom**  `887d10a` · [887d10a](https://github.com/Julianrosales2001/recon-os/commit/887d10a) · 2026-10-06
- **fold category presets** · they reopen while filing a mark  `6e7a4d0` · [6e7a4d0](https://github.com/Julianrosales2001/recon-os/commit/6e7a4d0) · 2026-10-06
- **function drum (MENU · SCAN · FILTER) + clean MARK key**  `cc48975` · [cc48975](https://github.com/Julianrosales2001/recon-os/commit/cc48975) · 2026-10-06
- **RP-1000 wordmark (Y2K speed cut) + R.OS naming**  `f2f7026` · [f2f7026](https://github.com/Julianrosales2001/recon-os/commit/f2f7026) · 2026-10-06
- **phosphor R.OS app icon**  `c9e24d4` · [c9e24d4](https://github.com/Julianrosales2001/recon-os/commit/c9e24d4) · 2026-10-06
- **RP-1000 housing — pebble shell, faceplate, vents, screws, ribs, spec plate**  `3a89a89` · [3a89a89](https://github.com/Julianrosales2001/recon-os/commit/3a89a89) · 2026-10-06
- **RP-1000 keys — rubber, silicone, gunmetal, jewel lamps from the light labs**  `4c789f2` · [4c789f2](https://github.com/Julianrosales2001/recon-os/commit/4c789f2) · 2026-10-06
- **REF pocket reference (first aid, knots, convert) + offline service worker**  `a67c1ed` · [a67c1ed](https://github.com/Julianrosales2001/recon-os/commit/a67c1ed) · 2026-10-06
- **LOT parcel lookup (TxGIO county records) + lot section on marks**  `a401a30` · [a401a30](https://github.com/Julianrosales2001/recon-os/commit/a401a30) · 2026-10-06
- **LOT parcel lookup + TxDOT traffic counts on map, lot record and marks**  `d35bf7e` · [d35bf7e](https://github.com/Julianrosales2001/recon-os/commit/d35bf7e) · 2026-10-06

## Fixed

- **map tile fallback (CARTO → Esri → OSM) + auto calibration**  `f0d78d0` · [f0d78d0](https://github.com/Julianrosales2001/recon-os/commit/f0d78d0) · 2026-10-06
- **CARTO now requires API key** · switch to Esri dark gray + OSM fallback  `3cfbebd` · [3cfbebd](https://github.com/Julianrosales2001/recon-os/commit/3cfbebd) · 2026-10-06
- **pinch then lift one finger turned map center into NaN (blank map)**  `123c277` · [123c277](https://github.com/Julianrosales2001/recon-os/commit/123c277) · 2026-10-06
- **GPS jitter filter keeps your dot still when stationary**  `26a7a16` · [26a7a16](https://github.com/Julianrosales2001/recon-os/commit/26a7a16) · 2026-10-06
- **blend iOS bottom strip + version tags so phones load new files**  `dae25b5` · [dae25b5](https://github.com/Julianrosales2001/recon-os/commit/dae25b5) · 2026-10-06
- **fill full screen when running from the Home Screen**  `5093114` · [5093114](https://github.com/Julianrosales2001/recon-os/commit/5093114) · 2026-10-06

## Where the code moved

| lines changed | file |
|---:|---|
| 1649 | `v2/js/screens.js` |
| 1230 | `v2/js/main.js` |
| 493 | `v2/rx.css` |
| 397 | `v2/js/ui.js` |
| 353 | `v2/js/map.js` |
| 283 | `v2/js/store.js` |
| 244 | `v2/js/matrix.js` |
| 209 | `v2/js/font.js` |
| 146 | `v2/index.html` |
| 128 | `v2/js/geo.js` |
| 119 | `v2/ref/firstaid.json` |
| 85 | `v2/js/parcel.js` |

---

Compare with the version before: https://github.com/Julianrosales2001/recon-os/compare/55189f3...d35bf7e  
Open this exact version locally: `git checkout d35bf7e` (then `git checkout main` to come back)
