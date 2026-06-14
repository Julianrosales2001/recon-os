/* =============================================================
   RECON.OS v1 — Personal POI tool
   ============================================================= */

// ===== CONFIG =====
const CATEGORIES = [
  { id: 'WAYPOINT', label: 'WAYPT',  color: '#c8331f' },
  { id: 'VISTA',    label: 'VISTA',  color: '#e87819' },
  { id: 'LANDMARK', label: 'LANDMK', color: '#1d4ea8' },
  { id: 'SUPPLY',   label: 'SUPPLY', color: '#2d8a3e' },
  { id: 'INTEL',    label: 'INTEL',  color: '#a82770' },
  { id: 'HAZARD',   label: 'HAZARD', color: '#e8b818' },
];

// POI TYPE — symbol drawn inside the pennant OR (when shape='ICON') used AS the
// entire marker. Each symbol is a single SVG fragment in a 20×20 local coord
// system centered on (0,0). Stroke uses currentColor so we can color-swap
// without redefining the path.
const POI_TYPES = [
  { id: 'NONE',     label: 'NONE',     svg: '' },
  { id: 'HOME',     label: 'HOME',     svg: '<path d="M-7 1 L0 -6 L7 1 L7 7 L2 7 L2 2 L-2 2 L-2 7 L-7 7 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'WORK',     label: 'WORK',     svg: '<rect x="-7" y="-2" width="14" height="9" rx="1" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><path d="M-3 -2 L-3 -5 L3 -5 L3 -2" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><line x1="-7" y1="2" x2="7" y2="2" stroke="#1a0f06" stroke-width="0.8"/>' },
  { id: 'FOOD',     label: 'FOOD',     svg: '<line x1="-4" y1="-7" x2="-4" y2="7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="-7" y1="-7" x2="-7" y2="-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="-1" y1="-7" x2="-1" y2="-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M-7 -1 L-1 -1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M5 -7 C3 -7 2 -5 2 -2 C2 1 3 2 5 2 L5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>' },
  { id: 'FUEL',     label: 'FUEL',     svg: '<rect x="-6" y="-7" width="9" height="14" rx="1" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><line x1="-4" y1="-4" x2="1" y2="-4" stroke="#1a0f06" stroke-width="1.2"/><line x1="-4" y1="-2" x2="1" y2="-2" stroke="#1a0f06" stroke-width="1.2"/><path d="M3 -3 L6 -3 L6 4 L7 5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' },
  { id: 'PARKING',  label: 'PARKING',  svg: '<rect x="-7" y="-7" width="14" height="14" rx="2" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><text x="0" y="3" text-anchor="middle" font-family="Saira Stencil One, sans-serif" font-size="12" font-weight="900" fill="#1a0f06">P</text>' },
  { id: 'SHOP',     label: 'SHOP',     svg: '<path d="M-7 -1 L-5 -7 L5 -7 L7 -1 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><rect x="-6" y="-1" width="12" height="8" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><path d="M-3 -1 L-3 3 M3 -1 L3 3" fill="none" stroke="#1a0f06" stroke-width="1"/>' },
  { id: 'CAMERA',   label: 'CAMERA',   svg: '<rect x="-7" y="-4" width="14" height="10" rx="1" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><path d="M-3 -4 L-2 -6 L2 -6 L3 -4" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><circle cx="0" cy="1" r="3" fill="#1a0f06"/><circle cx="0" cy="1" r="1.5" fill="currentColor"/>' },
  { id: 'WRENCH',   label: 'WRENCH',   svg: '<path d="M-5 -7 L-2 -4 L-4 -2 L-7 -5 C-8 -3 -7 -1 -5 0 L4 7 L7 4 L-2 -5 C-1 -7 -3 -8 -5 -7 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'BED',      label: 'BED',      svg: '<path d="M-7 1 L-7 6 L7 6 L7 1 L-2 1 L-2 -2 C-2 -3 -1 -4 0 -4 L4 -4 C5 -4 6 -3 6 -2 L6 1 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><line x1="-7" y1="6" x2="-7" y2="3" stroke="#1a0f06" stroke-width="1"/><line x1="7" y1="6" x2="7" y2="3" stroke="#1a0f06" stroke-width="1"/>' },
  { id: 'MEDICAL',  label: 'MEDICAL',  svg: '<rect x="-7" y="-7" width="14" height="14" rx="2" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><path d="M-2 -4 L-2 -1 L-5 -1 L-5 1 L-2 1 L-2 4 L2 4 L2 1 L5 1 L5 -1 L2 -1 L2 -4 Z" fill="#1a0f06"/>' },
  { id: 'GYM',      label: 'GYM',      svg: '<rect x="-7" y="-2" width="2" height="4" fill="currentColor" stroke="#1a0f06" stroke-width="0.8"/><rect x="-5" y="-4" width="2" height="8" fill="currentColor" stroke="#1a0f06" stroke-width="0.8"/><rect x="-3" y="-1" width="6" height="2" fill="currentColor" stroke="#1a0f06" stroke-width="0.8"/><rect x="3" y="-4" width="2" height="8" fill="currentColor" stroke="#1a0f06" stroke-width="0.8"/><rect x="5" y="-2" width="2" height="4" fill="currentColor" stroke="#1a0f06" stroke-width="0.8"/>' },
  { id: 'TREE',     label: 'PARK',     svg: '<path d="M0 -8 L-5 -2 L-2 -2 L-6 4 L-2 4 L-2 7 L2 7 L2 4 L6 4 L2 -2 L5 -2 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'STAR',     label: 'STAR',     svg: '<path d="M0 -7 L2 -2 L7 -2 L3 1 L4.5 6 L0 3 L-4.5 6 L-3 1 L-7 -2 L-2 -2 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'HEART',    label: 'HEART',    svg: '<path d="M0 6 C-7 1 -7 -4 -4 -6 C-2 -7 0 -5 0 -3 C0 -5 2 -7 4 -6 C7 -4 7 1 0 6 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'DOLLAR',   label: 'DOLLAR',   svg: '<circle cx="0" cy="0" r="7" fill="currentColor" stroke="#1a0f06" stroke-width="1"/><text x="0" y="4" text-anchor="middle" font-family="Saira Stencil One, sans-serif" font-size="11" font-weight="900" fill="#1a0f06">$</text>' },
  { id: 'ANCHOR',   label: 'ANCHOR',   svg: '<circle cx="0" cy="-5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="0" y1="-3" x2="0" y2="6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><line x1="-3" y1="-1" x2="3" y2="-1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M-5 3 C-5 6 -3 7 0 6 C3 7 5 6 5 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' },
  { id: 'PEAK',     label: 'PEAK',     svg: '<path d="M-7 6 L-2 -3 L0 0 L3 -6 L7 6 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><path d="M-2 -3 L0 -1 L1 -2" fill="none" stroke="#1a0f06" stroke-width="0.8"/>' },
  { id: 'WATER',    label: 'WATER',    svg: '<path d="M0 -7 C-4 -2 -6 1 -6 3 C-6 6 -3 7 0 7 C3 7 6 6 6 3 C6 1 4 -2 0 -7 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/>' },
  { id: 'WARNING',  label: 'WARNING',  svg: '<path d="M0 -7 L7 6 L-7 6 Z" fill="currentColor" stroke="#1a0f06" stroke-width="1" stroke-linejoin="round"/><line x1="0" y1="-2" x2="0" y2="2" stroke="#1a0f06" stroke-width="1.4" stroke-linecap="round"/><circle cx="0" cy="4" r="0.8" fill="#1a0f06"/>' },
];

// MARKER SHAPE — pennant flag or symbol-only.
// FLAG: traditional surveyor's pennant with symbol drawn inside (or empty if NONE)
// ICON: the symbol IS the marker. Larger, centered on the latlng, with subtle outline.
const POI_SHAPES = [
  { id: 'FLAG', label: 'FLAG' },
  { id: 'ICON', label: 'ICON' },
];

// ===== MISSIONS / OBJECTIVES =====
// Each mission: {
//   id, title, notes, priority ('normal'|'urgent'),
//   status ('active'|'complete'), created, completed,
//   lat, lng, poiId, deadline
// }
let missions = [];
let activeObjectivesTab = 'active';       // 'active' | 'complete' | 'all'
let objectivesSearchQuery = '';
let objectivesSortMode = 'smart';         // 'smart' | 'deadline' | 'created' | 'priority' | 'distance'
let missionMarkerLayer = null;
let editingMissionId = null;
// Map-picking mode for missions
let missionPickMode = false;
let pendingMissionDraft = null;           // saved form state during map-pick
// Map-picking mode for POI link
let missionPoiPickMode = false;
// Draft autosave (lossless edit recovery)
const MISSION_DRAFT_KEY = 'recon.os.missionDraft';

// ===== STATE =====
let userPos = null;             // {lat, lng}
let lastFix = null;             // timestamp of last good GPS fix
let lastSamplePos = null;       // last position we recorded for fog
let pois = [];                  // array of POI objects
let revealedCells = new Set();  // set of "lat_lng" cell IDs that are revealed
let regions = [];               // array of region objects
let currentRegionId = null;     // id of region user is currently inside
let journalEntries = [];        // chronological event log
let todayTrail = [];            // array of {lat, lng, ts} — today's GPS samples only
let trailLayer = null;          // Leaflet polyline for today's trail
let showTrail = true;           // user toggle, default on
let map = null;
let userMarker = null;
let markerLayer = null;
let boundaryLayer = null;       // Leaflet layer group for region boundary polygons
let fogPolygon = null;          // Leaflet polygon representing fog with holes
let oceanRings = [];            // Natural Earth 50m ocean rings, baked into fog
let stateOutlinesLayer = null;  // 48 mainland US state outlines (cyan, toggleable)
let editingId = null;           // currently editing POI id
let selectedCategory = 'WAYPOINT';
let selectedType = 'NONE';
let selectedShape = 'FLAG';
let editorPhoto = null;         // base64 data URL for photo being edited
let editorHVA = false;          // legacy — no longer wired to UI but kept until full removal
let editorTier = 2;             // tier (1/2/3) of POI being edited; default MED
let selectedPoiId = null;       // currently selected on map (gets a halo)
let liveNavPoiId = null;        // POI whose distance/bearing should live-update on GPS
let userAltitudeM = null;       // latest GPS altitude in meters (null if not available)
let userHeading = null;         // latest GPS heading in degrees (null if not moving / not available)
let repositionPoiId = null;     // POI currently being repositioned (Lyft-style flow)
let repositionOriginalLatLng = null;
let repositionOriginalSector = null;

// ===== UNDO STACK =====
// One-deep last-action undo. Each pushed action has a label and a fn that
// restores the previous state. The undo button appears for 6 seconds after
// any undoable action.
let lastUndoableAction = null;
let undoHideTimer = null;

function pushUndo(label, restoreFn) {
  lastUndoableAction = { label, restoreFn, ts: Date.now() };
  const btn = document.getElementById('undoBtn');
  document.getElementById('undoLabel').textContent = label;
  btn.classList.add('visible');
  if (undoHideTimer) clearTimeout(undoHideTimer);
  undoHideTimer = setTimeout(() => {
    btn.classList.remove('visible');
    lastUndoableAction = null;
  }, 6000);
}

function doUndo() {
  if (!lastUndoableAction) return;
  try {
    lastUndoableAction.restoreFn();
    showToast('UNDONE · ' + lastUndoableAction.label);
  } catch (e) {
    showToast('UNDO FAILED');
  }
  lastUndoableAction = null;
  document.getElementById('undoBtn').classList.remove('visible');
  if (undoHideTimer) clearTimeout(undoHideTimer);
}

// ===== FOG OF WAR CONSTANTS =====
const FOG_CELL_DEG = 0.0014;        // ~150m at Houston latitude
const FOG_SAMPLE_MIN_METERS = 50;   // only record movement after >50m

// ===== REGION / SECTOR CONSTANTS =====
// Sector = 1000ft × 1000ft = ~305m × ~305m grid square inside a region.
// In degrees at ~30°N latitude: 305m / 111000 ≈ 0.00275° lat, 305m / 96000 ≈ 0.00318° lng.
// We'll use the average for simplicity — close enough that no one will notice.
const SECTOR_DEG = 0.00295;

// Regions are now defined by the nearest city/town from reverse geocoding (OSM Nominatim),
// not by a fixed radius from an origin point. We re-check the region when GPS has moved
// REGION_CHECK_DIST_M from the last check — keeps Nominatim calls reasonable (free tier
// allows ~1 req/sec; we typically check every couple miles when driving).
const REGION_CHECK_DIST_M = 3200;  // ~2mi
let lastRegionCheckPos = null;     // pos where we last reverse-geocoded
let regionCheckInFlight = false;   // simple lock to avoid overlapping calls

// ===== CLUSTER CONSTANTS =====
// 3+ POIs within 1500ft of each other form a cluster
const CLUSTER_RADIUS_FT = 1500;
const CLUSTER_RADIUS_M = CLUSTER_RADIUS_FT * 0.3048;  // ~457m
const CLUSTER_MIN_POIS = 3;
let clusterLayer = null;  // Leaflet layer group for cluster outlines

// ===== VISIT TRACKING CONSTANTS =====
// Per-category distance (feet) and dwell (minutes) thresholds for auto-visits.
// HAZARD has no visit logging — it only triggers proximity alerts (not implemented here).
const VISIT_RULES = {
  WAYPOINT: { distFt: 100, dwellSec: 60 },
  VISTA:    { distFt: 200, dwellSec: 180 },
  LANDMARK: { distFt: 200, dwellSec: 120 },
  SUPPLY:   { distFt: 100, dwellSec: 300 },
  INTEL:    { distFt: 100, dwellSec: 180 },
  HAZARD:   null,  // no visits
};
// Track per-POI dwell timers: { [poiId]: { since: ts } }
let visitDwellState = {};

// ===== STORAGE =====
function loadPOIs() {
  try {
    const raw = localStorage.getItem('recon.os.pois');
    pois = raw ? JSON.parse(raw) : [];
    // One-time migration: backfill tier from the old hva flag.
    //   hva: true  → tier 3 (HIGH, always visible)
    //   anything else → tier 2 (MED, default for new POIs)
    // Old POIs keep their hva field on disk for back-compat but it's no
    // longer read or written anywhere meaningful.
    pois.forEach(p => {
      if (typeof p.tier !== 'number') {
        p.tier = p.hva ? 3 : 2;
      }
    });
  } catch (e) {
    pois = [];
  }
}
function savePOIs() {
  safeSet('recon.os.pois', JSON.stringify(pois));
}

// One-time batch import of 15 auto/parts supply vendors. Runs once per device,
// gated on recon.os.supplyPOIsSeeded so deleted entries don't re-import.
// To force re-seed: clear that flag from localStorage and reload.
// All entries: category=SUPPLY, type=WRENCH, shape=ICON (wrench is the marker
// itself), tier=2 (MED). Coordinates verified manually by user.
function seedSupplyPOIs() {
  try {
    if (localStorage.getItem('recon.os.supplyPOIsSeeded') === '1') return;
  } catch (e) { return; }

  const SUPPLY_POIS = [
    { name: 'SEAT REPAIR · 11525 Main St',                lat: 29.66067, lng: -95.43974,
      notes: '11525 Main St, Houston, TX 77025\nPhone: (346) 371-7018' },
    { name: 'FITTINGS/HOSES · DF Sales',                  lat: 29.78199, lng: -95.12231,
      notes: '15818 Avenue C, Channelview, TX 77530' },
    { name: "DEF/RADIATOR · Don Hart's Radiator Shop",    lat: 29.77227, lng: -95.17521,
      notes: '14014 Muscatine St, Houston, TX 77015\nDEF cleaning + radiator repair' },
    { name: 'HYDRAULIC SEALS · Martin Fluid Power',       lat: 29.79534, lng: -95.46038,
      notes: '6130 Westview Dr, Houston, TX 77055' },
    { name: 'MUFFLERS/RADIATORS · Medinas Body Shop',     lat: 29.83004, lng: -95.36134,
      notes: '802 Caperton St, Houston, TX 77022\nNear Ramon. Also handles muffler work.' },
    { name: 'DECALS · Sign Pros',                         lat: 29.78168, lng: -95.11323,
      notes: '16120 East Fwy, Channelview, TX 77530' },
    { name: "STARTERS · Tracy's Electric Supply",         lat: 29.80521, lng: -95.30252,
      notes: '4851 Homestead Rd Ste 100, Houston, TX 77028' },
    { name: 'BATTERIES · Continental Battery Systems',    lat: 29.81739, lng: -95.39906,
      notes: '3408 Yale St, Houston, TX 77018' },
    { name: 'PROPANE · Alex',                             lat: 29.71643, lng: -95.28704,
      notes: '7402 Lawndale St, Houston, TX 77012' },
    { name: 'ENGINE HEAD REPAIR',                         lat: 29.77424, lng: -95.17503,
      notes: '14021 Garber Ln, Houston, TX 77015\nPhone: (713) 628-3237' },
    { name: 'CYLINDER REPAIR · Humberto',                 lat: 29.68451, lng: -95.29908,
      notes: '7257 Edna St, Houston, TX 77087\nPhone: (713) 206-9405' },
    { name: 'HYDRAULIC SEALS #2 · Power Supply Components', lat: 29.76081, lng: -95.30480,
      notes: '4740 Eastpark Dr, Houston, TX 77028' },
    { name: 'RADIATOR · Stop Leak Radiator (Juan)',       lat: 29.89704, lng: -95.40342,
      notes: '218 W Mount Houston Rd, Houston, TX 77037\nPhone: (713) 658-5100' },
    { name: 'BEARINGS · Houston Bearings',                lat: 29.77818, lng: -95.41641,
      notes: '5311 Cornish St, Houston, TX 77007\nPhone: (713) 869-7292' },
    { name: 'DRIVESHAFTS · C&T Driveshaft',               lat: 29.70810, lng: -95.30649,
      notes: '6347 Griggs Rd, Houston, TX 77023' },
  ];

  const now = Date.now();
  SUPPLY_POIS.forEach((p, i) => {
    pois.push({
      id: 'POI-SUPPLY-' + (i + 1).toString().padStart(2, '0'),
      lat: p.lat,
      lng: p.lng,
      category: 'SUPPLY',
      type: 'WRENCH',
      shape: 'ICON',          // wrench symbol IS the marker (no flag wrapper)
      name: p.name,
      notes: p.notes,
      photo: null,
      hva: false,              // legacy field
      tier: 2,                 // MED — visible at zoom 10+
      regionId: null,          // unassigned; gets a region next time the user views nearby
      sector: null,
      // Spread created timestamps by a millisecond each so list sorts are stable
      created: now + i,
      visits: 0,
      lastVisited: null,
    });
  });

  savePOIs();
  try { localStorage.setItem('recon.os.supplyPOIsSeeded', '1'); } catch (e) {}
}

function loadMissions() {
  try {
    const raw = localStorage.getItem('recon.os.missions');
    missions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    missions = [];
  }
}
function saveMissions() {
  safeSet('recon.os.missions', JSON.stringify(missions));
}

// ===== FOG SERIALIZATION =====
// Cells are stored in-memory as string IDs ("29.74000_-94.99000") — that
// format is referenced throughout the codebase and we don't want to churn it.
// On disk, however, we pack each cell into a single integer to halve the
// stored size. ~50% reduction in fog footprint at the serialization boundary.
//
// Pack scheme:
//   latIdx = round(cellLat / FOG_CELL_DEG)        // can be negative
//   lngIdx = round(cellLng / FOG_CELL_DEG)        // can be negative
//   packed = (latIdx + LAT_OFFSET) * LNG_STRIDE + (lngIdx + LAT_OFFSET)
// The offsets keep both indices positive within global coverage range.
const FOG_PACK_OFFSET = 200000;        // shifts negative indices positive
const FOG_PACK_STRIDE = 500000;        // > 2 * FOG_PACK_OFFSET, ample headroom
function cellIdToPacked(cellId) {
  const [lat, lng] = cellId.split('_').map(Number);
  const latIdx = Math.round(lat / FOG_CELL_DEG);
  const lngIdx = Math.round(lng / FOG_CELL_DEG);
  return (latIdx + FOG_PACK_OFFSET) * FOG_PACK_STRIDE + (lngIdx + FOG_PACK_OFFSET);
}
function packedToCellId(packed) {
  const lngIdx = (packed % FOG_PACK_STRIDE) - FOG_PACK_OFFSET;
  const latIdx = Math.floor(packed / FOG_PACK_STRIDE) - FOG_PACK_OFFSET;
  const lat = latIdx * FOG_CELL_DEG;
  const lng = lngIdx * FOG_CELL_DEG;
  return lat.toFixed(5) + '_' + lng.toFixed(5);
}

function loadFog() {
  try {
    const raw = localStorage.getItem('recon.os.fog');
    const parsed = raw ? JSON.parse(raw) : [];
    // Detect format: new = numbers, legacy = strings.
    // Convert each entry back to the in-memory string-ID form.
    revealedCells = new Set();
    let migrationNeeded = false;
    for (const item of parsed) {
      if (typeof item === 'number') {
        revealedCells.add(packedToCellId(item));
      } else if (typeof item === 'string') {
        revealedCells.add(item);
        migrationNeeded = true;
      }
    }
    // If we found any legacy string entries, save in new format immediately.
    // This is the one-shot migration trigger.
    if (migrationNeeded && revealedCells.size > 0) {
      console.log('Fog cell compacting: migrating', revealedCells.size, 'cells to packed format');
      saveFog();  // throttled, will write in compact form
    }
  } catch (e) {
    revealedCells = new Set();
  }
}
function saveFog() {
  // Throttled — saving on every cell add would thrash storage
  if (saveFog._timer) clearTimeout(saveFog._timer);
  saveFog._timer = setTimeout(() => {
    // Serialize as packed integers. Skip any cell ID that fails to pack
    // (shouldn't happen, but be defensive).
    const packed = [];
    for (const cellId of revealedCells) {
      try {
        packed.push(cellIdToPacked(cellId));
      } catch (e) { /* skip malformed */ }
    }
    safeSet('recon.os.fog', JSON.stringify(packed));
  }, 2000);
}

// Convert lat/lng to a cell ID like "29.74_-94.99"
function cellIdFor(lat, lng) {
  const cellLat = Math.floor(lat / FOG_CELL_DEG) * FOG_CELL_DEG;
  const cellLng = Math.floor(lng / FOG_CELL_DEG) * FOG_CELL_DEG;
  return cellLat.toFixed(5) + '_' + cellLng.toFixed(5);
}

// Get the four corners of a cell (returns [sw, se, ne, nw] as [lat, lng] tuples)
function cellCorners(cellId) {
  const [lat, lng] = cellId.split('_').map(Number);
  return [
    [lat, lng],
    [lat, lng + FOG_CELL_DEG],
    [lat + FOG_CELL_DEG, lng + FOG_CELL_DEG],
    [lat + FOG_CELL_DEG, lng],
  ];
}

// Reveal the cell at this position AND the 8 neighbors (so the cleared area
// feels like a ~3-cell-wide trail, not a single dot). Returns true if anything
// new was revealed.
function revealAround(lat, lng) {
  let newCells = false;
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      const id = cellIdFor(lat + dLat * FOG_CELL_DEG, lng + dLng * FOG_CELL_DEG);
      if (!revealedCells.has(id)) {
        revealedCells.add(id);
        newCells = true;
      }
    }
  }
  if (newCells) saveFog();
  return newCells;
}

// Haversine distance in meters
function metersBetween(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ===== REGIONS & SECTORS =====
function loadRegions() {
  try {
    const raw = localStorage.getItem('recon.os.regions');
    regions = raw ? JSON.parse(raw) : [];
  } catch (e) {
    regions = [];
  }
  // One-shot migration: regions with `boundary` (raw GeoJSON) need to be
  // compacted to `boundarySimplified` (Leaflet-format, simplified, 4-decimal).
  // This was added after we discovered regions were eating 3+ MB of localStorage
  // because we stored raw OSM polygons (thousands of vertices each).
  let migrated = 0;
  let savedBytes = 0;
  regions.forEach(r => {
    if (r.boundary && !r.boundarySimplified) {
      try {
        const rawSize = JSON.stringify(r.boundary).length;
        // Convert raw GeoJSON → Leaflet coords → keep largest piece → simplify each ring → round
        let coords = geoJsonToLeafletCoords(r.boundary.type, r.boundary.coords);
        if (r.boundary.type === 'MultiPolygon') {
          coords = keepLargestPiece('MultiPolygon', coords);
        }
        // coords is now [ring, ring, ...] where ring = [[lat,lng], ...]
        const SIMPLIFY_TOL_M = 400;
        coords = coords.map(ring => simplifyRing(ring, SIMPLIFY_TOL_M));
        // Round each lat/lng to 4 decimals (~11 m precision — well under tolerance)
        coords = coords.map(ring => ring.map(pt => [
          Math.round(pt[0] * 10000) / 10000,
          Math.round(pt[1] * 10000) / 10000,
        ]));
        r.boundarySimplified = {
          coords: coords,
          fetched: r.boundary.fetched || Date.now(),
        };
        delete r.boundary;  // free the bulky raw copy
        const newSize = JSON.stringify(r.boundarySimplified).length;
        savedBytes += (rawSize - newSize);
        migrated++;
      } catch (e) {
        console.error('Region simplify migration failed for', r.name, e);
      }
    }
  });
  if (migrated > 0) {
    saveRegions();
    console.log('Region compacting:', migrated, 'regions simplified, ~' + Math.round(savedBytes / 1024) + ' KB freed');
  }
}
function saveRegions() {
  safeSet('recon.os.regions', JSON.stringify(regions));
}

// ===== JOURNAL =====
function loadJournal() {
  try {
    const raw = localStorage.getItem('recon.os.journal');
    journalEntries = raw ? JSON.parse(raw) : [];
  } catch (e) {
    journalEntries = [];
  }
}
function saveJournal() {
  // Keep only last 1000 entries to prevent unbounded growth
  if (journalEntries.length > 1000) {
    journalEntries = journalEntries.slice(-1000);
  }
  safeSet('recon.os.journal', JSON.stringify(journalEntries));
}
function logEvent(type, poiId, summary, meta) {
  journalEntries.push({
    ts: Date.now(),
    type: type,        // 'drop' | 'classify' | 'edit' | 'hva' | 'delete' | 'visit'
    poiId: poiId,
    summary: summary,
    meta: meta || '',
  });
  saveJournal();
}

// ===== TODAY'S TRAIL =====
function loadTrail() {
  try {
    const raw = localStorage.getItem('recon.os.trail');
    const parsed = raw ? JSON.parse(raw) : [];
    // Compact format: array of [lat, lng, tsSec] triples.
    // Legacy format: array of {lat, lng, ts} objects (ts in ms).
    // Detect and normalize to in-memory {lat, lng, ts} (ts in ms).
    todayTrail = parsed.map(pt => {
      if (Array.isArray(pt)) {
        return { lat: pt[0], lng: pt[1], ts: pt[2] * 1000 };
      }
      return pt;  // legacy object form
    });
  } catch (e) {
    todayTrail = [];
  }
  pruneTrailToToday();
}

function saveTrail() {
  if (saveTrail._timer) clearTimeout(saveTrail._timer);
  saveTrail._timer = setTimeout(() => {
    // Compact serialization: round lat/lng to 5 decimals (~1 m precision),
    // truncate timestamp to seconds, store as plain arrays. Cuts trail storage
    // by ~40% versus storing full {lat, lng, ts} objects with 7-decimal coords.
    const compact = todayTrail.map(pt => [
      Math.round(pt.lat * 100000) / 100000,
      Math.round(pt.lng * 100000) / 100000,
      Math.floor(pt.ts / 1000),
    ]);
    safeSet('recon.os.trail', JSON.stringify(compact));
  }, 2000);
}

function pruneTrailToToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  todayTrail = todayTrail.filter(pt => pt.ts >= startOfDay);
  saveTrail();
}

function recordTrailPoint(lat, lng) {
  pruneTrailToToday();  // cheap, ensures yesterday's points get cleared at midnight
  // Don't record if we haven't moved much from last point
  if (todayTrail.length > 0) {
    const last = todayTrail[todayTrail.length - 1];
    if (metersBetween(last.lat, last.lng, lat, lng) < 15) return;  // 15m noise floor
  }
  todayTrail.push({ lat, lng, ts: Date.now() });
  // Soft cap: hours of driving can generate 10K+ points. Keep most recent 5000.
  // At 15m spacing that's about 75 km of unique road which covers any single
  // day's worth of driving for a personal tool. Older points fall off silently.
  if (todayTrail.length > 5000) {
    todayTrail = todayTrail.slice(-5000);
  }
  saveTrail();
  renderTrail();
}

function renderTrail() {
  if (trailLayer) {
    map.removeLayer(trailLayer);
    trailLayer = null;
  }
  if (!showTrail || todayTrail.length < 2) return;
  const latlngs = todayTrail.map(pt => [pt.lat, pt.lng]);
  trailLayer = L.polyline(latlngs, {
    color: '#f0a040',
    weight: 2.5,
    opacity: 0.85,
    dashArray: '4 3',
    lineCap: 'round',
    interactive: false,
    pane: 'overlayPane',
  }).addTo(map);
}

// ===== PREFERENCES =====
// Persists UI state across sessions: trail toggle, filter, sort, search, legend.
function loadPrefs() {
  try {
    const raw = localStorage.getItem('recon.os.prefs');
    if (!raw) return;
    const p = JSON.parse(raw);
    if (typeof p.showTrail === 'boolean') showTrail = p.showTrail;
    if (typeof p.activeCategoryFilter === 'string') activeCategoryFilter = p.activeCategoryFilter;
    if (typeof p.activeTypeFilter === 'string') activeTypeFilter = p.activeTypeFilter;
    if (typeof p.activeRegionFilter === 'string') activeRegionFilter = p.activeRegionFilter;
    if (typeof p.listSearchQuery === 'string') listSearchQuery = p.listSearchQuery;
    if (typeof p.listSortMode === 'string') listSortMode = p.listSortMode;
    if (typeof p.legendOpen === 'boolean') prefLegendOpen = p.legendOpen;
    if (typeof p.fogOpacity === 'string' && FOG_OPACITY_VALUES[p.fogOpacity]) prefFogOpacity = p.fogOpacity;
    if (typeof p.activeLogTab === 'string') activeLogTab = p.activeLogTab;
    if (typeof p.showBoundaries === 'boolean') prefShowBoundaries = p.showBoundaries;
    if (typeof p.showStates === 'boolean') prefShowStates = p.showStates;
    if (typeof p.activeLegendTab === 'string') activeLegendTab = p.activeLegendTab;
    if (typeof p.activeObjectivesTab === 'string') activeObjectivesTab = p.activeObjectivesTab;
    if (typeof p.objectivesSortMode === 'string') objectivesSortMode = p.objectivesSortMode;
    if (typeof p.landscapeMode === 'boolean') prefLandscapeMode = p.landscapeMode;
  } catch (e) { /* ignore */ }
}

function savePrefs() {
  if (savePrefs._timer) clearTimeout(savePrefs._timer);
  savePrefs._timer = setTimeout(() => {
    safeSet('recon.os.prefs', JSON.stringify({
      showTrail: showTrail,
      activeCategoryFilter: activeCategoryFilter,
      activeTypeFilter: activeTypeFilter,
      activeRegionFilter: activeRegionFilter,
      listSearchQuery: listSearchQuery,
      listSortMode: listSortMode,
      legendOpen: prefLegendOpen,
      fogOpacity: prefFogOpacity,
      activeLogTab: activeLogTab,
      showBoundaries: prefShowBoundaries,
      showStates: prefShowStates,
      activeLegendTab: activeLegendTab,
      activeObjectivesTab: activeObjectivesTab,
      objectivesSortMode: objectivesSortMode,
      landscapeMode: prefLandscapeMode,
    }));
  }, 500);
}

