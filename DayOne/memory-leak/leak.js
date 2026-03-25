const express = require("express");
const app = express();

const cache = {}; // memory leak here

app.get("/", (req, res) => {
  const key = Date.now();

  // huge object stored every request
  cache[key] = new Array(100000).fill({
    data: "leak",
    time: new Date(),
  });

  res.send("stored");
});

app.listen(3000, () => {
  console.log("Server running on 3000");
});
