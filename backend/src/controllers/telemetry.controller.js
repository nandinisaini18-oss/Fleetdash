import { Worker } from "worker_threads";
import mongoose from "mongoose";
import Vehicle from "../models/vehicle.model.js";
import TelemetryBucket from "../models/telemetryBucket.model.js";
import publishTelemetry from "../services/telemetryPublisher.service.js";
import Geofence from "../models/geofence.model.js";
import { checkGeofence } from "../utils/geofence.util.js";
import publishGeofenceAlert from "../services/geofenceAlertPublisher.service.js";

export const ingestTelemetry = async (req, res, next) => {
    try {
        const worker = new Worker(
            new URL("../workers/telemetry.worker.js", import.meta.url),
            {
                workerData: req.body
            }
        );

        worker.once("message", async (result) => {
            try {
                if (!result.success) {
                    return res.status(400).json({
                        success: false,
                        message: result.message
                    });
                }

                const telemetry = result.data;

                // Validate MongoDB vehicle ID
                if (!mongoose.Types.ObjectId.isValid(telemetry.vehicleId)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid vehicle ID"
                    });
                }

                // Check whether vehicle exists
                const vehicle = await Vehicle.findById(
                    telemetry.vehicleId
                );

                if (!vehicle) {
                    return res.status(404).json({
                        success: false,
                        message: "Vehicle not found"
                    });
                }

                /*
                 * Find the bucket belonging to:
                 *
                 * vehicle + hourly bucket
                 */
                const telemetryPoint = {
    timestamp: telemetry.timestamp,
    latitude: telemetry.latitude,
    longitude: telemetry.longitude,
    speed: telemetry.speed,
    heading: telemetry.heading
};

const bucket = await TelemetryBucket.findOneAndUpdate(
    {
        vehicleId: telemetry.vehicleId,
        bucketStart: telemetry.bucketStart
    },
    {
        $setOnInsert: {
            vehicleId: telemetry.vehicleId,
            bucketStart: telemetry.bucketStart,
            bucketEnd: telemetry.bucketEnd
        },

        $push: {
            telemetry: telemetryPoint
        },

        $inc: {
            count: 1
        }
    },
    {
        new: true,
        upsert: true
    }
);

                // Update vehicle's latest location
                await Vehicle.findByIdAndUpdate(
                    telemetry.vehicleId,
                    {
                        currentLocation: {
                            latitude: telemetry.latitude,
                            longitude: telemetry.longitude
                        },
                        lastTelemetryAt: telemetry.timestamp
                    }
                );

                const activeGeofences = await Geofence.find({
    status: "active"
});

for (const geofence of activeGeofences) {

    const breached = checkGeofence(
        telemetry.latitude,
        telemetry.longitude,
        geofence.coordinates
    );

    if (breached) {

        const alert = {
            event: "GEOFENCE_BREACH",

            vehicleId: telemetry.vehicleId,

            geofenceId: geofence._id,

            geofenceName: geofence.name,

            timestamp: telemetry.timestamp,

            location: {
                latitude: telemetry.latitude,
                longitude: telemetry.longitude
            },

            speed: telemetry.speed,

            heading: telemetry.heading
        };

        await publishGeofenceAlert(alert);

    }
}

                await publishTelemetry({
                    vehicleId: telemetry.vehicleId,
                    timestamp: telemetry.timestamp,
                    latitude: telemetry.latitude,
                    longitude: telemetry.longitude,
                    speed: telemetry.speed,
                    heading: telemetry.heading
                });

                return res.status(201).json({
                    success: true,
                    message: "Telemetry ingested successfully",
                    data: {
                        vehicleId: telemetry.vehicleId,
                        bucketStart: telemetry.bucketStart,
                        bucketEnd: telemetry.bucketEnd,
                        count: bucket.count
                    }
                });

            } catch (error) {
                next(error);
            }
        });

        worker.once("error", (error) => {
            next(error);
        });

        worker.once("exit", (code) => {
            if (code !== 0) {
                console.error(
                    `Telemetry worker stopped with exit code ${code}`
                );
            }
        });

    } catch (error) {
        next(error);
    }
};

export const getVehicleTelemetry = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(vehicleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const vehicle = await Vehicle.findById(vehicleId);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

        const buckets = await TelemetryBucket.find({
    vehicleId
})
    .sort({
        bucketStart: -1
    })
    .limit(24);

        return res.status(200).json({
            success: true,
            count: buckets.length,
            data: buckets
        });

    } catch (error) {
        next(error);
    }
};