let prefLegendOpen = false;
let prefFogOpacity = 'HEAVY';  // 'CLEAR' | 'LIGHT' | 'MEDIUM' | 'HEAVY'
let prefShowBoundaries = false;
let prefShowStates = false;

// ===== POI TIER SYSTEM =====
// Each POI has a tier 1-3 controlling at which zoom levels its marker is
// visible — same idea as Google/Apple Maps showing major landmarks at low
// zoom and minor places only when zoomed in. Replaces the old HVA flag
// (which conflated "important" with "always visible").
//
//   3 = HIGH  — visible at all zooms. Home, work, key locations.
//   2 = MED   — visible when zoomed to metro/city level or closer (default).
//   1 = LOW   — visible only when zoomed into neighborhood level or closer.
const TIER_MIN_ZOOM = { 1: 13, 2: 10, 3: 0 };
const TIER_LABELS   = { 1: 'LOW', 2: 'MED', 3: 'HIGH' };
let prefLandscapeMode = false;

const FOG_OPACITY_VALUES = {
  CLEAR: 0.35,
  LIGHT: 0.60,
  MEDIUM: 0.80,
  HEAVY: 1.0,
};

// ===== CLUSTER DETECTION =====
// Find groups of 3+ classified POIs within CLUSTER_RADIUS_M of each other.
// Uses a simple union-find approach: every pair within range gets merged into the same group.
function findClusters() {
  const classified = pois.filter(p => p.category);
  if (classified.length < CLUSTER_MIN_POIS) return [];

  // parent[i] = index of parent for union-find
  const parent = classified.map((_, i) => i);
  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // Merge any pair within radius
  for (let i = 0; i < classified.length; i++) {
    for (let j = i + 1; j < classified.length; j++) {
      const d = metersBetween(classified[i].lat, classified[i].lng, classified[j].lat, classified[j].lng);
      if (d <= CLUSTER_RADIUS_M) union(i, j);
    }
  }

  // Group by root
  const groups = {};
  classified.forEach((p, i) => {
    const root = find(i);
    if (!groups[root]) groups[root] = [];
    groups[root].push(p);
  });

  // Return only groups with 3+ members
  return Object.values(groups).filter(g => g.length >= CLUSTER_MIN_POIS);
}

// Compute a bounding box for a cluster (with a small padding)
function clusterBounds(group) {
  const lats = group.map(p => p.lat);
  const lngs = group.map(p => p.lng);
  const pad = 0.0003; // small padding so flags fit inside the box
  return [
    [Math.min(...lats) - pad, Math.min(...lngs) - pad],
    [Math.max(...lats) + pad, Math.max(...lngs) + pad],
  ];
}

function renderClusters() {
  if (clusterLayer) {
    map.removeLayer(clusterLayer);
    clusterLayer = null;
  }
  const groups = findClusters();
  if (groups.length === 0) return;

  clusterLayer = L.layerGroup().addTo(map);
  groups.forEach((g, i) => {
    const [sw, ne] = clusterBounds(g);
    const rect = L.rectangle([sw, ne], {
      color: '#8a3220',
      weight: 1.2,
      opacity: 0.7,
      dashArray: '3 2',
      fill: false,
      interactive: false,
    });
    rect.addTo(clusterLayer);

    // Label at upper-left corner
    const labelId = String(i + 1).padStart(2, '0');
    const labelLat = ne[0];
    const labelLng = sw[1];
    const labelIcon = L.divIcon({
      html: `<div style="
        font-family: 'Special Elite', cursive;
        font-size: 10px;
        font-weight: 700;
        color: rgba(130, 50, 30, 0.9);
        letter-spacing: 0.05em;
        white-space: nowrap;
        text-shadow: 0 0 3px rgba(255, 240, 220, 0.6);
        pointer-events: none;
      ">CLUSTER ${labelId}</div>`,
      className: '',
      iconSize: [80, 14],
      iconAnchor: [0, 14],
    });
    L.marker([labelLat, labelLng], { icon: labelIcon, interactive: false }).addTo(clusterLayer);
  });
}

// ===== VISIT TRACKING =====
// Called on every GPS update with current lat/lng. For each classified POI with
// a visit rule, check if user is within that category's distance threshold. If yes,
// start (or continue) a dwell timer. When dwell exceeds threshold and we haven't
// already logged a visit in this session for that POI, increment its visit count.
function checkVisits(lat, lng) {
  const now = Date.now();
  const seenThisCheck = new Set();

  pois.forEach(p => {
    if (!p.category) return;
    const rule = VISIT_RULES[p.category];
    if (!rule) return;

    const distM = metersBetween(lat, lng, p.lat, p.lng);
    const distFt = distM * 3.28084;

    if (distFt <= rule.distFt) {
      seenThisCheck.add(p.id);
      const state = visitDwellState[p.id] || { since: now, logged: false };
      // First time we're entering range — record entry time
      if (!visitDwellState[p.id]) state.since = now;

      const dwellSec = (now - state.since) / 1000;
      if (dwellSec >= rule.dwellSec && !state.logged) {
        // Visit threshold met — increment counter and log
        p.visits = (p.visits || 0) + 1;
        p.lastVisited = now;
        savePOIs();
        state.logged = true;
        const displayName = p.name || ('POI-' + p.id.slice(-6));
        logEvent('visit', p.id, 'Visited: ' + displayName, p.category + ' · ×' + p.visits);
        // Animate the flag briefly
        pulseFlag(p.id);
      }
      visitDwellState[p.id] = state;
    }
  });

  // For any POI we're no longer near, reset its dwell state so next entry starts fresh
  Object.keys(visitDwellState).forEach(id => {
    if (!seenThisCheck.has(id)) delete visitDwellState[id];
  });
}

// Briefly pulse a flag on the map when a visit is auto-logged
function pulseFlag(poiId) {
  // Find the marker element by re-rendering with a temporary "pulsing" class
  // Simplest implementation: find the corresponding DOM element via Leaflet's _layers
  // (Leaflet doesn't expose this cleanly, so we just trigger a CSS class on the marker img.)
  const layers = markerLayer.getLayers();
  layers.forEach(layer => {
    if (layer._poiId === poiId && layer._icon) {
      layer._icon.classList.add('flag-pulse');
      setTimeout(() => layer._icon.classList.remove('flag-pulse'), 1200);
    }
  });
}

// A region has: id, name, originLat, originLng (the center), created, revealedSectors (Set/array)
// Sectors are coordinates relative to the region origin in 1000ft units.
// A sector ID is "<row><col>" like "D-7" where rows are letters (A-Z then AA, AB, ...) and cols are integers.

function sectorIdForRegion(region, lat, lng) {
  const dLat = lat - region.originLat;
  const dLng = lng - region.originLng;
  // North (positive lat) = lower row letter, so we flip and offset
  // A row starts at the origin, going outward
  const row = Math.floor(dLat / SECTOR_DEG);  // can be negative
  const col = Math.floor(dLng / SECTOR_DEG);
  return rowLabel(row) + '-' + (col >= 0 ? col : 'W' + Math.abs(col));
}

function rowLabel(n) {
  // n=0 -> A, n=1 -> B, ... n=25 -> Z, n=26 -> AA
  // negative -> prefix with S (south)
  if (n < 0) return 'S' + rowLabel(-n - 1);
  if (n < 26) return String.fromCharCode(65 + n);
  return String.fromCharCode(65 + Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
}

function newRegionId() {
  return 'RGN-' + Date.now();
}

// Reverse geocode using OSM's Nominatim (free, no API key needed for low volume).
// Returns { name, placeType, lat, lng } or null on failure.
// Place types we accept as a "region anchor": city, town. Smaller types (village,
// hamlet, suburb, neighborhood) get rolled up into whatever city/town contains them.
async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    // Try city first, then town. Both count as region-worthy. Fall back to county/state
    // only if neither is present (rural areas).
    let name = null;
    if (addr.city) name = addr.city;
    else if (addr.town) name = addr.town;
    else if (addr.village) name = addr.village;
    else if (addr.county) name = addr.county;
    else if (addr.state) name = addr.state;
    if (!name) return null;
    return {
      name: name.toUpperCase(),
      lat: lat,
      lng: lng,
    };
  } catch (e) {
    return null;
  }
}

// Find an EXISTING region by name. Used to avoid creating duplicate regions when
// the user re-enters a place they've been before.
function findRegionByName(name) {
  return regions.find(r => r.name === name + ' REGION') || null;
}

async function establishOrFindRegion(lat, lng) {
  const geo = await reverseGeocode(lat, lng);
  if (!geo) return null;

  // Check if we already have a region with this name
  let region = findRegionByName(geo.name);
  if (region) return region;

  // No existing region — create a new one
  region = {
    id: newRegionId(),
    name: geo.name + ' REGION',
    originLat: geo.lat,
    originLng: geo.lng,
    created: Date.now(),
    revealedSectors: [],
  };
  regions.push(region);
  saveRegions();
  showToast('NEW REGION · ' + region.name);
  return region;
}

// Called from GPS handler. Re-checks the region whenever we've moved REGION_CHECK_DIST_M
// since the last check. Establishes new regions automatically when the user enters
// a different city/town than the current region.
async function updateRegion(lat, lng) {
  // First-time check: always run. Also re-check after moving ~2mi since last check.
  const shouldCheck =
    !lastRegionCheckPos ||
    !currentRegionId ||
    metersBetween(lastRegionCheckPos.lat, lastRegionCheckPos.lng, lat, lng) >= REGION_CHECK_DIST_M;

  if (shouldCheck && !regionCheckInFlight) {
    regionCheckInFlight = true;
    try {
      const region = await establishOrFindRegion(lat, lng);
      if (region) {
        currentRegionId = region.id;
        lastRegionCheckPos = { lat, lng };
      }
    } finally {
      regionCheckInFlight = false;
    }
  }

  // Always refresh the HUD using the current region (cheap, no network)
  const region = getCurrentRegion();
  if (region) {
    const sid = sectorIdForRegion(region, lat, lng);
    if (!region.revealedSectors.includes(sid)) {
      region.revealedSectors.push(sid);
      saveRegions();
    }
    setRegionTitle('▾ ' + region.name);
    document.getElementById('sectorTagText').textContent =
      region.name.replace(' REGION', '') + ' · ' + sid + ' · ' + region.revealedSectors.length + ' SCT';
  }
}

// Updates the cluster region LCD. On text change, flicker the LCD briefly
// (like a real LCD refreshing) before settling on the new value.
function setRegionTitle(text) {
  const el = document.getElementById('regionTitle');
  if (!el) return;
  if (el.textContent === text) return;  // no change, no ceremony
  const readout = el.closest('.cluster-readout');
  if (readout) {
    readout.classList.add('lcd-flicker');
    setTimeout(() => readout.classList.remove('lcd-flicker'), 380);
  }
  el.textContent = text;
}

function getCurrentRegion() {
  return regions.find(r => r.id === currentRegionId);
}

// ===== REGION BOUNDARIES =====
// Fetch the OSM admin polygon for a region and store it. Polygon comes back as
// GeoJSON-style coordinates in [lng, lat] order; we'll convert to Leaflet's
// [lat, lng] order when rendering.
async function fetchBoundaryForRegion(regionId, opts) {
  opts = opts || {};
  const region = regions.find(r => r.id === regionId);
  if (!region) return false;

  // Use the region's origin point — most reliable way to look it up again
  const url = 'https://nominatim.openstreetmap.org/reverse' +
              '?format=json&lat=' + region.originLat + '&lon=' + region.originLng +
              '&zoom=10&polygon_geojson=1&addressdetails=1';

  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.geojson || !data.geojson.coordinates) return false;

    // Some places only return a Point or LineString — we want polygons.
    const t = data.geojson.type;
    if (t !== 'Polygon' && t !== 'MultiPolygon') return false;

    // Simplify NOW (before storing) instead of carrying around the raw OSM
    // polygon. Raw boundaries can be thousands of vertices and bloat storage.
    let coords = geoJsonToLeafletCoords(t, data.geojson.coordinates);
    if (t === 'MultiPolygon') {
      coords = keepLargestPiece('MultiPolygon', coords);
    }
    const SIMPLIFY_TOL_M = 400;
    coords = coords.map(ring => simplifyRing(ring, SIMPLIFY_TOL_M));
    // Round to 4 decimals (~11 m precision)
    coords = coords.map(ring => ring.map(pt => [
      Math.round(pt[0] * 10000) / 10000,
      Math.round(pt[1] * 10000) / 10000,
    ]));
    region.boundarySimplified = {
      coords: coords,
      fetched: Date.now(),
    };
    // Make sure no raw copy is hanging around from previous code
    delete region.boundary;
    saveRegions();
    if (!opts.silent) showToast('BOUNDARY FETCHED · ' + region.name.replace(' REGION', ''));
    renderBoundaries();
    return true;
  } catch (e) {
    if (!opts.silent) showToast('FETCH FAILED · CHECK CONNECTION');
    return false;
  }
}

async function fetchAllBoundaries() {
  const targets = regions.filter(r => !r.boundary && !r.boundarySimplified);
  if (targets.length === 0) {
    showToast('ALL BOUNDARIES ALREADY FETCHED');
    return;
  }
  showToast('FETCHING ' + targets.length + ' BOUNDARIES...');
  let ok = 0, fail = 0;
  for (let i = 0; i < targets.length; i++) {
    const success = await fetchBoundaryForRegion(targets[i].id, { silent: true });
    if (success) ok++; else fail++;
    // Nominatim's free tier limit is 1 req/sec — wait 1.1s between calls
    if (i < targets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }
  showToast('FETCHED · ' + ok + ' OK · ' + fail + ' FAILED');
  // Refresh the settings sheet listing if it's open
  if (document.getElementById('settingsSheet').classList.contains('open')) {
    openSettingsSheet();
  }
}

// Convert GeoJSON coordinates ([lng, lat] order, deeply nested by type) to
// Leaflet-compatible coords ([lat, lng] order, same nesting).
function geoJsonToLeafletCoords(geoType, coords) {
  if (geoType === 'Polygon') {
    // coords = [ ring, ring, ... ] where ring = [ [lng,lat], [lng,lat], ... ]
    return coords.map(ring => ring.map(pt => [pt[1], pt[0]]));
  } else if (geoType === 'MultiPolygon') {
    // coords = [ polygon, polygon, ... ] where each polygon = [ ring, ring, ... ]
    return coords.map(poly => poly.map(ring => ring.map(pt => [pt[1], pt[0]])));
  }
  return [];
}

// ----- Polygon cleanup helpers -----

// Approximate degrees per meter at a given latitude (for our local area).
// One degree latitude ≈ 111000 m; one degree longitude ≈ 111000 * cos(lat) m.
function degPerMeter(lat) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  return { latDeg: 1 / 111000, lngDeg: 1 / (111000 * Math.max(cosLat, 0.01)) };
}

// Perpendicular distance from point p to the line through a and b, in meters.
// All points are [lat, lng].
function perpDistMeters(p, a, b) {
  // Convert deltas to meters using local scale at p's latitude
  const scale = degPerMeter(p[0]);
  const px = (p[1] - a[1]) / scale.lngDeg;
  const py = (p[0] - a[0]) / scale.latDeg;
  const bx = (b[1] - a[1]) / scale.lngDeg;
  const by = (b[0] - a[0]) / scale.latDeg;
  const lineLen2 = bx*bx + by*by;
  if (lineLen2 === 0) return Math.sqrt(px*px + py*py);
  // Project p onto AB
  const t = Math.max(0, Math.min(1, (px*bx + py*by) / lineLen2));
  const dx = px - t*bx;
  const dy = py - t*by;
  return Math.sqrt(dx*dx + dy*dy);
}

// Douglas-Peucker simplification. Tolerance in meters.
// Drops points that don't deviate more than `tolMeters` from a straight line
// between their preserved neighbors. Cleans up the cul-de-sac noise without
// destroying the overall shape.
function simplifyRing(points, tolMeters) {
  if (points.length < 4) return points;
  // Mark which points to keep
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let maxIdx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDistMeters(points[i], points[first], points[last]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > tolMeters) {
      keep[maxIdx] = true;
      stack.push([first, maxIdx]);
      stack.push([maxIdx, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

// Compute the signed area of a closed ring (lat/lng points) in m².
// Used to find the largest piece in a MultiPolygon and discard tiny noise pieces.
function ringAreaM2(ring) {
  if (ring.length < 3) return 0;
  // Shoelace formula on flattened coordinates (treat as planar over our small region).
  const scale = degPerMeter(ring[0][0]);
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][1] / scale.lngDeg, y1 = ring[i][0] / scale.latDeg;
    const x2 = ring[i+1][1] / scale.lngDeg, y2 = ring[i+1][0] / scale.latDeg;
    sum += (x1 * y2 - x2 * y1);
  }
  return Math.abs(sum) / 2;
}

// Reduce a MultiPolygon to just its largest polygon, discarding small
// detached pieces (e.g. annexed parcels, tiny islands). Keeps reading clean.
// For plain Polygon input, returned unchanged.
function keepLargestPiece(geoType, leafletCoords) {
  if (geoType === 'Polygon') return leafletCoords;
  if (geoType !== 'MultiPolygon') return leafletCoords;
  let bestIdx = 0;
  let bestArea = 0;
  for (let i = 0; i < leafletCoords.length; i++) {
    // Outer ring is the first ring of each polygon
    const outer = leafletCoords[i][0];
    const a = ringAreaM2(outer);
    if (a > bestArea) { bestArea = a; bestIdx = i; }
  }
  return leafletCoords[bestIdx];
}

// "Pole of inaccessibility" — approximate point inside polygon that's
// furthest from any edge. Better than bounds-center for labeling concave/L-shaped
// regions. Uses a grid scan (~30×30) of the polygon bounds, plus a refinement.
function poleOfInaccessibility(ring) {
  if (ring.length < 3) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  ring.forEach(p => {
    if (p[0] < minLat) minLat = p[0];
    if (p[0] > maxLat) maxLat = p[0];
    if (p[1] < minLng) minLng = p[1];
    if (p[1] > maxLng) maxLng = p[1];
  });
  function pointInRing(lat, lng) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][0], xi = ring[i][1];
      const yj = ring[j][0], xj = ring[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) &&
                        (lng < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function distToEdgeMeters(lat, lng) {
    let minD = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const d = perpDistMeters([lat, lng], ring[j], ring[i]);
      if (d < minD) minD = d;
    }
    return minD;
  }
  const gridN = 24;
  let best = null;
  let bestD = -1;
  for (let i = 1; i < gridN; i++) {
    for (let k = 1; k < gridN; k++) {
      const lat = minLat + (maxLat - minLat) * i / gridN;
      const lng = minLng + (maxLng - minLng) * k / gridN;
      if (!pointInRing(lat, lng)) continue;
      const d = distToEdgeMeters(lat, lng);
      if (d > bestD) { bestD = d; best = [lat, lng]; }
    }
  }
  return best || [ (minLat + maxLat) / 2, (minLng + maxLng) / 2 ];
}

function renderBoundaries() {
  if (!boundaryLayer) return;
  boundaryLayer.clearLayers();
  if (!prefShowBoundaries) return;

  // Collect label positions so we can hide colliding ones
  const placedLabels = [];  // each: { lat, lng, text, radius (px) }
  const mapZoom = map.getZoom();

  regions.forEach(r => {
    // Prefer the new compact simplified format. Fall back to raw .boundary
    // for any region that hasn't been migrated yet (shouldn't happen after
    // loadRegions runs, but be defensive).
    let coords;
    if (r.boundarySimplified && r.boundarySimplified.coords) {
      coords = r.boundarySimplified.coords;
    } else if (r.boundary) {
      // Legacy fallback — should be rare after migration
      coords = geoJsonToLeafletCoords(r.boundary.type, r.boundary.coords);
      if (r.boundary.type === 'MultiPolygon') {
        coords = keepLargestPiece('MultiPolygon', coords);
      }
      coords = coords.map(ring => simplifyRing(ring, 400));
    } else {
      return;
    }

    if (!Array.isArray(coords) || coords.length === 0) return;
    if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0])) return;
    // Drop any rings that collapsed to too few points
    coords = coords.filter(ring => ring.length >= 4);
    if (coords.length === 0) return;

    const poly = L.polygon(coords, {
      pane: 'boundaryPane',
      color: '#d68a3a',
      weight: 2,
      dashArray: '6 4',
      opacity: 0.7,
      fillColor: '#d68a3a',
      fillOpacity: 0.035,
      interactive: false,
      smoothFactor: 1.5,
    });
    poly.addTo(boundaryLayer);

    // Label: use pole-of-inaccessibility of the outer ring
    const labelLatLng = poleOfInaccessibility(coords[0]);
    if (!labelLatLng) return;

    // Collision check — convert to pixel distance at current zoom
    const px = map.latLngToContainerPoint(labelLatLng);
    const COLLISION_PX = 70;
    const collides = placedLabels.some(pl => {
      const dx = pl.px.x - px.x;
      const dy = pl.px.y - px.y;
      return Math.sqrt(dx*dx + dy*dy) < COLLISION_PX;
    });
    if (collides) return;
    placedLabels.push({ px, lat: labelLatLng[0], lng: labelLatLng[1] });

    const labelText = r.name.replace(' REGION', '');
    const labelIcon = L.divIcon({
      html: `<div class="region-label">${escapeHtml(labelText)}</div>`,
      className: '',
      iconSize: [120, 18],
      iconAnchor: [60, 9],
    });
    L.marker(labelLatLng, { icon: labelIcon, pane: 'boundaryPane', interactive: false })
      .addTo(boundaryLayer);
  });
}

function toggleBoundaries() {
  prefShowBoundaries = !prefShowBoundaries;
  savePrefs();
  renderBoundaries();
  const desc = document.getElementById('boundaryToggleDesc');
  if (desc) desc.textContent = prefShowBoundaries ? 'Boundaries visible' : 'Boundaries hidden';
  const indicator = document.getElementById('boundaryToggleIndicator');
  if (indicator) indicator.classList.toggle('on', prefShowBoundaries);
}

// ===== P4.4 LANDSCAPE MODE =====
function toggleLandscapeMode() {
  prefLandscapeMode = !prefLandscapeMode;
  savePrefs();
  applyLandscapeMode();
}

function applyLandscapeMode() {
  try {
    document.body.classList.toggle('landscape-mode', !!prefLandscapeMode);
    const desc = document.getElementById('landscapeToggleDesc');
    if (desc) desc.textContent = prefLandscapeMode ? 'Two-handed pro layout · ACTIVE' : 'Two-handed pro layout';
    const indicator = document.getElementById('landscapeToggleIndicator');
    if (indicator) indicator.classList.toggle('on', prefLandscapeMode);

    // Mount or unmount the landscape wing DOM
    if (prefLandscapeMode) {
      mountLandscapeWings();
    } else {
      unmountLandscapeWings();
    }

    // Force Leaflet to recalc tile dimensions after layout change
    if (typeof map !== 'undefined' && map && map.invalidateSize) {
      setTimeout(() => { try { map.invalidateSize(); } catch(e){} }, 250);
    }
  } catch (err) {
    console.error('applyLandscapeMode error:', err);
  }
}

function mountLandscapeWings() {
  if (document.getElementById('landscapeLeftWing')) return; // already mounted

  // LEFT WING — vertical 4-button toggle stack
  const left = document.createElement('div');
  left.id = 'landscapeLeftWing';
  left.className = 'landscape-wing left';
  left.innerHTML =
    '<span class="wing-screw tl"></span><span class="wing-screw bl"></span>' +
    '<div class="wing-label">NAV · L</div>' +
    '<div class="vstack">' +
      '<div class="tg-btn" data-action="search">' +
        '<svg class="tg-icon" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none"/><path d="M14.5 14.5 L20 20" fill="none"/></svg>' +
        '<span class="tg-lbl">SEARCH</span></div>' +
      '<div class="tg-btn" data-action="pending" id="landscapePendingBtn">' +
        '<svg class="tg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none"/><path d="M12 7 V12 L15 14" fill="none"/></svg>' +
        '<span class="tg-lbl">PENDING</span></div>' +
      '<div class="tg-btn" data-action="objectv">' +
        '<svg class="tg-icon" viewBox="0 0 24 24"><path d="M12 3 L21 8 V16 L12 21 L3 16 V8 Z" fill="none"/><path d="M12 12 L21 8 M12 12 L3 8 M12 12 V21" fill="none"/></svg>' +
        '<span class="tg-lbl">OBJECTV</span></div>' +
      '<div class="tg-btn" data-action="menu">' +
        '<svg class="tg-icon" viewBox="0 0 24 24"><path d="M4 7 H20 M4 12 H20 M4 17 H20" fill="none"/></svg>' +
        '<span class="tg-lbl">MENU</span></div>' +
    '</div>';
  document.body.appendChild(left);
  // Wire actions
  left.querySelectorAll('.tg-btn').forEach(btn => {
    btn.onclick = () => {
      switch (btn.dataset.action) {
        case 'search': openSearchSheet(); break;
        case 'pending': openPendingSheet(); break;
        case 'objectv': openObjectivesSheet(); break;
        case 'menu': openSettingsSheet(); break;
      }
    };
  });

  // RIGHT WING — circular MARK pad + status
  const right = document.createElement('div');
  right.id = 'landscapeRightWing';
  right.className = 'landscape-wing right';
  right.innerHTML =
    '<span class="wing-screw tr"></span><span class="wing-screw br"></span>' +
    '<div class="wing-label">MK · R</div>' +
    '<div class="mark-pad-bezel" id="landscapeMarkBtn">' +
      '<div class="mark-pad-plastic">' +
        '<div class="mark-pad-lcd">' +
          '<span class="mark-pad-word">MARK</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="wing-status"><span class="dot"></span><span id="landscapeMarkStatus">GPS LOCK</span></div>';
  document.body.appendChild(right);
  right.querySelector('#landscapeMarkBtn').onclick = () => dropPin();

  // TOP STRIP — indicator LEDs (mirror of the portrait one)
  const strip = document.createElement('div');
  strip.id = 'landscapeTopStrip';
  strip.className = 'landscape-top-strip';
  strip.innerHTML =
    '<div class="ind-led" data-id="gps" data-color="blue"><span class="dot"></span><span class="lbl">GPS</span></div>' +
    '<div class="ind-led" data-id="fix" data-color="green"><span class="dot"></span><span class="lbl">FIX</span></div>' +
    '<div class="ind-led" data-id="obj" data-color="yellow"><span class="dot"></span><span class="lbl">OBJ</span></div>' +
    '<div class="ind-led" data-id="rec" data-color="red"><span class="dot"></span><span class="lbl">REC</span></div>';
  document.body.appendChild(strip);

  // Sync pending dot + indicator LED states immediately
  updatePendingCount();
  updateIndicatorStrip();
}

function unmountLandscapeWings() {
  ['landscapeLeftWing', 'landscapeRightWing', 'landscapeTopStrip'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

// ===== UI HELPERS =====
function showToast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 1800);
}

// ===== HAPTIC VOCABULARY (currently disabled) =====
// iOS Safari has never shipped the Vibration API. The <input type=checkbox switch>
// workaround that briefly enabled programmatic haptics in iOS 17.4 was patched
// in iOS 26.5 and no longer fires from script. Since the primary client for
// RECON.OS is iPhone PWA, we cannot reliably deliver tactile feedback on the
// platform that matters. Rather than scatter conditional checks everywhere or
// leave Android-only behavior in place, haptic() is intentionally a no-op for
// every platform. The call sites remain throughout the app as semantic markers
// of where tactile feedback BELONGS — if/when WebKit ships the Vibration API
// (or a stable replacement), this function gets rewritten and every call site
// lights up at once.
const HAPTIC_PATTERNS = {
  tick:        8,
  tap:         12,
  thunk:       20,
  mark:        40,
  confirm:     [20, 30, 20],
  lock:        [15, 40, 15],
  warn:        [8, 30, 8, 30, 60],
  error:       [50, 80, 50],
  pop:         15,
};
function haptic(/* event */) {
  // No-op. See block comment above for rationale.
  return;
}

function flashMark() {
  const f = document.getElementById('markFlash');
  f.classList.remove('active');
  void f.offsetWidth;
  f.classList.add('active');
  haptic('mark');
}

function updateClock() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const t = h + ':' + m;
  const oldClock = document.getElementById('clock');
  if (oldClock) oldClock.textContent = t;
  const newClock = document.getElementById('clusterClock');
  if (newClock) newClock.textContent = t;
}
setInterval(updateClock, 30000);
updateClock();

// ===== MAP =====
function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    // Lock panning to the world extent. Web Mercator ends at ~±85° lat
    // (the poles distort to infinity), and tiles end at ±180° lng.
    // Combined with noWrap on the tile layer below, this stops users
    // from dragging into the grey void past the map edges.
    maxBounds: [[-85, -180], [85, 180]],
    maxBoundsViscosity: 1.0,
  }).setView([29.74, -94.99], 14);

  const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    detectRetina: true,
    noWrap: true,
    attribution: '© CARTO © OSM'
  }).addTo(map);

  // Log tile loading status to console so we can see if tiles are failing
  tileLayer.on('tileerror', (e) => {
    dbg('TILE ERROR: ' + e.tile.src);
  });
  tileLayer.on('tileload', () => {
    if (!tileLayer._oneLoaded) {
      tileLayer._oneLoaded = true;
      dbg('First tile loaded OK');
    }
  });

  // Custom pane for fog that sits above tiles but below markers
  map.createPane('fogPane');
  map.getPane('fogPane').style.zIndex = 250;
  map.getPane('fogPane').style.pointerEvents = 'none';

  // Pane for region boundary outlines — above fog, below markers
  map.createPane('boundaryPane');
  map.getPane('boundaryPane').style.zIndex = 350;
  map.getPane('boundaryPane').style.pointerEvents = 'none';

  boundaryLayer = L.layerGroup({ pane: 'boundaryPane' }).addTo(map);
  // Re-render boundaries on zoom so label collision detection uses current pixel scale
  map.on('zoomend', () => {
    if (prefShowBoundaries) renderBoundaries();
    // Tier-based POI visibility changes by zoom (see TIER_MIN_ZOOM).
    // Re-render markers so newly-visible/hidden POIs reflect the new zoom.
    renderAllMarkers();
  });

  markerLayer = L.layerGroup().addTo(map);
  missionMarkerLayer = L.layerGroup().addTo(map);
  renderAllMarkers();
  renderMissionMarkers();

  // Defer fog rendering slightly so tiles get a chance to start loading first
  setTimeout(renderFog, 100);

  // Kick off async data loaders. Each calls back into renderFog or
  // renderStateOutlines once its data lands.
  loadOceanCutouts();
  loadStateOutlines();

  // Note: we used to redraw fog on zoomend, but the polygon scales naturally
  // with the map. Removing that handler eliminates the brief unfogged flash
  // between the old polygon being removed and the new one being added.

  // === Fix marker drift: tell Leaflet to recalculate its container size
  //     at moments when the layout might have shifted underneath it. ===
  // After initial paint (gives CSS layout time to settle on first load):
  setTimeout(() => map.invalidateSize(true), 250);
  setTimeout(() => map.invalidateSize(true), 1000);
  // On orientation change (Safari resizes weirdly):
  window.addEventListener('orientationchange', () => {
    setTimeout(() => map.invalidateSize(true), 200);
  });
  // On window resize:
  window.addEventListener('resize', () => map.invalidateSize(true));
  // On visualViewport changes (iOS keyboard, dynamic toolbar, PWA changes):
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => map.invalidateSize(true));
  }
}

