import type { IncomingVHEvent, LogsDatabase } from "./logs.database.js";

interface QueueJob {
  events: IncomingVHEvent[];
  resolve: (eventIds: string[]) => void;
  reject: (error: Error) => void;
}

export interface LogsQueue {
  enqueue(events: IncomingVHEvent[]): Promise<string[]>;
  close(): void;
  readonly pendingEvents: number;
}

interface QueueOptions {
  maxPendingEvents?: number;
}

export function createLogsQueue(
  database: LogsDatabase,
  options: QueueOptions = {},
): LogsQueue {
  const maxPendingEvents = options.maxPendingEvents ?? 5_000;

  if (!Number.isInteger(maxPendingEvents) || maxPendingEvents < 1) {
    throw new Error("maxPendingEvents must be a positive integer");
  }

  const jobs: QueueJob[] = [];

  let pendingCount = 0;
  let processing = false;
  let closed = false;

  function scheduleWorker(): void {
    if (processing || closed || jobs.length === 0) {
      return;
    }

    processing = true;

    setImmediate(processNext);
  }

  function processNext(): void {
    const job = jobs.shift();

    if (!job) {
      processing = false;
      return;
    }

    try {
      // ingestBatch must commit its SQLite transaction before returning.
      const eventIds = database.ingestBatch(job.events);

      pendingCount -= job.events.length;
      job.resolve(eventIds);
    } catch (error) {
      pendingCount -= job.events.length;

      job.reject(
        error instanceof Error
          ? error
          : new Error("Failed to persist log events"),
      );
    }

    processing = false;
    scheduleWorker();
  }

  function enqueue(events: IncomingVHEvent[]): Promise<string[]> {
    if (closed) {
      return Promise.reject(new Error("Logs queue is closed"));
    }

    if (events.length === 0) {
      return Promise.resolve([]);
    }

    if (pendingCount + events.length > maxPendingEvents) {
      return Promise.reject(
        new Error("Logs queue is full; retry this batch later"),
      );
    }

    pendingCount += events.length;

    return new Promise<string[]>((resolve, reject) => {
      jobs.push({ events, resolve, reject });
      scheduleWorker();
    });
  }

  function close(): void {
    if (closed) {
      return;
    }

    closed = true;

    // Reject jobs that have not started processing.
    // An already-running synchronous SQLite transaction is allowed to finish.
    for (const job of jobs.splice(0)) {
      pendingCount -= job.events.length;
      job.reject(new Error("Logs queue is shutting down"));
    }
  }

  return {
    enqueue,
    close,
    get pendingEvents() {
      return pendingCount;
    },
  };
}
