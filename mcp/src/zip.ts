/**
 * A ZIP of a folder's files, in Node alone. The plugin's archives are built
 * wherever the registry is (`pnpm build:registry` writes the site's downloads),
 * and that includes the release matrix's Windows runner, which has no `zip`
 * command. Deflated entries, UTF-8 names, and one fixed timestamp, so the same
 * files always make the same bytes.
 */
import { crc32, deflateRawSync, inflateRawSync } from "node:zlib";

/** 1980-01-01 00:00, the first moment a ZIP's DOS clock has. */
const DOS_TIME = 0;
const DOS_DATE = (0 << 9) | (1 << 5) | 1;
/** Bit 11: the name is UTF-8. */
const UTF8 = 0x0800;

export function zip(files: Readonly<Record<string, string | Buffer>>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [path, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const name = Buffer.from(path, "utf8");
    const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const data = deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(centrals.length / 2, 8);
  end.writeUInt16LE(centrals.length / 2, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** Reads a ZIP back the way an unzipper does, from its central directory: for the tests, and for checking a download. */
export function readZip(archive: Buffer): Record<string, string> {
  const end = archive.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("not a ZIP: no end of central directory");
  const count = archive.readUInt16LE(end + 10);
  let at = archive.readUInt32LE(end + 16);
  const out: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    if (archive.readUInt32LE(at) !== 0x02014b50) throw new Error("not a ZIP: a broken central directory");
    const method = archive.readUInt16LE(at + 10);
    const size = archive.readUInt32LE(at + 20);
    const nameLength = archive.readUInt16LE(at + 28);
    const local = archive.readUInt32LE(at + 42);
    const name = archive.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    const dataAt = local + 30 + archive.readUInt16LE(local + 26) + archive.readUInt16LE(local + 28);
    const data = archive.subarray(dataAt, dataAt + size);
    out[name] = (method === 8 ? inflateRawSync(data) : data).toString("utf8");
    at += 46 + nameLength;
  }
  return out;
}