// Render fog as a single polygon: huge outer ring covering everything,
// with rectangular holes cut out for each revealed cell.
// Loads Natural Earth 1:50m ocean polygons (data/ne_50m_ocean.json) and
// flattens every ring into a single flat list of latlng rings. Those rings
// get appended to the fog polygon in renderFog(). SVG's even-odd fill rule
// handles the ocean/island nesting automatically.
async function loadOceanCutouts() {
  try {
    const res = await fetch('data/ne_50m_ocean.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const geojson = await res.json();
    const rings = [];
    for (const feature of geojson.features || []) {
      const geom = feature.geometry;
      if (!geom) continue;
      const polygons = geom.type === 'Polygon'
        ? [geom.coordinates]
        : geom.type === 'MultiPolygon'
        ? geom.coordinates
        : [];
      for (const poly of polygons) {
        for (const ring of poly) {
          rings.push(ring.map(([lng, lat]) => [lat, lng]));
        }
      }
    }
    oceanRings = rings;
    dbg('Loaded ' + rings.length + ' ocean rings');
    if (map) renderFog();
  } catch (e) {
    dbg('Ocean cutouts unavailable: ' + (e && e.message));
  }
}

// Loads the 48 mainland US state polygons (data/us_states.json) into an
// L.geoJSON layer styled with a thin cyan stroke. Toggleable via settings.
async function loadStateOutlines() {
  try {
    const res = await fetch('data/us_states.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const geojson = await res.json();
    const EXCLUDED = new Set(['Alaska', 'Hawaii', 'District of Columbia',
      'Puerto Rico', 'Guam', 'American Samoa', 'United States Virgin Islands',
      'Commonwealth of the Northern Mariana Islands']);
    const filtered = {
      type: 'FeatureCollection',
      features: (geojson.features || []).filter(f => {
        const name = f.properties && (f.properties.name || f.properties.NAME);
        return name && !EXCLUDED.has(name);
      }),
    };
    stateOutlinesLayer = L.geoJSON(filtered, {
      pane: 'boundaryPane',
      style: {
        color: '#00e5ff',
        weight: 1.2,
        opacity: 0.7,
        fill: false,
        interactive: false,
      },
    });
    dbg('Loaded ' + filtered.features.length + ' state outlines');
    renderStateOutlines();
  } catch (e) {
    dbg('State outlines unavailable: ' + (e && e.message));
  }
}

function renderStateOutlines() {
  if (!map || !stateOutlinesLayer) return;
  if (prefShowStates) {
    if (!map.hasLayer(stateOutlinesLayer)) stateOutlinesLayer.addTo(map);
  } else {
    if (map.hasLayer(stateOutlinesLayer)) map.removeLayer(stateOutlinesLayer);
  }
}

function toggleStates() {
  haptic('tap');
  prefShowStates = !prefShowStates;
  renderStateOutlines();
  savePrefs();
  const desc = document.getElementById('stateToggleDesc');
  if (desc) desc.textContent = prefShowStates ? 'State outlines visible' : 'State outlines hidden';
  const indicator = document.getElementById('stateToggleIndicator');
  if (indicator) indicator.classList.toggle('on', prefShowStates);
}

function renderFog() {
  if (fogPolygon) {
    map.removeLayer(fogPolygon);
    fogPolygon = null;
  }
  if (!map) return;

  // Outer ring: cover from -85° to 85° lat and -180° to 180° lng. This
  // ensures fog covers everywhere except where holes are punched.
  // (Polygons in Leaflet are [lat, lng] pairs.)
  const outer = [
    [85, -180],
    [85, 180],
    [-85, 180],
    [-85, -180],
  ];

  // Inner rings (holes) — one per revealed cell.
  // Leaflet expects the hole polygons to wind opposite from the outer ring.
  // Outer is clockwise, so holes need to be counter-clockwise.
  const holes = [];
  revealedCells.forEach(id => {
    const [sw, se, ne, nw] = cellCorners(id);
    holes.push([sw, nw, ne, se]); // counter-clockwise
  });

  // Combine outer + revealed-cell holes + ocean rings into one multi-ring polygon.
  fogPolygon = L.polygon([outer, ...holes, ...oceanRings], {
    pane: 'fogPane',
    color: '#1a0f06',
    weight: 0,
    fillColor: '#2a1a10',
    fillOpacity: FOG_OPACITY_VALUES[prefFogOpacity] || 0.88,
    interactive: false,
    smoothFactor: 0,
  }).addTo(map);

  // Apply diagonal-hatch pattern to the polygon's SVG path.
  // We do this by inserting an SVG pattern into the map's overlay SVG and
  // setting the polygon's fill to reference it.
  setTimeout(injectFogHatch, 0);
}

// Insert a diagonal-hatch pattern + Gaussian-blur filter into Leaflet's SVG
// renderer so fog has the paper-map "uncharted" look AND feathered edges
// where revealed cells meet still-fogged terrain.
function injectFogHatch() {
  const svgs = document.querySelectorAll('.leaflet-fog-pane svg');
  svgs.forEach(svg => {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }

    // Diagonal hatch pattern (paper "uncharted" look). Pattern internals are
    // fully opaque so HEAVY density is truly opaque; the polygon's fill-opacity
    // controls actual visibility based on user preference.
    if (!defs.querySelector('#fog-hatch')) {
      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', 'fog-hatch');
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('width', '8');
      pattern.setAttribute('height', '8');
      pattern.setAttribute('patternTransform', 'rotate(45)');
      pattern.innerHTML = `
        <rect width="8" height="8" fill="#28190f"/>
        <line x1="0" y1="0" x2="0" y2="8" stroke="#0e0805" stroke-width="2"/>
      `;
      defs.appendChild(pattern);
    }

    // Gaussian blur filter — softens the sharp rectangular cell edges into
    // smooth feathered transitions so revealed terrain blends with fog naturally
    if (!defs.querySelector('#fog-feather')) {
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', 'fog-feather');
      filter.setAttribute('x', '-5%');
      filter.setAttribute('y', '-5%');
      filter.setAttribute('width', '110%');
      filter.setAttribute('height', '110%');
      filter.innerHTML = `
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
      `;
      defs.appendChild(filter);
    }

    // Apply the pattern AND filter to the polygon's fill
    const paths = svg.querySelectorAll('path');
    paths.forEach(p => {
      p.setAttribute('fill', 'url(#fog-hatch)');
      // fill-opacity here multiplies with the pattern's internal opacity, so
      // setting it to the user's preference makes density actually responsive
      p.setAttribute('fill-opacity', FOG_OPACITY_VALUES[prefFogOpacity] || 0.88);
      p.setAttribute('filter', 'url(#fog-feather)');
    });
  });
}

function makeMarkerIcon(color, selected, typeId, shape) {
  shape = shape || 'FLAG';
  const type = POI_TYPES.find(t => t.id === typeId);

  if (shape === 'ICON' && type && type.svg) {
    // === ICON-ONLY SHAPE ===
    // The symbol IS the marker. Drawn at marker scale, centered on the latlng,
    // with a subtle outline halo for legibility against the map. The currentColor
    // CSS variable inside the symbol resolves to the category color.
    const haloSVG = selected ? `
      <circle cx="0" cy="0" r="17" fill="rgba(240, 160, 64, 0.18)"/>
      <circle cx="0" cy="0" r="17" fill="none" stroke="rgba(240, 160, 64, 0.85)" stroke-width="1.5" stroke-dasharray="3 2"/>
    ` : '';
    const baseSize = selected ? 50 : 36;
    const svg = `
      <svg viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg" style="color:${color}; overflow:visible;">
        ${haloSVG}
        <circle cx="0" cy="0" r="11" fill="rgba(8, 6, 4, 0.92)" stroke="#1a0f06" stroke-width="1"/>
        <g transform="scale(0.95)">${type.svg}</g>
      </svg>
    `;
    return L.divIcon({
      html: `<div class="flag-marker">${svg}</div>`,
      className: '',
      iconSize: [baseSize, baseSize],
      iconAnchor: [baseSize/2, baseSize/2],
    });
  }

  // === FLAG SHAPE (default) ===
  const haloSVG = selected ? `
    <circle cx="0" cy="-21" r="28" fill="rgba(240, 160, 64, 0.18)" />
    <circle cx="0" cy="-21" r="28" fill="none" stroke="rgba(240, 160, 64, 0.85)" stroke-width="1.5" stroke-dasharray="3 2" />
  ` : '';
  // For inside-flag symbols, use white instead of category color (the pennant is
  // already the category color; white reads against it).
  const typeSVG = (type && type.svg)
    ? `<g transform="translate(13, -33) scale(0.55)" style="color:#fff;">${type.svg}</g>`
    : '';
  const svg = `
    <svg class="flag-svg" viewBox="-30 -50 60 70" xmlns="http://www.w3.org/2000/svg">
      ${haloSVG}
      <circle cx="0" cy="0" r="3" fill="#1a0f06"/>
      <line x1="0" y1="0" x2="0" y2="-42" stroke="#1a0f06" stroke-width="3" stroke-linecap="round"/>
      <path d="M 0 -42 L 28 -34 L 0 -25 Z" fill="${color}" stroke="#1a0f06" stroke-width="1.5" stroke-linejoin="round"/>
      ${typeSVG}
    </svg>
  `;
  return L.divIcon({
    html: `<div class="flag-marker">${svg}</div>`,
    className: '',
    iconSize: selected ? [60, 70] : [36, 48],
    iconAnchor: selected ? [30, 60] : [18, 48],
  });
}

// Backward-compat alias
function makeFlagIcon(color, selected, typeId) {
  return makeMarkerIcon(color, selected, typeId, 'FLAG');
}

function selectPOI(poiId) {
  if (selectedPoiId === poiId) return;
  selectedPoiId = poiId;
  renderAllMarkers();
}

function deselectPOI() {
  if (!selectedPoiId) return;
  selectedPoiId = null;
  renderAllMarkers();
}

function userIcon(heading) {
  // SVG-based marker so we can rotate a heading arrow.
  // Heading is in degrees clockwise from north. null means not moving / unknown.
  const arrow = (heading !== null && heading !== undefined && !isNaN(heading))
    ? `<g transform="rotate(${heading} 24 24)">
         <polygon points="24,4 30,18 24,14 18,18" fill="#f0a040" stroke="#3a1a08" stroke-width="0.8"
                  filter="drop-shadow(0 0 3px rgba(240, 160, 64, 0.7))"/>
       </g>`
    : '';
  const svg = `
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
      ${arrow}
      <circle cx="24" cy="24" r="12" fill="rgba(214, 138, 58, 0.18)"/>
      <circle cx="24" cy="24" r="6" fill="#e8a050" stroke="#3a1a08" stroke-width="1.4"/>
    </svg>
  `;
  return L.divIcon({
    html: `<div class="user-marker-wrap">${svg}</div>`,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function renderAllMarkers() {
  markerLayer.clearLayers();
  pois.forEach(p => {
    // Apply category filter (also affects map — unclassified always show)
    if (p.category && activeCategoryFilter !== 'ALL' && p.category !== activeCategoryFilter) return;
    // Apply type filter (only for classified POIs)
    if (p.category && activeTypeFilter !== 'ALL' && (p.type || 'NONE') !== activeTypeFilter) return;

    // If this POI is currently being repositioned, hide its flag (the screen-center
    // crosshair represents its proposed new position instead)
    if (repositionPoiId === p.id) return;

    // Tier-based zoom filtering. Each POI's tier (1/2/3) maps to a minimum
    // zoom level via TIER_MIN_ZOOM. Below that zoom, the marker is hidden
    // to reduce clutter. Selected POI is exempt so re-selecting after zoom
    // never makes a marker vanish unexpectedly.
    const tier = p.tier || 2;
    const minZoom = TIER_MIN_ZOOM[tier] != null ? TIER_MIN_ZOOM[tier] : 0;
    if (map && map.getZoom() < minZoom && p.id !== selectedPoiId) return;

    const cat = CATEGORIES.find(c => c.id === p.category) || CATEGORIES[0];
    const m = L.marker([p.lat, p.lng], {
      icon: makeMarkerIcon(cat.color, p.id === selectedPoiId, p.type, p.shape || 'FLAG'),
      draggable: false,
    });
    m._poiId = p.id;
    m.on('click', () => {
      selectPOI(p.id);
      openClassifySheet(p.id);
    });
    m.addTo(markerLayer);
  });
  if (map) renderClusters();
}

// ===== REPOSITION MODE (Lyft/Uber style) =====
// When the user taps REPOSITION on a POI's detail sheet:
//   - The original flag is hidden from the map
//   - A fixed crosshair appears at screen center (the new "phantom" position)
//   - The detail sheet closes; a confirm bar slides up from the bottom
//   - The user pans the map to move the location underneath the crosshair
//   - POSITION HERE = commit lat/lng to wherever the map center is
//   - CANCEL = revert, original flag returns
// State variables (repositionPoiId etc.) are declared at the top with other state.

function enterRepositionMode(poiId) {
  const poi = pois.find(p => p.id === poiId);
  if (!poi) return;
  repositionPoiId = poiId;
  repositionOriginalLatLng = { lat: poi.lat, lng: poi.lng };
  repositionOriginalSector = poi.sector;

  // Close any open sheet
  closeSheet();

  // Re-render markers so the POI being repositioned is hidden
  renderAllMarkers();

  // Center map on the POI at high zoom for precision
  map.setView([poi.lat, poi.lng], Math.max(map.getZoom(), 18), { animate: true });

  // Show the screen-center crosshair
  document.getElementById('repositionCrosshair').classList.add('visible');
  // Show the confirm bar
  document.getElementById('repositionBar').classList.add('visible');
  // Update the bar's label with the POI name
  const displayName = poi.name || ('POI-' + poi.id.slice(-6));
  document.getElementById('repositionPoiName').textContent = displayName;

  haptic('thunk');
  showToast('PAN MAP TO REPOSITION · TAP CONFIRM WHEN READY');
}

function confirmReposition() {
  if (!repositionPoiId) return;
  const poi = pois.find(p => p.id === repositionPoiId);
  if (!poi) {
    cancelReposition();
    return;
  }
  const newCenter = map.getCenter();
  const prevLat = repositionOriginalLatLng.lat;
  const prevLng = repositionOriginalLatLng.lng;
  const prevSector = repositionOriginalSector;
  poi.lat = newCenter.lat;
  poi.lng = newCenter.lng;
  const region = getCurrentRegion() || regions.find(r => r.id === poi.regionId);
  if (region) {
    poi.sector = sectorIdForRegion(region, poi.lat, poi.lng);
  }
  savePOIs();

  const displayName = poi.name || ('POI-' + poi.id.slice(-6));
  logEvent('edit', poi.id, 'Repositioned: ' + displayName, poi.sector || '');
  showToast('POSITION SAVED');

  // Undo
  const undoPoiId = poi.id;
  pushUndo('Move "' + displayName + '" back', () => {
    const x = pois.find(x => x.id === undoPoiId);
    if (!x) return;
    x.lat = prevLat;
    x.lng = prevLng;
    x.sector = prevSector;
    savePOIs();
    renderAllMarkers();
  });

  exitRepositionUI();
  renderAllMarkers();
}

function cancelReposition() {
  if (!repositionPoiId) return;
  exitRepositionUI();
  renderAllMarkers();
  showToast('REPOSITION CANCELED');
}

function exitRepositionUI() {
  repositionPoiId = null;
  repositionOriginalLatLng = null;
  repositionOriginalSector = null;
  document.getElementById('repositionCrosshair').classList.remove('visible');
  document.getElementById('repositionBar').classList.remove('visible');
}

function recenterMap() {
  if (userPos) {
    map.setView([userPos.lat, userPos.lng], 16);
  }
}

// ===== DEBUG (no-op in production, but kept callable so nothing breaks) =====
function dbg(msg) {
  if (window.console) console.log(msg);
}

// Capture all JS errors to console
window.addEventListener('error', (e) => {
  dbg('JS ERROR: ' + e.message + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?'));
});

// ===== GPS =====
function setStatus(text, color) {
  const sectorEl = document.getElementById('sectorTagText');
  if (sectorEl) sectorEl.textContent = text;
  if (color) {
    const dot = document.getElementById('gpsDot');
    if (dot) dot.style.color = color;
  }
  dbg('STATUS: ' + text);
  // Keep the MARK status indicator in sync with any GPS state announcement
  if (typeof updateMarkStatus === 'function') updateMarkStatus();
  if (typeof updateIndicatorStrip === 'function') updateIndicatorStrip();
}

// ===== P4.2 INDICATOR STRIP =====
// Updates the 5-LED status row (GPS / FIX / TRAIL / FOG / SYNC).
// Each LED now has a single signature color baked in via data-color
// ("blue" GPS · "green" FIX · "yellow" OBJ · "red" REC). State logic only
// decides on/off — color no longer encodes meaning. The CSS picks the
// right gradient/glow based on data-color when .on is present.
function updateIndicatorStrip() {
  try {
    const strips = document.querySelectorAll('#indicatorStrip, #landscapeTopStrip');
    if (!strips.length) return;
    strips.forEach(strip => {
      const ledOf = (id) => strip.querySelector('.ind-led[data-id="' + id + '"]');

      // GPS (BLUE) — on whenever we have a position. Doesn't care about
      // accuracy; FIX is the accuracy indicator. A stale fix still counts
      // as "we have GPS" — the user feedback for staleness is the dedicated
      // GPS-lost banner, not this LED.
      const gpsLed = ledOf('gps');
      if (gpsLed) {
        gpsLed.className = 'ind-led';
        if (typeof userPos !== 'undefined' && userPos && userPos.lat != null) {
          gpsLed.classList.add('on');
        }
      }

      // FIX (GREEN) — on when accuracy < 30m. Off otherwise (including
      // when we have no position at all). Combined with GPS, the two
      // states read as: both off = no signal, blue only = poor fix,
      // blue + green = good fix.
      const fixLed = ledOf('fix');
      if (fixLed) {
        fixLed.className = 'ind-led';
        if (typeof userPos !== 'undefined' && userPos && userPos.acc != null && userPos.acc < 30) {
          fixLed.classList.add('on');
        }
      }

      // OBJ (YELLOW) — on when there's at least one active mission/objective.
      // "Active" = exists in missions[] and isn't marked complete.
      const objLed = ledOf('obj');
      if (objLed) {
        objLed.className = 'ind-led';
        if (typeof missions !== 'undefined' && Array.isArray(missions)) {
          const activeCount = missions.filter(m => m && !m.completed).length;
          if (activeCount > 0) objLed.classList.add('on');
        }
      }

      // REC (RED) — always on while the app is running. Reads as
      // "you're being recorded," fitting the recon-equipment aesthetic
      // and giving the strip a fully-lit resting state.
      const recLed = ledOf('rec');
      if (recLed) {
        recLed.className = 'ind-led on';
      }
    });
  } catch (err) {
    console.error('updateIndicatorStrip error:', err);
  }
}

// Update user position state from a GeolocationCoordinates object.
// Shared by watchPosition, retryGPSOnGesture, and pull-to-refresh.
function applyGpsCoords(coords) {
  const { latitude, longitude, accuracy, altitude, heading, speed } = coords;
  const isFirstLock = !lastFix;  // never had a fix in this session
  userPos = { lat: latitude, lng: longitude, acc: accuracy };
  userAltitudeM = (typeof altitude === 'number') ? altitude : null;
  // Keep last known heading on slow/stop so the arrow doesn't blink off
  if (typeof heading === 'number' && !isNaN(heading) && (speed === null || speed > 0.5)) {
    userHeading = heading;
  }
  lastFix = Date.now();
  updateMarkStatus();
  // Live workout — feed this sample into distance accumulation if one is running.
  // Safe to call unconditionally; it no-ops when nothing's live.
  feedLiveWorkoutGps(latitude, longitude, accuracy);
  // Ceremony — GPS just acquired for the first time this session
  if (isFirstLock) {
    haptic('lock');
    flashGpsLock();
  }
}

// Brief bright pulse on the GPS LED to announce first-lock acquisition.
// Adds .first-lock class for ~700ms which triggers a one-shot CSS animation,
// then removes it so the LED returns to the steady breathing state.
function flashGpsLock() {
  document.querySelectorAll('.ind-led[data-id="gps"]').forEach(el => {
    el.classList.add('first-lock');
    setTimeout(() => el.classList.remove('first-lock'), 720);
  });
}

// Update the small status line under the MARK button. Called whenever GPS
// state changes (fix, error, stale). When GPS is good shows green LED +
// "DROP @ MY POS"; when unavailable, red LED + "NO GPS · CANNOT MARK" and
// the MARK button visually disables.
function updateMarkStatus() {
  const status = document.getElementById('markStatus');
  const text = document.getElementById('markStatusText');
  const btn = document.getElementById('markBtn');
  if (!status || !text || !btn) return;
  // GPS is "good" if we have a position and the last fix is recent (< 30s).
  // Otherwise show no-gps state.
  const fresh = userPos && lastFix && (Date.now() - lastFix < 30000);
  if (fresh) {
    status.classList.remove('no-gps');
    status.classList.add('ok');
    // Rotating live status — handled by tickStatusLine() interval below.
    // Set initial frame immediately so the line isn't empty.
    text.textContent = currentStatusFrame();
    btn.classList.remove('disabled');
    // Idle motion — MARK accent ring breathes when GPS is locked
    document.body.classList.add('gps-ok');
  } else {
    status.classList.remove('ok');
    status.classList.add('no-gps');
    text.textContent = userPos ? 'GPS STALE · CANNOT MARK' : 'NO GPS · CANNOT MARK';
    btn.classList.add('disabled');
    document.body.classList.remove('gps-ok');
  }
}

// ===== ROTATING STATUS LINE =====
// When GPS is locked, the bottom status text cycles through live data.
// Frame index advances every 6s. updateMarkStatus() always renders the
// CURRENT frame, so external state changes (e.g. POI drop) immediately
// see the new data without waiting for the next tick.
let _statusFrameIdx = 0;
function currentStatusFrame() {
  const frames = [
    () => {
      const acc = (userPos && userPos.acc != null) ? Math.round(userPos.acc) : '--';
      return 'GPS LOCK · ' + acc + 'M ACC';
    },
    () => {
      const km = todayTrailDistanceKm();
      return 'TRAIL · ' + km.toFixed(2) + ' KM TODAY';
    },
    () => {
      const region = getCurrentRegion();
      return 'REGION · ' + (region ? region.name.replace(' REGION', '') : '—');
    },
    () => {
      const n = pois.length;
      const m = Array.isArray(missions) ? missions.filter(x => x.status !== 'complete').length : 0;
      return n + ' POI · ' + m + ' OBJV';
    },
    () => {
      const pending = pois.filter(p => !p.category).length;
      return pending > 0 ? (pending + ' PENDING · CLASSIFY') : 'RECON.OS · STANDBY';
    },
  ];
  const idx = _statusFrameIdx % frames.length;
  try { return frames[idx](); } catch (e) { return 'RECON.OS · STANDBY'; }
}

// Helper: today's trail distance in km. Walks the in-memory trail array
// summing haversine segments. Cheap enough at our trail sizes.
function todayTrailDistanceKm() {
  if (!Array.isArray(todayTrail) || todayTrail.length < 2) return 0;
  let mi = 0;
  for (let i = 1; i < todayTrail.length; i++) {
    const a = todayTrail[i-1], b = todayTrail[i];
    if (!a || !b) continue;
    mi += haversine(a.lat, a.lng, b.lat, b.lng);
  }
  return mi * 1.609344;  // miles → km
}

function tickStatusLine() {
  _statusFrameIdx++;
  // Only update if GPS is fresh (otherwise updateMarkStatus locks the line
  // to a GPS-error message and we should not stomp on it)
  const fresh = userPos && lastFix && (Date.now() - lastFix < 30000);
  if (!fresh) return;
  const text = document.getElementById('markStatusText');
  if (!text) return;
  text.textContent = currentStatusFrame();
  // Brief flicker on the line as it refreshes
  const status = document.getElementById('markStatus');
  if (status) {
    status.classList.add('lcd-flicker');
    setTimeout(() => status.classList.remove('lcd-flicker'), 380);
  }
}
setInterval(tickStatusLine, 6000);

function startGPS() {
  if (!navigator.geolocation) {
    setStatus('NO GPS SUPPORT IN BROWSER', '#ef4a3f');
    return;
  }

  setStatus('REQUESTING PERMISSION...', '#f0a040');
  dbg('Calling watchPosition()');

  // Also check permission status if API available
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      dbg('PERM STATE: ' + result.state);
      result.onchange = () => dbg('PERM CHANGED TO: ' + result.state);
    }).catch(e => dbg('PERM QUERY FAILED: ' + e.message));
  } else {
    dbg('navigator.permissions not available');
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      applyGpsCoords(pos.coords);

      // setStatus shows the coords briefly until updateRegion overwrites with sector info
      setStatus(`${latitude.toFixed(4)} / ${longitude.toFixed(4)} · ±${Math.round(accuracy)}m`, '#c9d97b');
      document.getElementById('gpsBanner').classList.remove('visible');
      dbg('GOT FIX: ' + latitude.toFixed(4) + ',' + longitude.toFixed(4) + ' ±' + Math.round(accuracy));

      if (!userMarker) {
        userMarker = L.marker([latitude, longitude], { icon: userIcon(userHeading) }).addTo(map);
        map.setView([latitude, longitude], 16);
      } else {
        userMarker.setLatLng([latitude, longitude]);
        userMarker.setIcon(userIcon(userHeading));
      }

      // FOG: sample if we've moved enough since last sample
      if (!lastSamplePos ||
          metersBetween(lastSamplePos.lat, lastSamplePos.lng, latitude, longitude) >= FOG_SAMPLE_MIN_METERS) {
        const newReveal = revealAround(latitude, longitude);
        lastSamplePos = { lat: latitude, lng: longitude };
        if (newReveal) renderFog();
      }

      // TRAIL: record today's GPS sample
      recordTrailPoint(latitude, longitude);

      // VISITS: check proximity-based auto-visits
      checkVisits(latitude, longitude);

      // REGION: identify or establish, update HUD
      updateRegion(latitude, longitude);

      // LIVE NAV: if POI detail sheet is open, refresh distance/bearing
      if (liveNavPoiId) {
        const poi = pois.find(p => p.id === liveNavPoiId);
        if (poi) updateNavInfo(poi);
      }
    },
    (err) => {
      let msg = 'GPS ERROR';
      if (err.code === 1) msg = 'PERMISSION DENIED · TAP MAP TO DROP';
      else if (err.code === 2) msg = 'POSITION UNAVAILABLE · TAP MAP TO DROP';
      else if (err.code === 3) msg = 'GPS TIMEOUT · TAP MAP TO DROP';
      setStatus(msg, '#ef4a3f');
      setRegionTitle('▾ NO POSITION');
      dbg('GPS ERROR code=' + err.code + ' msg=' + err.message);
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
  );

  // Check for stale GPS every 5s
  setInterval(() => {
    if (!lastFix) return;
    const age = Math.round((Date.now() - lastFix) / 1000);
    if (age > 30) {
      document.getElementById('gpsBanner').classList.add('visible');
      document.getElementById('gpsAgo').textContent = age + 'S AGO';
      const dot = document.getElementById('gpsDot');
      if (dot) dot.style.color = '#ef4a3f';
    }
    // Keep MARK status in sync — it flips to "STALE" once age > 30s
    updateMarkStatus();
  }, 5000);
}

// Retry GPS on any user tap — Safari sometimes needs a user gesture to prompt
let gpsRetried = false;
function retryGPSOnGesture() {
  if (gpsRetried || userPos) return;
  gpsRetried = true;
  dbg('USER GESTURE: retrying GPS');
  setStatus('RETRY GPS ON USER TAP...', '#f0a040');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      applyGpsCoords(pos.coords);
      setStatus(`${latitude.toFixed(4)} / ${longitude.toFixed(4)} · ±${Math.round(accuracy)}m`, '#c9d97b');
      dbg('RETRY SUCCESS');
      if (!userMarker) {
        userMarker = L.marker([latitude, longitude], { icon: userIcon(userHeading) }).addTo(map);
        map.setView([latitude, longitude], 16);
      }
      revealAround(latitude, longitude);
      lastSamplePos = { lat: latitude, lng: longitude };
      renderFog();
      updateRegion(latitude, longitude);
      startGPS();
    },
    (err) => {
      let msg = 'GPS BLOCKED';
      if (err.code === 1) msg = 'PERM DENIED · CHECK SETTINGS';
      else if (err.code === 2) msg = 'NO SIGNAL · OUTDOORS?';
      else if (err.code === 3) msg = 'TIMEOUT · TRY AGAIN';
      setStatus(msg, '#ef4a3f');
      dbg('RETRY FAIL code=' + err.code + ' msg=' + err.message);
      gpsRetried = false;
    },
    { enableHighAccuracy: true, timeout: 15000 }
  );
}
document.addEventListener('click', retryGPSOnGesture, { once: false });
document.addEventListener('touchend', retryGPSOnGesture, { once: false });

// ===== PULL-TO-REFRESH GPS =====
// Touch starting near the top of the map area, dragged down ≥80px, triggers a GPS refresh.
(function setupPullToRefresh() {
  const PULL_THRESHOLD = 80;
  const TRIGGER_ZONE_TOP_PX = 130;  // top of map area (titlebar ends ~100px in)
  let startY = null;
  let startedInZone = false;
  let pullDist = 0;

  const indicator = () => document.getElementById('pullRefresh');
  const label = () => document.getElementById('prLabel');

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    // Must start in the top of the map area, not in the chrome or sheets
    if (t.clientY < TRIGGER_ZONE_TOP_PX && t.clientY > 100) {
      // Don't intercept if a sheet is open
      const overlay = document.getElementById('sheetOverlay');
      if (overlay.classList.contains('open')) return;
      startY = t.clientY;
      startedInZone = true;
      pullDist = 0;
    } else {
      startedInZone = false;
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!startedInZone || startY === null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) {
      indicator().classList.remove('visible');
      return;
    }
    pullDist = dy;
    indicator().classList.add('visible');
    if (dy >= PULL_THRESHOLD) {
      label().textContent = 'RELEASE TO REFRESH';
    } else {
      label().textContent = 'PULL TO REFRESH GPS';
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!startedInZone) return;
    if (pullDist >= PULL_THRESHOLD) {
      doGpsRefresh();
    } else {
      indicator().classList.remove('visible');
    }
    startY = null;
    startedInZone = false;
    pullDist = 0;
  });

  window.doGpsRefresh = function() {
    const ind = indicator();
    ind.classList.add('refreshing', 'visible');
    label().textContent = 'REFRESHING...';
    haptic('tap');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        applyGpsCoords(pos.coords);
        if (userMarker) {
          userMarker.setLatLng([latitude, longitude]);
          userMarker.setIcon(userIcon(userHeading));
        }
        if (liveNavPoiId) {
          const poi = pois.find(p => p.id === liveNavPoiId);
          if (poi) updateNavInfo(poi);
        }
        updateRegion(latitude, longitude);
        label().textContent = 'GPS REFRESHED · ±' + Math.round(accuracy) + 'm';
        setTimeout(() => {
          ind.classList.remove('refreshing', 'visible');
        }, 1200);
      },
      (err) => {
        label().textContent = 'REFRESH FAILED';
        setTimeout(() => {
          ind.classList.remove('refreshing', 'visible');
        }, 1500);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
})();

