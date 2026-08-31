import Redis from "ioredis";

const redisPublisher = new Redis({
    host: "127.0.0.1",
    port: 6379,
    retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
    },
    maxRetriesPerRequest: 3
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