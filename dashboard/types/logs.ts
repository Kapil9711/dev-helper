export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface LogEntry {
  id: number;
  fingerprint: string;
  app_name: string;
  level: LogLevel;
  message: string;
  data_json: string | null;
  count: number;
  first_seen: number;
  last_seen: number;
}

export interface Pagination {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface LogsResponse {
  data: LogEntry[];
  pagination: Pagination;
}
