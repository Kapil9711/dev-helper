import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import chalk from "chalk";
import sirv from "sirv";
import { exec } from "../../shared/helpers/shell/exec.ts";
import { findAvailablePort } from "../../shared/helpers/server/port.helper.ts";
import { utilityService } from "./utility.service.ts";
import type { UtilityServerInfo } from "./utility.types.ts";

export interface UtilityServerOptions {
  port?: number;
  open?: boolean;
}

function getDashboardDirectory(): string {
  const candidates = [
    resolve(__dirname, "../../dashboard"),
    resolve(__dirname, "../../../dashboard/out"),
    resolve(process.cwd(), "dist/dashboard"),
    resolve(process.cwd(), "dashboard/out"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((res, rej) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Allow up to 100MB for media/image payloads
      if (body.length > 100 * 1024 * 1024) {
        req.destroy();
        rej(new Error("Payload exceeds maximum size limit (100MB)"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) return res({} as T);
      try {
        res(JSON.parse(body) as T);
      } catch (e) {
        rej(e);
      }
    });
    req.on("error", rej);
  });
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "no-store, no-cache, must-revalidate",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function bufferFromDataUrl(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:.*?;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

export async function startUtilityDashboardServer(
  options: UtilityServerOptions = {}
): Promise<any> {
  const requestedPort = Number(options.port) || 4320;
  const { port, wasChanged } = await findAvailablePort(requestedPort);

  if (wasChanged) {
    console.log(
      chalk.yellow(`\n[VH Utility] Port ${requestedPort} is occupied. Using next available port: ${chalk.bold(port)}`)
    );
  }

  const dashboardDir = getDashboardDirectory();
  const serveDashboard = sirv(dashboardDir, {
    dev: false,
    single: false,
  });

  const ffmpegAvailable = await utilityService.isFfmpegAvailable();
  const sharpAvailable = utilityService.isSharpAvailable();

  const httpServer = createServer(async (req, res) => {
    // CORS Preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "Content-Type",
      });
      res.end();
      return;
    }

    const host = req.headers.host || `localhost:${port}`;
    const url = new URL(req.url || "/", `http://${host}`);

    // Server Info
    if (url.pathname === "/api/server-info") {
      const info: UtilityServerInfo = {
        mode: "utility",
        name: "VH Utility",
        version: "1.0.0",
        port,
        ffmpegAvailable,
        sharpAvailable,
      };
      sendJson(res, info);
      return;
    }

    // Health
    if (url.pathname === "/health") {
      sendJson(res, { ok: true, service: "vh-utility", port });
      return;
    }

    // API Routes
    if (url.pathname.startsWith("/api/utility/")) {
      try {
        // --- Image Studio Endpoints ---
        if (url.pathname === "/api/utility/image/convert" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; options: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.convertImage(buf, body.options);
          sendJson(res, {
            dataUrl: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
            format: result.format,
            sizeBytes: result.sizeBytes,
            mimeType: result.mimeType,
          });
          return;
        }

        if (url.pathname === "/api/utility/image/metadata" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const meta = await utilityService.getImageMetadata(buf);
          sendJson(res, meta);
          return;
        }

        if (url.pathname === "/api/utility/image/favicon-bundle" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const bundle = await utilityService.generateFaviconBundle(buf);
          sendJson(res, bundle);
          return;
        }

        // --- PDF Suite Endpoints ---
        if (url.pathname === "/api/utility/pdf/from-images" && req.method === "POST") {
          const body = await parseJsonBody<{
            images: Array<{ name: string; dataUrl: string }>;
            options?: any;
          }>(req);
          const imageList = body.images.map((img) => ({
            name: img.name,
            buffer: bufferFromDataUrl(img.dataUrl),
          }));
          const pdfBuf = await utilityService.imagesToPdf(imageList, body.options);
          sendJson(res, {
            dataUrl: `data:application/pdf;base64,${pdfBuf.toString("base64")}`,
            sizeBytes: pdfBuf.length,
          });
          return;
        }

        if (url.pathname === "/api/utility/pdf/from-text" && req.method === "POST") {
          const body = await parseJsonBody<{ text: string; options?: any }>(req);
          const pdfBuf = utilityService.textToPdf(body.text, body.options);
          sendJson(res, {
            dataUrl: `data:application/pdf;base64,${pdfBuf.toString("base64")}`,
            sizeBytes: pdfBuf.length,
          });
          return;
        }

        if (url.pathname === "/api/utility/pdf/inspect" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const meta = utilityService.inspectPdf(buf);
          sendJson(res, meta);
          return;
        }

        if (url.pathname === "/api/utility/pdf/extract-text" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const text = utilityService.extractPdfText(buf);
          sendJson(res, { text });
          return;
        }

        // --- Media Studio (Video / Audio) Endpoints ---
        if (url.pathname === "/api/utility/media/video-to-gif" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; options?: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.videoToGif(buf, body.options);
          sendJson(res, {
            dataUrl: `data:image/gif;base64,${result.buffer.toString("base64")}`,
            sizeBytes: result.sizeBytes,
          });
          return;
        }

        if (url.pathname === "/api/utility/media/thumbnail" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; options: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.extractVideoThumbnail(buf, body.options);
          sendJson(res, {
            dataUrl: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
            mimeType: result.mimeType,
          });
          return;
        }

        if (url.pathname === "/api/utility/media/trim" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; options: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.trimVideo(buf, body.options);
          sendJson(res, {
            dataUrl: `data:video/mp4;base64,${result.buffer.toString("base64")}`,
            sizeBytes: result.sizeBytes,
          });
          return;
        }

        if (url.pathname === "/api/utility/media/extract-audio" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; format?: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.extractAudio(buf, body.format);
          sendJson(res, {
            dataUrl: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
            mimeType: result.mimeType,
          });
          return;
        }

        if (url.pathname === "/api/utility/media/convert-audio" && req.method === "POST") {
          const body = await parseJsonBody<{ dataUrl: string; options: any }>(req);
          const buf = bufferFromDataUrl(body.dataUrl);
          const result = await utilityService.convertAudio(buf, body.options);
          sendJson(res, {
            dataUrl: `data:${result.mimeType};base64,${result.buffer.toString("base64")}`,
            mimeType: result.mimeType,
          });
          return;
        }

        // --- MERN Tools Endpoints ---
        if (url.pathname === "/api/utility/mern/jwt-decode" && req.method === "POST") {
          const body = await parseJsonBody<{ token: string; secret?: string }>(req);
          const result = utilityService.decodeJwt(body.token, body.secret);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/mern/jwt-sign" && req.method === "POST") {
          const body = await parseJsonBody<{
            payload: Record<string, unknown>;
            secret: string;
            header?: Record<string, unknown>;
            expiresInSeconds?: number;
          }>(req);
          const token = utilityService.signJwt(body);
          sendJson(res, { token });
          return;
        }

        if (url.pathname === "/api/utility/mern/objectid-inspect" && req.method === "POST") {
          const body = await parseJsonBody<{ id: string }>(req);
          const result = utilityService.inspectObjectId(body.id);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/mern/objectid-generate" && req.method === "POST") {
          const body = await parseJsonBody<{ count?: number }>(req);
          const result = utilityService.generateObjectIds(body.count || 1);
          sendJson(res, { ids: result });
          return;
        }

        if (url.pathname === "/api/utility/mern/curl-to-code" && req.method === "POST") {
          const body = await parseJsonBody<{ curl: string }>(req);
          const result = utilityService.convertCurlToCode(body.curl);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/mern/json-to-schema" && req.method === "POST") {
          const body = await parseJsonBody<{ json: string }>(req);
          const result = utilityService.jsonToSchema(body.json);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/mern/regex-test" && req.method === "POST") {
          const body = await parseJsonBody<{ pattern: string; flags?: string; testString: string }>(req);
          const result = utilityService.testRegex(body.pattern, body.flags || "g", body.testString);
          sendJson(res, result);
          return;
        }

        // --- Crypto & Hashes Endpoints ---
        if (url.pathname === "/api/utility/crypto/hash" && req.method === "POST") {
          const body = await parseJsonBody<{ input: string; algorithm: string; key?: string }>(req);
          const result = utilityService.hashString(body.input, body.algorithm, body.key);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/crypto/uuid" && req.method === "POST") {
          const uuid = utilityService.generateUuid();
          const nanoId = utilityService.generateNanoId();
          sendJson(res, { uuid, nanoId });
          return;
        }

        if (url.pathname === "/api/utility/crypto/bcrypt-hash" && req.method === "POST") {
          const body = await parseJsonBody<{ password: string; rounds?: number }>(req);
          const result = utilityService.bcryptHash(body.password, body.rounds);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/crypto/bcrypt-verify" && req.method === "POST") {
          const body = await parseJsonBody<{ password: string; hash: string }>(req);
          const result = utilityService.bcryptVerify(body.password, body.hash);
          sendJson(res, result);
          return;
        }

        if (url.pathname === "/api/utility/crypto/base64" && req.method === "POST") {
          const body = await parseJsonBody<{ action: "encode" | "decode"; input: string }>(req);
          const result =
            body.action === "encode"
              ? utilityService.base64Encode(body.input)
              : utilityService.base64Decode(body.input);
          sendJson(res, { result });
          return;
        }

        if (url.pathname === "/api/utility/crypto/url" && req.method === "POST") {
          const body = await parseJsonBody<{ action: "encode" | "decode"; input: string }>(req);
          const result =
            body.action === "encode"
              ? utilityService.urlEncode(body.input)
              : utilityService.urlDecode(body.input);
          sendJson(res, { result });
          return;
        }

        sendJson(res, { error: `Endpoint not found: ${url.pathname}` }, 404);
        return;
      } catch (err: any) {
        sendJson(res, { error: err.message || "Internal server error" }, 500);
        return;
      }
    }

    // Serve Static Dashboard
    serveDashboard(req, res, () => {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("Not Found");
    });
  });

  httpServer.listen(port, "0.0.0.0", async () => {
    const dashboardUrl = `http://localhost:${port}/utility`;
    console.log(chalk.bold.hex("#06b6d4")("\n┌────────────────────────────────────────────────────────┐"));
    console.log(chalk.bold.hex("#06b6d4")("│             ⚡ VH UTILITY DASHBOARD ⚡                 │"));
    console.log(chalk.bold.hex("#06b6d4")("└────────────────────────────────────────────────────────┘"));
    console.log(chalk.white(`  • Local:      ${chalk.bold.cyan(dashboardUrl)}`));
    console.log(chalk.gray(`  • Port:       ${chalk.white(port)}`));
    console.log(chalk.gray(`  • Engine:     ${chalk.green("Node.js Native + Sharp")}`));
    console.log(chalk.gray(`  • FFmpeg:     ${ffmpegAvailable ? chalk.green("Available") : chalk.yellow("Not Found (Media tools disabled)")}`));
    console.log(chalk.gray(`  • Sharp:      ${sharpAvailable ? chalk.green("Available") : chalk.red("Missing")}`));
    console.log(chalk.cyan("\nPress Ctrl+C to stop the utility dashboard.\n"));

    if (options.open !== false) {
      const openCmd =
        process.platform === "darwin"
          ? `open "${dashboardUrl}"`
          : process.platform === "win32"
          ? `start "" "${dashboardUrl}"`
          : `xdg-open "${dashboardUrl}"`;
      await exec(openCmd).catch(() => {});
    }
  });

  return httpServer;
}
