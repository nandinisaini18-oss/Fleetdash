import {
    parentPort,
    workerData
} from "worker_threads";

try {

    const telemetryData = workerData;

    const timestamp = new Date(
        telemetryData.timestamp
    );

    const latitude = Number(
        telemetryData.latitude
    );

    const longitude = Number(
        telemetryData.longitude
    );

    const speed = Number(
        telemetryData.speed || 0
    );

    const heading = Number(
        telemetryData.heading || 0
    );


    // Required vehicle ID
    if (!telemetryData.vehicleId) {
        throw new Error(
            "vehicleId is required"
        );
    }


    // Timestamp validation
    if (
        Number.isNaN(
            timestamp.getTime()
        )
    ) {
        throw new Error(
            "Invalid timestamp"
        );
    }


    // Latitude validation
    if (
        Number.isNaN(latitude) ||
        latitude < -90 ||
        latitude > 90
    ) {
        throw new Error(
            "Latitude must be between -90 and 90"
        );
    }


    // Longitude validation
    if (
        Number.isNaN(longitude) ||
        longitude < -180 ||
        longitude > 180
    ) {
        throw new Error(
            "Longitude must be between -180 and 180"
        );
    }


    // Speed validation
    if (
        Number.isNaN(speed) ||
        speed < 0
    ) {
        throw new Error(
            "Speed must be a non-negative number"
        );
    }


    // Heading validation
    if (
        Number.isNaN(heading) ||
        heading < 0 ||
        heading > 360
    ) {
        throw new Error(
            "Heading must be between 0 and 360"
        );
    }


    const bucketStart = new Date(
        timestamp
    );

    bucketStart.setMinutes(
        0,
        0,
        0
    );


    const bucketEnd = new Date(
        bucketStart
    );

    bucketEnd.setHours(
        bucketEnd.getHours() + 1
    );


    parentPort.postMessage({

        success: true,

        data: {

            vehicleId:
                telemetryData.vehicleId,

            timestamp,

            latitude,

            longitude,

            speed,

            heading,

            bucketStart,

            bucketEnd

        }

    });

} catch (error) {

    parentPort.postMessage({

        success: false,

        message: error.message

    });

}