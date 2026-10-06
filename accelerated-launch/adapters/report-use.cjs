'use strict';
/**
 * report-use.cjs — the governed report-use clarification question and its tri-state exception resolution.
 *
 * OWNER-REPORT-USE-POLICY-001. The FCRA § 1681c(b) and New York § 380-j(f)(2) use exceptions are recorded
 * off-report and have never been resolvable from the report. A consumer's own statement about the USE of the
 * particular report can resolve them, subject to a narrow, versioned evidence-policy amendment.
 *
 * Boundaries, recorded so no later reader has to infer them:
 *   • The question asks what the REPORT was used for — never why the consumer uploaded a personal disclosure.
 *     "I obtained it to review my own credit" is not a use answer and leaves the exception unresolved.
 *   • Federal and New York thresholds DIFFER. Amounts are recorded as bands and each rule resolves the band
 *     against its OWN threshold; a band is never reused across thresholds.
 *   • Unknown / Skip / multiple uses / a missing amount where amount is material stay UNRESOLVED. Unknown is
 *     never converted to false, and thresholds are never inferred from account balances.
 *   • The statement is stored as CONSUMER_STATEMENT, never merged into a bureau-reported fact.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const POLICY_FILE = path.join(__dirname, '..', 'service', 'report-use-policy.json');

const UNKNOWN = 'I_DONT_KNOW';
const SKIP = 'SKIP';
const MULTIPLE = 'MULTIPLE_USES';
const CONTRADICTORY = 'CONTRADICTORY';
const INVALID = 'INVALID';

/* OWNER-REPORT-USE-POLICY-001 (corrected). Only the three exempted-use categories are valid purposes. "other"
   and "personal review" are NOT purposes: a consumer's reason for obtaining or uploading a personal disclosure
   does not establish the absence of another relevant report use, and must not be a shortcut around unknown
   context. Any unrecognized purpose is rejected/unresolved, never resolved to false. */
const PURPOSES = Object.freeze({
  credit_transaction: { code: 'credit_transaction', label: 'A credit transaction (a loan or credit application)', amount_label: 'the principal amount' },
  life_insurance_underwriting: { code: 'life_insurance_underwriting', label: 'Life insurance underwriting', amount_label: 'the face amount' },
  employment: { code: 'employment', label: 'Employment (a job application or employment decision)', amount_label: 'the annual salary' }
});

/* Amount bands. min_cents / max_cents encode the bracket; max_cents === null means "or more" (open-ended).
   The bands are chosen to carry the boundary values for BOTH the federal and New York thresholds at once:
   credit/life insurance: $50k (NY) and $150k (federal); employment: $25k (NY) and $75k (federal). */
const AMOUNT_BANDS = Object.freeze({
  credit_transaction: Object.freeze([
    Object.freeze({ code: 'below_50k', min_cents: 0, max_cents: 5000000, label: 'Less than $50,000' }),
    Object.freeze({ code: 'at_least_50k_below_150k', min_cents: 5000000, max_cents: 15000000, label: '$50,000 to $149,999' }),
    Object.freeze({ code: 'at_least_150k', min_cents: 15000000, max_cents: null, label: '$150,000 or more' })
  ]),
  life_insurance_underwriting: Object.freeze([
    Object.freeze({ code: 'below_50k', min_cents: 0, max_cents: 5000000, label: 'Less than $50,000' }),
    Object.freeze({ code: 'at_least_50k_below_150k', min_cents: 5000000, max_cents: 15000000, label: '$50,000 to $149,999' }),
    Object.freeze({ code: 'at_least_150k', min_cents: 15000000, max_cents: null, label: '$150,000 or more' })
  ]),
  employment: Object.freeze([
    Object.freeze({ code: 'below_25k', min_cents: 0, max_cents: 2500000, label: 'Less than $25,000' }),
    Object.freeze({ code: 'at_least_25k_below_75k', min_cents: 2500000, max_cents: 7500000, label: '$25,000 to $74,999' }),
    Object.freeze({ code: 'at_least_75k', min_cents: 7500000, max_cents: null, label: '$75,000 or more' })
  ])
});

function bandFor(purpose, code) {
  return (AMOUNT_BANDS[purpose] || []).find((b) => b.code === code) || null;
}

function isUnknownOrSkip(a) {
  return a === UNKNOWN || a === SKIP;
}

function isValidPurpose(code) {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(PURPOSES, code);
}

function purposeNoun(purpose) {
  const p = PURPOSES[purpose];
  if (!p) return 'use';
  if (p.code === 'employment') return 'employment use';
  if (p.code === 'life_insurance_underwriting') return 'life insurance use';
  return 'credit transaction';
}

