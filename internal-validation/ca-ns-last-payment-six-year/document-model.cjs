'use strict';
/**
 * document-model.cjs — the document model the contract and the locators read.
 *
 * PHASE5-001I-A. Two providers produce the same model shape:
 *
 *   - `buildPdfDocumentModel(path)` reads a real PDF with poppler's `pdfinfo` and `pdftotext -layout`,
 *     exactly the named extraction method PROD-003's register records;
 *   - `makeSyntheticModel({...})` builds a model from explicit lines for tests. A synthetic model is
 *     labelled synthetic, and the unit's production entry point refuses it.
 *
 * The model keeps page text in memory only. It records document metadata that cannot identify a consumer
 * (page count, page geometry, encryption flag, producer, creator). It never reads or records Title, Author,
 * Subject or Keywords, and it never writes page text anywhere.
 */

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { SYNTHETIC_MARKERS } = require('./constants.cjs');
const { PR_01_SPECIMEN, pointerFor } = require('./runtime-config.cjs');

const PDFINFO = 'pdfinfo';
const PDFTOTEXT = 'pdftotext';
const PDFIMAGES = 'pdfimages';

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

/**
 * The pinned PR-01 presentation pointer. It is the recorded constant (digest + identity) plus a configured
 * on-disk path. The historical PROD-003 register is NOT read at runtime, and no checkout path is hardcoded:
 * the specimen path comes from CRP_CA_EQUIFAX_SPECIMEN and is only needed to re-read the original bytes.
 */
function readPinnedPresentationPointer() {
  return pointerFor(PR_01_SPECIMEN, 'CRP_CA_EQUIFAX_SPECIMEN');
}

function infoField(infoText, label) {
  const line = infoText.split('\n').find((l) => l.startsWith(label));
  return line ? line.slice(label.length).trim() : null;
}

function pageText(file, page) {
  return execFileSync(PDFTOTEXT, ['-f', String(page), '-l', String(page), '-layout', file, '-'], {
    timeout: 30000, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore']
  });
}

/* OWNER-ACCEPT-009 (geometry): a positional native-text pass. `pdftotext -bbox` reports every word with its
   bounding box (top-left origin, points), preserving page, text and position without removing the existing
   `-layout` reading path. */