// ===== MARK FLOW =====
function dropPin() {
  if (!userPos) {
    showToast('NO GPS · LONG-PRESS MAP TO DROP MANUALLY');
    return;
  }
  dropPinAt(userPos.lat, userPos.lng);
}

function dropPinAt(lat, lng) {
  flashMark();
  const id = 'POI-' + Date.now();
  const region = getCurrentRegion();
  const sectorId = region ? sectorIdForRegion(region, lat, lng) : null;
  const poi = {
    id: id,
    lat: lat,
    lng: lng,
    category: null,        // null = unclassified / pending
    name: '',
    notes: '',
    photo: null,           // base64 data URL
    hva: false,            // legacy — kept on disk for back-compat, not read
    tier: 2,               // 1=LOW, 2=MED, 3=HIGH — controls map visibility by zoom
    regionId: region ? region.id : null,
    sector: sectorId,
    created: Date.now(),
  };
  pois.push(poi);
  savePOIs();
  renderAllMarkers();
  updatePendingCount();
  logEvent('drop', id, 'Pin dropped', sectorId ? 'Sector ' + sectorId : '');
  showToast('PIN DROPPED · ID ' + id.slice(-6));
  // Ceremony — sector tag briefly displays a numeric confirmation
  briefSectorMessage('POI MARKED · #' + String(pois.length).padStart(3, '0'));
}

// Temporarily overrides the sector tag text with a confirmation message,
// then restores the original. Used after action events (POI drop, etc.)
// to give the instrument a numeric receipt of what just happened.
function briefSectorMessage(msg, ms) {
  const el = document.getElementById('sectorTagText');
  if (!el) return;
  const original = el.textContent;
  el.textContent = msg;
  el.classList.add('lcd-flicker');
  setTimeout(() => el.classList.remove('lcd-flicker'), 380);
  setTimeout(() => {
    el.textContent = original;
    el.classList.add('lcd-flicker');
    setTimeout(() => el.classList.remove('lcd-flicker'), 380);
  }, ms || 2200);
}

// ===== CLASSIFY / EDIT =====
function buildCatGrid() {
  const grid = document.getElementById('catGrid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'cat-pad' + (selectedCategory === cat.id ? ' selected' : '');
    div.dataset.cat = cat.id;
    div.innerHTML = `
      <div class="socket"></div>
      <div class="led"></div>
      <div class="cap">
        <div class="flag-mini" style="color:${cat.color};"></div>
        <div class="lbl">${cat.label}</div>
      </div>
    `;
    div.onclick = () => {
      selectedCategory = cat.id;
      buildCatGrid();
      buildSymbolGrid();  // refresh swatches with new category color
    };
    grid.appendChild(div);
  });
}

function openClassifySheet(poiId) {
  haptic('tap');
  editingId = poiId;
  const poi = pois.find(p => p.id === poiId);
  if (!poi) return;

  selectedCategory = poi.category || 'WAYPOINT';
  selectedType = poi.type || 'NONE';
  selectedShape = poi.shape || 'FLAG';
  document.getElementById('poiName').value = poi.name || '';
  document.getElementById('poiNotes').value = poi.notes || '';
  document.getElementById('classifyTitle').textContent = poi.category ? 'EDIT POI' : 'CLASSIFY POI';
  document.getElementById('deleteBtn').style.display = 'block';

  // Load photo
  editorPhoto = poi.photo || null;
  updatePhotoUI();

  // Load tier (replaces old HVA toggle). Default to MED for legacy POIs
  // missing the field, though loadPOIs migration should have set this.
  editorTier = (typeof poi.tier === 'number') ? poi.tier : 2;
  updateTierUI();

  // Show visit info only for classified POIs
  const visitRow = document.getElementById('visitRow');
  const poiObjectiveRow = document.getElementById('poiObjectiveRow');
  if (poi.category) {
    visitRow.style.display = 'block';
    document.getElementById('visitNum').textContent = String(poi.visits || 0).padStart(3, '0');
    document.getElementById('visitLast').textContent = poi.lastVisited
      ? 'LAST: ' + new Date(poi.lastVisited).toLocaleDateString()
      : 'NEVER VISITED';
    poiObjectiveRow.style.display = 'block';
    renderPoiLinkedMissions(poi.id);
  } else {
    visitRow.style.display = 'none';
    poiObjectiveRow.style.display = 'none';
  }

  // Distance + bearing (updates live as user moves)
  updateNavInfo(poi);
  liveNavPoiId = poi.id;

  // Always show navigation row
  document.getElementById('navRow').style.display = 'block';
  // Always show reposition row
  document.getElementById('repositionRow').style.display = 'block';

  buildCatGrid();
  buildShapeRow();
  symbolGridExpanded = false;  // always start collapsed
  buildSymbolGrid();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('classifySheet').classList.add('open');
}

function buildShapeRow() {
  const row = document.getElementById('shapeRow');
  if (!row) return;
  row.innerHTML = '';
  POI_SHAPES.forEach(s => {
    const chip = document.createElement('div');
    const isActive = selectedShape === s.id;
    chip.className = 'cat-chip with-led' + (isActive ? ' active' : '');
    chip.innerHTML = `<span class="led-indicator${isActive ? ' on' : ''}"></span>${s.label}`;
    chip.onclick = () => {
      selectedShape = s.id;
      buildShapeRow();
      buildSymbolGrid();  // refresh preview swatches
    };
    row.appendChild(chip);
  });
}

let symbolGridExpanded = false;  // collapsed by default — shows only the selected tile

function tileMarkup(t, cat) {
  // Returns the inner HTML for a single symbol tile preview
  if (t.id === 'NONE') {
    return `<span class="placeholder">—</span><span class="label">${t.label}</span>`;
  } else if (selectedShape === 'ICON') {
    return `
      <svg viewBox="-20 -20 40 40" xmlns="http://www.w3.org/2000/svg" style="color:${cat.color};">
        <circle cx="0" cy="0" r="14" fill="rgba(8, 6, 4, 0.92)" stroke="#1a0f06" stroke-width="1"/>
        <g transform="scale(1.1)">${t.svg}</g>
      </svg>
      <span class="label">${t.label}</span>`;
  } else {
    return `
      <svg viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" style="color:#fff;">
        <rect x="-11" y="-11" width="22" height="22" rx="2" fill="${cat.color}" stroke="#1a0f06" stroke-width="0.8"/>
        <g transform="scale(0.85)">${t.svg}</g>
      </svg>
      <span class="label">${t.label}</span>`;
  }
}

function buildSymbolGrid() {
  const grid = document.getElementById('symbolGrid');
  if (!grid) return;
  grid.innerHTML = '';
  grid.classList.toggle('expanded', symbolGridExpanded);
  const cat = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  if (!symbolGridExpanded) {
    // Collapsed: just the currently selected symbol + an expand toggle
    const currentType = POI_TYPES.find(t => t.id === selectedType) || POI_TYPES[0];
    const tile = document.createElement('div');
    tile.className = 'symbol-tile selected' + (currentType.id === 'NONE' ? ' none' : '');
    tile.innerHTML = tileMarkup(currentType, cat);
    tile.onclick = () => { symbolGridExpanded = true; buildSymbolGrid(); };
    grid.appendChild(tile);

    const toggle = document.createElement('div');
    toggle.className = 'symbol-toggle';
    toggle.innerHTML = `<span class="arrow">▾</span><span class="lbl">CHANGE SYMBOL</span>`;
    toggle.onclick = () => { symbolGridExpanded = true; buildSymbolGrid(); };
    grid.appendChild(toggle);
    return;
  }

  // Expanded: full grid of 20 + a collapse toggle at the end
  POI_TYPES.forEach(t => {
    const tile = document.createElement('div');
    tile.className = 'symbol-tile' + (selectedType === t.id ? ' selected' : '') + (t.id === 'NONE' ? ' none' : '');
    tile.innerHTML = tileMarkup(t, cat);
    tile.onclick = () => {
      selectedType = t.id;
      symbolGridExpanded = false;  // collapse after selection
      buildSymbolGrid();
    };
    grid.appendChild(tile);
  });

  const toggle = document.createElement('div');
  toggle.className = 'symbol-toggle collapse';
  toggle.innerHTML = `<span class="arrow">▴</span><span class="lbl">COLLAPSE</span>`;
  toggle.onclick = () => { symbolGridExpanded = false; buildSymbolGrid(); };
  grid.appendChild(toggle);
}

function updateNavInfo(poi) {
  const row = document.getElementById('navInfoRow');
  if (!userPos) {
    row.style.display = 'none';
    return;
  }
  row.style.display = 'block';
  const distM = metersBetween(userPos.lat, userPos.lng, poi.lat, poi.lng);
  const distFt = distM * 3.28084;
  let distLabel;
  if (distFt < 528) distLabel = Math.round(distFt) + 'FT';
  else distLabel = (distM / 1609.34).toFixed(2) + 'MI';
  const bearing = bearingDeg(userPos.lat, userPos.lng, poi.lat, poi.lng);
  document.getElementById('navDistance').textContent = distLabel;
  document.getElementById('navBearing').textContent = Math.round(bearing) + '° ' + cardinal(bearing);
  document.getElementById('compassPointer').setAttribute('transform', `rotate(${bearing} 28 28)`);
  // Elevation: show user's current altitude if available
  const elevEl = document.getElementById('navElevation');
  if (elevEl) {
    if (userAltitudeM !== null) {
      const ft = Math.round(userAltitudeM * 3.28084);
      elevEl.textContent = ft + 'FT';
      elevEl.parentElement.style.display = 'flex';
    } else {
      elevEl.parentElement.style.display = 'none';
    }
  }
}

function bearingDeg(lat1, lng1, lat2, lng2) {
  const toRad = x => x * Math.PI / 180;
  const toDeg = x => x * 180 / Math.PI;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const λ1 = toRad(lng1);
  const λ2 = toRad(lng2);
  const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

function cardinal(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

// ===== TRAIL TOGGLE/CLEAR =====
function toggleTrail() {
  showTrail = !showTrail;
  document.getElementById('trailToggleDesc').textContent = showTrail ? 'Trail visible' : 'Trail hidden';
  document.getElementById('trailToggleIndicator').classList.toggle('on', showTrail);
  renderTrail();
  savePrefs();
}

function clearTrail() {
  if (!confirm('Clear today\'s trail?')) return;
  todayTrail = [];
  saveTrail();
  renderTrail();
  document.getElementById('trailPointCount').textContent = '0 points';
  showToast('TRAIL CLEARED');
}

// ===== STATS SHEET =====
function showStatsSheet() {
  const body = document.getElementById('statsBody');
  const classified = pois.filter(p => p.category);
  const totalVisits = pois.reduce((sum, p) => sum + (p.visits || 0), 0);
  // Tier-3 (HIGH) count, replacing the old HVA stat.
  const tier3Count = pois.filter(p => (p.tier || 2) === 3).length;

  // Per-category breakdown
  const byCategory = {};
  CATEGORIES.forEach(c => byCategory[c.id] = 0);
  classified.forEach(p => { byCategory[p.category] = (byCategory[p.category] || 0) + 1; });

  // Most-visited POI
  let mostVisited = null;
  pois.forEach(p => {
    if ((p.visits || 0) > 0 && (!mostVisited || p.visits > mostVisited.visits)) {
      mostVisited = p;
    }
  });

  // Total sectors across all regions
  const totalSectors = regions.reduce((sum, r) => sum + (r.revealedSectors ? r.revealedSectors.length : 0), 0);

  // Approximate area: cells × cell area
  const cellM2 = 150 * 150;  // 150m × 150m
  const totalM2 = revealedCells.size * cellM2;
  const totalMi2 = totalM2 / 2589988;  // m² per mile²

  // First and last activity
  const firstDay = journalEntries.length ? new Date(Math.min(...journalEntries.map(e => e.ts))) : null;

  body.innerHTML = `
    <div class="stats-section-label">▸ POIs</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">TOTAL</div>
        <div class="value">${String(classified.length).padStart(3, '0')}</div>
        <div class="sub">${pois.filter(p => !p.category).length} pending</div>
      </div>
      <div class="stat-card">
        <div class="label">HIGH TIER</div>
        <div class="value">${String(tier3Count).padStart(3, '0')}</div>
        <div class="sub">always visible</div>
      </div>
    </div>
    <div class="stats-grid">
      ${CATEGORIES.map(c => `
        <div class="stat-card">
          <div class="label" style="color:${c.color};">${c.id}</div>
          <div class="value">${String(byCategory[c.id] || 0).padStart(2, '0')}</div>
        </div>
      `).join('')}
    </div>

    <div class="stats-section-label">▸ ACTIVITY</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">VISITS</div>
        <div class="value">${String(totalVisits).padStart(3, '0')}</div>
        <div class="sub">all-time</div>
      </div>
      <div class="stat-card">
        <div class="label">EVENTS</div>
        <div class="value">${journalEntries.length}</div>
        <div class="sub">in journal</div>
      </div>
    </div>
    ${mostVisited ? `
      <div class="stat-card wide">
        <div class="label">MOST VISITED</div>
        <div class="value" style="font-size:14px;">${escapeHtml(mostVisited.name || 'UNTITLED')}</div>
        <div class="sub">×${mostVisited.visits} · ${mostVisited.category}</div>
      </div>
    ` : ''}

    <div class="stats-section-label">▸ TERRITORY</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">REGIONS</div>
        <div class="value">${regions.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">SECTORS</div>
        <div class="value">${totalSectors}</div>
        <div class="sub">across regions</div>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">FOG CELLS</div>
        <div class="value">${revealedCells.size}</div>
        <div class="sub">~150m each</div>
      </div>
      <div class="stat-card">
        <div class="label">AREA</div>
        <div class="value">${totalMi2.toFixed(2)}</div>
        <div class="sub">sq mi</div>
      </div>
    </div>

    ${firstDay ? `
      <div class="stat-card wide">
        <div class="label">FIELD TIME</div>
        <div class="value" style="font-size:14px;">${Math.ceil((Date.now() - firstDay.getTime()) / (1000 * 60 * 60 * 24))} DAYS</div>
        <div class="sub">since first activity</div>
      </div>
    ` : ''}
  `;
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('statsSheet').classList.add('open');
}

function navigateToPOI() {
  const poi = pois.find(p => p.id === editingId);
  if (!poi) return;
  // Apple Maps URL scheme: maps://?daddr=lat,lng — falls back to Google Maps web on non-iOS
  const label = encodeURIComponent(poi.name || 'POI');
  const url = `maps://?daddr=${poi.lat},${poi.lng}&q=${label}`;
  // For non-iOS fallback, also build a https Maps URL
  const fallback = `https://maps.apple.com/?daddr=${poi.lat},${poi.lng}&q=${label}`;
  // Try the native URL scheme, fall back to https
  window.location.href = url;
  setTimeout(() => { window.location.href = fallback; }, 250);
}

function manualLogVisit() {
  const poi = pois.find(p => p.id === editingId);
  if (!poi) return;
  poi.visits = (poi.visits || 0) + 1;
  poi.lastVisited = Date.now();
  savePOIs();
  const displayName = poi.name || ('POI-' + poi.id.slice(-6));
  logEvent('visit', poi.id, 'Visited (manual): ' + displayName, poi.category + ' · ×' + poi.visits);
  // Refresh display
  document.getElementById('visitNum').textContent = String(poi.visits).padStart(3, '0');
  document.getElementById('visitLast').textContent = 'LAST: ' + new Date(poi.lastVisited).toLocaleDateString();
  showToast('VISIT LOGGED · ×' + poi.visits);
}

// ===== PHOTO HANDLING =====
// ===== PHOTO COMPRESSION =====
// When the user picks a photo, we:
// 1. Refuse upfront if storage is already > 85% full.
// 2. Load the image into a canvas, resize so longest edge = 800px.
// 3. Re-encode as JPEG at quality 0.6.
// 4. If the result is still > 200 KB, refuse with a clear error.
// 5. Show a confirm dialog with original/compressed sizes before commit.
// 6. Store as a data URL on the POI.
const PHOTO_MAX_EDGE = 800;       // px on longest side
const PHOTO_JPEG_QUALITY = 0.6;
const PHOTO_HARD_CAP_BYTES = 200 * 1024;  // 200 KB max per photo

function onPhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  // Reset input so selecting the same file twice still triggers change
  event.target.value = '';

  // Storage budget check — refuse new photos if we're already near the cap
  const usage = computeStorageUsage();
  const pctFull = (usage.total / (5 * 1024 * 1024)) * 100;
  if (pctFull > 85) {
    alert('STORAGE NEARLY FULL (' + Math.round(pctFull) + '%)\n\n' +
          'Cannot add new photos until space is freed.\n\n' +
          'Try MENU > CLEAR FOG or remove photos from existing POIs.');
    return;
  }

  // Load + compress
  const originalBytes = file.size;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const compressed = compressImage(img);
      if (!compressed) {
        alert('PHOTO PROCESSING FAILED\n\nCould not process this image.');
        return;
      }
      const compressedBytes = Math.round((compressed.length * 3) / 4);  // approx base64 → bytes
      if (compressedBytes > PHOTO_HARD_CAP_BYTES) {
        alert('PHOTO TOO LARGE\n\n' +
              'Original: ' + fmtBytes(originalBytes) + '\n' +
              'Compressed: ' + fmtBytes(compressedBytes) + '\n' +
              'Cap: ' + fmtBytes(PHOTO_HARD_CAP_BYTES) + '\n\n' +
              'Try a less detailed photo (e.g. not a panorama).');
        return;
      }
      // Confirm before commit so user sees what's being stored
      const confirmed = confirm(
        'SAVE PHOTO?\n\n' +
        'Original: ' + fmtBytes(originalBytes) + '\n' +
        'Compressed: ' + fmtBytes(compressedBytes) + '\n' +
        'Dimensions: ' + Math.round(img.width * compressRatio(img)) + ' × ' +
                       Math.round(img.height * compressRatio(img)) + '\n\n' +
        'Press OK to save.'
      );
      if (!confirmed) return;
      editorPhoto = compressed;
      updatePhotoUI();
    };
    img.onerror = () => {
      alert('PHOTO PROCESSING FAILED\n\nCould not load this image.');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Compute the resize ratio so the longest edge becomes PHOTO_MAX_EDGE.
// Returns 1 if image is already smaller than the cap (no upscaling).
function compressRatio(img) {
  const longest = Math.max(img.width, img.height);
  if (longest <= PHOTO_MAX_EDGE) return 1;
  return PHOTO_MAX_EDGE / longest;
}

// Resize image via canvas, re-encode as JPEG. Returns the data URL or null.
function compressImage(img) {
  try {
    const ratio = compressRatio(img);
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // Use a small black background so transparent PNGs don't become weird
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY);
  } catch (e) {
    console.error('compressImage failed:', e);
    return null;
  }
}

function removePhoto() {
  if (!confirm('Remove photo from this POI?')) return;
  editorPhoto = null;
  updatePhotoUI();
}

function updatePhotoUI() {
  const area = document.getElementById('photoArea');
  const placeholder = document.getElementById('photoPlaceholder');
  const preview = document.getElementById('photoPreview');
  if (editorPhoto) {
    area.classList.add('has-photo');
    placeholder.style.display = 'none';
    preview.style.display = 'block';
    preview.src = editorPhoto;
  } else {
    area.classList.remove('has-photo');
    placeholder.style.display = 'inline';
    preview.style.display = 'none';
    preview.src = '';
  }
}

// ===== TIER CONTROL =====
// Replaces the old HVA toggle. setTier() is called from the 3-position
// LOW/MED/HIGH segmented control in the classify sheet.
function setTier(t) {
  if (t !== 1 && t !== 2 && t !== 3) return;
  editorTier = t;
  updateTierUI();
  haptic('tap');
}

function updateTierUI() {
  // Highlight whichever of the 3 tier buttons matches editorTier.
  // Buttons share class .tier-btn and carry data-tier="1|2|3".
  document.querySelectorAll('#tierControl .tier-btn').forEach(btn => {
    const t = parseInt(btn.getAttribute('data-tier'), 10);
    btn.classList.toggle('on', t === editorTier);
  });
}

function savePOI() {
  const poi = pois.find(p => p.id === editingId);
  if (!poi) return;
  const wasClassified = !!poi.category;
  const oldTier = poi.tier || 2;
  // Snapshot for undo
  const beforeSnapshot = JSON.parse(JSON.stringify(poi));
  poi.category = selectedCategory;
  poi.type = selectedType;
  poi.shape = selectedShape;
  poi.name = document.getElementById('poiName').value.trim();
  poi.notes = document.getElementById('poiNotes').value.trim();
  poi.photo = editorPhoto;
  poi.tier = editorTier;
  savePOIs();
  renderAllMarkers();
  updatePendingCount();

  // Journal logging
  const displayName = poi.name || ('POI-' + poi.id.slice(-6));
  if (!wasClassified) {
    logEvent('classify', poi.id, 'Classified: ' + displayName, poi.category);
  } else {
    logEvent('edit', poi.id, 'Edited: ' + displayName, poi.category);
  }
  // Log tier changes — uses 'tier' event type. (The old 'hva' event type
  // still appears in historical journal entries and is rendered as-is.)
  if (editorTier !== oldTier) {
    logEvent('tier', poi.id, 'Tier → ' + TIER_LABELS[editorTier] + ': ' + displayName, poi.category);
  }

  // Offer undo for the change
  const undoLabel = wasClassified ? 'Undo edit' : 'Undo classification';
  pushUndo(undoLabel, () => {
    const p = pois.find(x => x.id === beforeSnapshot.id);
    if (!p) return;
    Object.assign(p, beforeSnapshot);
    savePOIs();
    renderAllMarkers();
    updatePendingCount();
  });

  closeSheet();
  showToast('POI SAVED');
  haptic('confirm');
}

function deletePOI() {
  const poi = pois.find(p => p.id === editingId);
  if (!poi) return;
  const displayName = poi.name || ('POI-' + poi.id.slice(-6));
  if (!confirm('DELETE "' + displayName + '"?')) return;
  const deletedPoi = JSON.parse(JSON.stringify(poi));  // deep copy for undo
  pois = pois.filter(p => p.id !== editingId);
  savePOIs();
  renderAllMarkers();
  updatePendingCount();
  logEvent('delete', editingId, 'Deleted: ' + displayName, poi.category || '');
  closeSheet();
  showToast('POI DELETED');
  haptic('warn');
  pushUndo('Restore "' + displayName + '"', () => {
    pois.push(deletedPoi);
    savePOIs();
    renderAllMarkers();
    updatePendingCount();
  });
}

// ===== LIST FILTER STATE (also used for map filtering) =====
let activeCategoryFilter = 'ALL';  // 'ALL' or a category ID
let activeTypeFilter = 'ALL';      // 'ALL' or a type ID
let activeRegionFilter = 'ALL';    // 'ALL' or a region ID
let listSearchQuery = '';
let listSortMode = 'created_desc';

function buildRegionDropdown() {
  const sel = document.getElementById('listRegion');
  if (!sel) return;
  sel.innerHTML = '<option value="ALL">ALL REGIONS</option>';
  // Sort regions by POI count descending
  const sortedRegions = [...regions].sort((a, b) => {
    const ca = pois.filter(p => p.regionId === a.id && p.category).length;
    const cb = pois.filter(p => p.regionId === b.id && p.category).length;
    return cb - ca;
  });
  sortedRegions.forEach(r => {
    const count = pois.filter(p => p.regionId === r.id && p.category).length;
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = r.name.replace(' REGION', '') + ' · ' + count;
    sel.appendChild(opt);
  });
  // Add "No region" option for POIs without one
  const noRegionCount = pois.filter(p => !p.regionId && p.category).length;
  if (noRegionCount > 0) {
    const opt = document.createElement('option');
    opt.value = 'NONE';
    opt.textContent = 'UNASSIGNED · ' + noRegionCount;
    sel.appendChild(opt);
  }
  sel.value = activeRegionFilter;
}

function buildCatFilterRow() {
  const row = document.getElementById('catFilterRow');
  row.innerHTML = '';
  const chips = [{ id: 'ALL', label: 'ALL' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label }))];
  chips.forEach(c => {
    const chip = document.createElement('div');
    const isActive = activeCategoryFilter === c.id;
    chip.className = 'cat-chip with-led' + (isActive ? ' active' : '');
    chip.innerHTML = `<span class="led-indicator${isActive ? ' on' : ''}"></span>${c.label}`;
    chip.onclick = () => {
      activeCategoryFilter = c.id;
      savePrefs();
      buildCatFilterRow();
      renderListBody();
      renderAllMarkers();  // also re-render map so the filter affects flag visibility
    };
    row.appendChild(chip);
  });
}

function buildTypeFilterDropdown() {
  const sel = document.getElementById('listTypeFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="ALL">ALL SYMBOLS</option>';
  POI_TYPES.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.label;
    sel.appendChild(opt);
  });
  sel.value = activeTypeFilter;
}

function onTypeFilterChange() {
  const sel = document.getElementById('listTypeFilter');
  activeTypeFilter = sel.value;
  savePrefs();
  renderListBody();
  renderAllMarkers();
}

// ===== LIST SHEET =====
// ===== LOG SHEET (dual-tab: JOURNAL + ASSETS) =====
let activeLogTab = 'journal';  // 'journal' | 'assets' — persists in prefs

function openLogSheet(initialTab) {
  if (initialTab) activeLogTab = initialTab;
  document.getElementById('listSearch').value = listSearchQuery;
  document.getElementById('listSort').value = listSortMode;
  buildRegionDropdown();
  buildCatFilterRow();
  buildTypeFilterDropdown();
  renderListBody();
  renderJournalBody();
  switchLogTab(activeLogTab);
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('logSheet').classList.add('open');
}

function switchLogTab(tabId) {
  activeLogTab = tabId;
  // Update tab chips
  document.querySelectorAll('.log-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabId);
  });
  // Show only the active tab content
  document.getElementById('logTabJournal').classList.toggle('active', tabId === 'journal');
  document.getElementById('logTabAssets').classList.toggle('active', tabId === 'assets');
  savePrefs();
}

// Backward-compat: old call sites still use these names
function openListSheet() { openLogSheet('assets'); }
function openJournalSheet() { openLogSheet('journal'); }

