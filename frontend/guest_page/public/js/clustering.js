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

  const map = L.map("map").setView([20.5937, 78.9629], 5);
  const bounds = L.latLngBounds();

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);

  // ✅ Always center on user's current location
  function locateUser() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 13);
          L.marker([latitude, longitude])
            .addTo(map)
            .bindPopup("📍 You are here")
            .openPopup();
          bounds.extend([latitude, longitude]);
        },
        () => {
          console.warn("Geolocation not allowed or unavailable.");
        }
      );
    }
  }

  locateUser();

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const ext = file.name.split(".").pop();

    if (ext === "json") {
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          coordinates = data.filter(p => p.latitude && p.longitude);
        } catch (error) {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (result) => {
          coordinates = result.data.filter(p => p.latitude && p.longitude);
        },
      });
    } else {
      alert("Please upload a valid .json or .csv file");
    }
  });

  confirmBtn.addEventListener("click", () => {
    numClusters = parseInt(clusterInput.value);
    if (isNaN(numClusters) || numClusters < 1) {
      alert("Please enter a valid number of clusters");
      return;
    }
    isClustersSelected = true;
    startBtn.style.display = "inline";
  });

  startBtn.addEventListener("click", () => {
    if (!isClustersSelected || coordinates.length === 0) {
      alert("Upload valid data and confirm cluster count");
      return;
    }

    const points = coordinates.map(coord => turf.point([coord.longitude, coord.latitude]));
    const featureCollection = turf.featureCollection(points);
    const clustered = turf.clustersKmeans(featureCollection, { numberOfClusters: numClusters });

    const centers = {};
    const assignments = {};
    routePaths = [];

    clustered.features.forEach(feature => {
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

    clusterCenters = Object.values(centers).map(c => [
      c.lat / c.count,
      c.lng / c.count,
    ]);

    coordinates.forEach(coord => {
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
  });

  function renderMap(assignments) {
    map.eachLayer(layer => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    locateUser();

    coordinates.forEach((coord, index) => {
      const key = `${coord.latitude},${coord.longitude}`;
      const clusterIdx = assignments[key];
      const color = clusterColors[clusterIdx % clusterColors.length];

      const marker = L.circleMarker([coord.latitude, coord.longitude], {
        radius: 5,
        color: color,
        fillOpacity: 0.7,
      }).addTo(map).bindPopup(`📍 Point ${index + 1}`);

      bounds.extend([coord.latitude, coord.longitude]);
    });

    routePaths.forEach(path => {
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
        .bindPopup(`🏠 Depot ${index + 1}`);

      bounds.extend(center);
    });

    map.fitBounds(bounds);
  }
});