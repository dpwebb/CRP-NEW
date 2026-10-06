'use strict';
/**
 * lib_001u.cjs — PHASE5-001U shared inputs.
 *
 * PHASE5-001U is the owner-authorised version-reservation-resolution and scoped Gate 5.7 admission order for one
 * scope only: SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT. It records one owner decision, applies one
 * amendment to the rank-5 governing build plan through the quoted-replacement procedure, records a successor
 * scoped Gate 5.6 verdict, and — only if every scoped Gate 5.6 criterion passes — executes the reserved Gate 5.7
 * draft: assigns the production identity and version of the one admitted rule unit, binds the admitted package to
 * the validated rule record, crosswalk, evaluator, tests and explanation templates, and records the exact
 * admission scope and output restrictions.
 *
 * It authorises no finding class, produces no consumer-visible output, integrates nothing into the application
 * and deploys nothing. Everything it writes is inside SOURCE_CAPTURES\PHASE5-001U, except the one governing
 * amendment the owner authorised and this order's own narrative.
 *
 * Path convention: source literals are written with forward slashes (so no backslash has to be typed), and the
 * corpus' Windows-style labels are produced at runtime by wr(). Every emitted path is therefore byte-identical in
 * form to the labels the earlier orders record.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BS = String.fromCharCode(92);
function wr(p) { return p.split('/').join(BS); }

const ROOT = 'C:' + BS + 'CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001U');
const LEGACY = 'C:' + BS + 'Users' + BS + 'webbd' + BS + 'crp-credit-app';

const ORDER_ID = 'PHASE5-001U';
const CREATED_UTC = '2026-10-01';
const SCOPE_ID = 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT';
const UNIT_ID = 'CA-NS-CRA-S10-3-C-LIMB-1';

/** The shared, verified, immutable pre-admission identity Gate 5.6 measures version sharing against. */
const PRE_ADMISSION_IDENTITY = 'CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3';
const PRE_ADMISSION_VERSION = 'PRE-ADMISSION-C24CA3FD3AA3';

/** The production identity and version THIS order assigns, if every scoped Gate 5.6 criterion passes. */
const PRODUCTION_VERSION = '1.0.0';
const PRODUCTION_VERSION_STRING = UNIT_ID + '/v' + PRODUCTION_VERSION;
const PRODUCTION_ADMISSION_IDENTITY = UNIT_ID + '@ADMITTED-v' + PRODUCTION_VERSION + '-C24CA3FD3AA3';
const CONTENT_DIGEST_12 = 'C24CA3FD3AA3';

