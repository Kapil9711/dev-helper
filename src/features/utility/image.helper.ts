import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type {
  ImageConvertOptions,
  ImageFormat,
  ImageMetadata,
  FaviconBundleResult,
  FaviconItem,
} from "./utility.types.ts";

let sharpInstance: any = null;

export function getSharp(): any {
  if (sharpInstance) return sharpInstance;
  const candidates = [
    "sharp",
    resolve(__dirname, "../../../dashboard/node_modules/sharp"),
    resolve(process.cwd(), "dashboard/node_modules/sharp"),
    resolve(process.cwd(), "node_modules/sharp"),
  ];

  for (const c of candidates) {
    try {
      sharpInstance = require(c);
      if (sharpInstance && typeof sharpInstance === "function") {
        return sharpInstance;
      }
    } catch {
      // try next
    }
  }

  throw new Error(
    "Sharp image processing library is not found. Please ensure dashboard dependencies are installed."
  );
}

export function isSharpAvailable(): boolean {
  try {
    getSharp();
    return true;
  } catch {
    return false;
  }
}

export class ImageHelper {
  static async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const sharp = getSharp();
    const meta = await sharp(buffer).metadata();
    return {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      space: meta.space,
      channels: meta.channels,
      depth: meta.depth,
      density: meta.density,
      isProgressive: meta.isProgressive,
      hasProfile: meta.hasProfile,
      hasAlpha: meta.hasAlpha,
      sizeBytes: buffer.length,
    };
  }

  static async convertImage(
    buffer: Buffer,
    options: ImageConvertOptions
  ): Promise<{ buffer: Buffer; format: string; sizeBytes: number; mimeType: string }> {
    const sharp = getSharp();
    let pipeline = sharp(buffer);

    // Apply Filters if requested
    if (options.filter) {
      const f = options.filter;
      if (f.grayscale) pipeline = pipeline.grayscale();
      if (f.blur && f.blur > 0) pipeline = pipeline.blur(Math.min(f.blur, 100));
      if (f.sharpen) pipeline = pipeline.sharpen();
      if (f.rotate) pipeline = pipeline.rotate(f.rotate);
      if (f.flip) pipeline = pipeline.flip();
      if (f.flop) pipeline = pipeline.flop();

      if (f.brightness !== undefined || f.contrast !== undefined) {
        pipeline = pipeline.modulate({
          brightness: f.brightness ?? 1,
          saturation: f.contrast ?? 1,
        });
      }
    }

    // Apply Resize & Crop
    if (options.crop && options.crop.width > 0 && options.crop.height > 0) {
      pipeline = pipeline.extract({
        left: Math.round(options.crop.left),
        top: Math.round(options.crop.top),
        width: Math.round(options.crop.width),
        height: Math.round(options.crop.height),
      });
    } else if (options.width || options.height) {
      pipeline = pipeline.resize({
        width: options.width ? Math.round(options.width) : undefined,
        height: options.height ? Math.round(options.height) : undefined,
        fit: options.fit || "cover",
      });
    }

    const format = options.format.toLowerCase() as ImageFormat;
    const quality = options.quality ? Math.max(1, Math.min(100, Math.round(options.quality))) : 80;

    let mimeType = `image/${format}`;
    let outputBuffer: Buffer;

    switch (format) {
      case "jpeg":
      case "jpg":
        pipeline = pipeline.jpeg({ quality, mozjpeg: true });
        mimeType = "image/jpeg";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "png":
        pipeline = pipeline.png({
          compressionLevel: Math.round(((100 - quality) / 100) * 9),
          palette: quality < 70,
        });
        mimeType = "image/png";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "webp":
        pipeline = pipeline.webp({ quality, lossless: !!options.lossless });
        mimeType = "image/webp";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "avif":
        pipeline = pipeline.avif({ quality, lossless: !!options.lossless });
        mimeType = "image/avif";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "gif":
        pipeline = pipeline.gif();
        mimeType = "image/gif";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "tiff":
        pipeline = pipeline.tiff({ quality });
        mimeType = "image/tiff";
        outputBuffer = await pipeline.toBuffer();
        break;

      case "ico":
        // Generate high quality 32x32 PNG inside ICO wrapper
        const icoPng = await pipeline.resize(32, 32, { fit: "contain" }).png().toBuffer();
        outputBuffer = this.wrapPngInIco(icoPng);
        mimeType = "image/x-icon";
        break;

      default:
        outputBuffer = await pipeline.toBuffer();
    }

    return {
      buffer: outputBuffer,
      format,
      sizeBytes: outputBuffer.length,
      mimeType,
    };
  }

  static async generateFaviconBundle(buffer: Buffer): Promise<FaviconBundleResult> {
    const sharp = getSharp();
    const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];
    const favicons: FaviconItem[] = [];

    for (const size of sizes) {
      const resized = await sharp(buffer)
        .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      const name = size === 180 ? "apple-touch-icon.png" : `favicon-${size}x${size}.png`;
      favicons.push({
        name,
        size,
        dataUrl: `data:image/png;base64,${resized.toString("base64")}`,
        sizeBytes: resized.length,
      });
    }

    // 32x32 favicon.ico
    const ico32 = await sharp(buffer).resize(32, 32, { fit: "contain" }).png().toBuffer();
    const icoBuffer = this.wrapPngInIco(ico32);
    const icoDataUrl = `data:image/x-icon;base64,${icoBuffer.toString("base64")}`;

    const htmlSnippet = `<!-- Favicon Suite Generated by VH Utility -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />`;

    return {
      favicons,
      icoDataUrl,
      htmlSnippet,
    };
  }

  private static wrapPngInIco(pngBuffer: Buffer): Buffer {
    // ICO header: 6 bytes
    // Reserved (2 bytes) = 0
    // Type (2 bytes) = 1 (1 for icon)
    // Count (2 bytes) = 1
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    // Directory entry: 16 bytes
    const entry = Buffer.alloc(16);
    entry.writeUInt8(32, 0); // width (0 = 256, or 32)
    entry.writeUInt8(32, 1); // height
    entry.writeUInt8(0, 2);  // color palette
    entry.writeUInt8(0, 3);  // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngBuffer.length, 8); // size of image data
    entry.writeUInt32LE(6 + 16, 12); // offset of image data

    return Buffer.concat([header, entry, pngBuffer]);
  }
}
