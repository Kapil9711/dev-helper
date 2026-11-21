import { crc32, deflateRawSync } from "node:zlib";

export interface ZipEntry {
  name: string;
  data: Buffer;
  date?: Date;
}

/**
 * Lightweight, zero-dependency ZIP archive generator built with standard Node.js APIs.
 */
export function createZipArchive(entries: ZipEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileNameBuffer = Buffer.from(entry.name, "utf-8");
    const uncompressedData = entry.data;
    const fileCrc = crc32(uncompressedData);

    // Deflate
    const compressedData = deflateRawSync(uncompressedData);
    const useCompression = compressedData.length < uncompressedData.length;
    const finalData = useCompression ? compressedData : uncompressedData;
    const method = useCompression ? 8 : 0; // 8 = Deflate, 0 = Store

    const d = entry.date || new Date();
    const dosTime =
      ((d.getHours() & 0x1f) << 11) |
      ((d.getMinutes() & 0x3f) << 5) |
      ((Math.floor(d.getSeconds() / 2)) & 0x1f);
    const dosDate =
      (((d.getFullYear() - 1980) & 0x7f) << 9) |
      (((d.getMonth() + 1) & 0x0f) << 5) |
      (d.getDate() & 0x1f);

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + fileNameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // general purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(method, 8); // compression method
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14); // CRC32
    localHeader.writeUInt32LE(finalData.length, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedData.length, 22); // uncompressed size
    localHeader.writeUInt16LE(fileNameBuffer.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length
    fileNameBuffer.copy(localHeader, 30);

    localHeaders.push(localHeader, finalData);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + fileNameBuffer.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(fileCrc, 16);
    centralHeader.writeUInt32LE(finalData.length, 20);
    centralHeader.writeUInt32LE(uncompressedData.length, 24);
    centralHeader.writeUInt16LE(fileNameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra field length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start
    centralHeader.writeUInt16LE(0, 36); // internal file attrs
    centralHeader.writeUInt32LE(0, 38); // external file attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
    fileNameBuffer.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + finalData.length;
  }

  const centralDirectoryOffset = offset;
  const centralDirectoryBuffer = Buffer.concat(centralHeaders);
  const centralDirectorySize = centralDirectoryBuffer.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central directory
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirectorySize, 12); // size of central directory
  eocd.writeUInt32LE(centralDirectoryOffset, 16); // offset of central directory
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, centralDirectoryBuffer, eocd]);
}