/** Source-literal paths (forward slashes); PATHS below carries the corpus' Windows-style labels. */
const P = {
  rule_record: 'SOURCE_CAPTURES/PHASE5-001Q/rule_record.json',
  crosswalk: 'SOURCE_CAPTURES/PROD-003/crosswalk.json',
  register: 'SOURCE_CAPTURES/PROD-003/report_representation_register.json',
  fact_model: 'SOURCE_CAPTURES/PHASE5-001R/report_fact_model.json',
  status_vocabulary: 'SOURCE_CAPTURES/PHASE5-001R/extraction_status_vocabulary.json',
  specification: 'SOURCE_CAPTURES/PHASE5-001R/deterministic_evaluator_specification.json',
  evaluator: 'SOURCE_CAPTURES/PHASE5-001R/evaluator_001r.cjs',
  determinism_check: 'SOURCE_CAPTURES/PHASE5-001R/internal_determinism_check.json',
  output_surface: 'SOURCE_CAPTURES/PHASE5-001R/output_vocabulary_and_explanation_surface.json',
  gate_5_2_verdict: 'SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_2_verdict.json',
  gate_5_3_verdict: 'SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_3_verdict.json',
  gate_5_4_verdict: 'SOURCE_CAPTURES/PHASE5-001Q/scoped_gate_5_4_verdict.json',
  withheld_gate_5_5_verdict: 'SOURCE_CAPTURES/PHASE5-001R/scoped_gate_5_5_verdict.json',
  gate_5_5_successor: 'SOURCE_CAPTURES/PHASE5-001S/scoped_gate_5_5_verdict_successor.json',
  gate_5_6_verdict: 'SOURCE_CAPTURES/PHASE5-001T/scoped_gate_5_6_verdict.json',
  gate_5_6_order: 'SOURCE_CAPTURES/PHASE5-001T/next_work_order.json',
  fixture_suite: 'SOURCE_CAPTURES/PHASE5-001T/fixture_suite_001t.json',
  negative_tests: 'SOURCE_CAPTURES/PHASE5-001T/negative_tests_001t.json',
  replay_expectations: 'SOURCE_CAPTURES/PHASE5-001T/replay_expectations_frozen.json',
  independent_replay: 'SOURCE_CAPTURES/PHASE5-001T/independent_replay_001t.json',
  consumer_language: 'SOURCE_CAPTURES/PHASE5-001T/consumer_language_validation_001t.json',
  fixture_catalogue_source: 'SOURCE_CAPTURES/PHASE5-001T/fixture_catalogue_001t.cjs',
  fixtures_source: 'SOURCE_CAPTURES/PHASE5-001T/fixtures_001t.cjs',
  inputs_source: 'SOURCE_CAPTURES/PHASE5-001T/inputs_001t.cjs',
  reviewer_source: 'SOURCE_CAPTURES/PHASE5-001T/reviewer_001t.cjs',
  s_amendments: 'SOURCE_CAPTURES/PHASE5-001S/amendment_text.json',
  s_application: 'SOURCE_CAPTURES/PHASE5-001S/amendment_application_result.json',
  s_owner_decisions: 'SOURCE_CAPTURES/PHASE5-001S/owner_decisions.json',
  s_custody_supplement: 'SOURCE_CAPTURES/PHASE5-001S/custody_supplement.json',
  rescreen_register: 'SOURCE_CAPTURES/PHASE5-001K/rescreen_register.csv',
  coverage_summary: 'SOURCE_CAPTURES/PHASE5-001O/coverage_summary.json',
  coverage_ledger: 'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json',
  plan: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md',
  constitution: 'CRP_CORE_CONSTITUTION.md',
  retained_test_results: 'SOURCE_CAPTURES/PHASE5-001I-A/test_results_001i_a.json',
  inherited_suite_harness: 'internal-validation/ca-ns-last-payment-six-year/tests/harness.cjs',
  source_pin: 'packages/backend/src/services/legalCorpus/rules.canada.ts',
  specimen_pr01: 'packages/backend/fixtures/reports/equifax-david-webb.pdf',
  specimen_pr02: 'packages/backend/fixtures/reports/transunion-david-webb.pdf',
};

const PATHS = {};
Object.keys(P).forEach((k) => { PATHS[k] = wr(P[k]); });

