import { open } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createInflateRaw } from 'node:zlib';
import type { Readable } from 'node:stream';

/**
 * Lectura en streaming de una entrada de un ZIP (sin descomprimir a disco, sin dependencias). Soporta "stored" y
 * "deflate" y ZIP no-ZIP64 (< 4 GiB por entrada). Suficiente para ficheros oficiales de un único CSV (Traficom).
 */
export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

export async function listZipEntries(path: string): Promise<ZipEntry[]> {
  const fh = await open(path, 'r');
  try {
    const { size } = await fh.stat();
    const tailLen = Math.min(size, 65_557);
    const tail = Buffer.alloc(tailLen);
    await fh.read(tail, 0, tailLen, size - tailLen);
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error('not a ZIP file (no end-of-central-directory record)');
    const count = tail.readUInt16LE(eocd + 10);
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    if (cdOffset === 0xffffffff) throw new Error('ZIP64 not supported');
    const cd = Buffer.alloc(cdSize);
    await fh.read(cd, 0, cdSize, cdOffset);
    const entries: ZipEntry[] = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt central directory');
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      entries.push({
        method: cd.readUInt16LE(p + 10),
        compressedSize: cd.readUInt32LE(p + 20),
        uncompressedSize: cd.readUInt32LE(p + 24),
        localHeaderOffset: cd.readUInt32LE(p + 42),
        name: cd.subarray(p + 46, p + 46 + nameLen).toString('utf8'),
      });
      p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
  } finally {
    await fh.close();
  }
}

export async function openZipEntry(path: string, entry: ZipEntry): Promise<Readable> {
  const fh = await open(path, 'r');
  const header = Buffer.alloc(30);
  await fh.read(header, 0, 30, entry.localHeaderOffset);
  await fh.close();
  if (header.readUInt32LE(0) !== 0x04034b50) throw new Error('corrupt local file header');
  const start = entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const raw = createReadStream(path, { start, end: start + entry.compressedSize - 1 });
  if (entry.method === 0) return raw;
  if (entry.method === 8) return raw.pipe(createInflateRaw());
  throw new Error(`unsupported ZIP compression method ${entry.method}`);
}
