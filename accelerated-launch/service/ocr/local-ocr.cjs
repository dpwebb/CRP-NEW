'use strict';
/**
 * local-ocr.cjs — the LOCAL text-layer reader for an image-only report.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner authorized local OCR: "Local OCR is authorized" and "Install
 * the smallest necessary local dependency if absent; no paid service or external OCR is authorized."
 *
 * This module is that reader. It adds no parser and no service: it drives two programs that are already
 * installed on this machine and already declared by the shared document model —
 *
 *   • poppler `pdftoppm` rasterises one page of a PDF to a PNG (the same poppler family the CA-NS document
 *     model already calls through `pdfinfo` / `pdftotext`);
 *   • `tesseract` reads that PNG and reports every word with its bounding box and its confidence.
 *
 * Boundaries this module keeps:
 *   • NO NETWORK. Nothing is uploaded, no endpoint is contacted, no model provider is called. The raster and
 *     the text are produced on this machine and the raster is deleted before this function returns.
 *   • NOTHING IS WRITTEN INSIDE THE REPOSITORY. Rasters and intermediate files go to the operating system's
 *     temporary directory and are removed in a `finally` block. Page text is returned in memory only.
 *   • UNAVAILABILITY IS NOT ABSENCE. If the engine, its language data or the rasteriser is missing, this
 *     module returns `available: false` with the EXACT command it tried and the exact failure text. It never
 *     returns an empty page and calls it an empty report.
 *   • A LOW-CONFIDENCE READING IS PRESERVED, NOT DISCARDED AND NOT TRUSTED. Every line carries its mean
 *     confidence and a boolean `trusted` decided by a recorded floor. A caller may read a trusted line as a
 *     value and must treat an untrusted line as UNRESOLVED — the two are never interchanged here.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The recorded confidence floor. A line at or above it is `trusted`; below it the reading is preserved. */
const TRUSTED_LINE_CONFIDENCE = 70;

/** Raster resolution. 150 dpi is ~2x the pinned sample's own 72 dpi native raster and reads it cleanly. */
const RASTER_DPI = 150;

/** Guards, so a pathological file cannot turn into unbounded work. */
const MAX_OCR_PAGES = 40;
const OCR_TIMEOUT_MS = 60000;

const EXE_NAMES = Object.freeze({ tesseract: 'tesseract', pdftoppm: 'pdftoppm', pdfinfo: 'pdfinfo' });

/**
 * Which programs this build will accept, in order. The environment variables exist so a differently
 * provisioned host can be pointed at its own installation without editing this file; nothing is downloaded.
 */
function candidatePaths(name) {
  const env = process.env[`CRP_${name.toUpperCase()}_EXE`];
  const out = [];
  if (env) out.push(env);
  if (name === 'tesseract') {
    if (process.env.LOCALAPPDATA) {
      out.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'Tesseract-OCR', 'tesseract.exe'));
    }
    out.push('C:\\Program Files\\Tesseract-OCR\\tesseract.exe');
    out.push('C:\\Program Files (x86)\\Tesseract-OCR\\tesseract.exe');
  }
  if (name === 'pdftoppm' || name === 'pdfinfo') out.push(`C:\\poppler\\Library\\bin\\${name}.exe`);
  out.push(EXE_NAMES[name]); // last resort: let the operating system search PATH
  return out;
}

function tryRun(file, args, options) {
  try {
    return { ok: true, stdout: execFileSync(file, args, options) };
  } catch (err) {
    const stderr = err && err.stderr ? String(err.stderr) : '';
    const detail = (stderr || (err && err.message) || 'failed').trim().slice(0, 300);
    return { ok: false, error: `${err && err.code ? err.code : 'ERROR'}: ${detail}` };
  }
}