/** Every pin this order proceeds on, measured before it wrote anything. Keys are source-slash paths. */
const PINS = {
  'SOURCE_CAPTURES/PHASE5-001Q/rule_record.json': 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023',
  'SOURCE_CAPTURES/PROD-003/crosswalk.json': '51BFCDB73371D3A1F5DACDB35DC9BC465D8548C8D6B6283FE0371AAAB6C20E13',
  'SOURCE_CAPTURES/PROD-003/report_representation_register.json': '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A',
  'SOURCE_CAPTURES/PHASE5-001R/report_fact_model.json': '4967DD57966DCC9D02D565FDDF717C924759F3CD04F6206798C1ACDA8702D6D9',
  'SOURCE_CAPTURES/PHASE5-001R/extraction_status_vocabulary.json': 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7',
  'SOURCE_CAPTURES/PHASE5-001R/deterministic_evaluator_specification.json': '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755',
  'SOURCE_CAPTURES/PHASE5-001R/evaluator_001r.cjs': '4D1EBEFBE8524523A20E22BAF0E0FCAA48A7CB8F109E49D61890410D96C07F7E',
  'SOURCE_CAPTURES/PHASE5-001R/internal_determinism_check.json': 'BB5490B392000644C84D2BF67089A3A5824D4BF51CCB2ED172A1AA521C8119C3',
  'SOURCE_CAPTURES/PHASE5-001R/output_vocabulary_and_explanation_surface.json': '6807E384CFEAADD8CED1CCA7018F04B71EB9F492AC050EED69D4D58C5EBB4ADD',
  'SOURCE_CAPTURES/PHASE5-001T/scoped_gate_5_6_verdict.json': '86886EDBDCF6F13A29B1E10A031339FEB1A6C766D11D599DE0505B03DE4AC94C',
  'SOURCE_CAPTURES/PHASE5-001T/next_work_order.json': 'A0FFBAA0D86FBD360669E2321653025849F18091C91C348DBFCF56FAB2DACA5B',
  'SOURCE_CAPTURES/PHASE5-001T/fixture_suite_001t.json': '13DF5E54C144FDB657D9A51BA0B63C44366B1FAAAB07D7208E58DF4856ACDA17',
  'SOURCE_CAPTURES/PHASE5-001T/negative_tests_001t.json': 'B75655D633A010BE1AE324FFD883AD79490CA01A156A55AF051A220181DB811E',
  'SOURCE_CAPTURES/PHASE5-001T/replay_expectations_frozen.json': 'DDA0CE253C6BA14CFE166599043405FD2B51B52F376D0C7B2C479A2727A250AA',
  'SOURCE_CAPTURES/PHASE5-001T/independent_replay_001t.json': '473176F21866F8EA883979D77C463E306E56AC472B88C8B86DC99A848064C32E',
  'SOURCE_CAPTURES/PHASE5-001T/consumer_language_validation_001t.json': '8344C641ED6318BA741136F7EEC289A9658E81CDFD2DB6FB2BFD76D6C6B446A6',
  'SOURCE_CAPTURES/PHASE5-001T/fixture_catalogue_001t.cjs': '366539C5B9D9C38FA4BAB6D39782E99CBDCD0F303CB762E2D0ADF464F8F7BFF1',
  'SOURCE_CAPTURES/PHASE5-001T/fixtures_001t.cjs': '54745A1BB214C997062033C0C1D60BA1B1CF4221CAC754CB73463AACD0928DCF',
  'SOURCE_CAPTURES/PHASE5-001T/inputs_001t.cjs': 'BEC1202DC6C26573369B349EA7C13FBECC10408BDA165AAAD242849463ADCCD8',
  'SOURCE_CAPTURES/PHASE5-001T/reviewer_001t.cjs': 'C3268B1E6E41A43838020C771E98CD2EE93A169938C10008C7915F49A962908C',
  'SOURCE_CAPTURES/PHASE5-001S/amendment_text.json': '87DF82EE10D4BBBDCD51461A98716B15258AD3EA63176BB554CE6326EEE75BEA',
  'SOURCE_CAPTURES/PHASE5-001S/amendment_application_result.json': 'DC700A7AAC22AC8EBAE80E33EBF7218E657C4C44674BB31EE2099F173DD88556',
  'SOURCE_CAPTURES/PHASE5-001S/owner_decisions.json': '813D9F32AE64F7D1EB61D3A3DECA76F29F2EE83A952279C41D0F85C0655A208F',
  'SOURCE_CAPTURES/PHASE5-001S/custody_supplement.json': 'EDC80B298670067784979A11064CF95A09757A92DBA77C4E18559E03FA8CAA78',
  'SOURCE_CAPTURES/PHASE5-001S/scoped_gate_5_5_verdict_successor.json': '1B764B4DB13AD9C532E4FBF1547E78376B5EFA297F8443E6B05D622345C47169',
  'SOURCE_CAPTURES/PHASE5-001R/scoped_gate_5_5_verdict.json': 'B3A019E65EA056C65BE2956C641D04F8D0E26E989AD2F836ABC4955A9C8A6705',
  'SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_2_verdict.json': '9048B5C47B1587E12CB0DD9A9CCEE7A273BA2E0E6DFCE8B00024FD8082984D19',
  'SOURCE_CAPTURES/PHASE5-001P/scoped_gate_5_3_verdict.json': 'DA45FE408BFD5EC8C8977BDA0943416FC9EFF7B1371D6B065B7F41A04286D391',
  'SOURCE_CAPTURES/PHASE5-001Q/scoped_gate_5_4_verdict.json': '729D5EA0465061AD3DE262F3C8B9447CEACA1CD61F80890D38F88179E61D818D',
  'SOURCE_CAPTURES/PHASE5-001K/rescreen_register.csv': 'DFB78DD20AAD444A4FC5B03D0FDFF11081AD67A454AF80BBBB2CD4CB0C0F24BB',
  'SOURCE_CAPTURES/PHASE5-001O/coverage_summary.json': '16B81448E73C8E526B488CDA1E3D162AAE49A698D3708BCF1620B85536AD97F6',
  'SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json': '99D6E37F3620C77B296488287F9F03C97B428F6D623A0F1D3CB53A691AFEC07D',
  'SOURCE_CAPTURES/PHASE5-001I-A/test_results_001i_a.json': '6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511',
  'internal-validation/ca-ns-last-payment-six-year/tests/harness.cjs': '573C330590D856B61BCA6CFC30DDA020F5F4D316149E7D43C4B0DB981E900787',
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md': '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50',
  'CRP_CORE_CONSTITUTION.md': '64027E2A0CC14EF302C73B3830CADCA3D6B867A8DEC843235A48E5C6B6387C3D',
};

