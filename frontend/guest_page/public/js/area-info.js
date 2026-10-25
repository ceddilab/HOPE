document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const map = L.map("map").setView([36.7783, -119.4179], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let userLatLng = null;
  let hazards = [];
  let hazardLayer = L.layerGroup().addTo(map);
  let userMarker = null;

  const typeColors = {
    wildfire: "#e74c3c",
    earthquake: "#9b59b6",
    flood: "#3498db",
    landslide: "#a0522d",
    chemical: "#f1c40f",
    industrial: "#e67e22",
    radiation: "#2ecc71",
    tsunami: "#1abc9c",
    heat: "#ff6b00",
    drought: "#d35400",
    sinkhole: "#7f8c8d",
    general: "#ffd369",
  };

  function setStatus(message) {
    statusText.textContent = message;
  }

  function inferType(point) {
    if (point.type) return String(point.type).toLowerCase().trim();
    const name = (point.name || "").toLowerCase();
    if (name.includes("wildfire") || name.includes("fire")) return "wildfire";
    if (name.includes("earthquake") || name.includes("quake")) return "earthquake";
    if (name.includes("flood")) return "flood";
    if (name.includes("mudslide") || name.includes("landslide")) return "landslide";
    if (name.includes("chemical") || name.includes("spill") || name.includes("leak")) {
      return name.includes("radiation") ? "radiation" : "chemical";
    }
    if (name.includes("radiation")) return "radiation";
    if (name.includes("tsunami")) return "tsunami";
    if (name.includes("heat") || name.includes("heatwave")) return "heat";
    if (name.includes("drought")) return "drought";
    if (name.includes("sinkhole")) return "sinkhole";
    if (name.includes("industrial")) return "industrial";
    return "general";
  }

  function normalizePoints(list) {
    return list
      .filter((p) => p && p.latitude && p.longitude)
      .map((p) => ({
        name: p.name || "Unnamed hazard",
        type: inferType(p),
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        notes: p.notes || p.description || "",
      }));
  }

  function plotHazards() {
    hazardLayer.clearLayers();
    hazards.forEach((hazard) => {
      const color = typeColors[hazard.type] || typeColors.general;
      L.circleMarker([hazard.latitude, hazard.longitude], {
        radius: 7,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      })
        .bindPopup(hazard.name)
        .addTo(hazardLayer);
    });
  }

  function useHazards(points, sourceLabel) {
    hazards = normalizePoints(points);
    if (!hazards.length) {
      setStatus("No valid latitude/longitude points found.");
      return;
    }
    plotHazards();
    setStatus(`Loaded ${hazards.length} hazards from ${sourceLabel}.`);
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

        map.setView([userLatLng.latitude, userLatLng.longitude], 8);
        setStatus(`Location ready. ${hazards.length} hazards loaded.`);
      },
      () => {
        setStatus("Location blocked. You can still browse hazards on the map.");
      }
    );
  }

  fetch("/data/default-hazards.json")
    .then((res) => {
      if (!res.ok) throw new Error("hazards");
      return res.json();
    })
    .then((hazardData) => {
      useHazards(hazardData, "defaults");
      locateUser();
    })
    .catch(() => {
      setStatus("Could not load default hazard data.");
    });
});
