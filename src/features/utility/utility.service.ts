import { ImageHelper, isSharpAvailable } from "./image.helper.ts";
import { PdfHelper } from "./pdf.helper.ts";
import { MediaHelper } from "./media.helper.ts";
import { MernHelper } from "./mern.helper.ts";
import { CryptoHelper } from "./crypto.helper.ts";
import type {
  ImageConvertOptions,
  ImageMetadata,
  FaviconBundleResult,
  TextToPdfOptions,
  PdfMetadata,
  VideoToGifOptions,
  VideoTrimOptions,
  VideoThumbnailOptions,
  AudioConvertOptions,
  JwtDecodeResult,
  JwtSignOptions,
  MongoObjectIdDetail,
  CurlParseResult,
  SchemaGenerationResult,
  RegexTestResult,
  HashResult,
  BcryptResult,
  BcryptVerifyResult,
} from "./utility.types.ts";

export class UtilityService {
  // Image
  async convertImage(buffer: Buffer, options: ImageConvertOptions) {
    return ImageHelper.convertImage(buffer, options);
  }

  async getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    return ImageHelper.getImageMetadata(buffer);
  }

  async generateFaviconBundle(buffer: Buffer): Promise<FaviconBundleResult> {
    return ImageHelper.generateFaviconBundle(buffer);
  }

  // PDF
  async imagesToPdf(
    images: Array<{ buffer: Buffer; name: string }>,
    options?: { pageSize?: "A4" | "Letter" | "Fit"; margin?: number }
  ): Promise<Buffer> {
    return PdfHelper.imagesToPdf(images, options);
  }

  textToPdf(text: string, options?: TextToPdfOptions): Buffer {
    return PdfHelper.textToPdf(text, options);
  }

  inspectPdf(buffer: Buffer): PdfMetadata {
    return PdfHelper.inspectPdf(buffer);
  }

  extractPdfText(buffer: Buffer): string {
    return PdfHelper.extractText(buffer);
  }

  // Media (Video / Audio)
  async videoToGif(videoBuffer: Buffer, options?: VideoToGifOptions) {
    return MediaHelper.videoToGif(videoBuffer, options);
  }

  async extractVideoThumbnail(videoBuffer: Buffer, options: VideoThumbnailOptions) {
    return MediaHelper.extractThumbnail(videoBuffer, options);
  }

  async trimVideo(videoBuffer: Buffer, options: VideoTrimOptions) {
    return MediaHelper.trimVideo(videoBuffer, options);
  }

  async extractAudio(videoBuffer: Buffer, format?: "mp3" | "wav" | "aac") {
    return MediaHelper.extractAudio(videoBuffer, format);
  }

  async convertAudio(audioBuffer: Buffer, options: AudioConvertOptions) {
    return MediaHelper.convertAudio(audioBuffer, options);
  }

  async isFfmpegAvailable(): Promise<boolean> {
    return MediaHelper.isFfmpegAvailable();
  }

  isSharpAvailable(): boolean {
    return isSharpAvailable();
  }

  // MERN Tools
  decodeJwt(token: string, secret?: string): JwtDecodeResult {
    return MernHelper.decodeJwt(token, secret);
  }

  signJwt(options: JwtSignOptions): string {
    return MernHelper.signJwt(options);
  }

  inspectObjectId(id: string): MongoObjectIdDetail {
    return MernHelper.inspectObjectId(id);
  }

  generateObjectIds(count?: number): MongoObjectIdDetail[] {
    return MernHelper.generateObjectIds(count);
  }

  convertCurlToCode(curlCommand: string): CurlParseResult {
    return MernHelper.convertCurlToCode(curlCommand);
  }

  jsonToSchema(jsonString: string): SchemaGenerationResult {
    return MernHelper.jsonToSchema(jsonString);
  }

  testRegex(pattern: string, flags: string, testString: string): RegexTestResult {
    return MernHelper.testRegex(pattern, flags, testString);
  }

  // Crypto & Security
  hashString(input: string, algorithm: string, key?: string): HashResult {
    return CryptoHelper.hashString(input, algorithm, key);
  }

  generateUuid(): string {
    return CryptoHelper.generateUuid();
  }

  generateNanoId(size?: number): string {
    return CryptoHelper.generateNanoId(size);
  }

  bcryptHash(password: string, rounds?: number): BcryptResult {
    return CryptoHelper.bcryptHash(password, rounds);
  }

  bcryptVerify(password: string, hash: string): BcryptVerifyResult {
    return CryptoHelper.bcryptVerify(password, hash);
  }

  base64Encode(input: string): string {
    return CryptoHelper.base64Encode(input);
  }

  base64Decode(input: string): string {
    return CryptoHelper.base64Decode(input);
  }

  urlEncode(input: string): string {
    return CryptoHelper.urlEncode(input);
  }

  urlDecode(input: string): string {
    return CryptoHelper.urlDecode(input);
  }
}

export const utilityService = new UtilityService();
