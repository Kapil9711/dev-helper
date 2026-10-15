import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

import { createLogsDatabase, type IncomingVHEvent } from "./logs.database.js";

import { createLogsQueue } from "./logs.queue.js";

export interface VHEventsAck {
  ok: boolean;
  eventIds?: string[];
  error?: string;
}

const MAX_BATCH_SIZE = 50;

function isVHEvent(value: unknown): value is IncomingVHEvent {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as Record<string, unknown>;

  if (
    typeof event.eventId !== "string" ||
    typeof event.appName !== "string" ||
    typeof event.timestamp !== "number" ||
    !Number.isFinite(event.timestamp) ||
    typeof event.type !== "string"
  ) {
    return false;
  }

  if (event.type === "log") {
    return typeof event.level === "string" && typeof event.message === "string";
  }

  if (event.type === "network:req") {
    return (
      typeof event.requestId === "string" &&
      typeof event.method === "string" &&
      typeof event.url === "string"
    );
  }

  if (event.type === "network:res") {
    return typeof event.requestId === "string";
  }

  return false;
}

export function createLogsSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000",
    },
  });

  const database = createLogsDatabase();
  const queue = createLogsQueue(database, {
    maxPendingEvents: 5_000,
  });

  io.on("connection", (socket) => {
    socket.on(
      "vh:events",
      (payload: unknown, acknowledge?: (response: VHEventsAck) => void) => {
        const ack = typeof acknowledge === "function" ? acknowledge : () => {};

        if (
          !Array.isArray(payload) ||
          payload.length === 0 ||
          payload.length > MAX_BATCH_SIZE
        ) {
          ack({
            ok: false,
            error: `Batch must contain 1-${MAX_BATCH_SIZE} events`,
          });
          return;
        }

        if (!payload.every(isVHEvent)) {
          ack({
            ok: false,
            error: "Batch contains invalid events",
          });
          return;
        }

        const events = payload as IncomingVHEvent[];
        const eventIds = events.map((event) => event.eventId);

        if (
          eventIds.some((id) => id.length === 0) ||
          new Set(eventIds).size !== eventIds.length
        ) {
          ack({
            ok: false,
            error: "Event IDs must be non-empty and unique within a batch",
          });
          return;
        }

        void queue.enqueue(events).then(
          (persistedIds) => {
            const logEvents = events.filter((event) => event.type === "log");

            const networkEvents = events.filter(
              (event) =>
                event.type === "network:req" || event.type === "network:res",
            );

            const appNames = [...new Set(events.map((event) => event.appName))];

            if (logEvents.length > 0) {
              io.emit("vh:logs:new", {
                appNames: [...new Set(logEvents.map((event) => event.appName))],
                eventIds: logEvents.map((event) => event.eventId),
                timestamp: Date.now(),
              });
            }

            if (networkEvents.length > 0) {
              io.emit("vh:network:new", {
                appNames: [
                  ...new Set(networkEvents.map((event) => event.appName)),
                ],
                eventIds: networkEvents.map((event) => event.eventId),
                timestamp: Date.now(),
              });
            }

            ack({
              ok: true,
              eventIds: persistedIds,
            });
          },
          (error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to process events";

            ack({
              ok: false,
              error: message,
            });
          },
        );
      },
    );
  });

  let closing = false;

  function close(): void {
    if (closing) {
      return;
    }

    closing = true;
    queue.close();

    // Close Socket.IO first, then release the database connection.
    io.close(() => {
      database.close();
    });
  }

  return {
    io,
    database,
    queue,
    close,
  };
}
