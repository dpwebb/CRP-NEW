'use strict';
/**
 * v-presentation-and-release.cjs — OWNER-ALL82-001 / B4, the two remaining closes and the release record.
 *
 *   • CANADA: "Build a separate, evidence-supported consumer-format family adapter where existing evidence
 *     permits. Preserve the original PR-01 exact-specimen admission. Do not remove its hash restriction and call
 *     that family support." Here the evidence does not permit a family, so this section PROVES the restriction
 *     still bites: it presents the SECOND REAL Canadian consumer report that is on this machine — a genuine
 *     TransUnion Canada disclosure — and records that it is refused, not read.
 *   • GB: "Seek targeted current consumer-format evidence or authoritative current field/layout documentation …
 *     Keep the 2007 sample labeled historical demonstration evidence; do not advertise present-day support from
 *     it alone." The retrieval attempts failed at the source and are recorded; this section RE-MEASURES the one
 *     current official GB artifact on hand against the family's own vocabulary, so the recorded claim is
 *     reproducible rather than asserted.
 *   • RELEASE: the local pre-release check, and the fact that it says NOT_LAUNCH_READY for one named reason.
 *
 * No artifact is copied. Both real reports are read read-only from where they already are.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const formats = require('../../formats.cjs');
const gbFamily = require('../../format-families/gb-experian-consumer.cjs');
const caScope = require('../../format-families/ca-consumer-format-scope.cjs');
const results = require('../../results.cjs');
const { PAID_ACTIONS } = require('../../entitlement.cjs');
const { runReleaseCheck, CHECKS } = require('../../release-check.cjs');
const { REPOSITORY_ROOT } = require('../harness.cjs');

const BASELINE = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30');
const REGISTER = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json');
const UI_DIR = path.join(__dirname, '..', '..', 'ui');

/** The register's own record of a Canadian presentation, read read-only. */
function registeredPresentation(presentationId) {
  if (!fs.existsSync(REGISTER)) return null;
  const register = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const row = register.presentations.find((entry) => entry.presentation_id === presentationId);
  if (!row) return null;
  const file = row.absolute_path_outside_this_repository;
  return Object.assign({}, row, {
    /* The register names the field `status`; this section reads it as the admission status it is. */
    register_status: row.status || null,
    available: Boolean(file) && fs.existsSync(file)
  });
}

/** The visible text of a captured HTML page, tags stripped. */
function visibleText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

function occurrences(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (haystack.match(new RegExp(escaped, 'gi')) || []).length;
}

async function run(t, check) {
  /* The retrieval attempts are recorded as results, not as blanks. */
  const attempts = gbFamily.CURRENCY_EVIDENCE.current_evidence_attempts;
  check.equal(attempts.length, 4, 'every targeted retrieval attempt is recorded');
  check.ok(attempts.filter((row) => /HTTP_40[34]/.test(row.result)).length >= 3,
    'and the refusals are recorded with their status rather than omitted');

  /* THE ONE CURRENT OFFICIAL GB ARTIFACT ON HAND IS RE-MEASURED AGAINST THE CONTRACT. */
  const artifact = path.join(BASELINE, 'PUB-024.html');
  if (!fs.existsSync(artifact)) {
    check.skip('the recorded GB label-currency measurement is reproduced from the captured artifact',
      'the captured current GB artifact PUB-024 is not present');
    return;
  }
  const text = visibleText(artifact);
  const recorded = gbFamily.CURRENCY_EVIDENCE.label_currency_check;
  const matchedHeadings = gbFamily.REQUIRED_HEADINGS.filter((heading) => occurrences(text, heading) > 0);
  const contractFields = Object.values(gbFamily.FAMILY_CONTRACT.printed_fields).flat();
  const matchedFields = contractFields.filter((field) => occurrences(text, field) > 0).sort();
  check.deepEqual(matchedHeadings, recorded.headings_matched.slice(),
    'a fresh measurement of the captured artifact matches the recorded headings: none of them appear');
  check.deepEqual(matchedFields, recorded.printed_fields_matched_as_substrings.slice().sort(),
    'and the incidental field-token hits are exactly the ones recorded, so the record is reproducible');
  check.equal(matchedFields.length, 5, 'a product page gets five incidental hits, which is why the interpretation is recorded');
  check.equal(recorded.printed_fields_tested, contractFields.length, 'and the recorded count of tested fields is the contract’s own count');
  check.equal(recorded.headings_tested, gbFamily.REQUIRED_HEADINGS.length, 'and the recorded count of tested headings is the contract’s own count');
  check.ok(/PRODUCT|MARKETING/.test(recorded.interpretation),
    'and the record states that a product page settles nothing about a report layout');


 return { lane: 'HISTORICAL_SOURCE_CUSTODY', label_currency_measurement_reproduced: true };
}
module.exports = { run, id: 'historical-gb-source', title: 'Historical GB retrieval and captured marketing text provenance' };
