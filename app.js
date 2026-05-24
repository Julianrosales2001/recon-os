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
let editingId = null;           // currently editing POI id
let selectedCategory = 'WAYPOINT';
let selectedType = 'NONE';
let selectedShape = 'FLAG';
let editorPhoto = null;         // base64 data URL for photo being edited
let editorHVA = false;          // HVA state for POI being edited
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
  } catch (e) {
    pois = [];
  }
}
function savePOIs() {
  localStorage.setItem('recon.os.pois', JSON.stringify(pois));
}

function loadFog() {
  try {
    const raw = localStorage.getItem('recon.os.fog');
    revealedCells = new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    revealedCells = new Set();
  }
}
function saveFog() {
  // Throttled — saving on every cell add would thrash storage
  if (saveFog._timer) clearTimeout(saveFog._timer);
  saveFog._timer = setTimeout(() => {
    localStorage.setItem('recon.os.fog', JSON.stringify([...revealedCells]));
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
}
function saveRegions() {
  localStorage.setItem('recon.os.regions', JSON.stringify(regions));
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
  localStorage.setItem('recon.os.journal', JSON.stringify(journalEntries));
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
    todayTrail = raw ? JSON.parse(raw) : [];
  } catch (e) {
    todayTrail = [];
  }
  pruneTrailToToday();
}

function saveTrail() {
  if (saveTrail._timer) clearTimeout(saveTrail._timer);
  saveTrail._timer = setTimeout(() => {
    localStorage.setItem('recon.os.trail', JSON.stringify(todayTrail));
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
  } catch (e) { /* ignore */ }
}

function savePrefs() {
  if (savePrefs._timer) clearTimeout(savePrefs._timer);
  savePrefs._timer = setTimeout(() => {
    localStorage.setItem('recon.os.prefs', JSON.stringify({
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
    }));
  }, 500);
}

let prefLegendOpen = false;
let prefFogOpacity = 'HEAVY';  // 'CLEAR' | 'LIGHT' | 'MEDIUM' | 'HEAVY'
let prefShowBoundaries = false;

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
    document.getElementById('regionTitle').textContent = '▾ ' + region.name;
    document.getElementById('sectorTag').textContent =
      region.name.replace(' REGION', '') + ' · ' + sid + ' · ' + region.revealedSectors.length + ' SCT';
  }
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

    region.boundary = {
      type: t,
      coords: data.geojson.coordinates,
      fetched: Date.now(),
    };
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
  const targets = regions.filter(r => !r.boundary);
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

  // Tolerance for simplification (meters). Higher = less detail.
  const SIMPLIFY_TOL_M = 400;

  // Collect label positions so we can hide colliding ones
  const placedLabels = [];  // each: { lat, lng, text, radius (px) }
  const mapZoom = map.getZoom();

  regions.forEach(r => {
    if (!r.boundary) return;
    let coords = geoJsonToLeafletCoords(r.boundary.type, r.boundary.coords);
    if (coords.length === 0) return;

    // Reduce MultiPolygon to its largest piece
    coords = keepLargestPiece(r.boundary.type, coords);
    // coords now is an array of rings: [outerRing, hole1, hole2, ...]
    if (!Array.isArray(coords[0]) || !Array.isArray(coords[0][0])) return;

    // Simplify each ring
    coords = coords.map(ring => simplifyRing(ring, SIMPLIFY_TOL_M));
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
  if (indicator) indicator.style.color = prefShowBoundaries ? '#f0a040' : '#3a3128';
}

// ===== UI HELPERS =====
function showToast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.classList.add('visible');
  setTimeout(() => t.classList.remove('visible'), 1800);
}

function flashMark() {
  const f = document.getElementById('markFlash');
  f.classList.remove('active');
  void f.offsetWidth;
  f.classList.add('active');
  if (navigator.vibrate) navigator.vibrate(40);
}

function updateClock() {
  const d = new Date();
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  document.getElementById('clock').textContent = h + ':' + m;
}
setInterval(updateClock, 30000);
updateClock();

// ===== MAP =====
function initMap() {
  map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
  }).setView([29.74, -94.99], 14); // default — Baytown area; will recenter on GPS fix

  const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    detectRetina: true,
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
  });

  markerLayer = L.layerGroup().addTo(map);
  renderAllMarkers();

  // Defer fog rendering slightly so tiles get a chance to start loading first
  setTimeout(renderFog, 100);

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

  // Combine outer + holes into one multi-polygon
  fogPolygon = L.polygon([outer, ...holes], {
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

  if (navigator.vibrate) navigator.vibrate(25);
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
  document.getElementById('sectorTag').textContent = text;
  if (color) document.getElementById('gpsDot').style.color = color;
  dbg('STATUS: ' + text);
}

// Update user position state from a GeolocationCoordinates object.
// Shared by watchPosition, retryGPSOnGesture, and pull-to-refresh.
function applyGpsCoords(coords) {
  const { latitude, longitude, accuracy, altitude, heading, speed } = coords;
  userPos = { lat: latitude, lng: longitude, acc: accuracy };
  userAltitudeM = (typeof altitude === 'number') ? altitude : null;
  // Keep last known heading on slow/stop so the arrow doesn't blink off
  if (typeof heading === 'number' && !isNaN(heading) && (speed === null || speed > 0.5)) {
    userHeading = heading;
  }
  lastFix = Date.now();
}

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
      document.getElementById('regionTitle').textContent = '▾ NO POSITION';
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
      document.getElementById('gpsDot').style.color = '#ef4a3f';
    }
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
    if (navigator.vibrate) navigator.vibrate(20);
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
    hva: false,
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

  // Load HVA
  editorHVA = poi.hva || false;
  updateHVAUI();

  // Show visit info only for classified POIs
  const visitRow = document.getElementById('visitRow');
  if (poi.category) {
    visitRow.style.display = 'block';
    document.getElementById('visitNum').textContent = String(poi.visits || 0).padStart(3, '0');
    document.getElementById('visitLast').textContent = poi.lastVisited
      ? 'LAST: ' + new Date(poi.lastVisited).toLocaleDateString()
      : 'NEVER VISITED';
  } else {
    visitRow.style.display = 'none';
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
    chip.className = 'cat-chip' + (selectedShape === s.id ? ' active' : '');
    chip.textContent = s.label;
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
  document.getElementById('trailToggleIndicator').style.color = showTrail ? '#f0a040' : '#3a3128';
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
  const hvaCount = pois.filter(p => p.hva).length;

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
        <div class="label">HVA</div>
        <div class="value">${String(hvaCount).padStart(3, '0')}</div>
        <div class="sub">manual</div>
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
function onPhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    editorPhoto = e.target.result;
    updatePhotoUI();
  };
  reader.readAsDataURL(file);
  // Reset input so selecting the same file twice still triggers change
  event.target.value = '';
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

