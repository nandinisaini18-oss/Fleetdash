import Vehicle from "../models/vehicle.model.js";
import TelemetryBucket from "../models/telemetryBucket.model.js";
import GeofenceAlert from "../models/geofenceAlert.model.js";


// Overall dashboard analytics
export const getOverviewAnalytics = async (
    req,
    res,
    next
) => {

    try {

        const [
            totalVehicles,
            activeVehicles,
            inactiveVehicles,
            maintenanceVehicles,
            totalBuckets,
            totalAlerts
        ] = await Promise.all([

            Vehicle.countDocuments(),

            Vehicle.countDocuments({
                status: "active"
            }),

            Vehicle.countDocuments({
                status: "inactive"
            }),

            Vehicle.countDocuments({
                status: "maintenance"
            }),

            TelemetryBucket.countDocuments(),

            GeofenceAlert.countDocuments()

        ]);

        return res.status(200).json({

            success: true,

            data: {
                vehicles: {
                    total: totalVehicles,
                    active: activeVehicles,
                    inactive: inactiveVehicles,
                    maintenance: maintenanceVehicles
                },

                telemetry: {
                    totalBuckets: totalBuckets
                },

                geofence: {
                    totalAlerts: totalAlerts
                }
            }

        });

    } catch (error) {

        next(error);

    }
};


// Vehicle analytics
export const getVehicleAnalytics = async (
    req,
    res,
    next
) => {

    try {

        const vehicles = await Vehicle.find()
            .select(
                "vehicleId registrationNumber driverName status currentLocation lastTelemetryAt"
            )
            .sort({
                lastTelemetryAt: -1
            });

        return res.status(200).json({

            success: true,

            count: vehicles.length,

            data: vehicles

        });

    } catch (error) {

        next(error);

    }
};


// Telemetry analytics
export const getTelemetryAnalytics = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await TelemetryBucket.aggregate([

                {
                    $group: {
                        _id: null,

                        totalBuckets: {
                            $sum: 1
                        },

                        totalTelemetryPoints: {
                            $sum: "$count"
                        }
                    }
                }

            ]);

        return res.status(200).json({

            success: true,

            data: result[0] || {
                totalBuckets: 0,
                totalTelemetryPoints: 0
            }

        });

    } catch (error) {

        next(error);

    }
};


// Geofence analytics
export const getGeofenceAnalytics = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await GeofenceAlert.aggregate([

                {
                    $group: {
                        _id: "$type",
                        count: {
                            $sum: 1
                        }
                    }
                }

            ]);

        return res.status(200).json({

            success: true,

            data: result

        });

    } catch (error) {

        next(error);

    }
};