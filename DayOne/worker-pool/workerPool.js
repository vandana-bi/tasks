const { Worker } = require("worker_threads");
const path = require("path");

class WorkerPool {
  constructor(size = 4, maxQueue = 20) {
    this.size = size;
    this.maxQueue = maxQueue;

    this.queue = [];
    this.workers = [];
    this.freeWorkers = [];
  }

  init() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(path.resolve(__dirname, "worker.js"));

      worker.on("message", (msg) => {
        const { resolve, reject } = worker.currentTask;

        if (msg.error) reject(msg.error);
        else resolve(msg.result);

        worker.currentTask = null;
        this.freeWorkers.push(worker);
        this.next();
      });

      worker.on("error", (err) => {
        if (worker.currentTask) {
          worker.currentTask.reject(err);
        }
        this.freeWorkers.push(worker);
      });

      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  execute(task) {
    return new Promise((resolve, reject) => {
      // Back-pressure
      if (this.queue.length >= this.maxQueue) {
        return reject(new Error("Queue overflow (backpressure)"));
      }

      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  next() {
    if (!this.queue.length) return;
    if (!this.freeWorkers.length) return;

    const worker = this.freeWorkers.pop();
    const job = this.queue.shift();

    worker.currentTask = job;
    worker.postMessage(job.task);
  }

  destroy() {
    for (const worker of this.workers) {
      worker.terminate();
    }
  }
}

module.exports = WorkerPool;
