declare class NetworkService {
    discover(target: string): Promise<void>;
    private discoverLocal;
    private discoverSubnet;
    private inspectDevice;
    private discoverHost;
    ports(host: string, options: {
        extended?: boolean;
        full?: boolean;
        ports?: string;
    }): Promise<void>;
    trace(host: string): Promise<void>;
    ssl(domain: string): Promise<void>;
    inspect(input: string): Promise<void>;
    private formatTime;
    private showDns;
    private showIp;
    private showRedirects;
    private showHeaders;
    private showStats;
}
export declare const networkService: NetworkService;
export {};
