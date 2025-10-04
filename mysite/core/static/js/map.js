// map.js — expects GEOJSON_URL and CSV_URL variables set in the page template
document.addEventListener('DOMContentLoaded', function () {
  window.map = L.map('map').setView([22.57, 87.0], 7);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(window.map);

  function getAreaName(props) {
    return (props &&
      (props.D_NAME || props.district || props.NAME || props.S_NAME || props.STATE_NAME || props.state_name)
    ) || 'Unknown';
  }

  function getAreaLevel(props) {
    if (!props) return 'unknown';
    if (props.D_NAME || props.district || props.DIST_ID) return 'district';
    if (props.STATE_NAME || props.state_name || props.STATE || props.state) return 'state';
    return props.LEVEL || 'unknown';
  }

  var areaLayer = null;
  var featureMap = {};

  var geojsonUrl = (typeof GEOJSON_URL !== 'undefined') ? GEOJSON_URL : '/static/geojson/combined_regions.geojson';
  var csvUrl = (typeof CSV_URL !== 'undefined') ? CSV_URL : '/static/geojson/districts_from_geojson.csv';

  fetch(geojsonUrl)
    .then(function (r) {
      if (!r.ok) throw new Error('GeoJSON not found: ' + r.status);
      return r.json();
    })
    .then(function (data) {
      areaLayer = L.geoJSON(data, {
        style: function (f) {
          const lvl = getAreaLevel(f.properties);
          return {
            color: (lvl === 'state' ? '#111' : '#2b7'), // darker outline for states
            weight: (lvl === 'state' ? 2 : 1),
            fillOpacity: 0.12
          };
        },
        onEachFeature: function (feature, layer) {
          var name = getAreaName(feature.properties);
          var level = getAreaLevel(feature.properties);
          layer.bindPopup('<strong>' + name + '</strong><br/>(' + level + ')');
          layer.on('click', function () {
            layer.openPopup();
            highlightFeature(layer);
            var sel = document.getElementById('district-select');
            if (sel) sel.value = name;
          });
          featureMap[name] = layer;
        }
      }).addTo(window.map);

      try { window.map.fitBounds(areaLayer.getBounds(), {padding:[20,20]}); } catch(e){}

      populateDropdownFromGeoJSON(data);
    })
    .catch(function (err) {
      console.error('Failed to load geojson:', err);
    });

  function populateDropdownFromCSV() {
    fetch(csvUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('CSV not found: ' + r.status);
        return r.text();
      })
      .then(function (text) {
        var rows = text.trim().split('\n');
        if (rows.length < 2) return;
        rows.shift();
        var sel = document.getElementById('district-select');
        sel.innerHTML = '';
        var seen = new Set();
        rows.forEach(function (line) {
          var cols = line.split(',');
          var dname = cols[2] ? cols[2].replace(/(^"|"$)/g,'') : null;
          if (dname && !seen.has(dname)) {
            seen.add(dname);
            var opt = document.createElement('option');
            opt.value = dname;
            opt.textContent = dname;
            sel.appendChild(opt);
          }
        });
      })
      .catch(function (err) {
        console.warn('Could not load CSV for dropdown:', err);
      });
  }

  function populateDropdownFromGeoJSON(geojson) {
    var sel = document.getElementById('district-select');
    sel.innerHTML = '';
    var seen = new Set();
    (geojson.features || []).forEach(function (f) {
      var name = getAreaName(f.properties);
      if (!seen.has(name)) {
        seen.add(name);
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      }
    });
    populateDropdownFromCSV();
  }

  var lastHighlighted = null;
  function highlightFeature(layer) {
    if (lastHighlighted && lastHighlighted !== layer) {
      try { areaLayer.resetStyle(lastHighlighted); } catch(e){}
    }
    const lvl = getAreaLevel(layer.feature.properties);
    layer.setStyle({
      color: (lvl === 'state' ? '#d00' : '#f00'),
      weight: (lvl === 'state' ? 3 : 2),
      fillOpacity: 0.25
    });
    lastHighlighted = layer;
    if (layer.bringToFront) layer.bringToFront();
  }

  document.getElementById('zoom-to-district').addEventListener('click', function () {
    var sel = document.getElementById('district-select');
    var name = sel.value;
    if (!name) return alert('Select an area first');
    var layer = featureMap[name];
    if (!layer) return alert('Polygon not found: ' + name);
    highlightFeature(layer);
    try { window.map.fitBounds(layer.getBounds(), {padding:[20,20]}); } catch(e) { console.error(e); }
    layer.openPopup();
  });

  document.getElementById('district-select').addEventListener('change', function () {
    var name = this.value;
    var layer = featureMap[name];
    if (layer) {
      highlightFeature(layer);
      try { window.map.fitBounds(layer.getBounds(), {padding:[20,20]}); } catch(e){}
    }
  });
});