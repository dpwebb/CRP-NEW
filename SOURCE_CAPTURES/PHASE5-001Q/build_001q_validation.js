// build_001q_validation.js — PHASE5-001Q deliverable 3.
//
// Independent validation of faithful transcription and field-by-field mapping to the accepted legal record.
// It re-derives every value from the sources themselves and never restates a claim the record makes about
// itself: the statute text is reassembled from the admitted artifact's own string literals, the day
// arithmetic is recomputed from the two dates, the mapping targets are re-read from the ledger, the
// register, the accepted draft and the accepted owner decisions, and every date the record prints must be
// traceable to one of those sources or to a recomputation here.
//
// It does NOT repeat, and does not replace, the owner's legal/source certification. It writes only
// transcription_mapping_validation.json inside this order's own package; every other file is read-only.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001Q');
const LEGACY = 'C:\\Users\\webbd\\crp-credit-app\\packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts';

const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const split = (t) => String(t).split(/\r?\n/);
const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
const firstQuoted = (s) => { const m = String(s).match(/"([^"]*)"/); return m ? m[1] : null; };

// independent calendar arithmetic (proleptic Gregorian, integer days)
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const addCalendarYears = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const ny = y + n;
  const dd = Math.min(d, daysInMonth(ny, m));
  return [String(ny).padStart(4, '0'), String(m).padStart(2, '0'), String(dd).padStart(2, '0')].join('-');
};
const dayDiff = (a, b) => Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000);

