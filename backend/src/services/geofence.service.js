import {
    point,
    polygon,
    booleanPointInPolygon
} from "@turf/turf";

import Geofence from "../models/geofence.model.js";
import GeofenceAlert from "../models/geofenceAlert.model.js";
import publishAlert from "./alertPublisher.service.js";

export const checkVehicleGeofences = async ({
    vehicleId,
    latitude,
    longitude,
    timestamp
}) => {

    const geofences = await Geofence.find({
        status: "active"
    });

    const vehiclePoint = point([
        longitude,
        latitude
    ]);

    const alerts = [];

    for (const geofence of geofences) {

        const isInside = booleanPointInPolygon(
            vehiclePoint,
            polygon(geofence.coordinates)
        );

        /*
         * For now we detect an ENTRY when the vehicle
         * is inside an active geofence.
         *
         * EXIT detection will require maintaining the
         * vehicle's previous geofence state.
         */

        if (isInside) {

            const recentAlert = await GeofenceAlert.findOne({
                vehicleId,
                geofenceId: geofence._id,
                type: "ENTRY"
            }).sort({
                timestamp: -1
            });

            /*
             * Prevent generating an ENTRY alert for
             * every telemetry point.
             */

            if (
                !recentAlert ||
                timestamp - recentAlert.timestamp > 5 * 60 * 1000
            ) {

                const alert = await GeofenceAlert.create({
                    vehicleId,
                    geofenceId: geofence._id,
                    type: "ENTRY",
                    timestamp,
                    latitude,
                    longitude
                });

                await publishAlert({
                    alertId: alert._id,
                    vehicleId,
                    geofenceId: geofence._id,
                    geofenceName: geofence.name,
                    type: "ENTRY",
                    timestamp,
                    latitude,
                    longitude
                });

                alerts.push(alert);
            }
        }
    }

    return alerts;
};