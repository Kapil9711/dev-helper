"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  FileCode,
  Edit3,
  Eye,
  Save,
  RefreshCw,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Search,
  Clock,
  HardDrive,
  AlertCircle,
  FileText,
  FolderGit2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGitLiveFilesQuery,
  useGitFileContentQuery,
  queryKeys,
} from "@/lib/queries";
import { apiClient } from "@/lib/api-client";
import { playTone } from "@/lib/prefrences";
import type { GitLiveFile } from "@/types/git";

export function LiveFileEditor() {
  const queryClient = useQueryClient();

  // Watch mode toggles periodic polling of modified files and content
  const [isLiveWatch, setIsLiveWatch] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileDraft, setFileDraft] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Queries - Strictly limited to the top 2 files: current editing file and last edited file
  const liveFilesQuery = useGitLiveFilesQuery(isLiveWatch && !hasUnsavedChanges ? 3000 : undefined);
  const activeFiles = useMemo(() => {
    return (liveFilesQuery.data?.files ?? []).slice(0, 2);
  }, [liveFilesQuery.data?.files]);

  // Determine which file to display: user choice or the current editing file (index 0)
  const currentFile = useMemo(() => {
    if (selectedFilePath) {
      const match = activeFiles.find((f) => f.path === selectedFilePath);
      if (match) return match;
    }
    return activeFiles[0] ?? null;
  }, [selectedFilePath, activeFiles]);

  const activePath = currentFile?.path ?? null;

  // Query file content from disk (poll only if not currently editing draft)
  const fileContentQuery = useGitFileContentQuery(
    activePath,
    isLiveWatch && !hasUnsavedChanges ? 2500 : undefined,
  );

  const serverContent = fileContentQuery.data?.content ?? "";

  // Synchronize draft when server content updates (unless user has unsaved edits)
  useEffect(() => {
    if (!hasUnsavedChanges) {
      setFileDraft(serverContent);
    }
  }, [serverContent, hasUnsavedChanges]);

  // Reset unsaved flag when switching files
  const handleSelectFile = (path: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes in the current file. Discard them?")) {
        return;
      }
    }
    setSelectedFilePath(path);
    setHasUnsavedChanges(false);
    playTone("click");
  };

  // Handle text edits in draft
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFileDraft(val);
    setHasUnsavedChanges(val !== serverContent);
  };

  // Keyboard shortcut Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (hasUnsavedChanges && activePath) {
          void handleSaveFile();
        }
      }
      if (e.key === "Escape" && isFullScreen) {
        setIsFullScreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, activePath, isFullScreen, fileDraft]);

  // Save changes to disk
  const handleSaveFile = async () => {
    if (!activePath) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const result = await apiClient.saveGitFile(activePath, fileDraft);
      if (result.success) {
        setHasUnsavedChanges(false);
        setSaveStatus("Saved to disk");
        playTone("success");
        await queryClient.invalidateQueries({
          queryKey: queryKeys.gitFileContent(activePath),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.gitStatus,
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.gitLiveFiles,
        });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("Failed to save");
        playTone("error");
      }
    } catch {
      setSaveStatus("Error saving file");
      playTone("error");
    } finally {
      setIsSaving(false);
    }
  };

  // Stage current file
  const handleStageFile = async () => {
    if (!activePath) return;
    try {
      await apiClient.executeGitAction({ action: "stage", files: [activePath] });
      playTone("success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.gitStatus });
      await queryClient.invalidateQueries({ queryKey: queryKeys.gitLiveFiles });
    } catch {
      playTone("error");
    }
  };

  // Discard changes
  const handleDiscardChanges = async () => {
    if (!activePath) return;
    if (!window.confirm(`Discard all uncommitted changes in ${activePath}?`)) return;
    try {
      await apiClient.executeGitAction({ action: "discard", file: activePath });
      setHasUnsavedChanges(false);
      playTone("success");
      await queryClient.invalidateQueries({ queryKey: queryKeys.gitFileContent(activePath) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.gitStatus });
      await queryClient.invalidateQueries({ queryKey: queryKeys.gitLiveFiles });
    } catch {
      playTone("error");
    }
  };

  // Copy file content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fileDraft);
      setCopySuccess(true);
      playTone("click");
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Ignored
    }
  };

  // Compute line count and numbers
  const lines = useMemo(() => {
    return fileDraft.split("\n");
  }, [fileDraft]);

  const relativeTime = (timestamp: number) => {
    const diff = Math.max(0, Date.now() - timestamp);
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={`flex flex-col transition-all duration-200 ${
        isFullScreen
          ? "fixed inset-0 z-50 p-3 sm:p-5 bg-black/90 backdrop-blur-xl h-screen w-screen"
          : "rounded-2xl border vh-border vh-bg-card shadow-sm min-h-[640px]"
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b vh-border px-4 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl vh-bg-accent vh-text-accent border vh-border-accent">
            <FileCode size={16} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm vh-text-main truncate">
                {activePath || "No file selected"}
              </h3>
              {currentFile && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold border border-amber-500/20 bg-amber-500/10 text-amber-400">
                  {currentFile.status}
                </span>
              )}
              {hasUnsavedChanges && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25 animate-pulse">
                  Unsaved draft
                </span>
              )}
              {saveStatus && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  {saveStatus}
                </span>
              )}
            </div>
            <p className="text-[11px] vh-text-dim truncate">
              {lines.length} lines ·{" "}
              {currentFile?.size ? `${(currentFile.size / 1024).toFixed(1)} KB` : "0 KB"} ·{" "}
              {currentFile ? `Modified ${relativeTime(currentFile.mtime)}` : "Live watcher"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Live Watch Toggle */}
          <button
            onClick={() => {
              setIsLiveWatch((prev) => !prev);
              playTone("click");
            }}
            title={isLiveWatch ? "Live Watch ON: Auto-refreshing from disk" : "Live Watch OFF"}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition ${
              isLiveWatch
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-xs"
                : "vh-border vh-bg-card vh-text-dim hover:text-white"
            }`}
          >
            <RefreshCw size={12} className={isLiveWatch ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{isLiveWatch ? "Live Watch ON" : "Live Watch OFF"}</span>
          </button>

          {/* Mode Switcher: View vs Edit */}
          <div className="flex items-center rounded-xl border vh-border vh-bg-card p-0.5 text-xs">
            <button
              onClick={() => {
                setIsEditMode(false);
                playTone("click");
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                !isEditMode ? "vh-bg-accent vh-text-accent" : "vh-text-dim hover:text-white"
              }`}
            >
              <Eye size={12} />
              <span>Live View</span>
            </button>
            <button
              onClick={() => {
                setIsEditMode(true);
                playTone("click");
              }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-semibold transition ${
                isEditMode ? "vh-bg-accent vh-text-accent" : "vh-text-dim hover:text-white"
              }`}
            >
              <Edit3 size={12} />
              <span>Edit</span>
            </button>
          </div>

          {/* Save Button */}
          {isEditMode && (
            <button
              onClick={() => void handleSaveFile()}
              disabled={isSaving || !hasUnsavedChanges}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition ${
                hasUnsavedChanges
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-400/30"
                  : "vh-border vh-bg-card vh-text-dim opacity-50 cursor-not-allowed border"
              }`}
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save"}</span>
              <span className="text-[10px] opacity-70 hidden md:inline">⌘S</span>
            </button>
          )}

          {/* Stage File */}
          <button
            onClick={() => void handleStageFile()}
            title="Stage this file in git"
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-2.5 py-1.5 text-xs font-medium vh-text-main hover:border-emerald-500/40 hover:text-emerald-400 transition"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Stage</span>
          </button>

          {/* Discard Changes */}
          {currentFile?.status !== "clean" && (
            <button
              onClick={() => void handleDiscardChanges()}
              title="Discard changes in this file"
              className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-2.5 py-1.5 text-xs font-medium vh-text-dim hover:border-rose-500/40 hover:text-rose-400 transition"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Discard</span>
            </button>
          )}

          {/* Copy Content */}
          <button
            onClick={() => void handleCopy()}
            title="Copy file contents"
            className="flex h-8 w-8 items-center justify-center rounded-xl border vh-border vh-bg-card vh-text-dim hover:text-white transition"
          >
            {copySuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={() => {
              setIsFullScreen((prev) => !prev);
              playTone("click");
            }}
            title={isFullScreen ? "Exit full screen (Esc)" : "Expand to Full Screen"}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card px-2.5 py-1.5 text-xs font-semibold vh-text-accent hover:border-white/20 transition shadow-xs"
          >
            {isFullScreen ? (
              <>
                <Minimize2 size={13} />
                <span className="hidden sm:inline">Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} />
                <span className="hidden sm:inline">Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Files Strip: ONLY Current Editing File & Last Edited File */}
      <div className="flex items-center gap-2 border-b vh-border px-4 py-2 bg-black/20 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-semibold uppercase tracking-wider vh-text-dim shrink-0">
          Active Workspace ({activeFiles.length}):
        </span>

        {activeFiles.length === 0 ? (
          <span className="text-xs vh-text-dim italic">
            Working tree clean — no active file edits
          </span>
        ) : (
          activeFiles.map((file, idx) => {
            const isSelected = file.path === activePath;
            const isCurrent = idx === 0;
            const tagLabel = isCurrent ? "Current Editing" : "Last Edited";

            return (
              <button
                key={file.path}
                onClick={() => handleSelectFile(file.path)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs transition shrink-0 ${
                  isSelected
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-xs font-semibold scale-[1.01]"
                    : "vh-border vh-bg-card vh-text-dim hover:text-white hover:border-white/20"
                }`}
              >
                <span
                  className={`flex items-center gap-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md ${
                    isCurrent
                      ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isCurrent ? "bg-emerald-400 animate-pulse" : "bg-zinc-400"
                    }`}
                  />
                  {tagLabel}
                </span>

                <FileText size={12} className={isSelected ? "text-emerald-400" : "vh-text-dim"} />
                <span className="font-mono text-xs max-w-[200px] sm:max-w-[320px] truncate">
                  {file.path}
                </span>

                <span className="text-[10px] font-mono opacity-60">
                  {relativeTime(file.mtime)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Editor & Viewer Body */}
      <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
        {/* Line Numbers Gutter */}
        <div className="select-none py-3 px-2 sm:px-3 text-right vh-text-dim/50 border-r vh-border bg-black/15 min-w-[3rem] sm:min-w-[3.5rem] overflow-hidden">
          {lines.map((_, i) => (
            <div key={i} className="leading-5 h-5 text-[11px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-auto">
          {isEditMode ? (
            <textarea
              ref={textareaRef}
              value={fileDraft}
              onChange={handleTextChange}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const nextValue =
                    fileDraft.substring(0, start) + "  " + fileDraft.substring(end);
                  setFileDraft(nextValue);
                  setHasUnsavedChanges(true);
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
                        start + 2;
                    }
                  }, 0);
                }
              }}
              spellCheck={false}
              className="w-full h-full p-3 font-mono text-xs leading-5 vh-bg-app vh-text-main resize-none focus:outline-none border-none selection:bg-emerald-500/30 overflow-auto whitespace-pre"
            />
          ) : (
            <pre className="p-3 font-mono text-xs leading-5 vh-text-main whitespace-pre selection:bg-emerald-500/30">
              {fileDraft || (
                <span className="vh-text-dim italic">File is empty or loading...</span>
              )}
            </pre>
          )}
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between border-t vh-border px-4 py-2 bg-black/20 text-[11px] vh-text-dim">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <HardDrive size={12} />
            <span>Path: {activePath || "None"}</span>
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:flex items-center gap-1">
            <Clock size={12} />
            <span>Last Read: {new Date().toLocaleTimeString()}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isFullScreen && (
            <span className="hidden sm:inline text-xs text-zinc-400">
              Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-white">Esc</kbd> to exit full screen
            </span>
          )}
          {isEditMode && (
            <span className="text-emerald-400 font-medium">
              Edit Mode Active (Tab = 2 spaces)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
