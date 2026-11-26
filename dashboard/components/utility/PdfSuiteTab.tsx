"use client";

import { useState, useRef, useMemo } from "react";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Layers,
  FileSearch,
  BookOpen,
  Eye,
  FileCode,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export function PdfSuiteTab() {
  const [subTab, setSubTab] = useState<"images" | "text" | "inspect" | "extract">("text");

  // Images to PDF state
  const [images, setImages] = useState<Array<{ name: string; dataUrl: string; size: number }>>([]);
  const [pageSize, setPageSize] = useState<"A4" | "Letter" | "Fit">("A4");
  const [margin, setMargin] = useState<number>(36);
  const [generatedPdf, setGeneratedPdf] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Text to PDF state (LIVE Mockup)
  const [docTitle, setDocTitle] = useState("VH Architecture & API Specifications");
  const [textContent, setTextContent] = useState(
    `# VH Developer Helper Platform

> High performance developer productivity suite for full-stack engineering teams.

## Core Modules
1. **Interactive Git Engine**: Real-time working tree visualization, porcelain parser, staged diffs, commit graph, and interactive branch switching.
2. **Observability Logs Server**: SQLite write queue, WebSocket live invalidation, high throughput network request inspection.
3. **MERN Utility Dashboard**: Server-side image studio, PDF suite, video/audio transcoding, JWT debuggers, MongoDB generators, and Bcrypt security.

### System Configuration
- Node.js runtime: v22+
- Port allocations: 4317 (Logs), 4318 (Git), 4319 (Music), 4320 (Utility)
- Storage: WAL mode SQLite with atomic transaction serialisation.
`
  );
  const [fontSize, setFontSize] = useState(11);

  // Inspector & Extractor state
  const [pdfMeta, setPdfMeta] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const imagesInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => [
          ...prev,
          {
            name: file.name,
            dataUrl: reader.result as string,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleGeneratePdfFromImages = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    playTone("click");

    try {
      const res = await fetch("/api/utility/pdf/from-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({ name: img.name, dataUrl: img.dataUrl })),
          options: { pageSize, margin },
        }),
      });

      if (!res.ok) throw new Error("PDF generation failed");
      const data = await res.json();
      setGeneratedPdf(data.dataUrl);

      // Auto download
      const a = document.createElement("a");
      a.href = data.dataUrl;
      a.download = "vh-images-compilation.pdf";
      a.click();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGeneratePdfFromText = async () => {
    if (!textContent.trim()) return;
    setIsProcessing(true);
    playTone("click");

    try {
      const res = await fetch("/api/utility/pdf/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: textContent,
          options: { title: docTitle, fontSize },
        }),
      });

      if (!res.ok) throw new Error("PDF generation failed");
      const data = await res.json();
      setGeneratedPdf(data.dataUrl);

      const a = document.createElement("a");
      a.href = data.dataUrl;
      a.download = `${docTitle.toLowerCase().replace(/\s+/g, "-") || "vh-document"}.pdf`;
      a.click();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setIsProcessing(true);
      playTone("click");

      try {
        if (subTab === "inspect") {
          const res = await fetch("/api/utility/pdf/inspect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          if (res.ok) {
            setPdfMeta(await res.json());
          }
        } else if (subTab === "extract") {
          const res = await fetch("/api/utility/pdf/extract-text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          if (res.ok) {
            const data = await res.json();
            setExtractedText(data.text);
          }
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    playTone("click");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b vh-border pb-3">
        {[
          { id: "text", label: "Markdown / Text to PDF", icon: BookOpen },
          { id: "images", label: "Images to PDF", icon: Layers },
          { id: "inspect", label: "PDF Metadata Inspector", icon: FileSearch },
          { id: "extract", label: "Extract Plain Text", icon: FileText },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              playTone("click");
              setSubTab(t.id as any);
              setGeneratedPdf(null);
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

      {/* 1. Text / Markdown to PDF (With Live Document Mockup) */}
      {subTab === "text" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Document Title</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full rounded-xl border vh-border bg-black/40 px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="vh-text-dim">Body Font Size</span>
                  <span className="text-cyan-400 font-mono">{fontSize} pt</span>
                </div>
                <input
                  type="range"
                  min="9"
                  max="14"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold vh-text-dim">Markdown Editor (Live)</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  rows={12}
                  className="w-full rounded-xl border vh-border bg-black/50 p-3.5 font-mono text-xs text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleGeneratePdfFromText}
                disabled={!textContent.trim() || isProcessing}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 text-xs transition disabled:opacity-40 shadow-lg shadow-cyan-500/20"
              >
                {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Export &amp; Download PDF</span>
              </button>
            </div>
          </div>

          {/* Live Document Page Mockup (Col 7) */}
          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Eye size={14} />
                  <span>Live Rendered Page Mockup (A4)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Typography
                </span>
              </div>

              {/* Realistic Paper Mockup */}
              <div
                className="min-h-[560px] w-full rounded-xl bg-white p-8 md:p-12 text-slate-900 shadow-2xl space-y-4 font-serif relative border border-slate-200 select-text"
                style={{ fontSize: `${fontSize + 3}px` }}
              >
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                  <h2 className="text-xl md:text-2xl font-black font-sans tracking-tight text-slate-900">
                    {docTitle || "Untitled Document"}
                  </h2>
                  <span className="text-[10px] font-sans font-bold uppercase text-slate-500">
                    VH PDF Engine
                  </span>
                </div>

                {/* Content Stream */}
                <div className="space-y-2 whitespace-pre-wrap font-sans text-xs md:text-sm leading-relaxed text-slate-800">
                  {textContent}
                </div>

                {/* Footer */}
                <div className="absolute bottom-4 left-8 right-8 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] font-sans text-slate-400">
                  <span>Page 1 of 1</span>
                  <span>Generated via VH Utility</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Images to PDF */}
      {subTab === "images" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            <div
              onClick={() => imagesInputRef.current?.click()}
              className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed vh-border hover:border-cyan-500/60 vh-bg-card/60 p-6 text-center cursor-pointer transition"
            >
              <input
                type="file"
                ref={imagesInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                multiple
                className="hidden"
              />
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition">
                <Upload size={24} />
              </div>
              <p className="mt-3 text-sm font-bold text-white">Click or drag images to add pages</p>
              <p className="mt-1 text-xs vh-text-dim">Supports multiple PNG, JPG, WEBP, AVIF files</p>
            </div>

            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                PDF Page Settings
              </h3>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Page Format</label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as any)}
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="A4">A4 (Standard 595 &times; 842 pt)</option>
                  <option value="Letter">Letter (US 612 &times; 792 pt)</option>
                  <option value="Fit">Fit to Image Aspect Ratio</option>
                </select>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="vh-text-dim">Page Margins</span>
                  <span className="text-cyan-400">{margin} pt</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="72"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>
            </div>

            <button
              onClick={handleGeneratePdfFromImages}
              disabled={images.length === 0 || isProcessing}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black py-3 text-xs transition disabled:opacity-40 shadow-lg shadow-cyan-500/20"
            >
              {isProcessing ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>Build &amp; Download PDF ({images.length} Pages)</span>
            </button>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Pages Gallery ({images.length})</h3>
                {images.length > 0 && (
                  <button onClick={() => setImages([])} className="text-xs text-red-400 hover:underline">
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl border vh-border bg-black/40 p-2 flex flex-col items-center"
                  >
                    <span className="absolute top-2 left-2 rounded-md bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 z-10">
                      Page {idx + 1}
                    </span>
                    <button
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 rounded-md bg-red-500/80 p-1 text-white opacity-0 group-hover:opacity-100 transition z-10"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="h-28 w-full flex items-center justify-center overflow-hidden rounded-lg">
                      <img src={img.dataUrl} alt={img.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="mt-2 truncate w-full text-center text-[10px] font-mono vh-text-dim">
                      {img.name}
                    </span>
                  </div>
                ))}
              </div>

              {images.length === 0 && (
                <div className="rounded-xl border vh-border bg-black/20 p-12 text-center text-xs vh-text-dim">
                  Upload images on the left to compile into a multi-page PDF document.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Inspector & Extractor */}
      {(subTab === "inspect" || subTab === "extract") && (
        <div className="space-y-6">
          <div
            onClick={() => pdfInputRef.current?.click()}
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed vh-border hover:border-cyan-500/60 vh-bg-card/60 p-8 text-center cursor-pointer transition shadow-xl"
          >
            <input
              type="file"
              ref={pdfInputRef}
              onChange={handlePdfUpload}
              accept="application/pdf"
              className="hidden"
            />
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 group-hover:scale-110 transition">
              <Upload size={28} />
            </div>
            <p className="mt-3 text-sm font-bold text-white">
              {subTab === "inspect" ? "Upload PDF to Inspect Metadata" : "Upload PDF to Extract Text"}
            </p>
            <p className="mt-1 text-xs vh-text-dim">Supports standard PDF 1.2 to 2.0 files</p>
          </div>

          {pdfMeta && subTab === "inspect" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white">Document Information</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border vh-border bg-white/[0.02] p-4">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Total Pages</span>
                  <p className="text-xl font-black text-white mt-1">{pdfMeta.pageCount}</p>
                </div>
                <div className="rounded-xl border vh-border bg-white/[0.02] p-4">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Format Version</span>
                  <p className="text-xl font-black text-white mt-1">{pdfMeta.version}</p>
                </div>
                <div className="rounded-xl border vh-border bg-white/[0.02] p-4">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Document Size</span>
                  <p className="text-xl font-black text-white mt-1">{Math.round(pdfMeta.sizeBytes / 1024)} KB</p>
                </div>
                <div className="rounded-xl border vh-border bg-white/[0.02] p-4">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Producer</span>
                  <p className="text-sm font-bold text-white mt-1 truncate">{pdfMeta.producer || "Standard"}</p>
                </div>
              </div>
            </div>
          )}

          {extractedText && subTab === "extract" && (
            <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Extracted Text Content</h3>
                <button
                  onClick={() => handleCopy(extractedText)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:underline"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied ? "Copied Content" : "Copy All Text"}</span>
                </button>
              </div>
              <textarea
                value={extractedText}
                readOnly
                rows={12}
                className="w-full rounded-xl border vh-border bg-black/40 p-4 font-mono text-xs text-white leading-relaxed focus:outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
