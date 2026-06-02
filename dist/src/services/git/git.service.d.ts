declare class GitService {
    addAll(): Promise<void>;
    commit(message: string): Promise<void>;
    status(): Promise<void>;
    checkout(branch: string): Promise<void>;
    checkoutBranch(branch: string): Promise<void>;
    branches(): Promise<void>;
    restore(file?: string): Promise<void>;
    pushUpstream(): Promise<void>;
    pushOrigin(branch?: string): Promise<void>;
    pullOrigin(branch?: string): Promise<void>;
    pushWithPull(branch?: string): Promise<void>;
    pull(branch?: string): Promise<void>;
}
export declare const gitService: GitService;
export {};
