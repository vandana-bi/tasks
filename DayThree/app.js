const express = require("express");
const Item = require("./Item");
const redis = require("./redis");

const app = express();
app.use((req, res, next) => {
  const state = require("mongoose").connection.readyState;

  if (state !== 1) {
    return res.status(503).json({
      error: "Database pool exhausted / not ready",
    });
  }

  next();
});
app.use(express.json());

const CACHE_TTL = 60;

/*
Seed sample data
*/
app.get("/seed", async (req, res) => {
  await Item.deleteMany();

  const data = await Item.insertMany([
    { name: "iPhone 15", category: "electronics", price: 1200, stock: 10 },
    { name: "Samsung S24", category: "electronics", price: 900, stock: 20 },
    { name: "Pixel 8", category: "electronics", price: 800, stock: 15 },
    { name: "MacBook Air", category: "laptop", price: 1500, stock: 5 },
    { name: "Dell XPS", category: "laptop", price: 1400, stock: 7 },
    { name: "HP Pavilion", category: "laptop", price: 900, stock: 12 },
  ]);

  await redis.del("items:all");

  res.json(data);
});

/*
CRUD
*/

app.post("/items", async (req, res) => {
  const item = await Item.create(req.body);

  await redis.del("items:all");

  res.json(item);
});

app.get("/items", async (req, res) => {
  console.time("GET /items");

  const cacheKey = "items:all";
  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log("CACHE HIT");
    console.timeEnd("GET /items");
    return res.json(JSON.parse(cached));
  }

  console.log("CACHE MISS");

  const items = await Item.find();

  await redis.set(cacheKey, JSON.stringify(items), "EX", CACHE_TTL);

  console.timeEnd("GET /items");
  res.json(items);
});

app.get("/items/:id", async (req, res) => {
  console.time("GET /items/:id");

  const id = req.params.id;
  const cacheKey = `items:${id}`;

  const cached = await redis.get(cacheKey);

  if (cached) {
    console.log("CACHE HIT");
    console.timeEnd("GET /items/:id");
    return res.json(JSON.parse(cached));
  }

  console.log("CACHE MISS");

  const item = await Item.findById(id);

  await redis.set(cacheKey, JSON.stringify(item), "EX", CACHE_TTL);

  console.timeEnd("GET /items/:id");

  res.json(item);
});

app.put("/items/:id", async (req, res) => {
  const id = req.params.id;

  const item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  await redis.del("items:all");
  await redis.del(`items:${id}`);

  res.json(item);
});

app.delete("/items/:id", async (req, res) => {
  const id = req.params.id;

  await Item.findByIdAndDelete(req.params.id);

  await redis.del("items:all");
  await redis.del(`items:${id}`);

  res.json({ message: "deleted" });
});

/*
Aggregation pipeline
match → group → sort → project → limit
*/

app.get("/analytics", async (req, res) => {
  const result = await Item.aggregate([
    {
      $match: {
        category: "electronics",
      },
    },
    {
      $group: {
        _id: "$category",
        avgPrice: { $avg: "$price" },
        totalItems: { $sum: 1 },
        totalStock: { $sum: "$stock" },
      },
    },
    {
      $sort: {
        avgPrice: -1,
      },
    },
    {
      $project: {
        _id: 0,
        category: "$_id",
        avgPrice: 1,
        totalItems: 1,
        totalStock: 1,
      },
    },
    {
      $limit: 5,
    },
  ]);

  res.json(result);
});

/*
Explain execution stats
*/

app.get("/analytics-explain", async (req, res) => {
  const explain = await Item.aggregate([
    {
      $match: { category: "electronics" },
    },
    {
      $group: {
        _id: "$category",
        avgPrice: { $avg: "$price" },
        totalItems: { $sum: 1 },
      },
    },
    {
      $sort: { avgPrice: -1 },
    },
    {
      $limit: 5,
    },
  ]).explain("executionStats");

  res.json(explain);
});

app.get("/health", async (req, res) => {
  const mongoose = require("mongoose");
  const redis = require("./redis");

  const mongoState = mongoose.connection.readyState;

  let redisStatus = "down";
  try {
    await redis.ping();
    redisStatus = "up";
  } catch (e) {
    redisStatus = "down";
  }

  const health = {
    mongo: mongoState === 1 ? "up" : "down",
    redis: redisStatus,
    timestamp: new Date(),
  };

  const isHealthy = health.mongo === "up" && health.redis === "up";

  res.status(isHealthy ? 200 : 503).json(health);
});

const server = app.listen(3000, () => {
  console.log("Server running on port 3000");
});

const mongoose = require("mongoose");
const redis = require("./redis");

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  try {
    // stop accepting new requests
    server.close(() => {
      console.log("HTTP server closed");
    });

    // close mongo pool
    await mongoose.connection.close(false);
    console.log("MongoDB connection closed");

    // close redis
    await redis.quit();
    console.log("Redis connection closed");

    console.log("Shutdown complete");
    process.exit(0);
  } catch (err) {
    console.error("Shutdown error", err);
    process.exit(1);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
