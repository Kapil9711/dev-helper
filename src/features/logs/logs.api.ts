import type { IncomingMessage, ServerResponse } from "node:http";
import Database from "better-sqlite3";

type QueryValue = string | undefined;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });

  res.end(JSON.stringify(body));
}

function getQueryValue(params: URLSearchParams, key: string): QueryValue {
  const value = params.get(key)?.trim();
  return value || undefined;
}

function parseTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;

  // Accept Unix timestamps in milliseconds.
  if (/^\d+$/.test(value)) {
    const timestamp = Number(value);
    return Number.isSafeInteger(timestamp) ? timestamp : undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function parseLimit(value: string | undefined): number {
  if (value === undefined) return 50;

  if (!/^\d+$/.test(value)) {
    throw new Error("limit must be a positive integer");
  }

  const limit = Number(value);

  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer");
  }

  return Math.min(limit, 200);
}

interface Cursor {
  lastSeen: number;
  id: number;
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value: string | undefined): Cursor | undefined {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Record<string, unknown>;

    if (
      typeof parsed.lastSeen !== "number" ||
      !Number.isSafeInteger(parsed.lastSeen) ||
      typeof parsed.id !== "number" ||
      !Number.isSafeInteger(parsed.id) ||
      parsed.id < 1
    ) {
      throw new Error();
    }

    return {
      lastSeen: parsed.lastSeen,
      id: parsed.id,
    };
  } catch {
    throw new Error("Invalid cursor");
  }
}

function getFilters(params: URLSearchParams) {
  const fromValue = getQueryValue(params, "from");
  const toValue = getQueryValue(params, "to");

  const from = parseTimestamp(fromValue);
  const to = parseTimestamp(toValue);

  if (fromValue && from === undefined) {
    throw new Error("Invalid from timestamp");
  }

  if (toValue && to === undefined) {
    throw new Error("Invalid to timestamp");
  }

  if (from !== undefined && to !== undefined && from > to) {
    throw new Error("'from' must be earlier than or equal to 'to'");
  }

  return {
    appName: getQueryValue(params, "appName"),
    search: getQueryValue(params, "search"),
    from,
    to,
    limit: parseLimit(getQueryValue(params, "limit")),
    cursor: decodeCursor(getQueryValue(params, "cursor")),
  };
}

