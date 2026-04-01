const Redis = require("ioredis");

const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,

  maxRetriesPerRequest: 2,
  enableReadyCheck: true,

  retryStrategy(times) {
    if (times > 5) {
      console.log("Redis retry exhausted");
      return null;
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", (err) => {
  console.log("Redis error:", err.message);
});

module.exports = redis;