/** The legacy-tree pointer pins (outside the workspace, read-only). */
const LEGACY_PINS = {
  'packages/backend/src/services/legalCorpus/rules.canada.ts': '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF',
  'packages/backend/fixtures/reports/equifax-david-webb.pdf': 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F',
  'packages/backend/fixtures/reports/transunion-david-webb.pdf': '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4',
};

/** The one record and one artifact the amendment of this order reads and writes. */
const AMENDMENT_TARGET = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md';
const NARRATIVE = 'CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md';


/**
 * The binding classification. A change to a SUBSTANTIVE_VALIDATION_INPUT invalidates the validation of the
 * admitted package and requires the affected validation to run again. A change to a GOVERNING_OR_PREDECESSOR_RECORD
 * or to this order's own records is an admission-metadata change and does not by itself invalidate the validation,
 * provided no substantive input moved with it.
 */
const BINDING_CLASSES = {
  SUBSTANTIVE_VALIDATION_INPUT: {
    rule_record: 'the governed rule record this unit was validated against',
    crosswalk: 'the source crosswalk the unit is bound to',
    register: 'the report representation register that pins PR-01',
    fact_model: 'the report fact model the evaluator reads',
    status_vocabulary: 'the extraction-status vocabulary the evaluator reads',
    specification: 'the deterministic evaluator specification',
    evaluator: 'the evaluator itself: the subject under test',
    determinism_check: 'the internal determinism check of the specification',
    output_surface: 'the explanation templates and the output vocabulary',
    fixture_suite: 'the validated fixture suite (33 fixtures, 15 categories)',
    negative_tests: 'the validated negative tests (8)',
    replay_expectations: 'the frozen replay expectations',
    independent_replay: 'the independent replay record',
    consumer_language: 'the consumer-language validation record',
    fixture_catalogue_source: 'the fixture catalogue source',
    fixtures_source: 'the fixture helper source',
    inputs_source: 'the pinned-input source of the Gate 5.6 order',
    reviewer_source: 'the independent reviewer source',
    rescreen_register: 'the corpus rescreen register the counts are read from',
    coverage_summary: 'the corpus coverage summary',
    coverage_ledger: 'the source-ID coverage ledger',
    source_pin: 'the accepted legal authority pin (recorded; absent from this workspace)',
  },
  GOVERNING_OR_PREDECESSOR_RECORD: {
    plan: 'the rank-5 governing build plan, amended by this order under owner authorisation',
    constitution: 'the rank-2 core constitution, read only',
    gate_5_2_verdict: 'the scoped Gate 5.2 verdict',
    gate_5_3_verdict: 'the scoped Gate 5.3 verdict',
    gate_5_4_verdict: 'the scoped Gate 5.4 verdict',
    withheld_gate_5_5_verdict: 'the withheld PHASE5-001R Gate 5.5 verdict, preserved',
    gate_5_5_successor: 'the successor scoped Gate 5.5 verdict',
    gate_5_6_verdict: 'the original scoped Gate 5.6 verdict, preserved as the predecessor',
    gate_5_6_order: 'the Gate 5.6 work order that issued PHASE5-001T',
    s_amendments: 'the PHASE5-001S amendment text',
    s_application: 'the PHASE5-001S amendment application result',
    s_owner_decisions: 'the PHASE5-001S owner decisions',
    s_custody_supplement: 'the PHASE5-001S custody supplement, Owner Decision 1',
    retained_test_results: 'the retained PHASE5-001I-A artifact, read at its digest only',
    inherited_suite_harness: 'the inherited internal-validation harness, never run by this order',
  },
};

const SUBSTANTIVE_KEYS = Object.keys(BINDING_CLASSES.SUBSTANTIVE_VALIDATION_INPUT);
const GOVERNING_KEYS = Object.keys(BINDING_CLASSES.GOVERNING_OR_PREDECESSOR_RECORD);