function question(reportContext) {
  const context = reportContext || {};
  /* OWNER-REPORT-USE-POLICY-001 (corrected): the question establishes WHICH particular report/reporting event
     the consumer is answering about — the assessed report, named by bureau and reference date — and asks about
     that report's furnishing use, never why the consumer obtained a personal disclosure. */
  const reportLine = context.bureau && context.reference_date
    ? `This assessment is about the ${context.bureau} credit report dated ${context.reference_date}.`
    : 'This assessment is about the credit report you uploaded.';
  return {
    id: 'report-use',
    plain: `${reportLine} What was this report used for?`,
    benefit: 'Answer about how this report was furnished to a user (for example a lender, insurer or employer), not why you obtained a copy to review. This determines whether a use exception to a retention rule applies, without changing anything the report itself says.',
    answer_kind: 'report_use_purpose',
    choices: Object.keys(PURPOSES).map((k) => PURPOSES[k].code),
    purpose_labels: Object.fromEntries(Object.entries(PURPOSES).map(([k, v]) => [k, v.label])),
    amount_basis_labels: Object.fromEntries(Object.entries(PURPOSES).map(([k, v]) => [k, v.amount_label])),
    amount_bands: Object.fromEntries(Object.keys(AMOUNT_BANDS).map((p) => [p, AMOUNT_BANDS[p].map((b) => ({ code: b.code, label: b.label }))])),
    report_identity: { bureau: context.bureau || null, reference_date: context.reference_date || null },
    has_dont_know: true,
    has_skip: true
  };
}

function amountQuestion(purpose) {
  const p = PURPOSES[purpose];
  if (!p || !p.amount_label) return null;
  const bands = AMOUNT_BANDS[purpose] || [];
  return {
    id: 'report-use-amount',
    plain: `For that ${purposeNoun(purpose)}, what was ${p.amount_label}?`,
    benefit: 'The applicable rule only suspends its retention limit above a specific amount, so the amount decides whether the exception applies.',
    answer_kind: 'report_use_amount',
    purpose,
    choices: bands.map((b) => b.code),
    band_labels: bands.map((b) => b.label),
    has_dont_know: true,
    has_skip: true
  };
}

function policyIdentity() {
  const policy = JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8'));
  const canonical = [policy.policy_id, policy.version, policy.title, policy.text].join('|');
  return {
    policy_id: policy.policy_id,
    version: policy.version,
    digest: crypto.createHash('sha256').update(canonical, 'utf8').digest('hex')
  };
}

/**
 * Normalize a single report-use PURPOSE submission into a statement fragment. NEVER returns null: an invalid,
 * unrecognized or multiple-use submission is retained with `valid: false` so it is recorded (never silently
 * dropped) and resolves to UNRESOLVED. The `multiple_uses` flag is honored regardless of the answer value.
 */
function validateAnswer(input) {
  const invalid = (answer, reason) => ({
    question_id: 'report-use', answer, amount_band: null, amount_resolved: false,
    multiple_uses: false, contradictory: false, valid: false, purpose: null, reason
  });
  if (!input || typeof input !== 'object') return invalid(INVALID, 'missing submission');
  if (input.multiple_uses === true) {
    return { question_id: 'report-use', answer: MULTIPLE, amount_band: null, amount_resolved: false, multiple_uses: true, contradictory: false, valid: false, purpose: null, reason: 'multiple uses reported' };
  }
  const answer = input.answer;
  if (Array.isArray(answer)) {
    return { question_id: 'report-use', answer: MULTIPLE, amount_band: null, amount_resolved: false, multiple_uses: true, contradictory: false, valid: false, purpose: null, reason: 'multiple uses reported' };
  }
  if (typeof answer !== 'string' || !answer.trim()) return invalid(INVALID, 'empty answer');
  const a = answer.trim();
  if (isUnknownOrSkip(a)) {
    return { question_id: 'report-use', answer: a, amount_band: null, amount_resolved: false, multiple_uses: false, contradictory: false, valid: true, purpose: null, reason: null };
  }
  if (!isValidPurpose(a)) {
    /* Unrecognized ("other", "personal_review", arbitrary) is rejected: it must not resolve an exception. */
    return invalid(INVALID, `unrecognized purpose: ${a}`);
  }
  const bandCode = typeof input.amount_band === 'string' ? input.amount_band.trim() : '';
  const band = bandFor(a, bandCode);
  return {
    question_id: 'report-use',
    answer: a,
    amount_band: band ? band.code : null,
    amount_resolved: Boolean(band),
    multiple_uses: false,
    contradictory: false,
    valid: true,
    purpose: a,
    reason: null
  };
}

