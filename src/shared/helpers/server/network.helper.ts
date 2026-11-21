import os from "node:os";

/**
 * Returns the first active non-internal IPv4 address for local network access (e.g. 192.168.x.x or 10.x.x.x).
 */
export function getLocalNetworkIp(): string | null {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const ifaces = interfaces[name];
      if (!ifaces) continue;
      for (const iface of ifaces) {
        if (iface.family === "IPv4" && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch {
    // Network interfaces not available or permission denied
  }
  return null;
}