/** Resolve one program, returning the exact path that answered and the commands that were tried. */
function resolveProgram(name, args) {
  const tried = [];
  for (const candidate of candidatePaths(name)) {
    const result = tryRun(candidate, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    tried.push({ candidate, ok: result.ok, error: result.ok ? null : result.error });
    if (result.ok) return { path: candidate, stdout: result.stdout, tried };
  }
  return { path: null, stdout: null, tried };
}

/**
 * Tesseract needs its language data. The recorded default on this host points at a directory that does not
 * exist, so the data directory is resolved explicitly and passed with `--tessdata-dir` rather than by
 * mutating the caller's environment. If no data directory can be found the reason is returned verbatim.
 */
function resolveTessdata(tesseractPath) {
  const candidates = [];
  if (process.env.CRP_TESSDATA_DIR) candidates.push(process.env.CRP_TESSDATA_DIR);
  if (tesseractPath) candidates.push(path.join(path.dirname(tesseractPath), 'tessdata'));
  if (process.env.TESSDATA_PREFIX) candidates.push(process.env.TESSDATA_PREFIX);
  for (const dir of candidates) {
    try {
      if (fs.existsSync(path.join(dir, 'eng.traineddata'))) return { dir, reason: null };
    } catch { /* a candidate that cannot be inspected is simply not used */ }
  }
  return {
    dir: null,
    reason: `no eng.traineddata found in any of: ${candidates.join(', ') || '(no candidate directory)'}`
  };
}

/** PNG dimensions are read from the IHDR chunk: eight bytes at offset 16, big endian. No image library. */
function pngSize(file) {
  const header = Buffer.alloc(24);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, header, 0, 24, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
}

function parseTsv(tsv) {
  const lines = String(tsv).split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split('\t');
  const words = [];
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts.length !== header.length) continue;
    const row = {};
    header.forEach((key, index) => { row[key] = parts[index]; });
    if (!String(row.text).trim()) continue;
    words.push({
      text: row.text,
      conf: Number(row.conf),
      left: Number(row.left),
      top: Number(row.top),
      width: Number(row.width),
      height: Number(row.height),
      line_key: `${row.block_num}:${row.par_num}:${row.line_num}`
    });
  }
  return words;
}

/** Words on one visual line, ordered left to right, with the line's own bounding box. */
function groupLines(words) {
  const groups = new Map();
  for (const word of words) {
    if (!groups.has(word.line_key)) groups.set(word.line_key, []);
    groups.get(word.line_key).push(word);
  }
  const lines = [];
  for (const [, group] of groups) {
    group.sort((a, b) => a.left - b.left);
    const confs = group.map((w) => w.conf).filter((c) => Number.isFinite(c) && c >= 0);
    const mean = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
    /* GAP-INGEST-003: keep each word's own confidence and trust beside the line mean, with its character
       span in the joined line text. A decisive date/amount token is trusted only when ITS words are trusted —
       a high line mean must not conceal an uncertain decisive character. */
    let cursor = 0;
    const wordMeta = group.map((w) => {
      const start = cursor;
      const end = cursor + String(w.text).length;
      cursor = end + 1;
      return { text: w.text, confidence: w.conf, trusted: w.conf >= TRUSTED_LINE_CONFIDENCE, start, end };
    });
    lines.push({
      text: group.map((w) => w.text).join(' '),
      confidence: Math.round(mean * 10) / 10,
      trusted: mean >= TRUSTED_LINE_CONFIDENCE,
      min_confidence: confs.length ? Math.min(...confs) : null,
      x0: Math.min(...group.map((w) => w.left)),
      y0: Math.min(...group.map((w) => w.top)),
      x1: Math.max(...group.map((w) => w.left + w.width)),
      y1: Math.max(...group.map((w) => w.top + w.height)),
      words: wordMeta
    });
  }
  return lines.sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
}

