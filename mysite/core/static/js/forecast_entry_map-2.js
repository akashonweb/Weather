// core/static/js/forecast_entry_map.js
// Forecast entry frontend: supports district + state polygons, selection, apply, clear, save/load.
// Expects template to define GEOJSON_URL (path to combined GeoJSON).
// Expects districts CSV at /static/data/districts_from_geojson.csv
//
// IMPORTANT: adapt featureId/featureName/featureStateKey helpers below if your GeoJSON uses different property names.

const rainfallColor = {
  DRY: "#d3d3d3",
  ISOL: "#a4c2f4",
  SCT: "#6fa8dc",
  FWS: "#3d85c6",
  WS: "#1c4587",
};

const el = {
  map: document.getElementById("fe_map"),
  date: document.getElementById("fe_selectedDate"),
  todayBtn: document.getElementById("fe_todayBtn"),
  granularity: document.getElementById("fe_granularity"),
  categorySelect: document.getElementById("fe_categorySelect"),
  applyBtn: document.getElementById("fe_applyBtn"),
  clearBtn: document.getElementById("fe_clearBtn"),
  saveBtn: document.getElementById("fe_saveBtn"),
  legend: document.getElementById("fe_legend"),
};

// internal state
let feMap = null;
let districtLayer = null;
let stateLayer = null;
let mapData = []; // array of {id: area_id_string, name, level:'district'|'state', rainfallCategory, rainfall_mm}
let selectedAreas = []; // array of area_id strings
let districtsByState = {}; // mapping state_code -> [area_id_for_district,...]

// default CSV path (place your updated CSV here)
const DISTRICTS_CSV_PATH = "/static/data/districts_from_geojson.csv";

// helpers: adapt these if your geojson uses different keys
function featureId(feature) {
  // try common properties: DIST_ID / dist_id / id; otherwise fallback to name-based id
  const p = feature && feature.properties ? feature.properties : {};
  return (p.DIST_ID || p.dist_id || p.DISTCODE || p.distcode) ? `D_${p.DIST_ID || p.dist_id || p.DISTCODE || p.distcode}` :
         (p.STATE_CODE || p.state_code || p.STATE || p.state) ? `S_${p.STATE_CODE || p.state_code || p.STATE || p.state}` :
         (p.id ? String(p.id) : (p.NAME ? `UNK_${p.NAME}` : `UNK_${Math.random().toString(36).slice(2,8)}`));
}
function featureName(feature) {
  const p = feature && feature.properties ? feature.properties : {};
  return p.DIST_NAME || p.dist_name || p.NAME || p.name || p.STATE_NAME || p.state_name || "Unknown";
}
function featureLevel(feature) {
  const p = feature && feature.properties ? feature.properties : {};
  // presence of district id or district name => district; otherwise state
  if (p.DIST_ID || p.dist_id || p.DIST_NAME || p.dist_name) return "district";
  return "state";
}
function featureStateCode(feature) {
  // useful for mapping
  const p = feature && feature.properties ? feature.properties : {};
  return p.STATE_CODE || p.state_code || p.STATE || p.state || null;
}

// find mapData entry by id
function getMapDataEntry(id) {
  return mapData.find(m => String(m.id) === String(id));
}

// styling for geojson
function styleForFeature(feature) {
  const id = featureId(feature);
  const entry = getMapDataEntry(id);
  const cat = entry ? entry.rainfallCategory : "DRY";
  const sel = selectedAreas.includes(id);
  const level = feature.properties.LEVEL || featureLevel(feature);
  return {
    fillColor: rainfallColor[cat] || rainfallColor.DRY,
    fillOpacity: 0.85,
    color: sel ? "#2ecc71" : (level === "state" ? "#111" : "#444444"),
    weight: sel ? 3 : (level === "state" ? 2 : 1),
  };
}

