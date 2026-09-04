import redisSubscriber from "../config/redisSubscriber.js";
import { getIO } from "./socket.service.js";
import { encodeTelemetry } from "../utils/telemetryCodec.util.js";

const startTelemetrySubscriber = async () => {
    await redisSubscriber.subscribe(
        "telemetry",
        "geofence-alert"
    );

    console.log(
        "Subscribed to telemetry and geofence-alert channels"
    );

    redisSubscriber.on(
        "message",
        (channel, message) => {
            try {
                const data = JSON.parse(message);
                const io = getIO();

                if (channel === "telemetry") {
                    const binaryPayload =
                        encodeTelemetry(data);

                    io.emit(
                        "telemetry-binary",
                        binaryPayload
                    );

                    return;
                }

                if (channel === "geofence-alert") {
                    io.emit(
                        "geofence-alert",
                        data
                    );
                }
            } catch (error) {
                console.error(
                    "Failed to process Redis message:",
                    error.message
                );
            }
        }
    );
};

export default startTelemetrySubscriber;