import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

interface VHEvent {
  eventId: string;
  appName: string;
  timestamp: number;
  type: "log" | "network:req" | "network:res";
  [key: string]: unknown;
}

interface VHEventsAck {
  ok: boolean;
  eventIds?: string[];
  error?: string;
}

const MAX_BATCH_SIZE = 50;
const MAX_STORED_EVENTS = 10_000;

const events = new Map<string, VHEvent>();

function isVHEvent(value: unknown): value is VHEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const event = value as Record<string, unknown>;

  if (
    typeof event.eventId !== "string" ||
    event.eventId.length === 0 ||
    typeof event.appName !== "string" ||
    event.appName.length === 0 ||
    typeof event.timestamp !== "number" ||
    !Number.isFinite(event.timestamp)
  ) {
    return false;
  }

  switch (event.type) {
    case "log":
      return (
        typeof event.message === "string" &&
        ["debug", "info", "warn", "error"].includes(String(event.level)) &&
        typeof event.fingerprint === "string"
      );

    case "network:req":
      return (
        typeof event.requestId === "string" &&
        typeof event.method === "string" &&
        typeof event.url === "string"
      );

    case "network:res":
      return (
        typeof event.requestId === "string" &&
        (event.status === undefined ||
          (typeof event.status === "number" &&
            Number.isFinite(event.status))) &&
        (event.durationMs === undefined ||
          (typeof event.durationMs === "number" &&
            Number.isFinite(event.durationMs))) &&
        (event.error === undefined || typeof event.error === "string")
      );

    default:
      return false;
  }
}

export function createLogsSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      // Adjust this to your dashboard origin when browser access is enabled.
      origin: ["http://localhost:3000"],
    },
  });

  io.engine.on("connection_error", (error) => {
    console.error("[VH Logs] Connection error:", {
      code: error.code,
      message: error.message,
      context: error.context,
    });
  });

  io.on("connection", (socket) => {
    console.log(`[VH Logs] Client connected: ${socket.id}`);

    socket.on(
      "vh:events",
      (payload: unknown, acknowledge?: (result: VHEventsAck) => void) => {
        console.log("[VH Logs] vh:events received", {
          isArray: Array.isArray(payload),
          count: Array.isArray(payload) ? payload.length : 0,
        });

        if (typeof acknowledge !== "function") {
          console.warn(
            "[VH Logs] Received batch without acknowledgement callback",
          );
          return;
        }

        if (
          !Array.isArray(payload) ||
          payload.length === 0 ||
          payload.length > MAX_BATCH_SIZE
        ) {
          acknowledge({
            ok: false,
            error: `Expected between 1 and ${MAX_BATCH_SIZE} events`,
          });
          return;
        }

        if (!payload.every(isVHEvent)) {
          acknowledge({
            ok: false,
            error: "Batch contains invalid events",
          });
          return;
        }

        const batch = payload as VHEvent[];
        const batchIds = new Set<string>();

        // Reject conflicting duplicate IDs within the same batch.
        for (const event of batch) {
          if (batchIds.has(event.eventId)) {
            acknowledge({
              ok: false,
              error: `Duplicate eventId in batch: ${event.eventId}`,
            });
            return;
          }

          batchIds.add(event.eventId);
        }

        for (const event of batch) {
          // Retried events are already accepted; don't store them twice.
          if (events.has(event.eventId)) {
            continue;
          }

          events.set(event.eventId, event);

          if (events.size > MAX_STORED_EVENTS) {
            const oldestId = events.keys().next().value;

            if (oldestId !== undefined) {
              events.delete(oldestId);
            }
          }

          console.log(
            `[VH Logs] ${event.appName} | ${event.type} | ${event.eventId}`,
          );
        }

        // Confirms in-memory acceptance, not durable database storage.
        acknowledge({
          ok: true,
          eventIds: batch.map((event) => event.eventId),
        });
      },
    );

    socket.on("disconnect", (reason) => {
      console.log(`[VH Logs] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return {
    io,

    getEvents(): VHEvent[] {
      return Array.from(events.values());
    },

    close(): Promise<void> {
      return new Promise((resolve) => {
        io.close(() => resolve());
      });
    },
  };
}

export type LogsSocketServer = ReturnType<typeof createLogsSocketServer>;