function onEachFeature(feature, layer) {
  const id = featureId(feature);
  const name = featureName(feature);
  const level = featureLevel(feature);

  layer.bindTooltip(() => `<strong>${name}</strong><br/>Level: ${level}<br/>Category: ${getMapDataEntry(id)?.rainfallCategory || 'DRY'}`, { sticky: true });

  layer.on({
    mouseover(e) {
      e.target.setStyle({ weight: 3, color: "#ff9900" });
      e.target.openTooltip();
    },
    mouseout(e) {
      if (districtLayer) districtLayer.resetStyle(e.target);
      if (stateLayer) stateLayer.resetStyle(e.target);
      e.target.closeTooltip();
    },
    click(e) {
      // toggle selection
      if (selectedAreas.includes(id)) selectedAreas = selectedAreas.filter(x => x !== id);
      else selectedAreas.push(id);

      // refresh styling
      if (districtLayer) districtLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));
      if (stateLayer) stateLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));

      updateApplyState();
      renderLegend();
    }
  });
}

// load CSV mapping (simple CSV parse)
async function loadDistrictsCsv() {
  try {
    const r = await fetch(DISTRICTS_CSV_PATH, { credentials: 'same-origin' });
    if (!r.ok) throw new Error(`CSV fetch ${r.status}`);
    const txt = await r.text();
    // parse: assume header row, comma-separated
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const header = lines.shift().split(',').map(h => h.trim().toLowerCase());
    districtsByState = {};
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length !== header.length) continue;
      const obj = {};
      header.forEach((h,i) => obj[h] = parts[i]);
      // typical expected headers: dist_id, state_code, dist_name
      const state_code = obj.state_code || obj.state || obj.state_name;
      const dist_id = obj.dist_id || obj.distcode || obj.distcode_id || obj.geo_id || obj.id;
      if (!state_code || !dist_id) continue;
      const areaId = `D_${dist_id}`;
      if (!districtsByState[state_code]) districtsByState[state_code] = [];
      districtsByState[state_code].push(areaId);
    }
    console.log("Loaded districts CSV mapping: states:", Object.keys(districtsByState).length);
  } catch (err) {
    console.warn("Failed to load districts CSV:", err);
    districtsByState = {};
  }
}

// apply granularity (show/hide layers)
function applyGranularity() {
  const val = el.granularity ? el.granularity.value : "both";
  if (!feMap) return;
  if (val === 'districts') {
    if (feMap.hasLayer(stateLayer)) feMap.removeLayer(stateLayer);
    if (districtLayer && !feMap.hasLayer(districtLayer)) feMap.addLayer(districtLayer);
  } else if (val === 'states') {
    if (feMap.hasLayer(districtLayer)) feMap.removeLayer(districtLayer);
    if (stateLayer && !feMap.hasLayer(stateLayer)) feMap.addLayer(stateLayer);
  } else {
    if (districtLayer && !feMap.hasLayer(districtLayer)) feMap.addLayer(districtLayer);
    if (stateLayer && !feMap.hasLayer(stateLayer)) feMap.addLayer(stateLayer);
  }
}

// Apply selectedCategory to currently selectedAreas.
// If a state id is in selectedAreas, expand it to its districts using districtsByState
function applySelectedCategory() {
  const cat = el.categorySelect.value;
  if (!cat) return;
  const selectedCopy = [...selectedAreas]; // avoid mutation issues
  const stateIds = selectedCopy.filter(id => String(id).startsWith('S_'));
  const districtIds = selectedCopy.filter(id => String(id).startsWith('D_'));

  // apply to direct districts
  districtIds.forEach(did => {
    const rec = getMapDataEntry(did);
    if (rec) rec.rainfallCategory = cat;
  });

  // expand each state to its districts via mapping
  for (const sid of stateIds) {
    const state_code = String(sid).replace(/^S_/, '');
    const districts = districtsByState[state_code] || [];
    districts.forEach(areaId => {
      const rec = getMapDataEntry(areaId);
      if (rec) rec.rainfallCategory = cat;
    });
  }

  // refresh styles
  if (districtLayer) districtLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));
  if (stateLayer) stateLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));

  renderLegend();
  updateApplyState();
}

// helper styleForFeature for re-use
function featureId(feature) {
  return (feature && feature.properties) ? (
    (feature.properties.DIST_ID || feature.properties.dist_id || feature.properties.DISTCODE || feature.properties.distcode) ? `D_${feature.properties.DIST_ID || feature.properties.dist_id || feature.properties.DISTCODE || feature.properties.distcode}` :
    (feature.properties.STATE_CODE || feature.properties.state_code || feature.properties.STATE || feature.properties.state) ? `S_${feature.properties.STATE_CODE || feature.properties.state_code || feature.properties.STATE || feature.properties.state}` :
    (feature.properties.id ? String(feature.properties.id) : `UNK_${Math.random().toString(36).slice(2,8)}`)
  ) : null;
}

