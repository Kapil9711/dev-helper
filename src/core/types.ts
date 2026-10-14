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

export interface VHNetworkRequestEvent extends VHBaseEvent {
  type: "network:req";
  requestId: string;
  method: string;
  url: string;
}

export interface VHNetworkResponseEvent extends VHBaseEvent {
  type: "network:res";
  requestId: string;
  status?: number;
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
}

export interface VHNetworkResponseInput {
  requestId: string;
  status?: number;
  durationMs?: number;
  error?: string;
}
