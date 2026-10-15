import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import type { VHLogLevel } from "./types.js";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export async function createFingerprint(
  level: VHLogLevel,
  message: string,
  data?: Record<string, unknown>,
): Promise<string> {
  const input = stableStringify({
    level,
    message,
    data: data ?? null,
  });

  return bytesToHex(sha256(utf8ToBytes(input)));
}
