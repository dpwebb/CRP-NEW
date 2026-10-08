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

const REGION_DPI = 300;
const MAX_REGION_READINGS = 64;
const REGION_PADDING_PIXELS = 20;
const REGION_BAND_TIME_BUDGET_MS = 45000;

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
function resolveProgram(name, args, deadlineMs) {
  const tried = [];
  for (const candidate of candidatePaths(name)) {
    const remaining = deadlineMs == null ? 30000 : Math.min(30000, deadlineMs - Date.now());
    if (remaining <= 0) break;
    const result = tryRun(candidate, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: remaining });
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

/** Reread narrowly bounded physical glyph regions after the ordinary page reading.
 * Poppler supplies the pixels; Tesseract sees unrestricted text with its existing
 * confidence floor. Padding and a second polarity reading do not change a glyph.
 * Conflicting trusted readings remain unresolved. No vocabulary is supplied. */
// Restrict preprocessing to the supplied physical cell. The modal background decides polarity;
// every foreground component is retained in one tight rectangle, including unknown glyphs.
function physicalRegionVariants(pixels, width, height) {
  const variants = [{ pixels, width, height, left: 0, top: 0, pad: REGION_PADDING_PIXELS,
    polarity: 'ORIGINAL_GRAYSCALE' }, { pixels: Buffer.from(Array.from(pixels, (pixel) => 255 - pixel)),
    width, height, left: 0, top: 0, pad: REGION_PADDING_PIXELS, polarity: 'INVERTED_GRAYSCALE' }];
  const histogram = Array(256).fill(0);
  for (const pixel of pixels) histogram[pixel] += 1;
  const background = histogram.indexOf(Math.max(...histogram));
  variants.physical_features = { background };
  if (histogram[background] < pixels.length * 0.35) return variants;
  let left = 0, top = 0, right = width, bottom = height;
  // A colored tile's gutter is excluded only at the outside perimeter. Interior marks are retained.
  {
    const ownRow = (y) => {
      let count = 0;
      for (let x = 0; x < width; x += 1) {
        const value = pixels[y * width + x];
        if (Math.abs(value - background) <= 12) count += 1;
      }
      return count > width * 0.5;
    };
    while (top < bottom && !ownRow(top)) top += 1;
    while (bottom > top && !ownRow(bottom - 1)) bottom -= 1;
    const ownColumn = (x) => {
      let count = 0;
      for (let y = top; y < bottom; y += 1) {
        const value = pixels[y * width + x];
        if (Math.abs(value - background) <= 12) count += 1;
      }
      return count > (bottom - top) * 0.5;
    };
    while (left < right && !ownColumn(left)) left += 1;
    while (right > left && !ownColumn(right - 1)) right -= 1;
  }
  // A gutter may have a different flat background, but a mark printed in that gutter is
  // still supplied evidence. Examine each excluded strip against its own modal color.
  // Raster edge noise or a one-pixel boundary is not a complete glyph with width and height.
  for (const [sx0, sy0, sx1, sy1] of [[0, 0, width, top], [0, bottom, width, height],
    [0, top, left, bottom], [right, top, width, bottom]]) {
    if (sx1 <= sx0 || sy1 <= sy0) continue;
    const stripHistogram = Array(256).fill(0);
    for (let y = sy0; y < sy1; y += 1) for (let x = sx0; x < sx1; x += 1) stripHistogram[pixels[y * width + x]] += 1;
    const stripBackground = stripHistogram.indexOf(Math.max(...stripHistogram)), marks = new Set();
    for (let y = sy0; y < sy1; y += 1) for (let x = sx0; x < sx1; x += 1) {
      if (Math.abs(pixels[y * width + x] - stripBackground) >= 32) marks.add(y * width + x);
    }
    while (marks.size) {
      const first = marks.values().next().value, pending = [first]; marks.delete(first);
      let area = 0, bx0 = width, by0 = height, bx1 = 0, by1 = 0;
      while (pending.length) {
        const at = pending.pop(), x = at % width, y = Math.floor(at / width);
        area += 1; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x + 1); by1 = Math.max(by1, y + 1);
        for (const next of [x > sx0 ? at - 1 : -1, x + 1 < sx1 ? at + 1 : -1,
          y > sy0 ? at - width : -1, y + 1 < sy1 ? at + width : -1]) if (marks.delete(next)) pending.push(next);
      }
      if (area >= 4 && bx1 - bx0 >= 3 && by1 - by0 >= 3) {
        if (!variants.physical_features.retained_perimeter_ink) variants.physical_features.retained_perimeter_ink = [];
        variants.physical_features.retained_perimeter_ink.push([bx0, by0, bx1, by1]);
        if (sy0 === 0 && sy1 <= top) top = 0;
        if (sy1 === height && sy0 >= bottom) bottom = height;
        if (sx0 === 0 && sx1 <= left) left = 0;
        if (sx1 === width && sx0 >= right) right = width;
      }
    }
  }
  if (right - left < 3 || bottom - top < 3) return variants;
  let minimum = 255, maximum = 0;
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const pixel = pixels[y * width + x];
    minimum = Math.min(minimum, pixel); maximum = Math.max(maximum, pixel);
  }
  const light = maximum - background > background - minimum;
  const contrastRange = light ? maximum - background : background - minimum;
  if (contrastRange < 32) return variants;
  variants.physical_features.foreground_polarity = light ? 'LIGHT' : 'DARK';
  for (const bounds of variants.physical_features.retained_perimeter_ink || []) {
    let oppositePixels = 0;
    for (let y = bounds[1]; y < bounds[3]; y += 1) for (let x = bounds[0]; x < bounds[2]; x += 1) {
      if ((light ? background - pixels[y * width + x] : pixels[y * width + x] - background) >= 32) oppositePixels += 1;
    }
    // These components were independently detected against the gutter's own background.
    // Their surrounding white gutter must not make a dark prefix look like antialiasing.
    if (oppositePixels >= 4) { variants.physical_features.opposite_polarity_ink = bounds; return variants; }
  }
  // An independent mark of the opposite polarity must not vanish in a contrast transform.
  const opposite = new Set();
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const value = pixels[y * width + x];
    if ((light ? background - value : value - background) >= 32) opposite.add(y * width + x);
  }
  while (opposite.size) {
    const first = opposite.values().next().value, pending = [first]; opposite.delete(first);
    let area = 0, independent = 0, bx0 = width, by0 = height, bx1 = 0, by1 = 0;
    while (pending.length) {
      const at = pending.pop(), x = at % width, y = Math.floor(at / width);
      area += 1; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x + 1); by1 = Math.max(by1, y + 1);
      let adjacent = false;
      for (let yy = Math.max(top, y - 2); yy < Math.min(bottom, y + 3); yy += 1) {
        for (let xx = Math.max(left, x - 2); xx < Math.min(right, x + 3); xx += 1) {
          if ((light ? pixels[yy * width + xx] - background : background - pixels[yy * width + xx]) >= 32) adjacent = true;
        }
      }
      if (!adjacent) independent += 1;
      for (const next of [x > left ? at - 1 : -1, x + 1 < right ? at + 1 : -1,
        y > top ? at - width : -1, y + 1 < bottom ? at + width : -1]) {
        if (opposite.delete(next)) pending.push(next);
      }
    }
    if (area >= 4 && independent >= 4 && bx1 - bx0 >= 3 && by1 - by0 >= 3) {
      variants.physical_features.opposite_polarity_ink = [bx0, by0, bx1, by1]; return variants;
    }
  }
  let threshold = null;
  if (background >= 240) {
    const ownHistogram = Array(256).fill(0);
    let total = 0, sum = 0;
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
      const value = pixels[y * width + x]; ownHistogram[value] += 1; total += 1; sum += value;
    }
    let weight = 0, partial = 0, best = -1;
    for (let value = 0; value < 255; value += 1) {
      weight += ownHistogram[value]; partial += value * ownHistogram[value];
      if (!weight || weight === total) continue;
      const difference = partial / weight - (sum - partial) / (total - weight);
      const variance = weight * (total - weight) * difference * difference;
      if (variance > best) { best = variance; threshold = value; }
    }
  }
  const normalized = Buffer.alloc(width * height, 255);
  let fx0 = right, fy0 = bottom, fx1 = left, fy1 = top;
  let ix0 = right, iy0 = bottom, ix1 = left, iy1 = top;
  for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) {
    const pixel = pixels[y * width + x];
    const contrast = light ? (pixel - background) / contrastRange : (background - pixel) / contrastRange;
    const value = threshold == null ? Math.max(0, Math.min(255, Math.round(255 * (1 - contrast))))
      : pixel <= threshold ? 0 : 255;
    normalized[y * width + x] = value;
    // Include faint printed edge pixels rather than bounding only the darkest half of a stroke.
    if (value < 240) { fx0 = Math.min(fx0, x); fy0 = Math.min(fy0, y); fx1 = Math.max(fx1, x + 1); fy1 = Math.max(fy1, y + 1); }
    if (value < 128) { ix0 = Math.min(ix0, x); iy0 = Math.min(iy0, y); ix1 = Math.max(ix1, x + 1); iy1 = Math.max(iy1, y + 1); }
  }
  if (fx1 <= fx0 || fy1 <= fy0) return variants;
  const tightWidth = fx1 - fx0, tightHeight = fy1 - fy0;
  const output = Buffer.alloc(tightWidth * tightHeight);
  for (let y = 0; y < tightHeight; y += 1) normalized.copy(output, y * tightWidth,
    (fy0 + y) * width + fx0, (fy0 + y) * width + fx1);
  variants.push({ pixels: output, width: tightWidth, height: tightHeight, left: fx0, top: fy0, pad: 5,
    polarity: light ? 'LIGHT_FOREGROUND_TIGHT' : 'DARK_FOREGROUND_TIGHT',
    preprocessing: { background, contrast_range: contrastRange, foreground_bounds_pixels: [fx0, fy0, fx1, fy1],
      ink_bounds_pixels: [ix0, iy0, ix1, iy1],
      perimeter_bounds_pixels: [left, top, right, bottom], padding_pixels: 5,
      ...(threshold == null ? {} : { threshold_method: 'OTSU', threshold }) } });
  const normalizedVariant = variants.at(-1);
  if (threshold != null) variants.push({ ...normalizedVariant, psm: 8,
    polarity: 'DARK_FOREGROUND_TIGHT_SINGLE_WORD' });
  // Retain a second, source-pixel margin for a failed tight reading. This changes only
  // the surrounding actual background, never the glyph pixels or allowed vocabulary.
  const mx0 = Math.max(left, fx0 - 2), my0 = Math.max(top, fy0 - 2);
  const mx1 = Math.min(right, fx1 + 2), my1 = Math.min(bottom, fy1 + 2);
  if (mx0 !== fx0 || my0 !== fy0 || mx1 !== fx1 || my1 !== fy1) {
    const marginPixels = Buffer.alloc((mx1 - mx0) * (my1 - my0));
    for (let y = my0; y < my1; y += 1) normalized.copy(marginPixels, (y - my0) * (mx1 - mx0),
      y * width + mx0, y * width + mx1);
    variants.push({ ...normalizedVariant, pixels: marginPixels, width: mx1 - mx0, height: my1 - my0,
      left: mx0, top: my0, fallback: true, polarity: normalizedVariant.polarity + '_SOURCE_MARGIN',
      preprocessing: { ...normalizedVariant.preprocessing, foreground_bounds_pixels: [mx0, my0, mx1, my1], source_margin_pixels: 2 } });
    if (threshold != null) variants.push({ ...variants.at(-1), psm: 8,
      polarity: variants.at(-1).polarity + '_SINGLE_WORD' });
  }
  return variants;
}

