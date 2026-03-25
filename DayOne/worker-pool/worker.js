const { parentPort } = require("worker_threads");

function heavyTask(n) {
  let total = 0;

  for (let i = 0; i < 1e8; i++) {
    total += i % n;
  }

  return total;
}

parentPort.on("message", (task) => {
  try {
    const result = heavyTask(task);
    parentPort.postMessage({ result });
  } catch (err) {
    parentPort.postMessage({ error: err.message });
  }
});
