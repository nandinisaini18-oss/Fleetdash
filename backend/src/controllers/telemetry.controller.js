import { Worker } from "worker_threads";
import mongoose from "mongoose";
import processTelemetry from "../services/telemetryWorker.service.js";
import Vehicle from "../models/vehicle.model.js";
import TelemetryBucket from "../models/telemetryBucket.model.js";
import publishTelemetry from "../services/telemetryPublisher.service.js";

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
                let bucket = await TelemetryBucket.findOne({
                    vehicleId: telemetry.vehicleId,
                    bucketStart: telemetry.bucketStart
                });

                const telemetryPoint = {
                    timestamp: telemetry.timestamp,
                    latitude: telemetry.latitude,
                    longitude: telemetry.longitude,
                    speed: telemetry.speed,
                    heading: telemetry.heading
                };

                if (bucket) {
                    // Existing bucket → append telemetry
                    bucket.telemetry.push(telemetryPoint);
                    bucket.count += 1;

                    await bucket.save();
                } else {
                    // New hourly bucket
                    bucket = await TelemetryBucket.create({
                        vehicleId: telemetry.vehicleId,
                        bucketStart: telemetry.bucketStart,
                        bucketEnd: telemetry.bucketEnd,
                        telemetry: [telemetryPoint],
                        count: 1
                    });
                }

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