import redisPublisher from "../config/redis.js";

const publishAlert = async (alert) => {
    await redisPublisher.publish(
        "geofence-alert",
        JSON.stringify(alert)
    );
};

export default publishAlert;