import { writeFileSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { exec } from "../../shared/helpers/shell/exec.ts";
import type {
  VideoToGifOptions,
  VideoTrimOptions,
  VideoThumbnailOptions,
  AudioConvertOptions,
} from "./utility.types.ts";

export class MediaHelper {
  private static ffmpegChecked = false;
  private static ffmpegFound = false;

  static async isFfmpegAvailable(): Promise<boolean> {
    if (this.ffmpegChecked) return this.ffmpegFound;
    try {
      const res = await exec("ffmpeg -version");
      this.ffmpegFound = res.success;
    } catch {
      this.ffmpegFound = false;
    }
    this.ffmpegChecked = true;
    return this.ffmpegFound;
  }

  private static getTempFile(ext: string): string {
    const id = randomBytes(8).toString("hex");
    return resolve(tmpdir(), `vh_media_${id}.${ext.replace(/^\./, "")}`);
  }

  private static cleanup(...paths: string[]): void {
    for (const p of paths) {
      try {
        if (existsSync(p)) unlinkSync(p);
      } catch {
        // ignore cleanup error
      }
    }
  }

  /**
   * Convert video buffer to animated GIF with custom FPS, scaling, and duration.
   */
  static async videoToGif(
    videoBuffer: Buffer,
    options: VideoToGifOptions = {}
  ): Promise<{ buffer: Buffer; sizeBytes: number }> {
    const available = await this.isFfmpegAvailable();
    if (!available) {
      throw new Error("FFmpeg is not available in system PATH. Please install FFmpeg to process videos.");
    }

    const inputPath = this.getTempFile("mp4");
    const outputPath = this.getTempFile("gif");

    writeFileSync(inputPath, videoBuffer);

    try {
      const fps = options.fps || 12;
      const scale = options.scale || 480;
      const startTime = options.startTime ?? 0;
      const duration = options.duration ? `-t ${options.duration}` : "-t 10";

      // Two-pass palette generation for ultra crisp GIFs
      const cmd = `ffmpeg -y -ss ${startTime} ${duration} -i "${inputPath}" -vf "fps=${fps},scale=${scale}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${outputPath}"`;
      const res = await exec(cmd);

      if (!res.success || !existsSync(outputPath)) {
        throw new Error(`FFmpeg video-to-GIF conversion failed: ${res.stderr || "Unknown error"}`);
      }

      const buffer = readFileSync(outputPath);
      return {
        buffer,
        sizeBytes: buffer.length,
      };
    } finally {
      this.cleanup(inputPath, outputPath);
    }
  }

  /**
   * Extract a high-definition frame/thumbnail at a given timestamp.
   */
  static async extractThumbnail(
    videoBuffer: Buffer,
    options: VideoThumbnailOptions
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const available = await this.isFfmpegAvailable();
    if (!available) {
      throw new Error("FFmpeg is not available in system PATH.");
    }

    const inputPath = this.getTempFile("mp4");
    const format = options.format === "jpeg" ? "jpg" : "png";
    const outputPath = this.getTempFile(format);

    writeFileSync(inputPath, videoBuffer);

    try {
      const timestamp = Math.max(0, options.timestamp || 0);
      const cmd = `ffmpeg -y -ss ${timestamp} -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`;
      const res = await exec(cmd);

      if (!res.success || !existsSync(outputPath)) {
        throw new Error(`Failed to extract video thumbnail: ${res.stderr || "Unknown error"}`);
      }

      const buffer = readFileSync(outputPath);
      return {
        buffer,
        mimeType: format === "jpg" ? "image/jpeg" : "image/png",
      };
    } finally {
      this.cleanup(inputPath, outputPath);
    }
  }

  /**
   * Clip or trim a video segment.
   */
  static async trimVideo(
    videoBuffer: Buffer,
    options: VideoTrimOptions
  ): Promise<{ buffer: Buffer; sizeBytes: number }> {
    const available = await this.isFfmpegAvailable();
    if (!available) {
      throw new Error("FFmpeg is not available in system PATH.");
    }

    const inputPath = this.getTempFile("mp4");
    const outputPath = this.getTempFile("mp4");

    writeFileSync(inputPath, videoBuffer);

    try {
      const start = options.startTime || 0;
      const end = options.endTime || start + 5;
      const duration = Math.max(0.5, end - start);

      const cmd = `ffmpeg -y -ss ${start} -i "${inputPath}" -t ${duration} -c copy "${outputPath}"`;
      const res = await exec(cmd);

      if (!res.success || !existsSync(outputPath)) {
        throw new Error(`Failed to trim video: ${res.stderr || "Unknown error"}`);
      }

      const buffer = readFileSync(outputPath);
      return {
        buffer,
        sizeBytes: buffer.length,
      };
    } finally {
      this.cleanup(inputPath, outputPath);
    }
  }

  /**
   * Extract audio stream from video (e.g. MP4 -> MP3).
   */
  static async extractAudio(
    videoBuffer: Buffer,
    targetFormat: "mp3" | "wav" | "aac" = "mp3"
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const available = await this.isFfmpegAvailable();
    if (!available) {
      throw new Error("FFmpeg is not available in system PATH.");
    }

    const inputPath = this.getTempFile("mp4");
    const outputPath = this.getTempFile(targetFormat);

    writeFileSync(inputPath, videoBuffer);

    try {
      const cmd = `ffmpeg -y -i "${inputPath}" -vn -q:a 2 "${outputPath}"`;
      const res = await exec(cmd);

      if (!res.success || !existsSync(outputPath)) {
        throw new Error(`Failed to extract audio: ${res.stderr || "Unknown error"}`);
      }

      const buffer = readFileSync(outputPath);
      return {
        buffer,
        mimeType: `audio/${targetFormat}`,
      };
    } finally {
      this.cleanup(inputPath, outputPath);
    }
  }

  /**
   * Convert audio between formats (MP3, WAV, AAC, OGG, FLAC, M4A).
   */
  static async convertAudio(
    audioBuffer: Buffer,
    options: AudioConvertOptions
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const available = await this.isFfmpegAvailable();
    if (!available) {
      throw new Error("FFmpeg is not available in system PATH.");
    }

    const inputPath = this.getTempFile("audio");
    const outputPath = this.getTempFile(options.format);

    writeFileSync(inputPath, audioBuffer);

    try {
      const bitrate = options.bitrate ? `-b:a ${options.bitrate}` : "-q:a 2";
      const cmd = `ffmpeg -y -i "${inputPath}" ${bitrate} "${outputPath}"`;
      const res = await exec(cmd);

      if (!res.success || !existsSync(outputPath)) {
        throw new Error(`Failed to convert audio: ${res.stderr || "Unknown error"}`);
      }

      const buffer = readFileSync(outputPath);
      return {
        buffer,
        mimeType: `audio/${options.format}`,
      };
    } finally {
      this.cleanup(inputPath, outputPath);
    }
  }
}
