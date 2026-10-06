'use strict';
/**
 * inputs_001t.cjs — PHASE5-001T shared inputs.
 *
 * A rank-6 order artifact of PHASE5-001T (Gate 5.6 validation for one scope). It admits no rule, creates no
 * coverage, authorises no finding class, produces no consumer-visible output and changes no application
 * behaviour. It reads the pinned artifacts by digest and writes only inside this order's own package.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001T');
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app';

const ORDER_ID = 'PHASE5-001T';
const CREATED_UTC = '2026-09-30';
const SCOPE_ID = 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT';
const UNIT_ID = 'CA-NS-CRA-S10-3-C-LIMB-1';
const PRE_ADMISSION_IDENTITY = 'CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3';

const PATHS = {
  rule_record: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json',
  crosswalk: 'SOURCE_CAPTURES\\PROD-003\\crosswalk.json',
  register: 'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json',
  fact_model: 'SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json',
  status_vocabulary: 'SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json',
  specification: 'SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json',
  evaluator: 'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs',
  determinism_check: 'SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json',
  output_surface: 'SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json',
  plan: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md',
  gate_5_5_successor: 'SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json',
  order: 'SOURCE_CAPTURES\\PHASE5-001S\\next_work_order.json',
  owner_decisions: 'SOURCE_CAPTURES\\PHASE5-001S\\owner_decisions.json',
  custody_supplement: 'SOURCE_CAPTURES\\PHASE5-001S\\custody_supplement.json',
  withheld_gate_5_5_verdict: 'SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json',
  implementation_comparison: 'SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json',
  superseded_draft: 'SOURCE_CAPTURES\\PHASE5-001R\\next_work_order.json',
  retained_test_results: 'SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json',
  source_pin: 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts',
  specimen_pr01: 'packages\\backend\\fixtures\\reports\\equifax-david-webb.pdf',
  specimen_pr02: 'packages\\backend\\fixtures\\reports\\transunion-david-webb.pdf',
};

/** The eight labels and label classes this unit may never produce, quoted from the explanation surface. */
const FORBIDDEN_LABELS = [
  'VIOLATION', 'PROBABLE_VIOLATION', 'any other finding label or finding class, however phrased',
  'BREACH_ESTABLISHED and any synonym of an established breach',
  'COMPLIANT, WITHIN_THE_LIMIT and any statement that the report or the debt satisfies the provision',
  'any statement that the provision applied to this debt at the relevant time',
  'any statement that the report is inaccurate, unlawful or actionable',
  'any request for additional consumer evidence',
];

/** Plain tokens that would betray an overstatement or a finding label in rendered text. */
const OVERSTATEMENT_TOKENS = [
  'violation', 'probable violation', 'breach', 'breached', 'unlawful', 'illegal', 'actionable',
  'compliant', 'within the limit', 'within limit', 'satisfies the provision', 'the provision applied',
  'applied to this debt', 'inaccurate', 'liable', 'entitled to compensation', 'you are owed', 'we found',
  'the payment occurred', 'it is established', 'confirmed violation', 'proof that',
];

function abs(rel) { return path.isAbsolute(rel) ? rel : path.join(ROOT, rel); }
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase(); }
function sha256Text(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase(); }
function readText(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function readJson(rel) { return JSON.parse(readText(rel)); }
function readOutJson(name) { return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')); }
function writeJson(name, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(path.join(OUT, name), text, 'utf8');
  return { artifact: name, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256Text(text) };
}
function pinReport(rels) {
  const list = rels || Object.keys(PINS);
  return list.map((rel) => {
    const measuredSha = sha256File(abs(rel));
    return {
      path: rel,
      pinned_sha256: PINS[rel] || null,
      measured_sha256: measuredSha,
      bytes: fs.statSync(abs(rel)).size,
      state: PINS[rel] ? (PINS[rel] === measuredSha ? 'MATCHES_THE_PIN' : 'DOES_NOT_MATCH_THE_PIN') : 'UNPINNED_INPUT',
    };
  });
}
function requireEvaluator() { return require(path.join(ROOT, PATHS.evaluator)); }
/** The eleven pins the work order names, exactly as the order records them. */
const PINS = {
  'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json': 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023',
  'SOURCE_CAPTURES\\PROD-003\\crosswalk.json': '51BFCDB73371D3A1F5DACDB35DC9BC465D8548C8D6B6283FE0371AAAB6C20E13',
  'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json': '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A',
  'SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json': '4967DD57966DCC9D02D565FDDF717C924759F3CD04F6206798C1ACDA8702D6D9',
  'SOURCE_CAPTURES\\PHASE5-001R\\extraction_status_vocabulary.json': 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7',
  'SOURCE_CAPTURES\\PHASE5-001R\\deterministic_evaluator_specification.json': '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755',
  'SOURCE_CAPTURES\\PHASE5-001R\\evaluator_001r.cjs': '4D1EBEFBE8524523A20E22BAF0E0FCAA48A7CB8F109E49D61890410D96C07F7E',
  'SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json': 'BB5490B392000644C84D2BF67089A3A5824D4BF51CCB2ED172A1AA521C8119C3',
  'SOURCE_CAPTURES\\PHASE5-001R\\output_vocabulary_and_explanation_surface.json': '6807E384CFEAADD8CED1CCA7018F04B71EB9F492AC050EED69D4D58C5EBB4ADD',
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md': '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50',
  'SOURCE_CAPTURES\\PHASE5-001S\\scoped_gate_5_5_verdict_successor.json': '1B764B4DB13AD9C532E4FBF1547E78376B5EFA297F8443E6B05D622345C47169',
};



module.exports = {
  ROOT, OUT, LEGACY, ORDER_ID, CREATED_UTC, SCOPE_ID, UNIT_ID, PRE_ADMISSION_IDENTITY,
  PATHS, PINS, FORBIDDEN_LABELS, OVERSTATEMENT_TOKENS,
  abs, sha256File, sha256Text, readText, readJson, readOutJson, writeJson, pinReport, requireEvaluator,
};

