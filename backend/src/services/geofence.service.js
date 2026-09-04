import {
    point,
    polygon,
    booleanPointInPolygon
} from "@turf/turf";

import Geofence from "../models/geofence.model.js";
import GeofenceAlert from "../models/geofenceAlert.model.js";
import redisPublisher from "../config/redis.js";
import publishAlert from "./alertPublisher.service.js";

const GEOFENCE_CACHE_TTL = 30 * 1000;

let geofenceCache = null;
let geofenceCacheExpiresAt = 0;


// Used whenever a geofence is created,
// updated or deleted.
export const invalidateGeofenceCache = () => {
    geofenceCache = null;
    geofenceCacheExpiresAt = 0;
};


const getActiveGeofences = async () => {
    const now = Date.now();

    if (
        geofenceCache &&
        now < geofenceCacheExpiresAt
    ) {
        return geofenceCache;
    }

    const geofences = await Geofence.find({
        status: "active"
    }).lean();

    geofenceCache = geofences;

    geofenceCacheExpiresAt =
        now + GEOFENCE_CACHE_TTL;

    return geofences;
};


export const checkVehicleGeofences = async ({
    vehicleId,
    latitude,
    longitude,
    timestamp
}) => {

    const geofences =
        await getActiveGeofences();

    if (geofences.length === 0) {
        return [];
    }

    const vehiclePoint = point([
        longitude,
        latitude
    ]);

    /*
     * One Redis key per:
     *
     * vehicle + geofence
     *
     * Example:
     *
     * geofence-state:vehicle123:zone123
     */
    const stateKeys = geofences.map(
        (geofence) =>
            `geofence-state:${vehicleId}:${geofence._id}`
    );

    /*
     * Fetch all previous states using
     * one Redis operation.
     */
    const previousStates =
        await redisPublisher.mget(
            ...stateKeys
        );

    const stateUpdates =
        redisPublisher.pipeline();

    const transitions = [];

    for (
        let i = 0;
        i < geofences.length;
        i++
    ) {

        const geofence =
            geofences[i];

        let isInside;

        try {
            const fence = polygon(
                geofence.coordinates
            );

            isInside =
                booleanPointInPolygon(
                    vehiclePoint,
                    fence
                );

        } catch (error) {

            console.error(
                `Invalid geofence ${geofence._id}:`,
                error.message
            );

            continue;
        }

        const currentState =
            isInside
                ? "inside"
                : "outside";

        const previousState =
            previousStates[i];

        /*
         * Always update Redis with
         * the newest state.
         */
        stateUpdates.set(
            stateKeys[i],
            currentState
        );

        /*
         * First telemetry point.
         *
         * We don't know whether the vehicle
         * actually crossed the boundary,
         * so simply establish initial state.
         */
        if (previousState === null) {
            continue;
        }

        /*
         * No boundary transition.
         */
        if (
            previousState === currentState
        ) {
            continue;
        }

        /*
         * outside -> inside
         */
        if (
            previousState === "outside" &&
            currentState === "inside"
        ) {
            transitions.push({
                geofence,
                type: "ENTRY"
            });
        }

        /*
         * inside -> outside
         */
        if (
            previousState === "inside" &&
            currentState === "outside"
        ) {
            transitions.push({
                geofence,
                type: "EXIT"
            });
        }
    }

    /*
     * Update all geofence states
     * using one Redis pipeline.
     */
    await stateUpdates.exec();

    if (transitions.length === 0) {
        return [];
    }

    const eventTime =
        new Date(timestamp);

    /*
     * Alerts should be relatively rare,
     * so MongoDB is used only when
     * a real ENTRY/EXIT occurs.
     */
    const alerts = await Promise.all(
        transitions.map(
            async ({
                geofence,
                type
            }) => {

                const alert =
                    await GeofenceAlert.create({
                        vehicleId,
                        geofenceId:
                            geofence._id,
                        type,
                        timestamp:
                            eventTime,
                        latitude,
                        longitude
                    });

                await publishAlert({
                    alertId:
                        alert._id,
                    vehicleId,
                    geofenceId:
                        geofence._id,
                    geofenceName:
                        geofence.name,
                    type,
                    timestamp:
                        eventTime,
                    latitude,
                    longitude
                });

                return alert;
            }
        )
    );

    return alerts;
};