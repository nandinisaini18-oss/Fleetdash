import mongoose from "mongoose";

import {
    checkVehicleGeofences
} from "../services/geofence.service.js";

import Vehicle from "../models/vehicle.model.js";

import TelemetryBucket
    from "../models/telemetryBucket.model.js";

import publishTelemetry
    from "../services/telemetryPublisher.service.js";

import workerPool
    from "../services/workerPool.service.js";


export const ingestTelemetry = async (
    req,
    res,
    next
) => {

    try {

        /*
         * Worker thread:
         *
         * parsing
         * validation
         * bucket time calculation
         */
        let telemetry;

        try {

            telemetry =
                await workerPool.run(
                    req.body
                );

        } catch (validationError) {

            return res.status(400).json({
                success: false,
                message:
                    validationError.message
            });
        }


        /*
         * Validate MongoDB ObjectId.
         */
        if (
            !mongoose.Types
                .ObjectId
                .isValid(
                    telemetry.vehicleId
                )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid vehicle ID"
            });
        }


        /*
         * exists() is lighter than loading
         * the complete Vehicle document.
         */
        const vehicleExists =
            await Vehicle.exists({
                _id:
                    telemetry.vehicleId
            });


        if (!vehicleExists) {

            return res.status(404).json({
                success: false,
                message:
                    "Vehicle not found"
            });
        }


        const telemetryPoint = {
            timestamp:
                telemetry.timestamp,

            latitude:
                telemetry.latitude,

            longitude:
                telemetry.longitude,

            speed:
                telemetry.speed,

            heading:
                telemetry.heading
        };


        const telemetryPayload = {

            vehicleId:
                telemetry.vehicleId,

            timestamp:
                telemetry.timestamp,

            latitude:
                telemetry.latitude,

            longitude:
                telemetry.longitude,

            speed:
                telemetry.speed,

            heading:
                telemetry.heading
        };


        /*
         * Update the hourly bucket.
         *
         * Only return the count field,
         * not the complete telemetry array.
         */
        const bucketPromise =
            TelemetryBucket
                .findOneAndUpdate(
                    {
                        vehicleId:
                            telemetry.vehicleId,

                        bucketStart:
                            telemetry.bucketStart
                    },

                    {
                        $setOnInsert: {
                            vehicleId:
                                telemetry.vehicleId,

                            bucketStart:
                                telemetry.bucketStart,

                            bucketEnd:
                                telemetry.bucketEnd
                        },

                        $push: {
                            telemetry:
                                telemetryPoint
                        },

                        $inc: {
                            count: 1
                        }
                    },

                    {
                        new: true,
                        upsert: true,
                        projection: {
                            count: 1
                        }
                    }
                );


        /*
         * Update latest vehicle location.
         */
        const vehicleUpdatePromise =
            Vehicle.updateOne(
                {
                    _id:
                        telemetry.vehicleId
                },

                {
                    $set: {

                        currentLocation: {
                            latitude:
                                telemetry.latitude,

                            longitude:
                                telemetry.longitude
                        },

                        lastTelemetryAt:
                            telemetry.timestamp
                    }
                }
            );


        /*
         * Push live telemetry to Redis.
         */
        const publishPromise =
            publishTelemetry(
                telemetryPayload
            );


        /*
         * Check geofence transitions.
         */
        const geofencePromise =
            checkVehicleGeofences({

                vehicleId:
                    telemetry.vehicleId,

                latitude:
                    telemetry.latitude,

                longitude:
                    telemetry.longitude,

                timestamp:
                    telemetry.timestamp
            });


        /*
         * These operations are independent,
         * so don't run them sequentially.
         */
        const [
            bucket,
            ,
            ,
            geofenceAlerts
        ] = await Promise.all([

            bucketPromise,

            vehicleUpdatePromise,

            publishPromise,

            geofencePromise
        ]);


        return res.status(201).json({

            success: true,

            message:
                "Telemetry ingested successfully",

            data: {

                vehicleId:
                    telemetry.vehicleId,

                bucketStart:
                    telemetry.bucketStart,

                bucketEnd:
                    telemetry.bucketEnd,

                count:
                    bucket.count,

                geofenceAlerts:
                    geofenceAlerts.length
            }
        });


    } catch (error) {

        next(error);

    }
};


export const getVehicleTelemetry = async (
    req,
    res,
    next
) => {

    try {

        const {
            vehicleId
        } = req.params;


        if (
            !mongoose.Types
                .ObjectId
                .isValid(vehicleId)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid vehicle ID"
            });
        }


        const vehicleExists =
            await Vehicle.exists({
                _id:
                    vehicleId
            });


        if (!vehicleExists) {

            return res.status(404).json({
                success: false,
                message:
                    "Vehicle not found"
            });
        }


        const buckets =
            await TelemetryBucket
                .find({
                    vehicleId
                })
                .sort({
                    bucketStart: -1
                })
                .limit(24)
                .lean();


        return res.status(200).json({

            success: true,

            count:
                buckets.length,

            data:
                buckets
        });


    } catch (error) {

        next(error);

    }
};