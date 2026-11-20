export type GitFileKind =
  | "normal"
  | "modified"
  | "untracked"
  | "deleted"
  | "renamed"
  | "copy"
  | "conflict";

export interface GitChangedFile {
  path: string;
  origPath?: string;
  kind: GitFileKind;
  workTreeStatus: string | null;
  indexStatus: string | null;
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
  relativeDate: string;
  refs: string[];
  parents: string[];
  message: string;
}

export interface GitLogResponse {
  commits: GitCommitItem[];
}

export interface GitCommitDetailResponse {
  hash: string;
  output: string;
  error: string | null;
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

export interface GitStashItem {
  ref: string;
  message: string;
}

export interface GitStashListResponse {
  stashes: GitStashItem[];
}

export interface GitStashDiffResponse {
  stash: string;
  diff: string;
  error: string | null;
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
    | "stash"
    | "create-branch"
    | "delete-branch"
    | "merge"
    | "undo-commit"
    | "fetch";
  files?: string[];
  file?: string;
  message?: string;
  branch?: string;
  remote?: string;
  stashRef?: string;
  subAction?: "push" | "pop" | "apply" | "drop" | "list";
}

export interface GitActionResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  command?: string;
  durationMs?: number;
  error?: string;
}
