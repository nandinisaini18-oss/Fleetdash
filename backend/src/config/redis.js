import Redis from "ioredis";

const redisPublisher = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
    }
});


redisPublisher.on("connect", () => {
    console.log("Redis Publisher Connected");
});

redisPublisher.on("error", (error) => {
    console.error("Redis Publisher Error:", error.message);
});

redisPublisher.on("reconnecting", (delay) => {
    console.warn(`Redis Publisher reconnecting in ${delay}ms`);
});

export default redisPublisher;