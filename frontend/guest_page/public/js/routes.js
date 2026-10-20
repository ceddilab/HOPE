document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const map = L.map("map").setView([36.7783, -119.4179], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let userLatLng = null;
  let depots = [];
  let depotLayer = L.layerGroup().addTo(map);
  let userMarker = null;

  function setStatus(message) {
    statusText.textContent = message;
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
        setStatus(`Location found. Loaded ${depots.length} default depots.`);
      },
      () => {
        setStatus("Location permission denied. Enable it to find nearby depots.");
      }
    );
  }

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
