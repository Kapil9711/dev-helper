import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface IncomingVHEvent {
  eventId: string;
  appName: string;
  timestamp: number;
  type: "log" | "network:req" | "network:res";
  [key: string]: unknown;
}

export interface NetworkRequestRow {
  id: number;
  fingerprint: string;
  app_name: string;
  method: string;
  url: string;
  status: number | null;
  duration_ms: number | null;
  error: string | null;
  count: number;
  first_seen: number;
  last_seen: number;
}

export interface NetworkRequestDetailRow {
  id: number;
  app_name: string;
  request_id: string;
  method: string;
  url: string;
  params_json: string | null;
  request_headers_json: string | null;
  request_body_json: string | null;
  status: number | null;
  status_text: string | null;
  response_headers_json: string | null;
  response_body_json: string | null;
  duration_ms: number | null;
  error: string | null;
  started_at: number;
  completed_at: number | null;
  updated_at: number;
}

export interface ConsoleLogRow {
  id: number;
  fingerprint: string;
  app_name: string;
  level: string;
  message: string;
  data_json: string | null;
  count: number;
  first_seen: number;
  last_seen: number;
}

export interface ListOptions {
  appName?: string;
  search?: string;
  level?: string;
  limit?: number;
  offset?: number;
}

export interface LogsDatabase {
  dbPath: string;
  ingestBatch: (events: IncomingVHEvent[]) => string[];
  listNetworkRequests: (options?: ListOptions) => NetworkRequestRow[];
  listNetworkRequestDetails: (
    options?: ListOptions,
  ) => NetworkRequestDetailRow[];
  listLogs: (options?: ListOptions) => ConsoleLogRow[];
  close: () => void;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;

  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function toJson(value: unknown): string | null {
  if (value === undefined) return null;

  try {
    const result = JSON.stringify(value);
    return result === undefined ? null : result;
  } catch {
    return null;
  }
}

export function createLogsDatabase(): LogsDatabase {
  const configuredPath = process.env.VH_DB_PATH;

  const dbPath =
    configuredPath ?? join(homedir(), ".vh-dev-helper", "vh-logs.sqlite");

  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");

  db.exec(`
    CREATE TABLE IF NOT EXISTS event_receipts (
      event_id TEXT PRIMARY KEY,
      received_at INTEGER NOT NULL
    );

    -- Aggregated requests: one row per app/method/URL fingerprint.
    CREATE TABLE IF NOT EXISTS network_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL UNIQUE,
      app_name TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      status INTEGER,
      duration_ms REAL,
      error TEXT,
      count INTEGER NOT NULL DEFAULT 1,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_network_requests_app
      ON network_requests(app_name);

    CREATE INDEX IF NOT EXISTS idx_network_requests_last_seen
      ON network_requests(last_seen DESC);

    CREATE TABLE IF NOT EXISTS request_links (
      app_name TEXT NOT NULL,
      request_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      PRIMARY KEY (app_name, request_id),
      FOREIGN KEY (fingerprint)
        REFERENCES network_requests(fingerprint)
    );

    -- Individual HTTP requests and their associated responses.
    CREATE TABLE IF NOT EXISTS network_request_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      request_id TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'UNKNOWN',
      url TEXT NOT NULL DEFAULT '',
      params_json TEXT,
      request_headers_json TEXT,
      request_body_json TEXT,
      status INTEGER,
      status_text TEXT,
      response_headers_json TEXT,
      response_body_json TEXT,
      duration_ms REAL,
      error TEXT,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      updated_at INTEGER NOT NULL,
      UNIQUE (app_name, request_id)
    );

    CREATE INDEX IF NOT EXISTS idx_request_details_app
      ON network_request_details(app_name);

    CREATE INDEX IF NOT EXISTS idx_request_details_started
      ON network_request_details(started_at DESC);

    CREATE INDEX IF NOT EXISTS idx_request_details_url
      ON network_request_details(url);

    CREATE TABLE IF NOT EXISTS console_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL UNIQUE,
      app_name TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      data_json TEXT,
      count INTEGER NOT NULL DEFAULT 1,
      first_seen INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_console_logs_app
      ON console_logs(app_name);

    CREATE INDEX IF NOT EXISTS idx_console_logs_last_seen
      ON console_logs(last_seen DESC);
  `);

  const insertReceipt = db.prepare(`
    INSERT OR IGNORE INTO event_receipts (
      event_id,
      received_at
    )
    VALUES (?, ?)
  `);

  const findRequest = db.prepare(`
    SELECT fingerprint
    FROM request_links
    WHERE app_name = ? AND request_id = ?
  `);

  const insertRequest = db.prepare(`
    INSERT INTO network_requests (
      fingerprint,
      app_name,
      method,
      url,
      count,
      first_seen,
      last_seen
    )
    VALUES (?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      count = network_requests.count + 1,
      last_seen = MAX(
        network_requests.last_seen,
        excluded.last_seen
      )
  `);

  const linkRequest = db.prepare(`
    INSERT OR IGNORE INTO request_links (
      app_name,
      request_id,
      fingerprint
    )
    VALUES (?, ?, ?)
  `);

  const updateResponse = db.prepare(`
    UPDATE network_requests
    SET
      status = COALESCE(?, status),
      duration_ms = COALESCE(?, duration_ms),
      error = COALESCE(?, error),
      last_seen = MAX(last_seen, ?)
    WHERE fingerprint = ?
  `);

  const insertLog = db.prepare(`
    INSERT INTO console_logs (
      fingerprint,
      app_name,
      level,
      message,
      data_json,
      count,
      first_seen,
      last_seen
    )
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(fingerprint) DO UPDATE SET
      count = console_logs.count + 1,
      last_seen = MAX(
        console_logs.last_seen,
        excluded.last_seen
      )
  `);

  // Store request information without overwriting response information.
  const upsertRequestDetail = db.prepare(`
    INSERT INTO network_request_details (
      app_name,
      request_id,
      method,
      url,
      params_json,
      request_headers_json,
      request_body_json,
      started_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(app_name, request_id) DO UPDATE SET
      method = excluded.method,
      url = excluded.url,
      params_json = excluded.params_json,
      request_headers_json = excluded.request_headers_json,
      request_body_json = excluded.request_body_json,
      started_at = excluded.started_at,
      updated_at = MAX(
        network_request_details.updated_at,
        excluded.updated_at
      )
  `);

  // Also supports a response event arriving before its request event.
  const upsertResponseDetail = db.prepare(`
    INSERT INTO network_request_details (
      app_name,
      request_id,
      method,
      url,
      status,
      status_text,
      response_headers_json,
      response_body_json,
      duration_ms,
      error,
      started_at,
      completed_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(app_name, request_id) DO UPDATE SET
      method = CASE
        WHEN excluded.method != 'UNKNOWN'
        THEN excluded.method
        ELSE network_request_details.method
      END,
      url = CASE
        WHEN excluded.url != ''
        THEN excluded.url
        ELSE network_request_details.url
      END,
      status = COALESCE(
        excluded.status,
        network_request_details.status
      ),
      status_text = COALESCE(
        excluded.status_text,
        network_request_details.status_text
      ),
      response_headers_json = COALESCE(
        excluded.response_headers_json,
        network_request_details.response_headers_json
      ),
      response_body_json = COALESCE(
        excluded.response_body_json,
        network_request_details.response_body_json
      ),
      duration_ms = COALESCE(
        excluded.duration_ms,
        network_request_details.duration_ms
      ),
      error = COALESCE(
        excluded.error,
        network_request_details.error
      ),
      completed_at = excluded.completed_at,
      updated_at = MAX(
        network_request_details.updated_at,
        excluded.updated_at
      )
  `);

  const ingestBatchTransaction = db.transaction(
    (events: IncomingVHEvent[]): string[] => {
      const acceptedIds: string[] = [];

      for (const event of events) {
        if (
          typeof event.eventId !== "string" ||
          typeof event.appName !== "string" ||
          typeof event.timestamp !== "number" ||
          !Number.isFinite(event.timestamp)
        ) {
          throw new Error("Invalid event: missing or invalid base fields");
        }

        const receipt = insertReceipt.run(event.eventId, Date.now());

        // Retried event IDs are acknowledged but never ingested twice.
        if (receipt.changes === 0) {
          acceptedIds.push(event.eventId);
          continue;
        }

        if (event.type === "network:req") {
          const requestId = event.requestId;
          const method = event.method;
          const url = event.url;

          if (
            typeof requestId !== "string" ||
            typeof method !== "string" ||
            typeof url !== "string"
          ) {
            throw new Error("Invalid network request event");
          }

          const normalizedMethod = method.toUpperCase();

          const existingLink = findRequest.get(event.appName, requestId) as
            | { fingerprint: string }
            | undefined;

          if (!existingLink) {
            const fingerprint = sha256({
              appName: event.appName,
              method: normalizedMethod,
              url,
            });

            insertRequest.run(
              fingerprint,
              event.appName,
              normalizedMethod,
              url,
              event.timestamp,
              event.timestamp,
            );

            linkRequest.run(event.appName, requestId, fingerprint);

            // If the response arrived first, reflect its data in
            // the aggregate after creating the request link.
            const priorResponse = db
              .prepare(
                `
                SELECT status, duration_ms, error, completed_at
                FROM network_request_details
                WHERE app_name = ? AND request_id = ?
              `,
              )
              .get(event.appName, requestId) as
              | {
                  status: number | null;
                  duration_ms: number | null;
                  error: string | null;
                  completed_at: number | null;
                }
              | undefined;

            if (priorResponse?.completed_at != null) {
              updateResponse.run(
                priorResponse.status,
                priorResponse.duration_ms,
                priorResponse.error,
                priorResponse.completed_at,
                fingerprint,
              );
            }
          }

          upsertRequestDetail.run(
            event.appName,
            requestId,
            normalizedMethod,
            url,
            toJson(event.params),
            toJson(event.headers),
            toJson(event.body),
            event.timestamp,
            event.timestamp,
          );
        } else if (event.type === "network:res") {
          const requestId = event.requestId;

          if (typeof requestId !== "string") {
            throw new Error("Invalid network response event");
          }

          const link = findRequest.get(event.appName, requestId) as
            | { fingerprint: string }
            | undefined;

          if (link) {
            updateResponse.run(
              typeof event.status === "number" ? event.status : null,
              typeof event.durationMs === "number" ? event.durationMs : null,
              typeof event.error === "string" ? event.error : null,
              event.timestamp,
              link.fingerprint,
            );
          }

          upsertResponseDetail.run(
            event.appName,
            requestId,
            typeof event.method === "string"
              ? event.method.toUpperCase()
              : "UNKNOWN",
            typeof event.url === "string" ? event.url : "",
            typeof event.status === "number" ? event.status : null,
            typeof event.statusText === "string" ? event.statusText : null,
            toJson(event.headers),
            toJson(event.body),
            typeof event.durationMs === "number" ? event.durationMs : null,
            typeof event.error === "string" ? event.error : null,
            event.timestamp,
            event.timestamp,
            event.timestamp,
          );
        } else if (event.type === "log") {
          const level = event.level;
          const message = event.message;
          const data = event.data;

          if (typeof level !== "string" || typeof message !== "string") {
            throw new Error("Invalid console log event");
          }

          const fingerprint = sha256({
            appName: event.appName,
            level,
            message,
            data: data ?? null,
          });

          insertLog.run(
            fingerprint,
            event.appName,
            level,
            message,
            toJson(data),
            event.timestamp,
            event.timestamp,
          );
        } else {
          throw new Error(`Unsupported event type: ${event.type}`);
        }

        acceptedIds.push(event.eventId);
      }

      return acceptedIds;
    },
  );

  const ingestBatch = (events: IncomingVHEvent[]): string[] =>
    ingestBatchTransaction(events);

  function listNetworkRequests(options?: ListOptions): NetworkRequestRow[] {
    const limit = Math.min(200, Math.max(1, Math.floor(options?.limit ?? 50)));
    const offset = Math.max(0, Math.floor(options?.offset ?? 0));

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.appName) {
      conditions.push("app_name = ?");
      params.push(options.appName);
    }

    if (options?.search) {
      conditions.push("(url LIKE ? OR method LIKE ?)");
      const term = `%${options.search}%`;
      params.push(term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return db
      .prepare(
        `
        SELECT *
        FROM network_requests
        ${where}
        ORDER BY last_seen DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params, limit, offset) as NetworkRequestRow[];
  }

  function listNetworkRequestDetails(
    options?: ListOptions,
  ): NetworkRequestDetailRow[] {
    const limit = Math.min(200, Math.max(1, Math.floor(options?.limit ?? 50)));
    const offset = Math.max(0, Math.floor(options?.offset ?? 0));

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.appName) {
      conditions.push("app_name = ?");
      params.push(options.appName);
    }

    if (options?.search) {
      conditions.push("(url LIKE ? OR method LIKE ?)");
      const term = `%${options.search}%`;
      params.push(term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return db
      .prepare(
        `
        SELECT *
        FROM network_request_details
        ${where}
        ORDER BY started_at DESC, id DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params, limit, offset) as NetworkRequestDetailRow[];
  }

  function listLogs(options?: ListOptions): ConsoleLogRow[] {
    const limit = Math.min(200, Math.max(1, Math.floor(options?.limit ?? 50)));
    const offset = Math.max(0, Math.floor(options?.offset ?? 0));

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.appName) {
      conditions.push("app_name = ?");
      params.push(options.appName);
    }

    if (options?.search) {
      conditions.push("(message LIKE ? OR data_json LIKE ?)");
      const term = `%${options.search}%`;
      params.push(term, term);
    }

    if (options?.level) {
      conditions.push("level = ?");
      params.push(options.level);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    return db
      .prepare(
        `
        SELECT *
        FROM console_logs
        ${where}
        ORDER BY last_seen DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params, limit, offset) as ConsoleLogRow[];
  }

  return {
    dbPath,
    ingestBatch,
    listNetworkRequests,
    listNetworkRequestDetails,
    listLogs,
    close() {
      db.close();
    },
  };
}
