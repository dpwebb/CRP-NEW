'use strict';
// Stored ZIP entries use original reviewed bytes: no document conversion or external service.
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function archive(entries) {
  if (!Array.isArray(entries) || entries.length > 16) throw new Error('Invalid packet archive');
  const chunks = [], central = []; let offset = 0;
  for (const entry of entries) {
    if (!/^(?:documents\/)?[a-zA-Z0-9_. -]+$/.test(entry.name) || entry.name.includes('..')) throw new Error('Unsafe archive entry');
    const name = Buffer.from(entry.name), bytes = Buffer.isBuffer(entry.bytes) ? entry.bytes : Buffer.from(entry.bytes, 'utf8');
    const crc = crc32(bytes), local = Buffer.alloc(30), directory = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(33, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(bytes.length, 18); local.writeUInt32LE(bytes.length, 22); local.writeUInt16LE(name.length, 26);
    directory.writeUInt32LE(0x02014b50); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt16LE(0x800, 8);
    directory.writeUInt16LE(33, 14); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(bytes.length, 20); directory.writeUInt32LE(bytes.length, 24);
    directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(offset, 42);
    chunks.push(local, name, bytes); central.push(directory, name); offset += local.length + name.length + bytes.length;
  }
  const end = Buffer.alloc(22), directorySize = central.reduce((n, bytes) => n + bytes.length, 0);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, ...central, end]);
}
module.exports = { archive };
