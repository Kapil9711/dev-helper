"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  Hash,
  Fingerprint,
  Code2,
  Copy,
  Check,
  Sparkles,
  RefreshCw,
  Clock,
  KeyRound,
} from "lucide-react";
import { playTone } from "@/lib/prefrences";

export function CryptoTab() {
  const [subTab, setSubTab] = useState<"bcrypt" | "hash" | "uuid" | "base64">("bcrypt");
  const [copied, setCopied] = useState<string | null>(null);

  // Bcrypt state
  const [bcryptPassword, setBcryptPassword] = useState("DeveloperPassword#2026");
  const [saltRounds, setSaltRounds] = useState<number>(10);
  const [generatedBcrypt, setGeneratedBcrypt] = useState<string>("");
  const [verifyPassword, setVerifyPassword] = useState("DeveloperPassword#2026");
  const [verifyHash, setVerifyHash] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);

  // Hash state (LIVE)
  const [hashInput, setHashInput] = useState("Hello Antigravity 2.0 Full-Stack");
  const [hashAlgorithm, setHashAlgorithm] = useState("sha256");
  const [hmacKey, setHmacKey] = useState("my-secret");
  const [calculatedHash, setCalculatedHash] = useState<string>("");

  // UUID & NanoID state
  const [uuidList, setUuidList] = useState<string[]>([
    "8f9a2b1c-3d4e-4f5a-b6c7-8d9e0f1a2b3c",
    "4a5b6c7d-8e9f-4a1b-2c3d-4e5f6a7b8c9d",
    "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  ]);
  const [nanoIdList, setNanoIdList] = useState<string[]>([
    "V1StGXR8_Z5jdHi6B-myT",
    "Uakgb_J5m9g-0Npe1q2rs",
    "9pQwErTyUiOpAsDfGhJkL",
  ]);

  // Base64 / URL state (LIVE)
  const [encodingType, setEncodingType] = useState<"base64" | "url">("base64");
  const [encodingAction, setEncodingAction] = useState<"encode" | "decode">("encode");
  const [encodingInput, setEncodingInput] = useState("VH Developer Helper Suite 2026");

  // Live Base64 / URL calculation
  const liveEncodingOutput = useMemo(() => {
    try {
      if (encodingType === "base64") {
        if (encodingAction === "encode") {
          return btoa(
            encodeURIComponent(encodingInput).replace(/%([0-9A-F]{2})/g, (_, p1) =>
              String.fromCharCode(parseInt(p1, 16))
            )
          );
        } else {
          return decodeURIComponent(
            atob(encodingInput)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
        }
      } else {
        if (encodingAction === "encode") {
          return encodeURIComponent(encodingInput);
        } else {
          return decodeURIComponent(encodingInput);
        }
      }
    } catch (e: any) {
      return `Error: ${e.message}`;
    }
  }, [encodingType, encodingAction, encodingInput]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    playTone("click");
    setTimeout(() => setCopied(null), 2000);
  };

  // Bcrypt Hash (Node server backed)
  const handleBcryptHash = async () => {
    playTone("click");
    try {
      const res = await fetch("/api/utility/crypto/bcrypt-hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: bcryptPassword, rounds: saltRounds }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedBcrypt(data.hash);
        setVerifyHash(data.hash);
      }
    } catch (err: any) {
      alert(`Bcrypt hash error: ${err.message}`);
    }
  };

  // Bcrypt Verify (Node server backed)
  const handleBcryptVerify = async () => {
    playTone("click");
    try {
      const res = await fetch("/api/utility/crypto/bcrypt-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: verifyPassword, hash: verifyHash }),
      });
      if (res.ok) {
        setVerifyResult(await res.json());
      }
    } catch (err: any) {
      alert(`Bcrypt verify error: ${err.message}`);
    }
  };

  // Live Hash Computation using Web Crypto API + Server fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const computeLiveHash = async () => {
      try {
        if (!hashAlgorithm.startsWith("hmac")) {
          const algMap: Record<string, string> = {
            sha256: "SHA-256",
            sha512: "SHA-512",
            sha1: "SHA-1",
          };
          const webAlg = algMap[hashAlgorithm];
          if (webAlg && window.crypto?.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(hashInput);
            const hashBuffer = await window.crypto.subtle.digest(webAlg, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            setCalculatedHash(hex);
            return;
          }
        }

        // Server API for MD5 or HMAC
        const res = await fetch("/api/utility/crypto/hash", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: hashInput,
            algorithm: hashAlgorithm,
            key: hmacKey || undefined,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCalculatedHash(data.hash);
        }
      } catch {
        // fallback
      }
    };
    computeLiveHash();
  }, [hashInput, hashAlgorithm, hmacKey]);

  // Generate UUID & NanoID live
  const generateLiveIds = () => {
    playTone("click");
    const uuids: string[] = [];
    const nanoids: string[] = [];
    const urlAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";

    for (let i = 0; i < 5; i++) {
      uuids.push(crypto.randomUUID());
      const bytes = new Uint8Array(21);
      crypto.getRandomValues(bytes);
      let nid = "";
      for (let j = 0; j < 21; j++) nid += urlAlphabet[bytes[j] & 63];
      nanoids.push(nid);
    }

    setUuidList(uuids);
    setNanoIdList(nanoids);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b vh-border pb-3">
        {[
          { id: "bcrypt", label: "Bcrypt Hasher & Matcher", icon: Lock },
          { id: "hash", label: "Cryptographic Checksums", icon: Hash },
          { id: "uuid", label: "UUID & NanoID", icon: Fingerprint },
          { id: "base64", label: "Base64 & URL Encoding", icon: Code2 },
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

      {/* Bcrypt Hasher & Matcher */}
      {subTab === "bcrypt" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="space-y-4 lg:col-span-6">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Salted Password Hasher ($2b$)
              </h3>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Plaintext Password</label>
                <input
                  type="text"
                  value={bcryptPassword}
                  onChange={(e) => setBcryptPassword(e.target.value)}
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="vh-text-dim">Salt Rounds (Cost)</span>
                  <span className="text-cyan-400 font-mono">{saltRounds}</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="14"
                  value={saltRounds}
                  onChange={(e) => setSaltRounds(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <button
                onClick={handleBcryptHash}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2.5 text-xs transition"
              >
                <Sparkles size={14} />
                <span>Compute Bcrypt Hash</span>
              </button>

              {generatedBcrypt && (
                <div className="mt-4 pt-4 border-t vh-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/80">Generated Hash:</span>
                    <button
                      onClick={() => handleCopy(generatedBcrypt, "bcrypt-gen")}
                      className="text-cyan-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
                    >
                      {copied === "bcrypt-gen" ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copied === "bcrypt-gen" ? "Copied" : "Copy Hash"}</span>
                    </button>
                  </div>
                  <pre className="rounded-xl border vh-border bg-black/60 p-3 font-mono text-xs text-cyan-300 break-all whitespace-pre-wrap">
                    {generatedBcrypt}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 lg:col-span-6">
            <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Password Match &amp; Benchmark Verifier
              </h3>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Password to Test</label>
                <input
                  type="text"
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">Bcrypt Hash String</label>
                <input
                  type="text"
                  value={verifyHash}
                  onChange={(e) => setVerifyHash(e.target.value)}
                  placeholder="$2b$10$..."
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleBcryptVerify}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold py-2.5 text-xs transition"
              >
                <ShieldCheck size={14} />
                <span>Verify Password Match</span>
              </button>

              {verifyResult && (
                <div className="mt-4 pt-4 border-t vh-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
                        verifyResult.match
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-red-500/40 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {verifyResult.match ? <Check size={14} /> : <Lock size={14} />}
                      <span>{verifyResult.match ? "Password Matches!" : "Mismatch"}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs font-mono text-white/60">
                      <Clock size={12} />
                      <span>{verifyResult.computedDurationMs} ms</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cryptographic Checksums (LIVE) */}
      {subTab === "hash" && (
        <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4 max-w-3xl shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Hash size={16} className="text-cyan-400" />
              <span>Real-Time Checksum Generator</span>
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Keystroke Hashing
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold vh-text-dim">Input Payload String</label>
            <textarea
              value={hashInput}
              onChange={(e) => setHashInput(e.target.value)}
              rows={4}
              className="w-full rounded-xl border vh-border bg-black/40 p-3 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold vh-text-dim">Algorithm</label>
              <select
                value={hashAlgorithm}
                onChange={(e) => setHashAlgorithm(e.target.value)}
                className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="sha256">SHA-256 (Default)</option>
                <option value="sha512">SHA-512</option>
                <option value="md5">MD5</option>
                <option value="sha1">SHA-1</option>
                <option value="hmac-sha256">HMAC-SHA256 (With Secret)</option>
              </select>
            </div>
            {hashAlgorithm.startsWith("hmac") && (
              <div className="space-y-1">
                <label className="text-[11px] font-semibold vh-text-dim">HMAC Key</label>
                <input
                  type="text"
                  value={hmacKey}
                  onChange={(e) => setHmacKey(e.target.value)}
                  placeholder="Secret key..."
                  className="w-full rounded-xl border vh-border bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t vh-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-cyan-400">
                {hashAlgorithm} Digest (Live):
              </span>
              <button
                onClick={() => handleCopy(calculatedHash, "hash")}
                className="text-cyan-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
              >
                {copied === "hash" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied === "hash" ? "Copied" : "Copy Digest"}</span>
              </button>
            </div>
            <pre className="rounded-xl border vh-border bg-black/60 p-3.5 font-mono text-xs text-cyan-300 break-all whitespace-pre-wrap">
              {calculatedHash || "Computing..."}
            </pre>
          </div>
        </div>
      )}

      {/* UUID & NanoID */}
      {subTab === "uuid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">UUID v4 (RFC 4122)</h3>
              <button
                onClick={generateLiveIds}
                className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-3 py-1 text-xs transition"
              >
                Regenerate
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {uuidList.map((id, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopy(id, `uuid-${idx}`)}
                  className="group flex items-center justify-between rounded-xl border vh-border bg-black/40 px-3.5 py-2.5 font-mono text-xs text-white hover:border-cyan-500/50 cursor-pointer transition"
                >
                  <span className="text-cyan-300 font-bold">{id}</span>
                  <span className="text-[10px] vh-text-dim group-hover:text-cyan-400">
                    {copied === `uuid-${idx}` ? "Copied" : "Copy"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border vh-border vh-bg-card p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">Compact NanoID (21 Chars)</h3>
              <button
                onClick={generateLiveIds}
                className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold px-3 py-1 text-xs transition"
              >
                Regenerate
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {nanoIdList.map((id, idx) => (
                <div
                  key={idx}
                  onClick={() => handleCopy(id, `nano-${idx}`)}
                  className="group flex items-center justify-between rounded-xl border vh-border bg-black/40 px-3.5 py-2.5 font-mono text-xs text-white hover:border-cyan-500/50 cursor-pointer transition"
                >
                  <span className="text-cyan-300 font-bold">{id}</span>
                  <span className="text-[10px] vh-text-dim group-hover:text-cyan-400">
                    {copied === `nano-${idx}` ? "Copied" : "Copy"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Base64 & URL (LIVE) */}
      {subTab === "base64" && (
        <div className="rounded-2xl border vh-border vh-bg-card p-6 space-y-4 max-w-3xl shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setEncodingType("base64")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  encodingType === "base64" ? "bg-cyan-500 text-black shadow-xs" : "vh-text-dim hover:text-white"
                }`}
              >
                Base64
              </button>
              <button
                onClick={() => setEncodingType("url")}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  encodingType === "url" ? "bg-cyan-500 text-black shadow-xs" : "vh-text-dim hover:text-white"
                }`}
              >
                URL Percent Encoding
              </button>
            </div>

            <div className="flex gap-1 rounded-xl border vh-border bg-black/40 p-1">
              <button
                onClick={() => setEncodingAction("encode")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  encodingAction === "encode" ? "bg-white/10 text-white" : "vh-text-dim hover:text-white"
                }`}
              >
                Encode
              </button>
              <button
                onClick={() => setEncodingAction("decode")}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  encodingAction === "decode" ? "bg-white/10 text-white" : "vh-text-dim hover:text-white"
                }`}
              >
                Decode
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold vh-text-dim">Input Text (Live Reaction)</label>
              <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Transformation
              </span>
            </div>
            <textarea
              value={encodingInput}
              onChange={(e) => setEncodingInput(e.target.value)}
              rows={4}
              className="w-full rounded-xl border vh-border bg-black/40 p-3 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 pt-4 border-t vh-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-cyan-400">
                {encodingType.toUpperCase()} Result:
              </span>
              <button
                onClick={() => handleCopy(liveEncodingOutput, "enc")}
                className="text-cyan-400 hover:underline text-[11px] font-semibold flex items-center gap-1"
              >
                {copied === "enc" ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied === "enc" ? "Copied" : "Copy Result"}</span>
              </button>
            </div>
            <pre className="rounded-xl border vh-border bg-black/60 p-3.5 font-mono text-xs text-cyan-300 break-all whitespace-pre-wrap">
              {liveEncodingOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