function renderListBody() {
  const body = document.getElementById('listBody');
  listSearchQuery = document.getElementById('listSearch').value || '';
  listSortMode = document.getElementById('listSort').value;
  const regionSel = document.getElementById('listRegion');
  if (regionSel) activeRegionFilter = regionSel.value;
  savePrefs();

  let classified = pois.filter(p => p.category);

  // Filter by region
  if (activeRegionFilter === 'NONE') {
    classified = classified.filter(p => !p.regionId);
  } else if (activeRegionFilter !== 'ALL') {
    classified = classified.filter(p => p.regionId === activeRegionFilter);
  }

  // Filter by category
  if (activeCategoryFilter !== 'ALL') {
    classified = classified.filter(p => p.category === activeCategoryFilter);
  }

  // Filter by type
  if (activeTypeFilter !== 'ALL') {
    classified = classified.filter(p => (p.type || 'NONE') === activeTypeFilter);
  }

  // Filter by search text
  const q = listSearchQuery.trim().toLowerCase();
  if (q) {
    classified = classified.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  // Sort
  classified.sort((a, b) => {
    switch (listSortMode) {
      case 'created_asc':   return a.created - b.created;
      case 'created_desc':  return b.created - a.created;
      case 'name_asc':      return (a.name || 'ZZZ').localeCompare(b.name || 'ZZZ');
      case 'distance_asc':
        if (!userPos) return 0;
        return metersBetween(userPos.lat, userPos.lng, a.lat, a.lng) -
               metersBetween(userPos.lat, userPos.lng, b.lat, b.lng);
      case 'visits_desc':   return (b.visits || 0) - (a.visits || 0);
      case 'category_asc':  return (a.category || '').localeCompare(b.category || '');
      default:              return b.created - a.created;
    }
  });

  const assetsCountEl = document.getElementById('logAssetsCount');
  if (assetsCountEl) assetsCountEl.textContent = classified.length;
  body.innerHTML = '';

  if (classified.length === 0) {
    const totalClassified = pois.filter(p => p.category).length;
    if (totalClassified === 0) {
      body.innerHTML = '<div class="empty-state"><div class="big">NO ASSETS YET</div>Drop pins to start your survey.</div>';
    } else {
      body.innerHTML = '<div class="empty-state"><div class="big">NO MATCHES</div>No POIs match the current filter or search.</div>';
    }
    return;
  }

  classified.forEach(p => {
    const cat = CATEGORIES.find(c => c.id === p.category);
    const row = document.createElement('div');
    // Tier 3 (HIGH) gets the star + amber edge that HVA used to provide,
    // both as a list-scan affordance and visual continuity with the old design.
    const isTop = (p.tier || 2) === 3;
    row.className = 'list-row' + (isTop ? ' hva' : '');
    const starHTML = isTop ? '<span class="hva-star">★</span>' : '';
    const visitHTML = p.visits ? ' · ×' + p.visits : '';
    // Region name if showing across all regions; otherwise omit (it's redundant)
    let regionHTML = '';
    if (activeRegionFilter === 'ALL' && p.regionId) {
      const r = regions.find(rr => rr.id === p.regionId);
      if (r) regionHTML = ' · ' + r.name.replace(' REGION', '');
    }
    row.innerHTML = `
      <div class="flag-icon" style="color:${cat.color};"><div class="pole"></div><div class="pen"></div></div>
      <div class="info">
        <div class="name">${starHTML}${escapeHtml(p.name || 'UNTITLED')}</div>
        <div class="meta">${p.category} · ${distanceLabel(p)}${visitHTML}${regionHTML}</div>
      </div>
    `;
    row.onclick = () => {
      closeSheet();
      setTimeout(() => {
        map.setView([p.lat, p.lng], 18);
        selectPOI(p.id);
        openClassifySheet(p.id);
      }, 350);
    };
    body.appendChild(row);
  });
}

// ===== PENDING SHEET =====
function openPendingSheet() {
  haptic('tap');
  const body = document.getElementById('pendingBody');
  const pending = pois.filter(p => !p.category);
  document.getElementById('pendingCount').textContent = pending.length;
  body.innerHTML = '';

  if (pending.length === 0) {
    body.innerHTML = '<div class="empty-state"><div class="big">NO PENDING</div>All POIs classified.</div>';
  } else {
    pending.forEach(p => {
      const row = document.createElement('div');
      row.className = 'list-row';
      row.innerHTML = `
        <div class="flag-icon" style="color:#8c8170;"><div class="pole"></div><div class="pen"></div></div>
        <div class="info">
          <div class="name">UNCLASSIFIED · ${p.id.slice(-6)}</div>
          <div class="meta">${formatTimestamp(p.created)} · ${distanceLabel(p)}</div>
        </div>
      `;
      row.onclick = () => {
        closeSheet();
        setTimeout(() => openClassifySheet(p.id), 350);
      };
      body.appendChild(row);
    });
  }

  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('pendingSheet').classList.add('open');
}

function updatePendingCount() {
  const n = pois.filter(p => !p.category).length;
  // Legacy label support
  const lbl = document.getElementById('pendingLabel');
  if (lbl) lbl.textContent = 'PEND';
  // Set the has-pending class on whichever pending button exists (portrait + landscape)
  ['pendingTgBtn', 'landscapePendingBtn'].forEach(id => {
    const tgBtn = document.getElementById(id);
    if (!tgBtn) return;
    let dot = tgBtn.querySelector('.tg-dot');
    if (!dot) {
      dot = document.createElement('span');
      dot.className = 'tg-dot';
      tgBtn.appendChild(dot);
    }
    tgBtn.classList.toggle('has-pending', n > 0);
  });
}

// ===== JOURNAL SHEET =====
let journalRange = 'today';  // 'today' | 'week' | 'month' | 'all'

function setupJournalRangeChips() {
  const chips = document.querySelectorAll('#journalRangeRow .cat-chip');
  chips.forEach(chip => {
    chip.onclick = () => {
      chips.forEach(c => {
        c.classList.remove('active');
        const led = c.querySelector('.led-indicator');
        if (led) led.classList.remove('on');
      });
      chip.classList.add('active');
      const led = chip.querySelector('.led-indicator');
      if (led) led.classList.add('on');
      journalRange = chip.dataset.range;
      renderJournalBody();
    };
  });
}
setupJournalRangeChips();

function renderJournalBody() {
  const body = document.getElementById('journalBody');
  body.innerHTML = '';

  // Filter by selected range
  const now = Date.now();
  const ranges = {
    today: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    all: Infinity,
  };
  const cutoff = journalRange === 'today'
    ? new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    : now - ranges[journalRange];

  const filtered = journalEntries.filter(e => e.ts >= cutoff);
  // Update counts in BOTH tabs (LOG sheet shows both totals on its tab chips)
  const journalCountEl = document.getElementById('logJournalCount');
  if (journalCountEl) journalCountEl.textContent = filtered.length;

  if (filtered.length === 0) {
    body.innerHTML = '<div class="empty-state"><div class="big">NO ACTIVITY</div>No journal entries in this range.</div>';
    return;
  }

  // Sort newest first, then group by day
  const sorted = [...filtered].sort((a, b) => b.ts - a.ts);
  let lastDay = null;
  sorted.forEach(entry => {
    const d = new Date(entry.ts);
    const dayKey = d.toDateString();
    if (dayKey !== lastDay) {
      const header = document.createElement('div');
      header.className = 'journal-day-header';
      header.textContent = '▸ ' + formatDayHeader(d);
      body.appendChild(header);
      lastDay = dayKey;
    }
    const icons = {
      drop: '▼',
      classify: '⬡',
      edit: '✎',
      hva: '★',
      visit: '◉',
      delete: '✕',
    };
    const row = document.createElement('div');
    row.className = 'journal-row ' + entry.type;
    row.innerHTML = `
      <div class="ic">${icons[entry.type] || '·'}</div>
      <div class="text">
        <div class="t">${escapeHtml(entry.summary)}</div>
        <div class="s">${escapeHtml(entry.meta || '')}</div>
      </div>
      <div class="time">${formatJournalTime(d)}</div>
    `;
    row.onclick = () => {
      const poi = pois.find(p => p.id === entry.poiId);
      if (poi) {
        closeSheet();
        setTimeout(() => {
          map.setView([poi.lat, poi.lng], 18);
          selectPOI(poi.id);
          openClassifySheet(poi.id);
        }, 350);
      }
    };
    body.appendChild(row);
  });
}

function formatDayHeader(d) {
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY · ' + formatDateShort(d);
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY · ' + formatDateShort(d);
  return formatDateShort(d).toUpperCase();
}
function formatDateShort(d) {
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return d.getDate().toString().padStart(2, '0') + ' ' + months[d.getMonth()] + ' ' + d.getFullYear().toString().slice(-2);
}
function formatJournalTime(d) {
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

// ===== UTILS =====
function closeSheet() {
  document.getElementById('sheetOverlay').classList.remove('open');
  document.getElementById('classifySheet').classList.remove('open');
  document.getElementById('pendingSheet').classList.remove('open');
  document.getElementById('settingsSheet').classList.remove('open');
  document.getElementById('logSheet').classList.remove('open');
  document.getElementById('searchSheet').classList.remove('open');
  document.getElementById('statsSheet').classList.remove('open');
  document.getElementById('objectivesSheet').classList.remove('open');
  document.getElementById('missionFormSheet').classList.remove('open');
  // Health sheets — these were missed in the initial wire-up, which made
  // the HEALTH sheet's CLOSE button look broken.
  document.getElementById('healthSheet').classList.remove('open');
  document.getElementById('healthDetailSheet').classList.remove('open');
  // Tear down the live fast timer interval if it's running. Without this,
  // it keeps ticking in the background forever after the sheet is closed.
  if (typeof fastTimerHandle !== 'undefined' && fastTimerHandle) {
    clearInterval(fastTimerHandle);
    fastTimerHandle = null;
  }
  // Same for the live workout ticker. The workout itself stays alive in
  // localStorage — closing the sheet just stops updating the no-longer-visible UI.
  if (typeof liveTickHandle !== 'undefined' && liveTickHandle) {
    clearInterval(liveTickHandle);
    liveTickHandle = null;
  }
  editingId = null;
  liveNavPoiId = null;
  deselectPOI();
}

// ===== LEGEND TOGGLE =====
let activeLegendTab = 'categories';  // 'categories' | 'symbols'

function buildLegend() {
  // Update which tab chip is active
  document.querySelectorAll('.legend-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.legendTab === activeLegendTab);
  });
  const rows = document.getElementById('legendRows');
  rows.innerHTML = '';
  if (activeLegendTab === 'categories') {
    renderLegendCategories(rows);
  } else {
    renderLegendSymbols(rows);
  }
}

function renderLegendCategories(rows) {
  CATEGORIES.forEach(cat => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:3px 0; color:' + cat.color + ';';
    row.innerHTML = `
      <div style="width:14px; height:18px; position:relative; flex-shrink:0;">
        <div style="position:absolute; left:50%; top:0; transform:translateX(-50%); width:1.5px; height:14px; background:#0a0604;"></div>
        <div style="position:absolute; left:50%; top:1px; width:9px; height:5px; background:currentColor; clip-path:polygon(0 0, 100% 30%, 0 100%); border:0.5px solid #0a0604;"></div>
      </div>
      <span style="font-size:8px; letter-spacing:0.16em; color:#d4c8b0; font-weight:700;">${cat.id}</span>
    `;
    rows.appendChild(row);
  });
}

function renderLegendSymbols(rows) {
  POI_TYPES.forEach(t => {
    if (t.id === 'NONE') return;  // skip the empty placeholder
    const row = document.createElement('div');
    row.className = 'legend-symbol-row';
    row.innerHTML = `
      <div class="swatch">
        <svg viewBox="-12 -12 24 24" xmlns="http://www.w3.org/2000/svg" style="color:#d68a3a;">
          ${t.svg}
        </svg>
      </div>
      <span class="label">${t.label}</span>
    `;
    rows.appendChild(row);
  });
}

function switchLegendTab(tabId) {
  activeLegendTab = tabId;
  buildLegend();
  savePrefs();
}

buildLegend();

function toggleLegend() {
  const panel = document.getElementById('legendPanel');
  const btn = document.getElementById('legendBtn');
  const isOpen = panel.classList.contains('open');
  if (isOpen) {
    panel.classList.remove('open');
    btn.classList.remove('active');
    prefLegendOpen = false;
  } else {
    panel.classList.add('open');
    btn.classList.add('active');
    prefLegendOpen = true;
  }
  savePrefs();
}

// Apply saved legend state on load
function applyLegendPref() {
  const panel = document.getElementById('legendPanel');
  const btn = document.getElementById('legendBtn');
  if (prefLegendOpen) {
    panel.classList.add('open');
    btn.classList.add('active');
  }
}

// ===== SETTINGS =====
function openSettingsSheet() {
  haptic('tap');
  document.getElementById('fogCellCount').textContent =
    revealedCells.size + ' cells revealed';
  document.getElementById('regionCountDesc').textContent =
    regions.length + (regions.length === 1 ? ' region' : ' regions');
  document.getElementById('trailToggleDesc').textContent = showTrail ? 'Trail visible' : 'Trail hidden';
  document.getElementById('trailToggleIndicator').classList.toggle('on', showTrail);
  document.getElementById('trailPointCount').textContent = todayTrail.length + ' points';
  document.getElementById('boundaryToggleDesc').textContent = prefShowBoundaries ? 'Boundaries visible' : 'Boundaries hidden';
  document.getElementById('boundaryToggleIndicator').classList.toggle('on', prefShowBoundaries);
  const stateDesc = document.getElementById('stateToggleDesc');
  if (stateDesc) stateDesc.textContent = prefShowStates ? 'State outlines visible' : 'State outlines hidden';
  const stateInd = document.getElementById('stateToggleIndicator');
  if (stateInd) stateInd.classList.toggle('on', prefShowStates);
  // Storage usage summary line — updated on every open so it's always fresh
  updateStorageIndicator();
  setupFogDensityChips();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('settingsSheet').classList.add('open');
}

// ===== STORAGE DIAGNOSTICS =====
// Compute the size (in bytes) of every localStorage key. Each char is 2 bytes
// because localStorage values are UTF-16 strings.
function computeStorageUsage() {
  const items = [];
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const val = localStorage.getItem(key) || '';
    const bytes = (key.length + val.length) * 2;
    items.push({ key, bytes });
    total += bytes;
  }
  items.sort((a, b) => b.bytes - a.bytes);
  return { items, total };
}

function fmtBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}

function updateStorageIndicator() {
  const desc = document.getElementById('storageInfoDesc');
  if (!desc) return;
  try {
    const { total } = computeStorageUsage();
    const mb = total / 1024 / 1024;
    const pct = Math.round((mb / 5.0) * 100);
    desc.textContent = fmtBytes(total) + ' · ' + pct + '% of 5 MB';
    desc.style.color = pct >= 85 ? '#d96850' : (pct >= 60 ? '#d68a3a' : '');
  } catch (e) {
    desc.textContent = 'unknown';
  }
}

function showStorageInfo() {
  const { items, total } = computeStorageUsage();
  const mb = total / 1024 / 1024;
  const pct = Math.round((mb / 5.0) * 100);
  let msg = 'TOTAL: ' + fmtBytes(total) + ' (' + pct + '% of ~5 MB)\n\n';
  msg += 'BREAKDOWN:\n';
  items.forEach(it => {
    msg += '  ' + it.key + '\n    ' + fmtBytes(it.bytes) + '\n';
  });
  msg += '\nKEY MEANINGS:\n';
  msg += '  recon.os.pois — your pins\n';
  msg += '  recon.os.fog — revealed map cells\n';
  msg += '  recon.os.regions — region polygons\n';
  msg += '  recon.os.journal — visit/event log\n';
  msg += '  recon.os.trail — today\'s GPS trail\n';
  msg += '  recon.os.missions — objectives\n';
  msg += '  recon.os.prefs — settings\n';
  msg += '  recon.os.missionDraft — autosaved form\n';
  if (pct >= 85) {
    msg += '\nWARNING: STORAGE NEARLY FULL.\n';
    msg += 'Writes may start failing. Export a backup,\n';
    msg += 'then consider clearing fog (MENU > CLEAR FOG).';
  }
  alert(msg);
}

// Safe wrapper for localStorage.setItem — catches QuotaExceededError so we can
// surface the failure to the user as a visible toast instead of silently failing.
let _storageWarnedThisSession = false;
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    // Clear the failure flag on successful write so SYNC LED returns to acid
    try { sessionStorage.removeItem('recon.os.lastWriteFailed'); } catch(e){}
    try { if (typeof updateIndicatorStrip === 'function') updateIndicatorStrip(); } catch(e){}
    return true;
  } catch (err) {
    console.error('STORAGE WRITE FAILED:', key, err);
    // Best-effort: flag the failure so the SYNC LED shows warn until next success
    try { sessionStorage.setItem('recon.os.lastWriteFailed', '1'); } catch(e){}
    if (!_storageWarnedThisSession) {
      _storageWarnedThisSession = true;
      try {
        showToast('STORAGE FULL · WRITE FAILED');
      } catch (e) {}
    }
    try { if (typeof updateIndicatorStrip === 'function') updateIndicatorStrip(); } catch(e){}
    return false;
  }
}

function setupFogDensityChips() {
  const chips = document.querySelectorAll('#fogDensityRow .cat-chip');
  chips.forEach(chip => {
    const isActive = chip.dataset.fog === prefFogOpacity;
    chip.classList.toggle('active', isActive);
    const led = chip.querySelector('.led-indicator');
    if (led) led.classList.toggle('on', isActive);
    chip.onclick = () => {
      prefFogOpacity = chip.dataset.fog;
      chips.forEach(c => {
        const a = c.dataset.fog === prefFogOpacity;
        c.classList.toggle('active', a);
        const l = c.querySelector('.led-indicator');
        if (l) l.classList.toggle('on', a);
      });
      savePrefs();
      renderFog();
    };
  });
}

function showRegionsList() {
  if (regions.length === 0) {
    alert('No regions established yet. Move around with GPS active to establish your first region.');
    return;
  }
  const lines = regions.map((r, i) => {
    const isCurrent = r.id === currentRegionId;
    const star = isCurrent ? '★ ' : '  ';
    const boundary = (r.boundary || r.boundarySimplified) ? '✓ boundary' : '— no boundary';
    return `${star}${i+1}. ${r.name}\n   ${r.revealedSectors.length} sectors · ${boundary}`;
  });
  // Build a prompt: pick a region to fetch a missing boundary
  const missing = regions.filter(r => !r.boundary && !r.boundarySimplified);
  let extra = '';
  if (missing.length > 0) {
    extra = '\n\n' + missing.length + ' region(s) missing boundaries.\nUse FETCH ALL BOUNDARIES in settings.';
  }
  alert('ACTIVE REGIONS:\n\n' + lines.join('\n\n') +
        '\n\n(★ = current region)' + extra);
}

function exportData() {
  const data = {
    version: 7,
    exported: new Date().toISOString(),
    pois: pois,
    fog: [...revealedCells].map(cellIdToPacked),
    regions: regions,
    journal: journalEntries,
    trail: todayTrail,
    missions: missions,
    // Health module — added in v7. Each is independent; restore is per-key.
    fasts: fasts,
    weighins: weighins,
    meals: meals,
    workouts: workouts,
    healthTab: healthTab,
    // Flags so restoring a backup doesn't re-trigger one-time seeds
    healthSeeded: localStorage.getItem('recon.os.healthSeeded') === '1',
    supplyPOIsSeeded: localStorage.getItem('recon.os.supplyPOIsSeeded') === '1',
    prefs: {
      showTrail: showTrail,
      activeCategoryFilter: activeCategoryFilter,
      activeRegionFilter: activeRegionFilter,
      listSearchQuery: listSearchQuery,
      listSortMode: listSortMode,
      legendOpen: prefLegendOpen,
      fogOpacity: prefFogOpacity,
      activeObjectivesTab: activeObjectivesTab,
      objectivesSortMode: objectivesSortMode,
    },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'recon-os-backup-' + Date.now() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  const counts = pois.length + ' POIs · ' + revealedCells.size + ' fog cells · ' + regions.length + ' regions · ' + missions.length + ' objectives · ' +
    fasts.length + ' fasts · ' + workouts.length + ' workouts';
  showToast('FULL BACKUP DOWNLOADED · ' + counts);
}

function importData() {
  document.getElementById('importFile').click();
}
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.pois) {
        alert('Invalid backup file');
        return;
      }
      if (!confirm('Replace current data with backup?\n\n' +
                   data.pois.length + ' POIs\n' +
                   (data.fog ? data.fog.length : 0) + ' fog cells\n' +
                   (data.regions ? data.regions.length : 0) + ' regions\n' +
                   (data.journal ? data.journal.length : 0) + ' journal entries\n' +
                   (data.missions ? data.missions.length : 0) + ' objectives\n\n' +
                   'Your current data will be lost.')) {
        return;
      }
      pois = data.pois;
      savePOIs();
      if (data.fog) {
        // Handle both packed-integer format (current) and legacy string format
        revealedCells = new Set();
        for (const item of data.fog) {
          if (typeof item === 'number') {
            revealedCells.add(packedToCellId(item));
          } else if (typeof item === 'string') {
            revealedCells.add(item);
          }
        }
        saveFog();
        renderFog();
      }
      if (data.regions) {
        regions = data.regions;
        saveRegions();
      }
      if (data.journal) {
        journalEntries = data.journal;
        saveJournal();
      }
      if (data.trail) {
        todayTrail = data.trail;
        saveTrail();
        renderTrail();
      }
      if (data.missions) {
        missions = data.missions;
        saveMissions();
        renderMissionMarkers();
      }
      // Health module restore — added in v7. Each is independent; missing
      // keys mean "don't touch this part of the current state."
      if (Array.isArray(data.fasts))    { fasts = data.fasts;       saveFasts(); }
      if (Array.isArray(data.weighins)) { weighins = data.weighins; saveWeighins(); }
      if (Array.isArray(data.meals))    { meals = data.meals;       saveMeals(); }
      if (Array.isArray(data.workouts)) { workouts = data.workouts; saveWorkouts(); }
      if (typeof data.healthTab === 'string') {
        healthTab = data.healthTab;
        try { localStorage.setItem('recon.os.healthTab', healthTab); } catch (e) {}
      }
      // Restore seed flags too — without these, the seed functions would
      // re-import default data on top of the user's restored backup.
      if (data.healthSeeded) {
        try { localStorage.setItem('recon.os.healthSeeded', '1'); } catch (e) {}
      }
      if (data.supplyPOIsSeeded) {
        try { localStorage.setItem('recon.os.supplyPOIsSeeded', '1'); } catch (e) {}
      }
      updateHealthBadge();
      if (data.prefs) {
        if (typeof data.prefs.showTrail === 'boolean') showTrail = data.prefs.showTrail;
        if (typeof data.prefs.activeCategoryFilter === 'string') activeCategoryFilter = data.prefs.activeCategoryFilter;
        if (typeof data.prefs.activeRegionFilter === 'string') activeRegionFilter = data.prefs.activeRegionFilter;
        if (typeof data.prefs.listSearchQuery === 'string') listSearchQuery = data.prefs.listSearchQuery;
        if (typeof data.prefs.listSortMode === 'string') listSortMode = data.prefs.listSortMode;
        if (typeof data.prefs.legendOpen === 'boolean') prefLegendOpen = data.prefs.legendOpen;
        if (typeof data.prefs.fogOpacity === 'string' && FOG_OPACITY_VALUES[data.prefs.fogOpacity]) {
          prefFogOpacity = data.prefs.fogOpacity;
        }
        if (typeof data.prefs.activeObjectivesTab === 'string') activeObjectivesTab = data.prefs.activeObjectivesTab;
        if (typeof data.prefs.objectivesSortMode === 'string') objectivesSortMode = data.prefs.objectivesSortMode;
        savePrefs();
      }
      renderAllMarkers();
      updatePendingCount();
      closeSheet();
      showToast('IMPORT COMPLETE · ' + pois.length + ' POIs · ' + missions.length + ' objectives');
    } catch (err) {
      alert('Could not parse file: ' + err.message);
    }
  };
  reader.readAsText(file);
});

function clearFog() {
  if (!confirm('Clear all revealed terrain?\n\nFog will reset to fully cover the map. Your POIs are not affected.')) return;
  revealedCells.clear();
  localStorage.removeItem('recon.os.fog');
  lastSamplePos = null;
  renderFog();
  showToast('FOG CLEARED');
  closeSheet();
}

// Diagnostic — read raw storage for all health keys and dump to the user.
// Read-only; touches nothing. Use this first before reseed to confirm
// what's actually in storage vs what the UI is showing.
function diagnoseHealth() {
  const keys = [
    'recon.os.fasts',
    'recon.os.weighins',
    'recon.os.meals',
    'recon.os.workouts',
    'recon.os.healthSeeded',
    'recon.os.supplyPOIsSeeded',
    'recon.os.healthTab',
    'recon.os.liveWorkout',
  ];
  const lines = [];
  keys.forEach(k => {
    let raw;
    try { raw = localStorage.getItem(k); } catch (e) { raw = '<error: ' + e.message + '>'; }
    if (raw == null) {
      lines.push(k + ': (null/missing)');
    } else if (raw === '') {
      lines.push(k + ': (empty string)');
    } else if (raw === '[]') {
      lines.push(k + ': [] (empty array)');
    } else {
      // For arrays, show count and first/last record
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          lines.push(k + ': ' + parsed.length + ' record(s)');
          if (parsed.length > 0) {
            lines.push('  first: ' + JSON.stringify(parsed[0]).slice(0, 100));
            lines.push('  last:  ' + JSON.stringify(parsed[parsed.length - 1]).slice(0, 100));
          }
        } else {
          lines.push(k + ': ' + JSON.stringify(parsed).slice(0, 80));
        }
      } catch (e) {
        lines.push(k + ': <unparseable: ' + raw.slice(0, 60) + '...>');
      }
    }
  });
  // Also show in-memory state for comparison
  lines.push('---');
  lines.push('IN-MEMORY:');
  lines.push('  fasts.length = ' + fasts.length);
  lines.push('  weighins.length = ' + weighins.length);
  lines.push('  workouts.length = ' + workouts.length);
  alert(lines.join('\n'));
}

// Force re-run of the health seed even if the seed flag is set. Used to
// recover when fasting data got wiped but the flag is still in storage
// (which is the normal failure mode — flag stays, data goes).
// PRESERVES any existing fast/weighin records by merging instead of overwriting.
function reseedHealth() {
  if (!window.confirm(
    'Re-seed health data?\n\n' +
    'This will:\n' +
    '• ADD the 32 historical fasts (Mar-May 2026) if they are missing\n' +
    '• ADD the 7 weigh-in milestones if missing\n' +
    '• Skip any record whose ID already exists (no duplicates)\n\n' +
    'Your existing records will be preserved.\n\n' +
    'Continue?'
  )) return;

  // Remove the gate so seedHealthData will run
  try { localStorage.removeItem('recon.os.healthSeeded'); } catch (e) {}

  // Stash current data — seedHealthData unconditionally overwrites fasts and
  // weighins arrays, so we need to merge after.
  const existingFasts = [...fasts];
  const existingWeighins = [...weighins];
  const existingFastIds = new Set(existingFasts.map(f => f.id));
  const existingWeighinIds = new Set(existingWeighins.map(w => w.id));

  // Run the seed (this REPLACES fasts and weighins with the seed data)
  seedHealthData();

  // Merge: keep all seed records, then add back any pre-existing records
  // whose IDs weren't in the seed.
  const seedFastIds = new Set(fasts.map(f => f.id));
  const seedWeighinIds = new Set(weighins.map(w => w.id));
  existingFasts.forEach(f => {
    if (!seedFastIds.has(f.id)) fasts.push(f);
  });
  existingWeighins.forEach(w => {
    if (!seedWeighinIds.has(w.id)) weighins.push(w);
  });

  // Sort fasts by startTs to keep history clean
  fasts.sort((a, b) => a.startTs - b.startTs);
  weighins.sort((a, b) => a.ts - b.ts);

  saveFasts();
  saveWeighins();
  // Force-set the seeded flag so it doesn't re-trigger again
  try { localStorage.setItem('recon.os.healthSeeded', '1'); } catch (e) {}

  // Re-render whatever's open
  if (typeof renderFastTab === 'function') renderFastTab();
  updateHealthBadge();
  showToast('RESEED COMPLETE · ' + fasts.length + ' FASTS · ' + weighins.length + ' WEIGH-INS');
}

function resetAllPOIs() {
  if (!confirm('DELETE ALL ' + pois.length + ' POIs?\n\nThis cannot be undone.')) return;
  if (!confirm('Are you absolutely sure?')) return;
  pois = [];
  savePOIs();
  renderAllMarkers();
  updatePendingCount();
  showToast('ALL POIs DELETED');
  closeSheet();
}

function hardReset() {
  if (!confirm('FULL RESET — wipe POIs, fog, regions, journal, trail, prefs, everything?\n\nThis cannot be undone.')) return;
  if (!confirm('Last chance. Erase everything?')) return;
  localStorage.removeItem('recon.os.pois');
  localStorage.removeItem('recon.os.fog');
  localStorage.removeItem('recon.os.regions');
  localStorage.removeItem('recon.os.journal');
  localStorage.removeItem('recon.os.trail');
  localStorage.removeItem('recon.os.prefs');
  location.reload();
}

function distanceLabel(p) {
  if (!userPos) return '— MI';
  const d = haversine(userPos.lat, userPos.lng, p.lat, p.lng);
  if (d < 0.1) return Math.round(d * 5280) + 'FT';
  return d.toFixed(1) + 'MI';
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3959; // miles
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
  return (d.getMonth()+1) + '/' + d.getDate();
}

// ===== SEARCH SHEET (address / coordinate lookup via Nominatim) =====
let searchDebounceTimer = null;
let searchActiveQuery = null;  // tracks latest query so stale responses are ignored

function openSearchSheet() {
  haptic('tap');
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('searchSheet').classList.add('open');
  const input = document.getElementById('searchInput');
  input.value = '';
  document.getElementById('searchResults').innerHTML =
    '<div class="empty-state"><div class="big">READY</div>Enter an address or coordinates to find a location.</div>';
  setSearchHint('Type to search · "29.74, -94.99" for coordinates', 'idle');
  // Focus the input with a small delay so iOS doesn't fight the sheet animation
  setTimeout(() => { input.focus(); }, 350);
  input.oninput = onSearchInput;
}

function setSearchHint(text, mode) {
  const el = document.getElementById('searchHint');
  if (!el) return;
  el.textContent = text;
  el.className = 'search-hint' + (mode === 'error' ? ' error' : mode === 'busy' ? ' busy' : '');
}

// Returns [lat, lng] if input parses as coordinates, else null.
// Accepts formats like "29.74, -94.99" or "29.74 -94.99" or "29.74,-94.99".
function parseCoordinates(input) {
  const m = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function onSearchInput() {
  const q = document.getElementById('searchInput').value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

  if (!q) {
    document.getElementById('searchResults').innerHTML =
      '<div class="empty-state"><div class="big">READY</div>Enter an address or coordinates to find a location.</div>';
    setSearchHint('Type to search · "29.74, -94.99" for coordinates', 'idle');
    return;
  }

  // Coordinate shortcut — no network call needed
  const coords = parseCoordinates(q);
  if (coords) {
    renderCoordinateResult(coords[0], coords[1]);
    setSearchHint(`Coordinates parsed · ${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}`, 'idle');
    return;
  }

  if (q.length < 3) {
    setSearchHint('Keep typing · ' + q.length + '/3 chars minimum', 'idle');
    return;
  }

  // Debounce 450ms so we don't hammer Nominatim while user types
  setSearchHint('Searching...', 'busy');
  searchDebounceTimer = setTimeout(() => doSearch(q), 450);
}

async function doSearch(query) {
  searchActiveQuery = query;
  const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
              encodeURIComponent(query) + '&limit=8&addressdetails=1';
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (searchActiveQuery !== query) return;  // a newer query already started
    if (!res.ok) {
      setSearchHint('Search failed · ' + res.status, 'error');
      return;
    }
    const data = await res.json();
    if (searchActiveQuery !== query) return;
    if (!data.length) {
      document.getElementById('searchResults').innerHTML =
        '<div class="empty-state"><div class="big">NO MATCHES</div>Try a different query or use coordinates.</div>';
      setSearchHint('0 results for "' + query + '"', 'idle');
      return;
    }
    renderSearchResults(data);
    setSearchHint(data.length + ' result' + (data.length === 1 ? '' : 's'), 'idle');
  } catch (e) {
    if (searchActiveQuery !== query) return;
    setSearchHint('Network error · check connection', 'error');
  }
}

function renderSearchResults(results) {
  const body = document.getElementById('searchResults');
  body.innerHTML = '';
  results.forEach(r => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    const name = r.display_name.split(',')[0].trim();
    const addr = r.display_name;
    let metaParts = [];
    if (userPos) {
      const dM = metersBetween(userPos.lat, userPos.lng, lat, lng);
      const dFt = dM * 3.28084;
      metaParts.push(dFt < 528 ? Math.round(dFt) + ' FT' : (dM / 1609.34).toFixed(1) + ' MI');
    }
    metaParts.push(lat.toFixed(4) + ', ' + lng.toFixed(4));
    const row = document.createElement('div');
    row.className = 'search-result';
    row.innerHTML = `
      <div class="name">${escapeHtml(name)}</div>
      <div class="addr">${escapeHtml(addr)}</div>
      <div class="meta">${metaParts.join(' · ')}</div>
    `;
    row.onclick = () => previewAndDropFromSearch(lat, lng, name);
    body.appendChild(row);
  });
}

function renderCoordinateResult(lat, lng) {
  const body = document.getElementById('searchResults');
  let distHTML = '';
  if (userPos) {
    const dM = metersBetween(userPos.lat, userPos.lng, lat, lng);
    const dFt = dM * 3.28084;
    distHTML = dFt < 528 ? Math.round(dFt) + ' FT FROM YOU' : (dM / 1609.34).toFixed(1) + ' MI FROM YOU';
  }
  body.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'search-result';
  row.innerHTML = `
    <div class="name">COORDINATES</div>
    <div class="addr">${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
    <div class="meta">${distHTML || 'Tap to drop pin'}</div>
  `;
  row.onclick = () => previewAndDropFromSearch(lat, lng, '');
  body.appendChild(row);
}

function previewAndDropFromSearch(lat, lng, suggestedName) {
  closeSheet();
  // Center map at the location and immediately drop a pending pin
  setTimeout(() => {
    map.setView([lat, lng], 17, { animate: true });
    dropPinAt(lat, lng);
    // If we have a suggested name from search, prefill it when the user
    // taps the new pin (the pin is the most recent in pois)
    if (suggestedName && pois.length > 0) {
      const newPoi = pois[pois.length - 1];
      newPoi.name = suggestedName;
      savePOIs();
    }
    showToast('PIN DROPPED · TAP TO CLASSIFY');
  }, 350);
}


// ============================================================================
// ===== MISSIONS / OBJECTIVES ================================================
// ============================================================================

// Marker color palette (electric blue / urgent red)
const MISSION_COLORS = {
  normal: {
    light: '#d4f8ff',
    mid:   '#00e5ff',
    dark:  '#0a3a4a',
    stroke:'#050a14',
  },
  urgent: {
    light: '#ffd0e0',
    mid:   '#ff4470',
    dark:  '#4a081e',
    stroke:'#180408',
  },
};

// ---------- OBJECTIVES sheet open/close/tabs ----------

function openObjectivesSheet() {
  haptic('tap');
  document.getElementById('objectivesSearch').value = objectivesSearchQuery;
  document.getElementById('objectivesSort').value = objectivesSortMode;
  document.getElementById('objQuickAddInput').value = '';
  switchObjectivesTab(activeObjectivesTab);
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('objectivesSheet').classList.add('open');
}

function switchObjectivesTab(tabId) {
  activeObjectivesTab = tabId;
  document.querySelectorAll('#objectivesSheet .obj-tab').forEach(t => {
    const active = t.dataset.objTab === tabId;
    t.classList.toggle('active', active);
    const led = t.querySelector('.tab-led');
    if (led) {} // styled via .obj-tab.active .tab-led in CSS
  });
  renderObjectivesList();
  savePrefs();
}

function onObjectivesSortChange() {
  objectivesSortMode = document.getElementById('objectivesSort').value;
  savePrefs();
  renderObjectivesList();
}

// ---------- Filtering & sorting ----------

