'use strict';
/**
 * clarification.cjs — OWNER-ACCEPT-009 item 2 (BLOCKER-CLARIFY-001) + OWNER-ACCEPT-010 C5.
 * A minimal OPTIONAL clarification step that runs after automatic recovery. At most two material questions, each
 * in plain English with its benefit explained, and both "I don't know" and "Skip" are first-class answers. Answers
 * are recorded separately from report facts, always carry the CONSUMER_STATEMENT source, never replace a reading,
 * never escalate a finding, and skipping never interrupts the independent checks.
 *
 * C5 (corrected): every eligible question carries a UNIQUE account/record identity (`question_key`) from rendering
 * through submission, validation and persistence, and the account is shown in the question text. An unanswered
 * question is NOT defaulted to "individual". Separate "I don't know" and "Skip" answers for SEPARATE accounts are
 * preserved independently. Each answer records the outcome it enables.
 */

const MAX_QUESTIONS = 2;
const FREE_TEXT_MAX = 200;

const reportUse = require('../adapters/report-use.cjs');

const QUESTIONS = Object.freeze([
  {
    id: 'account-purpose',
    plain: 'Which account is this report about, in your own words? For example: "my 2019 auto loan", or "I do not recognise this account".',
    benefit: 'This helps separate accounts you recognise from accounts you do not, without changing anything the report itself says.',
    answer_kind: 'free_text',
    has_dont_know: true,
    has_skip: true
  },
  {
    id: 'account-responsibility',
    plain: 'On this account, are you individually responsible, jointly responsible with someone else, or only an authorised user?',
    benefit: 'This helps us distinguish your own accounts from accounts where another person was responsible, again without changing anything the report says.',
    answer_kind: 'choice',
    choices: Object.freeze(['individual', 'joint', 'authorized_user']),
    has_dont_know: true,
    has_skip: true
  }
]);

function byId() {
  return new Map(QUESTIONS.map((q) => [q.id, q]));
}

/* C5: a question's UNIQUE identity is its def id plus the account it is about. Two accounts asking the same
   question are two distinct questions, never collapsed. */
function questionKey(questionId, account) {
  return `${questionId}|${account || ''}`;
}

function present(v) { return v != null && String(v).trim().length > 0; }

/* C5 historical compatibility: a stored eligibility row may predate the per-account `question_key`. Derive a safe
   unique key from the question id plus its account (or record index) where possible. Returns null when no safe key
   can be derived (missing id). */
function deriveQuestionKey(row) {
  if (!row || typeof row !== 'object') return null;
  if (present(row.question_key)) return String(row.question_key).trim();
  const id = present(row.id) ? String(row.id).trim() : null;
  if (!id) return null;
  const account = present(row.account) ? String(row.account).trim() : '';
  const record = row.record_index != null && String(row.record_index).trim() ? `record-${String(row.record_index).trim()}` : '';
  return questionKey(id, account || record);
}

/* Normalize stored eligibility for rendering: backfill a `question_key` where one is missing. A row whose key cannot
   be derived, or that would collide with an earlier row (same derived key), is marked `requires_reassessment: true`
   and MUST NOT be rendered as a colliding control — the consumer is asked to re-run the checks instead. */
function normalizeQuestions(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const seen = new Set();
  const out = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const key = deriveQuestionKey(row);
    const normalized = Object.assign({}, row);
    if (!key || seen.has(key)) {
      normalized.question_key = null;
      normalized.requires_reassessment = true;
      out.push(normalized);
      continue;
    }
    seen.add(key);
    normalized.question_key = key;
    out.push(normalized);
  }
  return out;
}

/* OWNER: no admitted rule currently makes these legacy context questions material to findings.
   Preserve historical answer validation, but never generate new context-only questions. */
function eligibleQuestions(records) { return []; }

/* Retired context prompts must not reappear from stored pre-policy eligibility. */
function activeQuestions(rows) {
  // The one admitted governed question is report-use (OWNER-REPORT-USE-POLICY-001). Retired context prompts
  // never reappear; only stored report-use eligibility rows are surfaced.
  return (Array.isArray(rows) ? rows : []).filter((r) => r && r.id === "report-use");
}

/* C5: validation is per unique question key. Arbitrary choice values are refused; an UNANSWERED question is never
   defaulted to "individual" (it is simply not recorded). Separate "I don't know" / "Skip" for separate accounts
   are preserved independently. */
