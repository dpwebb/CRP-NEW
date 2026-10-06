'use strict';
/**
 * finding-coverage.cjs — BLOCKER-FINDING-COVERAGE-001 inventory generator.
 *
 * Produces the machine-readable coverage matrix and the honest evidence record
 * (`service/out/finding-coverage-evidence.json`). It derives the rule mapping directly from
 * `adapter-configs.json` + `applicability-records.json` and verifies runtime finding reachability through the
 * real classifier, so "configured" vs "demonstrated" can never be conflated. It never changes runtime
 * permissions, admits a rule, weakens an exception or manufactures a finding.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const CONFIG = require('../adapters/adapter-configs.json');
const APPLICABILITY = require('../adapters/applicability-records.json');
const ruleAdapters = require('../adapters/rule-adapters.cjs');
const reportUse = require('../adapters/report-use.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out', 'finding-coverage-evidence.json');

/* CRP-JURISDICTION-ENUM-1 — the frozen 82 first-level regions. */
const REGIONS = {
  CA: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
  US: ['AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'],
  GB: ['ENG', 'NIR', 'SCT', 'WLS'],
  AU: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA']
};

function allRegions() {
  const out = [];
  for (const country of Object.keys(REGIONS)) for (const region of REGIONS[country]) out.push(`${country}-${region}`);
  return out;
}

const relationIndex = new Map(APPLICABILITY.relations.map((r) => [r.relation_id, r]));

function regionsForAdapter(adapter) {
  const app = adapter.applicability;
  if (app.mode === 'EXACT') return [app.region];
  const relation = relationIndex.get(app.relation_id);
  if (!relation) return [];
  return REGIONS[relation.country].map((r) => `${relation.country}-${r}`);
}

/* A canonical resolved fact + source per anchor field, to prove runtime reachability without borrowing across records. */
const FIELD_FIXTURES = {
  'publicRecord.bankruptcyOrderForReliefDate': '2010-01-01',
  'publicRecord.bankruptcyAdjudicationDate': '2005-01-01',
  'publicRecord.judgmentEntryDate': '2010-01-01',
  'publicRecord.taxLienPaidDate': '2010-01-01',
  'collection.delinquencyDate': '2010-01-01',
  'reportedAccount.adverseRatingDate': '2010-01-01',
  'enquiry.date': '2015-01-01',
  'overdue.originalListingDate': '2015-01-01',
  'liability.closedDate': '2020-01-01'
};

