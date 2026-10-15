export type VHLogLevel = "debug" | "info" | "warn" | "error";

export interface VHBaseEvent {
  eventId: string;
  appName: string;
  timestamp: number;
}

export interface VHLogEvent extends VHBaseEvent {
  type: "log";
  level: VHLogLevel;
  message: string;
  data?: Record<string, unknown>;
  fingerprint: string;
}

export type VHHeaders = Record<string, string>;

export type VHQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface VHNetworkRequestEvent extends VHBaseEvent {
  type: "network:req";
  requestId: string;

  /** HTTP request details */
  method: string;
  url: string;
  params?: VHQueryParams;
  headers?: VHHeaders;
  body?: unknown;
}

export interface VHNetworkResponseEvent extends VHBaseEvent {
  type: "network:res";
  requestId: string;

  /** HTTP response details */
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  headers?: VHHeaders;
  body?: unknown;
  durationMs?: number;
  error?: string;
}

export type VHEvent =
  | VHLogEvent
  | VHNetworkRequestEvent
  | VHNetworkResponseEvent;

export interface VHOptions {
  appName: string;
  serverUrl: string | string[];
  showConsoleOnLog?: boolean;
}

export interface VHNetworkRequestInput {
  requestId: string;
  method: string;
  url: string;
  params?: VHQueryParams;
  headers?: VHHeaders;
  body?: unknown;
}

export interface VHNetworkResponseInput {
  requestId: string;
  method?: string;
  url?: string;
  status?: number;
  statusText?: string;
  headers?: VHHeaders;
  body?: unknown;
  durationMs?: number;
  error?: string;
}