function abs(rel) { return path.isAbsolute(rel) ? rel : path.join(ROOT, rel); }
function legacyAbs(rel) { return path.join(LEGACY, rel); }
function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase(); }
function sha256Text(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex').toUpperCase(); }
function readText(rel) { return fs.readFileSync(abs(rel), 'utf8'); }
function readJson(rel) { return JSON.parse(readText(rel)); }
function readOutJson(name) { return JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')); }
function outSha(name) { return sha256File(path.join(OUT, name)); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function bytes(rel) { return fs.statSync(abs(rel)).size; }
function writeJson(name, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(path.join(OUT, name), text, 'utf8');
  return { artifact: name, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256Text(text) };
}

/** Measure a pin list. A pin whose file is absent is reported absent, never silently treated as matching. */
function pinReport(keys) {
  const list = keys || Object.keys(PINS);
  return list.map((k) => {
    const label = wr(k);
    const a = abs(label);
    const present = fs.existsSync(a);
    const measured = present ? sha256File(a) : null;
    let state = 'ABSENT_FROM_THIS_WORKSPACE';
    if (present) state = (PINS[k] === measured) ? 'MATCHES_THE_PIN' : 'DOES_NOT_MATCH_THE_PIN';
    return {
      path: label, pinned_sha256: PINS[k] || null, measured_sha256: measured,
      bytes: present ? fs.statSync(a).size : null, present_in_this_workspace: present, state: state,
    };
  });
}

/** The legacy-tree pointers, re-measured read-only. */
function legacyPointers() {
  return Object.keys(LEGACY_PINS).map((k) => {
    const a = legacyAbs(wr(k));
    const present = fs.existsSync(a);
    const measured = present ? sha256File(a) : null;
    return {
      label: wr(k), location: LEGACY + ' (outside the workspace, read-only)',
      measured_sha256: measured, recorded_sha256: LEGACY_PINS[k],
      bytes: present ? fs.statSync(a).size : null,
      state: !present ? 'ABSENT' : (measured === LEGACY_PINS[k] ? 'MATCHES_THE_RECORDED_PIN' : 'DOES_NOT_MATCH_THE_RECORDED_PIN'),
    };
  });
}

/** The substantive binding rows: the artifacts the admission binds, each at its measured digest. */
function bindingRows() {
  return SUBSTANTIVE_KEYS.map((key) => {
    const label = PATHS[key];
    const a = abs(label);
    const present = fs.existsSync(a);
    return {
      key: key, role: BINDING_CLASSES.SUBSTANTIVE_VALIDATION_INPUT[key], path: label,
      present_in_this_workspace: present,
      sha256: present ? sha256File(a) : null,
      bytes: present ? fs.statSync(a).size : null,
      recorded_sha256: PINS[P[key]] || null,
    };
  });
}

/** A canonical digest over a binding map: the admitted package's own identity of content. */
function packageDigest(rows) {
  const lines = rows
    .map((r) => r.key + '|' + r.path + '|' + (r.sha256 || r.recorded_sha256 || 'ABSENT'))
    .sort()
    .join('\n');
  return sha256Text(lines + '\n');
}

function requireEvaluator() { return require(path.join(ROOT, PATHS.evaluator)); }
function requireFixtureCatalogue() { return require(path.join(ROOT, PATHS.fixture_catalogue_source)); }

module.exports = {
  BS, wr, ROOT, OUT, LEGACY, ORDER_ID, CREATED_UTC, SCOPE_ID, UNIT_ID,
  PRE_ADMISSION_IDENTITY, PRE_ADMISSION_VERSION,
  PRODUCTION_VERSION, PRODUCTION_VERSION_STRING, PRODUCTION_ADMISSION_IDENTITY, CONTENT_DIGEST_12,
  PATHS, P, PINS, LEGACY_PINS, BINDING_CLASSES, SUBSTANTIVE_KEYS, GOVERNING_KEYS,
  AMENDMENT_TARGET, NARRATIVE,
  abs, legacyAbs, sha256File, sha256Text, readText, readJson, readOutJson, outSha, writeJson,
  exists, bytes, pinReport, legacyPointers, bindingRows, packageDigest,
  requireEvaluator, requireFixtureCatalogue,
};

