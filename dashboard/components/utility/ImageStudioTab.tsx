"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Upload,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Maximize2,
  Crop,
  Layers,
  Sparkles,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Eye,
  Columns,
  ZoomIn,
  ZoomOut,
  Type,
  Square,
  Shield,
  FileDown,
  Palette,
  Sun,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export interface FilterState {
  brightness: number; // 0.2 to 2 (1 is default)
  contrast: number; // 0.2 to 2 (1 is default)
  saturate: number; // 0 to 2.5 (1 is default)
  hueRotate: number; // 0 to 360 deg
  blur: number; // 0 to 25 px
  sepia: number; // 0 to 1
  invert: number; // 0 or 1
  opacity: number; // 0.1 to 1
  vignette: number; // 0 to 1
  rotation: number; // -180 to 180
  scale: number; // 0.5 to 2
  flipH: boolean;
  flipV: boolean;
  aspectRatio: string; // "original" | "1:1" | "16:9" | "9:16" | "4:3" | "3:2" | "2:1"
  cornerRadius: number; // 0 to 60px
  borderWidth: number; // 0 to 20px
  borderColor: string;
  watermarkText: string;
  watermarkPosition: "tl" | "tr" | "center" | "bl" | "br";
  watermarkOpacity: number;
}

const DEFAULT_FILTERS: FilterState = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  hueRotate: 0,
  blur: 0,
  sepia: 0,
  invert: 0,
  opacity: 1,
  vignette: 0,
  rotation: 0,
  scale: 1,
  flipH: false,
  flipV: false,
  aspectRatio: "original",
  cornerRadius: 0,
  borderWidth: 0,
  borderColor: "#06b6d4",
  watermarkText: "",
  watermarkPosition: "br",
  watermarkOpacity: 0.7,
};

const PRESETS: Array<{ name: string; icon: string; filters: Partial<FilterState> }> = [
  { name: "Normal", icon: "✨", filters: { brightness: 1, contrast: 1, saturate: 1, hueRotate: 0, blur: 0, sepia: 0, invert: 0, vignette: 0 } },
  { name: "Cyberpunk", icon: "⚡", filters: { brightness: 1.15, contrast: 1.35, saturate: 1.7, hueRotate: 320, vignette: 0.4 } },
  { name: "Noir Mono", icon: "🎬", filters: { brightness: 1.1, contrast: 1.5, saturate: 0, sepia: 0, vignette: 0.3 } },
  { name: "Vintage 70s", icon: "🎞️", filters: { brightness: 1.05, contrast: 1.1, saturate: 0.85, sepia: 0.45, vignette: 0.35 } },
  { name: "Warm Sunset", icon: "🌅", filters: { brightness: 1.1, contrast: 1.15, saturate: 1.45, hueRotate: 15, sepia: 0.15 } },
  { name: "Cool Matrix", icon: "💚", filters: { brightness: 1.05, contrast: 1.25, saturate: 1.2, hueRotate: 90, vignette: 0.3 } },
  { name: "Chrome Metallic", icon: "💿", filters: { brightness: 1.2, contrast: 1.6, saturate: 0.25, sepia: 0 } },
  { name: "Dramatic", icon: "🔥", filters: { brightness: 0.95, contrast: 1.45, saturate: 1.3, vignette: 0.6 } },
];

