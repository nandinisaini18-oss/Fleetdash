import redisPublisher from "../config/redis.js";

const publishTelemetry = async (telemetry) => {

    await redisPublisher.publish(
        "telemetry",
        JSON.stringify(telemetry)
    );

};

export default publishTelemetry;