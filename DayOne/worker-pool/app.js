const WorkerPool = require("./workerPool");

const pool = new WorkerPool(4, 10);
pool.init();

async function run() {
  const tasks = [];

  for (let i = 1; i <= 8; i++) {
    tasks.push(pool.execute(i));
  }

  const results = await Promise.all(tasks);

  console.log("Results:", results);

  pool.destroy();
}

run();
