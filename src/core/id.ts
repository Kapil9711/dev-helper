export function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  throw new Error(
    "Secure randomUUID is unavailable. Use a modern runtime with Web Crypto support.",
  );
}