function validateAnswers(input) {
  const list = Array.isArray(input) ? input : [];
  const known = byId();
  const out = [];
  const seen = new Set();

  /* OWNER-REPORT-USE-POLICY-001: the governed report-use question (purpose + conditional amount) is material to
     the § 1681c(b) / § 380-j(f)(2) use exceptions. Every submitted purpose/amount answer is inspected; distinct
     or conflicting purposes, multiple-use flags, and unrecognized purposes are retained (never silently dropped)
     and resolve UNRESOLVED. Unknown / Skip are first-class and never become false. */
  const purposeItems = list.filter((i) => i && i.question_id === 'report-use');
  const amountItems = list.filter((i) => i && i.question_id === 'report-use-amount');
  if (purposeItems.length || amountItems.length) {
    const combined = reportUse.combineSubmission(purposeItems, amountItems);
    if (combined) {
      const rq = reportUse.question();
      const pid = reportUse.policyIdentity();
      out.push({
        question_id: 'report-use',
        question_key: 'report-use|' + (typeof (purposeItems[0] && purposeItems[0].account) === 'string' ? String(purposeItems[0].account).trim() : ''),
        account: (typeof (purposeItems[0] && purposeItems[0].account) === 'string' && String(purposeItems[0].account).trim()) ? String(purposeItems[0].account).trim() : null,
        question_plain: rq.plain,
        benefit: rq.benefit,
        outcome: { rule_families: ['15 U.S.C. § 1681c(b)', 'N.Y. Gen. Bus. Law § 380-j(f)(2)'] },
        answer: combined.answer,
        amount_band: combined.amount_band,
        amount_resolved: combined.amount_resolved === true,
        multiple_uses: combined.multiple_uses === true,
        contradictory: combined.contradictory === true,
        valid: combined.valid !== false,
        reason: combined.reason || null,
        answer_plain: combined.answer === 'I_DONT_KNOW' ? "I don't know"
          : combined.answer === 'SKIP' ? 'Skipped'
          : combined.answer === 'MULTIPLE_USES' ? 'Multiple uses'
          : combined.answer === 'CONTRADICTORY' ? 'Conflicting answers'
          : combined.answer === 'INVALID' ? 'Not recognised'
          : combined.purpose ? `${combined.purpose}${combined.amount_band ? ` (${combined.amount_band})` : ''}` : combined.answer,
        source: 'CONSUMER_STATEMENT',
        evidence_status: 'CONSUMER_SUPPLIED',
        policy_version: pid.version,
        policy_id: pid.policy_id,
        replaced_report_reading: false
      });
    }
  }

  for (const item of list.slice(0, MAX_QUESTIONS)) {
    if (!item || typeof item !== 'object') continue;
    if (item.question_id === 'report-use' || item.question_id === 'report-use-amount') continue;
    const q = known.get(item.question_id);
    if (!q) continue;
    const account = typeof item.account === 'string' ? item.account.trim() : '';
    const key = questionKey(q.id, account);
    if (seen.has(key)) continue;
    seen.add(key);

    let value = typeof item.answer === 'string' ? item.answer.trim() : '';
    if (q.answer_kind === 'choice') {
      if (!value) continue; // unanswered: never defaulted to "individual"
      if (value !== 'I_DONT_KNOW' && value !== 'SKIP' && !(q.choices || []).includes(value)) continue; // arbitrary value refused
    } else {
      if (!value) continue; // unanswered free text
      if (value.length > FREE_TEXT_MAX) value = value.slice(0, FREE_TEXT_MAX);
    }

    out.push({
      question_id: q.id,
      question_key: key,
      account: account || null,
      question_plain: q.plain,
      benefit: q.benefit,
      outcome: item.outcome || null,
      answer: value,
      answer_plain: value === 'I_DONT_KNOW' ? "I don't know" : value === 'SKIP' ? 'Skipped' : value,
      source: 'CONSUMER_STATEMENT',
      evidence_status: 'CONSUMER_SUPPLIED',
      replaced_report_reading: false
    });
  }
  return out;
}

/* Answers are rendered as consumer statements, kept apart from independently established report facts, with the
   account and the useful outcome the answer enables. */
function render(rows) {
  return (Array.isArray(rows) ? rows : []).map((r) => ({
    question_id: r.question_id,
    question_key: r.question_key || null,
    account: r.account || null,
    question_plain: r.question_plain,
    benefit: r.benefit,
    outcome: r.outcome || null,
    answer: r.answer,
    answer_plain: r.answer_plain,
    amount_band: r.amount_band || null,
    multiple_uses: r.multiple_uses === true,
    contradictory: r.contradictory === true,
    valid: r.valid !== false,
    policy_version: r.policy_version || null,
    source: r.source || 'CONSUMER_STATEMENT',
    evidence_status: r.evidence_status || 'CONSUMER_SUPPLIED',
    recorded_at: r.recorded_at || null,
    superseded: r.superseded === true,
    statement_id: r.statement_id || null,
    report_identity: r.report_identity || null,
    report_file_ids: Array.isArray(r.report_file_ids) ? r.report_file_ids : [],
    furnishing_context: r.furnishing_context || null,
    policy_id: r.policy_id || null,
    policy_version: r.policy_version || null
  }));
}

module.exports = { QUESTIONS, MAX_QUESTIONS, FREE_TEXT_MAX, eligibleQuestions, validateAnswers, render, questionKey, deriveQuestionKey, normalizeQuestions, activeQuestions };


