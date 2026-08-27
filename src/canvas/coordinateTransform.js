const DEFAULT_BOUNDS = {
  minLat: 22.65,
  maxLat: 22.85,
  minLng: 75.75,
  maxLng: 75.95,
};

const PADDING = 40;

export function createViewport(canvasWidth, canvasHeight, geofences, vehicles) {
  let minLat = DEFAULT_BOUNDS.minLat;
  let maxLat = DEFAULT_BOUNDS.maxLat;
  let minLng = DEFAULT_BOUNDS.minLng;
  let maxLng = DEFAULT_BOUNDS.maxLng;

  if (geofences && geofences.length > 0) {
    let gMinLat = Infinity;
    let gMaxLat = -Infinity;
    let gMinLng = Infinity;
    let gMaxLng = -Infinity;

    for (let i = 0; i < geofences.length; i++) {
      const ring = geofences[i].coordinates[0];
      for (let j = 0; j < ring.length; j++) {
        const lng = ring[j][0];
        const lat = ring[j][1];
        if (lat < gMinLat) gMinLat = lat;
        if (lat > gMaxLat) gMaxLat = lat;
        if (lng < gMinLng) gMinLng = lng;
        if (lng > gMaxLng) gMaxLng = lng;
      }
    }

    const latPad = (gMaxLat - gMinLat) * 0.15 || 0.02;
    const lngPad = (gMaxLng - gMinLng) * 0.15 || 0.02;
    minLat = gMinLat - latPad;
    maxLat = gMaxLat + latPad;
    minLng = gMinLng - lngPad;
    maxLng = gMaxLng + lngPad;
  }

  if (vehicles && vehicles.size > 0) {
    let vMinLat = Infinity;
    let vMaxLat = -Infinity;
    let vMinLng = Infinity;
    let vMaxLng = -Infinity;

    vehicles.forEach((v) => {
      if (v.latitude < vMinLat) vMinLat = v.latitude;
      if (v.latitude > vMaxLat) vMaxLat = v.latitude;
      if (v.longitude < vMinLng) vMinLng = v.longitude;
      if (v.longitude > vMaxLng) vMaxLng = v.longitude;
    });

    if (vMinLat < Infinity) {
      const latSpan = maxLat - minLat;
      const lngSpan = maxLng - minLng;
      minLat = Math.min(minLat, vMinLat - latSpan * 0.1);
      maxLat = Math.max(maxLat, vMaxLat + latSpan * 0.1);
      minLng = Math.min(minLng, vMinLng - lngSpan * 0.1);
      maxLng = Math.max(maxLng, vMaxLng + lngSpan * 0.1);
    }
  }

  const latSpan = maxLat - minLat || 0.1;
  const lngSpan = maxLng - minLng || 0.1;
  const aspectRatio = canvasWidth / canvasHeight;
  const geoAspect = lngSpan / latSpan;

  if (geoAspect > aspectRatio) {
    const centerLat = (minLat + maxLat) / 2;
    const newLatSpan = lngSpan / aspectRatio;
    minLat = centerLat - newLatSpan / 2;
    maxLat = centerLat + newLatSpan / 2;
  } else {
    const centerLng = (minLng + maxLng) / 2;
    const newLngSpan = latSpan * aspectRatio;
    minLng = centerLng - newLngSpan / 2;
    maxLng = centerLng + newLngSpan / 2;
  }

  return { minLat, maxLat, minLng, maxLng };
}

export function lngToX(lng, viewport, canvasWidth) {
  const { minLng, maxLng } = viewport;
  return PADDING + ((lng - minLng) / (maxLng - minLng)) * (canvasWidth - 2 * PADDING);
}

export function latToY(lat, viewport, canvasHeight) {
  const { minLat, maxLat } = viewport;
  return PADDING + ((maxLat - lat) / (maxLat - minLat)) * (canvasHeight - 2 * PADDING);
}

export function toCanvasCoords(latitude, longitude, viewport, canvasWidth, canvasHeight) {
  return {
    x: lngToX(longitude, viewport, canvasWidth),
    y: latToY(latitude, viewport, canvasHeight),
  };
}
