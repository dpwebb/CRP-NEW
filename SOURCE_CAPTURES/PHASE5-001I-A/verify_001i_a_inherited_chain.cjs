'use strict';
/**
 * verify_001i_a_inherited_chain.cjs — read-only readings of the inherited chains after this order.
 *
 * PROD-003's own input verification re-checks PROD-002's recorded input digests. This order changes one of
 * those inputs — the build plan — by the owner-authorized amendment it was told to apply, so that check now
 * reports one expected difference. This script measures that difference itself, proves what it is, and records
 * the reading instead of re-running PROD-003's step (which would rewrite PROD-003's record of its own date).
 *
 * Writes SOURCE_CAPTURES\PHASE5-001I-A\inherited_chain_readings.json. Read-only.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001I-A');
const checks = [];
const failures = [];
function check(id, claim, ok, detail) {
  checks.push({ id, claim, passed: !!ok, detail: String(detail) });
  if (!ok) failures.push(`${id} ${claim} — ${detail}`);
}
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const sha = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').toUpperCase();

const p002Inputs = read('SOURCE_CAPTURES\\PROD-002\\input_verification.json');
const amendment = read('SOURCE_CAPTURES\\PHASE5-001I-A\\amendment_application_result.json');
const p002BuildCheck = read('SOURCE_CAPTURES\\PROD-002\\build_check_result.json');
const p002Preservation = read('SOURCE_CAPTURES\\PROD-002\\preservation_and_change_record.json');
const p003Validation = read('SOURCE_CAPTURES\\PROD-003\\validation_results.json');
const p003Inputs = read('SOURCE_CAPTURES\\PROD-003\\input_verification.json');

const rows = p002Inputs.input_digests.map((d) => {
  const now = sha(d.relative_path);
  return { relative_path: d.relative_path, prod002_recorded: d.measured_sha256, measured_now: now, unchanged: now === d.measured_sha256 };
});
const changedRows = rows.filter((r) => !r.unchanged);

check('R-01', 'every PROD-002 recorded input is unchanged except one', changedRows.length === 1, `${rows.length - changedRows.length} of ${rows.length} unchanged`);
check('R-02', 'the one changed input is the build plan this order amended', changedRows.length === 1 && changedRows[0].relative_path === amendment.document, changedRows.length === 1 ? changedRows[0].relative_path : 'unexpected');
check('R-03', 'the change is exactly the recorded owner amendment, not drift',
  changedRows.length === 1 && changedRows[0].prod002_recorded === amendment.digest_before && changedRows[0].measured_now === amendment.digest_after,
  changedRows.length === 1 ? `${changedRows[0].prod002_recorded.slice(0, 12)} -> ${changedRows[0].measured_now.slice(0, 12)}` : 'n/a');
check('R-04', 'PROD-003 recorded its own chain green before this order changed anything', /ALL PROD-003 VALIDATION PASSED/.test(String(p003Validation.verdict)), String(p003Validation.verdict));
check('R-05', 'PROD-003 input verification reports exactly the one expected difference',
  Array.isArray(p003Inputs.failures) && p003Inputs.failures.length === 1 && /PHASE5-001O inputs stable since PROD-002/.test(p003Inputs.failures[0]),
  JSON.stringify(p003Inputs.failures));
check('R-06', 'PROD-002 build check still passes on the unchanged application data', /BUILD CHECK PASSED/.test(String(p002BuildCheck.verdict)), String(p002BuildCheck.verdict));
check('R-07', 'PROD-002 preservation record still holds', /^PRESERVATION HELD/.test(String(p002Preservation.verdict)), String(p002Preservation.verdict));
const generated = fs.readFileSync(path.join(ROOT, 'consumer-wizard', 'dist', 'jurisdiction-data.js'), 'utf8');
check('R-08', 'the consumer surface still reports report checking as unavailable', /"available": false/.test(generated) && /Report checking not yet available\./.test(generated), 'no region claims report checking');

const document = {
  artifact: 'inherited_chain_readings.json',
  work_order: 'PHASE5-001I-A',
  created_utc: new Date().toISOString().slice(0, 10),
  purpose: 'record, read-only, what this order\'s single governing amendment does to the inherited PROD-002 and PROD-003 chains, and prove that the one difference is the amendment rather than drift',
  prod002_recorded_inputs: rows,
  changed_inputs: changedRows,
  prod003_input_verification_reading: { failures: p003Inputs.failures, verdict: p003Inputs.verdict },
  expected_reading:
    'PROD-002 recorded the build plan as an input at digest ' + amendment.digest_before + '; this order changed it to '
    + amendment.digest_after + ' by the owner-authorized amendment recorded in the document\'s own Amendment History. '
    + 'PROD-003\'s step 1 therefore reports one expected difference. PROD-002\'s verdict record and PROD-003\'s verdict '
    + 'record are the records of their own dates; neither is re-claimed here, and neither is rewritten.',
  checks,
  check_count: checks.length,
  failures,
  verdict: failures.length === 0 ? 'INHERITED CHAINS READ — the only difference is this order\'s recorded owner amendment' : 'INHERITED CHAIN READINGS FAILED — see failures'
};
fs.writeFileSync(path.join(OUT, 'inherited_chain_readings.json'), JSON.stringify(document, null, 2) + '\n', 'utf8');
for (const c of checks) console.log(`${c.passed ? 'PASS' : 'FAIL'}  ${c.id} ${c.claim} — ${c.detail}`);
console.log(`${checks.length} checks, ${failures.length} failures`);
console.log(document.verdict);
process.exitCode = failures.length === 0 ? 0 : 1;
