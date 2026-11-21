"use client";

import { useState } from "react";
import {
  Download,
  X,
  Archive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileMusic,
  ExternalLink,
} from "lucide-react";
import type { SongData, SoundQuality } from "@/types/music";
import { playTone } from "@/lib/prefrences";

interface BatchDownloadModalProps {
  isOpen: boolean;
  category: string;
  categoryName: string;
  songs: SongData[];
  downloadQuality: SoundQuality;
  onClose: () => void;
}

export function BatchDownloadModal({
  isOpen,
  category,
  categoryName,
  songs,
  downloadQuality,
  onClose,
}: BatchDownloadModalProps) {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    running: boolean;
    current: number;
    total: number;
    currentTitle: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleDownloadZipArchive = () => {
    setDownloadingZip(true);
    playTone("click");
    const zipUrl = `/api/music/download-all?category=${encodeURIComponent(category)}&quality=${downloadQuality}`;
    const link = document.createElement("a");
    link.href = zipUrl;
    link.download = `${category}-playlist.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingZip(false);
    }, 2000);
  };

  const handleDownloadAllToBrowser = async () => {
    if (batchProgress?.running) return;
    setBatchProgress({
      running: true,
      current: 0,
      total: songs.length,
      currentTitle: songs[0]?.name || "",
    });

    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      setBatchProgress({
        running: true,
        current: i + 1,
        total: songs.length,
        currentTitle: song.name,
      });

      const audioUrl =
        song.downloadUrl.find((u) => u.quality === downloadQuality)?.url ||
        song.downloadUrl[song.downloadUrl.length - 1]?.url ||
        song.downloadUrl[0]?.url;

      if (audioUrl) {
        const primaryArtist = song.artists?.primary?.map((a) => a.name).join(", ") || "Unknown";
        const cleanFileName = `${song.name} - ${primaryArtist}.mp4`.replace(/[\\/:*?"<>|]/g, "_");

        try {
          const res = await fetch(audioUrl);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = cleanFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
          } else {
            throw new Error();
          }
        } catch {
          // Fallback to hidden iframe in same tab
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = `/api/music/file-download?songId=${encodeURIComponent(song.id)}&quality=${downloadQuality}`;
          document.body.appendChild(iframe);
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
            } catch {}
          }, 30000);
        }
      }

      // Small delay between triggers to prevent browser popup throttling
      await new Promise((r) => setTimeout(r, 600));
    }

    setBatchProgress(null);
    playTone("click");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border vh-border vh-bg-modal p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b vh-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-sky-400">
              <Archive size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold vh-text-main">
                Download {categoryName} Playlist
              </h3>
              <p className="text-xs vh-text-dim">
                {songs.length} audio tracks · Quality: {downloadQuality}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 vh-text-dim hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Options */}
        <div className="mt-5 space-y-4">
          {/* Option 1: ZIP Archive */}
          <div className="rounded-xl border vh-border vh-bg-input p-4 transition hover:border-sky-500/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold vh-text-main flex items-center gap-2">
                  <Archive size={14} className="text-sky-400" />
                  Download Playlist ZIP Package
                </h4>
                <p className="mt-1 text-[11px] vh-text-dim">
                  Downloads a single ZIP archive containing the playlist files (.m3u & manifest JSON).
                </p>
              </div>

              <button
                onClick={handleDownloadZipArchive}
                disabled={downloadingZip}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 px-3.5 py-2 text-xs font-bold text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50"
              >
                {downloadingZip ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Packaging...
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Download ZIP
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Browser Batch Audio Downloader */}
          <div className="rounded-xl border vh-border vh-bg-input p-4 transition hover:border-pink-500/40">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold vh-text-main flex items-center gap-2">
                  <FileMusic size={14} className="text-pink-400" />
                  Sequential Audio File Downloader
                </h4>
                <p className="mt-1 text-[11px] vh-text-dim">
                  Triggers browser downloads for all {songs.length} audio tracks sequentially at {downloadQuality}.
                </p>
              </div>

              <button
                onClick={handleDownloadAllToBrowser}
                disabled={batchProgress?.running}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-pink-500/40 bg-pink-500/15 px-3.5 py-2 text-xs font-bold text-pink-300 hover:bg-pink-500/25 transition disabled:opacity-50"
              >
                {batchProgress?.running ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    {batchProgress.current}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <Download size={13} />
                    Download All
                  </>
                )}
              </button>
            </div>

            {batchProgress?.running && (
              <div className="mt-3 pt-3 border-t vh-border space-y-1">
                <div className="flex justify-between text-[10px] font-mono vh-text-dim">
                  <span className="truncate max-w-[200px]">Saving: {batchProgress.currentTitle}</span>
                  <span>
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-500 transition-all duration-200"
                    style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t vh-border flex items-center justify-between text-[11px] vh-text-dim">
          <span>Bitrate: {downloadQuality} · Configured in Settings</span>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 border vh-border vh-bg-input vh-text-main hover:bg-white/5 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
