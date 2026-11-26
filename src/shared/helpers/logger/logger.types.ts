export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

export interface VHLoggerConfig {
  serverUrl?: string;
  appName?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  disableNetworkTracking?: boolean;
  disableConsoleTracking?: boolean;
}

export interface VHLogEvent {
  eventId: string;
  appName: string;
  timestamp: number;
  type: "log";
  level: LogLevel;
  message: string;
  data?: unknown;
}

export interface VHNetworkReqEvent {
  eventId: string;
  appName: string;
  timestamp: number;
  type: "network:req";
  requestId: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
}

export interface VHNetworkResEvent {
  eventId: string;
  appName: string;
  timestamp: number;
  type: "network:res";
  requestId: string;
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  durationMs?: number;
  error?: string;
}

export type VHEvent = VHLogEvent | VHNetworkReqEvent | VHNetworkResEvent;
