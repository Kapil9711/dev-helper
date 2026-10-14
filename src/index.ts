import { createId } from "./core/id.js";
import { EventBatcher } from "./core/batcher.js";
import { createFingerprint } from "./core/fingerprint.js";
import { VHTransport } from "./core/transport.js";

import type {
  VHEvent,
  VHLogLevel,
  VHNetworkRequestInput,
  VHNetworkResponseInput,
  VHOptions,
} from "./core/types.js";

export type {
  VHEvent,
  VHLogLevel,
  VHLogEvent,
  VHNetworkRequestEvent,
  VHNetworkResponseEvent,
  VHOptions,
} from "./core/types.js";

export interface VHClient {
  log: Record<
    VHLogLevel,
    (message: string, data?: Record<string, unknown>) => void
  >;

  network: {
    req(input: VHNetworkRequestInput): void;
    res(input: VHNetworkResponseInput): void;
  };

  flush(): Promise<void>;
  destroy(): Promise<void>;
}

export function createVH(options: VHOptions): VHClient {
  const appName = options.appName.trim();

  const serverUrls = [
    ...new Set(
      (Array.isArray(options.serverUrl)
        ? options.serverUrl
        : [options.serverUrl]
      ).map((url) => url.trim()),
    ),
  ];

  if (!appName) {
    throw new Error("appName is required");
  }

  if (
    serverUrls.length === 0 ||
    serverUrls.some((url) => {
      try {
        const parsed = new URL(url);

        return !["http:", "https:"].includes(parsed.protocol);
      } catch {
        return true;
      }
    })
  ) {
    throw new Error("serverUrl must contain valid http:// or https:// URLs");
  }

  const showConsoleOnLog = options.showConsoleOnLog ?? true;

  const transports = serverUrls.map(
    (serverUrl) => new VHTransport({ serverUrl }),
  );

  const batcher = new EventBatcher({
    maxBatchSize: 50,
    flushIntervalMs: 5000,
    maxQueueSize: 5000,

    async onFlush(events) {
      await Promise.all(
        transports.map((transport) => transport.sendBatch(events)),
      );
    },
  });

  let destroyed = false;

  const pendingLogs = new Set<Promise<void>>();

  async function waitForPendingLogs(): Promise<void> {
    while (pendingLogs.size > 0) {
      await Promise.all([...pendingLogs]);
    }
  }

  function enqueue(event: VHEvent): void {
    if (destroyed) {
      throw new Error("VH client has been destroyed");
    }

    batcher.enqueue(event);
  }

  function writeLog(
    level: VHLogLevel,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    if (destroyed) {
      throw new Error("VH client has been destroyed");
    }

    if (showConsoleOnLog) {
      console[level](`[${appName}] ${message}`, data ?? "");
    }

    const pending = createFingerprint(level, message, data)
      .then((fingerprint) => {
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
          ...(data === undefined ? {} : { data }),
          timestamp: Date.now(),
        });
      })
      .catch((error: unknown) => {
        console.error("[vh-dev-client] Failed to create log event", error);
      })
      .then(() => {
        pendingLogs.delete(pending);
      });

    pendingLogs.add(pending);
  }

  const log: VHClient["log"] = {
    debug: (message, data) => writeLog("debug", message, data),
    info: (message, data) => writeLog("info", message, data),
    warn: (message, data) => writeLog("warn", message, data),
    error: (message, data) => writeLog("error", message, data),
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
          timestamp: Date.now(),
        });
      },

      res(input) {
        enqueue({
          type: "network:res",
          eventId: createId(),
          appName,
          requestId: input.requestId,
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.durationMs === undefined
            ? {}
            : { durationMs: input.durationMs }),
          ...(input.error === undefined ? {} : { error: input.error }),
          timestamp: Date.now(),
        });
      },
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
    },
  };
}
