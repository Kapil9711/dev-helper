/**
 * Generates an event ID across browser, Node.js, and React Native.
 * Uses Web Crypto when available, with a non-cryptographic fallback.
 */
export function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2),
    Math.random().toString(36).slice(2),
  ].join("-");
}
