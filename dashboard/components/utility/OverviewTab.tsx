"use client";

import { useState } from "react";
import {
  Image,
  FileText,
  Video,
  Code2,
  ShieldCheck,
  Search,
  ArrowRight,
  Sparkles,
  Zap,
  Sliders,
  FileCode,
  Layers,
  KeyRound,
  FileDown,
  Hash,
  Database,
  Music,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

interface ToolItem {
  id: string;
  name: string;
  category: "images" | "pdf" | "media" | "dev" | "crypto";
  description: string;
  tags: string[];
}

const ALL_TOOLS: ToolItem[] = [
  // Images
  { id: "img-convert", name: "Format Converter", category: "images", description: "Convert between PNG, JPG, WEBP, AVIF, GIF, TIFF, and ICO", tags: ["png", "jpg", "webp", "avif", "ico", "convert"] },
  { id: "img-compress", name: "Smart Image Compressor", category: "images", description: "Lossless & lossy image compression with filesize reduction preview", tags: ["compress", "size", "reduce", "optimize"] },
  { id: "img-resize", name: "Resize & Crop", category: "images", description: "Set exact dimensions, aspect ratios, fit options, and custom area cropping", tags: ["resize", "crop", "dimensions", "scale"] },
  { id: "img-filters", name: "Filters & Color Modulate", category: "images", description: "Grayscale, blur, sharpen, brightness, contrast, rotate, and flip", tags: ["filter", "grayscale", "blur", "brightness", "rotate"] },
  { id: "img-favicon", name: "Favicon Suite Generator", category: "images", description: "Generate 16x16, 32x32, 180x180 Apple touch, .ico, and HTML link tags", tags: ["favicon", "ico", "apple-touch-icon", "manifest"] },
  { id: "img-base64", name: "Base64 Data URI Studio", category: "images", description: "Convert images to Base64 data strings or decode Base64 back into image", tags: ["base64", "datauri", "inline", "encode"] },

  // PDF
  { id: "pdf-images", name: "Images to PDF", category: "pdf", description: "Combine multiple images into a multi-page PDF with custom margins and sizing", tags: ["pdf", "images", "convert", "combine", "a4"] },
  { id: "pdf-text", name: "Markdown & Text to PDF", category: "pdf", description: "Format plain text or markdown notes into downloadable formatted PDF documents", tags: ["markdown", "text", "pdf", "generate", "doc"] },
  { id: "pdf-inspect", name: "PDF Metadata Inspector", category: "pdf", description: "Inspect PDF version, page count, document author, title, and producer info", tags: ["pdf", "inspect", "metadata", "pages"] },
  { id: "pdf-extract", name: "PDF Text Stream Extractor", category: "pdf", description: "Extract plain text and content streams directly from PDF files", tags: ["pdf", "extract", "text", "ocr", "stream"] },

  // Media
  { id: "media-gif", name: "Video to GIF Converter", category: "media", description: "High-quality animated GIFs with two-pass Lanczos palette generation", tags: ["video", "gif", "convert", "mp4", "palette"] },
  { id: "media-thumb", name: "Thumbnail & Frame Extractor", category: "media", description: "Extract high-definition PNG or JPG stills from any video timestamp", tags: ["video", "thumbnail", "frame", "screenshot", "still"] },
  { id: "media-trim", name: "Video Clipper & Trimmer", category: "media", description: "Trim and cut video clips with start and end timestamp precision", tags: ["video", "trim", "cut", "clip", "mp4"] },
  { id: "media-audio-ext", name: "Video Audio Extractor", category: "media", description: "Extract audio tracks directly from MP4 videos into MP3, WAV, or AAC", tags: ["audio", "mp3", "extract", "sound", "track"] },
  { id: "media-audio-conv", name: "Audio Format Converter", category: "media", description: "Convert audio between MP3, WAV, AAC, OGG, FLAC with bitrate controls", tags: ["audio", "convert", "bitrate", "wav", "flac"] },

  // MERN Dev
  { id: "mern-jwt-dec", name: "JWT Debugger & Inspector", category: "dev", description: "Decode headers, claims payload, check expiry countdown, and verify HMAC secret", tags: ["jwt", "token", "auth", "bearer", "decode", "verify"] },
  { id: "mern-jwt-sign", name: "JWT Signer & Generator", category: "dev", description: "Generate signed JWT tokens with custom payloads, secrets, and expiry", tags: ["jwt", "sign", "token", "generate", "auth"] },
  { id: "mern-mongo", name: "MongoDB ObjectId Inspector", category: "dev", description: "Extract timestamp, date, machine ID, process ID, and counter from 24-hex ID", tags: ["mongodb", "objectid", "bson", "inspect", "date"] },
  { id: "mern-mongo-gen", name: "MongoDB ObjectId Generator", category: "dev", description: "Generate authentic valid MongoDB ObjectIds in batch with one-click copy", tags: ["mongodb", "objectid", "generate", "bson"] },
  { id: "mern-curl", name: "cURL to Fetch & Axios Transpiler", category: "dev", description: "Transpile cURL commands into Axios, Browser Fetch, and Node Express code", tags: ["curl", "fetch", "axios", "code", "request"] },
  { id: "mern-schema", name: "JSON to Mongoose & TypeScript", category: "dev", description: "Infer schemas from sample JSON into typed Mongoose models and TS interfaces", tags: ["json", "mongoose", "typescript", "schema", "model"] },
  { id: "mern-regex", name: "Interactive Regex Tester", category: "dev", description: "Test regular expressions with real-time match counts, indexes, and capture groups", tags: ["regex", "test", "match", "regexp", "pattern"] },

  // Crypto & Security
  { id: "crypto-bcrypt", name: "Bcrypt Hasher & Matcher", category: "crypto", description: "Compute salted Bcrypt hashes ($2b$) and test password matches with timing benchmark", tags: ["bcrypt", "hash", "password", "security", "salt"] },
  { id: "crypto-hash", name: "Cryptographic Checksums", category: "crypto", description: "Generate SHA-256, SHA-512, MD5, SHA-1, and HMAC hashes instantly", tags: ["sha256", "md5", "hmac", "hash", "checksum"] },
  { id: "crypto-uuid", name: "UUID & NanoID Generator", category: "crypto", description: "Generate cryptographically secure RFC UUID v4 and compact NanoIDs", tags: ["uuid", "nanoid", "random", "id", "guid"] },
  { id: "crypto-base64", name: "Base64 & URL Encoder/Decoder", category: "crypto", description: "Encode and decode standard strings, JSON, and URLs with instant feedback", tags: ["base64", "url", "encode", "decode", "uri"] },
];

interface OverviewTabProps {
  onSelectTab: (tabId: string) => void;
}

export function OverviewTab({ onSelectTab }: OverviewTabProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTools = ALL_TOOLS.filter((tool) => {
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    const matchesSearch =
      search.trim() === "" ||
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()) ||
      tool.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: "all", label: "All Tools", count: ALL_TOOLS.length },
    { id: "images", label: "Image Studio", icon: Image, count: ALL_TOOLS.filter((t) => t.category === "images").length },
    { id: "pdf", label: "PDF Suite", icon: FileText, count: ALL_TOOLS.filter((t) => t.category === "pdf").length },
    { id: "media", label: "Video & Audio", icon: Video, count: ALL_TOOLS.filter((t) => t.category === "media").length },
    { id: "dev", label: "MERN Dev", icon: Code2, count: ALL_TOOLS.filter((t) => t.category === "dev").length },
    { id: "crypto", label: "Crypto & Hashes", icon: ShieldCheck, count: ALL_TOOLS.filter((t) => t.category === "crypto").length },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border vh-border vh-bg-card p-6 md:p-8">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            <Sparkles size={14} />
            <span>MERN Full-Stack Productivity Suite</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
            VH Developer Utility Dashboard
          </h2>
          <p className="text-sm vh-text-dim leading-relaxed">
            Fast, server-side media processing, PDF generation, MERN development helpers, and cryptographic utilities powered directly by Node.js.
          </p>

          {/* Quick Search */}
          <div className="pt-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search utilities (e.g., 'jwt', 'resize', 'pdf', 'bcrypt', 'objectid', 'gif')..."
              className="w-full rounded-xl border vh-border bg-black/40 pl-10 pr-4 py-3 text-sm text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute right-24 -bottom-16 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => {
          const active = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                playTone("click");
                setSelectedCategory(c.id);
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                active
                  ? "border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-xs"
                  : "border vh-border vh-bg-card vh-text-dim hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {c.icon && <c.icon size={14} />}
              <span>{c.label}</span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-white/70">
                {c.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTools.map((tool) => {
          const categoryName = categories.find((c) => c.id === tool.category)?.label;
          return (
            <div
              key={tool.id}
              onClick={() => {
                playTone("click");
                onSelectTab(tool.category);
              }}
              className="group relative flex flex-col justify-between rounded-xl border vh-border vh-bg-card p-5 transition hover:border-cyan-500/40 hover:bg-white/[0.02] cursor-pointer"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    {categoryName}
                  </span>
                  <div className="rounded-lg p-1.5 text-white/30 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition">
                    <ArrowRight size={16} />
                  </div>
                </div>

                <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition">
                  {tool.name}
                </h3>
                <p className="text-xs vh-text-dim leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t vh-border-subtle">
                {tool.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-md border vh-border bg-white/[0.03] px-2 py-0.5 text-[10px] vh-text-dim font-mono"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="rounded-2xl border vh-border vh-bg-card p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-white">No utilities matching &ldquo;{search}&rdquo;</p>
          <p className="text-xs vh-text-dim">Try clearing your search or switching categories.</p>
          <button
            onClick={() => {
              setSearch("");
              setSelectedCategory("all");
            }}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
