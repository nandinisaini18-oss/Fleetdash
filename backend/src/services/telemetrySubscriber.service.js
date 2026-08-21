import redisSubscriber from "../config/redisSubscriber.js";
import { getIO } from "./socket.service.js";

const startTelemetrySubscriber = async () => {

    await redisSubscriber.subscribe("telemetry");

    console.log("Subscribed to telemetry channel");

    redisSubscriber.on("message", (channel, message) => {

        if (channel !== "telemetry") {
            return;
        }

        try {

            const telemetry = JSON.parse(message);

            console.log("Telemetry received from Redis:");
            console.log(telemetry);

            const io = getIO();

            io.emit("telemetry", telemetry);

        } catch (error) {

            console.error(
                "Failed to process Redis telemetry:",
                error.message
            );

        }

    });

};

export default startTelemetrySubscriber;