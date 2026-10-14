import type { VHEvent } from "./types.js";

export interface BatcherOptions {
  maxBatchSize?: number;
  flushIntervalMs?: number;
  maxQueueSize?: number;
  onFlush: (events: VHEvent[]) => Promise<void>;
}

export class EventBatcher {
  private queue: VHEvent[] = [];
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxQueueSize: number;
  private readonly onFlush: BatcherOptions["onFlush"];

  private timer: ReturnType<typeof setInterval> | undefined;
  private flushing = false;
  private flushRequested = false;
  private destroyed = false;

  constructor(options: BatcherOptions) {
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 5000;
    this.maxQueueSize = options.maxQueueSize ?? 5000;
    this.onFlush = options.onFlush;

    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }

  enqueue(event: VHEvent): boolean {
    if (this.destroyed) {
      return false;
    }

    if (this.queue.length >= this.maxQueueSize) {
      // Drop the oldest queued event to keep memory bounded.
      this.queue.shift();
    }

    this.queue.push(event);

    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }

    return true;
  }

  async flush(): Promise<void> {
    if (this.destroyed && this.queue.length === 0) {
      return;
    }

    if (this.flushing) {
      this.flushRequested = true;
      return;
    }

    this.flushing = true;

    try {
      do {
        this.flushRequested = false;

        if (this.queue.length === 0) {
          break;
        }

        const batch = this.queue.splice(0, this.maxBatchSize);

        try {
          await this.onFlush(batch);
        } catch {
          // Restore failed events to the front of the queue.
          this.queue.unshift(...batch);

          if (this.queue.length > this.maxQueueSize) {
            this.queue.length = this.maxQueueSize;
          }

          break;
        }
      } while (this.flushRequested || this.queue.length >= this.maxBatchSize);
    } finally {
      this.flushing = false;
    }
  }

  async destroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    await this.flush();
    this.destroyed = true;
  }

  get size(): number {
    return this.queue.length;
  }
}
