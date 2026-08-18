import { parentPort, workerData } from "worker_threads";

try {
    const telemetryData = workerData;

    const parsedData = {
        vehicleId: telemetryData.vehicleId,
        timestamp: new Date(telemetryData.timestamp),
        latitude: Number(telemetryData.latitude),
        longitude: Number(telemetryData.longitude),
        speed: Number(telemetryData.speed || 0),
        heading: Number(telemetryData.heading || 0)
    };

    if (
        !parsedData.vehicleId ||
        Number.isNaN(parsedData.timestamp.getTime()) ||
        Number.isNaN(parsedData.latitude) ||
        Number.isNaN(parsedData.longitude)
    ) {
        throw new Error("Invalid telemetry data");
    }

    // Calculate hourly bucket
    const bucketStart = new Date(parsedData.timestamp);

    bucketStart.setMinutes(0, 0, 0);

    const bucketEnd = new Date(bucketStart);
    bucketEnd.setHours(bucketEnd.getHours() + 1);

    parentPort.postMessage({
        success: true,
        data: {
            ...parsedData,
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