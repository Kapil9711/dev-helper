"use client";

import { useState, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Code,
  ListTree,
  Search,
  Download,
  WrapText,
  X,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface PrettyJsonProps {
  data: unknown;
  title?: string;
  maxHeight?: string;
  defaultExpandedDepth?: number;
  allowDownload?: boolean;
}

function parseInputData(data: unknown): unknown {
  if (data === null || data === undefined) return null;
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (typeof parsed === "string") {
        try {
          return JSON.parse(parsed);
        } catch {
          return parsed;
        }
      }
      return parsed;
    } catch {
      return data;
    }
  }
  return data;
}

function getJsonByteSize(obj: unknown): string {
  try {
    const str = typeof obj === "string" ? obj : JSON.stringify(obj);
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  } catch {
    return "";
  }
}

function highlightJsonSyntax(jsonStr: string): React.ReactNode {
  if (!jsonStr) return null;
  // Match JSON keys with colon, strings, numbers, booleans, null, brackets and colons
  const tokenRegex = /("(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(jsonStr)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(jsonStr.substring(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token.slice(0, 8)}`;

    if (token.endsWith(":")) {
      const keyVal = token.slice(0, -1);
      nodes.push(
        <span key={`${key}-k`} className="json-key font-semibold">
          {keyVal}
        </span>
      );
      nodes.push(
        <span key={`${key}-c`} className="json-colon opacity-70">
          :
        </span>
      );
    } else if (token.startsWith('"')) {
      nodes.push(
        <span key={key} className="json-string">
          {token}
        </span>
      );
    } else if (token === "true" || token === "false") {
      nodes.push(
        <span key={key} className="json-boolean font-semibold">
          {token}
        </span>
      );
    } else if (token === "null") {
      nodes.push(
        <span key={key} className="json-null italic opacity-80">
          {token}
        </span>
      );
    } else if (/^-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?$/.test(token)) {
      nodes.push(
        <span key={key} className="json-number font-medium">
          {token}
        </span>
      );
    } else if (/^[{}[\],]$/.test(token)) {
      nodes.push(
        <span key={key} className="json-bracket opacity-60">
          {token}
        </span>
      );
    } else {
      nodes.push(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < jsonStr.length) {
    nodes.push(jsonStr.substring(lastIndex));
  }

  return nodes;
}

interface TreeNodeProps {
  nodeKey?: string;
  value: unknown;
  depth: number;
  defaultExpandedDepth: number;
  searchTerm: string;
}

function TreeNode({
  nodeKey,
  value,
  depth,
  defaultExpandedDepth,
  searchTerm,
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState<boolean>(depth <= defaultExpandedDepth);
  const [nodeCopied, setNodeCopied] = useState(false);

  const copyNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setNodeCopied(true);
    playTone("click");
    setTimeout(() => setNodeCopied(false), 1500);
  };

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  // Primitive rendering
  if (!isObject) {
    let displayValue: React.ReactNode;
    let typeClass = "";

    if (typeof value === "string") {
      typeClass = "json-string";
      displayValue = `"${value}"`;
    } else if (typeof value === "number") {
      typeClass = "json-number";
      displayValue = String(value);
    } else if (typeof value === "boolean") {
      typeClass = "json-boolean";
      displayValue = String(value);
    } else if (value === null) {
      typeClass = "json-null";
      displayValue = "null";
    } else {
      displayValue = String(value);
    }

    const matchesSearch =
      searchTerm &&
      (String(nodeKey).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(value).toLowerCase().includes(searchTerm.toLowerCase()));

    return (
      <div
        className={`group flex items-baseline gap-1 py-0.5 px-1.5 rounded hover:bg-white/[0.04] transition font-mono text-xs leading-5 ${
          matchesSearch ? "bg-amber-500/20 ring-1 ring-amber-400/40" : ""
        }`}
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
      >
        {nodeKey !== undefined && (
          <>
            <span className="json-key">"{nodeKey}"</span>
            <span className="json-colon mr-1">:</span>
          </>
        )}
        <span className={typeClass}>{displayValue}</span>
        <button
          onClick={copyNode}
          title="Copy value"
          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-500 hover:vh-text-main transition"
        >
          {nodeCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      </div>
    );
  }

  // Object or Array rendering
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);

  const itemCount = entries.length;

  return (
    <div className="font-mono text-xs leading-5">
      <div
        onClick={() => setExpanded((prev) => !prev)}
        className="group flex items-center gap-1.5 py-0.5 px-1.5 rounded hover:bg-white/[0.04] cursor-pointer select-none transition"
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
      >
        <button
          type="button"
          className="p-0.5 text-gray-500 hover:vh-text-main transition"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {nodeKey !== undefined && (
          <>
            <span className="json-key">"{nodeKey}"</span>
            <span className="json-colon">:</span>
          </>
        )}

        <span className="json-bracket">{isArray ? "[" : "{"}</span>

        {!expanded && (
          <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] text-gray-400 font-sans">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        )}

        {!expanded && (
          <span className="json-bracket">{isArray ? "]" : "}"}</span>
        )}

        <button
          onClick={copyNode}
          title="Copy node"
          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-500 hover:vh-text-main transition"
        >
          {nodeCopied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      </div>

      {expanded && (
        <div>
          {entries.map(([k, v]) => (
            <TreeNode
              key={k}
              nodeKey={isArray ? undefined : k}
              value={v}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
              searchTerm={searchTerm}
            />
          ))}
          <div
            className="json-bracket py-0.5 px-1.5"
            style={{ paddingLeft: `${depth * 18 + 22}px` }}
          >
            {isArray ? "]" : "}"}
          </div>
        </div>
      )}
    </div>
  );
}

export function PrettyJson({
  data,
  title,
  maxHeight = "360px",
  defaultExpandedDepth = 2,
  allowDownload = true,
}: PrettyJsonProps) {
  const [viewMode, setViewMode] = useState<"tree" | "raw">("tree");
  const [wrapLines, setWrapLines] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);

  const parsedData = useMemo(() => parseInputData(data), [data]);
  const formattedString = useMemo(() => {
    if (parsedData === null || parsedData === undefined) return "null";
    if (typeof parsedData === "string") return parsedData;
    try {
      return JSON.stringify(parsedData, null, 2);
    } catch {
      return String(parsedData);
    }
  }, [parsedData]);

  const byteSize = useMemo(() => getJsonByteSize(formattedString), [formattedString]);

  const copyFullJson = () => {
    navigator.clipboard.writeText(formattedString);
    setCopied(true);
    playTone("success");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    const blob = new Blob([formattedString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title ? title.toLowerCase().replace(/\s+/g, "-") : "data"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playTone("click");
  };

  if (data === null || data === undefined || data === "") {
    return (
      <div className="rounded-xl border vh-border vh-bg-input p-4 text-center text-xs vh-text-dim font-mono">
        No payload or data recorded
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border vh-border vh-bg-input shadow-sm">
      {/* JSON Viewer Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b vh-border px-3.5 py-2 vh-bg-subtle text-xs">
        <div className="flex items-center gap-2">
          {title && (
            <span className="font-semibold text-xs vh-text-main">{title}</span>
          )}
          {byteSize && (
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-mono font-medium vh-text-muted">
              {byteSize}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* In-viewer quick search */}
          <div className="flex items-center gap-1 rounded-md border vh-border vh-bg-subtle px-2 py-1 text-[11px]">
            <Search size={11} className="vh-text-dim" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter keys..."
              className="w-20 border-0 bg-transparent text-[11px] vh-text-main shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 placeholder:text-gray-500 focus:w-28 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="vh-text-dim hover:opacity-100">
                <X size={10} />
              </button>
            )}
          </div>

          {/* Tree / Raw Switcher */}
          <div className="flex items-center rounded-lg border vh-border vh-bg-subtle p-0.5">
            <button
              onClick={() => setViewMode("tree")}
              title="Tree view"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                viewMode === "tree"
                  ? "vh-bg-accent vh-text-accent font-semibold shadow-xs"
                  : "vh-text-dim hover:opacity-100"
              }`}
            >
              <ListTree size={12} />
              Tree
            </button>
            <button
              onClick={() => setViewMode("raw")}
              title="Raw JSON code view"
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
                viewMode === "raw"
                  ? "vh-bg-accent vh-text-accent font-semibold shadow-xs"
                  : "vh-text-dim hover:opacity-100"
              }`}
            >
              <Code size={12} />
              Raw
            </button>
          </div>

          {/* Line wrap toggle in raw mode */}
          {viewMode === "raw" && (
            <button
              onClick={() => setWrapLines((prev) => !prev)}
              title={wrapLines ? "Disable word wrap" : "Enable word wrap"}
              className={`p-1.5 rounded-lg border vh-border transition ${
                wrapLines ? "vh-bg-accent vh-text-accent" : "vh-text-dim hover:opacity-100"
              }`}
            >
              <WrapText size={12} />
            </button>
          )}

          {/* Download button */}
          {allowDownload && (
            <button
              onClick={downloadJson}
              title="Download JSON file"
              className="p-1.5 rounded-lg border vh-border vh-text-dim hover:opacity-100 hover:bg-white/5 transition"
            >
              <Download size={12} />
            </button>
          )}

          {/* Copy Button */}
          <button
            onClick={copyFullJson}
            className="flex items-center gap-1.5 rounded-lg border vh-border px-2.5 py-1 text-[11px] font-medium vh-text-main hover:border-white/30 hover:bg-white/5 transition"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* JSON Content Area */}
      <div
        className="overflow-auto p-3.5"
        style={{ maxHeight }}
      >
        {viewMode === "tree" && typeof parsedData === "object" && parsedData !== null ? (
          <TreeNode
            value={parsedData}
            depth={0}
            defaultExpandedDepth={defaultExpandedDepth}
            searchTerm={searchTerm}
          />
        ) : (
          <pre
            className={`font-mono text-xs leading-6 vh-text-main select-text ${
              wrapLines ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
            }`}
          >
            {highlightJsonSyntax(formattedString)}
          </pre>
        )}
      </div>
    </div>
  );
}
