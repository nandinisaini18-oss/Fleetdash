import { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { backendRingToCorners } from "../utils/geofence";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_CENTER = [22.72, 75.86];
const DEFAULT_ZOOM = 13;

const EXISTING_STYLES = {
  active: { color: "#00FF41", weight: 3, opacity: 0.9, fillColor: "#00FF41", fillOpacity: 0.12 },
  inactive: { color: "#6B7280", weight: 2, opacity: 0.7, fillColor: "#6B7280", fillOpacity: 0.08 },
  focused: { color: "#4ADE80", weight: 4, opacity: 1, fillColor: "#00FF41", fillOpacity: 0.22 },
};

const SELECTED_CORNER_STYLE = {
  radius: 5,
  color: "#4ADE80",
  weight: 2,
  fillColor: "#0D1117",
  fillOpacity: 1,
};

const DRAFT_STYLE = {
  color: "#00FF41",
  weight: 3,
  opacity: 1,
  dashArray: "6 4",
  fillColor: "#00FF41",
  fillOpacity: 0.14,
};

// Leaflet-native draggable corner handles. L.Marker (unlike L.CircleMarker,
// which is a Path layer) owns the core MarkerDrag handler, so these are the
// only reliably draggable handles without extra plugins.
const CORNER_ICON = L.divIcon({
  className: "geo-corner-marker",
  html: '<span class="geo-corner-handle"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Dedicated Leaflet map for geofence create/edit. Separate from the LiveMap
// Canvas architecture on purpose: corner picking, live preview, and marker
// dragging are editing interactions the telemetry renderer must not handle.
function GeofenceEditorMap({
  geofences,
  draftPoints,
  editMode,
  focusedId,
  focusRequest,
  createMode,
  onMapClick,
  onCornerDrag,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const existingLayerRef = useRef(null);
  const draftLayerRef = useRef(null);
  const fittedRef = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onCornerDragRef = useRef(onCornerDrag);

  // Keep Leaflet callbacks pointed at the latest handlers without rebinding.
  useEffect(() => {
    onMapClickRef.current = onMapClick;
    onCornerDragRef.current = onCornerDrag;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    let alive = true;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    existingLayerRef.current = L.layerGroup().addTo(map);
    draftLayerRef.current = L.layerGroup().addTo(map);

    map.on("click", (e) => {
      if (!alive || !e.latlng) return;
      onMapClickRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!alive || mapRef.current !== map) return;
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(container);

    return () => {
      alive = false;
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      existingLayerRef.current = null;
      draftLayerRef.current = null;
    };
  }, []);

  // Render stored geofences; the selected fence gets a brighter border,
  // stronger fill, and visible corner markers. All fences stay visible.
  useEffect(() => {
    const map = mapRef.current;
    const layer = existingLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const list = Array.isArray(geofences) ? geofences : [];
    for (const geofence of list) {
      const corners = backendRingToCorners(geofence);
      if (corners.length < 3) continue;
      const latlngs = corners.map((c) => [c.lat, c.lng]);
      const isFocused = geofence._id && geofence._id === focusedId;
      const style = isFocused
        ? EXISTING_STYLES.focused
        : geofence.status === "active"
          ? EXISTING_STYLES.active
          : EXISTING_STYLES.inactive;
      L.polygon(latlngs, style).addTo(layer);
      if (isFocused) {
        for (const c of corners) {
          L.circleMarker([c.lat, c.lng], SELECTED_CORNER_STYLE).addTo(layer);
        }
      }
    }
    if (!fittedRef.current && list.length > 0) {
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
          fittedRef.current = true;
        }
      } catch {
        // Keep the default view when bounds cannot be computed.
      }
    }
  }, [geofences, focusedId]);

  // Latest geofence list for focus lookups without refiring on reloads.
  const geofencesRef = useRef(geofences);
  useEffect(() => {
    geofencesRef.current = geofences;
  });

  // Center on the selected fence only when explicitly requested (list
  // click or Edit). Never on data reloads: the map instance, viewport
  // of other fences, and all layers are left otherwise untouched.
  useEffect(() => {
    if (!focusRequest) return;
    const map = mapRef.current;
    if (!map) return;
    const fence = (geofencesRef.current || []).find((g) => g._id === focusRequest.id);
    if (!fence) return;
    const corners = backendRingToCorners(fence);
    if (corners.length < 3) return;
    try {
      map.flyToBounds(L.latLngBounds(corners.map((c) => [c.lat, c.lng])), {
        padding: [48, 48],
        maxZoom: 16,
        duration: 0.6,
      });
    } catch {
      // Keep the current view when bounds cannot be applied.
    }
  }, [focusRequest]);

  // Render draft corners + live polygon preview. Corners are Leaflet-native
  // draggable markers in edit mode. While dragging, the preview polygon is
  // updated imperatively (no React state) so the drag never breaks from a
  // layer rebuild; the new position commits to state on dragend.
  useEffect(() => {
    const layer = draftLayerRef.current;
    if (!layer) return;
    const points = Array.isArray(draftPoints) ? draftPoints : [];
    const markers = [];
    let preview = null;

    const syncPreview = () => {
      if (!preview) return;
      preview.setLatLngs(markers.map((m) => m.getLatLng()));
    };

    points.forEach((pt, index) => {
      if (!Number.isFinite(pt?.lat) || !Number.isFinite(pt?.lng)) return;
      const marker = L.marker([pt.lat, pt.lng], {
        icon: CORNER_ICON,
        draggable: editMode,
        title: `Corner ${index + 1}${editMode ? " (drag to move)" : ""}`,
        keyboard: false,
      });
      if (editMode) {
        marker.on("drag", syncPreview);
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onCornerDragRef.current?.(index, { lat: ll.lat, lng: ll.lng });
        });
      }
      marker.addTo(layer);
      markers.push(marker);
    });
    if (points.length >= 3) {
      preview = L.polygon(
        points.map((pt) => [pt.lat, pt.lng]),
        DRAFT_STYLE
      ).addTo(layer);
      syncPreview();
    }

    // Remove every handle/listener when the draft or mode changes so
    // repeated Edit/Cancel/Edit cycles never leave stale layers behind.
    return () => {
      layer.clearLayers();
    };
  }, [draftPoints, editMode]);

  // Crosshair cursor while picking corners.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const el = map.getContainer();
    if (el) el.style.cursor = createMode ? "crosshair" : "";
  }, [createMode]);

  return <div ref={containerRef} className="geo-map" role="application" aria-label="Geofence editor map" />;
}

export default GeofenceEditorMap;
