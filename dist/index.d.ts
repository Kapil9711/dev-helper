type VHLogLevel = "debug" | "info" | "warn" | "error";
interface VHBaseEvent {
    eventId: string;
    appName: string;
    timestamp: number;
}
interface VHLogEvent extends VHBaseEvent {
    type: "log";
    level: VHLogLevel;
    message: string;
    data?: Record<string, unknown>;
    fingerprint: string;
}
interface VHNetworkRequestEvent extends VHBaseEvent {
    type: "network:req";
    requestId: string;
    method: string;
    url: string;
}
interface VHNetworkResponseEvent extends VHBaseEvent {
    type: "network:res";
    requestId: string;
    status?: number;
    durationMs?: number;
    error?: string;
}
type VHEvent = VHLogEvent | VHNetworkRequestEvent | VHNetworkResponseEvent;
interface VHOptions {
    appName: string;
    serverUrl: string | string[];
    showConsoleOnLog?: boolean;
}
interface VHNetworkRequestInput {
    requestId: string;
    method: string;
    url: string;
}
interface VHNetworkResponseInput {
    requestId: string;
    status?: number;
    durationMs?: number;
    error?: string;
}

interface VHClient {
    log: Record<VHLogLevel, (message: string, data?: Record<string, unknown>) => void>;
    network: {
        req(input: VHNetworkRequestInput): void;
        res(input: VHNetworkResponseInput): void;
    };
    flush(): Promise<void>;
    destroy(): Promise<void>;
}
declare function createVH(options: VHOptions): VHClient;

export { type VHClient, type VHEvent, type VHLogEvent, type VHLogLevel, type VHNetworkRequestEvent, type VHNetworkResponseEvent, type VHOptions, createVH };
