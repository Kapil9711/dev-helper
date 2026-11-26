import {
  createHash,
  createHmac,
  randomUUID,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { HashResult, BcryptResult, BcryptVerifyResult } from "./utility.types.ts";

export class CryptoHelper {
  static hashString(input: string, algorithm: string, key?: string): HashResult {
    const alg = algorithm.toLowerCase();
    let hash: string;

    if (key && (alg.startsWith("hmac") || key.length > 0)) {
      const actualAlg = alg.replace(/^hmac-?/, "") || "sha256";
      hash = createHmac(actualAlg, key).update(input).digest("hex");
    } else {
      hash = createHash(alg).update(input).digest("hex");
    }

    return {
      algorithm,
      inputLength: input.length,
      hash,
    };
  }

  static generateUuid(): string {
    return randomUUID();
  }

  static generateNanoId(size = 21): string {
    const urlAlphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-";
    const bytes = randomBytes(size);
    let id = "";
    for (let i = 0; i < size; i++) {
      id += urlAlphabet[bytes[i] & 63];
    }
    return id;
  }

  /**
   * Secure Salted Password Hashing using Node.js scrypt with modular crypt format.
   * Format: $2b$<rounds>$<salt>$<hash> compatible with bcrypt UX.
   */
  static bcryptHash(password: string, rounds = 10): BcryptResult {
    const cost = Math.max(4, Math.min(16, rounds));
    const salt = randomBytes(16).toString("base64").replace(/=/g, "");
    const N = Math.pow(2, cost); // CPU/memory cost
    const derivedKey = scryptSync(password, salt, 32, { N, r: 8, p: 1 });
    const hash = `$2b$${cost.toString().padStart(2, "0")}$${salt}$${derivedKey.toString("base64")}`;

    return {
      hash,
      saltRounds: cost,
    };
  }

  static bcryptVerify(password: string, formattedHash: string): BcryptVerifyResult {
    const start = performance.now();
    try {
      const parts = formattedHash.split("$").filter(Boolean);
      if (parts.length < 4 || (parts[0] !== "2b" && parts[0] !== "2a" && parts[0] !== "2y")) {
        return {
          match: false,
          computedDurationMs: Math.round(performance.now() - start),
        };
      }

      const cost = parseInt(parts[1], 10);
      const salt = parts[2];
      const originalDerived = parts[3];

      const N = Math.pow(2, Math.max(4, Math.min(16, cost)));
      const derivedKey = scryptSync(password, salt, 32, { N, r: 8, p: 1 });
      const computedDerived = derivedKey.toString("base64");

      const match =
        computedDerived.length === originalDerived.length &&
        timingSafeEqual(Buffer.from(computedDerived), Buffer.from(originalDerived));

      return {
        match,
        computedDurationMs: Math.round(performance.now() - start),
      };
    } catch {
      return {
        match: false,
        computedDurationMs: Math.round(performance.now() - start),
      };
    }
  }

  static base64Encode(input: string): string {
    return Buffer.from(input, "utf8").toString("base64");
  }

  static base64Decode(input: string): string {
    return Buffer.from(input, "base64").toString("utf8");
  }

  static urlEncode(input: string): string {
    return encodeURIComponent(input);
  }

  static urlDecode(input: string): string {
    return decodeURIComponent(input);
  }
}
