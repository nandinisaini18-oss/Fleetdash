import redisSubscriber from "../config/redisSubscriber.js";
import { getIO } from "./socket.service.js";

const startTelemetrySubscriber = async () => {

    await redisSubscriber.subscribe(
        "telemetry",
        "geofence-alert"
    );

    console.log(
        "Subscribed to telemetry and geofence-alerts channels"
    );

    redisSubscriber.on(
        "message",
        (channel, message) => {

            try {

                const data = JSON.parse(message);

                const io = getIO();

                if (channel === "telemetry") {

                    io.emit(
                        "telemetry",
                        data
                    );

                }

                if (channel === "geofence-alert") {

                    console.log(
                        "Geofence alert received:"
                    );

                    console.log(data);

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