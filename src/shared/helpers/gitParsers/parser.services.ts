import { Option } from "@clack/prompts";
import {
  GitChangedFile,
  GitCurrentBranch,
  GitFileKind,
  GitFileStatus,
  GitStatus,
  GitStatusSummary,
  GitBranch,
} from "./parser.types.ts";

// it parse the git plumbing command
export class GitParser {
  static parseStatus(stdout: string): GitStatus {
    const status: GitStatus = {
      currentBranch: {
        current: "",
        detached: false,
        ahead: 0,
        behind: 0,
      },
      files: [],
      summary: GitSummaryBuilder.build([]),
    };

    const records = stdout.split("\0").filter(Boolean);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      switch (record[0]) {
        case "#":
          this.parseBranchRecord(record, status.currentBranch);
          break;

        case "1":
          status.files.push(this.parseNormalRecord(record));
          break;

        case "2": {
          /**
           * Rename/Copy records consume TWO records.
           *
           * record     -> metadata + new path
           * records[i+1] -> original path
           */
          const originalPath = records[++i];

          status.files.push(this.parseRenameRecord(record, originalPath));

          break;
        }

        case "?":
          status.files.push(this.parseUntrackedRecord(record));
          break;

        case "!":
          status.files.push(this.parseIgnoredRecord(record));
          break;

        case "u":
          status.files.push(this.parseUnmergedRecord(record));
          break;
      }
    }

    status.summary = GitSummaryBuilder.build(status.files);

    return status;
  }

  // --------------------------------------------------------------------------
  // Branch
  // --------------------------------------------------------------------------

  private static parseBranchRecord(record: string, branch: GitCurrentBranch) {
    if (record.startsWith("# branch.head ")) {
      const value = record.substring("# branch.head ".length);

      branch.detached = value === "(detached)";

      branch.current = branch.detached ? "" : value;

      return;
    }

    if (record.startsWith("# branch.upstream ")) {
      branch.upstream = record.substring("# branch.upstream ".length);

      return;
    }

    if (record.startsWith("# branch.ab ")) {
      const value = record.substring("# branch.ab ".length);

      const [ahead, behind] = value.split(" ");

      branch.ahead = Number(ahead.replace("+", ""));

      branch.behind = Number(behind.replace("-", ""));
    }
  }

  // --------------------------------------------------------------------------
  // Normal
  // --------------------------------------------------------------------------

  private static parseNormalRecord(record: string): GitChangedFile {
    /**
     * Format
     *
     * 1 XY SUB M1 M2 M3 H1 H2 PATH
     */

    const parts = record.split(" ");

    const xy = parts[1];

    return {
      kind: GitFileKind.Normal,

      path: parts.slice(8).join(" "),

      indexStatus: this.parseFileStatus(xy[0]),

      workTreeStatus: this.parseFileStatus(xy[1]),
    };
  }

  // --------------------------------------------------------------------------
  // Rename / Copy
  // --------------------------------------------------------------------------

  private static parseRenameRecord(
    record: string,
    originalPath: string,
  ): GitChangedFile {
    /**
     * Format
     *
     * 2 XY SUB ... SCORE NEW_PATH
     */

    const parts = record.split(" ");

    const xy = parts[1];

    return {
      kind: xy.includes("C") ? GitFileKind.Copy : GitFileKind.Rename,

      path: parts.slice(9).join(" "),

      originalPath,

      indexStatus: this.parseFileStatus(xy[0]),

      workTreeStatus: this.parseFileStatus(xy[1]),
    };
  }

  // --------------------------------------------------------------------------
  // Untracked
  // --------------------------------------------------------------------------

  private static parseUntrackedRecord(record: string): GitChangedFile {
    return {
      kind: GitFileKind.Untracked,

      path: record.substring(2),

      indexStatus: null,

      workTreeStatus: null,
    };
  }

  // --------------------------------------------------------------------------
  // Ignored
  // --------------------------------------------------------------------------

  private static parseIgnoredRecord(record: string): GitChangedFile {
    return {
      kind: GitFileKind.Ignored,

      path: record.substring(2),

      indexStatus: null,

      workTreeStatus: null,
    };
  }

  // --------------------------------------------------------------------------
  // Merge Conflict
  // --------------------------------------------------------------------------

  private static parseUnmergedRecord(record: string): GitChangedFile {
    const parts = record.split(" ");

    return {
      kind: GitFileKind.Conflicted,

      path: parts.at(-1) ?? "",

      indexStatus: GitFileStatus.Unmerged,

      workTreeStatus: GitFileStatus.Unmerged,
    };
  }

  // --------------------------------------------------------------------------
  // Status Parser
  // --------------------------------------------------------------------------

  private static parseFileStatus(code: string): GitFileStatus | null {
    switch (code) {
      case "M":
        return GitFileStatus.Modified;

      case "A":
        return GitFileStatus.Added;

      case "D":
        return GitFileStatus.Deleted;

      case "R":
        return GitFileStatus.Renamed;

      case "C":
        return GitFileStatus.Copied;

      case "U":
        return GitFileStatus.Unmerged;

      case ".":
        return null;

      default:
        return null;
    }
  }
}

