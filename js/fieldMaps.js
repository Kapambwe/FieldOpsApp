/**
 * Leaflet.js Mapping Module for FieldOpsApp
 */

let activeMap = null;
let currentMarker = null;

export function initializeVoterMap(containerId, lat, lng, voterName) {
    // Cleanup if map already exists
    if (activeMap) {
        activeMap.remove();
        activeMap = null;
    }

    try {
        const container = document.getElementById(containerId);
        if (!container) return false;

        // Initialize the map
        activeMap = L.map(containerId).setView([lat, lng], 15);

        // Add OpenStreetMap tile layer (Offline-capable if tiles are cached)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(activeMap);

        // Add a marker for the voter
        currentMarker = L.marker([lat, lng]).addTo(activeMap)
            .bindPopup(`<b>${voterName}</b><br>Target Location`)
            .openPopup();

        // Trigger resize to fix tile rendering in modals/side panels
        setTimeout(() => {
            activeMap.invalidateSize();
        }, 200);

        return true;
    } catch (e) {
        console.error("Map Initialization Failed:", e);
        return false;
    }
}

export function cleanupMap() {
    if (activeMap) {
        activeMap.remove();
        activeMap = null;
    }
}

export function openExternalMaps(lat, lng, label) {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}
