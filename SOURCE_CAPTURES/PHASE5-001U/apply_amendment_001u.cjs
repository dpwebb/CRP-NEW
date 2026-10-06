'use strict';
/**
 * apply_amendment_001u.cjs — PHASE5-001U: apply the one owner-authorised governing amendment by the
 * quoted-replacement procedure, then verify the change by inverting it.
 *
 * It refuses to run if the document is not at the pinned digest, if the replaced text does not occur exactly once,
 * if the replacement already exists (so a second run cannot double-amend), or if the inverse reconstruction does not
 * reproduce the pre-amendment bytes exactly.
 */
const fs = require('fs');
const path = require('path');
const I = require('./lib_001u.cjs');
const A = require('./amendment_001u.cjs');

const target = path.join(I.ROOT, I.AMENDMENT_TARGET);
const before = fs.readFileSync(target, 'utf8');
const beforeBytes = fs.readFileSync(target);
const beforeDigest = I.sha256Text(before);

const expectedBefore = '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50';
if (beforeDigest !== expectedBefore) {
  console.error('STOP — the document is not at the pinned digest. pinned ' + expectedBefore + ', measured ' + beforeDigest);
  process.exit(1);
}

const applied = A.applyToText(before);
if (!applied.ok) {
  console.error('STOP — the amendment cannot be applied: ' + applied.problems.join('; '));
  process.exit(1);
}
const after = applied.text;

// The inverse reconstruction: undo the amendment and require the pre-amendment bytes back.
const reconstructed = A.undoFromText(after);
const reconstructedDigest = I.sha256Text(reconstructed);
const reconstructionMatches = reconstructedDigest === beforeDigest;
const afterDigest = I.sha256Text(after);
if (!reconstructionMatches) {
  console.error('STOP — the inverse reconstruction does not reproduce the pre-amendment document. Nothing was written.');
  process.exit(1);
}

fs.writeFileSync(target, after, 'utf8');
const written = fs.readFileSync(target);
const writtenDigest = I.sha256Text(written);

function eolStats(text) {
  let crlf = 0; let lf = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) { if (i > 0 && text.charCodeAt(i - 1) === 13) crlf += 1; else lf += 1; }
  }
  return { crlf: crlf, lf: lf, ends_with_newline: text.endsWith('\n'), lines: text.split('\n').length - 1 };
}

const textRecord = {
  artifact: 'amendment_text.json',
  work_order: 'PHASE5-001U',
  created_utc: I.CREATED_UTC,
  document_type: 'GOVERNING AMENDMENT BY QUOTED REPLACEMENT — one amendment, one governing document. It admits no rule by itself, certifies no coverage, creates no finding class and produces no consumer-visible output',
  purpose: 'record the owner-authorised amendment of the Gate 5.6 pre-admission sharing sentence by the quoted-replacement procedure, so that the sentence states which measurement satisfies the sharing condition at Gate 5.6 and which assignment remains reserved to Gate 5.7',
  document: I.AMENDMENT_TARGET,
  document_rank: '5 — Approved Build Plan (authority order: CRP_CORE_CONSTITUTION.md section 2)',
  amendment_procedure_applied: 'CRP_CORE_CONSTITUTION.md sections 6.1, 6.2 and 6.5 — the document is named, the clause is named, the replaced text is quoted verbatim and the replacement text is stated; the amendment-history row is appended under section 6.5',
  digest_before: beforeDigest,
  digest_after: afterDigest,
  bytes_before: beforeBytes.length,
  bytes_after: written.length,
  line_endings: 'LF preserved, exactly the convention the document already used',
  amendment_count: 2,
  replacements: 1,
  rows_appended: 1,
  amendments: [
    {
      id: A.AMENDMENT.id,
      type: A.AMENDMENT.type,
      document: A.AMENDMENT.document,
      clause: A.AMENDMENT.clause,
      line_before_amendment: A.AMENDMENT.line_before_amendment,
      replaced_text: A.AMENDMENT.replaced_text,
      replacement_text: A.AMENDMENT.replacement_text,
      removed_text: '',
      requirement_removed: false,
      mechanical_check: {
        replaced_text_occurrences_before_amendment: A.countOccurrences(before, A.REPLACED_TEXT),
        replacement_text_occurrences_before_amendment: A.countOccurrences(before, A.REPLACEMENT_TEXT),
        replacement_text_present_exactly_once_after_amendment: A.countOccurrences(after, A.REPLACEMENT_TEXT) === 1,
        replacement_text_occurrences_after_amendment: A.countOccurrences(after, A.REPLACEMENT_TEXT),
        replaced_text_survives_verbatim_inside_the_replacement: A.REPLACEMENT_TEXT.indexOf(A.REPLACED_TEXT) === 0,
        replacement_text_is_an_extension_of_the_replaced_text: A.REPLACEMENT_TEXT.indexOf(A.REPLACED_TEXT) === 0,
        replaced_text_occurrences_in_the_amended_document: A.countOccurrences(after, A.REPLACED_TEXT),
        note: 'the replaced text still appears in the amended document because it is retained verbatim inside its replacement: nothing was deleted, so Core Constitution section 6.4 removal condition is not triggered and no requirement is removed',
      },
      line_after_amendment: (after.split(A.APPENDED_ROW)[0].match(/\n/g) || []).length + 1,
    },
    {
      id: 'A-U-2',
      type: 'APPEND_ROW',
      document: A.AMENDMENT.document,
      clause: 'section 8, Amendment History, appended row',
      appended_row: A.APPENDED_ROW,
      removed_text: '',
      requirement_removed: false,
    },
  ],
  inversion_check: {
    method: 'the appended row is removed and the replacement is undone in reverse order; the reconstructed bytes are hashed',
    pre_amendment_digest: beforeDigest,
    reconstructed_digest: reconstructedDigest,
    reconstruction_matches_baseline: reconstructionMatches,
    what_this_proves: 'the amendment added exactly the two recorded items and changed nothing else in the document; a hidden edit, an extra character or a dropped requirement would change the reconstructed digest',
  },
  what_the_replacement_text_says: [
    'the sharing condition for a scope whose rule record Gate 5.7 has not admitted is the condition that the governed rule record it reads, the source crosswalk, the tests and the explanation templates it reads and writes are each pinned to one shared, verified, immutable pre-admission version identity at an immutable digest',
    'that condition is measurable, and is met or not met, before Gate 5.7 has assigned any production identity',
    'a scoped Gate 5.6 verdict records the sharing condition against that shared pre-admission version identity and names the production reservation beside it',
    'the reservation, this clause, and the prospect of a later assignment are not evidence that sharing holds',
    'Gate 5.7 remains the only step that assigns a production identity and a production version string',
  ],
  what_no_replacement_did: 'no requirement was removed: the sentence requiring a scoped Gate 5.6 verdict to name the production reservation survives verbatim and remains binding, and Gate 5.7 remains the only step that assigns the production identity and version',
  verdict: 'AMENDMENT APPLIED — the Gate 5.6 sharing sentence states which measurement satisfies the sharing condition and which assignment stays reserved to Gate 5.7; the inverse reconstruction reproduces the pre-amendment bytes exactly, so nothing else in the document changed and no requirement was removed; no gate is passed by this amendment alone',
  created_by: 'PHASE5-001U',
};