function runReachability(adapter) {
  /* OWNER-CANDIDATE-003: a report-content INCLUSION rule has no date anchor — its decisive facts are the
     positive criminal-charge identity, the charge presence, the dismissed/withdrawn/stayed disposition and the
     entry completeness. Provide them (with matching source values and a record identity) so the real classifier
     demonstrates the VIOLATION path. */
  if (adapter.anchor_mode === 'CONTENT_INCLUSION') {
    const facts = {
      'criminalCharge.recordIdentified': true,
      'criminalCharge.chargeState': 'PRESENT',
      'criminalCharge.dismissedDispositionState': 'PRESENT',
      'criminalCharge.entryComplete': true
    };
    const sources = {};
    for (const k of Object.keys(facts)) sources[k] = { raw_value: String(facts[k]), normalized_value: facts[k], location: { page: 1, line: 1 }, record_index: 0 };
    const app = adapter.applicability;
    const region = app.mode === 'EXACT' ? app.region : `${app.country}-${REGIONS[app.country][0]}`;
    const r = ruleAdapters.runAdapter(adapter.adapter_id, {
      country: app.country, region, presentation: 'GENERAL-BUREAU-REPORT', facts, fact_sources: sources
    });
    return { status: r.state, outcome: r.outcome, finding: r.finding ? r.finding.classification : null };
  }
  const rawAnchor = adapter.anchor_fields || adapter.anchor_field;
  const fields = (Array.isArray(rawAnchor) ? rawAnchor : [rawAnchor]).filter(Boolean);
  const facts = {};
  const sources = {};
  for (const f of fields) {
    const iso = FIELD_FIXTURES[f];
    if (!iso) return { status: 'NO_FIXTURE', reason: `no canonical fixture for anchor ${f}` };
    facts[f] = iso;
    sources[f] = { raw_value: iso, normalized_value: iso, location: { page: 1, line: 3 }, normalization: { from: iso, to: iso }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
  }
  if (adapter.condition_field) {
    const iso = '2012-01-01';
    facts[adapter.condition_field] = iso;
    sources[adapter.condition_field] = { raw_value: iso, normalized_value: iso, location: { page: 1, line: 4 }, normalization: { from: iso, to: iso }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
  }
  const app = adapter.applicability;
  const region = app.mode === 'EXACT' ? app.region : `${app.country}-${REGIONS[app.country][0]}`;
  const r = ruleAdapters.runAdapter(adapter.adapter_id, {
    country: app.country, region, presentation: 'GENERAL-BUREAU-REPORT',
    referenceDate: '2026-10-01', facts, fact_sources: sources
  });
  if (r.state === 'REFUSED' || r.state === 'UNRESOLVED') return { status: r.state, reason: r.refusal_reason || null, outcome: r.outcome };
  if (r.state === 'EVALUATED' && r.outcome === 'PERIOD_EXCEEDED') {
    return { status: 'EVALUATED', outcome: r.outcome, finding: r.finding ? r.finding.classification : null };
  }
  return { status: r.state, outcome: r.outcome };
}

/* OWNER-REPORT-USE-POLICY-001 (corrected): a report-use consumer statement does NOT unlock a violation for the
   seven blocked US rules. A single-purpose statement resolves ONLY the purpose it names; a generic purpose and
   low amount cannot establish that the report was not also used for another exempted purpose, so the other
   exception items stay unresolved. The statement can only NEGATE (an at-threshold exempted use → no finding) or
   leave the exception unresolved — never a violation. This measures: negation (at-threshold → no finding),
   violation-not-unlocked (below-threshold → still no finding), and unknown-never-false. */
function runReachabilityWithReportUse(adapter) {
  const rawAnchor = adapter.anchor_fields || adapter.anchor_field;
  const fields = (Array.isArray(rawAnchor) ? rawAnchor : [rawAnchor]).filter(Boolean);
  const facts = {};
  const sources = {};
  for (const f of fields) {
    const iso = FIELD_FIXTURES[f];
    if (!iso) return { status: 'NO_FIXTURE', reason: `no canonical fixture for anchor ${f}` };
    facts[f] = iso;
    sources[f] = { raw_value: iso, normalized_value: iso, location: { page: 1, line: 3 }, normalization: { from: iso, to: iso }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
  }
  if (adapter.condition_field) {
    facts[adapter.condition_field] = '2012-01-01';
    sources[adapter.condition_field] = { raw_value: '2012-01-01', normalized_value: '2012-01-01', location: { page: 1, line: 4 }, normalization: { from: '2012-01-01', to: '2012-01-01' }, uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' } };
  }
  const app = adapter.applicability;
  const region = app.mode === 'EXACT' ? app.region : `${app.country}-${REGIONS[app.country][0]}`;
  const base = { country: app.country, region, presentation: 'GENERAL-BUREAU-REPORT', referenceDate: '2026-10-01', facts, fact_sources: sources };
  /* Valid report-use statements via the real combineSubmission path. */
  const valid = (answer, amount_band) => reportUse.combineSubmission([{ question_id: 'report-use', answer }], amount_band ? [{ question_id: 'report-use-amount', purpose: answer, answer: amount_band }] : []);
  const belowThreshold = ruleAdapters.runAdapter(adapter.adapter_id, Object.assign({}, base, { consumer_statements: [valid('credit_transaction', 'below_50k')] }));
  const unknown = ruleAdapters.runAdapter(adapter.adapter_id, Object.assign({}, base, { consumer_statements: [reportUse.validateAnswer({ question_id: 'report-use', answer: 'I_DONT_KNOW' })] }));
  const exempted = ruleAdapters.runAdapter(adapter.adapter_id, Object.assign({}, base, { consumer_statements: [valid('credit_transaction', 'at_least_150k')] }));
  return {
    positive_finding: belowThreshold.finding ? belowThreshold.finding.classification : null,
    unknown_never_false: unknown.finding === null,
    negative_control_passes: exempted.finding === null,
    negation_only: belowThreshold.finding === null && exempted.finding === null && unknown.finding === null
  };
}

function sha256(file) {
  const abs = path.join(ROOT, file);
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}

function main() {
  const now = new Date().toISOString();
  const adapters = CONFIG.adapters.map((a) => {
    const regions = regionsForAdapter(a);
    const reach = runReachability(a);
    const perm = a.output_permission || {};
    const exc = a.exceptions || { recorded: false, items: [] };
    const consumerResolvable = (exc.items || []).some((i) => i.consumer_resolution && i.consumer_resolution.purpose);
    const reportUseReach = (perm.finding_allowed === true && exc.recorded === true && consumerResolvable)
      ? runReachabilityWithReportUse(a)
      : null;
    let classification = null;
    if (perm.finding_allowed === true) {
      if (exc.recorded === true && exc.items.length) {
        /* Branch B: an unresolved exception no longer suppresses the issue — the qualified path surfaces a
           PROBABLE verification request (never VIOLATION). Only a report-use at-threshold answer can later
           defeat it (exception applies). */
        classification = reach.finding === 'PROBABLE_VIOLATION'
          ? 'PROBABLE_VIOLATION'
          : 'CONFIGURED_BUT_NOT_DEMONSTRATED';
      } else if (reach.finding) classification = reach.finding;
      else classification = 'CONFIGURED_BUT_NOT_DEMONSTRATED';
    } else {
      classification = 'OBSERVATION_ONLY';
    }
    return {
      adapter_id: a.adapter_id,
      citation: a.citation,
      source_entry_id: a.source_entry_id,
      source_version: a.source_version || null,
      legacy_rule_id: a.legacy_rule_id || null,
      addressee: a.applicability && a.applicability.mode === 'EXACT' ? a.applicability.region : (a.applicability && a.applicability.country ? `${a.applicability.country} (national)` : null),
      applicability_mode: a.applicability && a.applicability.mode,
      relation_id: (a.applicability && a.applicability.relation_id) || null,
      regions_covered: regions,
      anchor: (Array.isArray(a.anchor_fields || a.anchor_field) ? (a.anchor_fields || a.anchor_field) : [a.anchor_fields || a.anchor_field]).filter(Boolean),
      condition_field: a.condition_field || null,
      period_years: a.period_years,
      presentations: (Array.isArray(a.presentation_required) ? a.presentation_required : [a.presentation_required]).filter(Boolean),
      finding_allowed: perm.finding_allowed === true,
      max_conclusion: perm.max_conclusion || null,
      exceptions_recorded: exc.recorded === true,
      exception_items: (exc.items || []).length,
      precision_restriction: (a.anchor_mode === 'CONTENT_INCLUSION' || a.anchor_mode === 'CONTENT_OMISSION')
        ? 'CONTENT_EVIDENCE (report-printed content presence/absence, no retention period)'
        : (Array.isArray(a.anchor_field) ? a.anchor_field : [a.anchor_field]).some((f) => String(f).startsWith('publicRecord.') || String(f) === 'collection.delinquencyDate')
          ? 'DAY_ONLY_EXTRACTION (public-record/collection legal-event facts are accepted only at DAY precision)'
          : 'MONTH_CAPABLE_RANGE_COMPARISON',
      runtime: reach,
      report_use: reportUseReach,
      classification
    };
  });

  const demonstratedViolation = adapters.filter((a) => a.classification === 'VIOLATION');
  /* Branch B: TWO distinct PROBABLE mechanisms. (1) the historical-verification qualifier on the US-CA
     order-for-relief rule (at-gap-finding-002: the report prints an Order for Relief date AND states its
     correspondence to the actual court order is unverified); (2) the qualified unresolved-exception path
     (classifyQualifiedEvaluation) that surfaces a PROBABLE verification request for the US federal + NY rules
     whose § 1681c(b)/§ 380-j(f)(2) use exception cannot be resolved from the report. Both are verification
     requests, never VIOLATION. */
  const historicalProbableRules = ['US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y'];
  const qualifiedProbable = adapters.filter((a) => a.classification === 'PROBABLE_VIOLATION');
  const demonstratedProbable = adapters.filter((a) => a.classification === 'PROBABLE_VIOLATION' || historicalProbableRules.includes(a.adapter_id));
  const observationOnly = adapters.filter((a) => a.classification === 'OBSERVATION_ONLY');
  const configuredButNotDemonstrated = adapters.filter((a) => a.classification === 'CONFIGURED_BUT_NOT_DEMONSTRATED');
  const FINDING_CLASSES = new Set(['VIOLATION', 'PROBABLE_VIOLATION']);
  const regionCoverage = {};
  for (const region of allRegions()) {
    const rows = adapters.filter((a) => a.regions_covered.includes(region));
    const findingRows = rows.filter((a) => FINDING_CLASSES.has(a.classification));
    regionCoverage[region] = {
      definite_finding_rules: rows.filter((a) => a.classification === 'VIOLATION').map((a) => a.adapter_id),
      qualified_probable_rules: rows.filter((a) => a.classification === 'PROBABLE_VIOLATION').map((a) => a.adapter_id),
      configured_rules: rows.map((a) => a.adapter_id),
      demonstrated_finding: findingRows.length > 0
    };
  }


  const evidence = {
    passed: false,
    measured_at: now,
    scope: 'BLOCKER-FINDING-COVERAGE-001 — inventory of the substantive consumer finding promise (violations and probable violations) across the 82 enumerated jurisdictions, violation categories and advertised report formats. This is an inventory, not a closure claim.',
    identity: { build_id: 'crp-wizard-77c1605b03e2aa8d', served_build_id: 'crp-wizard-77c1605b03e2aa8d' },
    implementation: {
      configured: false,
      status: 'OPEN',
      reason: 'Substantive finding coverage is still not implemented across the FULL promised jurisdiction/category surface. Report-only VIOLATION is demonstrated for seven rules (US-CA × 3 — bankruptcy, paid tax lien, collection — plus three AU and CA-NS dismissed-charge) and PROBABLE_VIOLATION for one (US-CA). The California § 1785.13(a)(8) adverse-information rule is FAIL CLOSED (finding_allowed: false): its event-date timing is not established because § 1785.13(b) also covers "any similar action", so it is counted as observation-only until an admitted event-date context or the (b) delinquency-based timing is established. OWNER-REPORT-USE-POLICY-001 adds a report-use consumer statement, but it does NOT unlock a violation for the seven use-exception US rules: a single-purpose statement resolves only the purpose it names and the other exception items stay unresolved, so the statement can only NEGATE an exempted use (no finding) or stay unresolved. The seven use-exception US rules remain blocked; the other 12 Canadian regions (outside CA-NS) and GB (4 regions) have no finding-enabled rule.'
    },
    staging_verification: { status: 'PENDING', reason: 'No deployed, current-release finding-coverage journey evidence exists; production readiness remains unresolved.' },
    counting_units: {
      note: 'Counting unit is the admitted rule adapter (a distinct governed provision/limb). Duplicate source rows, citations, applicability rows and observation-only comparisons are NOT separate capabilities. Branch B distinguishes DEFINITE (VIOLATION) from QUALIFIED (PROBABLE_VIOLATION via the historical-verification qualifier or the unresolved-exception path); the six factual-verification (POTENTIAL common-error) issue types are a SEPARATE category, not counted here as rule findings.',
      total_adapters: adapters.length,
      finding_allowed: adapters.filter((a) => a.finding_allowed).length,
      demonstrated_VIOLATION: demonstratedViolation.length,
      demonstrated_PROBABLE_VIOLATION: demonstratedProbable.length,
      observation_only: observationOnly.length,
      configured_but_not_demonstrated: configuredButNotDemonstrated.length
    },
    rule_mapping: adapters,
    region_coverage: regionCoverage,
    executable_findings: {
      demonstrated_VIOLATION_rules: demonstratedViolation.map((a) => a.adapter_id),
      demonstrated_PROBABLE_VIOLATION_rules: demonstratedProbable.map((a) => a.adapter_id),
      qualified_unresolved_exception_rules: qualifiedProbable.map((a) => a.adapter_id),
      observation_only_rules: observationOnly.map((a) => a.adapter_id),
      jurisdictions_with_demonstrated_finding: Object.keys(regionCoverage).filter((r) => regionCoverage[r].demonstrated_finding),
      jurisdictions_without_demonstrated_finding: Object.keys(regionCoverage).filter((r) => !regionCoverage[r].demonstrated_finding)
    },
    /* Requirement: distinguish the consumer delivery categories. `factual_verification` is the six POTENTIAL
       common-error issue types (a separate consumer path, never a rule finding). `actual_upload_to_packet` records the
       journeys where a fictional PDF passes the admission gate and runs upload → extraction → issue → Wizzard →
       approval → entitled download; `downstream_fixtures` is store-injected/in-memory evidence only. */
    consumer_paths: {
      definite_rule_findings: demonstratedViolation.map((a) => a.adapter_id),
      qualified_probable: demonstratedProbable.map((a) => a.adapter_id),
      factual_verification_categories: [
        'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
        'COMMON-ERROR-STATUS-DATE-CONTRADICTION',
        'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY',
        'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY',
        'COMMON-ERROR-DUPLICATE-REPORTING',
        'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'
      ],
      /* Actual upload-to-packet journeys (a fictional PDF passes the admission gate and the real endpoints run). */
      actual_upload_to_packet: [
        'POTENTIAL common-error issues (GENERAL-BUREAU-REPORT) — bm/bp',
        'PROBABLE historical-verification qualifier (US-CA, word-wrapped qualifier via the upload path) — bm',
        'PROBABLE unresolved-exception qualified path (GENERAL-BUREAU-REPORT) — bs',
        'AU-Equifax contradictory-date (fictional structurally-faithful PDF admitted by the structural contract) — bv',
        'GB-Experian Started/Settled account-dates (fictional structurally-faithful PDF admitted by the structural contract) — bv'
      ],
      /* Downstream fixtures (store-injected or in-memory synthetic models): NOT upload-to-packet demonstrations. */
      downstream_fixtures: [
        'TU-CA Opened/Closed Date account-dates (the TU-CA contract additionally refuses the synthetic factory producer, a genuine safeguard) — bu',
        'US-Experian balance/past-due -> BALANCE-PAYMENT (synthetic record; the real specimen extracts the fields but prints no past-due-exceeds-balance) — bv'
      ],
      /* OWNER-ALL82-001: the factual-verification consumer journey is jurisdiction-agnostic and is now exercised for
         every one of the 82 canonical regions (bx): the account-dates potential issue surfaces and is packet-eligible
         through GENERAL-BUREAU-REPORT in all 82, and every downloaded packet matches the selected content and carries
         its own case report identity. */
      all82_factual_verification_journey:
        'POTENTIAL account-dates issue + packet eligibility exercised for all 82 canonical regions through GENERAL-BUREAU-REPORT (bx); select -> approve -> entitled download exercised for all 82, with matching selected content and case report identity',
      /* OWNER-POTENTIAL-ISSUE-001 reconciliation (by): every currently emitted definite/probable finding reaches the
         unified Issue + packet path. A report-CONTENT finding (no retention anchor) is no longer dropped by the
         retention-arithmetic assumption, and the admitted DEFINITE retention findings (CA-NS + the three AU rules)
         are no longer dropped by the former three-rule packet allowlist. */
      packets: {
        packet_enabled_rules: [
          'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y',
          'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y',
          'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y',
          'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE',
          'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y',
          'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y',
          'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y'
        ],
        content_findings: 'a report-content finding (CA-NS dismissed charge) carries its own content evidence + template, never an invented retention period — by',
        probable_without_report_use: 'US national + US-NY PROBABLE findings surface without answering the report-use question; the single admitted question can only negate or stay unresolved, never unlock',
        tested_delivery: 'US-CA definite (bl); CA-NS content + AU definite (by); US probable (bm/bs/br)'
      },
      remaining_jurisdiction_gaps: Object.keys(regionCoverage).filter((r) => !regionCoverage[r].demonstrated_finding),
      remaining_format_gaps: {
        AU: 'account-dates supported (actual upload); status-closure is not (its "Current Repayment Status" is repayment performance, never a lifecycle status); balance/past-due, duplicate, responsibility and payment-history remain field gaps',
        US: 'balance/payment supported (Recent balance + Past due amount); account-dates, status-closure, duplicate, responsibility and payment-history remain field gaps on the FAMILY. This family limitation does NOT erase the general-intake US paths (POTENTIAL common-error, PROBABLE historical-verification qualifier, and the PROBABLE unresolved-exception qualified path all run on GENERAL-BUREAU-REPORT)',
        GB: 'account-dates supported (Started/Settled, actual upload); balance/past-due, status-closure, duplicate, responsibility and payment-history remain field gaps',
        'TU-CA': 'account-dates supported (Opened/Closed Date, downstream — the contract refuses the synthetic factory producer); balance/past-due, status-closure, duplicate, responsibility and payment-history remain field gaps'
      }
    },
    material_questions: {
      status: 'ONE_ADMITTED_REPORT_USE',
      note: 'The report-use question is admitted (OWNER-REPORT-USE-POLICY-001) and is now MATERIAL to the qualified probable path: an at-threshold answer establishes the exception APPLIES and removes the surfaced probable issue; a below-threshold answer negates one purpose while the others stay unresolved (still probable). A single-purpose statement still never UNLOCKS a definite violation. Unknown, Skip, contradictory, mismatched and multiple-use answers stay unresolved. At most two questions; never a quota.'
    },
    behavioral_coverage: {
      status: 'PARTIAL',
      note: 'Definite VIOLATION and the two PROBABLE mechanisms are covered (ab-acceptance-statutory, ad-legal-event-facts, at-gap-finding-002, br-qualified-assessment, bs-prime-directive-delivery). The report-use path is covered by bg-report-use: an at-threshold exempted use removes the probable issue; a below-threshold purpose leaves the other items unresolved; unknown/skip/contradictory/multiple-use/mismatched-amount fail closed; isolation, reassessment, answer correction and review invalidation. CA + GB still have no finding path.'
    },
    month_only_limitation: {
      note: 'Month-only anchors are compared as a whole-month range (GAP-INGEST-006), never a substituted day. Two distinct limitations govern findings: (1) PRECISION RESTRICTION — public-record legal-event rules (FCRA-605A-1/2/3, US-NY ×3, US-CA) are accepted only at DAY precision by the extractor (acceptLegalEventFact filters precision === DAY), so a month-only judgment/tax-lien/bankruptcy date never reaches the anchor; (2) EXCEPTION GATE — the FCRA adverse/collection rules and US-NY rules record report-unobservable § 1681c(b)/§ 380-j(f)(2) use exceptions; these now resolve ONLY through an admitted report-use consumer statement (unknown stays unresolved, never false), otherwise they emit no finding regardless of precision. The AU account/adverse rules are MONTH-capable at the classifier and can emit VIOLATION from a wholly-before month.'
    },
    end_to_end_journey: { status: 'PENDING', note: 'Served-release upload→evaluate→result→purchase journey for the demonstrated finding rules is recorded only as local behavioral tests; a completed deployed purchase download is not recorded (GAP-FINDING-002 recorded HTTP 402).' }
  };

  evidence.criteria = {
    promise_inventory: { passed: false, expected: 'versioned, source-linked inventory of promised jurisdictions, categories and advertised formats', measured: `82 regions enumerated; ${adapters.length} rule adapters mapped; demonstrated finding limited to ${demonstratedViolation.length + demonstratedProbable.length} rules across US-CA + AU` },
    rule_mapping: { passed: false, expected: 'every promised capability mapped to admitted rule identity/version, addressee, decisive facts, exceptions, permissions, input scope, entry point', measured: `${adapters.length} adapters mapped; gaps: CA (observation-only), GB (no adapter), US national + US-NY finding rules blocked by off-report exceptions` },
    executable_findings: { passed: false, expected: 'actual positive VIOLATION/PROBABLE_VIOLATION paths and negative controls', measured: `VIOLATION: ${demonstratedViolation.map((a) => a.adapter_id).join(', ')}; PROBABLE (historical qualifier + unresolved exception): ${demonstratedProbable.map((a) => a.adapter_id).join(', ') || 'none'}; ${observationOnly.length} observation-only rules` },
    material_questions: { passed: false, expected: 'only questions supported by an admitted rule whose answers materially change an eligible assessment', measured: 'one report-use question admitted (OWNER-REPORT-USE-POLICY-001); it names the assessed report and negates an exempted use but does not unlock a violation' },
    behavioral_coverage: { passed: false, expected: 'promised capabilities traced to meaningful tests and measured outcomes', measured: 'report-only and report-use paths covered (bg-report-use); CA + GB still have no finding-capable behavior to test' },
    end_to_end_journey: { passed: false, expected: 'served-release assessment, consumer results and purchased report evidence', measured: 'not recorded' }
  };
  evidence.tests = [{ id: 'bg-report-use', covers: 'report-use clarification thresholds, boundaries, unknown/skip/contradictory/multiple-use, isolation, reassessment, negative controls' }];

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(evidence, null, 2) + '\n');
  return evidence;
}

if (require.main === module) {
  const ev = main();
  const c = ev.counting_units;
  process.stdout.write([
    'finding-coverage-evidence.json written (OPEN, inventory only)',
    `adapters: ${c.total_adapters}`,
    `finding_allowed: ${c.finding_allowed}`,
    `demonstrated VIOLATION: ${c.demonstrated_VIOLATION} -> ${ev.executable_findings.demonstrated_VIOLATION_rules.join(', ') || 'none'}`,
    `demonstrated PROBABLE_VIOLATION: ${c.demonstrated_PROBABLE_VIOLATION} -> ${ev.executable_findings.demonstrated_PROBABLE_VIOLATION_rules.join(', ') || 'none'}`,
    `qualified unresolved-exception rules: ${ev.executable_findings.qualified_unresolved_exception_rules.join(', ') || 'none'}`,
    `observation-only: ${c.observation_only}`,
    `jurisdictions with demonstrated finding: ${ev.executable_findings.jurisdictions_with_demonstrated_finding.length}/82`,
    `jurisdictions without demonstrated finding: ${ev.executable_findings.jurisdictions_without_demonstrated_finding.length}/82`
  ].join('\n') + '\n');
}

module.exports = { main, runReachability, allRegions, regionsForAdapter };

