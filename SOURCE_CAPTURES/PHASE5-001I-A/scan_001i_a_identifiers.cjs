'use strict';
/**
 * scan_001i_a_identifiers.cjs — the privacy scan for PHASE5-001I-A.
 *
 * Proves, by measurement, that this order copied no report content and no consumer identifier into this
 * repository. Two derivations keep the scan honest and non-self-defeating:
 *
 *   - the consumer-name candidates are taken at run time from the file name of the evidenced specimen, and the
 *     bureau's own vocabulary (the recorded publisher, bureau and channel strings) is subtracted from them, so
 *     a bureau name is not reported as a consumer name and a consumer name is never excused;
 *   - a long digit run is classified before it is judged: PDF structural tables, the test suite's own clock
 *     stub and a machine inventory's byte counts are recorded with their justification, and anything left
 *     unclassified is a finding.
 *
 * The scan never writes an identifier: name candidates appear only as SHA-256 values.
 * Writes SOURCE_CAPTURES\PHASE5-001I-A\identifier_scan.json. Read-only.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const IMPL = path.join(ROOT, 'internal-validation', 'ca-ns-last-payment-six-year');
const NARRATIVE = path.join(ROOT, 'CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md');
const { readPinnedPresentationPointer } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const sha = (value) => crypto.createHash('sha256').update(String(value)).digest('hex').toUpperCase();

const pointer = readPinnedPresentationPointer();
const register = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json'), 'utf8'));
const crosswalk = JSON.parse(fs.readFileSync(path.join(ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'crosswalk.json'), 'utf8'));
const tokensOf = (text) => String(text).toLowerCase().split(/[^a-z]+/).filter((t) => t.length >= 4);

const bureauVocabulary = new Set([
  ...tokensOf(pointer.publisher), ...tokensOf(pointer.market || ''),
  ...register.presentations.flatMap((p) => tokensOf(p.publisher)),
  ...tokensOf(crosswalk.selected.bureau || ''), ...tokensOf(crosswalk.selected.presentation || ''),
  ...tokensOf(require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs').UNIT.bureau_and_channel)
]);
const consumerNameCandidates = [...new Set(tokensOf(path.basename(pointer.absolute_path, '.pdf')))].filter((t) => !bureauVocabulary.has(t));

const STRUCTURAL = [
  { id: 'SHA256_DIGEST_RECORD', test: (line) => /[0-9A-F]{64}/.test(line) },
  { id: 'PDF_XREF_TABLE', test: (line) => /^\d{10} \d{5} [nf] $/.test(line) || /\d{10} 65535 f/.test(line) || /^0 \d+$/.test(line) || /^xref$/.test(line) },
  { id: 'PDF_OBJECT_TABLE', test: (line) => /(startxref|%%EOF|trailer|\/Length|\/Width|\/Height)/.test(line) },
  { id: 'TEST_CLOCK_STUB', test: (line) => /Date\.now|4102444800000/.test(line) },
  { id: 'INVENTORY_BYTE_COUNT', test: (line) => /"(bytes|chars|file_count|line_count)"\s*:/.test(line) }
];
const PATTERNS = [
  { id: 'EMAIL_ADDRESS', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { id: 'PHONE_NUMBER', pattern: /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/ },
  { id: 'POSTAL_CODE_CA', pattern: /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/ },
  { id: 'LONG_DIGIT_RUN', pattern: /\d{9,}/, classified: true }
];


function filesUnder(directory) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(directory);
  return out;
}

const targets = filesUnder(IMPL).concat(filesUnder(OUT)).concat(fs.existsSync(NARRATIVE) ? [NARRATIVE] : []);
const findings = [];
const classifications = [];
let scanned = 0;

for (const file of targets) {
  if (!/\.(cjs|js|json|ps1|md|txt)$/i.test(file)) continue;
  const relative = path.relative(ROOT, file);
  const text = fs.readFileSync(file, 'utf8');
  const lower = text.toLowerCase();
  scanned += 1;

  for (const token of consumerNameCandidates) {
    if (new RegExp('\\b' + token + '\\b', 'i').test(text)) findings.push({ path: relative, rule: 'CONSUMER_NAME_TOKEN', token_sha256: sha(token) });
  }
  for (const { id, pattern, classified } of PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'g')) || [];
    for (const match of matches) {
      if (classified) {
        const line = text.split('\n').find((l) => l.includes(match)) || '';
        const cls = STRUCTURAL.find((s) => s.test(line));
        if (cls) { classifications.push({ path: relative, rule: id, classification: cls.id, matched_digits: match.length }); continue; }
      }
      findings.push({ path: relative, rule: id, matched_shape: match.replace(/[A-Za-z0-9]/g, '#'), digits: match.length });
    }
  }
}

const doc = {
  artifact: 'identifier_scan.json',
  work_order: 'PHASE5-001I-A',
  created_utc: new Date().toISOString().slice(0, 10),
  purpose: 'prove by measurement that this order copied no report content and no consumer identifier into this repository, and that the scan itself stores none',
  derivation: {
    specimen_name_source: 'read at run time from the PROD-003 register presentation record',
    bureau_vocabulary_size: bureauVocabulary.size,
    consumer_name_candidate_count: consumerNameCandidates.length,
    consumer_name_candidate_sha256s: consumerNameCandidates.map(sha),
    note: 'the bureau vocabulary is subtracted so a bureau name is not reported as a consumer name; nothing else is subtracted'
  },
  patterns: PATTERNS.map((p) => p.id),
  structural_exemptions: STRUCTURAL.map((s) => s.id),
  files_scanned: scanned,
  classified_non_findings: classifications,
  findings,
  finding_count: findings.length,
  verdict: findings.length === 0
    ? 'NO REPORT CONTENT AND NO CONSUMER IDENTIFIER FOUND IN ANY FILE THIS ORDER WROTE'
    : 'IDENTIFIER SCAN FAILED — see findings'
};
fs.writeFileSync(path.join(OUT, 'identifier_scan.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');
console.log(`files scanned: ${scanned}; name candidates: ${consumerNameCandidates.length}; classified non-findings: ${classifications.length}; findings: ${findings.length}`);
for (const f of findings) console.log(`  ${f.path} :: ${f.rule} ${f.token_sha256 || f.matched_shape || ''}`);
console.log(doc.verdict);
process.exitCode = findings.length === 0 ? 0 : 1;
