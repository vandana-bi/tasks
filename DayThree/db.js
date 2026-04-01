const mongoose = require("mongoose");

const MONGO_URI = "mongodb://127.0.0.1:27017/itemsdb";

mongoose.connect(MONGO_URI, {
  maxPoolSize: 20, // max connections
  minPoolSize: 5, // keep warm connections
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 30000,
});

mongoose.connection.on("connected", () => {
  console.log("MongoDB connected (pool ready)");
});

mongoose.connection.on("error", (err) => {
  console.log("MongoDB error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

module.exports = mongoose;
