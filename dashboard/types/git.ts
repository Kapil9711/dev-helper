export type GitFileKind =
  | "modified"
  | "untracked"
  | "deleted"
  | "renamed"
  | "conflict";

export interface GitChangedFile {
  path: string;
  origPath?: string;
  kind: GitFileKind;
  workingTreeStatus: string;
  indexStatus: string;
}

export interface GitCurrentBranch {
  current: string;
  detached: boolean;
  ahead: number;
  behind: number;
  upstream?: string;
}

export interface GitStatusSummary {
  total: number;
  modified: number;
  untracked: number;
  deleted: number;
  renamed: number;
  staged: number;
}

export interface GitStatusResponse {
  isRepo: boolean;
  currentBranch: GitCurrentBranch | null;
  files: GitChangedFile[];
  summary: GitStatusSummary | null;
  repoRoot: string;
}

export interface GitDiffResponse {
  diff: string;
  error: string | null;
}

export interface GitCommitItem {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface GitLogResponse {
  commits: GitCommitItem[];
}

export interface GitBranchItem {
  name: string;
  current: boolean;
  remote: boolean;
  fullRef?: string;
}

export interface GitBranchesResponse {
  branches: GitBranchItem[];
}

export interface GitActionPayload {
  action:
    | "stage"
    | "unstage"
    | "commit"
    | "push"
    | "pull"
    | "checkout"
    | "discard"
    | "stash";
  files?: string[];
  file?: string;
  message?: string;
  branch?: string;
  subAction?: "push" | "pop" | "apply" | "drop" | "list";
}

export interface GitActionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  command?: string;
  error?: string;
}