function getFilteredMissions() {
  let list = missions.slice();

  // Tab filter
  if (activeObjectivesTab === 'active')   list = list.filter(m => m.status === 'active');
  if (activeObjectivesTab === 'complete') list = list.filter(m => m.status === 'complete');
  // 'all' = no status filter

  // Search filter
  const q = (document.getElementById('objectivesSearch')?.value || '').trim().toLowerCase();
  objectivesSearchQuery = q;
  if (q) {
    list = list.filter(m =>
      (m.title || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q)
    );
  }

  // Sort
  const priorityRank = { urgent: 0, normal: 1 };
  list.sort((a, b) => {
    switch (objectivesSortMode) {
      case 'deadline': {
        // missions without deadline go to end
        const ad = a.deadline ?? Infinity;
        const bd = b.deadline ?? Infinity;
        if (ad !== bd) return ad - bd;
        return b.created - a.created;
      }
      case 'priority': {
        const dp = priorityRank[a.priority] - priorityRank[b.priority];
        if (dp !== 0) return dp;
        return b.created - a.created;
      }
      case 'distance': {
        if (!userPos) return b.created - a.created;
        const aHas = (a.lat != null && a.lng != null);
        const bHas = (b.lat != null && b.lng != null);
        if (!aHas && !bHas) return b.created - a.created;
        if (!aHas) return 1;
        if (!bHas) return -1;
        return metersBetween(userPos.lat, userPos.lng, a.lat, a.lng) -
               metersBetween(userPos.lat, userPos.lng, b.lat, b.lng);
      }
      case 'created':
        return b.created - a.created;
      case 'smart':
      default: {
        // Urgent first, then by nearest deadline, then newest
        const dp = priorityRank[a.priority] - priorityRank[b.priority];
        if (dp !== 0) return dp;
        const ad = a.deadline ?? Infinity;
        const bd = b.deadline ?? Infinity;
        if (ad !== bd) return ad - bd;
        return b.created - a.created;
      }
    }
  });
  return list;
}

// ---------- Rendering ----------

function renderObjectivesList() {
  const body = document.getElementById('objectivesBody');
  if (!body) return;
  const list = getFilteredMissions();

  // Update tab counts (always show totals regardless of search/sort)
  const activeTotal = missions.filter(m => m.status === 'active').length;
  const completeTotal = missions.filter(m => m.status === 'complete').length;
  document.getElementById('objActiveCount').textContent = activeTotal;
  document.getElementById('objCompleteCount').textContent = completeTotal;
  document.getElementById('objAllCount').textContent = missions.length;

  // Render
  body.innerHTML = '';
  if (list.length === 0) {
    let msg;
    if (missions.length === 0) {
      msg = '<div class="empty-state"><div class="big">NO OBJECTIVES</div>Add your first task with QUICK ADD above.</div>';
    } else if (objectivesSearchQuery) {
      msg = '<div class="empty-state"><div class="big">NO MATCHES</div>No objectives match your search.</div>';
    } else if (activeObjectivesTab === 'active') {
      msg = '<div class="empty-state"><div class="big">ALL CLEAR</div>No active objectives. Nicely done.</div>';
    } else if (activeObjectivesTab === 'complete') {
      msg = '<div class="empty-state"><div class="big">NOTHING COMPLETED</div>Finished missions will show here.</div>';
    } else {
      msg = '<div class="empty-state"><div class="big">EMPTY</div>No objectives match the current view.</div>';
    }
    body.innerHTML = msg;
    return;
  }
  list.forEach(m => body.appendChild(buildMissionCard(m)));
}

function buildMissionCard(m) {
  const card = document.createElement('div');
  card.className = 'mission-card';
  if (m.priority === 'urgent' && m.status === 'active') card.classList.add('urgent');
  if (m.status === 'complete') card.classList.add('complete');

  // Card click opens detail/edit form
  card.onclick = (ev) => {
    if (ev.target.closest('.mission-checkbox')) return;  // checkbox handles its own clicks
    openMissionForm(m.id);
  };

  // Status flag chip
  let flagClass, flagText;
  if (m.status === 'complete') { flagClass = 'complete'; flagText = '✓ DONE'; }
  else if (m.priority === 'urgent') { flagClass = 'urgent'; flagText = '▶ URGENT'; }
  else { flagClass = 'active'; flagText = '▶ ACTIVE'; }

  // Build the meta row
  const metaParts = [];
  if (m.deadline) {
    const now = Date.now();
    const diff = m.deadline - now;
    const overdue = diff < 0;
    let label;
    if (m.status === 'complete') {
      label = 'DUE ' + formatDeadlineAbsolute(m.deadline);
    } else if (overdue) {
      label = 'OVERDUE · ' + formatDuration(-diff);
    } else {
      label = 'DUE IN ' + formatDuration(diff);
    }
    metaParts.push(`<div class="chip deadline${overdue && m.status==='active' ? ' deadline-overdue' : ''}">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="6" cy="6" r="4.5"/><path d="M6 3.5v3l2 1"/></svg>
      ${label}
    </div>`);
  }
  if (m.poiId) {
    const linkedPoi = pois.find(p => p.id === m.poiId);
    const poiName = linkedPoi ? (linkedPoi.name || ('POI-' + linkedPoi.id.slice(-6))) : 'MISSING POI';
    metaParts.push(`<div class="chip poi">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 1L6 11M2 6l4-4 4 4"/></svg>
      POI: ${escapeHtml(poiName)}
    </div>`);
  }
  if (m.lat != null && m.lng != null && userPos && m.status === 'active') {
    const distM = metersBetween(userPos.lat, userPos.lng, m.lat, m.lng);
    const distFt = distM * 3.28084;
    const distLabel = distFt < 528 ? Math.round(distFt) + ' FT' : (distM / 1609.34).toFixed(1) + ' MI';
    const brg = bearingDeg(userPos.lat, userPos.lng, m.lat, m.lng);
    const cardinal = bearingToCardinal(brg);
    metaParts.push(`<div class="chip distance">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 1l3 5-3 5-3-5z"/></svg>
      ${distLabel} · ${cardinal}
    </div>`);
  }
  if (m.status === 'complete' && m.completed) {
    metaParts.push(`<div class="chip">
      <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 6.5l2.2 2L9 4.5"/></svg>
      COMPLETED ${formatRelativeDate(m.completed)}
    </div>`);
  }

  card.innerHTML = `
    <div class="mission-header">
      <div class="mission-checkbox" onclick="toggleMissionComplete(event, '${m.id}')">
        <svg viewBox="0 0 12 12" fill="none" stroke="#6a9a5a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6.5l2.2 2L9 4.5"/>
        </svg>
      </div>
      <div class="mission-flag ${flagClass}">${flagText}</div>
      <div class="mission-title-wrap">
        <div class="mission-title">${escapeHtml(m.title)}</div>
        ${m.notes ? `<div class="mission-notes">${escapeHtml(m.notes)}</div>` : ''}
      </div>
    </div>
    ${metaParts.length ? `<div class="mission-meta">${metaParts.join('')}</div>` : ''}
  `;
  return card;
}

// Convert a millisecond duration into "2H 14M" / "4D" / "3W" form
function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return totalMin + 'M';
  const totalHr = Math.floor(totalMin / 60);
  if (totalHr < 24) return totalHr + 'H ' + (totalMin % 60) + 'M';
  const totalDay = Math.floor(totalHr / 24);
  if (totalDay < 14) return totalDay + 'D ' + (totalHr % 24) + 'H';
  return totalDay + 'D';
}
function formatRelativeDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  const diff = today - d;
  const days = Math.floor(diff / (24 * 3600 * 1000));
  if (days < 7) return days + ' DAYS AGO';
  if (days < 30) return Math.floor(days / 7) + ' WEEKS AGO';
  return Math.floor(days / 30) + ' MONTHS AGO';
}
function formatDeadlineAbsolute(ts) {
  const d = new Date(ts);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return d.getDate() + ' ' + months[d.getMonth()];
}

// ---------- Quick-add ----------

function commitQuickAddMission() {
  const input = document.getElementById('objQuickAddInput');
  const title = input.value.trim();
  if (!title) return;
  const m = {
    id: 'MSN-' + Date.now(),
    title: title,
    notes: '',
    priority: 'normal',
    status: 'active',
    created: Date.now(),
    completed: null,
    lat: null,
    lng: null,
    poiId: null,
    deadline: null,
  };
  missions.push(m);
  saveMissions();
  logEvent('mission-create', m.id, 'Created: ' + title);
  input.value = '';
  renderObjectivesList();
  haptic('pop');
}
// Submit quick-add on Enter
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'objQuickAddInput') {
    e.preventDefault();
    commitQuickAddMission();
  }
});

// ---------- Mission form ----------

let _missionFormPriority = 'normal';
let _missionFormLocMode = 'none';
let _missionFormLat = null;
let _missionFormLng = null;
let _missionFormPoiId = null;

function openMissionForm(missionId) {
  editingMissionId = missionId || null;
  const m = missionId ? missions.find(x => x.id === missionId) : null;

  // Restore form-draft autosave if creating new and a draft exists
  const draft = missionId ? null : loadMissionDraft();

  document.getElementById('missionFormTitle').textContent = m ? 'EDIT OBJECTIVE' : 'NEW OBJECTIVE';
  document.getElementById('missionSaveLabel').textContent = m ? 'SAVE' : 'CREATE';
  document.getElementById('missionDeleteBtn').style.display = m ? 'flex' : 'none';

  // Title
  document.getElementById('missionTitle').value = m ? m.title : (draft?.title || '');
  // Notes
  document.getElementById('missionNotes').value = m ? (m.notes || '') : (draft?.notes || '');

  // Priority
  _missionFormPriority = m ? (m.priority || 'normal') : (draft?.priority || 'normal');
  applyMissionPriorityUI();

  // Location
  if (m) {
    if (m.poiId) {
      _missionFormLocMode = 'poi'; _missionFormPoiId = m.poiId;
      const p = pois.find(p => p.id === m.poiId);
      _missionFormLat = p ? p.lat : null;
      _missionFormLng = p ? p.lng : null;
    } else if (m.lat != null && m.lng != null) {
      _missionFormLocMode = 'map'; _missionFormLat = m.lat; _missionFormLng = m.lng;
      _missionFormPoiId = null;
    } else {
      _missionFormLocMode = 'none';
      _missionFormLat = null; _missionFormLng = null; _missionFormPoiId = null;
    }
  } else if (draft) {
    _missionFormLocMode = draft.locMode || 'none';
    _missionFormLat = draft.lat; _missionFormLng = draft.lng;
    _missionFormPoiId = draft.poiId;
  } else {
    _missionFormLocMode = 'none';
    _missionFormLat = null; _missionFormLng = null; _missionFormPoiId = null;
  }
  applyMissionLocUI();

  // Deadline
  const dlInput = document.getElementById('missionDeadline');
  if (m && m.deadline) {
    dlInput.value = toDatetimeLocal(new Date(m.deadline));
  } else if (draft?.deadline) {
    dlInput.value = draft.deadline;
  } else {
    dlInput.value = '';
  }

  // Wire autosave
  setupMissionFormAutosave();

  // Open sheet
  closeAllSheets();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('missionFormSheet').classList.add('open');
}

function toDatetimeLocal(d) {
  // datetime-local input wants 'YYYY-MM-DDTHH:MM' in LOCAL time
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
         'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function selectMissionPriority(p) {
  _missionFormPriority = p;
  applyMissionPriorityUI();
  saveMissionDraft();
}
function applyMissionPriorityUI() {
  document.querySelectorAll('#missionPriorityRow .cat-chip').forEach(chip => {
    const a = chip.dataset.priority === _missionFormPriority;
    chip.classList.toggle('active', a);
    const led = chip.querySelector('.led-indicator');
    if (led) led.classList.toggle('on', a);
  });
}

function selectMissionLocMode(mode) {
  // Special modes that need extra interaction
  if (mode === 'here') {
    if (!userPos) {
      showMissionLocStatus('GPS unavailable — try later', 'error');
      return;
    }
    _missionFormLocMode = 'map';  // store as plain coords (same shape)
    _missionFormLat = userPos.lat;
    _missionFormLng = userPos.lng;
    _missionFormPoiId = null;
    applyMissionLocUI();
    showMissionLocStatus(`Set at current position (${userPos.lat.toFixed(4)}, ${userPos.lng.toFixed(4)})`, 'ok');
    saveMissionDraft();
    return;
  }
  if (mode === 'poi') {
    // Choose a POI by id — simplest UX: prompt with the POI list
    pickPoiForMission();
    return;
  }
  if (mode === 'map') {
    startMissionMapPick();
    return;
  }
  // none
  _missionFormLocMode = 'none';
  _missionFormLat = null;
  _missionFormLng = null;
  _missionFormPoiId = null;
  applyMissionLocUI();
  hideMissionLocStatus();
  saveMissionDraft();
}
function applyMissionLocUI() {
  // Map "stored shape" → UI mode (none, here-style, poi, map)
  let uiMode;
  if (_missionFormPoiId) uiMode = 'poi';
  else if (_missionFormLat != null && _missionFormLng != null) uiMode = 'map';
  else uiMode = 'none';

  document.querySelectorAll('#missionLocRow .loc-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.loc === uiMode);
  });

  if (uiMode === 'poi') {
    const p = pois.find(p => p.id === _missionFormPoiId);
    if (p) showMissionLocStatus('Linked to POI: ' + (p.name || ('POI-' + p.id.slice(-6))), 'ok');
    else showMissionLocStatus('Linked POI not found', 'error');
  } else if (uiMode === 'map') {
    showMissionLocStatus(`Coords: ${_missionFormLat.toFixed(4)}, ${_missionFormLng.toFixed(4)}`, 'ok');
  } else {
    hideMissionLocStatus();
  }
}
function showMissionLocStatus(text, kind) {
  const el = document.getElementById('missionLocStatus');
  el.textContent = text;
  el.style.display = 'block';
  el.style.color = (kind === 'error') ? '#d96850' : '#d68a3a';
}
function hideMissionLocStatus() {
  const el = document.getElementById('missionLocStatus');
  el.style.display = 'none';
  el.textContent = '';
}

// Simple POI picker: classified POIs sorted by distance
function pickPoiForMission() {
  const classified = pois.filter(p => p.category);
  if (classified.length === 0) {
    alert('No classified POIs yet. Drop and classify a POI first, or use PICK ON MAP / DROP AT HERE.');
    return;
  }
  const sorted = classified.slice().sort((a, b) => {
    if (!userPos) return 0;
    return metersBetween(userPos.lat, userPos.lng, a.lat, a.lng) -
           metersBetween(userPos.lat, userPos.lng, b.lat, b.lng);
  });
  const lines = sorted.slice(0, 12).map((p, i) => {
    const name = p.name || ('POI-' + p.id.slice(-6));
    let dist = '';
    if (userPos) {
      const dM = metersBetween(userPos.lat, userPos.lng, p.lat, p.lng);
      const dFt = dM * 3.28084;
      dist = dFt < 528 ? ' (' + Math.round(dFt) + ' ft)' : ' (' + (dM/1609.34).toFixed(1) + ' mi)';
    }
    return (i + 1) + '. ' + name + dist;
  });
  const input = prompt('Link to which POI? Enter number 1-' + sorted.length + ':\n\n' + lines.join('\n'));
  if (!input) return;
  const idx = parseInt(input.trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= sorted.length) return;
  const chosen = sorted[idx];
  _missionFormPoiId = chosen.id;
  _missionFormLat = chosen.lat;
  _missionFormLng = chosen.lng;
  applyMissionLocUI();
  saveMissionDraft();
}

// ---------- Map-pick mode ----------

function startMissionMapPick() {
  // Save the current in-progress form so we can restore it after the user picks
  pendingMissionDraft = readMissionFormState();
  saveMissionDraft();
  missionPickMode = true;
  // Hide form, show pick bar
  closeAllSheets();
  document.getElementById('missionPickBar').classList.add('visible');
  // Recenter map for picking
  if (userPos) map.setView([userPos.lat, userPos.lng], Math.max(map.getZoom(), 16), { animate: true });
  // Show the existing reposition crosshair (it's a screen-center crosshair)
  document.getElementById('repositionCrosshair').classList.add('visible');
  showToast('PAN MAP TO PICK A LOCATION');
}

function confirmMissionMapPick() {
  if (!missionPickMode) return;
  const c = map.getCenter();
  _missionFormLat = c.lat;
  _missionFormLng = c.lng;
  _missionFormPoiId = null;
  endMissionMapPick();
  openMissionFormResumed();
}

function cancelMissionMapPick() {
  if (!missionPickMode) return;
  endMissionMapPick();
  openMissionFormResumed();
}

function endMissionMapPick() {
  missionPickMode = false;
  document.getElementById('missionPickBar').classList.remove('visible');
  document.getElementById('repositionCrosshair').classList.remove('visible');
}

function openMissionFormResumed() {
  // Reopen mission form using the saved draft + new coords (or no coords if cancelled)
  openMissionForm(editingMissionId);  // openMissionForm re-reads from draft for new missions
}

// ---------- Save / Delete ----------

function readMissionFormState() {
  return {
    title: document.getElementById('missionTitle').value.trim(),
    notes: document.getElementById('missionNotes').value.trim(),
    priority: _missionFormPriority,
    locMode: _missionFormLocMode,
    lat: _missionFormLat,
    lng: _missionFormLng,
    poiId: _missionFormPoiId,
    deadline: document.getElementById('missionDeadline').value,
  };
}

function saveMissionForm() {
  const title = document.getElementById('missionTitle').value.trim();
  if (!title) {
    alert('Title is required.');
    return;
  }
  const notes = document.getElementById('missionNotes').value.trim();
  const deadlineRaw = document.getElementById('missionDeadline').value;
  const deadline = deadlineRaw ? new Date(deadlineRaw).getTime() : null;

  if (editingMissionId) {
    // EDIT existing
    const m = missions.find(x => x.id === editingMissionId);
    if (!m) { cancelMissionForm(); return; }
    const before = JSON.parse(JSON.stringify(m));
    m.title = title;
    m.notes = notes;
    m.priority = _missionFormPriority;
    m.lat = _missionFormLat;
    m.lng = _missionFormLng;
    m.poiId = _missionFormPoiId;
    m.deadline = deadline;
    saveMissions();
    logEvent('mission-edit', m.id, 'Edited: ' + title);
    pushUndo('Restore previous values for "' + title + '"', () => {
      const x = missions.find(x => x.id === editingMissionId);
      if (!x) return;
      Object.assign(x, before);
      saveMissions();
      renderObjectivesList();
      renderMissionMarkers();
    });
    showToast('OBJECTIVE SAVED');
  } else {
    // NEW
    const m = {
      id: 'MSN-' + Date.now(),
      title: title,
      notes: notes,
      priority: _missionFormPriority,
      status: 'active',
      created: Date.now(),
      completed: null,
      lat: _missionFormLat,
      lng: _missionFormLng,
      poiId: _missionFormPoiId,
      deadline: deadline,
    };
    missions.push(m);
    saveMissions();
    logEvent('mission-create', m.id, 'Created: ' + title);
    pushUndo('Delete "' + title + '"', () => {
      missions = missions.filter(x => x.id !== m.id);
      saveMissions();
      renderObjectivesList();
      renderMissionMarkers();
    });
    showToast('OBJECTIVE CREATED');
  }
  clearMissionDraft();
  editingMissionId = null;
  closeSheet();
  renderMissionMarkers();
  // If objectives sheet was previously open, reopen it
  setTimeout(() => openObjectivesSheet(), 60);
}

function cancelMissionForm() {
  editingMissionId = null;
  clearMissionDraft();
  closeSheet();
  setTimeout(() => openObjectivesSheet(), 60);
}

function deleteMissionFromForm() {
  if (!editingMissionId) return;
  const m = missions.find(x => x.id === editingMissionId);
  if (!m) return;
  if (!confirm('Delete "' + m.title + '"?')) return;
  const beforeSnapshot = JSON.parse(JSON.stringify(m));
  missions = missions.filter(x => x.id !== editingMissionId);
  saveMissions();
  logEvent('mission-delete', m.id, 'Deleted: ' + m.title);
  pushUndo('Restore "' + m.title + '"', () => {
    missions.push(beforeSnapshot);
    saveMissions();
    renderObjectivesList();
    renderMissionMarkers();
  });
  showToast('OBJECTIVE DELETED');
  editingMissionId = null;
  clearMissionDraft();
  closeSheet();
  renderMissionMarkers();
  setTimeout(() => openObjectivesSheet(), 60);
}

// ---------- Toggle complete (checkbox on card) ----------

function toggleMissionComplete(ev, missionId) {
  if (ev) { ev.stopPropagation(); }
  const m = missions.find(x => x.id === missionId);
  if (!m) return;
  const wasComplete = m.status === 'complete';
  if (wasComplete) {
    m.status = 'active';
    m.completed = null;
    logEvent('mission-reopen', m.id, 'Reopened: ' + m.title);
    showToast('REOPENED');
  } else {
    m.status = 'complete';
    m.completed = Date.now();
    logEvent('mission-complete', m.id, 'Completed: ' + m.title);
    showToast('OBJECTIVE COMPLETE');
    haptic('confirm');
  }
  saveMissions();
  pushUndo(wasComplete ? 'Mark "' + m.title + '" complete again' : 'Reopen "' + m.title + '"', () => {
    const x = missions.find(x => x.id === missionId);
    if (!x) return;
    if (wasComplete) { x.status = 'complete'; x.completed = Date.now(); }
    else { x.status = 'active'; x.completed = null; }
    saveMissions();
    renderObjectivesList();
    renderMissionMarkers();
  });
  renderObjectivesList();
  renderMissionMarkers();
}

// ---------- Form draft autosave (survives accidental close) ----------

function setupMissionFormAutosave() {
  ['missionTitle', 'missionNotes', 'missionDeadline'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.oninput = saveMissionDraft;
  });
}
function saveMissionDraft() {
  if (editingMissionId) return;  // don't autosave when editing existing
  safeSet(MISSION_DRAFT_KEY, JSON.stringify(readMissionFormState()));
}
function loadMissionDraft() {
  try {
    const raw = localStorage.getItem(MISSION_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearMissionDraft() {
  localStorage.removeItem(MISSION_DRAFT_KEY);
}

// ---------- Map markers (diamond reticle, blue/red) ----------

function makeMissionIcon(priority, sizePx) {
  const size = sizePx || 32;
  const c = MISSION_COLORS[priority] || MISSION_COLORS.normal;
  const pulseClass = priority === 'urgent' ? 'mission-marker-pulse-urgent' : 'mission-marker-pulse';
  const gradId = 'msn-' + priority + '-' + Math.floor(Math.random() * 1e9);
  // Inset reticle: outer diamond filled, inner diamond hollow, center dot
  const svg = `
    <svg viewBox="-22 -22 44 44" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" class="${pulseClass}">
      <defs>
        <radialGradient id="${gradId}" cx="35%" cy="30%">
          <stop offset="0" stop-color="${c.light}"/>
          <stop offset="0.5" stop-color="${c.mid}"/>
          <stop offset="1" stop-color="${c.dark}"/>
        </radialGradient>
      </defs>
      <path d="M0 -20 L20 0 L0 20 L-20 0 Z" fill="url(#${gradId})" stroke="${c.stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M0 -12 L12 0 L0 12 L-12 0 Z" fill="none" stroke="${c.stroke}" stroke-width="1.5" stroke-linejoin="round"/>
      <circle cx="0" cy="0" r="2.5" fill="${c.stroke}"/>
    </svg>
  `;
  return L.divIcon({
    html: '<div class="mission-marker-wrap" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">' + svg + '</div>',
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function renderMissionMarkers() {
  if (!missionMarkerLayer) return;
  missionMarkerLayer.clearLayers();
  missions.forEach(m => {
    if (m.status !== 'active') return;       // completed missions are invisible on map
    if (m.lat == null || m.lng == null) return;
    const marker = L.marker([m.lat, m.lng], {
      icon: makeMissionIcon(m.priority || 'normal'),
    });
    marker.on('click', () => openMissionForm(m.id));
    marker.addTo(missionMarkerLayer);
  });
}

// ---------- Helper: bearing-to-cardinal (used in card meta) ----------

function bearingDeg(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const toDeg = x => x * 180 / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}
function bearingToCardinal(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// ---------- POI ↔ Mission linkage helpers ----------

let pendingPoiIdForObjective = null;

function addObjectiveForCurrentPoi() {
  if (!editingId) return;
  // Snapshot the POI id BEFORE closeSheet (which clears editingId)
  pendingPoiIdForObjective = editingId;
  closeSheet();
  setTimeout(() => {
    // Open new mission form, then override the location to link to this POI
    editingMissionId = null;
    openMissionForm(null);
    const poi = pois.find(p => p.id === pendingPoiIdForObjective);
    if (poi) {
      _missionFormPoiId = poi.id;
      _missionFormLat = poi.lat;
      _missionFormLng = poi.lng;
      applyMissionLocUI();
    }
    pendingPoiIdForObjective = null;
  }, 60);
}

function renderPoiLinkedMissions(poiId) {
  const container = document.getElementById('poiLinkedMissions');
  if (!container) return;
  const linked = missions.filter(m => m.poiId === poiId);
  if (linked.length === 0) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = '';
  linked.forEach(m => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:6px; padding:6px 8px; background:#050403; border:1px solid #2a2520; border-radius:2px; margin-top:4px; cursor:pointer; box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);';
    const flag = m.status === 'complete' ? '✓' : (m.priority === 'urgent' ? '!' : '▶');
    const flagColor = m.status === 'complete' ? '#6a9a5a' : (m.priority === 'urgent' ? '#d96850' : '#6ab3e0');
    row.innerHTML = `
      <span style="color:${flagColor}; font-family: 'B612 Mono', monospace; font-size: 10px; font-weight: 700;">${flag}</span>
      <span style="flex:1; color:#d4c8b0; font-family:'IBM Plex Mono', monospace; font-size:11px; ${m.status === 'complete' ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(m.title)}</span>
    `;
    row.onclick = (ev) => {
      ev.stopPropagation();
      closeSheet();
      setTimeout(() => openMissionForm(m.id), 60);
    };
    container.appendChild(row);
  });
}


// ---------- closeAllSheets helper (used by mission-form transitions) ----------

function closeAllSheets() {
  // Doesn't change overlay state; just removes .open from each known sheet
  ['classifySheet','pendingSheet','settingsSheet','logSheet','searchSheet','statsSheet','objectivesSheet','missionFormSheet','healthSheet','healthDetailSheet'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  });
}


// ===== INIT =====
loadPrefs();
loadPOIs();
seedSupplyPOIs();
loadMissions();
loadFog();
loadRegions();
loadJournal();
loadTrail();
initMap();
startGPS();
updatePendingCount();
renderTrail();
applyLegendPref();
renderBoundaries();
updateMarkStatus();
updateIndicatorStrip();
applyLandscapeMode();
// Tick the indicator strip every 5s for GPS-staleness state
setInterval(updateIndicatorStrip, 5000);

// ===== Y8 BOOT SCREEN =====
// Animate the boot log lines, fill the progress bar, fade out.
(function bootSequence() {
  const boot = document.getElementById('bootScreen');
  if (!boot) return;
  const log = document.getElementById('bootLog');
  const label = document.getElementById('bootProgressLabel');
  const fill = document.getElementById('bootProgressFill');
  const lines = [
    { ts: '0.02', msg: 'chassis ok', status: 'ok' },
    { ts: '0.08', msg: 'storage volume mounted', status: 'ok' },
    { ts: '0.14', msg: 'poi index loaded · ' + (pois ? pois.length : 0) + ' records', status: 'ok' },
    { ts: '0.21', msg: 'fog volume restored', status: 'ok' },
    { ts: '0.27', msg: 'region archive · ' + (regions ? regions.length : 0) + ' active', status: 'ok' },
    { ts: '0.34', msg: 'gnss receiver', status: 'ack', ackText: 'acquiring...' },
    { ts: '0.42', msg: 'basemap tiles · primary endpoint', status: 'ok' },
  ];
  let i = 0;
  function tick() {
    if (i >= lines.length) {
      label.textContent = 'READY';
      fill.style.width = '100%';
      setTimeout(() => {
        boot.classList.add('fading');
        setTimeout(() => boot.classList.add('gone'), 450);
      }, 300);
      return;
    }
    const ln = lines[i];
    const pct = Math.round(((i + 1) / lines.length) * 100);
    fill.style.width = pct + '%';
    label.textContent = 'INITIALIZING · ' + pct + '%';
    const lineEl = document.createElement('div');
    lineEl.className = 'line';
    lineEl.innerHTML = '<span class="ts">[' + ln.ts + ']</span>' +
                       '<span class="msg">' + ln.msg + '</span>' +
                       (ln.status === 'ok' ? '<span class="ok">✓</span>' :
                        '<span class="ack">' + (ln.ackText || '') + '</span>');
    log.appendChild(lineEl);
    i++;
    setTimeout(tick, 90 + Math.random() * 60);
  }
  // Small initial delay so it doesn't feel instant
  setTimeout(tick, 120);
})();
// ===== D · IDLE DIM =====
// After IDLE_MS of no user interaction, the device enters a dimmed state
// where LEDs pull back ~15% brightness and the chassis loses its bright
// edge highlight. Any tap / touch / keypress wakes it back up.
// The idea: the device responds to your attention, not just your taps.
(function setupIdleDim() {
  const IDLE_MS = 30000;
  let idleTimer = null;
  function wake() {
    if (document.body.classList.contains('idle-dim')) {
      document.body.classList.remove('idle-dim');
    }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      document.body.classList.add('idle-dim');
    }, IDLE_MS);
  }
  // Any of these inputs resets the idle clock
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(evt => {
    window.addEventListener(evt, wake, { passive: true });
  });
  // GPS updates count as "the device is doing something" — but they don't
  // wake the chassis. Only the user's hands wake it. This is intentional.
  wake();
})();

// =============================================================================
// HEALTH MODULE — fasting tracker, food log, exercise log
// =============================================================================
// Self-contained silo. Four storage keys, four arrays, one sheet with three
// tabs. No cross-references with POIs, missions, or any other system.
// =============================================================================

let fasts = [];      // [{ id, dayNum, startTs, endTs, hours, notes }]
                     // Note: weights are NOT stored on fasts — they live in
                     // weighins independently (Option B). dayNum is the user's
                     // own sequence number ("Day 1", "Day 2") that started Mar 17 2026.
let weighins = [];   // [{ id, ts, lbs, condition: 'FASTED'|'FED'|null, notes }]
let meals = [];      // [{ id, ts, name, portion: 'S'|'M'|'L', tag, calories|null, notes }]
let workouts = [];   // [{ id, ts, type, durationMin, intensity|null, distanceMi|null, sets|null, notes }]
let healthTab = 'fast';
let healthDetail = null;
let fastTimerHandle = null;
// Quick-log state for run/walk. null = form not open. Otherwise:
//   { type: 'RUN'|'WALK', duration: number, distance: number|null, intensity: string|null }
// All taps mutate this and re-render the MOVE status card.
let quickLogState = null;
// Live workout state. null = not tracking. Otherwise:
//   { type, startTs, pausedMs (total ms paused), pausedAt (ts of current pause, or null),
//     distanceMi, lastLat, lastLng, partial (true if any GPS gap suspected) }
// Persisted to localStorage as recon.os.liveWorkout so it survives crashes.
// Distance is computed incrementally — each GPS update with accuracy<=30m adds
// haversine(lastPoint, newPoint) to distanceMi. lastLat/lastLng track the last
// good sample; null means "next good sample becomes the anchor".
let liveWorkout = null;
let liveTickHandle = null;

const FOOD_TAGS = ['PROTEIN', 'CARBS', 'VEG', 'JUNK', 'DRINK', 'OTHER'];
const FOOD_PORTIONS = ['S', 'M', 'L'];
const MOVE_TYPES = ['RUN', 'LIFT', 'WALK', 'OTHER'];
const MOVE_INTENSITIES = ['LIGHT', 'MED', 'HARD'];

function loadHealth() {
  try { fasts = JSON.parse(localStorage.getItem('recon.os.fasts') || '[]'); } catch (e) { fasts = []; }
  try { weighins = JSON.parse(localStorage.getItem('recon.os.weighins') || '[]'); } catch (e) { weighins = []; }
  try { meals = JSON.parse(localStorage.getItem('recon.os.meals') || '[]'); } catch (e) { meals = []; }
  try { workouts = JSON.parse(localStorage.getItem('recon.os.workouts') || '[]'); } catch (e) { workouts = []; }
  try { healthTab = localStorage.getItem('recon.os.healthTab') || 'fast'; } catch (e) { healthTab = 'fast'; }
  // Recover live workout if one was in progress when the app last closed.
  // Mark partial because we definitely missed GPS samples while suspended.
  try {
    const raw = localStorage.getItem('recon.os.liveWorkout');
    if (raw) {
      liveWorkout = JSON.parse(raw);
      // If the app was killed mid-workout, GPS samples weren't recorded for
      // the gap. Flag partial so the saved distance reads as a lower bound.
      liveWorkout.partial = true;
      // Drop the lat/lng anchor — next good GPS sample becomes the new anchor.
      // Without this, we'd compute a giant jump from wherever we last sampled.
      liveWorkout.lastLat = null;
      liveWorkout.lastLng = null;
    }
  } catch (e) { liveWorkout = null; }
}
function saveFasts()    { safeSet('recon.os.fasts',    JSON.stringify(fasts)); updateHealthBadge(); }
function saveWeighins() { safeSet('recon.os.weighins', JSON.stringify(weighins)); }
function saveMeals()    { safeSet('recon.os.meals',    JSON.stringify(meals)); }
function saveWorkouts() { safeSet('recon.os.workouts', JSON.stringify(workouts)); updateHealthBadge(); }

loadHealth();
seedHealthData();
// updateHealthBadge needs the DOM ready. Defer until after page load.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    updateHealthBadge();
    showStreakAtRiskToastsOnce();
  });
} else {
  updateHealthBadge();
  showStreakAtRiskToastsOnce();
}