function pageWords(file, page) {
  let xml;
  try {
    xml = execFileSync(PDFTOTEXT, ['-f', String(page), '-l', String(page), '-bbox', file, '-'], {
      timeout: 30000, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch (err) {
    return { available: false, words: [] };
  }
  const words = [];
  const re = /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g;
  let m;
  while ((m = re.exec(xml))) {
    words.push({ text: m[5], x0: Number(m[1]), y0: Number(m[2]), x1: Number(m[3]), y1: Number(m[4]) });
  }
  return { available: true, words };
}

function scanForSyntheticMarkers(text) {
  const upper = text.toUpperCase();
  return SYNTHETIC_MARKERS.filter((m) => upper.includes(m));
}

/* OWNER-ACCEPT-009 (GAP-INGEST-008): detect embedded image XObjects per page. A page that carries native text
   AND an image region (an account/table body pdftotext cannot read) is a MIXED page, not a fully read one, even
   when its native character count is substantial. This is a structural signal (pdfimages -list), not a
   character-count heuristic, so a short-but-complete page is not misread and a long page with an unread region
   is not skipped. */
function pageImages(file) {
  let list;
  try {
    list = execFileSync(PDFIMAGES, ['-list', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return { available: false, by_page: {} };
  }
  const by_page = {};
  for (const line of list.split(/\r?\n/)) {
    if (!/image\b/i.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    if (cols.length < 14) continue;
    const page = Number(cols[0]);
    if (!Number.isInteger(page)) continue;
    const entry = {
      width: Number(cols[3]),
      height: Number(cols[4]),
      color: cols[5],
      bpc: Number(cols[7]),
      enc: cols[8],
      x_ppi: Number(cols[12]),
      y_ppi: Number(cols[13])
    };
    (by_page[page] = by_page[page] || []).push(entry);
  }
  return { available: true, by_page };
}

function parsePageSize(infoText) {
  const raw = infoField(infoText, 'Page size:');
  if (!raw) return { width_pt: null, height_pt: null, label: null, raw: null };
  const match = raw.match(/^([\d.]+)\s+x\s+([\d.]+)\s+pts(?:\s+\((.*)\))?$/);
  return match
    ? { width_pt: Number(match[1]), height_pt: Number(match[2]), label: match[3] || null, raw }
    : { width_pt: null, height_pt: null, label: null, raw };
}

/**
 * Read a real PDF. Read failures are recorded as read errors, never as an empty document.
 *
 * `options.readWhenEncryptionPermitsCopy` — DEFAULT FALSE, and the default is the behaviour every earlier order
 * measured. When it is false an encrypted PDF is not read at all, exactly as before, and the model comes back
 * with no pages.
 *
 * WHY THE OPTION EXISTS. One real consumer presentation on this machine (the TransUnion Canada consumer
 * disclosure) is a PDF encrypted with an OWNER password whose own permission flags allow printing and copying.
 * Poppler reads its text layer; the document itself says the consumer may copy it. Refusing to read such a
 * document would refuse a real consumer's real report for a container property that does not protect it, so the
 * service asks for the reading explicitly and the model RECORDS what it found:
 *
 *   • `encryption` — the parsed permission flags, verbatim (`raw`), and nothing inferred from them.
 *   • `text_extraction_permitted` — true only when the document's own flags permit copying. A document that
 *     withholds copying is still never read, whatever option was passed.
 *
 * A presentation contract decides what to do with that; this function only measures it. The DEFAULT is
 * unchanged, so the PR-01 gate's `NOT_ENCRYPTED` refusal is exactly the refusal it always was.
 */
function parseEncryption(infoText) {
  const raw = infoField(infoText, 'Encrypted:') || 'no';
  const flag = (name) => {
    const match = new RegExp(`${name}:\\s*(yes|no)`, 'i').exec(raw);
    return match ? match[1].toLowerCase() === 'yes' : null;
  };
  return {
    raw,
    encrypted: /^yes/i.test(raw),
    print_allowed: flag('print'),
    copy_allowed: flag('copy'),
    change_allowed: flag('change'),
    add_notes_allowed: flag('addNotes'),
    algorithm: (/\balgorithm:([A-Za-z0-9]+)/i.exec(raw) || [])[1] || null
  };
}

/** Read a real PDF. Read failures are recorded as read errors, never as an empty document. */
function buildPdfDocumentModel(file, options) {
  const opts = options || {};
  const model = {
    kind: 'PDF', synthetic: false, synthetic_label: null, path: file, sha256: null, bytes: null,
    encrypted: null, page_count: null, page_size: null, producer: null, creator: null,
    text_extraction_tool: 'pdftotext -f <page> -l <page> -layout <file> - (poppler)',
    structure_tool: 'pdfinfo (poppler)', pages: [], read_errors: [], synthetic_markers_found: [],
    not_a_pdf: false, encryption: null, text_extraction_permitted: null,
    read_when_encryption_permits_copy_requested: opts.readWhenEncryptionPermitsCopy === true
  };

  if (!fs.existsSync(file)) {
    model.read_errors.push({ stage: 'open', error: 'the file does not exist' });
    return model;
  }
  model.sha256 = sha256File(file);
  model.bytes = fs.statSync(file).size;

  let infoText;
  try {
    infoText = execFileSync(PDFINFO, [file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    model.not_a_pdf = true;
    model.read_errors.push({ stage: 'pdfinfo', error: 'pdfinfo could not read the document' });
    return model;
  }

  const pagesField = infoField(infoText, 'Pages:');
  model.page_count = pagesField ? Number(pagesField) : null;
  model.encryption = parseEncryption(infoText);
  model.encrypted = model.encryption.encrypted;
  model.page_size = parsePageSize(infoText);
  model.producer = infoField(infoText, 'Producer:');
  model.creator = infoField(infoText, 'Creator:');

  if (!Number.isInteger(model.page_count) || model.page_count <= 0) return model;

  if (model.encrypted) {
    model.text_extraction_permitted = model.encryption.copy_allowed === true;
    /* The ONLY path by which an encrypted document is ever read, and it is opt-in twice over: the caller must
       ask, and the document's own flags must permit copying. */
    if (!(opts.readWhenEncryptionPermitsCopy === true && model.text_extraction_permitted === true)) return model;
  }

  const images = pageImages(file);
  for (let page = 1; page <= model.page_count; page += 1) {

    let text = '';
    try {
      text = pageText(file, page);
    } catch (err) {
      model.read_errors.push({ stage: 'pdftotext', page, error: 'the page could not be read' });
    }
    const lines = text.split('\n');
    /* GAP-INGEST-008: a page that prints only a sliver of native text while the document is a full report is
       treated as having an incomplete text layer; the reading stage can supplement it with local OCR. */
    const native_text_incomplete = text.trim().length > 0 && text.trim().length < 60;
    const wordReading = pageWords(file, page);
    const image_regions = (images.by_page[page] || []).slice();
    const has_image_region = image_regions.length > 0;
    model.pages.push({
      page, chars: text.length, has_native_text: text.trim().length > 0,
      native_text_incomplete: native_text_incomplete || undefined,
      has_image_region: has_image_region || undefined,
      image_regions,
      lines, text, word_boxes: wordReading.words
    });
    for (const marker of scanForSyntheticMarkers(text)) {
      if (!model.synthetic_markers_found.includes(marker)) model.synthetic_markers_found.push(marker);
    }
  }
  return model;
}

/** Build a model from explicit lines. Test input only: it is labelled synthetic and refused by the entry point. */
function makeSyntheticModel(options) {
  const {
    pages = [], page_size = { width_pt: 594.96, height_pt: 841.92, label: 'A4' },
    encrypted = false, page_count = null, sha256 = null, read_errors = [], not_a_pdf = false,
    synthetic_label = 'SYNTHETIC TEST INPUT - NOT A CREDIT REPORT', producer = 'test-fixture-writer',
    creator = 'test-fixture-writer', native_text_incomplete_pages = [], image_region_pages = []
  } = options;

  const incompleteSet = new Set(native_text_incomplete_pages);
  const imageRegionSet = new Set(image_region_pages);
  const built = pages.map((lines, index) => {
    const text = lines.join('\n') + '\n';
    const page = index + 1;
    return {
      page, chars: text.length, has_native_text: text.trim().length > 0,
      native_text_incomplete: incompleteSet.has(page) || undefined,
      has_image_region: imageRegionSet.has(page) || undefined,
      image_regions: imageRegionSet.has(page) ? [{ width: null, height: null, color: null, bpc: null, enc: null, x_ppi: null, y_ppi: null }] : [],
      lines: text.split('\n'), text
    };
  });
  return {
    kind: 'SYNTHETIC', synthetic: true, synthetic_label, path: null,
    sha256, bytes: null, encrypted,
    page_count: page_count === null ? built.length : page_count,
    page_size, producer, creator,
    encryption: { raw: encrypted ? 'yes' : 'no', encrypted: Boolean(encrypted), print_allowed: null, copy_allowed: null, change_allowed: null, add_notes_allowed: null, algorithm: null },
    text_extraction_permitted: null,
    read_when_encryption_permits_copy_requested: false,
    text_extraction_tool: 'in-memory synthetic text model (no extraction)',
    structure_tool: 'in-memory synthetic structure',
    pages: built, read_errors, synthetic_markers_found: [...new Set(built.flatMap((p) => scanForSyntheticMarkers(p.text)))],
    not_a_pdf
  };
}

module.exports = { buildPdfDocumentModel, makeSyntheticModel, readPinnedPresentationPointer, sha256File, parseEncryption, pageImages, PDFINFO, PDFTOTEXT, PDFIMAGES };