/**
 * Combine the purpose and (conditional) amount submissions into ONE report-use statement. Inspects EVERY
 * submitted purpose/amount fragment and its flags:
 *   • a multiple_uses flag (or array answer) on ANY fragment → multiple uses (unresolved);
 *   • distinct/conflicting purposes → contradictory (unresolved);
 *   • a conflicting set of amounts for one purpose → contradictory (unresolved);
 *   • an amount tagged with a DIFFERENT purpose → contradictory (unresolved);
 *   • an amount without a purpose → invalid.
 * It never selects the first compatible-looking answer and never falls back to an unrelated amount.
 */
function combineSubmission(purposeItems, amountItems) {
  const purposeList = Array.isArray(purposeItems) ? purposeItems : [];
  const amountList = Array.isArray(amountItems) ? amountItems : [];
  const multiple = (reason) => ({ question_id: 'report-use', answer: MULTIPLE, amount_band: null, amount_resolved: false, multiple_uses: true, contradictory: false, valid: false, purpose: null, reason });
  const contradiction = (reason) => ({ question_id: 'report-use', answer: CONTRADICTORY, amount_band: null, amount_resolved: false, multiple_uses: false, contradictory: true, valid: false, purpose: null, reason });

  /* 1. A multiple-use flag (or array answer) on ANY fragment — purpose or amount — fails closed. */
  for (const frag of [...purposeList, ...amountList]) {
    if (frag && typeof frag === 'object' && (frag.multiple_uses === true || Array.isArray(frag.answer))) {
      return multiple('multiple uses reported');
    }
  }

  /* 2. Collect the distinct non-unknown purposes actually submitted. */
  const purposes = [];
  for (const frag of purposeList) {
    if (!frag || typeof frag !== 'object') continue;
    if (typeof frag.answer !== 'string') continue;
    const a = frag.answer.trim();
    if (!a || isUnknownOrSkip(a)) continue;
    purposes.push(a);
  }
  const distinctPurposes = [...new Set(purposes)];
  if (distinctPurposes.length > 1) {
    return contradiction('conflicting purposes submitted');
  }

  /* 3. No valid purpose: an unknown/skip purpose stays a valid (unresolved) statement; otherwise the amount
        arrived without any purpose and is invalid. */
  if (distinctPurposes.length === 0) {
    const skipPurpose = purposeList.find((i) => i && typeof i.answer === 'string' && isUnknownOrSkip(i.answer.trim()));
    if (skipPurpose) return validateAnswer(skipPurpose);
    return { question_id: 'report-use', answer: INVALID, amount_band: null, amount_resolved: false, multiple_uses: false, contradictory: false, valid: false, purpose: null, reason: 'amount submitted without a purpose' };
  }

  /* 4. Exactly one distinct purpose — normalize it. */
  const stmt = validateAnswer({ question_id: 'report-use', answer: distinctPurposes[0] });
  if (!stmt.valid) return stmt;

  /* 5. Amount fragments must match the purpose and must not conflict. */
  const mismatched = amountList.filter((i) => i && i.question_id === 'report-use-amount' && typeof i.purpose === 'string' && i.purpose && i.purpose !== stmt.purpose);
  if (mismatched.length > 0) {
    return contradiction('amount tagged with a mismatched purpose');
  }
  const matching = amountList.filter((i) => i && i.question_id === 'report-use-amount' && i.purpose === stmt.purpose);
  if (matching.length === 0) {
    return Object.assign({}, stmt, { amount_band: null, amount_resolved: false });
  }
  const amounts = matching.map((i) => (typeof i.answer === 'string' ? i.answer.trim() : '')).filter((a) => a && !isUnknownOrSkip(a));
  const distinctAmounts = [...new Set(amounts)];
  if (distinctAmounts.length > 1) {
    return contradiction('conflicting amounts submitted');
  }
  if (distinctAmounts.length === 0) {
    return Object.assign({}, stmt, { amount_band: null, amount_resolved: false });
  }
  const band = bandFor(stmt.purpose, distinctAmounts[0]);
  return Object.assign({}, stmt, { amount_band: band ? band.code : null, amount_resolved: Boolean(band) });
}

/**
 * Resolve ONE exception item against the report-use statement. Returns the tri-state { applies, resolved, basis }.
 * `applies === null && resolved === false` is UNRESOLVED — it never becomes false.
 */
