// src/core/id.ts
function createId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2)
  ].join("-");
}

// src/core/batcher.ts
var EventBatcher = class {
  queue = [];
  maxBatchSize;
  flushIntervalMs;
  maxQueueSize;
  onFlush;
  timer;
  flushing = false;
  flushRequested = false;
  destroyed = false;
  constructor(options) {
    this.maxBatchSize = options.maxBatchSize ?? 50;
    this.flushIntervalMs = options.flushIntervalMs ?? 5e3;
    this.maxQueueSize = options.maxQueueSize ?? 5e3;
    this.onFlush = options.onFlush;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
  }
  enqueue(event) {
    if (this.destroyed) {
      return false;
    }
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }
    this.queue.push(event);
    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
    }
    return true;
  }
  async flush() {
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
  async destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = void 0;
    }
    await this.flush();
    this.destroyed = true;
  }
  get size() {
    return this.queue.length;
  }
};

// src/core/fingerprint.ts
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}
async function createFingerprint(level, message, data) {
  const input = stableStringify({
    level,
    message,
    data: data ?? null
  });
  return bytesToHex(sha256(utf8ToBytes(input)));
}

// src/core/transport.ts
import { io } from "socket.io-client";
var VHTransport = class {
  socket;
  timeoutMs;
  constructor(options) {
    this.timeoutMs = options.timeoutMs ?? 5e3;
    this.socket = io(options.serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5e3,
      timeout: this.timeoutMs
    });
    this.socket.on("connect", () => {
      console.log("[VH Client] Connected:", this.socket.id);
    });
    this.socket.on("connect_error", (error) => {
      console.error("[VH Client] Connection error:", error.message);
    });
    this.socket.on("disconnect", (reason) => {
      console.log("[VH Client] Disconnected:", reason);
    });
  }
  waitForConnection() {
    if (this.socket.connected) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        this.socket.off("connect", onConnect);
        this.socket.off("connect_error", onConnectError);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onConnectError = (error) => {
        cleanup();
        reject(new Error(`Unable to connect to VH server: ${error.message}`));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(`VH server connection timed out after ${this.timeoutMs}ms`)
        );
      }, this.timeoutMs);
      this.socket.once("connect", onConnect);
      this.socket.once("connect_error", onConnectError);
      if (this.socket.connected) {
        onConnect();
      }
    });
  }
  async sendBatch(events) {
    if (events.length === 0) {
      return;
    }
    await this.waitForConnection();
    await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        finish(
          new Error(
            `VH server acknowledgement timed out after ${this.timeoutMs}ms`
          )
        );
      }, this.timeoutMs);
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      this.socket.emit("vh:events", events, (ack) => {
        if (!ack?.ok) {
          finish(new Error(ack?.error ?? "VH server rejected the batch"));
          return;
        }
        console.log(`[VH Client] Server acknowledged ${events.length} events`);
        finish();
      });
    });
  }
  async destroy() {
    this.socket.disconnect();
  }
  get connected() {
    return this.socket.connected;
  }
};

// src/index.ts
function createVH(options) {
  const appName = options.appName.trim();
  const serverUrls = [
    ...new Set(
      (Array.isArray(options.serverUrl) ? options.serverUrl : [options.serverUrl]).map((url) => url.trim())
    )
  ];
  if (!appName) {
    throw new Error("appName is required");
  }
  if (serverUrls.length === 0 || serverUrls.some((url) => {
    try {
      const parsed = new URL(url);
      return !["http:", "https:"].includes(parsed.protocol);
    } catch {
      return true;
    }
  })) {
    throw new Error("serverUrl must contain valid http:// or https:// URLs");
  }
  const showConsoleOnLog = options.showConsoleOnLog ?? true;
  const transports = serverUrls.map(
    (serverUrl) => new VHTransport({ serverUrl })
  );
  const batcher = new EventBatcher({
    maxBatchSize: 50,
    flushIntervalMs: 5e3,
    maxQueueSize: 5e3,
    async onFlush(events) {
      await Promise.all(
        transports.map((transport) => transport.sendBatch(events))
      );
    }
  });
  let destroyed = false;
  const pendingLogs = /* @__PURE__ */ new Set();
  async function waitForPendingLogs() {
    while (pendingLogs.size > 0) {
      await Promise.all([...pendingLogs]);
    }
  }
  function enqueue(event) {
    if (destroyed) {
      throw new Error("VH client has been destroyed");
    }
    batcher.enqueue(event);
  }
  function writeLog(level, message, data) {
    if (destroyed) {
      throw new Error("VH client has been destroyed");
    }
    if (showConsoleOnLog) {
      console[level](`[${appName}] ${message}`, data ?? "");
    }
    const pending = createFingerprint(level, message, data).then((fingerprint) => {
      if (destroyed) {
        return;
      }
      enqueue({
        type: "log",
        eventId: createId(),
        fingerprint,
        appName,
        level,
        message,
        ...data === void 0 ? {} : { data },
        timestamp: Date.now()
      });
    }).catch((error) => {
      console.error("[vh-dev-client] Failed to create log event", error);
    }).then(() => {
      pendingLogs.delete(pending);
    });
    pendingLogs.add(pending);
  }
  const log = {
    debug: (message, data) => writeLog("debug", message, data),
    info: (message, data) => writeLog("info", message, data),
    warn: (message, data) => writeLog("warn", message, data),
    error: (message, data) => writeLog("error", message, data)
  };
  return {
    log,
    network: {
      req(input) {
        enqueue({
          type: "network:req",
          eventId: createId(),
          appName,
          requestId: input.requestId,
          method: input.method,
          url: input.url,
          ...input.params === void 0 ? {} : { params: input.params },
          ...input.headers === void 0 ? {} : { headers: input.headers },
          ...input.body === void 0 ? {} : { body: input.body },
          timestamp: Date.now()
        });
      },
      res(input) {
        enqueue({
          type: "network:res",
          eventId: createId(),
          appName,
          requestId: input.requestId,
          ...input.method === void 0 ? {} : { method: input.method },
          ...input.url === void 0 ? {} : { url: input.url },
          ...input.status === void 0 ? {} : { status: input.status },
          ...input.statusText === void 0 ? {} : { statusText: input.statusText },
          ...input.headers === void 0 ? {} : { headers: input.headers },
          ...input.body === void 0 ? {} : { body: input.body },
          ...input.durationMs === void 0 ? {} : { durationMs: input.durationMs },
          ...input.error === void 0 ? {} : { error: input.error },
          timestamp: Date.now()
        });
      }
    },
    async flush() {
      await waitForPendingLogs();
      await batcher.flush();
    },
    async destroy() {
      if (destroyed) {
        return;
      }
      await waitForPendingLogs();
      await batcher.destroy();
      destroyed = true;
      await Promise.all(transports.map((transport) => transport.destroy()));
    }
  };
}
export {
  createVH
};
//# sourceMappingURL=index.js.map