// Show a toast when a streak is at risk, but at most once per calendar day
// per streak type. The dismissal is implicit — once we've shown it, we
// stamp today's date and don't show again until tomorrow. If the user logs
// the missing activity the toast won't fire because at-risk goes false.
function showStreakAtRiskToastsOnce() {
  // Stagger toasts slightly so they don't stack on top of each other.
  // Also wait for the rest of the UI to settle before toasting.
  setTimeout(() => {
    const today = dayKey(Date.now());
    const fs = fastStreak();
    if (fs.atRisk) {
      const key = 'recon.os.fastStreakWarned';
      if (safeGetItem(key) !== today) {
        showToast('⚠ FAST STREAK AT RISK · ' + fs.current);
        try { localStorage.setItem(key, today); } catch (e) {}
      }
    }
    const ws = workoutStreak();
    if (ws.atRisk) {
      const key = 'recon.os.workoutStreakWarned';
      if (safeGetItem(key) !== today) {
        // Stagger 4s after the fast toast (which shows for ~3s)
        setTimeout(() => {
          showToast('⚠ WORKOUT STREAK AT RISK · ' + ws.current);
          try { localStorage.setItem(key, today); } catch (e) {}
        }, 4000);
      }
    }
  }, 2500);  // delay so boot screen / initial setup doesn't drown the toast
}

function safeGetItem(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

// =============================================================================
// One-time seed import of user's existing fast history (Mar 17 2026 - May 27 2026).
// Runs once per device — gates on recon.os.healthSeeded so it doesn't re-import
// if the user later deletes records. To force re-seed: remove that flag and
// reload. Times are interpreted as America/Chicago (user's home tz).
// =============================================================================
function seedHealthData() {
  try {
    if (localStorage.getItem('recon.os.healthSeeded') === '1') return;
  } catch (e) { /* if storage is busted, skip seeding */ return; }

  // Helper — builds a JS timestamp for a date/time pair interpreted in Houston's
  // current UTC offset. Houston is UTC-5 (CDT) for all March-May 2026 entries
  // because DST began Mar 8 2026 (well before our earliest data point).
  // ISO format: YYYY-MM-DDTHH:MM:00-05:00
  const TZ = '-05:00';
  const ts = (dateStr, timeStr) => new Date(dateStr + 'T' + timeStr + ':00' + TZ).getTime();

  // Each fast: [dayNum, startDate, startTime, endDate, endTime, hoursStated]
  // Times are 24h, dates are YYYY-MM-DD. hoursStated matches the user's notes
  // exactly (which round to half-hours) and is what gets displayed; we still
  // compute real duration from start/end for the timer math.
  const FASTS = [
    [1,  '2026-03-17', '23:00', '2026-03-18', '22:00', 23],
    [2,  '2026-03-19', '22:00', '2026-03-21', '02:00', 28],
    [3,  '2026-03-21', '21:00', '2026-03-22', '20:00', 23],
    [4,  '2026-03-23', '21:00', '2026-03-24', '17:00', 20],
    [5,  '2026-03-25', '21:00', '2026-03-26', '17:00', 20],
    [6,  '2026-03-28', '21:00', '2026-03-29', '19:00', 22],
    [7,  '2026-03-29', '21:00', '2026-03-30', '20:00', 23],
    [8,  '2026-03-31', '21:00', '2026-04-01', '18:00', 21],
    [9,  '2026-04-02', '21:00', '2026-04-03', '16:00', 19],
    [10, '2026-04-05', '19:00', '2026-04-06', '19:00', 24],
    [11, '2026-04-07', '18:30', '2026-04-08', '19:00', 24.5],
    [12, '2026-04-09', '19:45', '2026-04-10', '19:45', 24],
    [13, '2026-04-12', '22:00', '2026-04-13', '22:30', 24.5],
    [14, '2026-04-14', '21:00', '2026-04-15', '18:00', 21],
    [15, '2026-04-16', '21:30', '2026-04-17', '20:00', 23.5],
    [16, '2026-04-19', '23:30', '2026-04-21', '12:00', 36.5],
    [17, '2026-04-21', '22:00', '2026-04-22', '20:00', 22],
    [18, '2026-04-23', '22:30', '2026-04-24', '21:00', 22.5],
    [19, '2026-04-26', '22:00', '2026-04-27', '15:30', 18.5],
    [20, '2026-04-28', '19:00', '2026-04-29', '19:00', 24],
    [21, '2026-04-30', '19:30', '2026-05-01', '19:30', 24],
    [22, '2026-05-03', '21:30', '2026-05-04', '15:30', 18],
    [23, '2026-05-05', '15:00', '2026-05-06', '15:00', 24],
    [24, '2026-05-07', '15:00', '2026-05-08', '15:30', 24.5],
    [25, '2026-05-10', '22:00', '2026-05-11', '18:00', 20],
    [26, '2026-05-12', '19:00', '2026-05-13', '16:00', 21],
    [27, '2026-05-14', '17:45', '2026-05-15', '13:00', 19.25],
    [28, '2026-05-17', '21:00', '2026-05-18', '15:00', 18],
    [29, '2026-05-19', '18:00', '2026-05-20', '15:00', 21],
    [30, '2026-05-21', '16:30', '2026-05-22', '16:30', 24],
    [31, '2026-05-24', '20:30', '2026-05-25', '17:30', 21],
    [32, '2026-05-26', '18:30', '2026-05-27', '15:30', 21],
  ];

  fasts = FASTS.map(([n, sd, st, ed, et, hrs]) => ({
    id: 'FAST-SEED-' + n,
    dayNum: n,
    startTs: ts(sd, st),
    endTs:   ts(ed, et),
    hours:   hrs,
    notes:   '',
  }));

  // Weigh-in milestones. Approximate start dropped at Mar 17 (start of day 1).
  // The narrative paragraph from the user's notes attaches to the May 14
  // weigh-in (the most recent point before it was written).
  weighins = [
    {
      id: 'WI-SEED-1',
      ts: ts('2026-03-17', '20:00'),
      lbs: 235,
      condition: null,
      notes: 'Approximate start, range 230-240',
    },
    {
      id: 'WI-SEED-2',
      ts: ts('2026-04-01', '18:00'),
      lbs: 222,
      condition: null,
      notes: 'After day 8',
    },
    {
      id: 'WI-SEED-3',
      ts: ts('2026-04-06', '16:00'),
      lbs: 220,
      condition: 'FASTED',
      notes: 'During 21hr fast (day 10)',
    },
    {
      id: 'WI-SEED-4',
      ts: ts('2026-04-15', '18:00'),
      lbs: 219,
      condition: null,
      notes: 'After day 14',
    },
    {
      id: 'WI-SEED-5',
      ts: ts('2026-04-24', '21:00'),
      lbs: 215,
      condition: null,
      notes: 'New low — after day 18',
    },
    {
      id: 'WI-SEED-6',
      ts: ts('2026-05-15', '13:00'),
      lbs: 215,
      condition: null,
      notes: 'Since April 18, consistently hovering 220-222 even on feast days. ' +
             'Past 3-4 days consistently under 220, usually 218-219. Hit 215 again today. Great progress.',
    },
    {
      id: 'WI-SEED-7',
      ts: ts('2026-05-22', '16:30'),
      lbs: 213,
      condition: null,
      notes: 'After day 30',
    },
  ];

  saveFasts();
  saveWeighins();
  try { localStorage.setItem('recon.os.healthSeeded', '1'); } catch (e) {}
}

function healthId(prefix) { return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6); }

// Returns the most recent fast that hasn't been ended, or null.
function activeFast() {
  for (let i = fasts.length - 1; i >= 0; i--) {
    if (!fasts[i].endTs) return fasts[i];
  }
  return null;
}

// =============================================================================
// STREAKS — consecutive activity tracking for fasts and workouts
// =============================================================================
// For fasts: a "streak" is consecutive completed fasts where each one
// started within 3 days of the previous one's end. This matches the user's
// real cadence (roughly every-other-day fasting with occasional 2-day gaps).
// A 4-day gap breaks the streak.
//
// For workouts: a streak is consecutive calendar days with at least one
// workout. Misses a full day → broken.
//
// "At risk" = streak > 1 AND close to the breakpoint. For fasts: it's been
// 2+ days since the last completed fast (1 day until the 3-day cutoff fires).
// For workouts: no workout today and the day's getting late OR already past.
// =============================================================================

const FAST_STREAK_GAP_DAYS = 3;  // max days between consecutive fasts in a streak

function fastStreak() {
  // Returns { current, best, atRisk, daysSinceLast }
  const completed = fasts.filter(f => f.endTs).sort((a, b) => a.startTs - b.startTs);
  if (!completed.length) return { current: 0, best: 0, atRisk: false, daysSinceLast: null };

  const dayMs = 24 * 60 * 60 * 1000;

  // Walk forward computing run lengths. A new fast extends the streak if
  // its start - previous end <= FAST_STREAK_GAP_DAYS days. Otherwise reset.
  let runLen = 1;
  let best = 1;
  const runs = [1];
  for (let i = 1; i < completed.length; i++) {
    const gap = completed[i].startTs - completed[i - 1].endTs;
    if (gap <= FAST_STREAK_GAP_DAYS * dayMs) {
      runLen++;
    } else {
      runLen = 1;
    }
    runs.push(runLen);
    if (runLen > best) best = runLen;
  }

  // Current streak = last run, BUT only if it hasn't already gone stale.
  // If more than FAST_STREAK_GAP_DAYS days have passed since the last fast
  // ended, the streak is effectively zero (next fast would start fresh).
  const last = completed[completed.length - 1];
  const daysSinceLast = (Date.now() - last.endTs) / dayMs;
  const current = (daysSinceLast > FAST_STREAK_GAP_DAYS) ? 0 : runs[runs.length - 1];

  // At risk = streak >= 2 AND 2 < daysSinceLast <= 3 (one day or less from breaking)
  const atRisk = current >= 2 && daysSinceLast > 2 && daysSinceLast <= FAST_STREAK_GAP_DAYS;

  return { current, best, atRisk, daysSinceLast };
}

function workoutStreak() {
  // Returns { current, best, atRisk, hasToday }
  if (!workouts.length) return { current: 0, best: 0, atRisk: false, hasToday: false };

  // Build a set of unique calendar-day keys when workouts happened.
  const days = new Set();
  workouts.forEach(w => days.add(dayKey(w.ts)));

  // Convert to sorted ascending list of timestamps (one per day)
  const dayTs = [...days].map(k => new Date(k + 'T00:00:00').getTime()).sort((a, b) => a - b);

  const dayMs = 24 * 60 * 60 * 1000;
  let runLen = 1;
  let best = 1;
  const runs = [1];
  for (let i = 1; i < dayTs.length; i++) {
    // Consecutive if exactly 1 day apart
    const gap = Math.round((dayTs[i] - dayTs[i - 1]) / dayMs);
    if (gap === 1) runLen++;
    else runLen = 1;
    runs.push(runLen);
    if (runLen > best) best = runLen;
  }

  const todayKey = dayKey(Date.now());
  const yesterdayKey = dayKey(Date.now() - dayMs);
  const hasToday = days.has(todayKey);
  const hadYesterday = days.has(yesterdayKey);

  // Current streak:
  //   - has today: latest run length, no decay
  //   - has yesterday but not today: still alive; streak counts up to yesterday
  //   - has neither: streak broken
  let current = 0;
  if (hasToday || hadYesterday) current = runs[runs.length - 1];

  // At risk = streak >= 2 AND today is empty AND yesterday wasn't (so missing today breaks it)
  const atRisk = current >= 2 && !hasToday && hadYesterday;

  return { current, best, atRisk, hasToday };
}

// Returns true if any health streak is at risk right now.
// Used by updateHealthBadge to decide whether to dot the HEAL button.
function anyStreakAtRisk() {
  return fastStreak().atRisk || workoutStreak().atRisk;
}

// Mirror of updatePendingCount but for the HEAL button. Adds a small dot
// when any streak is at risk so the user sees it without opening the sheet.
function updateHealthBadge() {
  const btn = document.querySelector('.tg-btn[data-id="health"]');
  if (!btn) return;
  const atRisk = anyStreakAtRisk();
  btn.classList.toggle('has-pending', atRisk);
  // The .has-pending class drives the existing dot styling (see tg-dot CSS).
  // Reusing it gives us the same visual treatment as PEND for free.
  if (atRisk && !btn.querySelector('.tg-dot')) {
    const dot = document.createElement('span');
    dot.className = 'tg-dot';
    btn.appendChild(dot);
  }
}

