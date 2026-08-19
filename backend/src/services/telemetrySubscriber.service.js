import redisSubscriber from "../config/redisSubscriber.js";

const startTelemetrySubscriber = async () => {

    await redisSubscriber.subscribe("telemetry");

    console.log("Subscribed to telemetry channel");

    redisSubscriber.on("message", (channel, message) => {

        if (channel === "telemetry") {

            const telemetry = JSON.parse(message);

            console.log("Telemetry received from Redis:");
            console.log(telemetry);
        }
    });
};

export default startTelemetrySubscriber;