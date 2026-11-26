import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type {
  JwtDecodeResult,
  JwtSignOptions,
  MongoObjectIdDetail,
  CurlParseResult,
  SchemaGenerationResult,
  RegexTestResult,
} from "./utility.types.ts";

let objectIdCounter = Math.floor(Math.random() * 0xffffff);

export class MernHelper {
  // ----------------- JWT Debugger & Signer -----------------
  private static base64UrlEncode(str: string | Buffer): string {
    const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
    return buf
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }

  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    return Buffer.from(base64, "base64").toString("utf8");
  }

  static decodeJwt(token: string, secret?: string): JwtDecodeResult {
    const cleanToken = token.trim();
    const parts = cleanToken.split(".");

    if (parts.length !== 3) {
      return {
        valid: false,
        header: {},
        payload: {},
        signature: "",
        error: "Invalid JWT structure: Token must contain exactly 3 dot-separated segments.",
      };
    }

    try {
      const headerStr = this.base64UrlDecode(parts[0]);
      const payloadStr = this.base64UrlDecode(parts[1]);
      const signature = parts[2];

      const header = JSON.parse(headerStr);
      const payload = JSON.parse(payloadStr);

      let issuedAt: string | undefined;
      let expiresAt: string | undefined;
      let isExpired = false;

      if (typeof payload.iat === "number") {
        issuedAt = new Date(payload.iat * 1000).toISOString();
      }

      if (typeof payload.exp === "number") {
        const expDate = new Date(payload.exp * 1000);
        expiresAt = expDate.toISOString();
        isExpired = Date.now() > expDate.getTime();
      }

      let signatureVerified: boolean | undefined;

      if (secret && header.alg === "HS256") {
        const expectedSig = this.base64UrlEncode(
          createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest()
        );
        signatureVerified = expectedSig === signature;
      }

      return {
        valid: true,
        header,
        payload,
        signature,
        issuedAt,
        expiresAt,
        isExpired,
        signatureVerified,
      };
    } catch (err: any) {
      return {
        valid: false,
        header: {},
        payload: {},
        signature: parts[2] || "",
        error: `Failed to decode JWT payload: ${err.message}`,
      };
    }
  }

  static signJwt(options: JwtSignOptions): string {
    const header = options.header || { alg: "HS256", typ: "JWT" };
    const payload = { ...options.payload };

    const now = Math.floor(Date.now() / 1000);
    if (!payload.iat) {
      payload.iat = now;
    }

    if (options.expiresInSeconds && !payload.exp) {
      payload.exp = now + options.expiresInSeconds;
    }

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = this.base64UrlEncode(
      createHmac("sha256", options.secret).update(signingInput).digest()
    );

    return `${signingInput}.${signature}`;
  }

  // ----------------- MongoDB ObjectId Inspector & Generator -----------------
  static inspectObjectId(id: string): MongoObjectIdDetail {
    const cleanId = id.trim().toLowerCase();
    if (!/^[0-9a-f]{24}$/.test(cleanId)) {
      return {
        id: cleanId,
        valid: false,
        error: "Invalid MongoDB ObjectId: Must be a 24-character hexadecimal string.",
      };
    }

    // 4 bytes timestamp (8 chars)
    const timestampHex = cleanId.substring(0, 8);
    const timestampSec = parseInt(timestampHex, 16);
    const date = new Date(timestampSec * 1000).toISOString();

    // 5 bytes random (machine + process id, 10 chars)
    const machineId = cleanId.substring(8, 14);
    const processId = parseInt(cleanId.substring(14, 18), 16);

    // 3 bytes counter (6 chars)
    const counter = parseInt(cleanId.substring(18, 24), 16);

    return {
      id: cleanId,
      valid: true,
      timestamp: timestampSec,
      date,
      machineId,
      processId,
      counter,
    };
  }

  static generateObjectIds(count = 1): MongoObjectIdDetail[] {
    const results: MongoObjectIdDetail[] = [];
    const machineAndProc = randomBytes(5).toString("hex");

    for (let i = 0; i < Math.max(1, Math.min(count, 100)); i++) {
      const timestampSec = Math.floor(Date.now() / 1000);
      const timeHex = timestampSec.toString(16).padStart(8, "0");
      objectIdCounter = (objectIdCounter + 1) % 0xffffff;
      const counterHex = objectIdCounter.toString(16).padStart(6, "0");

      const id = `${timeHex}${machineAndProc}${counterHex}`;
      results.push(this.inspectObjectId(id));
    }

    return results;
  }

  // ----------------- cURL to Fetch / Axios Converter -----------------
  static convertCurlToCode(curlCommand: string): CurlParseResult {
    let raw = curlCommand.replace(/\\\r?\n/g, " ").trim();
    if (!raw.startsWith("curl")) raw = `curl ${raw}`;

    let url = "";
    let method = "GET";
    const headers: Record<string, string> = {};
    let data: unknown;

    // Extract URL
    const urlMatch = raw.match(/curl\s+(?:-[A-Za-z0-9-]+\s+)*(?:'([^']+)'|"([^"]+)"|([^\s'"]+))/);
    if (urlMatch) {
      url = urlMatch[1] || urlMatch[2] || urlMatch[3] || "";
    }

    // Extract Method (-X POST)
    const methodMatch = raw.match(/-X\s+([A-Z]+)/i);
    if (methodMatch) {
      method = methodMatch[1].toUpperCase();
    }

    // Extract Headers (-H "Key: Value")
    const headerMatches = raw.matchAll(/-H\s+['"]([^'"]+)['"]/g);
    for (const m of headerMatches) {
      const parts = m[1].split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(":").trim();
        headers[key] = val;
      }
    }

    // Extract Body (-d, --data, --data-raw)
    const dataMatch = raw.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
      if (method === "GET") method = "POST";
      const rawData = dataMatch[1];
      try {
        data = JSON.parse(rawData);
      } catch {
        data = rawData;
      }
    }

    // Generate Axios Code
    const hasData = data !== undefined;
    const dataStr = hasData
      ? typeof data === "object"
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data)
      : "";

    const axiosCode = `import axios from "axios";

const response = await axios({
  method: "${method.toLowerCase()}",
  url: "${url}",
  headers: ${JSON.stringify(headers, null, 4)},${hasData ? `\n  data: ${dataStr},` : ""}
});

console.log(response.data);`;

    // Generate Browser Fetch Code
    const fetchCode = `const response = await fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 4)},${hasData ? `\n  body: ${typeof data === "object" ? "JSON.stringify(" + dataStr + ")" : `"${data}"`},` : ""}
});

const data = await response.json();
console.log(data);`;

    // Generate Node Express Route Handler Code
    const nodeFetchCode = `// Express.js Route Proxy
app.${method.toLowerCase()}("/api/proxy", async (req, res) => {
  try {
    const upstreamRes = await fetch("${url}", {
      method: "${method}",
      headers: ${JSON.stringify(headers, null, 6)},${hasData ? `\n      body: req.body ? JSON.stringify(req.body) : undefined,` : ""}
    });
    const upstreamData = await upstreamRes.json();
    res.status(upstreamRes.status).json(upstreamData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`;

    return {
      url,
      method,
      headers,
      data,
      fetchCode,
      axiosCode,
      nodeFetchCode,
    };
  }

  // ----------------- JSON to Mongoose & TypeScript Schema -----------------
  static jsonToSchema(jsonString: string): SchemaGenerationResult {
    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: any) {
      throw new Error(`Invalid JSON: ${e.message}`);
    }

    const rootName = Array.isArray(parsed) ? "Item" : "Document";
    const sample = Array.isArray(parsed) ? parsed[0] || {} : parsed;

    const tsLines: string[] = [];
    const mongooseLines: string[] = [];

    const inferType = (key: string, val: any, indent = "  "): { ts: string; mongo: string } => {
      if (val === null || val === undefined) {
        return { ts: "any", mongo: "{ type: mongoose.Schema.Types.Mixed }" };
      }

      if (typeof val === "string") {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
          return { ts: "Date", mongo: "{ type: Date }" };
        }
        return { ts: "string", mongo: "{ type: String, trim: true }" };
      }

      if (typeof val === "number") {
        return { ts: "number", mongo: "{ type: Number }" };
      }

      if (typeof val === "boolean") {
        return { ts: "boolean", mongo: "{ type: Boolean, default: false }" };
      }

      if (Array.isArray(val)) {
        if (val.length === 0) {
          return { ts: "any[]", mongo: "[{ type: mongoose.Schema.Types.Mixed }]" };
        }
        const inner = inferType(key, val[0], indent + "  ");
        return { ts: `${inner.ts}[]`, mongo: `[${inner.mongo}]` };
      }

      if (typeof val === "object") {
        const nestedTs: string[] = [];
        const nestedMongo: string[] = [];
        for (const [k, v] of Object.entries(val)) {
          const res = inferType(k, v, indent + "  ");
          nestedTs.push(`${indent}  ${k}: ${res.ts};`);
          nestedMongo.push(`${indent}  ${k}: ${res.mongo},`);
        }
        return {
          ts: `{\n${nestedTs.join("\n")}\n${indent}}`,
          mongo: `{\n${nestedMongo.join("\n")}\n${indent}}`,
        };
      }

      return { ts: "any", mongo: "{ type: mongoose.Schema.Types.Mixed }" };
    };

    tsLines.push(`export interface I${rootName} {`);
    mongooseLines.push(`import mongoose, { Schema, Document } from "mongoose";\n`);
    mongooseLines.push(`const ${rootName}Schema = new Schema<I${rootName}>({`);

    for (const [k, v] of Object.entries(sample)) {
      const res = inferType(k, v, "  ");
      tsLines.push(`  ${k}: ${res.ts};`);
      mongooseLines.push(`  ${k}: ${res.mongo},`);
    }

    tsLines.push("}");
    mongooseLines.push("}, {\n  timestamps: true,\n  versionKey: false,\n});\n");
    mongooseLines.push(`export const ${rootName}Model = mongoose.model<I${rootName}>("${rootName}", ${rootName}Schema);`);

    const sampleValidation = `// Zod Schema Validation Sample
import { z } from "zod";

export const ${rootName}ValidationSchema = z.object({
${Object.keys(sample)
  .map((k) => `  ${k}: z.any(),`)
  .join("\n")}
});`;

    return {
      typescriptInterfaces: tsLines.join("\n"),
      mongooseSchema: mongooseLines.join("\n"),
      sampleValidation,
    };
  }

  // ----------------- Regex Tester -----------------
  static testRegex(pattern: string, flags = "g", testString: string): RegexTestResult {
    try {
      const regex = new RegExp(pattern, flags);
      const matches: RegexTestResult["matches"] = [];

      if (!flags.includes("g")) {
        const single = regex.exec(testString);
        if (single) {
          matches.push({
            match: single[0],
            index: single.index,
            groups: (single.groups as Record<string, string>) || {},
          });
        }
      } else {
        let m: RegExpExecArray | null;
        let count = 0;
        while ((m = regex.exec(testString)) !== null && count < 200) {
          count++;
          matches.push({
            match: m[0],
            index: m.index,
            groups: (m.groups as Record<string, string>) || {},
          });
          if (m.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      }

      return {
        isValid: true,
        matchCount: matches.length,
        matches,
      };
    } catch (e: any) {
      return {
        isValid: false,
        error: e.message,
        matchCount: 0,
        matches: [],
      };
    }
  }
}