// Format ms as HH:MM:SS, or compact "Dd Hh Mm"
function fmtDuration(ms, compact) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (compact) {
    if (h >= 24) return Math.floor(h / 24) + 'd ' + (h % 24) + 'h ' + m + 'm';
    return h + 'h ' + m + 'm';
  }
  const pad = n => String(n).padStart(2, '0');
  return pad(h) + ':' + pad(m) + ':' + pad(sec);
}
function fmtDate(ts)     { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function fmtTime(ts)     { return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
function fmtDateTime(ts) { return fmtDate(ts) + ' · ' + fmtTime(ts); }
function dayKey(ts)      {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function openHealthSheet() {
  haptic('tap');
  setHealthTab(healthTab);
  // Sheet overlay must be opened too — otherwise the sheet can be hidden
  // by stacking order on some devices/orientations. This was the bug.
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('healthSheet').classList.add('open');
}

function setHealthTab(tab) {
  if (!['fast', 'food', 'move'].includes(tab)) tab = 'fast';
  healthTab = tab;
  try { localStorage.setItem('recon.os.healthTab', tab); } catch (e) {}
  document.querySelectorAll('#healthSheet .health-tab').forEach(el => {
    el.classList.toggle('on', el.getAttribute('data-tab') === tab);
  });
  document.querySelectorAll('#healthSheet .health-pane').forEach(el => {
    el.style.display = (el.getAttribute('data-pane') === tab) ? '' : 'none';
  });
  if (tab === 'fast') renderFastTab();
  else if (tab === 'food') renderFoodTab();
  else if (tab === 'move') renderMoveTab();
}

// --- FAST tab ----------------------------------------------------------------
function renderFastTab() {
  renderFastStatus();
  renderFastHistory();
  renderWeighinHistory();
  startFastTimerIfRunning();
}

function renderFastStatus() {
  const card = document.getElementById('fastStatusCard');
  if (!card) return;
  const active = activeFast();
  // Summary band — visible whether a fast is active or not, gives at-a-glance
  // progress without needing to scroll the history list.
  const completed = fasts.filter(f => f.endTs);
  const totalCount = completed.length;
  const avgHours = totalCount > 0
    ? (completed.reduce((s, f) => s + (f.hours || 0), 0) / totalCount).toFixed(1)
    : '0';
  const fs = fastStreak();
  // Mark the streak cell visually if it's about to break, so the band itself
  // conveys urgency without needing a separate alert.
  const streakClass = fs.atRisk ? ' at-risk' : '';
  const summary =
    '<div class="health-stat-band three">' +
      '<div class="health-stat"><span class="n">' + totalCount + '</span><span class="lbl">FASTS</span></div>' +
      '<div class="health-stat"><span class="n">' + avgHours + 'h</span><span class="lbl">AVG</span></div>' +
      '<div class="health-stat' + streakClass + '"><span class="n">' + fs.current + '</span><span class="lbl">STREAK</span></div>' +
    '</div>';

  if (active) {
    const elapsed = Date.now() - active.startTs;
    card.innerHTML =
      summary +
      '<div class="health-card-label">DAY ' + active.dayNum + ' · IN PROGRESS</div>' +
      '<div class="fast-timer" id="fastLiveTimer" onclick="openHealthDetail(\'fast\',\'' + active.id + '\')">' + fmtDuration(elapsed) + '</div>' +
      '<div class="health-card-sub">started ' + fmtDateTime(active.startTs) + '</div>' +
      '<div class="health-quickrow">' +
        '<div class="action-btn small danger" onclick="endFast()">' +
          '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">END FAST</span></div></div>' +
        '</div>' +
        // Edit start time directly from the live card — avoids forcing the user
        // to drill into the detail drawer just to fix a forgotten start time.
        '<div class="action-btn small" onclick="editActiveFastStart()">' +
          '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">EDIT START</span></div></div>' +
        '</div>' +
      '</div>';
  } else {
    const nextDay = (fasts.reduce((m, f) => Math.max(m, f.dayNum || 0), 0)) + 1;
    card.innerHTML =
      summary +
      '<div class="health-card-label">READY FOR DAY ' + nextDay + '</div>' +
      '<div class="health-card-sub">Tap to begin tracking.</div>' +
      '<div class="health-quickrow">' +
        '<div class="action-btn small primary" onclick="startFast()">' +
          '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">START FAST</span></div></div>' +
        '</div>' +
        '<div class="action-btn small" onclick="logManualFast()">' +
          '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">+ MANUAL</span></div></div>' +
        '</div>' +
      '</div>';
  }
}

function renderFastHistory() {
  const list = document.getElementById('fastHistory');
  if (!list) return;
  const completed = fasts.filter(f => f.endTs).sort((a, b) => b.startTs - a.startTs);
  if (!completed.length) { list.innerHTML = '<div class="empty-state-mini">No completed fasts yet.</div>'; return; }
  list.innerHTML = completed.map(f => {
    const dayLabel = f.dayNum ? 'DAY ' + f.dayNum : '—';
    const hoursLabel = (f.hours != null) ? f.hours + 'h' : fmtDuration(f.endTs - f.startTs, true);
    return '<div class="health-row" onclick="openHealthDetail(\'fast\',\'' + f.id + '\')">' +
      '<div class="health-row-main">' +
        '<div class="health-row-title">' + dayLabel + ' <span class="health-chip dim">' + hoursLabel + '</span></div>' +
        '<div class="health-row-sub">' + fmtDate(f.startTs) + ' ' + fmtTime(f.startTs) + ' → ' + fmtDate(f.endTs) + ' ' + fmtTime(f.endTs) + '</div>' +
      '</div>' +
      '<div class="health-row-action">→</div></div>';
  }).join('');
}

function renderWeighinHistory() {
  const list = document.getElementById('weighinHistory');
  if (!list) return;
  const sorted = [...weighins].sort((a, b) => b.ts - a.ts);
  if (!sorted.length) { list.innerHTML = '<div class="empty-state-mini">No weigh-ins logged.</div>'; return; }
  // Summary: current (most recent), lowest, total lost (first → most recent)
  const current = sorted[0].lbs;
  const lowest = Math.min(...sorted.map(w => w.lbs));
  // "Start" = earliest weigh-in chronologically (last in sorted-newest-first array)
  const start = sorted[sorted.length - 1].lbs;
  const lost = (start - current).toFixed(1);
  const summary =
    '<div class="health-stat-band weigh">' +
      '<div class="health-stat"><span class="n">' + current + '</span><span class="lbl">CURRENT</span></div>' +
      '<div class="health-stat"><span class="n">' + lowest + '</span><span class="lbl">LOWEST</span></div>' +
      '<div class="health-stat"><span class="n">' + (lost > 0 ? '−' : '+') + Math.abs(lost) + '</span><span class="lbl">LOST</span></div>' +
    '</div>';
  const rows = sorted.slice(0, 50).map(w => {
    const condChip = w.condition ? '<span class="health-chip">' + w.condition + '</span>' : '';
    return '<div class="health-row" onclick="openHealthDetail(\'weighin\',\'' + w.id + '\')">' +
      '<div class="health-row-main"><div class="health-row-title">' + w.lbs + ' lb ' + condChip + '</div>' +
      '<div class="health-row-sub">' + fmtDateTime(w.ts) + '</div></div>' +
      '<div class="health-row-action">→</div></div>';
  }).join('');
  list.innerHTML = summary + rows;
}

// Tick the live fast timer once per second while a fast is running and
// the FAST tab is visible. Stops when no active fast or the user leaves.
function startFastTimerIfRunning() {
  if (fastTimerHandle) { clearInterval(fastTimerHandle); fastTimerHandle = null; }
  if (!activeFast()) return;
  fastTimerHandle = setInterval(() => {
    const sheet = document.getElementById('healthSheet');
    if (!sheet || !sheet.classList.contains('open') || healthTab !== 'fast') {
      clearInterval(fastTimerHandle); fastTimerHandle = null; return;
    }
    const af = activeFast();
    if (!af) {
      clearInterval(fastTimerHandle); fastTimerHandle = null; renderFastStatus(); return;
    }
    const t = document.getElementById('fastLiveTimer');
    if (t) t.textContent = fmtDuration(Date.now() - af.startTs);
  }, 1000);
}

function startFast() {
  if (activeFast()) { showToast('FAST ALREADY ACTIVE'); return; }
  haptic('tap');
  // Auto-assign the next day number based on the highest existing dayNum.
  // Weights are tracked separately via weigh-ins, not on the fast itself.
  const maxDay = fasts.reduce((m, f) => Math.max(m, f.dayNum || 0), 0);
  const f = {
    id: healthId('FAST'),
    dayNum: maxDay + 1,
    startTs: Date.now(),
    endTs: null,
    hours: null,        // computed on end
    notes: '',
  };
  fasts.push(f);
  saveFasts();
  renderFastTab();
  showToast('FAST STARTED · DAY ' + f.dayNum);
}

function endFast() {
  const af = activeFast();
  if (!af) { showToast('NO ACTIVE FAST'); return; }
  haptic('tap');
  af.endTs = Date.now();
  // Round to nearest quarter-hour for display consistency with the seeded data.
  af.hours = Math.round((af.endTs - af.startTs) / (1000 * 60 * 15)) / 4;
  saveFasts();
  renderFastTab();
  showToast('FAST ENDED · ' + af.hours + 'h');
}

// Manual backfill — for when the user forgot to hit START FAST or END FAST
// in the moment. Walks through start datetime then end datetime via two
// permissive prompts. Produces a completed fast record with auto-assigned
// day number, slotted into history in chronological order on next render.
function logManualFast() {
  haptic('tap');

  // Suggest yesterday evening as a sensible default (matches typical fast pattern).
  const yesterdayEvening = new Date(Date.now() - 24 * 60 * 60 * 1000);
  yesterdayEvening.setHours(21, 0, 0, 0);
  const defaultStart = formatLocalDateTime(yesterdayEvening);

  const startStr = window.prompt(
    'Start (when did the fast begin?)\n\nFormat: YYYY-MM-DD HH:MM (24h)\nor MM/DD HH:MM (current year)',
    defaultStart
  );
  if (startStr === null || !startStr.trim()) return;
  const startTs = parseLocalDateTime(startStr.trim());
  if (startTs == null) { showToast('INVALID START DATE/TIME'); return; }

  // Default end = start + 20 hours, a typical fast length for the user.
  const defaultEnd = formatLocalDateTime(new Date(startTs + 20 * 60 * 60 * 1000));

  const endStr = window.prompt(
    'End (when did the fast end?)\n\nFormat: YYYY-MM-DD HH:MM (24h)\nor MM/DD HH:MM (current year)',
    defaultEnd
  );
  if (endStr === null || !endStr.trim()) return;
  const endTs = parseLocalDateTime(endStr.trim());
  if (endTs == null) { showToast('INVALID END DATE/TIME'); return; }

  // Sanity checks
  if (endTs <= startTs) { showToast('END MUST BE AFTER START'); return; }
  const durMs = endTs - startTs;
  if (durMs > 7 * 24 * 60 * 60 * 1000) {
    if (!window.confirm('Duration is over 7 days. Are you sure?')) return;
  }
  if (activeFast()) { showToast('END THE ACTIVE FAST FIRST'); return; }

  // Optional notes
  const notes = window.prompt('Notes? (optional)', '');
  if (notes === null) return;

  // Auto-number using the highest existing dayNum, regardless of whether this
  // fast slots into the middle of history chronologically. Day numbers are a
  // log of "fasts I've recorded", not strictly chronological.
  const maxDay = fasts.reduce((m, f) => Math.max(m, f.dayNum || 0), 0);
  const f = {
    id: healthId('FAST'),
    dayNum: maxDay + 1,
    startTs: startTs,
    endTs: endTs,
    hours: Math.round(durMs / (1000 * 60 * 15)) / 4,
    notes: notes.trim(),
  };
  fasts.push(f);
  saveFasts();
  renderFastTab();
  showToast('FAST LOGGED · DAY ' + f.dayNum + ' · ' + f.hours + 'h');
}

// Parse a user-typed date/time string in the device's local timezone.
// Accepts (forgiving):
//   YYYY-MM-DD HH:MM       2026-05-28 21:30
//   YYYY-MM-DD HH:MM:SS    2026-05-28 21:30:00
//   YYYY/MM/DD HH:MM       2026/05/28 21:30
//   MM-DD HH:MM            05-28 21:30      (uses current year)
//   MM/DD HH:MM            5/28 21:30       (uses current year)
//   With T separator too:  2026-05-28T21:30
// Returns timestamp in ms, or null if unparseable. Always interprets as
// LOCAL time (not UTC) — what the user typed is what they meant.
function parseLocalDateTime(s) {
  if (!s) return null;
  // Normalize separators: T → space, / → -, collapse multiple spaces
  const norm = s.replace(/T/g, ' ').replace(/\//g, '-').replace(/\s+/g, ' ').trim();
  // Patterns: capture year (optional), month, day, hour, minute, second (optional)
  // Year-first: YYYY-MM-DD HH:MM[:SS]
  let m = norm.match(/^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    return buildLocalTs(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
  }
  // Month-first (current year): MM-DD HH:MM[:SS]
  m = norm.match(/^(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const year = new Date().getFullYear();
    return buildLocalTs(year, +m[1], +m[2], +m[3], +m[4], +(m[5] || 0));
  }
  return null;
}

function buildLocalTs(y, mo, d, h, mi, s) {
  // Basic range checks. Lets the Date constructor catch the rest (e.g. Feb 30).
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  const dt = new Date(y, mo - 1, d, h, mi, s || 0, 0);
  // Date will silently normalize out-of-range (Feb 30 → Mar 2). Reject if normalized.
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}

// Format a Date as "YYYY-MM-DD HH:MM" in the device's local timezone.
// Used to populate manual-entry default values.
function formatLocalDateTime(d) {
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

// Returns: number, null (skipped), or undefined (cancelled)
function promptForWeight(message) {
  const s = window.prompt(message, '');
  if (s === null) return undefined;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n <= 0 || n > 999) { showToast('INVALID WEIGHT'); return undefined; }
  return n;
}

function promptWeighIn() {
  haptic('tap');
  const lbs = promptForWeight('Current weight (lb):');
  if (lbs === undefined || lbs === null) return;
  // Condition is optional — captures whether the reading was fasted or fed,
  // which matters because body weight fluctuates 3-6 lb across the day.
  const cond = window.prompt('Condition? FASTED / FED  (blank to skip)', '');
  if (cond === null) return;
  let c = cond.trim().toUpperCase();
  if (c && c !== 'FASTED' && c !== 'FED') { showToast('USE FASTED OR FED'); return; }
  if (!c) c = null;
  const notes = window.prompt('Notes? (optional)', '');
  if (notes === null) return;
  weighins.push({ id: healthId('WI'), ts: Date.now(), lbs: lbs, condition: c, notes: notes.trim() });
  saveWeighins();
  renderWeighinHistory();
  showToast('WEIGH-IN LOGGED');
}

// --- FOOD tab ----------------------------------------------------------------
function renderFoodTab() { renderFoodStatus(); renderFoodHistory(); }

function renderFoodStatus() {
  const card = document.getElementById('foodStatusCard');
  if (!card) return;
  const today = dayKey(Date.now());
  const todays = meals.filter(m => dayKey(m.ts) === today);
  const calSum = todays.reduce((s, m) => s + (m.calories || 0), 0);
  card.innerHTML =
    '<div class="health-card-label">TODAY</div>' +
    '<div class="health-card-bignum">' + todays.length + ' meal' + (todays.length === 1 ? '' : 's') + '</div>' +
    '<div class="health-card-sub">' + (calSum > 0 ? calSum + ' kcal logged' : 'no calories logged') + '</div>' +
    '<div class="health-quickrow">' +
      '<div class="action-btn small primary" onclick="promptAddMeal()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">+ MEAL</span></div></div>' +
      '</div>' +
    '</div>';
}

function renderFoodHistory() {
  const list = document.getElementById('foodHistory');
  if (!list) return;
  if (!meals.length) { list.innerHTML = '<div class="empty-state-mini">No meals logged.</div>'; return; }
  const byDay = {};
  meals.forEach(m => { const k = dayKey(m.ts); if (!byDay[k]) byDay[k] = []; byDay[k].push(m); });
  const days = Object.keys(byDay).sort().reverse();
  const todayK = dayKey(Date.now());
  list.innerHTML = days.map(k => {
    const label = (k === todayK) ? 'TODAY' : fmtDate(new Date(k + 'T00:00:00').getTime()).toUpperCase();
    const rows = byDay[k].sort((a, b) => b.ts - a.ts).map(m => {
      const cal = (m.calories != null) ? ' · ' + m.calories + ' kcal' : '';
      return '<div class="health-row" onclick="openHealthDetail(\'meal\',\'' + m.id + '\')">' +
        '<div class="health-row-main">' +
          '<div class="health-row-title">' + (m.name || '(unnamed)') + ' <span class="health-chip">' + m.portion + '</span> <span class="health-chip dim">' + m.tag + '</span></div>' +
          '<div class="health-row-sub">' + fmtTime(m.ts) + cal + '</div>' +
        '</div><div class="health-row-action">→</div></div>';
    }).join('');
    return '<div class="health-daygroup-head">' + label + '</div>' + rows;
  }).join('');
}

function promptAddMeal() {
  haptic('tap');
  const name = window.prompt('Meal name:', '');
  if (name === null || !name.trim()) return;
  const portion = window.prompt('Portion? S / M / L', 'M');
  if (portion === null) return;
  const p = portion.trim().toUpperCase();
  if (!FOOD_PORTIONS.includes(p)) { showToast('INVALID PORTION'); return; }
  const tag = window.prompt('Tag? ' + FOOD_TAGS.join(' / '), 'OTHER');
  if (tag === null) return;
  const t = tag.trim().toUpperCase();
  if (!FOOD_TAGS.includes(t)) { showToast('INVALID TAG'); return; }
  const calsStr = window.prompt('Calories? (optional, leave blank to skip)', '');
  if (calsStr === null) return;
  let cals = null;
  if (calsStr.trim()) {
    cals = parseInt(calsStr, 10);
    if (isNaN(cals) || cals < 0) { showToast('INVALID CALORIES'); return; }
  }
  meals.push({ id: healthId('MEAL'), ts: Date.now(), name: name.trim(), portion: p, tag: t, calories: cals, notes: '' });
  saveMeals();
  renderFoodTab();
  showToast('MEAL LOGGED');
}

// --- MOVE tab ----------------------------------------------------------------
function renderMoveTab() { renderMoveStatus(); renderMoveHistory(); }

function renderMoveStatus() {
  const card = document.getElementById('moveStatusCard');
  if (!card) return;
  // Priority order: live workout > quick-log form > default status view
  if (liveWorkout) {
    card.innerHTML = renderLiveWorkoutCard();
    // Make sure the 1Hz ticker is alive for live updates while visible.
    startLiveTick();
    return;
  }
  if (quickLogState) {
    card.innerHTML = renderQuickLogForm();
    return;
  }
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = workouts.filter(w => w.ts >= cutoff);
  const totalMin = recent.reduce((s, w) => s + (w.durationMin || 0), 0);
  const ws = workoutStreak();
  // Mini stat band: count + total min + streak. Mirrors the FAST tab.
  const streakClass = ws.atRisk ? ' at-risk' : '';
  const summary =
    '<div class="health-stat-band three">' +
      '<div class="health-stat"><span class="n">' + recent.length + '</span><span class="lbl">7-DAY</span></div>' +
      '<div class="health-stat"><span class="n">' + totalMin + 'm</span><span class="lbl">TOTAL</span></div>' +
      '<div class="health-stat' + streakClass + '"><span class="n">' + ws.current + '</span><span class="lbl">STREAK</span></div>' +
    '</div>';
  card.innerHTML =
    summary +
    '<div class="health-card-label">READY</div>' +
    '<div class="health-quickrow">' +
      '<div class="action-btn small primary" onclick="startLiveWorkout(\'WALK\')">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">▶ WALK</span></div></div>' +
      '</div>' +
      '<div class="action-btn small primary" onclick="startLiveWorkout(\'RUN\')">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">▶ RUN</span></div></div>' +
      '</div>' +
    '</div>' +
    '<div class="health-quickrow">' +
      '<div class="action-btn small" onclick="openQuickLog()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">+ QUICK LOG</span></div></div>' +
      '</div>' +
      '<div class="action-btn small" onclick="promptAddWorkout()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">+ WORKOUT</span></div></div>' +
      '</div>' +
    '</div>';
}

// =============================================================================
// LIVE WORKOUT — real-time run/walk tracking with GPS distance accumulation
// =============================================================================
// Hybrid approach: timer always derives duration from wall-clock start time
// (so it's right even after the app was suspended), while distance accumulates
// only from GPS samples we actually receive (so it's an honest lower bound
// when the screen was locked).
//
// PWA limitation: iOS Safari suspends backgrounded PWAs within seconds, so
// GPS samples stop. When the user reopens the app, we resume the timer
// accurately but mark the workout `partial` because we missed distance.
// =============================================================================

function saveLiveWorkout() {
  if (!liveWorkout) {
    try { localStorage.removeItem('recon.os.liveWorkout'); } catch (e) {}
    return;
  }
  safeSet('recon.os.liveWorkout', JSON.stringify(liveWorkout));
}

// Haversine — distance in miles between two lat/lng points. Used to grow
// distanceMi incrementally on each accepted GPS sample.
function haversineMi(lat1, lng1, lat2, lng2) {
  const R = 3958.8;  // Earth radius in miles
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Elapsed active duration in ms (excludes time spent paused).
// If currently paused, the active-pause interval is excluded too.
function liveElapsedMs() {
  if (!liveWorkout) return 0;
  const now = Date.now();
  const wall = now - liveWorkout.startTs;
  let paused = liveWorkout.pausedMs || 0;
  if (liveWorkout.pausedAt) paused += now - liveWorkout.pausedAt;
  return Math.max(0, wall - paused);
}

// Called from applyGpsCoords on every new fix. No-op unless a workout
// is live and not paused. Rejects fixes with accuracy > 30m to keep
// distance honest. First good sample establishes the anchor; each
// subsequent sample adds haversine(anchor, new) to distance and
// updates the anchor.
function feedLiveWorkoutGps(lat, lng, accuracy) {
  if (!liveWorkout) return;
  if (liveWorkout.pausedAt) return;
  if (accuracy == null || accuracy > 30) return;  // confidence threshold
  if (liveWorkout.lastLat == null) {
    // First good sample (or first after a pause/resume/recovery) — set anchor.
    liveWorkout.lastLat = lat;
    liveWorkout.lastLng = lng;
    saveLiveWorkout();
    return;
  }
  const segMi = haversineMi(liveWorkout.lastLat, liveWorkout.lastLng, lat, lng);
  // GPS jitter — discard segments under ~5 meters (0.003 mi). Otherwise
  // standing still accumulates a slow distance creep.
  if (segMi < 0.003) return;
  // Sanity cap — reject single-segment jumps over 0.1 mi (160m). Likely
  // a bad fix or cold-start jump after recovery.
  if (segMi > 0.1) {
    liveWorkout.partial = true;
    liveWorkout.lastLat = lat;
    liveWorkout.lastLng = lng;
    saveLiveWorkout();
    return;
  }
  liveWorkout.distanceMi = +((liveWorkout.distanceMi || 0) + segMi).toFixed(4);
  liveWorkout.lastLat = lat;
  liveWorkout.lastLng = lng;
  saveLiveWorkout();
}

function startLiveWorkout(type) {
  if (liveWorkout) { showToast('WORKOUT ALREADY LIVE'); return; }
  haptic('tap');
  liveWorkout = {
    type: type,            // 'WALK' or 'RUN'
    startTs: Date.now(),
    pausedMs: 0,
    pausedAt: null,
    distanceMi: 0,
    lastLat: null,
    lastLng: null,
    partial: false,
  };
  // If we have a current GPS fix, seed the anchor immediately so the very
  // first segment can register.
  if (userPos && userPos.acc != null && userPos.acc <= 30) {
    liveWorkout.lastLat = userPos.lat;
    liveWorkout.lastLng = userPos.lng;
  }
  saveLiveWorkout();
  startLiveTick();
  renderMoveStatus();
  showToast(type + ' STARTED');
}

function pauseLiveWorkout() {
  if (!liveWorkout || liveWorkout.pausedAt) return;
  haptic('tap');
  liveWorkout.pausedAt = Date.now();
  liveWorkout.partial = true;  // gaps during pause = partial data
  saveLiveWorkout();
  renderMoveStatus();
}

function resumeLiveWorkout() {
  if (!liveWorkout || !liveWorkout.pausedAt) return;
  haptic('tap');
  liveWorkout.pausedMs += Date.now() - liveWorkout.pausedAt;
  liveWorkout.pausedAt = null;
  // Drop the GPS anchor so we don't compute a giant jump across the pause.
  liveWorkout.lastLat = null;
  liveWorkout.lastLng = null;
  saveLiveWorkout();
  renderMoveStatus();
}

function stopLiveWorkout() {
  if (!liveWorkout) return;
  if (!window.confirm('Stop and save this workout?')) return;
  haptic('tap');
  // Finalize duration (resolve any active pause first)
  if (liveWorkout.pausedAt) {
    liveWorkout.pausedMs += Date.now() - liveWorkout.pausedAt;
    liveWorkout.pausedAt = null;
  }
  const ms = liveElapsedMs();
  const durationMin = Math.max(1, Math.round(ms / 60000));
  const dist = (liveWorkout.distanceMi && liveWorkout.distanceMi > 0)
    ? +liveWorkout.distanceMi.toFixed(2)
    : null;
  workouts.push({
    id: healthId('WO'),
    ts: Date.now(),
    type: liveWorkout.type,
    durationMin: durationMin,
    intensity: null,
    distanceMi: dist,
    sets: null,
    notes: liveWorkout.partial ? '(partial GPS — distance is a lower bound)' : '',
  });
  saveWorkouts();
  liveWorkout = null;
  saveLiveWorkout();
  stopLiveTick();
  renderMoveTab();
  showToast('SAVED · ' + durationMin + 'm' + (dist ? ' · ' + dist + ' mi' : ''));
}

function discardLiveWorkout() {
  if (!liveWorkout) return;
  if (!window.confirm('Discard this workout without saving?')) return;
  haptic('warn');
  liveWorkout = null;
  saveLiveWorkout();
  stopLiveTick();
  renderMoveStatus();
  showToast('DISCARDED');
}

// Tick once per second while a live workout is showing on the MOVE tab.
// Only updates timer/pace text — distance comes from the GPS handler, not here.
function startLiveTick() {
  stopLiveTick();
  liveTickHandle = setInterval(() => {
    const sheet = document.getElementById('healthSheet');
    if (!sheet || !sheet.classList.contains('open') || healthTab !== 'move') {
      // Card isn't visible — drop ticking to save battery. Will restart
      // on next renderMoveStatus if needed.
      stopLiveTick();
      return;
    }
    if (!liveWorkout) { stopLiveTick(); return; }
    updateLiveReadouts();
  }, 1000);
}
function stopLiveTick() {
  if (liveTickHandle) { clearInterval(liveTickHandle); liveTickHandle = null; }
}

// Targeted DOM update so we don't re-render the entire card every second
// (which would cause buttons to flicker / dropped taps).
function updateLiveReadouts() {
  if (!liveWorkout) return;
  const ms = liveElapsedMs();
  const timerEl = document.getElementById('liveTimer');
  if (timerEl) timerEl.textContent = fmtDuration(ms);
  const distEl = document.getElementById('liveDistance');
  if (distEl) {
    const d = liveWorkout.distanceMi || 0;
    distEl.textContent = d.toFixed(2) + ' mi' + (liveWorkout.partial ? ' *' : '');
  }
  const paceEl = document.getElementById('livePace');
  if (paceEl) {
    const d = liveWorkout.distanceMi || 0;
    if (d > 0.01 && ms > 0) {
      const paceMinPerMi = (ms / 60000) / d;
      const mins = Math.floor(paceMinPerMi);
      const secs = Math.round((paceMinPerMi - mins) * 60);
      paceEl.textContent = mins + ':' + String(secs).padStart(2, '0') + '/mi';
    } else {
      paceEl.textContent = '—:—/mi';
    }
  }
}

function renderLiveWorkoutCard() {
  const lw = liveWorkout;
  const paused = !!lw.pausedAt;
  const partialNote = lw.partial
    ? '<div class="live-partial">⚠ partial GPS — distance is a lower bound</div>'
    : '';
  const pauseBtn = paused
    ? '<div class="action-btn small primary" onclick="resumeLiveWorkout()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">RESUME</span></div></div>' +
      '</div>'
    : '<div class="action-btn small" onclick="pauseLiveWorkout()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">PAUSE</span></div></div>' +
      '</div>';
  return '<div class="health-card-label">' + lw.type + (paused ? ' · PAUSED' : ' · LIVE') + '</div>' +
    '<div class="live-timer" id="liveTimer">' + fmtDuration(liveElapsedMs()) + '</div>' +
    '<div class="live-stats">' +
      '<span id="liveDistance">' + (lw.distanceMi || 0).toFixed(2) + ' mi' + (lw.partial ? ' *' : '') + '</span>' +
      '<span class="live-stats-sep">·</span>' +
      '<span id="livePace">—:—/mi</span>' +
    '</div>' +
    partialNote +
    '<div class="health-quickrow">' +
      pauseBtn +
      '<div class="action-btn small danger" onclick="stopLiveWorkout()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">STOP</span></div></div>' +
      '</div>' +
      '<div class="action-btn small" onclick="discardLiveWorkout()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">DISCARD</span></div></div>' +
      '</div>' +
    '</div>';
}


// =============================================================================
// QUICK LOG — button-driven run/walk logger (no typing).
// =============================================================================
// Designed for the case "I just finished a walk, log it in 3-4 taps."
// State lives in quickLogState; every tap mutates it and re-renders.
// SAVE writes a workout record (type, durationMin, distanceMi, intensity).
// =============================================================================

// Presets for the segmented selectors. Duration in minutes, distance in miles.
const QLOG_DURATION_PRESETS = [10, 20, 30, 45, 60];
const QLOG_DURATION_BUMPS   = [5, 15];
const QLOG_DISTANCE_PRESETS = [1, 2, 3, 5];
const QLOG_DISTANCE_BUMPS   = [0.5, 1];

function openQuickLog() {
  haptic('tap');
  // Default to WALK + 30 min — most common single tap for a typical walk.
  // Distance and intensity start unset (logging them is optional).
  quickLogState = { type: 'WALK', duration: 30, distance: null, intensity: null };
  renderMoveStatus();
}

function closeQuickLog() {
  quickLogState = null;
  renderMoveStatus();
}

function quickLogSetType(t) {
  if (!quickLogState) return;
  haptic('tap');
  quickLogState.type = t;
  renderMoveStatus();
}

function quickLogSetDuration(min) {
  if (!quickLogState) return;
  haptic('tap');
  quickLogState.duration = min;
  renderMoveStatus();
}

function quickLogBumpDuration(delta) {
  if (!quickLogState) return;
  haptic('tap');
  // Cap at a reasonable upper bound to prevent absurd values from over-tapping.
  quickLogState.duration = Math.min(600, Math.max(1, quickLogState.duration + delta));
  renderMoveStatus();
}

function quickLogSetDistance(mi) {
  if (!quickLogState) return;
  haptic('tap');
  quickLogState.distance = mi;
  renderMoveStatus();
}

function quickLogBumpDistance(delta) {
  if (!quickLogState) return;
  haptic('tap');
  // If no distance set yet, start from the bump value (e.g. tap +0.5 → 0.5mi).
  const current = quickLogState.distance != null ? quickLogState.distance : 0;
  quickLogState.distance = Math.min(100, Math.max(0, +(current + delta).toFixed(2)));
  renderMoveStatus();
}

function quickLogClearDistance() {
  if (!quickLogState) return;
  haptic('tap');
  quickLogState.distance = null;
  renderMoveStatus();
}

function quickLogSetIntensity(it) {
  if (!quickLogState) return;
  haptic('tap');
  // Toggle off if tapping the already-selected intensity (so it stays optional).
  quickLogState.intensity = (quickLogState.intensity === it) ? null : it;
  renderMoveStatus();
}

function quickLogSave() {
  if (!quickLogState) return;
  haptic('tap');
  const s = quickLogState;
  workouts.push({
    id: healthId('WO'),
    ts: Date.now(),
    type: s.type,
    durationMin: s.duration,
    intensity: s.intensity,
    distanceMi: s.distance,
    sets: null,
    notes: '',
  });
  saveWorkouts();
  quickLogState = null;
  renderMoveTab();
  showToast(s.type + ' LOGGED · ' + s.duration + 'm' + (s.distance != null ? ' · ' + s.distance + ' mi' : ''));
}

function renderQuickLogForm() {
  const s = quickLogState;
  // Readout line — live summary of current state, updates on every tap
  const distLabel = s.distance != null ? s.distance + ' mi' : '— mi';
  const intLabel = s.intensity || '—';
  const readout = '<div class="qlog-readout">' + s.type + ' · ' + s.duration + ' min · ' + distLabel + ' · ' + intLabel + '</div>';

  // TYPE — 2 segmented buttons
  const typeBtns = ['WALK', 'RUN'].map(t =>
    '<button class="qlog-chip' + (s.type === t ? ' on' : '') + '" onclick="quickLogSetType(\'' + t + '\')">' + t + '</button>'
  ).join('');

  // DURATION — preset buttons (highlighted if matches current value) + bump buttons
  const durBtns = QLOG_DURATION_PRESETS.map(m =>
    '<button class="qlog-chip' + (s.duration === m ? ' on' : '') + '" onclick="quickLogSetDuration(' + m + ')">' + m + 'm</button>'
  ).join('');
  const durBumps = QLOG_DURATION_BUMPS.map(d =>
    '<button class="qlog-bump" onclick="quickLogBumpDuration(' + d + ')">+' + d + 'm</button>'
  ).join('');

  // DISTANCE — preset buttons + bump + clear (since distance is optional)
  const distBtns = QLOG_DISTANCE_PRESETS.map(mi =>
    '<button class="qlog-chip' + (s.distance === mi ? ' on' : '') + '" onclick="quickLogSetDistance(' + mi + ')">' + mi + ' mi</button>'
  ).join('');
  const distBumps = QLOG_DISTANCE_BUMPS.map(d =>
    '<button class="qlog-bump" onclick="quickLogBumpDistance(' + d + ')">+' + d + '</button>'
  ).join('');
  const distClear = '<button class="qlog-bump qlog-clear" onclick="quickLogClearDistance()">✕</button>';

  // INTENSITY — 3 segmented, tap-to-deselect (optional)
  const intBtns = MOVE_INTENSITIES.map(it =>
    '<button class="qlog-chip' + (s.intensity === it ? ' on' : '') + '" onclick="quickLogSetIntensity(\'' + it + '\')">' + it + '</button>'
  ).join('');

  return readout +
    '<div class="qlog-row-label">TYPE</div>' +
    '<div class="qlog-row">' + typeBtns + '</div>' +
    '<div class="qlog-row-label">DURATION</div>' +
    '<div class="qlog-row">' + durBtns + '</div>' +
    '<div class="qlog-row qlog-row-sub">' + durBumps + '</div>' +
    '<div class="qlog-row-label">DISTANCE <span class="qlog-optional">optional</span></div>' +
    '<div class="qlog-row">' + distBtns + '</div>' +
    '<div class="qlog-row qlog-row-sub">' + distBumps + distClear + '</div>' +
    '<div class="qlog-row-label">INTENSITY <span class="qlog-optional">optional</span></div>' +
    '<div class="qlog-row">' + intBtns + '</div>' +
    '<div class="health-quickrow">' +
      '<div class="action-btn small primary" onclick="quickLogSave()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">SAVE</span></div></div>' +
      '</div>' +
      '<div class="action-btn small" onclick="closeQuickLog()">' +
        '<div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">CANCEL</span></div></div>' +
      '</div>' +
    '</div>';
}

function renderMoveHistory() {
  const list = document.getElementById('moveHistory');
  if (!list) return;
  if (!workouts.length) { list.innerHTML = '<div class="empty-state-mini">No workouts logged.</div>'; return; }
  const sorted = [...workouts].sort((a, b) => b.ts - a.ts);
  list.innerHTML = sorted.map(w => {
    const intensity = w.intensity ? ' · ' + w.intensity : '';
    const dist = w.distanceMi != null ? ' · ' + w.distanceMi + ' mi' : '';
    const setSum = (w.sets && w.sets.length) ? ' · ' + w.sets.length + ' sets' : '';
    return '<div class="health-row" onclick="openHealthDetail(\'workout\',\'' + w.id + '\')">' +
      '<div class="health-row-main">' +
        '<div class="health-row-title">' + w.type + ' <span class="health-chip dim">' + w.durationMin + 'm</span></div>' +
        '<div class="health-row-sub">' + fmtDateTime(w.ts) + intensity + dist + setSum + '</div>' +
      '</div><div class="health-row-action">→</div></div>';
  }).join('');
}

function promptAddWorkout() {
  haptic('tap');
  const type = window.prompt('Type? ' + MOVE_TYPES.join(' / '), 'LIFT');
  if (type === null) return;
  const tp = type.trim().toUpperCase();
  if (!MOVE_TYPES.includes(tp)) { showToast('INVALID TYPE'); return; }
  const durStr = window.prompt('Duration (minutes):', '');
  if (durStr === null) return;
  const dur = parseInt(durStr, 10);
  if (isNaN(dur) || dur <= 0) { showToast('INVALID DURATION'); return; }
  const intensity = window.prompt('Intensity? ' + MOVE_INTENSITIES.join(' / ') + ' (optional)', '');
  if (intensity === null) return;
  let it = intensity.trim().toUpperCase();
  if (it && !MOVE_INTENSITIES.includes(it)) { showToast('INVALID INTENSITY'); return; }
  if (!it) it = null;
  let distance = null;
  if (tp === 'RUN' || tp === 'WALK') {
    const dStr = window.prompt('Distance (mi)? (optional)', '');
    if (dStr === null) return;
    if (dStr.trim()) {
      distance = parseFloat(dStr);
      if (isNaN(distance) || distance < 0) { showToast('INVALID DISTANCE'); return; }
    }
  }
  let sets = null;
  if (tp === 'LIFT') {
    if (window.confirm('Add sets/reps/weight detail?')) {
      sets = [];
      while (true) {
        const ex = window.prompt('Exercise name (or cancel to finish):', '');
        if (ex === null || !ex.trim()) break;
        const repsStr = window.prompt('Reps?', '');
        if (repsStr === null) break;
        const reps = parseInt(repsStr, 10);
        if (isNaN(reps) || reps <= 0) { showToast('INVALID REPS'); continue; }
        const wtStr = window.prompt('Weight (lb)? (optional)', '');
        if (wtStr === null) break;
        let wt = null;
        if (wtStr.trim()) {
          wt = parseFloat(wtStr);
          if (isNaN(wt) || wt < 0) { showToast('INVALID WEIGHT'); continue; }
        }
        sets.push({ exercise: ex.trim(), reps: reps, weight: wt });
      }
      if (!sets.length) sets = null;
    }
  }
  const notes = window.prompt('Notes? (optional)', '');
  if (notes === null) return;
  workouts.push({ id: healthId('WO'), ts: Date.now(), type: tp, durationMin: dur, intensity: it, distanceMi: distance, sets: sets, notes: notes.trim() });
  saveWorkouts();
  renderMoveTab();
  showToast('WORKOUT LOGGED');
}

// --- Detail drawer -----------------------------------------------------------
function openHealthDetail(kind, id) {
  haptic('tap');
  const body = document.getElementById('healthDetailBody');
  const title = document.getElementById('healthDetailTitle');
  if (!body || !title) return;
  let rec = null;
  if (kind === 'fast')         rec = fasts.find(f => f.id === id);
  else if (kind === 'weighin') rec = weighins.find(w => w.id === id);
  else if (kind === 'meal')    rec = meals.find(m => m.id === id);
  else if (kind === 'workout') rec = workouts.find(w => w.id === id);
  if (!rec) { showToast('NOT FOUND'); return; }
  healthDetail = { kind, id };
  title.textContent = kind.toUpperCase();
  body.innerHTML = renderHealthDetailBody(kind, rec);
  document.getElementById('healthDetailSheet').classList.add('open');
}

function renderHealthDetailBody(kind, rec) {
  if (kind === 'fast') {
    const dur = rec.endTs ? fmtDuration(rec.endTs - rec.startTs, true) : fmtDuration(Date.now() - rec.startTs, true) + ' (active)';
    const hoursLabel = (rec.hours != null) ? rec.hours + ' h' : '—';
    return '<div class="detail-field"><div class="detail-label">DAY</div><div class="detail-value">' + (rec.dayNum != null ? rec.dayNum : '—') + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">START</div><div class="detail-value">' + fmtDateTime(rec.startTs) + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">END</div><div class="detail-value">' + (rec.endTs ? fmtDateTime(rec.endTs) : '—') + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">DURATION</div><div class="detail-value">' + dur + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">HOURS</div><div class="detail-value">' + hoursLabel + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">NOTES</div><div class="detail-value">' + (rec.notes || '—') + '</div></div>' +
      '<div class="health-quickrow">' +
        '<div class="action-btn small" onclick="editFastTimes()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">EDIT TIMES</span></div></div></div>' +
        '<div class="action-btn small" onclick="editFastNotes()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">EDIT NOTES</span></div></div></div>' +
        '<div class="action-btn small danger" onclick="deleteHealthRecord()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">DELETE</span></div></div></div>' +
      '</div>';
  }
  if (kind === 'weighin') {
    return '<div class="detail-field"><div class="detail-label">WEIGHT</div><div class="detail-value">' + rec.lbs + ' lb</div></div>' +
      '<div class="detail-field"><div class="detail-label">CONDITION</div><div class="detail-value">' + (rec.condition || '—') + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">WHEN</div><div class="detail-value">' + fmtDateTime(rec.ts) + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">NOTES</div><div class="detail-value">' + (rec.notes || '—') + '</div></div>' +
      '<div class="health-quickrow"><div class="action-btn small danger" onclick="deleteHealthRecord()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">DELETE</span></div></div></div></div>';
  }
  if (kind === 'meal') {
    return '<div class="detail-field"><div class="detail-label">NAME</div><div class="detail-value">' + (rec.name || '(unnamed)') + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">WHEN</div><div class="detail-value">' + fmtDateTime(rec.ts) + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">PORTION</div><div class="detail-value">' + rec.portion + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">TAG</div><div class="detail-value">' + rec.tag + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">CALORIES</div><div class="detail-value">' + (rec.calories != null ? rec.calories + ' kcal' : '—') + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">NOTES</div><div class="detail-value">' + (rec.notes || '—') + '</div></div>' +
      '<div class="health-quickrow"><div class="action-btn small danger" onclick="deleteHealthRecord()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">DELETE</span></div></div></div></div>';
  }
  if (kind === 'workout') {
    let setsHTML = '—';
    if (rec.sets && rec.sets.length) {
      setsHTML = rec.sets.map(s => s.exercise + ' · ' + s.reps + ' reps' + (s.weight != null ? ' @ ' + s.weight + ' lb' : '')).join('<br>');
    }
    return '<div class="detail-field"><div class="detail-label">TYPE</div><div class="detail-value">' + rec.type + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">WHEN</div><div class="detail-value">' + fmtDateTime(rec.ts) + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">DURATION</div><div class="detail-value">' + rec.durationMin + ' min</div></div>' +
      '<div class="detail-field"><div class="detail-label">INTENSITY</div><div class="detail-value">' + (rec.intensity || '—') + '</div></div>' +
      (rec.distanceMi != null ? '<div class="detail-field"><div class="detail-label">DISTANCE</div><div class="detail-value">' + rec.distanceMi + ' mi</div></div>' : '') +
      '<div class="detail-field"><div class="detail-label">SETS</div><div class="detail-value">' + setsHTML + '</div></div>' +
      '<div class="detail-field"><div class="detail-label">NOTES</div><div class="detail-value">' + (rec.notes || '—') + '</div></div>' +
      '<div class="health-quickrow"><div class="action-btn small danger" onclick="deleteHealthRecord()"><div class="socket"></div><div class="cap steel"><div class="lcd"><span class="lcd-text">DELETE</span></div></div></div></div>';
  }
  return '';
}

function closeHealthDetail() {
  document.getElementById('healthDetailSheet').classList.remove('open');
  healthDetail = null;
}

// One-prompt edit of just the active fast's start time, surfaced as a
// button on the live status card. Distinct from editFastTimes (which lives
// in the detail drawer and handles both start and end for completed fasts).
function editActiveFastStart() {
  const af = activeFast();
  if (!af) { showToast('NO ACTIVE FAST'); return; }
  haptic('tap');
  const startStr = window.prompt(
    'When did this fast actually start?\n\nFormat: YYYY-MM-DD HH:MM (24h)\nor MM/DD HH:MM (current year)',
    formatLocalDateTime(new Date(af.startTs))
  );
  if (startStr === null || !startStr.trim()) return;
  const newStart = parseLocalDateTime(startStr.trim());
  if (newStart == null) { showToast('INVALID DATE/TIME'); return; }
  if (newStart > Date.now()) { showToast('START CAN\'T BE IN THE FUTURE'); return; }
  af.startTs = newStart;
  saveFasts();
  renderFastTab();  // live timer re-anchors on next tick
  showToast('START UPDATED');
}

function editFastNotes() {
  if (!healthDetail || healthDetail.kind !== 'fast') return;
  const rec = fasts.find(f => f.id === healthDetail.id);
  if (!rec) return;
  const newNotes = window.prompt('Notes:', rec.notes || '');
  if (newNotes === null) return;
  rec.notes = newNotes.trim();
  saveFasts();
  openHealthDetail('fast', rec.id);
}

// Edit start (and end, if completed) of an existing fast. Same prompt
// pattern as logManualFast — defaults pre-fill with the record's current
// values so a small correction is just adjusting one number.
// For active fasts (no endTs), only start can be changed; the live timer
// will re-anchor to the new start automatically on next tick.
function editFastTimes() {
  if (!healthDetail || healthDetail.kind !== 'fast') return;
  const rec = fasts.find(f => f.id === healthDetail.id);
  if (!rec) return;
  haptic('tap');

  const startStr = window.prompt(
    'Start (edit):\n\nFormat: YYYY-MM-DD HH:MM (24h)\nor MM/DD HH:MM (current year)',
    formatLocalDateTime(new Date(rec.startTs))
  );
  if (startStr === null || !startStr.trim()) return;
  const newStart = parseLocalDateTime(startStr.trim());
  if (newStart == null) { showToast('INVALID START'); return; }

  let newEnd = rec.endTs;
  if (rec.endTs) {
    // Completed fast — also prompt for end.
    const endStr = window.prompt(
      'End (edit):\n\nFormat: YYYY-MM-DD HH:MM (24h)\nor MM/DD HH:MM (current year)',
      formatLocalDateTime(new Date(rec.endTs))
    );
    if (endStr === null || !endStr.trim()) return;
    newEnd = parseLocalDateTime(endStr.trim());
    if (newEnd == null) { showToast('INVALID END'); return; }
    if (newEnd <= newStart) { showToast('END MUST BE AFTER START'); return; }
    const durMs = newEnd - newStart;
    if (durMs > 7 * 24 * 60 * 60 * 1000) {
      if (!window.confirm('Duration is over 7 days. Are you sure?')) return;
    }
  } else {
    // Active fast — new start must be in the past (otherwise the live
    // timer would show a negative elapsed value).
    if (newStart > Date.now()) { showToast('START CAN\'T BE IN THE FUTURE'); return; }
  }

  rec.startTs = newStart;
  if (rec.endTs) {
    rec.endTs = newEnd;
    rec.hours = Math.round((newEnd - newStart) / (1000 * 60 * 15)) / 4;
  }
  // Leave dayNum alone — it's an identifier, not derived from timestamps.
  saveFasts();
  openHealthDetail('fast', rec.id);  // re-render detail with new values
  showToast('TIMES UPDATED');
}

function deleteHealthRecord() {
  if (!healthDetail) return;
  if (!window.confirm('Delete this record?')) return;
  const { kind, id } = healthDetail;
  if (kind === 'fast') { fasts = fasts.filter(f => f.id !== id); saveFasts(); }
  else if (kind === 'weighin') { weighins = weighins.filter(w => w.id !== id); saveWeighins(); }
  else if (kind === 'meal') { meals = meals.filter(m => m.id !== id); saveMeals(); }
  else if (kind === 'workout') { workouts = workouts.filter(w => w.id !== id); saveWorkouts(); }
  closeHealthDetail();
  setHealthTab(healthTab);
  showToast('DELETED');
}