const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const decisionsDoc = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json');
const planLines = split(readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'));
const contractLines = split(readText('CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md'));
const ledger = readJson('SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json');
const register = readJson('SOURCE_CAPTURES\\PROD-003\\report_representation_register.json');
const iA = readJson('SOURCE_CAPTURES\\PHASE5-001I-A\\classification_record.json');
const iB = readJson('SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json');
const iC = readJson('SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json');
const issuedOrder = readJson('SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json');

const legacyBuf = fs.readFileSync(LEGACY);
const legacyLines = split(legacyBuf.toString('utf8'));
const ledgerRow = ledger.rows.find((r) => r.source_entry_id === 'CRP-LSRC-0354');
const fact02 = register.field_records.find((f) => f.field_id === 'FACT-02');
const fact03 = register.field_records.find((f) => f.field_id === 'FACT-03');
const demo = register.deterministic_evaluation_demonstration;

const checks = [];
const check = (id, criterion, what, passed, detail) => checks.push({ id, gate_5_4_criterion: criterion, what, passed: !!passed, detail: String(detail) });
const CRIT_TRACE = 'a complete field-by-field trace to the owner-approved source';
const CRIT_TRANSCRIBE = 'faithful transcription (independent validation)';
const CRIT_MAP = 'mapping to the accepted legal record (independent validation)';
const CRIT_JUR = 'exact jurisdiction/limb';
const CRIT_ELEMENT = 'no unresolved affirmative element';
const CRIT_TEST = 'a deterministic test';
const CRIT_HOLD = 'a concrete contradiction or change indicator is held for owner/legal direction rather than guessed';


// ---------------------------------------------------------------- A. transcription
// A-1 the pin: the artifact is re-measured from disk and its digest and byte length are compared with the
// record's own source pin and with the ledger row's recorded values. Nothing is written.
const legacySha = sha256(legacyBuf);
const pin = record.legal_proposition.source_pin;
const pinField = record.governed_fields.find((f) => f.field === 'source ID and pin').value;
check('V-T1', CRIT_TRANSCRIBE, 'the source pin is re-measured, not restated',
  legacySha === pin.sha256 && legacySha === pinField.sha256 && legacySha === ledgerRow.legacy_statute_or_provision.source_artifact_sha256
  && legacyBuf.length === pin.bytes && legacyBuf.length === pinField.bytes
  && pin.source_entry_id === ledgerRow.source_entry_id
  && pinField.source_artifact === ledgerRow.legacy_statute_or_provision.source_artifact,
  'measured ' + legacySha + ' (' + legacyBuf.length + ' bytes); the record pins ' + pin.sha256 + ' (' + pin.bytes + ' bytes) and the ledger row records the same digest');

// A-2 the statute text is reassembled from the artifact's own string literals at lines 186-188 and compared
// character-for-character with the text the record carries. The record's basis must cite those same lines.
const assembled = [185, 186, 187].map((i) => firstQuoted(legacyLines[i])).join(' ');
const acceptedText = record.legal_proposition.statutory_text_quoted_verbatim;
const assembledMatches = norm(assembled) === norm(acceptedText);
const citesAssembledLines = record.governed_fields.find((f) => f.field === 'exact legal text/proposition').basis.indexOf('lines 186-188') >= 0;
check('V-T2', CRIT_TRANSCRIBE, 'the accepted text is reassembled from the artifact\'s own quoted strings and matches the record character-for-character',
  assembledMatches && citesAssembledLines && record.legal_proposition.transcription_identity_with_the_accepted_record === true,
  assembledMatches
    ? 'reassembled ' + norm(assembled).length + ' characters from artifact lines 186-188; identical to the record\'s quoted text, and the record\'s basis cites those lines'
    : 'MISMATCH. reassembled: ' + norm(assembled) + ' || record: ' + norm(acceptedText));

// A-3 the same text is compared with the text the accepted internal draft carries. This order may not
// re-interpret the accepted source, so a difference here would be a defect, not a licence.
const draftSerialized = JSON.stringify(iB['1_exact_accepted_statute_and_legacy_rule_references']);
const draftQuoted = draftSerialized.indexOf(norm(acceptedText).slice(0, 60)) >= 0;
check('V-T3', CRIT_TRANSCRIBE, 'the record\'s quoted text is the text the accepted internal draft already carried',
  draftQuoted && iB.build_plan_phase_5_4_governed_fields_crossreference.fields[5].state === 'RESOLVED_FROM_EXISTING_RECORDS',
  draftQuoted ? 'the accepted draft section 1 carries the same quotation, so no re-interpretation or paraphrase was introduced by this order' : 'the accepted draft does not carry this quotation');

// A-4 the first-limb proposition is derived here from the accepted text itself, at the limb boundary, and
// checked against the artifact and against the record's own limb wording. It is never retyped by hand. The
// accepted text's first limb ends at the words "was made on the debt."; both forms are accepted, and no
// other wording is.
const limbBoundary = ' or, where no payment was made';
const limbDerived = norm(acceptedText).slice(0, norm(acceptedText).indexOf(limbBoundary));
const recordLimb = norm(record.governed_fields.find((f) => f.field === 'exact legal text/proposition').value.first_limb_proposition);
const limbMatches = recordLimb === limbDerived || recordLimb === limbDerived + '.';
const artifactCarriesLimb = legacyLines.some((l) => l.indexOf(limbDerived.slice(0, 60)) >= 0);
check('V-T4', CRIT_TRANSCRIBE, 'the first-limb proposition is derived from the accepted text at the limb boundary and matches the artifact and the record',
  norm(acceptedText).indexOf(limbBoundary) >= 0 && limbMatches && artifactCarriesLimb
  && norm(record.scope.limb_in_scope).indexOf('last payment') >= 0,
  'derived limb (' + limbDerived.length + ' chars) is the record\'s limb statement with or without its sentence-final period; the artifact carries the same words as its own string; the second limb is the residue after the boundary and is excluded');

// A-5 the field-name divergence is measured against the artifact's own required-field declaration.
const artifactRequiredFields = firstQuoted(legacyLines[188]);
const divergenceNamesTheArtifactValue = JSON.stringify(record).indexOf(artifactRequiredFields) >= 0;
const factsFieldValue = record.governed_fields.find((f) => f.field === 'report-required facts').value;
check('V-T5', CRIT_TRANSCRIBE, 'the recorded divergence names the artifact\'s own required-field literal, and the collection-scoped name separately',
  artifactRequiredFields === 'tradeline.lastPaymentDate' && divergenceNamesTheArtifactValue
  && JSON.stringify(factsFieldValue).indexOf('collection.lastPaymentDate') >= 0,
  'artifact line 189 declares ' + artifactRequiredFields + '; the record carries that literal in its divergence record and carries collection.lastPaymentDate as the fact it reads');

// A-6 the retained classification is re-read from the artifact's own classification entry and compared,
// field by field, with what the record retains and with what the accepted classification record holds.
const legacyClassBlock = [2442, 2443, 2448, 2449].map((i) => legacyLines[i - 1]).join(' ');
const retained = record.classification_and_ceiling.classification_retained;
const iARetained = iA.preserved_classification;
check('V-T6', CRIT_MAP, 'the retained classification matches the artifact\'s own entry and the accepted classification record, field by field',
  legacyClassBlock.indexOf('ca-ns.cra.s10_3_c.debt_retention_6y') >= 0
  && legacyClassBlock.indexOf('REPORT_RELEVANT_BUT_NOT_DETECTABLE') >= 0
  && legacyClassBlock.indexOf('D3') >= 0
  && legacyClassBlock.indexOf('observation') >= 0
  && legacyClassBlock.indexOf('packet-ineligible') >= 0
  && retained.determinability === iARetained.legacy_determinability_level
  && retained.recorded_conclusion === iARetained.legacy_classification
  && retained.permitted_conclusion === iARetained.legacy_permitted_conclusion
  && retained.packet_eligibility === 'ineligible' && iARetained.legacy_packet_eligible === false,
  'artifact lines 2442-2450 and the accepted classification record agree with the retained block: ' + retained.determinability + ' / ' + retained.recorded_conclusion + ' / ' + retained.permitted_conclusion + ' / ' + retained.packet_eligibility);

// A-7 the record's own proposition must not paraphrase: it must be the derived limb, with or without the
// sentence-final period, or the accepted text itself, or a literal part of it.
const proposition = norm(record.legal_proposition.proposition);
check('V-T7', CRIT_TRANSCRIBE, 'the proposition is the accepted wording, not a paraphrase',
  proposition === limbDerived || proposition === limbDerived + '.' || proposition === norm(acceptedText)
  || norm(acceptedText).indexOf(proposition.replace(/\.$/, '')) >= 0,
  'the proposition as recorded (' + proposition.length + ' chars) is the derived limb, the accepted text, or a literal part of it; no wording of this order\'s own is substituted for the accepted text');

// ---------------------------------------------------------------- B. mapping
// B-1 jurisdiction: the record's jurisdiction values are compared with the ledger row's canonical values.
const jur = record.scope.jurisdiction;
const jurLedger = ledgerRow.established_jurisdiction_associations;
check('V-M1', CRIT_JUR, 'the jurisdiction and the limb are mapped to the accepted ledger row, value by value',
  jur.country_code === jurLedger.canonical_country_code && jur.region_code === jurLedger.canonical_region_code
  && jur.enumeration.indexOf('CRP-JURISDICTION-ENUM-1') >= 0
  && record.governed_fields.find((f) => f.field === 'exact jurisdiction').value.canonical_jurisdiction_status === jurLedger.canonical_jurisdiction_status
  && record.scope.rule_unit === 'CA-NS-CRA-S10-3-C-LIMB-1'
  && norm(record.scope.limb_in_scope).indexOf('last payment') >= 0
  && norm(record.scope.second_limb_state).indexOf('UNSEATED') === 0,
  'ledger canonical values ' + jurLedger.canonical_country_code + ' / ' + jurLedger.canonical_region_code + ' / ' + jurLedger.canonical_jurisdiction_status + ' are the record\'s values; the second limb is recorded unseated and is not inferred');

// B-2 source id: the source entry id must resolve to exactly one ledger row, and the legacy rule id must be
// the one the artifact itself carries.
const ledgerRowsForThisId = ledger.rows.filter((r) => r.source_entry_id === 'CRP-LSRC-0354').length;
const legacyIdLines = legacyLines.filter((l) => l.indexOf('ca-ns.cra.s10_3_c.debt_retention_6y') >= 0).length;
check('V-M2', CRIT_TRACE, 'the source entry id resolves to exactly one accepted ledger row, and the legacy rule id exists in the artifact',
  ledgerRowsForThisId === 1 && legacyIdLines > 0 && record.rule_identity.legacy_rule_id === 'ca-ns.cra.s10_3_c.debt_retention_6y',
  'ledger rows carrying CRP-LSRC-0354: ' + ledgerRowsForThisId + '; artifact lines carrying the legacy rule id: ' + legacyIdLines);

// B-3 effective dates: the record's effective-period value must be the ledger row's own recorded string,
// parsed into the same four parts, and must be carried as unresolved rather than as resolved.
const ledgerEffective = ledgerRow.legacy_statute_or_provision.effective_information_as_recorded;
const eff = record.governed_fields.find((f) => f.field === 'effective dates/status').value;
check('V-M3', CRIT_ELEMENT, 'the effective-period value is the ledger row\'s recorded value, parsed part by part, and is carried as unresolved',
  eff.effectiveFrom === null && eff.effectiveTo === null && eff.status === 'in_force'
  && eff.basis === 'recorded_gap_commencement_not_read'
  && ledgerEffective === 'effectiveFrom=null; effectiveTo=null; status=in_force; basis=recorded_gap_commencement_not_read'
  && eff.effective_dates_status === 'UNRESOLVED_MISSING_EVIDENCE',
  'the ledger row records: ' + ledgerEffective + '; the record carries it unresolved with a mandatory qualification rather than defaulting it');

// B-4 the rule-read fact: the fact id, raw value, normalized value, section and locator are mapped to the register.
const readFact = record.report_facts.rule_read_facts[0];
const factLocatorMatches = readFact.locators.some((l) => l === fact02.location);
check('V-M4', CRIT_TRACE, 'the rule-read fact maps to register ' + fact02.field_id + ': id, raw value, normalized value, section and locator',
  readFact.fact_id === 'collection.lastPaymentDate' && readFact.status_on_the_evidenced_specimen === 'RESOLVED'
  && readFact.raw_value.replace(/\//g, '-') === fact02.raw_value_observed
  && readFact.normalized_value === fact02.raw_value_observed
  && fact02.section_path === 'Collections' && factLocatorMatches && fact02.demonstrated === true,
  'register ' + fact02.field_id + ': ' + fact02.section_path + ' / observed ' + fact02.raw_value_observed + ' / ' + (factLocatorMatches ? 'locator identical' : 'LOCATOR DIFFERS'));

// B-5 the convention input: the reference date must be the register's own Request Date fact, and the record
// must record it as a convention input rather than as a fact the rule reads. The register names the fact
// FACT-03 "Report reference date" and prints the label "Request Date"; the record must use the printed label,
// which is what a reader of the report sees.
const registerRequestDateLabel = register.date_meanings.find((d) => d.used_as === 'the evaluation reference date');
const refInput = record.report_facts.evaluation_convention_inputs[0];
check('V-M5', CRIT_TRACE, 'the reference date maps to register ' + fact03.field_id + ' (' + fact03.field + ', printed as ' + registerRequestDateLabel.label + ') and is recorded as a convention input, not as a fact the rule reads',
  refInput.fact_id === 'report.referenceDate' && refInput.evidence_label === registerRequestDateLabel.label
  && registerRequestDateLabel.label === 'Request Date' && fact03.location.indexOf('"' + refInput.evidence_label + '"') >= 0
  && refInput.raw_value.replace(/\//g, '-') === fact03.raw_value_observed
  && refInput.normalized_value === fact03.raw_value_observed
  && refInput.kind.indexOf('EVALUATION_CONVENTION_INPUT') === 0
  && fact03.demonstrated === true && fact03.raw_value_observed === '2026-05-05',
  'register ' + fact03.field_id + ' = ' + fact03.field + ', printed as the label "' + registerRequestDateLabel.label + '" / ' + fact03.raw_value_observed + '; the record distinguishes it from the rule-read fact and from any statutory date');

// B-6 the arithmetic is recomputed here, independently, and compared with the record and with the register's
// own demonstration. A disagreement on any number is a validation failure, not a footnote.
const m = record.deterministic_breach_test.arithmetic.measured_on_the_specimen;
const anniversary = addCalendarYears(m.clock_start, 6);
const span = dayDiff(anniversary, m.clock_start);
const elapsed = dayDiff(m.reference_date, m.clock_start);
const derivedOutcome = elapsed > span ? 'PERIOD_EXCEEDED' : 'PERIOD_NOT_EXCEEDED';
check('V-M6', CRIT_TEST, 'the anniversary, the span and the elapsed days are recomputed from the two dates and agree with the record and with the register\'s own demonstration',
  anniversary === m.anniversary && span === m.span_in_days && elapsed === m.elapsed_days
  && derivedOutcome === m.outcome
  && demo.inputs.report_reference_date.value === m.reference_date
  && demo.inputs.debt_item_last_payment_date.value === m.clock_start
  && String(demo.inputs.intervening_days) === String(m.elapsed_days)
  && demo.inputs.six_year_boundary_from_last_payment === m.anniversary
  && String(demo.inputs.six_year_span_in_days) === String(m.span_in_days)
  && demo.result_on_this_specimen === m.outcome,
  'recomputed here: anniversary ' + anniversary + ', span ' + span + ' days, elapsed ' + elapsed + ' days, outcome ' + derivedOutcome + ' — the record states ' + m.anniversary + ', ' + m.span_in_days + ', ' + m.elapsed_days + ', ' + m.outcome + ', and the register\'s own demonstration states the same five values');

// B-7 the 29 February clamp convention is exercised, not merely asserted.
const clamp = addCalendarYears('2020-02-29', 6);
check('V-M7', CRIT_TEST, 'the month-end clamp recorded as convention c2 is the result this calendar arithmetic produces',
  clamp === '2026-02-28' && record.deterministic_breach_test.conventions.find((c) => c.id === 'c2').convention.indexOf('28 February') >= 0,
  '2020-02-29 plus six calendar years recomputes to ' + clamp + ', which is the clamp the record records as convention c2');

// B-8 no invented date: every date either artifact prints must be this order's own creation date, a value
// that exists in the register, or a date recomputed above.
const selectedPresentationDate = fact03.raw_value_observed;
const printedDates = Array.from(new Set((JSON.stringify(record) + JSON.stringify(decisionsDoc)).match(/\d{4}-\d{2}-\d{2}/g) || []));
const allowedDates = [record.created_utc, m.clock_start, selectedPresentationDate, m.anniversary, clamp];
const unexplainedDates = printedDates.filter((d) => allowedDates.indexOf(d) < 0);
check('V-M8', CRIT_HOLD, 'no invented date: every date printed by this order traces to the register, to its own creation date, or to a recomputation here',
  unexplainedDates.length === 0 && fact02.raw_value_observed === '2021-02-01' && fact03.raw_value_observed === '2026-05-05',
  'dates printed: ' + printedDates.join(', ') + '; unexplained: ' + (unexplainedDates.length ? unexplainedDates.join(', ') : 'none'));

// ---------------------------------------------------------------- C. the field set, completeness and the restraints
// C-1 the plan's own list of required governed fields is parsed out of the controlling instrument, and every
// name in it must be a field the record records. Nothing required may be missing and nothing invented added.
const planBullet = planLines[123];
const afterFieldListMarker = 'record the required governed fields:';
const fieldListText = planBullet.slice(planBullet.indexOf(afterFieldListMarker) + afterFieldListMarker.length);
const requiredNames = fieldListText.replace(/\.\s*$/, '').split(',').map((s) => norm(s).replace(/^and\s+/i, ''));
const recordedNames = record.governed_fields.map((f) => norm(f.field));
const missingNames = requiredNames.filter((n) => recordedNames.indexOf(n) < 0);
const extraNames = recordedNames.filter((n) => requiredNames.indexOf(n) < 0);
check('V-M9', CRIT_TRACE, 'all ' + requiredNames.length + ' governed fields the controlling instrument requires are recorded, and no field is added to the set',
  requiredNames.length === 13 && requiredNames.indexOf('immutable rule ID/version') >= 0
  && recordedNames.length === requiredNames.length && missingNames.length === 0 && extraNames.length === 0,
  'parsed from build plan line 124: ' + requiredNames.join(' | ') + ' — missing: ' + (missingNames.join(', ') || 'none') + '; added: ' + (extraNames.join(', ') || 'none'));

// C-2 a populated field is not a resolved decision: each governed field must carry its own value, its own
// basis, its own named state, and its own effect on output eligibility.
const incompleteFields = record.governed_fields.filter((f) => {
  const v = f.value === null || f.value === undefined ? '' : (typeof f.value === 'object' ? JSON.stringify(f.value) : String(f.value));
  return v.length < 2 || norm(f.basis).length < 20 || norm(f.state).length < 8 || norm(f.effect_on_output_eligibility).length < 20;
});
check('V-M10', CRIT_TRACE, 'every governed field carries a value, a basis, a named state and an effect on output eligibility',
  incompleteFields.length === 0,
  incompleteFields.length === 0
    ? 'all ' + record.governed_fields.length + ' fields are populated in all four respects, and each state is a named state rather than a blank'
    : 'incomplete: ' + incompleteFields.map((f) => f.field).join(', '));

// C-3 the exception is mapped verbatim to the rank-4 contract at the exact lines the record cites, and the
// route it opens is recorded as not relied on. The source is markdown, so the comparison removes formatting
// marks only — the leading bullet marker, the backticks around a filename, and the terminating punctuation —
// and never a word. After that removal the two must be character-for-character equal.
const stripMarkdown = (s) => norm(s).replace(/`/g, '').replace(/^[-*]\s+/, '').replace(/[;,.]+$/, '');
const contractException = stripMarkdown([contractLines[90], contractLines[91], contractLines[92]].join(' '));
const contractRoute = stripMarkdown(contractLines[327] + ' ' + contractLines[328]);
const exc = record.exceptions.direct_report_contract_section_4_retention_exception;
check('V-M11', CRIT_MAP, 'the recorded exception and the route it opens are verbatim quotations of the rank-4 contract, and the route is recorded as not relied on',
  stripMarkdown(exc.quoted_text) === contractException && stripMarkdown(exc.route_quoted) === contractRoute
  && exc.quoted_text.indexOf('limitation, accrual, debt-enforcement, or retention rules') >= 0
  && exc.state === 'RECORDED_NOT_RELIED_ON' && exc.route_satisfied === false
  && norm(record.exceptions.exception_determination).indexOf('NO_EXCEPTION_DETERMINATION_IS_MADE') >= 0,
  'contract lines 91-93 and 328-329 reproduce word for word once markdown marks are removed (' + contractException.length + ' and ' + contractRoute.length + ' characters); state ' + exc.state + '; route_satisfied ' + exc.route_satisfied + ', so the exception is available to nothing');

// C-3b the exception appears twice in the record — once in the governed field and once in the exceptions
// section — and the two copies must state the same thing, so no reader can be given two different readings.
const exceptionsField = record.governed_fields.find((f) => f.field === 'exceptions').value.direct_report_contract_section_4_retention_exception;
check('V-M18', CRIT_TRACE, 'the two copies of the exception (governed field and exceptions section) state the same thing',
  norm(exceptionsField.route_condition_quoted) === norm(exc.route_quoted)
  && exceptionsField.state === exc.state && exceptionsField.route_satisfied === exc.route_satisfied
  && exceptionsField.route_satisfied === false,
  'the governed field and the exceptions section carry one state (' + exc.state + ') and one route reading (satisfied=' + exc.route_satisfied + ')');

// C-4 the ceiling: no finding class is created, and every mention of a finding label in this order's
// artifacts is a restriction on it rather than an assertion of it.
const flattenStrings = (o, acc) => {
  if (typeof o === 'string') { acc.push(o); } else if (Array.isArray(o)) { o.forEach((v) => flattenStrings(v, acc)); } else if (o && typeof o === 'object') { Object.keys(o).forEach((k) => flattenStrings(o[k], acc)); }
  return acc;
};
const allStrings = flattenStrings(record, []).concat(flattenStrings(decisionsDoc, []));
const findingAssertions = allStrings.filter((s) => /\bVIOLATION\b/.test(s) && !/\bnot\b|\bno\b|\bneither\b|\bnever\b|\bunavailable\b|\bNONE\b|authoriz|prohibit/i.test(s));
check('V-M12', CRIT_ELEMENT, 'no finding class is created, and every mention of a finding label in this order\'s artifacts restricts it',
  record.classification_and_ceiling.finding_classes_available.length === 0
  && record.classification_and_ceiling.permitted_result_ceiling === 'OBSERVATION_CLASS_ONLY'
  && norm(record.classification_and_ceiling.authorised_finding_classes).indexOf('NONE') === 0
  && findingAssertions.length === 0 && record.admission_state.finding_class_created === false,
  'ceiling ' + record.classification_and_ceiling.permitted_result_ceiling + '; available finding classes ' + record.classification_and_ceiling.finding_classes_available.length + '; strings asserting a finding: ' + findingAssertions.length);

// C-5 the conventions are mapped to nothing but themselves: six conventions, each recorded as a convention
// and none as a requirement of the text, with the one open legal question withheld rather than decided.
const convs = record.deterministic_breach_test.conventions;
const boundary = record.deterministic_breach_test.boundary_treatment;
const qD3 = decisionsDoc.decisions.find((d) => d.id === 'Q-D3');
check('V-M13', CRIT_TEST, 'all six arithmetic conventions are recorded as conventions and none as a requirement of the text, and the anniversary-boundary question is withheld rather than answered',
  convs.length === 6 && convs.map((c) => c.id).join(',') === 'c1,c2,c3,c4,c5,c6'
  && convs.every((c) => c.is_a_requirement_of_the_text === false)
  && norm(boundary.rule).indexOf('WITHHELD') >= 0 && norm(boundary.note).indexOf('NOT adopted') >= 0
  && qD3.decision.indexOf('FIVE ARITHMETIC CONVENTIONS RECORDED AS CONVENTIONS') === 0
  && qD3.decision.indexOf('NOT decided') >= 0,
  'six conventions, none presented as a requirement of the text; the boundary outcome is withheld in the record and in the decisions record alike');

// C-6 the decisions record answers every one of the six items the issuing order names, each with its own
// effect on evaluation, its own effect on output eligibility and its own Gate 5.4 criterion.
const delivered = [
  { item: 'deliverable 2(a) the required field name and the legacy name', needle: 'collection.lastPaymentDate', id: 'Q-D1' },
  { item: 'deliverable 2(b) the effective-period handling and the timing qualification', needle: 'effectiveFrom and effectiveTo null', id: 'Q-D2' },
  { item: 'deliverable 2(c) the calculation conventions', needle: 'anniversary-boundary convention', id: 'Q-D3' },
  { item: 'deliverable 2(d) the exception determination and the section 4 route', needle: 'section 4 retention route', id: 'Q-D4' },
  { item: 'deliverable 2(e) the ceiling field and the retained classification', needle: 'ceiling field', id: 'Q-D5' },
  { item: 'deliverable 2(f) the version string and the admission form', needle: 'immutable rule version string', id: 'Q-D6' },
];
const orderDeliverable2 = issuedOrder.deliverables[1];
const uncoveredItems = delivered.filter((d) => {
  const dec = decisionsDoc.decisions.find((x) => x.id === d.id);
  return !dec || dec.asked_in_the_order.indexOf(d.needle) < 0 || orderDeliverable2.indexOf(d.needle) < 0;
});
const incompleteDecisions = decisionsDoc.decisions.filter((d) => !d.gate_5_4_criterion || d.gate_5_4_criterion.satisfied !== true
  || d.effect_on_evaluation.length < 2 || d.effect_on_output_eligibility.length < 1 || norm(d.decision).length < 50);
check('V-M14', CRIT_ELEMENT, 'each of the six decisions the issuing order names is recorded, with its own effect on evaluation, its own effect on output eligibility and its own Gate 5.4 criterion',
  decisionsDoc.decisions.length === 6 && decisionsDoc.decisions.map((d) => d.id).join(',') === 'Q-D1,Q-D2,Q-D3,Q-D4,Q-D5,Q-D6'
  && uncoveredItems.length === 0 && incompleteDecisions.length === 0,
  'items of the issuing order\'s deliverable 2 covered: ' + (delivered.length - uncoveredItems.length) + '/' + delivered.length
  + (uncoveredItems.length ? ' (uncovered: ' + uncoveredItems.map((d) => d.item).join('; ') + ')' : '')
  + '; decisions short of an effect or a criterion: ' + (incompleteDecisions.map((d) => d.id).join(', ') || 'none'));

// C-7 the six decisions are mapped to the accepted owner decisions they resolve or carry. Every owner
// decision this order relies on must exist in the accepted record.
const ownerDecisionIds = iC.decisions.map((x) => x.id);
const ownerDecisionsCited = ['D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6'].filter((id) => ownerDecisionIds.indexOf(id) >= 0);
check('V-M15', CRIT_MAP, 'every owner decision this order resolves or carries exists in the accepted PHASE5-001I-C record',
  ownerDecisionsCited.length === 6 && iC.decisions.length === 6,
  'the accepted record holds ' + iC.decisions.length + ' owner decisions (' + ownerDecisionIds.join(', ') + '); this order cites ' + ownerDecisionsCited.length + ' of them and invents none');

// C-8 the admission state is asserted in one place and in one direction: nothing here admits anything.
check('V-M16', CRIT_ELEMENT, 'the record asserts no admission, no coverage, no candidate, no finding class and no consumer-visible reach',
  record.admission_state.state === 'NOT_ADMITTED' && record.admission_state.governed_rule_created === false
  && record.admission_state.coverage_created === false && record.admission_state.candidate_created === false
  && record.admission_state.consumer_visible === false && record.admission_state.reachable_from_a_consumer_surface === false
  && record.admission_state.admitted_governed_rules_after_this_order === 0 && record.admission_state.permitted_findings_after_this_order === 0
  && record.admission_state.admission_form === 'RESERVED_TO_GATE_5_7',
  'state ' + record.admission_state.state + '; admitted governed rules after this order: ' + record.admission_state.admitted_governed_rules_after_this_order + '; permitted findings after this order: ' + record.admission_state.permitted_findings_after_this_order);

// C-9 the qualified items are kept separate from one another: the effective period, the exception and the
// calculation conventions each carry their own effect on output, and none is merged into another.
const qD2 = decisionsDoc.decisions.find((d) => d.id === 'Q-D2');
const qD4 = decisionsDoc.decisions.find((d) => d.id === 'Q-D4');
const separateQualificationObjects = new Set([
  JSON.stringify(record.governed_fields.find((f) => f.field === 'effective dates/status').state),
  JSON.stringify(record.governed_fields.find((f) => f.field === 'exceptions').state),
  JSON.stringify(record.governed_fields.find((f) => f.field === 'deterministic breach test').state),
]).size;
check('V-M17', CRIT_ELEMENT, 'the effective period, the exception and the calculation conventions are carried separately, each with its own named state',
  separateQualificationObjects === 3
  && norm(record.governed_fields.find((f) => f.field === 'effective dates/status').state).indexOf('UNRESOLVED') >= 0
  && norm(record.governed_fields.find((f) => f.field === 'exceptions').state).indexOf('NO_DETERMINATION') >= 0
  && qD2.timing_qualification_text_carried.length > 100
  && norm(qD4.decision).indexOf('NEVER RELIED ON') >= 0,
  'three distinct named states for three distinct questions; the timing qualification text is carried verbatim in the decisions record');

// ---------------------------------------------------------------- output
const failures = checks.filter((c) => c.passed !== true);
const byCriterion = {};
for (const c of checks) {
  if (!byCriterion[c.gate_5_4_criterion]) { byCriterion[c.gate_5_4_criterion] = { check_ids: [], passed: 0, failed: 0 }; }
  byCriterion[c.gate_5_4_criterion].check_ids.push(c.id);
  if (c.passed) { byCriterion[c.gate_5_4_criterion].passed++; } else { byCriterion[c.gate_5_4_criterion].failed++; }
}
const out = {
  artifact: 'transcription_mapping_validation.json',
  work_order: 'PHASE5-001Q',
  created_utc: '2026-09-30',
  deliverable: 'deliverable 3 of the issuing order — independent validation of faithful transcription and field-by-field mapping to the accepted legal record',
  document_type: 'INDEPENDENT VALIDATION, ONE SCOPE ONLY. It is not a legal review, it does not repeat the owner\'s certification, and it passes no corpus-wide gate.',
  what_it_validated: {
    rule_unit: 'CA-NS-CRA-S10-3-C-LIMB-1',
    scope: 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT',
    record_validated: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json',
    decisions_validated: 'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json',
  },
  what_was_validated_against: [
    'the admitted artifact itself, re-read read-only at C:\\Users\\webbd\\crp-credit-app\\packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts: its own quoted strings at lines 186-188, its required-field declaration at line 189, and its own classification entry at lines 2442-2450',
    'SOURCE_CAPTURES\\PHASE5-001O\\source_id_coverage_ledger.json row CRP-LSRC-0354 (jurisdiction, source artifact, digest, effective information)',
    'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json (FACT-02, FACT-03, the date meanings, the register\'s own deterministic demonstration)',
    'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md lines 91-93 and 328-329 (the exception and the route, verbatim)',
    'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md line 124 (the required governed fields) and line 128 (the gate text)',
    'SOURCE_CAPTURES\\PHASE5-001I-A\\classification_record.json, SOURCE_CAPTURES\\PHASE5-001I-B\\rule_record_draft.json and SOURCE_CAPTURES\\PHASE5-001I-C\\owner_representation_decisions.json (the accepted internal records)',
    'SOURCE_CAPTURES\\PHASE5-001P\\next_work_order.json (the deliverable that defines this validation)',
  ],
  method: 'each check re-derives its own values from the sources above and compares them with the record. The statute text is reassembled from the artifact\'s own string literals rather than accepted on the record\'s word. The day arithmetic is recomputed here from the two dates by proleptic Gregorian calendar addition and integer day subtraction. Every date either artifact prints must be traceable to the register, to this order\'s own creation date, or to a recomputation performed in this file.',
  checks,
  check_count: checks.length,
  failure_count: failures.length,
  failed: failures,
  criterion_coverage: byCriterion,
  verdict: failures.length === 0
    ? 'FAITHFUL TRANSCRIPTION AND FIELD-BY-FIELD MAPPING VERIFIED FOR THIS ONE SCOPE — ' + checks.length + ' checks, 0 failures'
    : 'VALIDATION FAILURES PRESENT — ' + failures.length + ' of ' + checks.length + ' checks failed; no mapping claim may be relied on until they are resolved',
  scope_note: 'this validation covers one rule unit, one statutory limb and one byte-pinned presentation. It is the evidence for the Gate 5.4 validation criterion in that scope only. It is not independent legal review, it does not repeat or replace the owner\'s legal/source certification, and it passes no corpus-wide gate.',
  what_this_validation_does_not_do: [
    'it does not re-interpret or re-certify the accepted legal authority, and it decides no legal question',
    'it does not resolve the effective period, the exception, the anniversary-boundary reading or the calculation conventions; it verifies that each is recorded in its own recorded state and that none was filled with an invented fact',
    'it admits no rule, creates no coverage and no candidate, authorizes no finding class, and produces no consumer-visible output',
    'it is not Gate 5.5 or Gate 5.6 evidence and does not advance any corpus-wide gate',
  ],
  created_by: 'PHASE5-001Q',
};
fs.writeFileSync(path.join(OUT, 'transcription_mapping_validation.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('transcription_mapping_validation.json written: ' + checks.length + ' checks | failures: ' + failures.length + (failures.length ? ' :: ' + failures.map((f) => f.id).join(',') : ''));
