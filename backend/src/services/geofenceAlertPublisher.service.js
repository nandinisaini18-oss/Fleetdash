import redisPublisher from "../config/redis.js";

const publishGeofenceAlert = async (alert) => {

    await redisPublisher.publish(
        "geofence-alert",
        JSON.stringify(alert)
    );

};

export default publishGeofenceAlert;