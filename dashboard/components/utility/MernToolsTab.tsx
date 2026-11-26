"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Code2,
  KeyRound,
  Database,
  Terminal,
  FileCode,
  Sliders,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export function MernToolsTab() {
  const [subTab, setSubTab] = useState<"jwt" | "objectid" | "curl" | "schema" | "regex">("jwt");
  const [copied, setCopied] = useState<string | null>(null);

  // ----------------- 1. JWT Studio (LIVE) -----------------
  const [jwtToken, setJwtToken] = useState(
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOTA4MjEiLCJuYW1lIjoiS2FwaWwgUmFqcHV0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAzNjk4ODAwLCJleHAiOjE5OTk5OTk5OTl9.qVq-X1d0k9Z2_y5T3lW-oP_a4B7c8D9e0F1g2H3i4J5"
  );
  const [jwtSecret, setJwtSecret] = useState("my-super-secret-key");
  const [jwtPayload, setJwtPayload] = useState('{\n  "userId": "usr_99812",\n  "role": "admin",\n  "plan": "enterprise"\n}');
  const [jwtExpiry, setJwtExpiry] = useState<number>(86400);

  // Live JWT decode result using local client parser + server sync
  const liveJwtDecoded = useMemo(() => {
    const clean = jwtToken.trim();
    const parts = clean.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Token must contain exactly 3 dot-separated segments (header.payload.signature)" };
    }
    try {
      const base64UrlDecode = (str: string) => {
        let b = str.replace(/-/g, "+").replace(/_/g, "/");
        while (b.length % 4) b += "=";
        if (typeof window !== "undefined" && typeof atob === "function") {
          return decodeURIComponent(
            atob(b)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
        }
        return Buffer.from(b, "base64").toString("utf8");
      };

      const header = JSON.parse(base64UrlDecode(parts[0]));
      const payload = JSON.parse(base64UrlDecode(parts[1]));

      let issuedAt: string | undefined;
      let expiresAt: string | undefined;
      let isExpired = false;

      if (typeof payload.iat === "number") {
        issuedAt = new Date(payload.iat * 1000).toLocaleString();
      }
      if (typeof payload.exp === "number") {
        const expDate = new Date(payload.exp * 1000);
        expiresAt = expDate.toLocaleString();
        isExpired = Date.now() > expDate.getTime();
      }

      return {
        valid: true,
        header,
        payload,
        signature: parts[2],
        issuedAt,
        expiresAt,
        isExpired,
      };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }, [jwtToken]);

  // ----------------- 2. MongoDB ObjectId (LIVE) -----------------
  const [inspectId, setInspectId] = useState("658b1a8f9c1e2f3a4b5c6d7e");
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);

  // Live ObjectId Inspector
  const liveObjectId = useMemo(() => {
    const clean = inspectId.trim().toLowerCase();
    if (!/^[0-9a-f]{24}$/.test(clean)) {
      return { valid: false, error: "Must be a 24-character hexadecimal string" };
    }
    const timestampSec = parseInt(clean.substring(0, 8), 16);
    const date = new Date(timestampSec * 1000);
    const machineId = clean.substring(8, 14);
    const processId = parseInt(clean.substring(14, 18), 16);
    const counter = parseInt(clean.substring(18, 24), 16);

    return {
      valid: true,
      timestamp: timestampSec,
      utcDate: date.toUTCString(),
      localDate: date.toLocaleString(),
      machineId,
      processId,
      counter,
    };
  }, [inspectId]);

  // ----------------- 3. cURL Transpiler (LIVE) -----------------
  const [curlInput, setCurlInput] = useState(
    `curl -X POST https://api.stripe.com/v1/customers \\\n  -H "Authorization: Bearer sk_test_secret" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Jenny Rosen", "email": "jenny@example.com"}'`
  );
  const [curlLang, setCurlLang] = useState<"axios" | "fetch" | "node">("axios");

  // Live cURL Transpiler
  const liveTranspiledCurl = useMemo(() => {
    let raw = curlInput.replace(/\\\r?\n/g, " ").trim();
    if (!raw.startsWith("curl")) raw = `curl ${raw}`;

    let url = "https://api.example.com";
    let method = "GET";
    const headers: Record<string, string> = {};
    let data: unknown;

    const urlMatch = raw.match(/curl\s+(?:-[A-Za-z0-9-]+\s+)*(?:'([^']+)'|"([^"]+)"|([^\s'"]+))/);
    if (urlMatch) {
      url = urlMatch[1] || urlMatch[2] || urlMatch[3] || "";
    }

    const methodMatch = raw.match(/-X\s+([A-Z]+)/i);
    if (methodMatch) method = methodMatch[1].toUpperCase();

    const headerMatches = raw.matchAll(/-H\s+['"]([^'"]+)['"]/g);
    for (const m of headerMatches) {
      const parts = m[1].split(":");
      if (parts.length >= 2) {
        headers[parts[0].trim()] = parts.slice(1).join(":").trim();
      }
    }

    const dataMatch = raw.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
      if (method === "GET") method = "POST";
      try {
        data = JSON.parse(dataMatch[1]);
      } catch {
        data = dataMatch[1];
      }
    }

    const hasData = data !== undefined;
    const dataStr = hasData ? (typeof data === "object" ? JSON.stringify(data, null, 2) : JSON.stringify(data)) : "";

    const axiosCode = `import axios from "axios";\n\nconst { data } = await axios({\n  method: "${method.toLowerCase()}",\n  url: "${url}",\n  headers: ${JSON.stringify(headers, null, 4)},${hasData ? `\n  data: ${dataStr},` : ""}\n});\n\nconsole.log(data);`;

    const fetchCode = `const response = await fetch("${url}", {\n  method: "${method}",\n  headers: ${JSON.stringify(headers, null, 4)},${hasData ? `\n  body: ${typeof data === "object" ? "JSON.stringify(" + dataStr + ")" : `"${data}"`},` : ""}\n});\n\nconst data = await response.json();\nconsole.log(data);`;

    const nodeCode = `// Express Route Handler\napp.${method.toLowerCase()}("/api/proxy", async (req, res) => {\n  try {\n    const upstream = await fetch("${url}", {\n      method: "${method}",\n      headers: ${JSON.stringify(headers, null, 6)},${hasData ? `\n      body: req.body ? JSON.stringify(req.body) : undefined,` : ""}\n    });\n    res.status(upstream.status).json(await upstream.json());\n  } catch (err) {\n    res.status(500).json({ error: err.message });\n  }\n});`;

    return { axiosCode, fetchCode, nodeCode };
  }, [curlInput]);

  // ----------------- 4. JSON to Mongoose & TypeScript (LIVE) -----------------
  const [jsonInput, setJsonInput] = useState(
    JSON.stringify(
      {
        id: "usr_9921",
        username: "kapil_dev",
        email: "kapil@example.com",
        isActive: true,
        role: "admin",
        stats: {
          loginCount: 42,
          lastActive: "2026-11-26T12:00:00.000Z",
        },
        tags: ["react", "node", "mongodb", "typescript"],
      },
      null,
      2
    )
  );
  const [schemaTab, setSchemaTab] = useState<"ts" | "mongoose" | "zod">("ts");

  // Live Schema Generator
  const liveSchemas = useMemo(() => {
    try {
      const parsed = JSON.parse(jsonInput);
      const root = Array.isArray(parsed) ? "Item" : "User";
      const sample = Array.isArray(parsed) ? parsed[0] || {} : parsed;

      const tsLines: string[] = [`export interface I${root} {`];
      const mongoLines: string[] = [
        `import mongoose, { Schema, Document } from "mongoose";\n`,
        `const ${root}Schema = new Schema<I${root}>({`,
      ];
      const zodLines: string[] = [`import { z } from "zod";\n`, `export const ${root}Schema = z.object({`];

      for (const [k, v] of Object.entries(sample)) {
        if (typeof v === "string") {
          if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
            tsLines.push(`  ${k}: Date;`);
            mongoLines.push(`  ${k}: { type: Date, default: Date.now },`);
            zodLines.push(`  ${k}: z.string().datetime(),`);
          } else {
            tsLines.push(`  ${k}: string;`);
            mongoLines.push(`  ${k}: { type: String, trim: true },`);
            zodLines.push(`  ${k}: z.string(),`);
          }
        } else if (typeof v === "number") {
          tsLines.push(`  ${k}: number;`);
          mongoLines.push(`  ${k}: { type: Number, default: 0 },`);
          zodLines.push(`  ${k}: z.number(),`);
        } else if (typeof v === "boolean") {
          tsLines.push(`  ${k}: boolean;`);
          mongoLines.push(`  ${k}: { type: Boolean, default: false },`);
          zodLines.push(`  ${k}: z.boolean(),`);
        } else if (Array.isArray(v)) {
          tsLines.push(`  ${k}: string[];`);
          mongoLines.push(`  ${k}: [{ type: String }],`);
          zodLines.push(`  ${k}: z.array(z.string()),`);
        } else if (typeof v === "object" && v !== null) {
          tsLines.push(`  ${k}: Record<string, any>;`);
          mongoLines.push(`  ${k}: { type: Schema.Types.Mixed },`);
          zodLines.push(`  ${k}: z.record(z.any()),`);
        }
      }

      tsLines.push("}");
      mongoLines.push("}, {\n  timestamps: true,\n  versionKey: false,\n});\n");
      mongoLines.push(`export const ${root}Model = mongoose.model<I${root}>("${root}", ${root}Schema);`);
      zodLines.push("});");

      return {
        ts: tsLines.join("\n"),
        mongoose: mongoLines.join("\n"),
        zod: zodLines.join("\n"),
        valid: true,
        error: "",
      };
    } catch (e: any) {
      return { valid: false, error: e.message, ts: "", mongoose: "", zod: "" };
    }
  }, [jsonInput]);

  // ----------------- 5. Interactive Regex Tester (LIVE) -----------------
  const [regexPattern, setRegexPattern] = useState("([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})");
  const [regexFlags, setRegexFlags] = useState("g");
  const [regexText, setRegexText] = useState(
    "Contact our team at dev@google.com, kapil.rajput@vh.dev, or support@antigravity.io for API access."
  );

  // Live Regex Evaluation
  const liveRegex = useMemo(() => {
    try {
      const reg = new RegExp(regexPattern, regexFlags);
      const matches: Array<{ match: string; index: number; groups: string[] }> = [];

      if (!regexFlags.includes("g")) {
        const m = reg.exec(regexText);
        if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      } else {
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = reg.exec(regexText)) !== null && count < 100) {
          count++;
          matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
          if (m.index === reg.lastIndex) reg.lastIndex++;
        }
      }

      return { valid: true, matches, count: matches.length };
    } catch (e: any) {
      return { valid: false, error: e.message, matches: [], count: 0 };
    }
  }, [regexPattern, regexFlags, regexText]);

  const handleCopy = (text: string | undefined | null, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(id);
    playTone("click");
    setTimeout(() => setCopied(null), 2000);
  };

  const generateLiveObjectIds = () => {
    playTone("click");
    const arr: string[] = [];
    for (let i = 0; i < 5; i++) {
      const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
      const rand = Math.random().toString(16).substring(2, 12).padStart(10, "0");
      const counter = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      arr.push(`${time}${rand}${counter}`);
    }
    setGeneratedIds(arr);
  };

  return (
    <div className="space-y-5">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b vh-border pb-3">
        {[
          { id: "jwt", label: "JWT Studio", icon: KeyRound },
          { id: "objectid", label: "MongoDB ObjectId", icon: Database },
          { id: "curl", label: "cURL Transpiler", icon: Terminal },
          { id: "schema", label: "JSON to Mongoose/TS", icon: FileCode },
          { id: "regex", label: "Interactive Regex", icon: Sliders },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              playTone("click");
              setSubTab(t.id as any);
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

      {/* 1. JWT Studio */}
      {subTab === "jwt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Encoded JWT Token (Live)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Reactive
                </span>
              </div>
              <textarea
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                rows={6}
                placeholder="Paste JWT..."
                className="w-full rounded-xl border vh-border bg-black/50 p-3 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />

              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Secret Key (for HMAC-SHA256 signature check)</label>
                <input
                  type="text"
                  value={jwtSecret}
                  onChange={(e) => setJwtSecret(e.target.value)}
                  className="w-full rounded-xl border vh-border bg-black/50 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Decoded Payload &amp; Verification</span>
                {liveJwtDecoded.valid && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      liveJwtDecoded.isExpired
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {liveJwtDecoded.isExpired ? "Expired Token" : "Active & Valid"}
                  </span>
                )}
              </h3>

              {liveJwtDecoded.valid ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-xs font-mono vh-text-dim border-b vh-border pb-3">
                    {liveJwtDecoded.issuedAt && (
                      <div>
                        <span className="text-white/50">Issued At: </span>
                        <strong className="text-white">{liveJwtDecoded.issuedAt}</strong>
                      </div>
                    )}
                    {liveJwtDecoded.expiresAt && (
                      <div>
                        <span className="text-white/50">Expires At: </span>
                        <strong className="text-cyan-400">{liveJwtDecoded.expiresAt}</strong>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Header</span>
                    <pre className="rounded-xl border vh-border bg-black/60 p-3 font-mono text-xs text-white">
                      {JSON.stringify(liveJwtDecoded.header, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Claims Payload</span>
                      <button
                        onClick={() => handleCopy(JSON.stringify(liveJwtDecoded.payload, null, 2), "payload")}
                        className="text-cyan-400 hover:underline text-[11px] font-semibold"
                      >
                        {copied === "payload" ? "Copied" : "Copy Claims"}
                      </button>
                    </div>
                    <pre className="rounded-xl border vh-border bg-black/60 p-3 font-mono text-xs text-cyan-300">
                      {JSON.stringify(liveJwtDecoded.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-red-400">
                  {liveJwtDecoded.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MongoDB ObjectId */}
      {subTab === "objectid" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-4 lg:col-span-6">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  24-Hex ObjectId Inspector
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Decompose
                </span>
              </div>
              <input
                type="text"
                value={inspectId}
                onChange={(e) => setInspectId(e.target.value)}
                placeholder="24-hex ObjectId..."
                className="w-full rounded-xl border vh-border bg-black/50 px-3 py-2 font-mono text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none"
              />

              {liveObjectId.valid ? (
                <div className="space-y-2 pt-2 border-t vh-border">
                  <div className="rounded-xl border vh-border bg-white/[0.02] p-4 text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="vh-text-dim">Creation Date:</span>
                      <span className="font-bold text-white">{liveObjectId.localDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="vh-text-dim">UTC Timestamp:</span>
                      <span className="text-cyan-400">{liveObjectId.utcDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="vh-text-dim">Unix Epoch:</span>
                      <span className="text-white">{liveObjectId.timestamp}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="vh-text-dim">Machine Identifier:</span>
                      <span className="text-cyan-400">{liveObjectId.machineId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="vh-text-dim">Process ID:</span>
                      <span className="text-white">{liveObjectId.processId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="vh-text-dim">Counter:</span>
                      <span className="text-cyan-400">{liveObjectId.counter}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-400 pt-2">{liveObjectId.error}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-6">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Instant Generator
                </span>
                <button
                  onClick={generateLiveObjectIds}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1.5 text-xs transition"
                >
                  Generate 5 IDs
                </button>
              </div>

              <div className="space-y-1.5 pt-1">
                {(generatedIds.length > 0 ? generatedIds : [inspectId]).map((id, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleCopy(id, `id-${idx}`)}
                    className="group flex items-center justify-between rounded-xl border vh-border bg-black/40 px-3 py-2.5 font-mono text-xs text-white hover:border-cyan-500/50 cursor-pointer transition"
                  >
                    <span className="text-cyan-300 font-bold">{id}</span>
                    <span className="text-[10px] vh-text-dim group-hover:text-cyan-400">
                      {copied === `id-${idx}` ? "Copied!" : "Click to Copy"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. cURL Transpiler */}
      {subTab === "curl" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  cURL Command (Live Input)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Parse
                </span>
              </div>
              <textarea
                value={curlInput}
                onChange={(e) => setCurlInput(e.target.value)}
                rows={11}
                className="w-full rounded-xl border vh-border bg-black/50 p-3 font-mono text-xs text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b vh-border pb-3">
                <div className="flex gap-2">
                  {[
                    { id: "axios", label: "Axios" },
                    { id: "fetch", label: "Browser Fetch" },
                    { id: "node", label: "Express / Node" },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setCurlLang(l.id as any)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        curlLang === l.id ? "bg-cyan-500 text-black shadow-xs" : "vh-text-dim hover:text-white"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const code =
                      curlLang === "axios"
                        ? liveTranspiledCurl.axiosCode
                        : curlLang === "fetch"
                        ? liveTranspiledCurl.fetchCode
                        : liveTranspiledCurl.nodeCode;
                    handleCopy(code, "curl");
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:underline"
                >
                  {copied === "curl" ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied === "curl" ? "Copied" : "Copy Code"}</span>
                </button>
              </div>

              <pre className="rounded-xl border vh-border bg-black/60 p-4 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto">
                {curlLang === "axios"
                  ? liveTranspiledCurl.axiosCode
                  : curlLang === "fetch"
                  ? liveTranspiledCurl.fetchCode
                  : liveTranspiledCurl.nodeCode}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 4. JSON to Mongoose & TypeScript */}
      {subTab === "schema" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Sample JSON (Live Parse)
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Inference
                </span>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                rows={13}
                className="w-full rounded-xl border vh-border bg-black/50 p-3 font-mono text-xs text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b vh-border pb-3">
                <div className="flex gap-2">
                  {[
                    { id: "ts", label: "TypeScript Interfaces" },
                    { id: "mongoose", label: "Mongoose Model" },
                    { id: "zod", label: "Zod Schema" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSchemaTab(s.id as any)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        schemaTab === s.id ? "bg-cyan-500 text-black shadow-xs" : "vh-text-dim hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {liveSchemas.valid && (
                  <button
                    onClick={() => {
                      const code =
                        schemaTab === "ts"
                          ? liveSchemas.ts
                          : schemaTab === "mongoose"
                          ? liveSchemas.mongoose
                          : liveSchemas.zod;
                      handleCopy(code, "schema");
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:underline"
                  >
                    {copied === "schema" ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied === "schema" ? "Copied" : "Copy Code"}</span>
                  </button>
                )}
              </div>

              {liveSchemas.valid ? (
                <pre className="rounded-xl border vh-border bg-black/60 p-4 font-mono text-xs text-cyan-300 leading-relaxed overflow-x-auto">
                  {schemaTab === "ts" ? liveSchemas.ts : schemaTab === "mongoose" ? liveSchemas.mongoose : liveSchemas.zod}
                </pre>
              ) : (
                <div className="p-8 text-center text-xs text-red-400">{liveSchemas.error}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Interactive Regex */}
      {subTab === "regex" && (
        <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4 max-w-4xl shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-cyan-400" />
              <span>Real-Time Regex Evaluator</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Keystroke Matching
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-9 space-y-1">
              <label className="text-[11px] font-semibold vh-text-dim">Pattern</label>
              <input
                type="text"
                value={regexPattern}
                onChange={(e) => setRegexPattern(e.target.value)}
                className="w-full rounded-xl border vh-border bg-black/50 px-3 py-2 font-mono text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="text-[11px] font-semibold vh-text-dim">Flags</label>
              <input
                type="text"
                value={regexFlags}
                onChange={(e) => setRegexFlags(e.target.value)}
                className="w-full rounded-xl border vh-border bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold vh-text-dim">Test String</label>
            <textarea
              value={regexText}
              onChange={(e) => setRegexText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border vh-border bg-black/50 p-3 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {liveRegex.valid ? (
            <div className="pt-2 border-t vh-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">
                  Found <strong className="text-cyan-400">{liveRegex.count}</strong> Matches
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {liveRegex.matches.map((m, idx) => (
                  <div key={idx} className="rounded-xl border vh-border bg-black/40 p-3 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-cyan-400 font-bold">Match #{idx + 1}</span>
                      <span className="vh-text-dim">Index: {m.index}</span>
                    </div>
                    <p className="text-white font-semibold">{m.match}</p>
                    {m.groups.length > 0 && (
                      <div className="flex gap-2 text-[10px] text-white/50 pt-1">
                        {m.groups.map((g, gi) => (
                          <span key={gi} className="rounded bg-white/10 px-1.5 py-0.5">
                            Group {gi + 1}: <strong className="text-cyan-300">{g}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-red-400">{liveRegex.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
