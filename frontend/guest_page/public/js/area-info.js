document.addEventListener("DOMContentLoaded", () => {
  const statusText = document.getElementById("status-text");
  const detailPanel = document.getElementById("detail-panel");
  const fileInput = document.getElementById("file-upload");
  const map = L.map("map").setView([36.7783, -119.4179], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  let userLatLng = null;
  let hazards = [];
  let tipsByType = {};
  let hazardLayer = L.layerGroup().addTo(map);
  let userMarker = null;
  let focusMarker = null;

  const handoffParams = new URLSearchParams(window.location.search);
  const handoff =
    handoffParams.get("lat") && handoffParams.get("lng")
      ? {
          name: handoffParams.get("name") || "Selected depot",
          latitude: Number(handoffParams.get("lat")),
          longitude: Number(handoffParams.get("lng")),
          type: "depot",
          from: handoffParams.get("from") || "",
        }
      : null;

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

  function tipBlock(type) {
    return tipsByType[type] || tipsByType.general || {
      title: "General emergency tips",
      tips: ["Follow official local emergency guidance."],
    };
  }

  function netHandoffUrl(point) {
    const params = new URLSearchParams({
      lat: String(point.latitude),
      lng: String(point.longitude),
      name: point.name || "Selected depot",
      from: "echo",
    });
    return `/routes?${params.toString()}`;
  }

  function showDetails(hazard) {
    const tips = tipBlock(hazard.type === "depot" ? "general" : hazard.type);
    const dist =
      userLatLng != null
        ? `${distanceKm(userLatLng, hazard).toFixed(1)} km from you`
        : "Enable location to see distance";
    const routeHref =
      hazard.type === "depot" ? netHandoffUrl(hazard) : "/routes";
    const routeLabel =
      hazard.type === "depot" ? "Route to this depot" : "Find nearest depot";

    detailPanel.innerHTML = `
      <h3>${hazard.name}</h3>
      <span class="type-tag">${hazard.type}</span>
      <div class="meta">${dist}</div>
      ${hazard.notes ? `<p>${hazard.notes}</p>` : ""}
      <div class="actions">
        <a class="action-link" href="${routeHref}">${routeLabel}</a>
        <a class="action-link secondary" target="_blank" rel="noopener noreferrer"
           href="https://www.google.com/maps/search/?api=1&query=${hazard.latitude},${hazard.longitude}">
          Open in Maps
        </a>
      </div>
      <h4 class="tips-title">${tips.title}</h4>
      <ul class="tips-list">
        ${tips.tips.map((t) => `<li>${t}</li>`).join("")}
      </ul>
    `;
  }

  function applyHandoffFocus() {
    if (!handoff || Number.isNaN(handoff.latitude) || Number.isNaN(handoff.longitude)) {
      return;
    }

    if (focusMarker) map.removeLayer(focusMarker);
    focusMarker = L.marker([handoff.latitude, handoff.longitude])
      .addTo(map)
      .bindPopup(handoff.name)
      .openPopup();

    map.setView([handoff.latitude, handoff.longitude], 9);
    showDetails(handoff);
    setStatus(`Focused on ${handoff.name}. Hazards nearby are on the map.`);
  }

  function plotHazards() {
    hazardLayer.clearLayers();
    hazards.forEach((hazard) => {
      const color = typeColors[hazard.type] || typeColors.general;
      const marker = L.circleMarker([hazard.latitude, hazard.longitude], {
        radius: 7,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 2,
      }).bindPopup(hazard.name);

      marker.on("click", () => showDetails(hazard));
      marker.addTo(hazardLayer);
    });
  }

  function useHazards(points, sourceLabel) {
    hazards = normalizePoints(points);
    if (!hazards.length) {
      setStatus("No valid latitude/longitude points found.");
      return;
    }
    plotHazards();
    detailPanel.innerHTML =
      '<p class="placeholder">Click a hazard on the map to see details and response tips.</p>';
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
          .bindPopup("You are here");

        if (!handoff) {
          userMarker.openPopup();
          map.setView([userLatLng.latitude, userLatLng.longitude], 8);
          setStatus(`Location ready. ${hazards.length} hazards loaded.`);
        } else {
          setStatus(`Focused on ${handoff.name}. Your location is also on the map.`);
          showDetails(handoff);
        }
      },
      () => {
        setStatus(
          handoff
            ? `Focused on ${handoff.name}. Location blocked for distance.`
            : "Location blocked. You can still click hazards on the map."
        );
      }
    );
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
          const list = Array.isArray(data)
            ? data
            : data.hazards || data.points || data.depots || [];
          useHazards(list, file.name);
        } catch (err) {
          setStatus("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    } else if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (result) => useHazards(result.data, file.name),
        error: () => setStatus("Could not parse CSV file."),
      });
    } else {
      setStatus("Please upload a .json or .csv file.");
    }
  });

  Promise.all([
    fetch("/data/default-hazards.json").then((res) => {
      if (!res.ok) throw new Error("hazards");
      return res.json();
    }),
    fetch("/data/response-tips.json").then((res) => {
      if (!res.ok) throw new Error("tips");
      return res.json();
    }),
  ])
    .then(([hazardData, tipData]) => {
      tipsByType = tipData || {};
      useHazards(hazardData, "defaults");
      applyHandoffFocus();
      locateUser();
    })
    .catch(() => {
      setStatus("Could not load default hazard data.");
    });
});

