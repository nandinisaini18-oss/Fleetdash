import {
    point,
    polygon,
    booleanPointInPolygon
} from "@turf/turf";

export const checkGeofence = (latitude, longitude, coordinates) => {

    const vehiclePoint = point([
        longitude,
        latitude
    ]);

    const fence = polygon(coordinates);

    return booleanPointInPolygon(
        vehiclePoint,
        fence
    );
};