export function createLogsApi(dbPath: string) {
  // Separate read-only connection; WAL permits concurrent reads and writes.
  const db = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });

  db.pragma("busy_timeout = 5000");

  function listLogs(params: URLSearchParams) {
    const filters = getFilters(params);
    const level = getQueryValue(params, "level");

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (filters.appName) {
      conditions.push("app_name = ?");
      values.push(filters.appName);
    }

    if (level) {
      conditions.push("level = ?");
      values.push(level);
    }

    if (filters.search) {
      conditions.push("(message LIKE ? OR data_json LIKE ?)");
      const term = `%${filters.search}%`;
      values.push(term, term);
    }

    if (filters.from !== undefined) {
      conditions.push("last_seen >= ?");
      values.push(filters.from);
    }

    if (filters.to !== undefined) {
      conditions.push("last_seen <= ?");
      values.push(filters.to);
    }

    if (filters.cursor) {
      conditions.push("(last_seen < ? OR (last_seen = ? AND id < ?))");
      values.push(
        filters.cursor.lastSeen,
        filters.cursor.lastSeen,
        filters.cursor.id,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
        SELECT *
        FROM console_logs
        ${where}
        ORDER BY last_seen DESC, id DESC
        LIMIT ?
      `,
      )
      .all(...values, filters.limit + 1) as Array<{
      id: number;
      last_seen: number;
      [key: string]: unknown;
    }>;

    const hasMore = rows.length > filters.limit;
    const data = hasMore ? rows.slice(0, filters.limit) : rows;

    const last = data[data.length - 1];

    return {
      data,
      pagination: {
        limit: filters.limit,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({
                lastSeen: last.last_seen,
                id: last.id,
              })
            : null,
      },
    };
  }

  function listNetworkRequests(params: URLSearchParams) {
    const filters = getFilters(params);
    const method = getQueryValue(params, "method")?.toUpperCase();
    const statusValue = getQueryValue(params, "status");

    let status: number | undefined;

    if (statusValue !== undefined) {
      if (!/^\d{3}$/.test(statusValue)) {
        throw new Error("status must be an HTTP status code");
      }

      status = Number(statusValue);

      if (status < 100 || status > 599) {
        throw new Error("status must be between 100 and 599");
      }
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (filters.appName) {
      conditions.push("app_name = ?");
      values.push(filters.appName);
    }

    if (method) {
      conditions.push("method = ?");
      values.push(method);
    }

    if (status !== undefined) {
      conditions.push("status = ?");
      values.push(status);
    }

    if (filters.search) {
      conditions.push("(url LIKE ? OR method LIKE ?)");
      const term = `%${filters.search}%`;
      values.push(term, term);
    }

    if (filters.from !== undefined) {
      conditions.push("last_seen >= ?");
      values.push(filters.from);
    }

    if (filters.to !== undefined) {
      conditions.push("last_seen <= ?");
      values.push(filters.to);
    }

    if (filters.cursor) {
      conditions.push("(last_seen < ? OR (last_seen = ? AND id < ?))");
      values.push(
        filters.cursor.lastSeen,
        filters.cursor.lastSeen,
        filters.cursor.id,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
        SELECT *
        FROM network_requests
        ${where}
        ORDER BY last_seen DESC, id DESC
        LIMIT ?
      `,
      )
      .all(...values, filters.limit + 1) as Array<{
      id: number;
      last_seen: number;
      [key: string]: unknown;
    }>;

    const hasMore = rows.length > filters.limit;
    const data = hasMore ? rows.slice(0, filters.limit) : rows;

    const last = data[data.length - 1];

    return {
      data,
      pagination: {
        limit: filters.limit,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({
                lastSeen: last.last_seen,
                id: last.id,
              })
            : null,
      },
    };
  }

  function listNetworkRequestDetails(params: URLSearchParams) {
    const filters = getFilters(params);
    const method = getQueryValue(params, "method")?.toUpperCase();
    const statusValue = getQueryValue(params, "status");

    let status: number | undefined;

    if (statusValue !== undefined) {
      if (!/^\d{3}$/.test(statusValue)) {
        throw new Error("status must be an HTTP status code");
      }

      status = Number(statusValue);

      if (status < 100 || status > 599) {
        throw new Error("status must be between 100 and 599");
      }
    }

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (filters.appName) {
      conditions.push("app_name = ?");
      values.push(filters.appName);
    }

    if (method) {
      conditions.push("method = ?");
      values.push(method);
    }

    if (status !== undefined) {
      conditions.push("status = ?");
      values.push(status);
    }

    if (filters.search) {
      conditions.push("(url LIKE ? OR method LIKE ?)");
      const term = `%${filters.search}%`;
      values.push(term, term);
    }

    if (filters.from !== undefined) {
      conditions.push("started_at >= ?");
      values.push(filters.from);
    }

    if (filters.to !== undefined) {
      conditions.push("started_at <= ?");
      values.push(filters.to);
    }

    if (filters.cursor) {
      conditions.push("(started_at < ? OR (started_at = ? AND id < ?))");
      values.push(
        filters.cursor.lastSeen,
        filters.cursor.lastSeen,
        filters.cursor.id,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `
        SELECT *
        FROM network_request_details
        ${where}
        ORDER BY started_at DESC, id DESC
        LIMIT ?
      `,
      )
      .all(...values, filters.limit + 1) as Array<{
      id: number;
      started_at: number;
      [key: string]: unknown;
    }>;

    const hasMore = rows.length > filters.limit;
    const data = hasMore ? rows.slice(0, filters.limit) : rows;

    const last = data[data.length - 1];

    return {
      data,
      pagination: {
        limit: filters.limit,
        hasMore,
        nextCursor:
          hasMore && last
            ? encodeCursor({
                lastSeen: last.started_at,
                id: last.id,
              })
            : null,
      },
    };
  }

  function listApps() {
    const rows = db
      .prepare(
        `
        SELECT app_name, MAX(last_seen) AS last_seen
        FROM (
          SELECT app_name, last_seen FROM console_logs
          UNION ALL
          SELECT app_name, last_seen FROM network_requests
          UNION ALL
          SELECT app_name, started_at AS last_seen
          FROM network_request_details
        )
        GROUP BY app_name
        ORDER BY app_name ASC
      `,
      )
      .all();

    return { data: rows };
  }

  function handle(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    searchParams: URLSearchParams,
  ): boolean {
    const supportedPaths = [
      "/api/logs",
      "/api/network-requests",
      "/api/network-request-details",
      "/api/apps",
    ];

    if (!supportedPaths.includes(pathname)) {
      return false;
    }

    if (req.method !== "GET") {
      res.setHeader("allow", "GET");
      sendJson(res, 405, { error: "Method not allowed" });
      return true;
    }

    try {
      if (pathname === "/api/logs") {
        sendJson(res, 200, listLogs(searchParams));
      } else if (pathname === "/api/network-requests") {
        sendJson(res, 200, listNetworkRequests(searchParams));
      } else if (pathname === "/api/network-request-details") {
        sendJson(res, 200, listNetworkRequestDetails(searchParams));
      } else {
        sendJson(res, 200, listApps());
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid request";

      sendJson(res, 400, { error: message });
    }

    return true;
  }

  return {
    handle,
    close() {
      db.close();
    },
  };
}
