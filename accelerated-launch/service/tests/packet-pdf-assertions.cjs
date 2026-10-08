'use strict';
// Test-only reading of actual output bytes with the independently installed Poppler reader.
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

function pdfText(bytes) {
  assert.ok(Buffer.isBuffer(bytes) && bytes.subarray(0, 5).toString() === '%PDF-', 'expected an actual PDF');
  return execFileSync('pdftotext', ['-layout', '-', '-'], {
    input: bytes, encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe']
  }).replace(/\r/g, '').replace(/^\s*Page \d+ of \d+\s*$/gm, '').replace(/\f/g, '\n').trim();
}

function checksum(bytes) {
  let result = 0xffffffff;
  for (const value of bytes) {
    result ^= value;
    for (let bit = 0; bit < 8; bit++) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0);
  }
  return (result ^ 0xffffffff) >>> 0;
}
function zipEntries(bytes) {
  assert.ok(Buffer.isBuffer(bytes), 'expected ZIP bytes');
  const entries = [];
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 8), 0, 'original packet entries are stored without conversion');
    const nameLength = bytes.readUInt16LE(offset + 26), extraLength = bytes.readUInt16LE(offset + 28);
    const size = bytes.readUInt32LE(offset + 18), end = offset + 30 + nameLength + extraLength + size;
    assert.ok(end <= bytes.length, 'ZIP entry is complete');
    const name = bytes.toString('utf8', offset + 30, offset + 30 + nameLength);
    const body = bytes.subarray(offset + 30 + nameLength + extraLength, end);
    assert.equal(body.length, bytes.readUInt32LE(offset + 22), 'uncompressed byte count agrees');
    assert.equal(checksum(body), bytes.readUInt32LE(offset + 14), 'actual entry bytes match their CRC');
    assert.equal(entries.some(entry => entry.name === name), false, 'ZIP entry names are unique');
    entries.push({ name, bytes: body }); offset = end;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50, 'ZIP has a central directory');
  let count = 0;
  while (bytes.readUInt32LE(offset) === 0x02014b50) {
    const length = bytes.readUInt16LE(offset + 28);
    assert.equal(bytes.toString('utf8', offset + 46, offset + 46 + length), entries[count].name, 'directory names agree');
    offset += 46 + length + bytes.readUInt16LE(offset + 30) + bytes.readUInt16LE(offset + 32); count++;
  }
  assert.equal(count, entries.length, 'directory includes every entry');
  assert.equal(bytes.readUInt32LE(offset), 0x06054b50, 'ZIP has its closing record');
  assert.equal(bytes.readUInt16LE(offset + 10), count, 'closing record has the actual entry count');
  return entries;
}
function packetText(file) {
  const bytes = Buffer.isBuffer(file) ? file : file.body;
  assert.ok(Buffer.isBuffer(bytes), 'packet output is binary');
  if (bytes.subarray(0, 5).toString() === '%PDF-') return pdfText(bytes);
  const entries = zipEntries(bytes), correspondence = entries.find(entry => entry.name === '01-correspondence.pdf');
  assert.ok(correspondence, 'ZIP contains printable correspondence');
  return pdfText(correspondence.bytes);
}
function comparableText(text) { return String(text).replace(/\s+/g, ' ').trim(); }
module.exports = { pdfText, packetText, zipEntries, comparableText };