function readPdfRegions(file, regions, options = {}) {
  const report = { available: false, regions: [], refusal_reason: null };
  const dpi = REGION_DPI;
  if (!file || !fs.existsSync(file) || !Array.isArray(regions) || !regions.length
      || regions.length > MAX_REGION_READINGS || regions.some((region) =>
        !Number.isInteger(region.page) || region.page < 1 || region.page > MAX_OCR_PAGES
        || ![region.x0, region.y0, region.x1, region.y1].every(Number.isFinite)
        || region.x0 < 0 || region.y0 < 0 || region.x1 <= region.x0 || region.y1 <= region.y0
        || region.x1 - region.x0 > 80 || region.y1 - region.y0 > 30)) {
    report.refusal_reason = 'INVALID_OR_EXCESSIVE_PHYSICAL_OCR_REGIONS'; return report;
  }
  // Same 10 MiB file ceiling as the existing upload route, including standalone callers.
  const crypto = require('node:crypto');
  let sourceHash;
  try {
    if (fs.statSync(file).size > 10 * 1024 * 1024) {
      report.refusal_reason = 'PHYSICAL_OCR_FILE_EXCEEDS_UPLOAD_BUDGET'; return report;
    }
    sourceHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch { report.refusal_reason = 'PHYSICAL_OCR_FILE_UNAVAILABLE'; return report; }
  if (options.separateRaster === true && regions.length > 1) {
    const started = Date.now();
    for (const region of regions) {
      const budget = Math.max(0, REGION_BAND_TIME_BUDGET_MS - (Date.now() - started));
      if (!budget) { report.regions.push({ id: region.id, page: region.page, region: { ...region }, word: null,
        reason: 'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED', variants: [] }); continue; }
      const reading = readPdfRegions(file, [region], { timeBudgetMs: budget });
      if (reading.source_sha256 !== sourceHash) { report.regions = []; report.refusal_reason = reading.refusal_reason
        || 'PHYSICAL_OCR_FILE_CHANGED_DURING_READING'; return report; }
      report.regions.push(...reading.regions);
    }
    report.source_sha256 = sourceHash; report.available = true;
    report.elapsed_ms = Date.now() - started; report.band_time_budget_ms = REGION_BAND_TIME_BUDGET_MS;
    return report;
  }
  // One call covers one nearby own report band; it cannot rasterise an unbounded page span.
  const page = regions[0].page;
  // Arithmetic such as 8205 * .24 may round just below an integer. Snap only that
  // floating-point noise; genuinely fractional boundaries remain outward rounded.
  const pixelFloor = (value) => Math.floor(value * dpi / 72 + 1e-7);
  const pixelCeil = (value) => Math.ceil(value * dpi / 72 - 1e-7);
  const x0 = pixelFloor(Math.min(...regions.map((region) => region.x0)));
  const y0 = pixelFloor(Math.min(...regions.map((region) => region.y0)));
  const x1 = pixelCeil(Math.max(...regions.map((region) => region.x1)));
  const y1 = pixelCeil(Math.max(...regions.map((region) => region.y1)));
  if (regions.some((region) => region.page !== page) || (x1 - x0) * (y1 - y0) > 2000000) {
    report.refusal_reason = 'PHYSICAL_OCR_BAND_EXCEEDS_BUDGET'; return report;
  }
  const startedAt = Date.now();
  const budgetMs = Math.min(REGION_BAND_TIME_BUDGET_MS, options.timeBudgetMs || REGION_BAND_TIME_BUDGET_MS);
  const remainingMs = () => Math.max(0, budgetMs - (Date.now() - startedAt));
  const budgetExhausted = () => {
    report.regions = regions.map((region) => ({ id: region.id, page: region.page, region: { ...region },
      word: null, reason: 'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED', variants: [] }));
    report.available = true; report.source_sha256 = sourceHash;
    report.elapsed_ms = Date.now() - startedAt; report.band_time_budget_ms = REGION_BAND_TIME_BUDGET_MS;
    return report;
  };
  const tesseract = resolveProgram('tesseract', ['--version'], startedAt + budgetMs);
  const pdftoppm = resolveProgram('pdftoppm', ['-v'], startedAt + budgetMs);
  const tessdata = resolveTessdata(tesseract.path);
  if (!remainingMs()) return budgetExhausted();
  if (!tesseract.path || !pdftoppm.path || !tessdata.dir) {
    report.refusal_reason = 'LOCAL_REGION_OCR_DEPENDENCY_UNAVAILABLE'; return report;
  }
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-region-ocr-'));
  try {
    const prefix = path.join(workDir, 'band');
    const raster = tryRun(pdftoppm.path, ['-r', String(dpi), '-singlefile',
      '-f', String(page), '-l', String(page), '-x', String(x0), '-y', String(y0),
      '-W', String(x1 - x0), '-H', String(y1 - y0), file, prefix],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: Math.max(1, remainingMs()) });
    if (!raster.ok || !fs.existsSync(prefix + '.ppm')) {
      if (!remainingMs()) return budgetExhausted();
      report.refusal_reason = 'PHYSICAL_OCR_BAND_NOT_RASTERISED'; return report;
    }
    const bytes = fs.readFileSync(prefix + '.ppm');
    const header = bytes.toString('latin1', 0, 100).match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
    if (!header) { report.refusal_reason = 'INVALID_PHYSICAL_OCR_RASTER'; return report; }
    const width = Number(header[1]), height = Number(header[2]);
    const colors = bytes.subarray(header[0].length);
    if (width !== x1 - x0 || height !== y1 - y0 || colors.length !== width * height * 3) {
      report.refusal_reason = 'PHYSICAL_OCR_RASTER_SIZE_MISMATCH'; return report;
    }
    const pixels = Buffer.alloc(width * height);
    for (let index = 0; index < pixels.length; index += 1) pixels[index] = Math.round(
      (colors[index * 3] * 299 + colors[index * 3 + 1] * 587 + colors[index * 3 + 2] * 114) / 1000);
    for (let index = 0; index < regions.length; index += 1) {
      const region = regions[index];
      if (!remainingMs()) {
        report.regions.push({ id: region.id, page, region: { ...region }, word: null,
          reason: 'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED', variants: [] }); continue;
      }
      const left = pixelFloor(region.x0) - x0;
      const top = pixelFloor(region.y0) - y0;
      const rw = pixelCeil(region.x1) - x0 - left;
      const rh = pixelCeil(region.y1) - y0 - top;
      if (left < 0 || top < 0 || rw < 1 || rh < 1 || left + rw > width || top + rh > height) {
        report.regions.push({ id: region.id, page, word: null, reason: 'REGION_OUTSIDE_RASTER' }); continue;
      }
      const ownPixels = Buffer.alloc(rw * rh);
      for (let y = 0; y < rh; y += 1) pixels.copy(ownPixels, y * rw,
        (top + y) * width + left, (top + y) * width + left + rw);
      const candidates = physicalRegionVariants(ownPixels, rw, rh);
      if (candidates.physical_features?.opposite_polarity_ink || candidates.physical_features?.discarded_perimeter_ink) {
        report.regions.push({ id: region.id, page, region: { ...region }, word: null,
          reason: candidates.physical_features.discarded_perimeter_ink ? 'REGION_HAS_DISCARDED_PERIMETER_INK'
            : 'REGION_HAS_OPPOSITE_POLARITY_INK', physical_features: candidates.physical_features, variants: [] }); continue;
      }
      const paperBackground = candidates.physical_features?.background >= 240;
      const channels = [0, 1, 2].map((channel) => {
        const values = Buffer.alloc(rw * rh), histogram = Array(256).fill(0);
        for (let y = 0; y < rh; y += 1) for (let x = 0; x < rw; x += 1) {
          const value = colors[((top + y) * width + left + x) * 3 + channel];
          values[y * rw + x] = value; histogram[value] += 1;
        }
        return { values, mode: histogram.indexOf(Math.max(...histogram)) };
      });
      // Color is kept only when the supplied cell has a chromatic background. Each channel
      // retains the source pixels; no channel is selected by the recognised text or code meaning.
      if (Math.max(...channels.map((channel) => channel.mode)) - Math.min(...channels.map((channel) => channel.mode)) >= 32) {
        channels.forEach((channel, index) => {
          const name = ['RED', 'GREEN', 'BLUE'][index];
          for (const variant of physicalRegionVariants(channel.values, rw, rh).filter((variant) => variant.preprocessing
            && /^LIGHT_FOREGROUND/.test(variant.polarity))) {
            const colored = { ...variant, polarity: `${name}_${variant.polarity}`,
              preprocessing: { ...variant.preprocessing, source_channel: name } };
            candidates.push(colored);
            if (!variant.psm) candidates.push({ ...colored, psm: 8, polarity: colored.polarity + '_SINGLE_WORD' });
          }
        });
      }
      const variants = [];
      // All primary source candidates precede margin fallback work. No already readable
      // region pays for those extra reads; only the remaining failed own regions do.
      for (const variant of [...candidates.filter((candidate) => !candidate.fallback),
        ...candidates.filter((candidate) => candidate.fallback)]) {
        if (!remainingMs()) break;
        if (variant.fallback && variants.some((reading) => reading.own?.trusted)) continue;
        // The paper's original polarity is the ordinary first reading. Further transformations
        // are fallback work after that own reading fails, not votes against a readable source.
        if (paperBackground && variant.polarity === 'INVERTED_GRAYSCALE') continue;
        if (!paperBackground && !variant.preprocessing) continue;
        const pad = variant.pad, paddedWidth = variant.width + pad * 2, paddedHeight = variant.height + pad * 2;
        const output = Buffer.alloc(paddedWidth * paddedHeight, 255);
        for (let y = 0; y < variant.height; y += 1) variant.pixels.copy(output,
          (y + pad) * paddedWidth + pad, y * variant.width, (y + 1) * variant.width);
        const target = path.join(workDir, `region-${index}-${variant.polarity}.pgm`);
        fs.writeFileSync(target, Buffer.concat([Buffer.from(`P5\n${paddedWidth} ${paddedHeight}\n255\n`), output]));
        const reading = tryRun(tesseract.path, [target, 'stdout', '--tessdata-dir', tessdata.dir,
          '--psm', String(variant.psm || 7), '-l', 'eng', 'tsv'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: Math.max(1, remainingMs()), maxBuffer: 1024 * 1024 });
        const words = reading.ok ? parseTsv(reading.stdout).map((word) => ({
          text: word.text, confidence: word.conf, trusted: word.conf >= TRUSTED_LINE_CONFIDENCE,
          x0: (x0 + left + variant.left + word.left - pad) * 72 / dpi,
          y0: (y0 + top + variant.top + word.top - pad) * 72 / dpi,
          x1: (x0 + left + variant.left + word.left - pad + word.width) * 72 / dpi,
          y1: (y0 + top + variant.top + word.top - pad + word.height) * 72 / dpi
        })) : [];
        // A border or neighboring glyph is not silently stripped from the reading.
        const ink = variant.preprocessing?.ink_bounds_pixels;
        const coversInk = !ink || words.length === 1 && words[0].x0 <= (x0 + left + ink[0] + 2) * 72 / dpi
          && words[0].y0 <= (y0 + top + ink[1] + 2) * 72 / dpi
          && words[0].x1 >= (x0 + left + ink[2] - 2) * 72 / dpi
          && words[0].y1 >= (y0 + top + ink[3] - 2) * 72 / dpi;
        const own = coversInk && words.length === 1 && words[0].x0 >= region.x0 - 0.25
          && words[0].y0 >= region.y0 - 0.25 && words[0].x1 <= region.x1 + 0.25
          && words[0].y1 <= region.y1 + 0.25 ? words[0] : null;
        variants.push({ polarity: variant.polarity, psm: variant.psm || 7, words, own,
          ...(variant.preprocessing ? { preprocessing: variant.preprocessing } : {}) });
        if (paperBackground && variant.polarity === 'ORIGINAL_GRAYSCALE' && own?.trusted) break;
      }
      const trusted = variants.filter((variant) => variant.own && variant.own.trusted);
      const values = new Set(trusted.map((variant) => variant.own.text.toUpperCase()));
      const chosen = values.size === 1 ? trusted.sort((a, b) => b.own.confidence - a.own.confidence)[0] : null;
      report.regions.push({ id: region.id, page, region: { ...region },
        word: chosen ? { ...chosen.own, recovery: { source: 'LOCAL_OCR_REGION', raster_dpi: dpi,
          psm: chosen.psm, polarity: chosen.polarity, confidence_floor: TRUSTED_LINE_CONFIDENCE,
          confidence: chosen.own.confidence, region: { ...region },
          ...(chosen.preprocessing ? { preprocessing: chosen.preprocessing } : {}),
          // The ink enclosure comes from source pixels even if the untransformed paper
          // reading succeeds first. It is independent of the recognizer's word rectangle.
          ...(() => {
            const ink = chosen.preprocessing?.ink_bounds_pixels
              || candidates.find((candidate) => candidate.preprocessing)?.preprocessing.ink_bounds_pixels;
            return ink ? { physical_ink_bounds: { x0: (x0 + left + ink[0]) * 72 / dpi,
              y0: (y0 + top + ink[1]) * 72 / dpi, x1: (x0 + left + ink[2]) * 72 / dpi,
              y1: (y0 + top + ink[3]) * 72 / dpi } } : {};
          })(),
          source_sha256: sourceHash,
          engine_version: oneLine(String(tesseract.stdout).split('\n')[0]) } } : null,
        reason: values.size > 1 ? 'CONFLICTING_TRUSTED_REGION_READINGS' : chosen ? null
          : !remainingMs() ? 'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED' : 'REGION_NOT_READABLE', variants });
    }
    if (crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== sourceHash) {
      report.regions = []; report.refusal_reason = 'PHYSICAL_OCR_FILE_CHANGED_DURING_READING'; return report;
    }
    report.source_sha256 = sourceHash;
    report.elapsed_ms = Date.now() - startedAt;
    report.band_time_budget_ms = REGION_BAND_TIME_BUDGET_MS;
    report.available = true;
    return report;
  } catch {
    report.regions = []; report.refusal_reason = 'PHYSICAL_OCR_READING_FAILED'; return report;
  } finally {
    const resolved = path.resolve(workDir), temporaryRoot = path.resolve(os.tmpdir()) + path.sep;
    if (resolved.startsWith(temporaryRoot) && path.basename(resolved).startsWith('crp-region-ocr-')) {
      fs.rmSync(resolved, { recursive: true, force: true });
    }
  }
}

module.exports = {
  readTextLayer,
  readImage,
  readOsd,
  resolveTessdata,
  resolveProgram,
  readPdfRegions,
  physicalRegionVariants,
  TRUSTED_LINE_CONFIDENCE,
  RASTER_DPI,
  MAX_OCR_PAGES
};
