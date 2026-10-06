'use strict';
/**
 * amendment_001u.cjs — the one governing amendment PHASE5-001U applies, and the text of the appended
 * amendment-history row. It is kept in one module so that the applier and the independent verifier read the same
 * strings: the verifier re-finds these exact texts in the amended document rather than trusting the applier.
 */
const { BS, wr } = require('./lib_001u.cjs');
const NL = String.fromCharCode(10);

/** A-U-1: section 3, Gate 5.6 — the reading of the pre-admission sharing sentence. */
const REPLACED_TEXT =
  'the production admission identity and version remain reserved to Gate 5.7, and a scoped Gate 5.6 verdict must ' +
  'name that reservation rather than treat the condition as satisfied by it.';

const REPLACEMENT_TEXT =
  REPLACED_TEXT + ' ' +
  'The reservation is a Gate 5.7 assignment, not a Gate 5.6 measurement. Under owner authority PHASE5-001U, the ' +
  'sharing condition for such a scope is the condition that the governed rule record the scope reads, the source ' +
  'crosswalk, the tests and the explanation templates it reads and writes are each pinned to one shared, verified, ' +
  'immutable pre-admission version identity, each at an immutable digest; that condition is measurable, and is met ' +
  'or not met, before Gate 5.7 has assigned any production identity. A scoped Gate 5.6 verdict therefore records ' +
  'the sharing condition against that shared pre-admission version identity and names the production reservation ' +
  'beside it, and it may not treat the reservation, the existence of this clause, or the prospect of a later ' +
  'assignment as evidence that sharing holds. Gate 5.7 remains the only step that assigns a production identity ' +
  'and a production version string, the requirement to name the reservation is unchanged, and no gate is passed by ' +
  'this clause alone.';

/** A-U-2: section 8, Amendment History — the appended row. */
const RSQ = String.fromCharCode(0x2019); // the right single quotation mark the corpus rows use
const EMD = String.fromCharCode(0x2014); // the em dash the corpus rows use
const APPENDED_ROW =
  '| 2026-10-01 | PHASE5-001U | Valid owner amendment under Core Constitution section 6: Gate 5.6' + RSQ + 's ' +
  'pre-admission sharing sentence gains the owner' + RSQ + 's reading of how its reservation and its measurement ' +
  'relate (owner authority PHASE5-001U) ' + EMD + ' the sharing condition for a scope whose rule record Gate 5.7 ' +
  'has not admitted is the condition that the governed rule record the scope reads, the source crosswalk, the ' +
  'tests and the explanation templates it reads and writes are each pinned to one shared, verified, immutable ' +
  'pre-admission version identity at an immutable digest; that condition is measurable and is met or not met ' +
  'before Gate 5.7 assigns any production identity; a scoped Gate 5.6 verdict records the sharing condition ' +
  'against that shared pre-admission version identity and names the production reservation beside it, and may not ' +
  'treat the reservation, this clause, or the prospect of a later assignment as evidence that sharing holds. The ' +
  'requirement to name the reservation, Gate 5.7' + RSQ + 's sole authority to assign the production identity and ' +
  'the production version string, every other Gate 5.6 clause, Gate 5.7 itself, the finding model, the stop ' +
  'conditions and the permanent exclusions are unchanged, no requirement is removed, and no gate is passed by ' +
  'this amendment alone. It admits no rule by itself, certifies no coverage, creates no finding class, changes no ' +
  'application behaviour and authorises no consumer-visible output. Both replaced text and replacement text are ' +
  'quoted in CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md and ' +
  wr('SOURCE_CAPTURES/PHASE5-001U/amendment_text.json') + ' |';

const AMENDMENT = {
  id: 'A-U-1',
  type: 'REPLACE_BY_EXTENSION',
  document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md',
  clause: 'section 3, Gate 5.6 (the pre-admission immutable-version sharing sentence, as extended by PHASE5-001S A-4)',
  replaced_text: REPLACED_TEXT,
  replacement_text: REPLACEMENT_TEXT,
  removed_text: '',
  requirement_removed: false,
  line_before_amendment: 170,
};

/** Apply the amendment to a document's text. Pure: it changes no file. */
function applyToText(text) {
  const replacedOccurrences = countOccurrences(text, REPLACED_TEXT);
  const replacementOccurrences = countOccurrences(text, REPLACEMENT_TEXT);
  const rowOccurrences = countOccurrences(text, APPENDED_ROW);
  const problems = [];
  if (replacedOccurrences !== 1) problems.push('the replaced text occurs ' + replacedOccurrences + ' time(s), expected exactly 1');
  if (replacementOccurrences !== 0) problems.push('the replacement text already occurs ' + replacementOccurrences + ' time(s), expected 0');
  if (rowOccurrences !== 0) problems.push('the amendment-history row already occurs ' + rowOccurrences + ' time(s), expected 0');
  if (problems.length > 0) return { ok: false, problems: problems, text: text };

  let out = text.replace(REPLACED_TEXT, REPLACEMENT_TEXT);
  const tail = NL + NL;
  if (out.endsWith(tail)) out = out.slice(0, out.length - tail.length) + NL + APPENDED_ROW + tail;
  else out = out + NL + APPENDED_ROW + NL;
  return { ok: true, problems: [], text: out };
}

/** Undo the amendment on an amended document's text: remove the appended row and the extension. */
function undoFromText(text) {
  let out = text;
  const rowWithBreak = NL + APPENDED_ROW;
  if (out.indexOf(rowWithBreak) >= 0) out = out.replace(rowWithBreak, '');
  out = out.replace(REPLACEMENT_TEXT, REPLACED_TEXT);
  return out;
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  let n = 0; let i = haystack.indexOf(needle);
  while (i >= 0) { n += 1; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

module.exports = {
  AMENDMENT, REPLACED_TEXT, REPLACEMENT_TEXT, APPENDED_ROW,
  applyToText, undoFromText, countOccurrences,
};