const resultRecord = {
  artifact: 'amendment_application_result.json',
  work_order: 'PHASE5-001U',
  created_utc: I.CREATED_UTC,
  document: I.AMENDMENT_TARGET,
  document_rank: textRecord.document_rank,
  amendment_form: 'quoted replacement, CRP_CORE_CONSTITUTION.md section 6.2 — document named, clause named, replaced text quoted, replacement text stated; the replacement is an extension, so no requirement is removed (section 6.4)',
  amendment_authority: 'the owner instrument this order carries (owner_decision_record.json), applied through the governing procedure',
  digest_before: beforeDigest,
  digest_after: afterDigest,
  document_digest_after_re_read: writtenDigest,
  digest_after_matches_re_read: afterDigest === writtenDigest,
  bytes_before: beforeBytes.length,
  bytes_after: written.length,
  document_changed: true,
  document_changed_in_this_run: true,
  line_endings: textRecord.line_endings,
  line_endings_measured: { before: eolStats(before), after: eolStats(after) },
  amendments_applied: 2,
  replacements_applied: 1,
  rows_appended: 1,
  the_only_pre_existing_file_this_order_changed: I.AMENDMENT_TARGET,
  results: [
    { id: 'A-U-1', clause: A.AMENDMENT.clause, action: 'APPLIED', occurrences_found: 1, already_present_guard: false, extension_only_no_requirement_removed: true, replaced_text_bytes: Buffer.byteLength(A.REPLACED_TEXT, 'utf8'), replacement_text_bytes: Buffer.byteLength(A.REPLACEMENT_TEXT, 'utf8') },
    { id: 'A-U-2', clause: 'section 8, Amendment History, appended row', action: 'APPLIED' },
  ],
  problems: [],
  verdict: 'AMENDMENT APPLIED — the Gate 5.6 sharing sentence now records which measurement satisfies the sharing condition and which assignment remains reserved to Gate 5.7; no requirement is removed, no gate is passed by the amendment, and no other pre-existing file was touched',
  created_by: 'PHASE5-001U',
};

console.log(JSON.stringify(I.writeJson('amendment_text.json', textRecord), null, 2));
console.log(JSON.stringify(I.writeJson('amendment_application_result.json', resultRecord), null, 2));
console.log('plan: ' + beforeDigest + ' -> ' + afterDigest + '  bytes ' + beforeBytes.length + ' -> ' + written.length);

