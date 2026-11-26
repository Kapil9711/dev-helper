export type UtilityTab =
  | "overview"
  | "images"
  | "pdf"
  | "media"
  | "dev"
  | "crypto"
  | "settings";

export interface UtilityServerInfo {
  mode: "utility";
  name: string;
  version: string;
  port: number;
  ffmpegAvailable: boolean;
  sharpAvailable: boolean;
}

// ----------------- Image Studio Types -----------------
export type ImageFormat =
  | "png"
  | "jpeg"
  | "jpg"
  | "webp"
  | "avif"
  | "gif"
  | "tiff"
  | "svg"
  | "ico";

export interface ImageConvertOptions {
  format: ImageFormat;
  quality?: number; // 1-100
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill" | "inside" | "outside";
  crop?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  filter?: {
    grayscale?: boolean;
    blur?: number; // sigma
    sharpen?: boolean;
    brightness?: number; // multiplier e.g. 1.2
    contrast?: number; // multiplier e.g. 1.2
    rotate?: number; // degrees e.g. 90, 180, 270
    flip?: boolean;
    flop?: boolean;
  };
  lossless?: boolean;
}

export interface ImageMetadata {
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  isProgressive?: boolean;
  hasProfile?: boolean;
  hasAlpha?: boolean;
  sizeBytes: number;
}

export interface FaviconItem {
  name: string;
  size: number;
  dataUrl: string;
  sizeBytes: number;
}

export interface FaviconBundleResult {
  favicons: FaviconItem[];
  icoDataUrl: string;
  htmlSnippet: string;
}

// ----------------- PDF Suite Types -----------------
export interface ImageToPdfItem {
  name: string;
  dataUrl: string; // base64
}

export interface ImagesToPdfOptions {
  pageSize?: "A4" | "Letter" | "Fit";
  orientation?: "portrait" | "landscape";
  margin?: number;
}

export interface TextToPdfOptions {
  title?: string;
  fontSize?: number;
  lineSpacing?: number;
  margin?: number;
}

export interface PdfMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  producer?: string;
  creationDate?: string;
  version?: string;
  sizeBytes: number;
}

// ----------------- Media Studio Types -----------------
export interface VideoToGifOptions {
  fps?: number; // 10, 15, 24
  scale?: number; // e.g. 320, 480, 640
  speed?: number; // 0.5x, 1x, 2x
  startTime?: number; // seconds
  duration?: number; // seconds
}

export interface VideoTrimOptions {
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface VideoThumbnailOptions {
  timestamp: number; // seconds
  format?: "png" | "jpeg";
}

export interface AudioConvertOptions {
  format: "mp3" | "wav" | "aac" | "ogg" | "flac" | "m4a";
  bitrate?: string; // "128k", "192k", "320k"
}

// ----------------- MERN Dev Tools Types -----------------
export interface JwtDecodeResult {
  valid: boolean;
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  issuedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  signatureVerified?: boolean;
  error?: string;
}

export interface JwtSignOptions {
  header?: Record<string, unknown>;
  payload: Record<string, unknown>;
  secret: string;
  expiresInSeconds?: number;
}

export interface MongoObjectIdDetail {
  id: string;
  valid: boolean;
  timestamp?: number;
  date?: string;
  machineId?: string;
  processId?: number;
  counter?: number;
  error?: string;
}

export interface CurlParseResult {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: unknown;
  fetchCode: string;
  axiosCode: string;
  nodeFetchCode: string;
}

export interface SchemaGenerationResult {
  typescriptInterfaces: string;
  mongooseSchema: string;
  sampleValidation: string;
}

export interface RegexTestResult {
  isValid: boolean;
  error?: string;
  matchCount: number;
  matches: Array<{
    match: string;
    index: number;
    groups: Record<string, string>;
  }>;
}

// ----------------- Crypto & Hashes Types -----------------
export interface HashResult {
  algorithm: string;
  inputLength: number;
  hash: string;
}

export interface BcryptResult {
  hash: string;
  saltRounds: number;
}

export interface BcryptVerifyResult {
  match: boolean;
  computedDurationMs: number;
}