export function ImageStudioTab() {
  const [activeTool, setActiveTool] = useState<"adjust" | "crop" | "effects" | "frame" | "watermark" | "favicon">("adjust");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ width: number; height: number; size: number; format: string } | null>(null);

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [history, setHistory] = useState<FilterState[]>([DEFAULT_FILTERS]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Compare mode: "split" or "normal"
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [splitPos, setSplitPos] = useState<number>(50); // percentage

  // Canvas zoom
  const [zoom, setZoom] = useState<number>(1);

  // Export options
  const [exportFormat, setExportFormat] = useState<string>("webp");
  const [exportQuality, setExportQuality] = useState<number>(85);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportedDataUrl, setExportedDataUrl] = useState<string | null>(null);
  const [exportedSize, setExportedSize] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Favicon suite bundle
  const [faviconBundle, setFaviconBundle] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize sample placeholder if none uploaded
  useEffect(() => {
    // Generate a beautiful default sample SVG canvas so the studio starts populated immediately!
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 750;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw modern gradient backdrop
      const grad = ctx.createLinearGradient(0, 0, 1200, 750);
      grad.addColorStop(0, "#090d16");
      grad.addColorStop(0.5, "#0e1a2e");
      grad.addColorStop(1, "#08101f");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 750);

      // Grid lines
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 750);
        ctx.stroke();
      }
      for (let y = 0; y < 750; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1200, y);
        ctx.stroke();
      }

      // Neon glowing shapes
      const glowGrad = ctx.createRadialGradient(600, 375, 50, 600, 375, 300);
      glowGrad.addColorStop(0, "rgba(6, 182, 212, 0.35)");
      glowGrad.addColorStop(0.7, "rgba(99, 102, 241, 0.15)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(600, 375, 300, 0, Math.PI * 2);
      ctx.fill();

      // Brand Typography
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚡ VH STUDIO PRO", 600, 350);

      ctx.fillStyle = "#06b6d4";
      ctx.font = "600 20px monospace";
      ctx.fillText("HIGH PERFORMANCE LIVE MEDIA ENGINE", 600, 395);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "14px sans-serif";
      ctx.fillText("Drag & drop any image or tweak live parameters on the right", 600, 440);

      const defaultData = canvas.toDataURL("image/png");
      setImageSrc(defaultData);
      setMeta({ width: 1200, height: 750, size: 48000, format: "PNG" });
    }
  }, []);

  const updateFilters = (patch: Partial<FilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // Push to history
      const newHistory = history.slice(0, historyIdx + 1);
      newHistory.push(next);
      if (newHistory.length > 25) newHistory.shift();
      setHistory(newHistory);
      setHistoryIdx(newHistory.length - 1);
      return next;
    });
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      playTone("click");
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setFilters(history[nextIdx]);
    }
  };

  const handleReset = () => {
    playTone("click");
    setFilters(DEFAULT_FILTERS);
    setHistory([DEFAULT_FILTERS]);
    setHistoryIdx(0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        setImageSrc(dataUrl);
        setMeta({
          width: img.width,
          height: img.height,
          size: file.size,
          format: file.type.split("/")[1]?.toUpperCase() || "IMAGE",
        });
        handleReset();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Compute live CSS filter string
  const cssFilterString = useMemo(() => {
    return [
      `brightness(${filters.brightness})`,
      `contrast(${filters.contrast})`,
      `saturate(${filters.saturate})`,
      `hue-rotate(${filters.hueRotate}deg)`,
      `blur(${filters.blur}px)`,
      `sepia(${filters.sepia})`,
      `invert(${filters.invert})`,
      `opacity(${filters.opacity})`,
    ].join(" ");
  }, [filters]);

  // Compute live transform string
  const cssTransformString = useMemo(() => {
    const scaleX = filters.flipH ? -filters.scale : filters.scale;
    const scaleY = filters.flipV ? -filters.scale : filters.scale;
    return `rotate(${filters.rotation}deg) scale(${scaleX}, ${scaleY})`;
  }, [filters.rotation, filters.scale, filters.flipH, filters.flipV]);

  // Aspect ratio helper
  const containerAspectRatio = useMemo(() => {
    switch (filters.aspectRatio) {
      case "1:1":
        return "1 / 1";
      case "16:9":
        return "16 / 9";
      case "9:16":
        return "9 / 16";
      case "4:3":
        return "4 / 3";
      case "3:2":
        return "3 / 2";
      case "2:1":
        return "2 / 1";
      default:
        return meta ? `${meta.width} / ${meta.height}` : "auto";
    }
  }, [filters.aspectRatio, meta]);

  // Render client canvas export
  const renderCanvasToBlob = async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!imageSrc) return reject(new Error("No image"));
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width;
        let h = img.height;

        // Apply aspect ratio crop if requested
        if (filters.aspectRatio !== "original") {
          const [rw, rh] = filters.aspectRatio.split(":").map(Number);
          const targetRatio = rw / rh;
          const curRatio = w / h;
          if (curRatio > targetRatio) {
            w = Math.round(h * targetRatio);
          } else {
            h = Math.round(w / targetRatio);
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("No 2d context"));

        // Background fill for transparency
        if (exportFormat === "jpeg" || exportFormat === "jpg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }

        // Apply filters
        ctx.filter = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturate}) hue-rotate(${filters.hueRotate}deg) blur(${filters.blur}px) sepia(${filters.sepia}) invert(${filters.invert}) opacity(${filters.opacity})`;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((filters.rotation * Math.PI) / 180);
        ctx.scale(filters.flipH ? -filters.scale : filters.scale, filters.flipV ? -filters.scale : filters.scale);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();

        // Vignette overlay
        if (filters.vignette > 0) {
          const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w / 4, w / 2, h / 2, Math.max(w, h) / 1.5);
          vigGrad.addColorStop(0, "rgba(0,0,0,0)");
          vigGrad.addColorStop(1, `rgba(0,0,0,${filters.vignette * 0.85})`);
          ctx.fillStyle = vigGrad;
          ctx.fillRect(0, 0, w, h);
        }

        // Watermark overlay
        if (filters.watermarkText.trim()) {
          ctx.save();
          const fontSize = Math.max(16, Math.round(w / 35));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = `rgba(255, 255, 255, ${filters.watermarkOpacity})`;
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 6;

          const pad = fontSize * 1.2;
          let tx = pad;
          let ty = pad + fontSize;
          if (filters.watermarkPosition === "tr") {
            ctx.textAlign = "right";
            tx = w - pad;
          } else if (filters.watermarkPosition === "center") {
            ctx.textAlign = "center";
            tx = w / 2;
            ty = h / 2;
          } else if (filters.watermarkPosition === "br") {
            ctx.textAlign = "right";
            tx = w - pad;
            ty = h - pad;
          } else if (filters.watermarkPosition === "bl") {
            ty = h - pad;
          }
          ctx.fillText(filters.watermarkText, tx, ty);
          ctx.restore();
        }

        const mime = `image/${exportFormat === "jpg" ? "jpeg" : exportFormat}`;
        const dataUrl = canvas.toDataURL(mime, exportQuality / 100);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    playTone("click");

    try {
      // High-precision canvas render with all live adjustments
      const dataUrl = await renderCanvasToBlob();
      setExportedDataUrl(dataUrl);

      // Estimate byte size
      const base64Str = dataUrl.replace(/^data:.*?;base64,/, "");
      const bytes = Math.round((base64Str.length * 3) / 4);
      setExportedSize(bytes);

      // Trigger instant download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `vh-pro-export.${exportFormat}`;
      a.click();
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyBase64 = async () => {
    playTone("click");
    const dataUrl = await renderCanvasToBlob();
    navigator.clipboard.writeText(dataUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateFavicons = async () => {
    setIsExporting(true);
    playTone("click");
    try {
      const rendered = await renderCanvasToBlob();
      const res = await fetch("/api/utility/image/favicon-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: rendered }),
      });
      if (res.ok) {
        setFaviconBundle(await res.json());
      }
    } catch (err: any) {
      alert(`Favicon generation error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Pro Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border vh-border vh-bg-card p-3 shadow-lg">
        <div className="flex items-center gap-2">
          {/* File Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3.5 py-2 text-xs transition shadow-md shadow-cyan-500/20"
          >
            <Upload size={14} />
            <span>Open Image</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Undo & Reset */}
          <button
            onClick={handleUndo}
            disabled={historyIdx === 0}
            title="Undo (Ctrl+Z)"
            className="rounded-xl border vh-border vh-bg-card/40 p-2 text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={handleReset}
            title="Reset All Adjustments"
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card/40 px-3 py-2 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <RefreshCw size={13} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Compare Before / After Split Button */}
          <button
            onClick={() => {
              playTone("click");
              setCompareMode(!compareMode);
            }}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              compareMode
                ? "border-cyan-500 bg-cyan-500/20 text-cyan-300 shadow-xs"
                : "vh-border vh-bg-card/40 text-white/70 hover:text-white"
            }`}
          >
            <Columns size={14} />
            <span>{compareMode ? "Comparing Split View" : "Compare Before/After"}</span>
          </button>

          {/* Zoom controls */}
          <div className="hidden md:flex items-center gap-1 rounded-xl border vh-border bg-black/40 px-2 py-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              className="p-1 text-white/60 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono text-cyan-400 px-1">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
              className="p-1 text-white/60 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>

        {/* Export & Copy Actions */}
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="rounded-xl border vh-border bg-black/60 px-3 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none uppercase"
          >
            <option value="webp">WEBP (Web Ready)</option>
            <option value="png">PNG (Lossless)</option>
            <option value="jpeg">JPEG (Compressed)</option>
            <option value="avif">AVIF (Ultra Compact)</option>
            <option value="ico">ICO (Favicon)</option>
          </select>

          <button
            onClick={handleCopyBase64}
            className="flex items-center gap-1.5 rounded-xl border vh-border vh-bg-card/60 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? "Copied Base64!" : "Copy Data URI"}</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black px-4 py-2 text-xs transition shadow-lg shadow-cyan-500/25"
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Export Image</span>
          </button>
        </div>
      </div>

      {/* Main Studio Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Canvas Canvas Area (Col 8) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          <div
            ref={containerRef}
            className="relative flex min-h-[520px] max-h-[720px] w-full items-center justify-center rounded-2xl border vh-border bg-[#0a0d14] overflow-hidden p-6 select-none shadow-2xl"
            style={{
              backgroundImage:
                "radial-gradient(#1e293b 1px, transparent 1px), radial-gradient(#1e293b 1px, #07090e 1px)",
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0, 12px 12px",
            }}
          >
            {/* Live Filtered Preview Container with Aspect Ratio */}
            {imageSrc && (
              <div
                className="relative overflow-hidden transition-all duration-75 flex items-center justify-center shadow-2xl"
                style={{
                  aspectRatio: containerAspectRatio,
                  maxHeight: "100%",
                  maxWidth: "100%",
                  borderRadius: `${filters.cornerRadius}px`,
                  border: filters.borderWidth > 0 ? `${filters.borderWidth}px solid ${filters.borderColor}` : "none",
                  transform: `scale(${zoom})`,
                }}
              >
                {/* Processed Live Image */}
                <img
                  src={imageSrc}
                  alt="Live Studio Preview"
                  className="max-h-[500px] max-w-full object-contain pointer-events-none transition-filter duration-75"
                  style={{
                    filter: cssFilterString,
                    transform: cssTransformString,
                  }}
                />

                {/* Live Vignette Layer */}
                {filters.vignette > 0 && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `radial-gradient(circle, rgba(0,0,0,0) 40%, rgba(0,0,0,${filters.vignette * 0.9}) 100%)`,
                    }}
                  />
                )}

                {/* Live Watermark Overlay Layer */}
                {filters.watermarkText.trim() && (
                  <div
                    className={`pointer-events-none absolute p-4 text-xs font-bold tracking-wider drop-shadow-md ${
                      filters.watermarkPosition === "tl"
                        ? "top-0 left-0"
                        : filters.watermarkPosition === "tr"
                        ? "top-0 right-0"
                        : filters.watermarkPosition === "center"
                        ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                        : filters.watermarkPosition === "bl"
                        ? "bottom-0 left-0"
                        : "bottom-0 right-0"
                    }`}
                    style={{
                      color: `rgba(255, 255, 255, ${filters.watermarkOpacity})`,
                      textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                    }}
                  >
                    {filters.watermarkText}
                  </div>
                )}

                {/* Interactive Split Compare Overlay */}
                {compareMode && (
                  <div
                    className="absolute inset-0 overflow-hidden border-r-2 border-cyan-400 pointer-events-none"
                    style={{ width: `${splitPos}%` }}
                  >
                    <img
                      src={imageSrc}
                      alt="Original Reference"
                      className="max-h-[500px] max-w-none object-contain"
                      style={{
                        transform: `scale(${filters.scale})`,
                      }}
                    />
                    <span className="absolute top-3 left-3 rounded-md bg-black/80 px-2 py-0.5 text-[10px] font-bold text-white/90">
                      ORIGINAL
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Split Screen Scrubber Slider */}
            {compareMode && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full border border-cyan-500/40 bg-black/80 px-4 py-1.5 backdrop-blur-md z-20">
                <span className="text-[10px] font-bold uppercase text-white/60">Original</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={splitPos}
                  onChange={(e) => setSplitPos(Number(e.target.value))}
                  className="w-32 accent-cyan-400 cursor-ew-resize"
                />
                <span className="text-[10px] font-bold uppercase text-cyan-400">Edited</span>
              </div>
            )}
          </div>

          {/* Footer Metadata & Status Strip */}
          <div className="flex items-center justify-between rounded-xl border vh-border bg-black/30 px-4 py-2.5 text-xs">
            <div className="flex items-center gap-4 text-white/70 font-mono text-[11px]">
              {meta && (
                <>
                  <span>
                    Dimensions: <strong className="text-white">{meta.width} &times; {meta.height} px</strong>
                  </span>
                  <span>
                    Original Size: <strong className="text-white">{Math.round(meta.size / 1024)} KB</strong>
                  </span>
                  <span>
                    Format: <strong className="text-cyan-400">{meta.format}</strong>
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[11px] font-semibold text-emerald-400">Live Hardware Renderer Active</span>
            </div>
          </div>
        </div>

        {/* Right Studio Inspector & Editing Controls (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Tool Category Selector Pills */}
          <div className="grid grid-cols-3 gap-1.5 rounded-2xl border vh-border bg-black/40 p-1.5">
            {[
              { id: "adjust", label: "Color & Light", icon: Sun },
              { id: "crop", label: "Crop & Ratio", icon: Crop },
              { id: "effects", label: "Effects & LUTs", icon: Sparkles },
              { id: "frame", label: "Borders & Style", icon: Square },
              { id: "watermark", label: "Watermark", icon: Type },
              { id: "favicon", label: "Favicons", icon: Layers },
            ].map((tool) => {
              const active = activeTool === tool.id;
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    playTone("click");
                    setActiveTool(tool.id as any);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 px-1 text-[11px] font-bold transition ${
                    active
                      ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tool Panel 1: Adjust (Color & Light) */}
          {activeTool === "adjust" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sun size={14} />
                <span>Light &amp; Color Grading</span>
              </h4>

              {/* Sliders */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Brightness</span>
                    <span className="font-mono text-cyan-400">{Math.round((filters.brightness - 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.8"
                    step="0.02"
                    value={filters.brightness}
                    onChange={(e) => updateFilters({ brightness: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Contrast</span>
                    <span className="font-mono text-cyan-400">{Math.round((filters.contrast - 1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.4"
                    max="2.0"
                    step="0.02"
                    value={filters.contrast}
                    onChange={(e) => updateFilters({ contrast: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Saturation / Vibrance</span>
                    <span className="font-mono text-cyan-400">{Math.round(filters.saturate * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2.5"
                    step="0.05"
                    value={filters.saturate}
                    onChange={(e) => updateFilters({ saturate: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Hue Rotation</span>
                    <span className="font-mono text-cyan-400">{filters.hueRotate}&deg;</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={filters.hueRotate}
                    onChange={(e) => updateFilters({ hueRotate: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Warmth &amp; Sepia Tone</span>
                    <span className="font-mono text-cyan-400">{Math.round(filters.sepia * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={filters.sepia}
                    onChange={(e) => updateFilters({ sepia: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tool Panel 2: Effects & LUTs */}
          {activeTool === "effects" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>One-Click Color Presets</span>
              </h4>

              {/* Preset Cards Grid */}
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => {
                      playTone("click");
                      updateFilters(p.filters);
                    }}
                    className="flex items-center gap-2 rounded-xl border vh-border bg-black/40 hover:border-cyan-500/50 p-2.5 text-xs font-semibold text-white transition hover:bg-white/[0.04]"
                  >
                    <span className="text-base">{p.icon}</span>
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t vh-border space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Lens Blur</span>
                    <span className="font-mono text-cyan-400">{filters.blur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={filters.blur}
                    onChange={(e) => updateFilters({ blur: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Cinematic Vignette</span>
                    <span className="font-mono text-cyan-400">{Math.round(filters.vignette * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={filters.vignette}
                    onChange={(e) => updateFilters({ vignette: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-white">Color Invert</span>
                  <button
                    onClick={() => updateFilters({ invert: filters.invert ? 0 : 1 })}
                    className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                      filters.invert ? "bg-cyan-500 text-black" : "border vh-border bg-black/40 text-white/70"
                    }`}
                  >
                    {filters.invert ? "Inverted" : "Normal"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tool Panel 3: Crop & Ratios */}
          {activeTool === "crop" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Crop size={14} />
                <span>Aspect Ratios &amp; Geometry</span>
              </h4>

              {/* Ratios Grid */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "original", label: "Original" },
                  { id: "1:1", label: "1:1 Square" },
                  { id: "16:9", label: "16:9 Landscape" },
                  { id: "9:16", label: "9:16 Story" },
                  { id: "4:3", label: "4:3 Classic" },
                  { id: "2:1", label: "2:1 Banner" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      playTone("click");
                      updateFilters({ aspectRatio: r.id });
                    }}
                    className={`rounded-xl border py-2 text-xs font-bold transition ${
                      filters.aspectRatio === r.id
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "vh-border bg-black/40 text-white/70 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Transform Actions */}
              <div className="pt-3 border-t vh-border space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFilters({ rotation: (filters.rotation - 90) % 360 })}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border vh-border bg-black/40 py-2 text-xs font-bold text-white/80 hover:text-white transition"
                  >
                    <RotateCcw size={13} />
                    <span>-90&deg;</span>
                  </button>
                  <button
                    onClick={() => updateFilters({ rotation: (filters.rotation + 90) % 360 })}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border vh-border bg-black/40 py-2 text-xs font-bold text-white/80 hover:text-white transition"
                  >
                    <RotateCw size={13} />
                    <span>+90&deg;</span>
                  </button>
                  <button
                    onClick={() => updateFilters({ flipH: !filters.flipH })}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      filters.flipH ? "border-cyan-500 bg-cyan-500/20 text-cyan-300" : "vh-border bg-black/40 text-white/80 hover:text-white"
                    }`}
                  >
                    <FlipHorizontal size={13} />
                    <span>Flip H</span>
                  </button>
                  <button
                    onClick={() => updateFilters({ flipV: !filters.flipV })}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition ${
                      filters.flipV ? "border-cyan-500 bg-cyan-500/20 text-cyan-300" : "vh-border bg-black/40 text-white/80 hover:text-white"
                    }`}
                  >
                    <FlipVertical size={13} />
                    <span>Flip V</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Free Rotation</span>
                    <span className="font-mono text-cyan-400">{filters.rotation}&deg;</span>
                  </div>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="1"
                    value={filters.rotation}
                    onChange={(e) => updateFilters({ rotation: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tool Panel 4: Frame & Borders */}
          {activeTool === "frame" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Square size={14} />
                <span>Frames, Corners &amp; Borders</span>
              </h4>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Rounded Corner Radius</span>
                    <span className="font-mono text-cyan-400">{filters.cornerRadius} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={filters.cornerRadius}
                    onChange={(e) => updateFilters({ cornerRadius: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Border Width</span>
                    <span className="font-mono text-cyan-400">{filters.borderWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={filters.borderWidth}
                    onChange={(e) => updateFilters({ borderWidth: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>

                {filters.borderWidth > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-semibold vh-text-dim">Border Color</label>
                    <div className="flex gap-2">
                      {["#06b6d4", "#ffffff", "#000000", "#10b981", "#8b5cf6", "#f43f5e"].map((c) => (
                        <button
                          key={c}
                          onClick={() => updateFilters({ borderColor: c })}
                          className={`h-7 w-7 rounded-full border-2 transition ${
                            filters.borderColor === c ? "scale-110 border-white shadow-lg" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tool Panel 5: Watermark */}
          {activeTool === "watermark" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Type size={14} />
                <span>Text Watermark Overlay</span>
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Watermark Text</label>
                  <input
                    type="text"
                    value={filters.watermarkText}
                    onChange={(e) => updateFilters({ watermarkText: e.target.value })}
                    placeholder="e.g. &copy; 2026 Developer Brand"
                    className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold vh-text-dim">Position</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "tl", label: "Top Left" },
                      { id: "center", label: "Center" },
                      { id: "tr", label: "Top Right" },
                      { id: "bl", label: "Bottom Left" },
                      { id: "br", label: "Bottom Right" },
                    ].map((pos) => (
                      <button
                        key={pos.id}
                        onClick={() => updateFilters({ watermarkPosition: pos.id as any })}
                        className={`rounded-xl border py-1.5 text-xs font-bold transition ${
                          filters.watermarkPosition === pos.id
                            ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                            : "vh-border bg-black/40 text-white/70"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="vh-text-dim">Opacity</span>
                    <span className="font-mono text-cyan-400">{Math.round(filters.watermarkOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={filters.watermarkOpacity}
                    onChange={(e) => updateFilters({ watermarkOpacity: Number(e.target.value) })}
                    className="w-full accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tool Panel 6: Favicon Bundle */}
          {activeTool === "favicon" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Layers size={14} />
                <span>Favicon Multi-Resolution Suite</span>
              </h4>
              <p className="text-xs vh-text-dim leading-relaxed">
                Generates a complete bundle including 16x16, 32x32, 180x180 (Apple touch), 512x512 PWA icons, and a native .ico.
              </p>

              <button
                onClick={handleGenerateFavicons}
                disabled={isExporting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 text-xs transition shadow-md shadow-cyan-500/20"
              >
                {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Generate Favicon Suite</span>
              </button>

              {faviconBundle && (
                <div className="space-y-3 pt-3 border-t vh-border">
                  <div className="grid grid-cols-4 gap-2">
                    {faviconBundle.favicons.slice(0, 8).map((item: any) => (
                      <div
                        key={item.name}
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = item.dataUrl;
                          a.download = item.name;
                          a.click();
                        }}
                        className="rounded-xl border vh-border bg-black/40 p-2 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/60 transition"
                      >
                        <img src={item.dataUrl} alt={item.name} className="h-6 w-6 object-contain" />
                        <span className="text-[9px] font-mono vh-text-dim mt-1">{item.size}x{item.size}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = faviconBundle.icoDataUrl;
                      a.download = "favicon.ico";
                      a.click();
                    }}
                    className="w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold py-2 text-xs transition"
                  >
                    Download favicon.ico
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Quality Slider in Inspector */}
          <div className="rounded-2xl border vh-border vh-bg-card p-4 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="vh-text-dim">Export Quality</span>
              <span className="font-mono text-cyan-400">{exportQuality}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={exportQuality}
              onChange={(e) => setExportQuality(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
