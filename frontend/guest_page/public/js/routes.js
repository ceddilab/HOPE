document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const nearestList = document.getElementById("nearest-list");
  const findBtn = document.getElementById("find-nearest");
  const map = L.map("map").setView([36.7783, -119.4179], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let userLatLng = null;
  let depots = [];
  let depotLayer = L.layerGroup().addTo(map);
  let userMarker = null;
  let routeLine = null;

  function setStatus(message) {
    statusText.textContent = message;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  // Haversine distance in km
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
      .map((depot) => ({
        ...depot,
        distanceKm: distanceKm(userLatLng, depot),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
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

    const closest = ranked[0];
    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(
      [
        [userLatLng.latitude, userLatLng.longitude],
        [closest.latitude, closest.longitude],
      ],
      { color: "#ff6b00", weight: 3 }
    ).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
    setStatus(`Closest depot: ${closest.name} (${closest.distanceKm.toFixed(1)} km)`);
  }

  function findNearest() {
    const ranked = rankNearest(5);
    renderNearest(ranked);
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

        if (userMarker) {
          map.removeLayer(userMarker);
        }

        userMarker = L.marker([userLatLng.latitude, userLatLng.longitude])
          .addTo(map)
          .bindPopup("You are here")
          .openPopup();

        map.setView([userLatLng.latitude, userLatLng.longitude], 10);
        findBtn.disabled = false;
        setStatus(`Location found. Loaded ${depots.length} default depots.`);
        findNearest();
      },
      () => {
        setStatus("Location permission denied. Enable it to find nearby depots.");
      }
    );
  }

  findBtn.addEventListener("click", findNearest);

  fetch("/data/default-depots.json")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load default depots");
      return res.json();
    })
    .then((data) => {
      depots = data.filter((p) => p.latitude && p.longitude);
      plotDepots();
      locateUser();
    })
    .catch(() => {
      setStatus("Could not load default depots.");
    });
});
