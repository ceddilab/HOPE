document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const nearestList = document.getElementById("nearest-list");
  const findBtn = document.getElementById("find-nearest");
  const fileInput = document.getElementById("file-upload");
  const depotSelect = document.getElementById("depot-select");
  const map = L.map("map").setView([36.7783, -119.4179], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let userLatLng = null;
  let depots = [];
  let depotLayer = L.layerGroup().addTo(map);
  let userMarker = null;
  let routeLine = null;
  let selectedIndex = -1;

  const handoffParams = new URLSearchParams(window.location.search);
  const handoff =
    handoffParams.get("lat") && handoffParams.get("lng")
      ? {
          name: handoffParams.get("name") || "Selected depot",
          latitude: Number(handoffParams.get("lat")),
          longitude: Number(handoffParams.get("lng")),
        }
      : null;

  function setStatus(message) {
    statusText.textContent = message;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distanceKm(a, b) {
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function mapsDirUrl(origin, dest) {
    return (
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${origin.latitude},${origin.longitude}` +
      `&destination=${dest.latitude},${dest.longitude}` +
      "&travelmode=driving"
    );
  }

  function populateDepotSelect(preferredIndex = -1) {
    depotSelect.innerHTML = '<option value="">Select a depot...</option>';
    depots.forEach((depot, index) => {
      const opt = document.createElement("option");
      opt.value = String(index);
      opt.textContent = depot.name || `Depot ${index + 1}`;
      depotSelect.appendChild(opt);
    });
    if (preferredIndex >= 0 && preferredIndex < depots.length) {
      depotSelect.value = String(preferredIndex);
      selectedIndex = preferredIndex;
    }
  }

  function plotDepots() {
    depotLayer.clearLayers();
    depots.forEach((depot, index) => {
      L.circleMarker([depot.latitude, depot.longitude], {
        radius: 6,
        color: "#ff6b00",
        fillColor: "#ffd369",
        fillOpacity: 0.85,
      })
        .bindPopup(depot.name || `Depot ${index + 1}`)
        .addTo(depotLayer);
    });
  }

  function rankNearest(limit = 5) {
    if (!userLatLng) {
      setStatus("Need your location before ranking depots.");
      return [];
    }
    if (!depots.length) {
      setStatus("No depot points loaded.");
      return [];
    }

    return depots
      .map((depot, index) => ({
        ...depot,
        index,
        distanceKm: distanceKm(userLatLng, depot),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  function drawRouteTo(depot) {
    if (!userLatLng || !depot) return;

    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(
      [
        [userLatLng.latitude, userLatLng.longitude],
        [depot.latitude, depot.longitude],
      ],
      { color: "#ff6b00", weight: 3 }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
  }

  function renderNearest(ranked) {
    nearestList.innerHTML = "";
    if (!ranked.length) return;

    ranked.forEach((depot, index) => {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "depot-meta";
      meta.innerHTML =
        `<strong>${index + 1}. ${depot.name || "Depot"}</strong>` +
        `<div>${depot.distanceKm.toFixed(1)} km away</div>`;

      const link = document.createElement("a");
      link.className = "maps-link";
      link.href = mapsDirUrl(userLatLng, depot);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = index === 0 ? "Drive here" : "Directions";

      li.appendChild(meta);
      li.appendChild(link);
      nearestList.appendChild(li);
    });

    drawRouteTo(ranked[0]);
    setStatus(`Closest depot: ${ranked[0].name} (${ranked[0].distanceKm.toFixed(1)} km)`);
  }

  function showSelectedDepot() {
    if (selectedIndex < 0 || selectedIndex >= depots.length) return;
    const depot = depots[selectedIndex];

    nearestList.innerHTML = "";
    const li = document.createElement("li");
    const meta = document.createElement("div");
    meta.className = "depot-meta";

    const distText = userLatLng
      ? `${distanceKm(userLatLng, depot).toFixed(1)} km away`
      : "Allow location to see distance";

    meta.innerHTML =
      `<strong>${depot.name || "Depot"}</strong>` +
      `<div>${distText}</div>`;

    li.appendChild(meta);

    if (userLatLng) {
      const link = document.createElement("a");
      link.className = "maps-link";
      link.href = mapsDirUrl(userLatLng, depot);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Drive here";
      li.appendChild(link);
      drawRouteTo(depot);
      setStatus(`Routing to ${depot.name}.`);
    } else {
      setStatus(`Selected ${depot.name}. Allow location for directions.`);
      map.setView([depot.latitude, depot.longitude], 10);
    }

    nearestList.appendChild(li);
  }

  function findNearest() {
    const ranked = rankNearest(5);
    if (!ranked.length) return;
    selectedIndex = ranked[0].index;
    depotSelect.value = String(selectedIndex);
    renderNearest(ranked);
  }

  function mergeHandoffDepot() {
    if (!handoff || Number.isNaN(handoff.latitude) || Number.isNaN(handoff.longitude)) {
      return -1;
    }

    const existing = depots.findIndex(
      (d) =>
        Math.abs(d.latitude - handoff.latitude) < 1e-6 &&
        Math.abs(d.longitude - handoff.longitude) < 1e-6
    );

    if (existing >= 0) {
      depots[existing].name = handoff.name || depots[existing].name;
      return existing;
    }

    depots.unshift(handoff);
    return 0;
  }

  function locateUser() {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.");
      return;
    }

    setStatus("Requesting your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLatLng = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        if (userMarker) map.removeLayer(userMarker);

        userMarker = L.marker([userLatLng.latitude, userLatLng.longitude])
          .addTo(map)
          .bindPopup("You are here")
          .openPopup();

        map.setView([userLatLng.latitude, userLatLng.longitude], 10);
        findBtn.disabled = false;

        if (selectedIndex >= 0) {
          showSelectedDepot();
        } else {
          setStatus(`Location ready. ${depots.length} depots loaded.`);
          findNearest();
        }
      },
      () => {
        findBtn.disabled = true;
        setStatus("Location blocked. Allow location access, then try again.");
        if (selectedIndex >= 0) showSelectedDepot();
      }
    );
  }

  function useDepots(points, sourceLabel) {
    depots = points.filter((p) => p.latitude && p.longitude);
    if (!depots.length) {
      setStatus("No valid latitude/longitude points found.");
      return;
    }

    const preferred = mergeHandoffDepot();
    plotDepots();
    populateDepotSelect(preferred);
    nearestList.innerHTML = "";
    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    if (preferred >= 0) {
      selectedIndex = preferred;
      setStatus(`Loaded handoff depot: ${depots[preferred].name}.`);
      showSelectedDepot();
    } else {
      selectedIndex = -1;
      setStatus(`Loaded ${depots.length} depots from ${sourceLabel}.`);
      if (userLatLng) findNearest();
    }
  }

  depotSelect.addEventListener("change", () => {
    const value = depotSelect.value;
    if (value === "") {
      selectedIndex = -1;
      return;
    }
    selectedIndex = Number(value);
    showSelectedDepot();
  });

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          const list = Array.isArray(data) ? data : data.depots || data.points || [];
          useDepots(list, file.name);
        } catch (err) {
          setStatus("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (result) => useDepots(result.data, file.name),
        error: () => setStatus("Could not parse CSV file."),
      });
    } else {
      setStatus("Please upload a .json or .csv file.");
    }
  });

  findBtn.addEventListener("click", findNearest);

  fetch("/data/default-depots.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load default depots");
      return res.json();
    })
    .then((data) => {
      useDepots(data, "defaults");
      locateUser();
    })
    .catch(() => {
      setStatus("Could not load default depots.");
    });
});