function resolveItem(item, statement) {
  const spec = item && item.consumer_resolution;
  if (!spec || !spec.purpose) return { applies: null, resolved: false, basis: 'not consumer-resolvable' };
  if (!statement) return { applies: null, resolved: false, basis: 'no report-use statement for this assessment' };
  if (statement.valid !== true) return { applies: null, resolved: false, basis: statement.reason || 'invalid report-use statement' };
  if (statement.multiple_uses === true || statement.contradictory === true) return { applies: null, resolved: false, basis: 'multiple or contradictory uses reported' };
  const answer = statement.answer;
  if (isUnknownOrSkip(answer)) return { applies: null, resolved: false, basis: 'consumer does not know, or skipped' };
  if (!isValidPurpose(answer)) return { applies: null, resolved: false, basis: 'unrecognized purpose; unresolved' };
  /* OWNER-REPORT-USE-POLICY-001 (corrected): a single-purpose statement resolves ONLY the purpose it names.
     A generic purpose and low amount cannot, by themselves, establish that the report was not also used for a
     different exempted purpose, so an item for a different purpose stays UNRESOLVED — never resolved to false. */
  if (answer !== spec.purpose) return { applies: null, resolved: false, basis: 'the statement names a different purpose; this purpose is not established' };
  /* answer === spec.purpose — the amount/salary is material here. A missing or invalid amount band leaves the
     item unresolved (insufficient evidence), never false. */
  const band = bandFor(spec.purpose, statement.amount_band);
  if (!band || statement.amount_resolved !== true) return { applies: null, resolved: false, basis: 'purpose stated but the amount is material and unresolved' };
  if (band.min_cents >= spec.threshold_cents) return { applies: true, resolved: true, basis: `amount at or above the ${spec.amount_basis} threshold` };
  if (band.max_cents !== null && band.max_cents <= spec.threshold_cents) return { applies: false, resolved: true, basis: `amount below the ${spec.amount_basis} threshold` };
  return { applies: null, resolved: false, basis: 'amount band straddles the threshold' };
}

/**
 * Which report-use eligibility row (if any) a result set should surface.
 *
 * MATERIAL-QUESTION GOVERNANCE (OWNER-REPORT-USE-POLICY-001 + Branch B): a question is surfaced only when answering
 * it could MATERIALLY change a surfaced consumer issue. Under the negation-only policy a single-purpose statement
 * resolves only the purpose it names (the other use-exception items stay UNRESOLVED, never false), so it can never
 * UNLOCK a definite violation. But the qualified retention path now surfaces a PROBABLE issue when an exception is
 * unresolved; an at-threshold answer then establishes that exception APPLIES, which removes the surfaced issue. So a
 * rule with any consumer-resolvable use-exception is now materially answerable (the answer can remove the issue),
 * and the governed question is permitted. Unknown/Skip stay first-class and never become false.
 */
function eligibleFor(evaluated, extraction) {
  const adapters = [];
  for (const res of (evaluated && evaluated.results) || []) {
    const machine = res && res.machine;
    const items = machine && machine.evaluation && machine.evaluation.exceptions && machine.evaluation.exceptions.items;
    if (!items) continue;
    const resolvable = (items || []).filter((i) => i && i.consumer_resolvable === true);
    /* Only a surfaced qualified concern is materially answerable: the result must carry a PROBABLE finding whose
       decisive fact is an unresolved exception. An observation-only or not-exceeded result is not. */
    const finding = machine && machine.finding;
    const qualifiedByException = Boolean(finding && finding.classification === 'PROBABLE_VIOLATION'
      && finding.decisive_fact_unavailable && String(finding.decisive_fact_unavailable).indexOf('exception:') === 0);
    const material = resolvable.length > 0 && qualifiedByException;
    if (material && machine.adapter_id && !adapters.includes(machine.adapter_id)) adapters.push(machine.adapter_id);
  }
  if (!adapters.length) return [];
  const reportContext = {
    bureau: (extraction && extraction.bureau) || null,
    reference_date: (extraction && extraction.reference_date && extraction.reference_date.normalized) || null
  };
  return [Object.assign({}, question(reportContext), {
    question_key: 'report-use',
    outcome: { rule_families: ['15 U.S.C. § 1681c(b)', 'N.Y. Gen. Bus. Law § 380-j(f)(2)'], adapters }
  })];
}

module.exports = {
  PURPOSES,
  AMOUNT_BANDS,
  UNKNOWN,
  SKIP,
  MULTIPLE,
  CONTRADICTORY,
  INVALID,
  question,
  amountQuestion,
  validateAnswer,
  combineSubmission,
  resolveItem,
  eligibleFor,
  policyIdentity,
  bandFor,
  isValidPurpose,
  isUnknownOrSkip
};
