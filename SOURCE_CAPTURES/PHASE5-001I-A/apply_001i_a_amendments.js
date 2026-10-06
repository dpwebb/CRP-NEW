'use strict';
/**
 * apply_001i_a_amendments.js — the owner-authorized internal-validation carve-out, recorded by the
 * governing amendment procedure.
 *
 * GOVERNANCE CHECK PERFORMED FIRST. The order PHASE5-001I-A is a bounded internal implementation of one
 * candidate extractor and its deterministic comparison. The governing sequence does not presently permit
 * it, and the restriction is exact:
 *
 *   1. `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` (rank 5, Approved Build
 *      Plan) section 3 records: "Work proceeds in the following order. A later phase cannot begin before
 *      its stated gate passes."
 *   2. The same plan, section 4 item 5, records that the deterministic fact/evaluator specification and
 *      implementation come "only after rule units and report mappings are admitted".
 *   3. `CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md` section 9.4 records milestone M-1 as "Gate 5.3
 *      passes for the single selected unit", and PROD-003 recorded Gate 5.3 as REACHED for one candidate on
 *      one presentation and passed for none; Gate 5.4 (the rule record) has not started and the rule unit
 *      is not admitted.
 *
 * Core Constitution section 2.1 ranks authority by rank alone, and section 2.2 states that a lower-ranked
 * artifact never overrides a higher-ranked one. An owner-issued Active Work Order is rank 6 and therefore
 * cannot of itself proceed past the rank-5 plan's stated sequence. The restriction is therefore recorded,
 * and the owner's instruction is carried out: the smallest owner-authorized amendment that permits
 * INTERNAL VALIDATION ONLY is applied here, with every production admission gate preserved.
 *
 * Each amendment names the document and clause, quotes the replaced text and states the replacement text,
 * as CRP_CORE_CONSTITUTION.md section 6.2 requires. The script is idempotent: an amendment whose
 * replacement text is already present is recorded as already applied and is not applied twice.
 * This document uses LF line endings; they are preserved.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const DOC = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md';
const docPath = path.join(ROOT, DOC);
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(); }

const SEQUENCE_SENTENCE = 'Work proceeds in the following order. A later phase cannot begin before its stated gate passes. Record completed and blocked items in durable artifacts; do not rely on conversation-only decisions as certification records.';

const CARVE_OUT = [
  '',
  '**Owner-authorized internal-validation carve-out (PHASE5-001I-A).** A bounded, owner-issued work order may',
  'build and run an *internal validation* of one candidate extractor and its deterministic comparison before',
  'that candidate\u2019s gates pass, and only where every one of the following holds. This carve-out passes no gate,',
  'admits no rule, creates no coverage, produces no finding and changes no gate state:',
  '',
  '- the work order names one jurisdiction, one bureau presentation, one rule unit and one statutory limb, and it',
  '  names its own permitted files, its exclusions and its tests;',
  '- the artifacts are internal only: not admitted, not advertised, not reachable from any consumer surface, and',
  '  producing no consumer-visible output of any class;',
  '- the comparison outcomes are internal arithmetic results and are never `VIOLATION` or `PROBABLE_VIOLATION`,',
  '  and no `VIOLATION` or `PROBABLE_VIOLATION` class is created, emitted or implied;',
  '- unresolved states keep their recorded meaning: `EXTRACTION_UNRESOLVED` is never `ABSENT_FROM_REPORT`, and a',
  '  parser failure is never evidence;',
  '- a classification recorded for the candidate is preserved and is never overridden by this carve-out;',
  '- Gates 5.3 to 5.7, their acceptance evidence and every admission condition are untouched: the artefact is not',
  '  an admitted evaluator, it is not gate evidence for any gate, and it must be re-created and re-validated under',
  '  Gates 5.5 and 5.6 before any admission.',
  '',
  'Nothing in this carve-out authorizes a second rule unit, jurisdiction, bureau or presentation, a consumer',
  'surface, a deployment, or a finding.'
].join('\n');

const FIVE_FIND = '5. Deterministic fact/evaluator specification and implementation, only after rule units and report mappings are admitted.';
const FIVE_REPLACE = '5. Deterministic fact/evaluator specification and implementation, only after rule units and report mappings are admitted; the section 3 internal-validation carve-out is not that specification or implementation, is not gate evidence, and admits nothing.';

const HISTORY_MARKER = '| 2026-09-30 | PHASE5-001I-A |';

const HISTORY_ROW = '| 2026-09-30 | PHASE5-001I-A | Valid owner amendment under Core Constitution section 6: section 3 gains the owner-authorized internal-validation carve-out and section 4 item 5 records that the carve-out is not the admitted specification or implementation. A bounded internal validation of one candidate extractor and its deterministic comparison \u2014 one jurisdiction, one presentation, one rule unit, one limb \u2014 may be built and run before its gates pass, with no admission, no coverage, no finding, no consumer-visible output, no gate credit and no override of a recorded classification, and it must be re-created and re-validated under Gates 5.5 and 5.6 before any admission. The gate sequence, all gates, the permanent exclusions, the finding boundary and every other acceptance condition are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md. Admits no rule, passes no gate, creates no coverage and authorizes no finding. |';

const amendments = [
  { id: 'A-1', clause: 'section 3, the ordering sentence that opens the gate sequence', find: SEQUENCE_SENTENCE, replace: SEQUENCE_SENTENCE + '\n' + CARVE_OUT },
  { id: 'A-2', clause: 'section 4, item 5 (deterministic fact/evaluator specification and implementation)', find: FIVE_FIND, replace: FIVE_REPLACE }
];

function applyAmendments() {
  const digestBefore = sha256(docPath);
  let text = fs.readFileSync(docPath, 'utf8');
  const results = [];

  for (const a of amendments) {
    const occurrences = text.split(a.find).length - 1;
    if (text.includes(a.replace)) {
      results.push({ id: a.id, clause: a.clause, action: 'ALREADY_APPLIED', occurrences_found: occurrences });
      continue;
    }
    if (occurrences !== 1) {
      results.push({ id: a.id, clause: a.clause, action: 'FAILED_NOT_APPLIED', occurrences_found: occurrences, reason: 'the quoted text to replace does not occur exactly once' });
      continue;
    }
    text = text.replace(a.find, a.replace);
    results.push({ id: a.id, clause: a.clause, action: 'APPLIED', occurrences_found: occurrences });
  }

  const historyLine = text.split('\n').find((line) => line.startsWith('| 2026-09-30 | PHASE5-001O |'));
  if (!historyLine) {
    results.push({ id: 'A-3', clause: 'section 8, Amendment History, appended row', action: 'FAILED_NOT_APPLIED', reason: 'the existing PHASE5-001O history row was not found' });
  } else if (text.includes(HISTORY_MARKER)) {
    results.push({ id: 'A-3', clause: 'section 8, Amendment History, appended row', action: 'ALREADY_APPLIED' });
  } else {
    text = text.replace(historyLine, historyLine + '\n' + HISTORY_ROW);
    results.push({ id: 'A-3', clause: 'section 8, Amendment History, appended row', action: 'APPLIED' });
  }

  const crlf = (text.match(/\r\n/g) || []).length;
  if (crlf > 0) results.push({ id: 'A-0', clause: 'line endings', action: 'FAILED_NOT_APPLIED', reason: 'the amended document must keep its LF line endings' });
  const failed = results.filter((r) => r.action === 'FAILED_NOT_APPLIED');
  const changed = results.some((r) => r.action === 'APPLIED');
  if (failed.length === 0 && changed) fs.writeFileSync(docPath, text, 'utf8');
  const digestAfter = sha256(docPath);

  fs.writeFileSync(path.join(OUT, 'amendment_text.json'), JSON.stringify({
    artifact: 'amendment_text.json',
    work_order: 'PHASE5-001I-A',
    created_utc: new Date().toISOString().slice(0, 10),
    purpose: 'the exact text each PHASE5-001I-A amendment names, quotes and replaces, so the amendment record and the amended document cannot separate',
    governing_rule: 'CRP_CORE_CONSTITUTION.md section 6.2 \u2014 an amendment must name the document and the clause, quote the text being replaced, and state the replacement text',
    restriction_being_relieved: [
      'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md section 3: a later phase cannot begin before its stated gate passes',
      'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md section 4 item 5: the deterministic fact/evaluator specification and implementation come only after rule units and report mappings are admitted',
      'CRP_PROD_001_READINESS_AND_IMPLEMENTATION_PLAN.md section 9.4 milestone M-1 requires Gate 5.3 to pass; PROD-003 records it reached for one candidate and passed for none, and Gate 5.4 has not started'
    ],
    relief_is_internal_validation_only: true,
    gate_effects: 'none \u2014 no gate is passed, waived, softened or advanced by this amendment; every admission condition stands unchanged',
    amendments: amendments.map((a) => ({ id: a.id, document: DOC, clause: a.clause, quoted_text_replaced: a.find, replacement_text: a.replace })),
    history_row_appended: HISTORY_ROW
  }, null, 2) + '\n', 'utf8');

  fs.writeFileSync(path.join(OUT, 'amendment_application_result.json'), JSON.stringify({
    artifact: 'amendment_application_result.json',
    work_order: 'PHASE5-001I-A',
    created_utc: new Date().toISOString().slice(0, 10),
    document: DOC,
    digest_before: digestBefore,
    digest_after: digestAfter,
    document_changed: digestBefore !== digestAfter,
    document_changed_in_this_run: changed,
    line_endings: crlf === 0 ? 'LF preserved' : 'CRLF PRESENT \u2014 FAILED',
    document_state: failed.length === 0 ? 'OWNER_AUTHORIZED_INTERNAL_VALIDATION_CARVE_OUT_RECORDED_IN_THE_DOCUMENT' : 'NOT_RECORDED',
    results,
    verdict: failed.length === 0 ? 'AMENDMENTS APPLIED \u2014 the owner-authorized internal-validation carve-out is recorded by the amendment procedure, and no gate is changed' : 'AMENDMENT FAILED \u2014 the quoted text did not match'
  }, null, 2) + '\n', 'utf8');

  for (const r of results) console.log(`${r.id} ${r.clause}: ${r.action}${r.occurrences_found !== undefined ? ` (occurrences ${r.occurrences_found})` : ''}`);
  console.log(`digest before ${digestBefore}`);
  console.log(`digest after  ${digestAfter}`);
  if (failed.length) { for (const f of failed) console.error(' - ' + f.id + ': ' + f.reason); process.exit(1); }
}

applyAmendments();

