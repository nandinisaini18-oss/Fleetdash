import redisPublisher from "../config/redis.js";

const publishAlert = async (alert) => {

    await redisPublisher.publish(
        "geofence-alerts",
        JSON.stringify(alert)
    );

};

export default publishAlert;