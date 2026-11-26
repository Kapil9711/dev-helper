import type {
  VHLoggerConfig,
  LogLevel,
  VHEvent,
  VHLogEvent,
  VHNetworkReqEvent,
  VHNetworkResEvent,
} from "./logger.types.ts";

export class VHLoggerClient {
  private serverUrl: string;
  private appName: string;
  private buffer: VHEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor(config: VHLoggerConfig = {}) {
    this.serverUrl = (config.serverUrl || "http://localhost:4317").replace(/\/+$/, "");
    this.appName = config.appName || "node-app";
    this.batchSize = config.batchSize || 50;
    this.flushIntervalMs = config.flushIntervalMs || 100;
  }

  private generateId(prefix = "ev_"): string {
    return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  public log(message: string, data?: unknown): void {
    this.emitLog("log", message, data);
  }

  public info(message: string, data?: unknown): void {
    this.emitLog("info", message, data);
  }

  public warn(message: string, data?: unknown): void {
    this.emitLog("warn", message, data);
  }

  public error(message: string, data?: unknown): void {
    this.emitLog("error", message, data);
  }

  public debug(message: string, data?: unknown): void {
    this.emitLog("debug", message, data);
  }

  public emitLog(level: LogLevel, message: string, data?: unknown): void {
    const event: VHLogEvent = {
      eventId: this.generateId("log_"),
      appName: this.appName,
      timestamp: Date.now(),
      type: "log",
      level,
      message,
      data,
    };
    this.queueEvent(event);
  }

  public emitNetworkReq(options: {
    requestId?: string;
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, string>;
  }): string {
    const requestId = options.requestId || this.generateId("req_");
    const event: VHNetworkReqEvent = {
      eventId: this.generateId("nreq_"),
      appName: this.appName,
      timestamp: Date.now(),
      type: "network:req",
      requestId,
      method: options.method.toUpperCase(),
      url: options.url,
      headers: options.headers,
      body: options.body,
      params: options.params,
    };
    this.queueEvent(event);
    return requestId;
  }

  public emitNetworkRes(options: {
    requestId: string;
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
    durationMs?: number;
    error?: string;
  }): void {
    const event: VHNetworkResEvent = {
      eventId: this.generateId("nres_"),
      appName: this.appName,
      timestamp: Date.now(),
      type: "network:res",
      requestId: options.requestId,
      status: options.status,
      statusText: options.statusText,
      headers: options.headers,
      body: options.body,
      durationMs: options.durationMs,
      error: options.error,
    };
    this.queueEvent(event);
  }

  private queueEvent(event: VHEvent): void {
    this.buffer.push(event);

    if (this.buffer.length >= this.batchSize) {
      void this.flush();
      return;
    }

    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => {
        this.flushTimer = null;
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const batch = this.buffer.splice(0, this.batchSize);

    try {
      await fetch(`${this.serverUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // Re-queue on unexpected network failure (up to 200 items)
      if (this.buffer.length < 200) {
        this.buffer.unshift(...batch);
      }
    }
  }
}

export function createVHLogger(config?: VHLoggerConfig): VHLoggerClient {
  return new VHLoggerClient(config);
}