function oneLine(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

/**
 * Read one PDF into a text layer.
 *
 * Returns, always, an object carrying `available` and — when unavailable — `refusal_reason` and the exact
 * commands tried. A caller must treat `available: false` as "this build could not read the file", never as
 * "the file carries no text".
 */
function readTextLayer(file, options) {
  const opts = options || {};
  const maxPages = Number.isInteger(opts.maxPages) ? opts.maxPages : MAX_OCR_PAGES;
  const report = {
    available: false,
    engine: 'tesseract + poppler pdftoppm (local)',
    engine_version: null,
    engine_path: null,
    tessdata_dir: null,
    raster_dpi: RASTER_DPI,
    trusted_confidence_floor: TRUSTED_LINE_CONFIDENCE,
    pages: [],
    refusal_reason: null,
    program_probe: null,
    geometry_source: 'pdftoppm -r <dpi>; points = pixels * 72 / dpi',
    limits: []
  };

  if (!file || !fs.existsSync(file)) {
    report.refusal_reason = 'THE_UPLOADED_FILE_IS_NOT_PRESENT_ON_DISK';
    return report;
  }

  const tesseract = resolveProgram('tesseract', ['--version']);
  const pdftoppm = resolveProgram('pdftoppm', ['-v']);
  report.program_probe = {
    tesseract: { path: tesseract.path, tried: tesseract.tried },
    pdftoppm: { path: pdftoppm.path, tried: pdftoppm.tried }
  };

  if (!tesseract.path) {
    report.refusal_reason = 'NO_LOCAL_OCR_ENGINE_WAS_FOUND_AND_NONE_WAS_INSTALLED_BY_THIS_BUILD';
    report.limits.push('Tesseract was looked for at: ' + tesseract.tried.map((t) => t.candidate).join('; '));
    return report;
  }
  report.engine_path = tesseract.path;
  report.engine_version = oneLine((String(tesseract.stdout || '')).split('\n')[0] || 'unknown');

  const tessdata = resolveTessdata(tesseract.path);
  if (!tessdata.dir) {
    report.refusal_reason = 'THE_LOCAL_OCR_ENGINE_HAS_NO_LANGUAGE_DATA';
    report.limits.push(tessdata.reason);
    return report;
  }
  report.tessdata_dir = tessdata.dir;

  if (!pdftoppm.path) {
    report.refusal_reason = 'NO_LOCAL_PDF_RASTERISER_WAS_FOUND';
    report.limits.push('pdftoppm was looked for at: ' + pdftoppm.tried.map((t) => t.candidate).join('; '));
    return report;
  }

  const info = resolveProgram('pdfinfo', [file]);
  let pageCount = null;
  let pageSize = null;
  if (info.path) {
    const infoLines = String(info.stdout || '').split(/\r?\n/);
    const pagesField = infoLines.find((l) => l.startsWith('Pages:'));
    if (pagesField) pageCount = Number(pagesField.slice(6).trim());
    const sizeField = infoLines.find((l) => l.startsWith('Page size:'));
    if (sizeField) {
      const match = sizeField.slice(10).trim().match(/^([\d.]+)\s+x\s+([\d.]+)/);
      if (match) pageSize = { width_pt: Number(match[1]), height_pt: Number(match[2]) };
    }
  }
  if (!Number.isInteger(pageCount) || pageCount <= 0) {
    report.refusal_reason = 'THE_DOCUMENT_PAGE_COUNT_COULD_NOT_BE_READ';
    return report;
  }
  if (pageCount > maxPages) {
    report.refusal_reason = 'THE_DOCUMENT_EXCEEDS_THE_LOCAL_OCR_PAGE_BUDGET';
    report.limits.push(`${pageCount} pages, budget ${maxPages}`);
    return report;
  }
  report.page_count = pageCount;

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-ocr-'));
  try {
    for (let page = 1; page <= pageCount; page += 1) {
      const prefix = path.join(workDir, `page-${page}`);
      const raster = tryRun(pdftoppm.path, [
        '-r', String(RASTER_DPI), '-gray', '-png', '-f', String(page), '-l', String(page), file, prefix
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: OCR_TIMEOUT_MS });

      // Poppler pads page numbers to the document's page-count width (e.g. 01 for 12 pages).
      const rasterCandidates = [
        `${prefix}-${String(page).padStart(String(pageCount).length, '0')}.png`,
        `${prefix}-${page}.png`, `${prefix}-1.png`
      ];
      const produced = rasterCandidates.find(candidate => fs.existsSync(candidate)) || null;

      if (!raster.ok || !produced) {
        report.refusal_reason = 'THE_DOCUMENT_COULD_NOT_BE_RASTERISED_FOR_LOCAL_OCR';
        report.limits.push(`page ${page}: ${raster.ok ? 'no raster was produced' : raster.error}`);
        return report;
      }

      const size = pngSize(produced) || { width: null, height: null };
      /* Points per pixel. The asked-for DPI is exact by construction; if the raster disagrees, the document's
         own page box decides, so a coordinate is never silently scaled by the wrong factor. */
      let pointsPerPixel = 72 / RASTER_DPI;
      if (pageSize && size.width && Math.abs(size.width - Math.round(pageSize.width_pt * RASTER_DPI / 72)) > 2) {
        pointsPerPixel = pageSize.width_pt / size.width;
        report.geometry_source = 'pdftoppm raster measured against the pdfinfo page box';
      }

      const ocr = tryRun(tesseract.path, [
        produced, 'stdout', '--tessdata-dir', tessdata.dir, '--psm', '6', '-l', opts.language || 'eng', 'tsv'
      ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: OCR_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });

      if (!ocr.ok) {
        report.refusal_reason = 'THE_LOCAL_OCR_ENGINE_FAILED_ON_THIS_DOCUMENT';
        report.limits.push(`page ${page}: ${ocr.error}`);
        return report;
      }

      const words = parseTsv(ocr.stdout).map((word) => ({
        text: word.text,
        confidence: word.conf,
        trusted: word.conf >= TRUSTED_LINE_CONFIDENCE,
        line_key: word.line_key,
        x0: Math.round(word.left * pointsPerPixel * 10) / 10,
        y0: Math.round(word.top * pointsPerPixel * 10) / 10,
        x1: Math.round((word.left + word.width) * pointsPerPixel * 10) / 10,
        y1: Math.round((word.top + word.height) * pointsPerPixel * 10) / 10
      }));

      const evidence = groupLines(parseTsv(ocr.stdout)).map((line) => ({
        text: line.text,
        confidence: line.confidence,
        trusted: line.trusted,
        min_confidence: line.min_confidence,
        words: line.words,
        x0: Math.round(line.x0 * pointsPerPixel * 10) / 10,
        y0: Math.round(line.y0 * pointsPerPixel * 10) / 10,
        x1: Math.round(line.x1 * pointsPerPixel * 10) / 10,
        y1: Math.round(line.y1 * pointsPerPixel * 10) / 10,
        points_per_pixel: Math.round(pointsPerPixel * 100000) / 100000
      }));

      report.pages.push({
        page,
        source: 'LOCAL_OCR',
        raster_pixels: size.width && size.height ? [size.width, size.height] : null,
        line_count: evidence.length,
        trusted_line_count: evidence.filter((line) => line.trusted).length,
        /* The shared document-model shape: `lines` are text, `text` is the page, and the coordinate evidence
           rides beside them under `line_evidence`. `word_evidence` carries the same coordinates one word at a
           time, which is what a COLUMN-laid-out report needs: this presentation prints its account fields in
           five columns, and a line-level box alone cannot say which column a value sits in. */
        lines: evidence.map((line) => line.text),
        text: evidence.map((line) => line.text).join('\n') + '\n',
        chars: evidence.reduce((sum, line) => sum + line.text.length, 0),
        has_native_text: false,
        line_evidence: evidence,
        word_evidence: words
      });
    }
  } finally {
    /* The raster carries the consumer's report. It is removed here, always, and never copied anywhere. */
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }

  report.available = true;
  report.limits.push('Local OCR reads a raster. A character it could not recognise is absent from this layer; it is never inferred.');
  return report;
}

/**
 * B6-INGEST-004 — orientation detection via tesseract OSD. Returns the detected rotation in degrees
 * (0/90/180/270) so the caller can choose a page-segmentation mode that auto-rotates. Bounded: it runs one
 * extra local tesseract pass, never a network call, and never installs a dependency.
 */
function readOsd(file, tesseractPath, tessdataDir, language) {
  try {
    const out = execFileSync(tesseractPath, [
      file, 'stdout', '--tessdata-dir', tessdataDir, '--psm', '0', '-l', language || 'osd'
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    const rotate = /Rotate:\s*(\d+)/.exec(out);
    const orientation = /Orientation in degrees:\s*(-?\d+)/.exec(out);
    return {
      available: true,
      rotate: rotate ? Number(rotate[1]) : 0,
      orientation: orientation ? Number(orientation[1]) : null,
      raw: String(out).slice(0, 160)
    };
  } catch (err) {
    return { available: false, rotate: 0, orientation: null, raw: 'OSD_UNAVAILABLE' };
  }
}

/**
 * Read one IMAGE FILE (PNG/JPEG) directly into a text layer, without a PDF rasteriser. This is the
 * B6-INGEST-003 image-ingestion path: tesseract reads the image in place, so an uploaded scan or photograph
 * reaches the general intake without a PDF conversion. The page index is 1 and coordinates are raw image
 * pixels, so a record's source location is the pixel position in the image the consumer supplied.
 *
 * B6-INGEST-004: a rotated photo is detected with tesseract OSD and re-read with an auto-orienting page
 * segmentation mode, so a 90/180/270-degree phone photo is corrected without an image library.
 */
function readImage(file, options) {
  const opts = options || {};
  const report = {
    available: false,
    engine: 'tesseract (local, direct image)',
    engine_version: null,
    engine_path: null,
    tessdata_dir: null,
    raster_dpi: null,
    trusted_confidence_floor: TRUSTED_LINE_CONFIDENCE,
    pages: [],
    refusal_reason: null,
    program_probe: null,
    orientation: null,
    geometry_source: 'raw image pixels (no PDF page box)',
    limits: []
  };

  if (!file || !fs.existsSync(file)) {
    report.refusal_reason = 'THE_UPLOADED_FILE_IS_NOT_PRESENT_ON_DISK';
    return report;
  }

  const tesseract = resolveProgram('tesseract', ['--version']);
  report.program_probe = { tesseract: { path: tesseract.path, tried: tesseract.tried } };
  if (!tesseract.path) {
    report.refusal_reason = 'NO_LOCAL_OCR_ENGINE_WAS_FOUND_AND_NONE_WAS_INSTALLED_BY_THIS_BUILD';
    report.limits.push('Tesseract was looked for at: ' + tesseract.tried.map((t) => t.candidate).join('; '));
    return report;
  }
  report.engine_path = tesseract.path;
  report.engine_version = oneLine((String(tesseract.stdout || '')).split('\n')[0] || 'unknown');

  const tessdata = resolveTessdata(tesseract.path);
  if (!tessdata.dir) {
    report.refusal_reason = 'THE_LOCAL_OCR_ENGINE_HAS_NO_LANGUAGE_DATA';
    report.limits.push(tessdata.reason);
    return report;
  }
  report.tessdata_dir = tessdata.dir;

  const osd = readOsd(file, tesseract.path, tessdata.dir);
  const psm = (osd.available && osd.rotate !== 0) ? '1' : '6';
  report.orientation = { osd_available: osd.available, rotate: osd.rotate, psm_used: psm };

  const ocr = tryRun(tesseract.path, [
    file, 'stdout', '--tessdata-dir', tessdata.dir, '--psm', psm, '-l', opts.language || 'eng', 'tsv'
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: OCR_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });

  if (!ocr.ok) {
    report.refusal_reason = 'THE_LOCAL_OCR_ENGINE_FAILED_ON_THIS_DOCUMENT';
    report.limits.push(ocr.error);
    return report;
  }

  const parsed = parseTsv(ocr.stdout);
  const words = parsed.map((word) => ({
    text: word.text,
    confidence: word.conf,
    trusted: word.conf >= TRUSTED_LINE_CONFIDENCE,
    line_key: word.line_key,
    x0: word.left,
    y0: word.top,
    x1: word.left + word.width,
    y1: word.top + word.height
  }));
  const evidence = groupLines(parsed).map((line) => ({
    text: line.text,
    confidence: line.confidence,
    trusted: line.trusted,
    min_confidence: line.min_confidence,
    words: line.words,
    x0: line.x0,
    y0: line.y0,
    x1: line.x1,
    y1: line.y1,
    points_per_pixel: 1
  }));

  report.pages.push({
    page: 1,
    source: 'LOCAL_OCR',
    raster_pixels: null,
    line_count: evidence.length,
    trusted_line_count: evidence.filter((line) => line.trusted).length,
    lines: evidence.map((line) => line.text),
    text: evidence.map((line) => line.text).join('\n') + '\n',
    chars: evidence.reduce((sum, line) => sum + line.text.length, 0),
    has_native_text: false,
    line_evidence: evidence,
    word_evidence: words
  });

  report.available = true;
  report.limits.push('Local OCR reads an image in place. A character it could not recognise is absent from this layer; it is never inferred.');
  return report;
}

module.exports = {
  readTextLayer,
  readImage,
  readOsd,
  resolveTessdata,
  resolveProgram,
  TRUSTED_LINE_CONFIDENCE,
  RASTER_DPI,
  MAX_OCR_PAGES
};