// render legend counts & selected list
function renderLegend() {
  if (!el.legend) return;
  const counts = { DRY:0, ISOL:0, SCT:0, FWS:0, WS:0 };
  mapData.forEach(d => { counts[d.rainfallCategory] = (counts[d.rainfallCategory] || 0) + 1; });
  const legendHtml = `<div class="font-semibold mb-2">Legend</div>` +
    Object.entries(rainfallColor).map(([k,v]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:20px;height:12px;background:${v};border:1px solid #ddd"></div>
          <div>${k}</div>
        </div>
        <div style="color:#6b7280;font-size:12px">${counts[k] || 0}</div>
      </div>
    `).join('') +
    `<div style="margin-top:8px;font-size:13px"><strong>Selected:</strong> ${selectedAreas.length === 0 ? 'None' : selectedAreas.join(', ')}</div>`;
  el.legend.innerHTML = legendHtml;
}

// Save full map forecast via POST to backend
async function saveFullMapForecast() {
  // build payload: date + map data (area_id -> {category, rainfall_mm})
  const dateIso = el.date ? el.date.value : null;
  if (!dateIso) { alert("Please select a date before saving"); return; }
  const dataObj = {};
  mapData.forEach(item => {
    dataObj[String(item.id)] = {
      category: item.rainfallCategory || "DRY",
      rainfall_mm: item.rainfall_mm ?? null,
      name: item.name || null,
      level: item.level || null,
    };
  });

  // CSRF token
  function getCookie(name) {
    const v = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return v ? decodeURIComponent(v.split('=')[1]) : null;
  }
  const csrftoken = getCookie('csrftoken');

  const payload = { date: dateIso, scope: "mixed", data: dataObj };

  try {
    const resp = await fetch('/forecast/save_map/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Save failed:", resp.status, text);
      alert("Save failed: " + resp.status);
      return;
    }
    const j = await resp.json();
    if (j.ok) {
      alert(`Forecast saved for ${j.date}`);
    } else {
      alert("Save returned not-ok");
    }
  } catch (err) {
    console.error("Save error:", err);
    alert("Save error: see console");
  }
}

// Load for selected date (if exists)
async function loadMapForecastForDate(dateIso) {
  try {
    const resp = await fetch(`/forecast/get_map/?date=${encodeURIComponent(dateIso)}`, { credentials: 'same-origin' });
    if (!resp.ok) { console.warn("Load fetch failed", resp.status); return null; }
    const j = await resp.json();
    if (!j.ok || !j.found) { console.log("No saved forecast for date", dateIso); return null; }
    // j.data: area_id -> {category,...}
    const dmap = j.data || {};
    // apply to mapData entries
    mapData.forEach(entry => {
      const key = String(entry.id);
      if (dmap[key]) {
        entry.rainfallCategory = dmap[key].category || entry.rainfallCategory || "DRY";
        entry.rainfall_mm = dmap[key].rainfall_mm ?? entry.rainfall_mm ?? null;
      }
    });
    // restyle
    if (districtLayer) districtLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));
    if (stateLayer) stateLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature)));
    renderLegend();
    return j;
  } catch (err) {
    console.error("Load error:", err);
    return null;
  }
}

// Initialize map & layers
async function init() {
  if (typeof L === 'undefined') {
    console.error("Leaflet not loaded.");
    return;
  }
  if (!el.map) { console.error("#fe_map not found"); return; }

  // init map
  feMap = L.map(el.map).setView([23.6, 87.0], 6);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(feMap);

  // load csv mapping first (optional)
  await loadDistrictsCsv();

  // fetch geojson
  if (typeof GEOJSON_URL === 'undefined' || !GEOJSON_URL) {
    console.error("GEOJSON_URL not defined in template. Please set it to your combined geojson static path.");
    el.legend && (el.legend.innerHTML = "<div style='color:#b91c1c'>GEOJSON_URL not set</div>");
    return;
  }

  try {
    const r = await fetch(GEOJSON_URL, { credentials: 'same-origin' });
    if (!r.ok) throw new Error("GeoJSON fetch failed: " + r.status);
    const gj = await r.json();
    const features = (gj.type === 'FeatureCollection') ? gj.features : (Array.isArray(gj) ? gj : []);
    // split into district & state features
    const districtFeatures = [];
    const stateFeatures = [];
    features.forEach(f => {
      if (featureLevel(f) === 'district') districtFeatures.push(f);
      else stateFeatures.push(f);
    });

    // init mapData entries for all features
    mapData = [];
    districtFeatures.forEach(f => {
      const id = `D_${(f.properties.DIST_ID || f.properties.dist_id || f.properties.distcode || f.properties.id)}`;
      const name = featureName(f);
      mapData.push({ id, name, level: 'district', rainfallCategory: 'DRY', rainfall_mm: null });
    });
    stateFeatures.forEach(f => {
      // state id: S_STATECODE (must be consistent with CSV state_code)
      const code = (f.properties.STATE_CODE || f.properties.state_code || f.properties.STATE || f.properties.state || f.properties.STATE_NAME || f.properties.state_name);
      const id = `S_${code}`;
      const name = featureName(f);
      mapData.push({ id, name, level: 'state', rainfallCategory: 'DRY', rainfall_mm: null });
    });

    // add layers
    districtLayer = L.geoJSON({ type:'FeatureCollection', features: districtFeatures }, { style: styleForFeature, onEachFeature }).addTo(feMap);
    stateLayer = L.geoJSON({ type:'FeatureCollection', features: stateFeatures }, { style: styleForFeature, onEachFeature }).addTo(feMap);

    // fit bounds
    try {
      const bounds = districtLayer.getBounds().extend(stateLayer.getBounds());
      if (bounds.isValid()) feMap.fitBounds(bounds.pad(0.12));
    } catch (e) {}

    renderLegend();
    applyGranularity();

    // wire UI
    if (el.granularity) el.granularity.addEventListener('change', applyGranularity);
    if (el.applyBtn) el.applyBtn.addEventListener('click', applySelectedCategory);
    if (el.clearBtn) el.clearBtn.addEventListener('click', () => { selectedAreas = []; if (districtLayer) districtLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature))); if (stateLayer) stateLayer.eachLayer(l => l.setStyle(styleForFeature(l.feature))); updateApplyState(); renderLegend(); });
    if (el.saveBtn) el.saveBtn.addEventListener('click', saveFullMapForecast);
    if (el.categorySelect) el.categorySelect.addEventListener('change', updateApplyState);

    // init datepicker (flatpickr)
    if (typeof flatpickr !== 'undefined' && el.date) {
      flatpickr(el.date, {
        defaultDate: new Date(),
        dateFormat: "Y-m-d",
        onChange(selectedDates, str) {
          // When date changes, load any saved map forecast for that date
          if (str) loadMapForecastForDate(str);
        }
      });
    } else if (el.date) {
      el.date.type = 'date';
      el.date.addEventListener('change', () => { if (el.date.value) loadMapForecastForDate(el.date.value); });
    }
    if (el.todayBtn) el.todayBtn.addEventListener('click', () => {
      const today = new Date().toISOString().slice(0,10);
      if (el.date) { el.date.value = today; loadMapForecastForDate(today); }
    });

    updateApplyState();

  } catch (err) {
    console.error("Failed to initialize forecast map:", err);
    if (el.legend) el.legend.innerHTML = `<div style="color:#b91c1c">GeoJSON load failed: ${err.message}</div>`;
  }
}

function updateApplyState() {
  const cat = el.categorySelect ? el.categorySelect.value : "";
  const ok = cat !== "" && selectedAreas.length > 0;
  if (!el.applyBtn) return;
  el.applyBtn.disabled = !ok;
  if (ok) {
    el.applyBtn.classList.remove("bg-slate-300","cursor-not-allowed");
    el.applyBtn.classList.add("bg-sky-600","hover:bg-sky-700");
  } else {
    el.applyBtn.classList.add("bg-slate-300","cursor-not-allowed");
    el.applyBtn.classList.remove("bg-sky-600","hover:bg-sky-700");
  }
}

// init
document.addEventListener('DOMContentLoaded', () => { init().catch(e => console.error("init error", e)); });
