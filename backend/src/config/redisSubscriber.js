import Redis from "ioredis";

const redisSubscriber = new Redis({
    host: "127.0.0.1",
    port: 6379
});

redisSubscriber.on("connect", () => {
    console.log("Redis Subscriber Connected");
});

redisSubscriber.on("error", (error) => {
    console.error("Redis Subscriber Error:", error.message);
});

export default redisSubscriber;