import net from "node:net";

export function isPortAvailable(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.unref();

    tester.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE" || err.code === "EACCES") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });

    try {
      tester.listen(port, host);
    } catch {
      resolve(false);
    }
  });
}

export async function findAvailablePort(
  preferredPort: number,
  host = "0.0.0.0",
  maxAttempts = 50,
): Promise<{ port: number; wasChanged: boolean }> {
  for (let p = preferredPort; p < preferredPort + maxAttempts; p++) {
    const available = await isPortAvailable(p, host);
    if (available) {
      return { port: p, wasChanged: p !== preferredPort };
    }
  }

  throw new Error(
    `No available ports found between ${preferredPort} and ${
      preferredPort + maxAttempts
    }. Please specify an open port with --port.`,
  );
}
