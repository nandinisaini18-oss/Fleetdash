// Encodes a telemetry payload into a compact binary ArrayBuffer
// Layout: [8 bytes timestamp][4 bytes lat][4 bytes lon][4 bytes speed][4 bytes heading][vehicleId string]
export const encodeTelemetry = (telemetry) => {

    const vehicleIdBytes = Buffer.from(telemetry.vehicleId, "utf-8");

    const buffer = Buffer.alloc(24 + vehicleIdBytes.length);

    buffer.writeDoubleLE(new Date(telemetry.timestamp).getTime(), 0);
    buffer.writeFloatLE(telemetry.latitude, 8);
    buffer.writeFloatLE(telemetry.longitude, 12);
    buffer.writeFloatLE(telemetry.speed, 16);
    buffer.writeFloatLE(telemetry.heading, 20);

    vehicleIdBytes.copy(buffer, 24);

    return buffer;
};

export const decodeTelemetry = (buffer) => {

    const timestamp = buffer.readDoubleLE(0);
    const latitude = buffer.readFloatLE(8);
    const longitude = buffer.readFloatLE(12);
    const speed = buffer.readFloatLE(16);
    const heading = buffer.readFloatLE(20);
    const vehicleId = buffer.slice(24).toString("utf-8");

    return {
        vehicleId,
        timestamp: new Date(timestamp),
        latitude,
        longitude,
        speed,
        heading
    };
};