// ===== HVA TOGGLE =====
function toggleHVA() {
  editorHVA = !editorHVA;
  updateHVAUI();
}

function updateHVAUI() {
  const toggle = document.getElementById('hvaToggle');
  if (editorHVA) {
    toggle.classList.add('on');
  } else {
    toggle.classList.remove('on');
  }
}

function savePOI() {
  const poi = pois.find(p => p.id === editingId);
  if (!poi) return;
  const wasClassified = !!poi.category;
  const oldHVA = poi.hva;
  // Snapshot for undo
  const beforeSnapshot = JSON.parse(JSON.stringify(poi));
  poi.category = selectedCategory;
  poi.type = selectedType;
  poi.shape = selectedShape;
  poi.name = document.getElementById('poiName').value.trim();
  poi.notes = document.getElementById('poiNotes').value.trim();
  poi.photo = editorPhoto;
  poi.hva = editorHVA;
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
  if (editorHVA && !oldHVA) {
    logEvent('hva', poi.id, 'Marked HVA: ' + displayName, poi.category);
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
    chip.className = 'cat-chip' + (activeCategoryFilter === c.id ? ' active' : '');
    chip.textContent = c.label;
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
    row.className = 'list-row' + (p.hva ? ' hva' : '');
    const starHTML = p.hva ? '<span class="hva-star">★</span>' : '';
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
  document.getElementById('pendingLabel').textContent = n > 0 ? `PENDING ${n}` : 'PENDING';
}

// ===== JOURNAL SHEET =====
let journalRange = 'today';  // 'today' | 'week' | 'month' | 'all'

function setupJournalRangeChips() {
  const chips = document.querySelectorAll('#journalRangeRow .cat-chip');
  chips.forEach(chip => {
    chip.onclick = () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
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
  editingId = null;
  liveNavPoiId = null;
  deselectPOI();
}

// ===== LEGEND TOGGLE =====
function buildLegend() {
  const rows = document.getElementById('legendRows');
  rows.innerHTML = '';
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
buildLegend();

function toggleLegend() {
  const panel = document.getElementById('legendPanel');
  const btn = document.getElementById('legendBtn');
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    btn.classList.add('active');
    prefLegendOpen = true;
  } else {
    panel.style.display = 'none';
    btn.classList.remove('active');
    prefLegendOpen = false;
  }
  savePrefs();
}

// Apply saved legend state on load
function applyLegendPref() {
  const panel = document.getElementById('legendPanel');
  const btn = document.getElementById('legendBtn');
  if (prefLegendOpen) {
    panel.style.display = 'block';
    btn.classList.add('active');
  }
}

// ===== SETTINGS =====
function openSettingsSheet() {
  document.getElementById('fogCellCount').textContent =
    revealedCells.size + ' cells revealed';
  document.getElementById('regionCountDesc').textContent =
    regions.length + (regions.length === 1 ? ' region' : ' regions');
  document.getElementById('trailToggleDesc').textContent = showTrail ? 'Trail visible' : 'Trail hidden';
  document.getElementById('trailToggleIndicator').style.color = showTrail ? '#f0a040' : '#3a3128';
  document.getElementById('trailPointCount').textContent = todayTrail.length + ' points';
  document.getElementById('boundaryToggleDesc').textContent = prefShowBoundaries ? 'Boundaries visible' : 'Boundaries hidden';
  document.getElementById('boundaryToggleIndicator').style.color = prefShowBoundaries ? '#f0a040' : '#3a3128';
  setupFogDensityChips();
  document.getElementById('sheetOverlay').classList.add('open');
  document.getElementById('settingsSheet').classList.add('open');
}

function setupFogDensityChips() {
  const chips = document.querySelectorAll('#fogDensityRow .cat-chip');
  chips.forEach(chip => {
    if (chip.dataset.fog === prefFogOpacity) chip.classList.add('active');
    else chip.classList.remove('active');
    chip.onclick = () => {
      prefFogOpacity = chip.dataset.fog;
      chips.forEach(c => c.classList.toggle('active', c.dataset.fog === prefFogOpacity));
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
    const boundary = r.boundary ? '✓ boundary' : '— no boundary';
    return `${star}${i+1}. ${r.name}\n   ${r.revealedSectors.length} sectors · ${boundary}`;
  });
  // Build a prompt: pick a region to fetch a missing boundary
  const missing = regions.filter(r => !r.boundary);
  let extra = '';
  if (missing.length > 0) {
    extra = '\n\n' + missing.length + ' region(s) missing boundaries.\nUse FETCH ALL BOUNDARIES in settings.';
  }
  alert('ACTIVE REGIONS:\n\n' + lines.join('\n\n') +
        '\n\n(★ = current region)' + extra);
}

function exportData() {
  const data = {
    version: 5,
    exported: new Date().toISOString(),
    pois: pois,
    fog: [...revealedCells],
    regions: regions,
    journal: journalEntries,
    trail: todayTrail,
    prefs: {
      showTrail: showTrail,
      activeCategoryFilter: activeCategoryFilter,
      activeRegionFilter: activeRegionFilter,
      listSearchQuery: listSearchQuery,
      listSortMode: listSortMode,
      legendOpen: prefLegendOpen,
      fogOpacity: prefFogOpacity,
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
  const counts = pois.length + ' POIs · ' + revealedCells.size + ' fog cells · ' + regions.length + ' regions';
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
                   (data.journal ? data.journal.length : 0) + ' journal entries\n\n' +
                   'Your current data will be lost.')) {
        return;
      }
      pois = data.pois;
      savePOIs();
      if (data.fog) {
        revealedCells = new Set(data.fog);
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
        savePrefs();
      }
      renderAllMarkers();
      updatePendingCount();
      closeSheet();
      showToast('IMPORT COMPLETE · ' + pois.length + ' POIs');
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


// ===== INIT =====
loadPrefs();
loadPOIs();
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