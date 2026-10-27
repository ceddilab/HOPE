document.addEventListener("DOMContentLoaded", () => {
  let coordinates = [];
  let clusterCenters = [];
  let routePaths = [];
  let numClusters = 3;
  let isClustersSelected = false;
  const clusterColors = ["#1e90ff", "#2ecc71", "#9b59b6", "#f1c40f", "#e67e22", "#e74c3c"];

  const fileInput = document.getElementById("file-upload");
  const clusterInput = document.getElementById("num-clusters");
  const confirmBtn = document.getElementById("confirm-clusters");
  const startBtn = document.getElementById("start-clustering");
  const statusText = document.getElementById("status-text");
  const recommendedBox = document.getElementById("recommended-depots");
  const recommendedList = document.getElementById("recommended-list");
  let recommendedDepots = [];

  const map = L.map("map").setView([36.7783, -119.4179], 6);
  const bounds = L.latLngBounds();
  let inputLayer = L.layerGroup().addTo(map);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  function setStatus(message) {
    if (statusText) statusText.textContent = message;
  }

  function locateUser() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.setView([latitude, longitude], 7);
        L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup("You are here");
        bounds.extend([latitude, longitude]);
      },
      () => {
        console.warn("Geolocation not allowed or unavailable.");
      }
    );
  }

  function plotInputPoints() {
    inputLayer.clearLayers();
    coordinates.forEach((coord, index) => {
      L.circleMarker([coord.latitude, coord.longitude], {
        radius: 5,
        color: "#ffd369",
        fillOpacity: 0.75,
      })
        .bindPopup(coord.name || `Point ${index + 1}`)
        .addTo(inputLayer);
      bounds.extend([coord.latitude, coord.longitude]);
    });
    if (coordinates.length) map.fitBounds(bounds.pad(0.15));
  }

  function usePoints(points, sourceLabel) {
    coordinates = points.filter((p) => p.latitude && p.longitude);
    if (!coordinates.length) {
      setStatus("No valid latitude/longitude points found.");
      return;
    }
    plotInputPoints();
    setStatus(`Loaded ${coordinates.length} points from ${sourceLabel}. Confirm depot count, then run clustering.`);
  }

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const list = Array.isArray(data) ? data : data.points || data.hazards || [];
          usePoints(list, file.name);
        } catch (error) {
          setStatus("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (result) => usePoints(result.data, file.name),
      });
    } else {
      setStatus("Please upload a valid .json or .csv file.");
    }
  });

  confirmBtn.addEventListener("click", () => {
    numClusters = parseInt(clusterInput.value, 10);
    if (isNaN(numClusters) || numClusters < 1) {
      setStatus("Enter a valid number of depots.");
      return;
    }
    isClustersSelected = true;
    startBtn.style.display = "inline";
    setStatus(`Ready to recommend ${numClusters} depot(s).`);
  });

  startBtn.addEventListener("click", () => {
    if (!isClustersSelected || coordinates.length === 0) {
      setStatus("Load points and confirm depot count first.");
      return;
    }

    const points = coordinates.map((coord) =>
      turf.point([coord.longitude, coord.latitude])
    );
    const featureCollection = turf.featureCollection(points);
    const clustered = turf.clustersKmeans(featureCollection, {
      numberOfClusters: numClusters,
    });

    const centers = {};
    const assignments = {};
    routePaths = [];

    clustered.features.forEach((feature) => {
      const clusterIdx = feature.properties.cluster;
      const [lng, lat] = feature.geometry.coordinates;
      const key = `${lat},${lng}`;
      assignments[key] = clusterIdx;

      if (!centers[clusterIdx]) {
        centers[clusterIdx] = { lat: 0, lng: 0, count: 0 };
      }

      centers[clusterIdx].lat += lat;
      centers[clusterIdx].lng += lng;
      centers[clusterIdx].count++;
    });

    clusterCenters = Object.values(centers).map((c) => [
      c.lat / c.count,
      c.lng / c.count,
    ]);

    recommendedDepots = clusterCenters.map((center, index) => ({
      name: `Recommended Depot ${index + 1}`,
      latitude: center[0],
      longitude: center[1],
    }));
    renderRecommendedList();

    coordinates.forEach((coord) => {
      const key = `${coord.latitude},${coord.longitude}`;
      const clusterIdx = assignments[key];
      if (clusterIdx !== undefined) {
        routePaths.push({
          start: [coord.latitude, coord.longitude],
          end: clusterCenters[clusterIdx],
          color: clusterColors[clusterIdx % clusterColors.length],
        });
      }
    });

    renderMap(assignments);
    setStatus(`Recommended ${clusterCenters.length} depot location(s).`);
  });

  function handoffQuery(depot) {
    const params = new URLSearchParams({
      lat: String(depot.latitude),
      lng: String(depot.longitude),
      name: depot.name,
      from: "sera",
    });
    return params.toString();
  }

  function renderRecommendedList() {
    if (!recommendedBox || !recommendedList) return;
    recommendedList.innerHTML = "";

    if (!recommendedDepots.length) {
      recommendedBox.hidden = true;
      return;
    }

    recommendedDepots.forEach((depot, index) => {
      const li = document.createElement("li");
      const q = handoffQuery(depot);

      li.innerHTML =
        `<strong>${index + 1}. ${depot.name}</strong>` +
        `<div>${depot.latitude.toFixed(4)}, ${depot.longitude.toFixed(4)}</div>` +
        `<div class="depot-actions">` +
        `<a class="depot-link secondary" href="/area-info?${q}">Check hazards nearby</a>` +
        `<a class="depot-link" href="/routes?${q}">Route with NET</a>` +
        `</div>`;
      recommendedList.appendChild(li);
    });

    recommendedBox.hidden = false;
  }

  function renderMap(assignments) {
    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker ||
        layer instanceof L.CircleMarker ||
        layer instanceof L.Polyline
      ) {
        map.removeLayer(layer);
      }
    });

    inputLayer = L.layerGroup().addTo(map);
    locateUser();

    coordinates.forEach((coord, index) => {
      const key = `${coord.latitude},${coord.longitude}`;
      const clusterIdx = assignments[key];
      const color = clusterColors[clusterIdx % clusterColors.length];

      L.circleMarker([coord.latitude, coord.longitude], {
        radius: 5,
        color,
        fillOpacity: 0.7,
      })
        .addTo(map)
        .bindPopup(coord.name || `Point ${index + 1}`);

      bounds.extend([coord.latitude, coord.longitude]);
    });

    routePaths.forEach((path) => {
      L.polyline([path.start, path.end], {
        color: path.color,
        dashArray: "5,5",
      }).addTo(map);

      bounds.extend(path.start);
      bounds.extend(path.end);
    });

    clusterCenters.forEach((center, index) => {
      L.marker(center)
        .addTo(map)
        .bindPopup(`Recommended Depot ${index + 1}`);

      bounds.extend(center);
    });

    map.fitBounds(bounds);
  }

  fetch("/data/default-sera-points.json")
    .then((res) => {
      if (!res.ok) throw new Error("defaults");
      return res.json();
    })
    .then((data) => {
      usePoints(data, "defaults");
      locateUser();
    })
    .catch(() => {
      setStatus("Could not load default points. Upload a .json or .csv file.");
      locateUser();
    });
});
