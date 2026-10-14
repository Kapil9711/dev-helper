import { io, type Socket } from "socket.io-client";
import type { VHEvent } from "./types.js";

export interface TransportOptions {
  serverUrl: string;
  timeoutMs?: number;
}

interface BatchAck {
  ok: boolean;
  eventIds?: string[];
  error?: string;
}

export class VHTransport {
  private readonly socket: Socket;
  private readonly timeoutMs: number;

  constructor(options: TransportOptions) {
    this.timeoutMs = options.timeoutMs ?? 5000;

    this.socket = io(options.serverUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: this.timeoutMs,
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

  private waitForConnection(): Promise<void> {
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

      const onConnectError = (error: Error) => {
        // Socket.IO may reconnect after this; this send attempt fails
        // rather than waiting indefinitely.
        cleanup();
        reject(new Error(`Unable to connect to VH server: ${error.message}`));
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(`VH server connection timed out after ${this.timeoutMs}ms`),
        );
      }, this.timeoutMs);

      this.socket.once("connect", onConnect);
      this.socket.once("connect_error", onConnectError);

      // Recheck after registering listeners to avoid missing a connection
      // that happens between the initial check and listener registration.
      if (this.socket.connected) {
        onConnect();
      }
    });
  }

  async sendBatch(events: VHEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    await this.waitForConnection();

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        finish(
          new Error(
            `VH server acknowledgement timed out after ${this.timeoutMs}ms`,
          ),
        );
      }, this.timeoutMs);

      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };

      this.socket.emit("vh:events", events, (ack?: BatchAck) => {
        if (!ack?.ok) {
          finish(new Error(ack?.error ?? "VH server rejected the batch"));
          return;
        }

        console.log(`[VH Client] Server acknowledged ${events.length} events`);

        finish();
      });
    });
  }

  async destroy(): Promise<void> {
    this.socket.disconnect();
  }

  get connected(): boolean {
    return this.socket.connected;
  }
}
