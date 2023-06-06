import MediapipeWorker from 'worker-loader!./mediapipeWorker.worker.ts';

export class WorkerPool {
  private workers: MediapipeWorker[] = [];
  private activeTasks: number[] = [];
  private taskQueue: (() => void)[] = [];

  constructor(size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new MediapipeWorker();
      this.workers.push(worker);
      this.activeTasks.push(0);
    }
  }

  private getAvailableWorker(): [MediapipeWorker, number] | null {
    const minTasks = Math.min(...this.activeTasks);
    if (minTasks === Infinity) return null;

    const index = this.activeTasks.findIndex((taskCount) => taskCount === minTasks);
    return [this.workers[index], index];
  }

  async runTask<T>(task: (worker: MediapipeWorker) => Promise<T>): Promise<T> {
    return new Promise(async (resolve) => {
      const processTask = async () => {
        const workerData = this.getAvailableWorker();

        if (workerData) {
          const [worker, workerIndex] = workerData;
          this.activeTasks[workerIndex]++;
          try {
            const result = await task(worker);
            resolve(result);
          } finally {
            this.activeTasks[workerIndex]--;
          }
        } else {
          // this.taskQueue.push(processTask);
          console.log("Task full, skipping queue");
        }
      };

      processTask();
    });
  }

  processNextTask() {
    if (this.taskQueue.length > 0) {
      const task = this.taskQueue.shift();
      if (task) task();
    }
  }

  activeTaskCount() {
    return this.activeTasks.reduce((a, b) => a + b, 0);
  }
}