// build summary for parsed command
export class GitSummaryBuilder {
  static build(files: GitChangedFile[]): GitStatusSummary {
    const summary: GitStatusSummary = {
      modified: 0,
      added: 0,
      deleted: 0,
      renamed: 0,
      copied: 0,
      untracked: 0,
      ignored: 0,
      conflicted: 0,

      staged: 0,
      unstaged: 0,

      total: files.length,
    };

    for (const file of files) {
      this.countKind(summary, file);

      this.countStatus(summary, file.indexStatus, true);

      this.countStatus(summary, file.workTreeStatus, false);
    }

    return summary;
  }

  private static countKind(summary: GitStatusSummary, file: GitChangedFile) {
    switch (file.kind) {
      case GitFileKind.Untracked:
        summary.untracked++;
        summary.unstaged++;
        break;

      case GitFileKind.Ignored:
        summary.ignored++;
        break;

      case GitFileKind.Conflicted:
        summary.conflicted++;
        break;
    }
  }

  private static countStatus(
    summary: GitStatusSummary,
    status: GitFileStatus | null,
    staged: boolean,
  ) {
    if (!status) {
      return;
    }

    if (staged) {
      summary.staged++;
    } else {
      summary.unstaged++;
    }

    switch (status) {
      case GitFileStatus.Modified:
        summary.modified++;
        break;

      case GitFileStatus.Added:
        summary.added++;
        break;

      case GitFileStatus.Deleted:
        summary.deleted++;
        break;

      case GitFileStatus.Renamed:
        summary.renamed++;
        break;

      case GitFileStatus.Copied:
        summary.copied++;
        break;

      case GitFileStatus.Unmerged:
        summary.conflicted++;
        break;
    }
  }
}

export class GitDisplay {
  static getFileIcon(file: GitChangedFile): string {
    if (file.kind === GitFileKind.Untracked) {
      return "✨";
    }

    if (file.kind === GitFileKind.Ignored) {
      return "🙈";
    }

    if (file.kind === GitFileKind.Rename) {
      return "🔄";
    }

    if (file.kind === GitFileKind.Copy) {
      return "📄";
    }

    if (file.kind === GitFileKind.Conflicted) {
      return "⚠️";
    }

    const status = file.workTreeStatus ?? file.indexStatus;

    switch (status) {
      case GitFileStatus.Added:
        return "➕";

      case GitFileStatus.Modified:
        return "📝";

      case GitFileStatus.Deleted:
        return "🗑";

      case GitFileStatus.Renamed:
        return "🔄";

      case GitFileStatus.Copied:
        return "📄";

      case GitFileStatus.Unmerged:
        return "⚠️";

      default:
        return "📄";
    }
  }

  static getFileStatus(file: GitChangedFile): string {
    if (file.kind === GitFileKind.Untracked) {
      return "Untracked";
    }

    if (file.kind === GitFileKind.Ignored) {
      return "Ignored";
    }

    if (file.kind === GitFileKind.Conflicted) {
      return "Conflicted";
    }

    return file.workTreeStatus ?? file.indexStatus ?? "Unknown";
  }

  static getFileLabel(file: GitChangedFile): string {
    const icon = this.getFileIcon(file);

    if (file.kind === GitFileKind.Rename && file.originalPath) {
      return `${icon} ${file.originalPath} → ${file.path}`;
    }

    return `${icon} ${file.path}`;
  }

  static getFileHint(file: GitChangedFile): string {
    const status = this.getFileStatus(file);

    const parts: string[] = [status];

    if (file.indexStatus) {
      parts.push("Staged");
    }

    if (file.workTreeStatus) {
      parts.push("Unstaged");
    }

    return parts.join(" • ");
  }

  static getBranchLabel(branch: GitCurrentBranch): string {
    let label = branch.current;

    if (branch.detached) {
      label = "Detached HEAD";
    }

    if (branch.upstream) {
      label += ` (${branch.upstream})`;
    }

    return label;
  }

  static getBranchHint(branch: GitCurrentBranch): string {
    return `↑ ${branch.ahead} ↓ ${branch.behind}`;
  }
  static getFileSelectOptions(files: GitChangedFile[]): Option<string>[] {
    return [
      {
        label: "🌍 Stage all changes (.)",
        value: ".",
        hint: "Equivalent to: git add .",
      },

      ...files.map((file) => ({
        label: this.getFileLabel(file),
        value: file.path,
        hint: this.getFileHint(file),
      })),
    ];
  }
}

export class GitStatusHelper {
  static getStageableFiles(files: GitChangedFile[]): GitChangedFile[] {
    return files.filter((file) => {
      if (file.kind === GitFileKind.Ignored) {
        return false;
      }

      if (file.kind === GitFileKind.Untracked) {
        return true;
      }

      // Has unstaged changes
      if (file.workTreeStatus) {
        return true;
      }

      // Already fully staged
      return false;
    });
  }
}
