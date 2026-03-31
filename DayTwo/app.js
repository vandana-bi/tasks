const express = require("express");
const rateLimit = require("express-rate-limit");
const pino = require("pino");
const pinoHttp = require("pino-http");
const { v4: uuidv4 } = require("uuid");
const helmet = require("helmet");
const cors = require("cors");
const Joi = require("joi");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

/* ---------------- Security ---------------- */
app.use(helmet());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

/* ---------------- Logger ---------------- */
const logger = pino({ level: "info" });

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers["x-request-id"] || uuidv4(),
  }),
);

/* ---------------- Rate Limit ---------------- */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  }),
);

/* ---------------- JWT ---------------- */
const ACCESS_SECRET = "access-secret";
const REFRESH_SECRET = "refresh-secret";

let refreshTokens = new Set();

function generateTokens(user) {
  const accessToken = jwt.sign(user, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(user, REFRESH_SECRET, { expiresIn: "7d" });

  refreshTokens.add(refreshToken);

  return { accessToken, refreshToken };
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ---------------- Validation ---------------- */
const itemSchema = Joi.object({
  name: Joi.string().min(2).required(),
  category: Joi.string().required(),
  price: Joi.number().min(0).required(),
  stock: Joi.number().min(0).optional(),
});

/* ---------------- Auth Routes ---------------- */
app.post("/auth/login", (req, res) => {
  const user = { id: 1, name: "admin" };
  const tokens = generateTokens(user);
  res.json(tokens);
});

app.post("/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshTokens.has(refreshToken))
    return res.status(403).json({ error: "Invalid refresh" });

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);

    refreshTokens.delete(refreshToken);

    const tokens = generateTokens({ id: decoded.id });

    res.json(tokens);
  } catch {
    res.status(403).json({ error: "Expired refresh token" });
  }
});

/* ---------------- In-memory DB ---------------- */
let items = [
  {
    id: 1,
    name: "iPhone 15",
    category: "electronics",
    price: 999,
    stock: 25,
    createdAt: new Date(),
  },
];

let id = 2;

/* ---------------- GET all ---------------- */
app.get("/items", auth, (req, res) => {
  const { page = 1, limit = 10, name } = req.query;

  let filtered = items;

  if (name) {
    filtered = filtered.filter((i) =>
      i.name.toLowerCase().includes(name.toLowerCase()),
    );
  }

  const start = (page - 1) * limit;
  const result = filtered.slice(start, start + Number(limit));

  res.json({
    data: result,
    total: filtered.length,
  });
});

/* ---------------- GET by ID ---------------- */
app.get("/items/:id", auth, (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Not found" });

  res.json(item);
});

/* ---------------- POST ---------------- */
app.post("/items", auth, (req, res) => {
  const { error } = itemSchema.validate(req.body);

  if (error) return res.status(400).json(error.details);

  const exists = items.find((i) => i.name === req.body.name);

  if (exists) return res.status(409).json({ error: "Duplicate item" });

  const newItem = {
    id: id++,
    ...req.body,
    createdAt: new Date(),
  };

  items.push(newItem);

  res.status(201).json(newItem);
});

/* ---------------- PUT ---------------- */
app.put("/items/:id", auth, (req, res) => {
  const { error } = itemSchema.validate(req.body);

  if (error) return res.status(400).json(error.details);

  const index = items.findIndex((i) => i.id === Number(req.params.id));

  if (index === -1) return res.status(404).json({ error: "Not found" });

  items[index] = {
    id: Number(req.params.id),
    ...req.body,
    updatedAt: new Date(),
  };

  res.json(items[index]);
});

/* ---------------- PATCH ---------------- */
app.patch("/items/:id", auth, (req, res) => {
  const item = items.find((i) => i.id === Number(req.params.id));

  if (!item) return res.status(404).json({ error: "Not found" });

  Object.assign(item, req.body, { updatedAt: new Date() });

  res.json(item);
});

/* ---------------- DELETE ---------------- */
app.delete("/items/:id", auth, (req, res) => {
  const index = items.findIndex((i) => i.id === Number(req.params.id));

  if (index === -1) return res.status(404).json({ error: "Not found" });

  const deleted = items.splice(index, 1);

  res.json(deleted[0]);
});

/* ---------------- Error Handler ---------------- */
app.use((err, req, res, next) => {
  req.log.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

/* ---------------- Server ---------------- */
const server = app.listen(3000, () => {
  logger.info("Server running on port 3000");
});

/* ---------------- Graceful Shutdown ---------------- */
const shutdown = (signal) => {
  logger.info(`Received ${signal}. Shutting down...`);

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
