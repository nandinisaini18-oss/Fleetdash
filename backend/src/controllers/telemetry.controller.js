import mongoose from "mongoose";
import { checkVehicleGeofences } from "../services/geofence.service.js";
import Vehicle from "../models/vehicle.model.js";
import TelemetryBucket from "../models/telemetryBucket.model.js";
import publishTelemetry from "../services/telemetryPublisher.service.js";
import workerPool from "../services/workerPool.service.js";

export const ingestTelemetry = async (req, res, next) => {
    try {
        let telemetry;

        try {
            telemetry = await workerPool.run(req.body);
        } catch (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError.message
            });
        }

        if (!mongoose.Types.ObjectId.isValid(telemetry.vehicleId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid vehicle ID"
            });
        }

        const vehicle = await Vehicle.findById(telemetry.vehicleId);

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found"
            });
        }

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
                $push: { telemetry: telemetryPoint },
                $inc: { count: 1 }
            },
            { new: true, upsert: true }
        );

        await Vehicle.findByIdAndUpdate(telemetry.vehicleId, {
            currentLocation: {
                latitude: telemetry.latitude,
                longitude: telemetry.longitude
            },
            lastTelemetryAt: telemetry.timestamp
        });

        await publishTelemetry({
            vehicleId: telemetry.vehicleId,
            timestamp: telemetry.timestamp,
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            speed: telemetry.speed,
            heading: telemetry.heading
        });

        const geofenceAlerts = await checkVehicleGeofences({
            vehicleId: telemetry.vehicleId,
            latitude: telemetry.latitude,
            longitude: telemetry.longitude,
            timestamp: telemetry.timestamp
        });

        return res.status(201).json({
            success: true,
            message: "Telemetry ingested successfully",
            data: {
                vehicleId: telemetry.vehicleId,
                bucketStart: telemetry.bucketStart,
                bucketEnd: telemetry.bucketEnd,
                count: bucket.count,
                geofenceAlerts: geofenceAlerts.length
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