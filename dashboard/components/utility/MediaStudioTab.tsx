"use client";

import { useState, useRef } from "react";
import {
  Video,
  Upload,
  Download,
  Play,
  Scissors,
  Image,
  Music,
  RefreshCw,
  Sparkles,
  Sliders,
  AlertCircle,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export function MediaStudioTab() {
  const [subTab, setSubTab] = useState<"gif" | "thumb" | "trim" | "extract-audio" | "audio-conv">("gif");

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Video to GIF options
  const [fps, setFps] = useState<number>(12);
  const [scale, setScale] = useState<number>(480);
  const [gifStartTime, setGifStartTime] = useState<number>(0);
  const [gifDuration, setGifDuration] = useState<number>(5);

  // Thumbnail options
  const [thumbTime, setThumbTime] = useState<number>(0);
  const [thumbFormat, setThumbFormat] = useState<"png" | "jpeg">("png");

  // Trim options
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(5);

  // Audio extraction options
  const [audioFormat, setAudioFormat] = useState<"mp3" | "wav" | "aac">("mp3");

  // Audio convert options
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioTargetFormat, setAudioTargetFormat] = useState<string>("mp3");
  const [audioBitrate, setAudioBitrate] = useState<string>("192k");

  // Results
  const [outputResult, setOutputResult] = useState<{ url: string; type: "gif" | "image" | "video" | "audio" } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoElemRef = useRef<HTMLVideoElement>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localUrl = URL.createObjectURL(file);
    setVideoUrl(localUrl);
    setOutputResult(null);

    const reader = new FileReader();
    reader.onload = () => {
      setVideoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAudioDataUrl(reader.result as string);
      setOutputResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    playTone("click");

    try {
      if (subTab === "gif" && videoDataUrl) {
        const res = await fetch("/api/utility/media/video-to-gif", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: videoDataUrl,
            options: { fps, scale, startTime: gifStartTime, duration: gifDuration },
          }),
        });
        if (!res.ok) throw new Error("Video-to-GIF conversion failed");
        const data = await res.json();
        setOutputResult({ url: data.dataUrl, type: "gif" });
      } else if (subTab === "thumb" && videoDataUrl) {
        const res = await fetch("/api/utility/media/thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: videoDataUrl,
            options: { timestamp: thumbTime, format: thumbFormat },
          }),
        });
        if (!res.ok) throw new Error("Thumbnail extraction failed");
        const data = await res.json();
        setOutputResult({ url: data.dataUrl, type: "image" });
      } else if (subTab === "trim" && videoDataUrl) {
        const res = await fetch("/api/utility/media/trim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: videoDataUrl,
            options: { startTime: trimStart, endTime: trimEnd },
          }),
        });
        if (!res.ok) throw new Error("Video trim failed");
        const data = await res.json();
        setOutputResult({ url: data.dataUrl, type: "video" });
      } else if (subTab === "extract-audio" && videoDataUrl) {
        const res = await fetch("/api/utility/media/extract-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: videoDataUrl,
            format: audioFormat,
          }),
        });
        if (!res.ok) throw new Error("Audio extraction failed");
        const data = await res.json();
        setOutputResult({ url: data.dataUrl, type: "audio" });
      } else if (subTab === "audio-conv" && audioDataUrl) {
        const res = await fetch("/api/utility/media/convert-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dataUrl: audioDataUrl,
            options: { format: audioTargetFormat, bitrate: audioBitrate },
          }),
        });
        if (!res.ok) throw new Error("Audio conversion failed");
        const data = await res.json();
        setOutputResult({ url: data.dataUrl, type: "audio" });
      }
    } catch (err: any) {
      alert(`Media Processing Notice: ${err.message}. If FFmpeg is not installed or sandboxed, media tools require FFmpeg in your PATH.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!outputResult) return;
    playTone("click");
    const a = document.createElement("a");
    a.href = outputResult.url;
    const ext =
      outputResult.type === "gif"
        ? "gif"
        : outputResult.type === "image"
        ? thumbFormat === "jpeg"
          ? "jpg"
          : "png"
        : outputResult.type === "audio"
        ? subTab === "extract-audio"
          ? audioFormat
          : audioTargetFormat
        : "mp4";
    a.download = `vh-media-export.${ext}`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b vh-border pb-3">
        {[
          { id: "gif", label: "Video to GIF", icon: Sparkles },
          { id: "thumb", label: "Frame Extractor", icon: Image },
          { id: "trim", label: "Video Trimmer", icon: Scissors },
          { id: "extract-audio", label: "Extract Audio (MP3)", icon: Music },
          { id: "audio-conv", label: "Audio Format Converter", icon: Sliders },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              playTone("click");
              setSubTab(t.id as any);
              setOutputResult(null);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === t.id
                ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-xs"
                : "border vh-border vh-bg-card vh-text-dim hover:text-white"
            }`}
          >
            <t.icon size={14} />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Column */}
        <div className="space-y-4 lg:col-span-5">
          {/* File Upload Box */}
          {subTab !== "audio-conv" ? (
            <div
              onClick={() => videoInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed vh-border hover:border-cyan-500/60 vh-bg-card/60 p-6 text-center cursor-pointer transition"
            >
              <input
                type="file"
                ref={videoInputRef}
                onChange={handleVideoUpload}
                accept="video/*"
                className="hidden"
              />
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition">
                <Video size={24} />
              </div>
              <p className="mt-3 text-sm font-bold text-white">Click or drag video to upload</p>
              <p className="mt-1 text-xs vh-text-dim">Supports MP4, MOV, WEBM, MKV</p>
            </div>
          ) : (
            <div
              onClick={() => audioInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed vh-border hover:border-cyan-500/60 vh-bg-card/60 p-6 text-center cursor-pointer transition"
            >
              <input
                type="file"
                ref={audioInputRef}
                onChange={handleAudioUpload}
                accept="audio/*"
                className="hidden"
              />
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition">
                <Music size={24} />
              </div>
              <p className="mt-3 text-sm font-bold text-white">Click or drag audio file to upload</p>
              <p className="mt-1 text-xs vh-text-dim">Supports MP3, WAV, AAC, FLAC, OGG</p>
            </div>
          )}

          {/* Context Controls */}
          {subTab === "gif" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                GIF Parameters
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Target FPS</label>
                  <select
                    value={fps}
                    onChange={(e) => setFps(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={10}>10 FPS (Compact)</option>
                    <option value={12}>12 FPS (Standard)</option>
                    <option value={15}>15 FPS (Smooth)</option>
                    <option value={24}>24 FPS (Cinematic)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Width Scale</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={320}>320px</option>
                    <option value={480}>480px (Recommended)</option>
                    <option value={640}>640px (High Res)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Start Time (sec)</label>
                  <input
                    type="number"
                    min="0"
                    value={gifStartTime}
                    onChange={(e) => setGifStartTime(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Duration (sec)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={gifDuration}
                    onChange={(e) => setGifDuration(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {subTab === "thumb" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Frame Extractor Settings
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="vh-text-dim">Timestamp</span>
                  <span className="text-cyan-400">{thumbTime.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 60}
                  step="0.1"
                  value={thumbTime}
                  onChange={(e) => {
                    const t = Number(e.target.value);
                    setThumbTime(t);
                    if (videoElemRef.current) videoElemRef.current.currentTime = t;
                  }}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold vh-text-dim">Image Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setThumbFormat("png")}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      thumbFormat === "png"
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "vh-border vh-bg-card/40 vh-text-dim hover:text-white"
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                  <button
                    onClick={() => setThumbFormat("jpeg")}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      thumbFormat === "jpeg"
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "vh-border vh-bg-card/40 vh-text-dim hover:text-white"
                    }`}
                  >
                    JPEG (Compact)
                  </button>
                </div>
              </div>
            </div>
          )}

          {subTab === "trim" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Clip Timestamps
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Start Time (sec)</label>
                  <input
                    type="number"
                    min="0"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">End Time (sec)</label>
                  <input
                    type="number"
                    min="0.5"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {subTab === "extract-audio" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Target Audio Format
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {["mp3", "wav", "aac"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAudioFormat(f as any)}
                    className={`rounded-xl border py-2 text-xs font-mono font-bold uppercase transition ${
                      audioFormat === f
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "vh-border vh-bg-card/40 vh-text-dim hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {subTab === "audio-conv" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Audio Conversion
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {["mp3", "wav", "aac", "ogg", "flac"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setAudioTargetFormat(f)}
                    className={`rounded-xl border py-2 text-xs font-mono font-bold uppercase transition ${
                      audioTargetFormat === f
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "vh-border vh-bg-card/40 vh-text-dim hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold vh-text-dim">Bitrate</label>
                <select
                  value={audioBitrate}
                  onChange={(e) => setAudioBitrate(e.target.value)}
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="128k">128 kbps (Standard)</option>
                  <option value="192k">192 kbps (High Quality)</option>
                  <option value="320k">320 kbps (Maximum Quality)</option>
                </select>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleProcess}
            disabled={(!videoDataUrl && !audioDataUrl) || isProcessing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 text-sm transition disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
          >
            {isProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>Processing with FFmpeg Engine...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Execute Media Task</span>
              </>
            )}
          </button>
        </div>

        {/* Video / Output Column */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Media Preview Player</h3>

            {videoUrl ? (
              <div className="relative rounded-xl border vh-border bg-black overflow-hidden flex items-center justify-center">
                <video
                  ref={videoElemRef}
                  src={videoUrl}
                  controls
                  onLoadedMetadata={(e) => {
                    const dur = e.currentTarget.duration;
                    setVideoDuration(dur);
                    setTrimEnd(Math.min(dur, 5));
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  className="max-h-[360px] w-full"
                />
              </div>
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-xl border vh-border bg-black/40 text-xs vh-text-dim">
                Upload a video or audio file on the left to preview.
              </div>
            )}

            {outputResult && (
              <div className="mt-4 pt-4 border-t vh-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    Processed Output
                  </span>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 text-xs transition"
                  >
                    <Download size={14} />
                    <span>Download Output</span>
                  </button>
                </div>

                {outputResult.type === "gif" || outputResult.type === "image" ? (
                  <div className="rounded-xl border vh-border bg-black/60 p-2 flex items-center justify-center">
                    <img src={outputResult.url} alt="Output" className="max-h-72 object-contain" />
                  </div>
                ) : outputResult.type === "audio" ? (
                  <div className="rounded-xl border vh-border bg-black/60 p-4">
                    <audio src={outputResult.url} controls className="w-full" />
                  </div>
                ) : (
                  <div className="rounded-xl border vh-border bg-black/60 p-2">
                    <video src={outputResult.url} controls className="max-h-72 w-full" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
