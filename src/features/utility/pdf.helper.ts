import type { PdfMetadata, TextToPdfOptions } from "./utility.types.ts";
import { ImageHelper } from "./image.helper.ts";

export class PdfHelper {
  /**
   * Assemble multiple images into a multi-page PDF document.
   */
  static async imagesToPdf(
    images: Array<{ buffer: Buffer; name: string }>,
    options: { pageSize?: "A4" | "Letter" | "Fit"; margin?: number } = {}
  ): Promise<Buffer> {
    if (images.length === 0) {
      throw new Error("No images provided for PDF generation");
    }

    const objects: Buffer[] = [];
    const pageObjIds: number[] = [];
    let nextObjId = 3; // 1 is Catalog, 2 is Pages root

    // Page dimensions (72 points per inch)
    // A4: 595.28 x 841.89
    // Letter: 612 x 792
    const defaultWidth = options.pageSize === "Letter" ? 612 : 595;
    const defaultHeight = options.pageSize === "Letter" ? 792 : 842;
    const margin = options.margin ?? 36; // 0.5 inch

    interface PageRecord {
      pageObjId: number;
      contentObjId: number;
      imageObjId: number;
      pageWidth: number;
      pageHeight: number;
      imgWidth: number;
      imgHeight: number;
      drawX: number;
      drawY: number;
      drawW: number;
      drawH: number;
      jpegBuffer: Buffer;
    }

    const records: PageRecord[] = [];

    for (const img of images) {
      // Ensure image is JPEG format for native PDF embedding
      const converted = await ImageHelper.convertImage(img.buffer, {
        format: "jpeg",
        quality: 90,
      });

      const meta = await ImageHelper.getImageMetadata(converted.buffer);
      const imgW = meta.width || 800;
      const imgH = meta.height || 600;

      let pW = defaultWidth;
      let pH = defaultHeight;

      if (options.pageSize === "Fit") {
        pW = imgW + margin * 2;
        pH = imgH + margin * 2;
      }

      // Calculate fitted aspect ratio dimensions
      const availW = pW - margin * 2;
      const availH = pH - margin * 2;
      const scale = Math.min(availW / imgW, availH / imgH);
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = (pW - drawW) / 2;
      const drawY = (pH - drawH) / 2;

      const pageObjId = nextObjId++;
      const contentObjId = nextObjId++;
      const imageObjId = nextObjId++;

      pageObjIds.push(pageObjId);
      records.push({
        pageObjId,
        contentObjId,
        imageObjId,
        pageWidth: pW,
        pageHeight: pH,
        imgWidth: imgW,
        imgHeight: imgH,
        drawX,
        drawY,
        drawW,
        drawH,
        jpegBuffer: converted.buffer,
      });
    }

    // Build PDF content
    const offsets: number[] = [];
    const chunks: Buffer[] = [];

    const append = (str: string | Buffer) => {
      const b = typeof str === "string" ? Buffer.from(str, "latin1") : str;
      chunks.push(b);
    };

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    append(header);

    // Obj 1: Catalog
    offsets[1] = Buffer.concat(chunks).length;
    append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // Obj 2: Pages
    offsets[2] = Buffer.concat(chunks).length;
    const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
    append(
      `2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjIds.length} >>\nendobj\n`
    );

    // Generate page objects, content streams, and image XObjects
    for (const r of records) {
      // Page Object
      offsets[r.pageObjId] = Buffer.concat(chunks).length;
      append(
        `${r.pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${r.pageWidth} ${r.pageHeight}] /Contents ${r.contentObjId} 0 R /Resources << /XObject << /Im1 ${r.imageObjId} 0 R >> >> >>\nendobj\n`
      );

      // Content Stream
      // Transformation matrix: scale and position image: q drawW 0 0 drawH drawX drawY cm /Im1 Do Q
      const streamText = `q\n${r.drawW.toFixed(2)} 0 0 ${r.drawH.toFixed(2)} ${r.drawX.toFixed(2)} ${r.drawY.toFixed(2)} cm\n/Im1 Do\nQ\n`;
      offsets[r.contentObjId] = Buffer.concat(chunks).length;
      append(
        `${r.contentObjId} 0 obj\n<< /Length ${Buffer.byteLength(streamText)} >>\nstream\n${streamText}endstream\nendobj\n`
      );

      // Image XObject
      offsets[r.imageObjId] = Buffer.concat(chunks).length;
      const dict = `<< /Type /XObject /Subtype /Image /Width ${r.imgWidth} /Height ${r.imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${r.jpegBuffer.length} >>\nstream\n`;
      append(`${r.imageObjId} 0 obj\n${dict}`);
      append(r.jpegBuffer);
      append("\nendstream\nendobj\n");
    }

    // Cross-reference table (xref)
    const xrefOffset = Buffer.concat(chunks).length;
    let xref = `xref\n0 ${nextObjId}\n0000000000 65535 f \n`;
    for (let i = 1; i < nextObjId; i++) {
      const off = (offsets[i] || 0).toString().padStart(10, "0");
      xref += `${off} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${nextObjId} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    append(xref);
    append(trailer);

    return Buffer.concat(chunks);
  }

  /**
   * Convert formatted plain text or Markdown into a multi-page PDF document.
   */
  static textToPdf(text: string, options: TextToPdfOptions = {}): Buffer {
    const title = options.title || "VH Document";
    const fontSize = options.fontSize || 10;
    const lineHeight = Math.round(fontSize * (options.lineSpacing || 1.4));
    const margin = options.margin || 54; // 0.75 in
    const pageWidth = 595;
    const pageHeight = 842;

    const printableWidth = pageWidth - margin * 2;
    const printableHeight = pageHeight - margin * 2;
    const maxLinesPerPage = Math.floor((printableHeight - 40) / lineHeight);

    // Escape PDF string
    const escapePdf = (s: string) =>
      s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

    // Word wrap helper
    const rawLines = text.split(/\r?\n/);
    const wrappedLines: string[] = [];
    const maxCharsPerLine = Math.floor(printableWidth / (fontSize * 0.52));

    for (const raw of rawLines) {
      if (raw.length <= maxCharsPerLine) {
        wrappedLines.push(raw);
      } else {
        let current = raw;
        while (current.length > maxCharsPerLine) {
          let breakIdx = current.lastIndexOf(" ", maxCharsPerLine);
          if (breakIdx <= 0) breakIdx = maxCharsPerLine;
          wrappedLines.push(current.substring(0, breakIdx));
          current = current.substring(breakIdx).trim();
        }
        if (current) wrappedLines.push(current);
      }
    }

    // Paginate
    const pages: string[][] = [];
    let curPage: string[] = [];
    for (const line of wrappedLines) {
      if (curPage.length >= maxLinesPerPage) {
        pages.push(curPage);
        curPage = [];
      }
      curPage.push(line);
    }
    if (curPage.length > 0 || pages.length === 0) {
      pages.push(curPage);
    }

    const totalPages = pages.length;
    const chunks: Buffer[] = [];
    const append = (s: string) => chunks.push(Buffer.from(s, "latin1"));
    const offsets: number[] = [];

    append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    const fontObjId = 3;
    const pageObjIds: number[] = [];
    const streamObjIds: number[] = [];
    let nextId = 4;

    for (let i = 0; i < totalPages; i++) {
      pageObjIds.push(nextId++);
      streamObjIds.push(nextId++);
    }

    // 1: Catalog
    offsets[1] = Buffer.concat(chunks).length;
    append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

    // 2: Pages
    offsets[2] = Buffer.concat(chunks).length;
    const kids = pageObjIds.map((id) => `${id} 0 R`).join(" ");
    append(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${totalPages} >>\nendobj\n`);

    // 3: Font (Helvetica)
    offsets[3] = Buffer.concat(chunks).length;
    append(
      "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n"
    );

    for (let i = 0; i < totalPages; i++) {
      const pageLines = pages[i];
      const pageId = pageObjIds[i];
      const streamId = streamObjIds[i];

      // Page
      offsets[pageId] = Buffer.concat(chunks).length;
      append(
        `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontObjId} 0 R >> >> >>\nendobj\n`
      );

      // Build text stream
      let stream = `BT\n/F1 14 Tf\n${margin} ${pageHeight - margin} Td\n(${escapePdf(title)}) Tj\nET\n`;
      stream += `BT\n/F1 9 Tf\n${pageWidth - margin - 60} ${margin / 2} Td\n(Page ${i + 1} of ${totalPages}) Tj\nET\n`;

      let startY = pageHeight - margin - 30;
      stream += `BT\n/F1 ${fontSize} Tf\n${margin} ${startY} Td\n${lineHeight} TL\n`;

      for (let j = 0; j < pageLines.length; j++) {
        const line = escapePdf(pageLines[j]);
        if (j === 0) {
          stream += `(${line}) Tj\n`;
        } else {
          stream += `T* (${line}) Tj\n`;
        }
      }
      stream += "ET\n";

      offsets[streamId] = Buffer.concat(chunks).length;
      append(
        `${streamId} 0 obj\n<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream\nendobj\n`
      );
    }

    // xref
    const xrefOffset = Buffer.concat(chunks).length;
    let xref = `xref\n0 ${nextId}\n0000000000 65535 f \n`;
    for (let i = 1; i < nextId; i++) {
      const off = (offsets[i] || 0).toString().padStart(10, "0");
      xref += `${off} 00000 n \n`;
    }

    const trailer = `trailer\n<< /Size ${nextId} /Root 1 0 R /Info << /Title (${escapePdf(title)}) /Producer (VH Utility) >> >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    append(xref);
    append(trailer);

    return Buffer.concat(chunks);
  }

  /**
   * Inspect basic PDF metadata and page count.
   */
  static inspectPdf(buffer: Buffer): PdfMetadata {
    const text = buffer.toString("binary");
    const versionMatch = text.match(/%PDF-(\d+\.\d+)/);
    const version = versionMatch ? `PDF ${versionMatch[1]}` : "PDF 1.4";

    // Estimate page count
    const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
    const countMatch = text.match(/\/Count\s+(\d+)/);
    let pageCount = 1;

    if (countMatch && parseInt(countMatch[1], 10) > 0) {
      pageCount = parseInt(countMatch[1], 10);
    } else if (pageMatches) {
      pageCount = pageMatches.length;
    }

    const titleMatch = text.match(/\/Title\s*\((.*?)\)/);
    const authorMatch = text.match(/\/Author\s*\((.*?)\)/);
    const producerMatch = text.match(/\/Producer\s*\((.*?)\)/);

    return {
      version,
      pageCount,
      title: titleMatch ? titleMatch[1] : undefined,
      author: authorMatch ? authorMatch[1] : undefined,
      producer: producerMatch ? producerMatch[1] : undefined,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Extract plain text content from standard PDF streams.
   */
  static extractText(buffer: Buffer): string {
    const text = buffer.toString("latin1");
    const extracted: string[] = [];

    // Match text within Tj operators
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let match: RegExpExecArray | null;

    while ((match = tjRegex.exec(text)) !== null) {
      const unescaped = match[1]
        .replace(/\\([\\()])/g, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "");
      if (unescaped.trim()) extracted.push(unescaped);
    }

    // Match text within TJ array operators: [(Part 1) 20 (Part 2)] TJ
    const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(text)) !== null) {
      const items = match[1].match(/\((.*?)\)/g);
      if (items) {
        const line = items.map((i) => i.slice(1, -1)).join("");
        if (line.trim()) extracted.push(line);
      }
    }

    if (extracted.length === 0) {
      // Fallback: extract any ASCII runs
      return "No text streams found in standard format or document is an image/scanned PDF.";
    }

    return extracted.join("\n");
  }
}
