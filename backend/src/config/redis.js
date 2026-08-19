import Redis from "ioredis";

const redisPublisher = new Redis({
    host: "127.0.0.1",
    port: 6379
});

redisPublisher.on("connect", () => {
    console.log("Redis Publisher Connected");
});

redisPublisher.on("error", (error) => {
    console.error("Redis Publisher Error:", error.message);
});

export default redisPublisher;