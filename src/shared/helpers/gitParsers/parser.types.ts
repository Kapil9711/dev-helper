export interface GitCurrentBranch {
  current: string;
  detached: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote: boolean;
}

export enum GitFileStatus {
  Modified = "modified",
  Added = "added",
  Deleted = "deleted",
  Renamed = "renamed",
  Copied = "copied",
  Unmerged = "unmerged",
}

export enum GitFileKind {
  Normal = "normal",
  Rename = "rename",
  Copy = "copy",
  Untracked = "untracked",
  Ignored = "ignored",
  Conflicted = "conflicted",
}

export interface GitChangedFile {
  /**
   * Current file path.
   */
  path: string;

  /**
   * Original path for rename/copy.
   */
  originalPath?: string;

  /**
   * Git record type.
   */
  kind: GitFileKind;

  /**
   * Status in the Git index.
   */
  indexStatus: GitFileStatus | null;

  /**
   * Status in the working tree.
   */
  workTreeStatus: GitFileStatus | null;
}

export interface GitStatusSummary {
  modified: number;

  added: number;

  deleted: number;

  renamed: number;

  copied: number;

  untracked: number;

  ignored: number;

  conflicted: number;

  staged: number;

  unstaged: number;

  total: number;
}

export interface GitStatus {
  /**
   * Current branch information.
   */
  currentBranch: GitCurrentBranch;

  /**
   * Changed files.
   */
  files: GitChangedFile[];

  /**
   * Repository summary.
   */
  summary: GitStatusSummary;
}
