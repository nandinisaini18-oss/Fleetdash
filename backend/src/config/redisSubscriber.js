import Redis from "ioredis";

const redisSubscriber = new Redis(process.env.REDIS_URL, {
    retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
    }
});

redisSubscriber.on("connect", () => {
    console.log("Redis Subscriber Connected");
});

redisSubscriber.on("error", (error) => {
    console.error("Redis Subscriber Error:", error.message);
});

redisSubscriber.on("reconnecting", (delay) => {
    console.warn(`Redis Subscriber reconnecting in ${delay}ms`);
});

export default redisSubscriber;