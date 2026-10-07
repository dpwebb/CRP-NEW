'use strict';
/**
 * journey.cjs — the consumer journey: evaluate, present, review, download, delete.
 *
 * OWNER-ALL82-001 / B2. This is the orchestration seam between the case store, the shared extraction
 * adapter, the shared evaluation and the consumer-facing rendering. It adds no evaluation logic of its own.
 *
 * The public views below are the ONLY shapes that leave the process. They drop the audit-only `machine`
 * payload, the evidenced-specimen digest and any adapter identifier, because plan section 6 says the
 * consumer UI must not expose gate numbers, admission identifiers or internal classifications.
 */

const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs');
const formats = require('./formats.cjs');
const evaluation = require('./evaluation.cjs');
const results = require('./results.cjs');
const drafts = require('./drafts.cjs');
const demo = require('./demo.cjs');
const multiFileAssembly = require('./multi-file-assembly.cjs');
const clarification = require('./clarification.cjs');
const reportUse = require('../adapters/report-use.cjs');
const { labelFor } = require('./case-status.cjs');
const entitlement = require('./entitlement.cjs');
const assessmentClock = require('./assessment-clock.cjs');

function nowIso() {
  return new Date().toISOString();
}

function newResultId() {
  return `res_${crypto.randomBytes(10).toString('hex')}`;
}

/* ------------------------------------------------------------------ reads */

function filesFor(store, caseId) {
  return store.state().files.filter((f) => f.case_id === caseId);
}

function latestResultFor(store, caseId) {
  const rows = store.state().results.filter((r) => r.case_id === caseId);
  return rows.length ? rows[rows.length - 1] : null;
}

/** The whole case as the consumer sees it: the file it holds, its result set, and the download boundary. */
function caseView(store, actor, caseId) {
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  return viewForResult(store, actor, caseRow, latestResultFor(store, caseId));
}

/* OWNER-ACCEPT-010 historical-result compatibility: an EXPLICITLY selected, owned result exposes its OWN normalized
   clarification eligibility and answers. The caller must name a result id; it never silently falls back to the
   latest result, and the original report facts / result identity / classifications / historical assessment are
   preserved untouched. */
function caseViewForResult(store, actor, caseId, resultId) {
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  if (!resultId) throw new ServiceError('RESULT_ID_REQUIRED');
  const resultRow = store.state().results.find((r) => r.result_id === resultId && r.case_id === caseId);
  if (!resultRow) throw new ServiceError('NOT_FOUND');
  return viewForResult(store, actor, caseRow, resultRow);
}

function viewForResult(store, actor, caseRow, resultRow) {
  const files = filesFor(store, caseRow.case_id).map(publicFile);
  const rendered = resultRow ? publicResult(resultRow.rendered) : null;
  /* OWNER-PURCHASE-FLOW-001: the summary (distinct counts + one teaser) is free for every signed-in account;
     the COMPLETE assessment, its evidence and its download need a one-time unlock of THIS report or a
     subscription, and the dispute packet needs a subscription. The complete assessment is therefore never
     embedded in a response an unentitled account can read. */
  const access = entitlement.assessmentAccess(store, actor, caseRow.case_id);
  const subscribed = entitlement.subscriptionAccess(store, actor).subscribed;
  const summary = rendered ? results.summariseAssessment(rendered) : null;
  return {
    case: caseRow,
    status_label: labelFor(caseRow.status),
    files,
    assessment_access: {
      complete_assessment: access.complete_assessment,
      complete_assessment_via: access.via,
      assessment_download: access.download && access.complete_assessment,
      dispute_packet: subscribed,
      purchase_choices: access.complete_assessment ? [] : ['unlock_this_report', 'monthly', 'annual']
    },
    assessment_summary: summary
      ? {
        result_id: access.complete_assessment && resultRow ? resultRow.result_id : null,
        created_at: resultRow ? resultRow.created_at : null,
        /* OWNER correction (SOL assessment date): the date the SERVER ran THIS assessment, served to the free
           summary too, so the consumer can see when the report was checked. Reading it never changes it. */
        assessed_on: rendered ? (rendered.assessed_on || null) : null,
        assessment_clock_basis: rendered ? (rendered.assessment_clock_basis || null) : null,
        distinct_total: summary.distinct_total,
        by_confidence: summary.by_confidence,
        teaser: summary.teaser,
        severity_order: summary.severity_order
      }
      : null,
    result: access.complete_assessment ? rendered : null,
    result_id: access.complete_assessment && resultRow ? resultRow.result_id : null,
    reviewed: Boolean(resultRow && resultRow.reviewed_at),
    clarifications: resultRow && resultRow.clarifications ? clarification.render(resultRow.clarifications) : [],
    clarification_questions: resultRow && Array.isArray(resultRow.clarification_eligibility) ? clarification.activeQuestions(resultRow.clarification_eligibility) : [],
    download: {
      response_draft_available: false,
      reason: rendered ? rendered.eligibility.reason : 'NO_RESULT_YET',
      reason_plain:
        'No result in this build may be used to produce a response draft. The recorded output permission for ' +
        'every applicable check caps its conclusion at an observation. A demonstration file is offered instead ' +
        'so the download path itself can be reviewed.',
      demonstration_download_available: true
    },
    demonstration_scenarios: demo.listScenarios()
  };
}

function listResults(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  return store.state().results
    .filter((r) => r.case_id === caseId)
    .map((r) => ({ result_id: r.result_id, support: r.support, reviewed: Boolean(r.reviewed_at), created_at: r.created_at }));
}

function getResult(store, actor, caseId, resultId) {
  cases.requireOwnedCase(store, actor, caseId);
  const row = store.state().results.find((r) => r.result_id === resultId && r.case_id === caseId);
  if (!row) throw new ServiceError('NOT_FOUND');
  return publicResult(row.rendered);
}

/* ------------------------------------------------------------------ evaluate */

function persistResult(store, actor, caseRow, provenance, evaluated, extraction, clock) {
  const rendered = results.renderResultSet({ evaluation: evaluated, extraction });
  return store.update((state) => {
    const created = {
      result_id: newResultId(),
      case_id: caseRow.case_id,
      account_id: actor.account_id,
      file_id: provenance.file_id,
      file_ids: provenance.file_ids.slice(),
      support: evaluated.support,
      demonstration: provenance.demonstration === true,
      availability: results.availabilitySummary(evaluated),
      evaluation: evaluated,
      extraction,
      rendered,
      clarification_eligibility: clarification.eligibleQuestions((extraction && extraction.records) || []).concat(reportUse.eligibleFor(evaluated, extraction)),
      reviewed_at: null,
      /* OWNER correction (SOL assessment date): the ONE persisted stamp for this assessment run. The row's own
         timestamp IS that stamp, so nothing downstream can disagree about when the report was checked. */
      assessment_clock: clock || (evaluated && evaluated.assessment_clock) || null,
      created_at: clock && clock.assessment_run_at_utc ? clock.assessment_run_at_utc : nowIso()
    };
    state.results.push(created);
    return created;
  });
}

/**
 * Evaluate the report already attached to the case. No re-read of the report and no new report access.
 *
 * GAP-INGEST-001: when no single file is named, EVERY admitted file is assembled into one coherent report, in
 * upload order, so the latest upload can never silently replace earlier pages. An explicit `fileId` still
 * evaluates that one file only.
 */
function evaluateCase(store, actor, caseId, options) {
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  const wanted = options && options.fileId;
  const files = filesFor(store, caseId);

  let extraction;
  let provenance;
  if (wanted) {
    const fileRow = files.find((f) => f.file_id === wanted);
    if (!fileRow) throw new ServiceError('NO_ADMITTED_FILE', { files_on_case: files.length });
    extraction = fileRow.extraction;
    provenance = { file_id: fileRow.file_id, file_ids: [fileRow.file_id], demonstration: fileRow.demonstration === true };
  } else {
    const assembled = multiFileAssembly.assemble(files);
    if (assembled.extraction) {
      extraction = assembled.extraction;
      const ids = assembled.included_file_ids || [];
      const firstRow = ids.length ? files.find((f) => f.file_id === ids[0]) : null;
      provenance = { file_id: firstRow ? firstRow.file_id : null, file_ids: ids, demonstration: false };
    } else if (files.length) {
      /* No admitted file: a refused upload still evaluates to the honest "not read" result, never a 409. */
      const fileRow = files[files.length - 1];
      extraction = fileRow.extraction;
      provenance = { file_id: fileRow.file_id, file_ids: [fileRow.file_id], demonstration: fileRow.demonstration === true };
    } else {
      throw new ServiceError('NO_ADMITTED_FILE', { files_on_case: files.length });
    }
  }

  /* OWNER correction (SOL assessment date): the ONE stamp for this run, taken from the server clock and never
     from the request. Client-supplied clock fields are ignored and named back in the stamp. */
  const clock = assessmentClock.runStamp(undefined, options);
  const evaluated = evaluation.evaluateCase({
    country: caseRow.country,
    region: caseRow.region,
    extraction,
    assessment_clock: clock,
    consumer_statements: options && Array.isArray(options.consumer_statements) ? options.consumer_statements : null
  });
  const stored = persistResult(store, actor, caseRow, provenance, evaluated, extraction, clock);
  return { result_id: stored.result_id, assessed_on: rendered2AssessedOn(stored), result: publicResult(stored.rendered) };
}

/** The "Assessed on" value for a stored result: the run stamp, never a freshly computed date. */
function rendered2AssessedOn(stored) {
  return stored && stored.rendered ? (stored.rendered.assessed_on || null) : null;
}

/**
 * Demonstration mode. It builds an in-memory synthetic model, reads it through the same shared adapter, and
 * stamps everything it produces as carrying no report evidence. It never attaches bytes and never counts.
 */
function runDemonstration(store, actor, caseId, scenarioName) {
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  const model = demo.buildScenario(scenarioName);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'DEMONSTRATION' });

  const fileRow = store.update((state) => {
    const created = {
      file_id: `demo_${crypto.randomBytes(8).toString('hex')}`,
      case_id: caseRow.case_id,
      account_id: actor.account_id,
      original_filename: 'DEMONSTRATION-INPUT-NOT-A-CREDIT-REPORT',
      stored_bytes: 0,
      stored_blob: false,
      demonstration: true,
      scenario: scenarioName,
      upload_gate: { state: 'DEMONSTRATION_INPUT_NOT_UPLOADED', checks: [] },
      container: 'IN_MEMORY_MODEL_NOT_A_FILE',
      supported_format: false,
      presentation_id: null,
      format_predicates: [{ id: 'DEMONSTRATION_INPUT', passed: true, detail: 'in-memory synthetic model' }],
      refusal_reason: null,
      extraction,
      created_at: nowIso()
    };
    state.files.push(created);
    return created;
  });

  const evaluated = evaluation.evaluateCase({ country: caseRow.country, region: caseRow.region, extraction, assessment_clock: assessmentClock.runStamp() });
  evaluated.support = formats.SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT;
  const stored = persistResult(
    store,
    actor,
    caseRow,
    { file_id: fileRow.file_id, file_ids: [fileRow.file_id], demonstration: true },
    evaluated,
    extraction,
    evaluated.assessment_clock
  );
  return {
    result_id: stored.result_id,
    demonstration: true,
    counts_as_report_support: false,
    label: 'INTERACTIVE DEMONSTRATION — NOT A CREDIT REPORT — NOT REPORT SUPPORT',
    result: publicResult(stored.rendered)
  };
}

/* ------------------------------------------------------------------ review, draft, download */

function requireOwnedResult(store, actor, caseId, resultId) {
  cases.requireOwnedCase(store, actor, caseId);
  const rows = store.state().results.filter((r) => r.case_id === caseId);
  const row = resultId ? rows.find((r) => r.result_id === resultId) : rows[rows.length - 1];
  if (!row) throw new ServiceError('NOT_FOUND');
  return row;
}

/** The consumer's own review of a result set. It records that they read it; it changes no observation. */
function markReviewed(store, actor, caseId, resultId) {
  const row = requireOwnedResult(store, actor, caseId, resultId);
  const updated = store.update((state) => {
    const live = state.results.find((r) => r.result_id === row.result_id);
    live.reviewed_at = live.reviewed_at || nowIso();
    const caseRow = state.cases.find((c) => c.case_id === caseId);
    if (caseRow && caseRow.status === 'OPEN') {
      caseRow.status = 'REVIEWED';
      caseRow.status_history.push({ status: 'REVIEWED', at: nowIso(), recorded_by: 'consumer' });
      caseRow.updated_at = nowIso();
    }
    return { result_id: live.result_id, reviewed_at: live.reviewed_at, case_status: caseRow ? caseRow.status : null };
  });
  return updated;
}

/**
 * OWNER-ACCEPT-009 item 2 (BLOCKER-CLARIFY-001): record the consumer's OPTIONAL clarification answers. They are
 * stored on the result row, separate from the report's own facts; they never replace a reading, never change an
 * observation, and never escalate a finding. A skipped or "I don't know" answer does not interrupt the independent
 * checks, which have already completed before this step exists.
 */
function recordClarification(store, actor, caseId, resultId, answers) {
  const row = requireOwnedResult(store, actor, caseId, resultId);
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  const normalized = clarification.validateAnswers(answers);
  /* OWNER-REPORT-USE-POLICY-001: reassess the ORIGINAL assessed report extraction (every included record, source
     location, bureau association and reference date), never a single re-read file. Later uploads and other case
     files are never incorporated, and unaffected results are preserved. */
  const extraction = row.extraction || null;

  /* OWNER-REPORT-USE-POLICY-001: construct the AUTHORITATIVE bound statement BEFORE any evaluation. The report/
     event context (bureau + reference date) is taken from the evaluated report and the result's own eligibility —
     never from the consumer's submission, so the consumer cannot forge the report it answers about. */
  const eligibleRow = (row.clarification_eligibility || []).find((r) => r && r.id === 'report-use') || null;
  const eligibleRuleIds = eligibleRow && eligibleRow.outcome && Array.isArray(eligibleRow.outcome.adapters) ? eligibleRow.outcome.adapters : [];
  const reportIdentity = (eligibleRow && eligibleRow.report_identity) || (extraction ? { bureau: extraction.bureau || null, reference_date: extraction.reference_date && extraction.reference_date.normalized ? extraction.reference_date.normalized : null } : null);
  const policy = reportUse.policyIdentity();
  const recordedAt = nowIso();

  const boundStatements = normalized.map((a) => {
    const isReportUse = a.question_id === 'report-use';
    return Object.assign({}, a, {
      statement_id: `stmt_${crypto.randomBytes(10).toString('hex')}`,
      recorded_at: recordedAt,
      case_id: caseId,
      result_id: row.result_id,
      report_file_ids: (row.file_ids || []).slice(),
      report_identity: isReportUse ? reportIdentity : null,
      /* Adapter IDs are provenance (which rules the statement could affect), NOT furnishing-event identities. */
      eligible_rules: isReportUse ? eligibleRuleIds : [],
      furnishing_context: isReportUse
        ? { established: false, note: 'the specific furnishing event is not established; the statement names only a purpose category and amount' }
        : null,
      policy_id: policy.policy_id,
      policy_version: policy.version,
      question_key: isReportUse ? 'report-use' : (a.question_key || null)
    });
  });

  const boundReportUse = boundStatements.filter((a) => a.question_id === 'report-use');
  /* Validate applicable question/report context server-side: a report-use answer is only honored when the owned
     result actually surfaced the report-use question and the original extraction is present. A mismatched
     submission is retained for audit but does not resolve an exception. */
  const contextValid = boundReportUse.length === 0 || (Boolean(eligibleRow) && Boolean(extraction));
  const canReassess = contextValid && boundReportUse.length > 0;
  let reassessed = null;
  /* OWNER correction (SOL assessment date): a deliberate RERUN takes a FRESH stamp, and the superseded stamp is
     preserved on the row as history rather than overwritten. */
  const reassessmentClock = assessmentClock.runStamp();
  if (canReassess) {
    reassessed = evaluation.evaluateCase({
      country: caseRow.country,
      region: caseRow.region,
      extraction,
      assessment_clock: reassessmentClock,
      consumer_statements: boundReportUse
    });
  }
  return store.update((state) => {
    const live = state.results.find((r) => r.result_id === row.result_id);
    if (!live.clarifications) live.clarifications = [];
    /* Answer correction: a new report-use answer supersedes the previous report-use statement; the superseded
       statement is retained (never silently dropped) with its provenance intact. */
    if (boundReportUse.length > 0) {
      for (const prev of live.clarifications) {
        if (prev.question_id === 'report-use' && prev.superseded !== true) prev.superseded = true;
      }
    }
    for (const a of boundStatements) {
      live.clarifications.push(a);
    }
    if (reassessed) {
      /* OWNER-REPORT-USE-POLICY-001: reassess the affected checks without changing the independent report facts.
         The extraction (report facts) is untouched; only the exception resolution and derived findings change. */
      live.evaluation = reassessed;
      live.rendered = results.renderResultSet({ evaluation: reassessed, extraction });
      /* OWNER correction (SOL assessment date): the rerun carries its OWN fresh stamp, and the stamp it supersedes
         is preserved as history. `created_at` (the original assessment) is never rewritten. */
      live.previous_assessment_clock = live.assessment_clock || null;
      live.assessment_clock = reassessmentClock;
      live.reassessed_at = reassessmentClock.assessment_run_at_utc || nowIso();
      live.reassessed_with_report_use = true;
      /* A reassessment that changes consumer-visible findings invalidates the prior review/approval so the
         consumer reviews the changed output; the historical review evidence is retained, not deleted. */
      if (live.reviewed_at) {
        live.previous_review_at = live.reviewed_at;
        live.reviewed_at = null;
      }
      const caseRowLive = state.cases.find((c) => c.case_id === caseId);
      if (caseRowLive && caseRowLive.status === 'REVIEWED') {
        caseRowLive.status = 'OPEN';
        caseRowLive.status_history.push({ status: 'OPEN', at: nowIso(), recorded_by: 'reassessment' });
        caseRowLive.updated_at = nowIso();
      }
      /* Refresh eligibility so the surfaced questions reflect the reassessed state. */
      live.clarification_eligibility = clarification.eligibleQuestions((extraction && extraction.records) || []).concat(reportUse.eligibleFor(reassessed, extraction));
    }
    return {
      result_id: live.result_id,
      clarifications: clarification.render(live.clarifications),
      reassessed: Boolean(reassessed)
    };
  });
}

/**
 * Ask for the response draft. Review comes first, and eligibility is then read from the recorded output
 * permissions — which, in this batch, refuse every result. The refusal is the correct answer, not a bug.
 */
function requestResponseDraft(store, actor, caseId, resultId) {
  const row = requireOwnedResult(store, actor, caseId, resultId);
  if (!row.reviewed_at) throw new ServiceError('REVIEW_REQUIRED_BEFORE_DRAFT');
  return drafts.responseDraft(row.rendered);
}

/** The download interface itself, serving clearly fictional content. */
function demonstrationDownload(store, actor, caseId) {
  const caseRow = cases.requireOwnedCase(store, actor, caseId);
  const row = latestResultFor(store, caseId);
  return drafts.demonstrationDownload(row ? row.rendered : null, caseRow);
}

/**
 * The paid assessment-report download. It is a reading of the consumer's own report: the supported results,
 * the classes they belong to, and the limitations — never a finding and never a bureau-response packet.
 */
/* Pure report-body builder: the consumer-facing downloaded assessment text. `rendered` is the persisted
   result set (the same object the on-screen results consume), so the report and the on-screen results can
   never disagree. */
function assessmentReportBody(rendered, producedAt) {
  const lines = [];
  lines.push('CRP ASSESSMENT REPORT');
  lines.push('REPORTING ISSUES AND REPORT FACTS');
  lines.push('='.repeat(72));
  lines.push(`Selection: ${rendered.jurisdiction.country}/${rendered.jurisdiction.region}`);
  lines.push(`Produced: ${producedAt}`);
  /* OWNER correction (SOL assessment date): the date the SERVER ran this assessment, read straight from the
     persisted result — the download states when the report was checked, never when it was viewed. */
  if (rendered.assessed_on) lines.push(`Assessed on: ${rendered.assessed_on}${rendered.assessment_clock_basis ? ` (${rendered.assessment_clock_basis})` : ''}`);
  lines.push(`Evidence basis: ${rendered.presentation_evidence ? 'a supported, admitted report presentation' : 'a refused or unsupported presentation'}`);
  /* GAP-FINDING-004: name the exact evidence-policy version/digest the findings were admitted under. */
  if (rendered.policy && rendered.policy.digest) {
    lines.push(`Evidence policy: ${rendered.policy.policy_id} v${rendered.policy.version} (${rendered.policy.digest})`);
  }
  lines.push('');
  lines.push('REPORTING ISSUES AND REPORT FACTS');
  lines.push('');
  lines.push(`CHECKS PERFORMED (${rendered.checks_performed})`);
  const reportIssues = (rendered.issues || []).filter((issue) => issue.eligible === true);
  if (reportIssues.length) {
    lines.push('');
    lines.push('REPORTING ISSUES');
    for (const issue of reportIssues) {
      const classification = issue.rule_assessment && issue.rule_assessment.classification;
      const label = classification === 'PROBABLE_VIOLATION' ? 'Probable reporting issue'
        : classification ? 'Reporting issue'
          : issue.confidence === 'PROBABLE' ? 'Probable reporting issue' : 'Reporting issue to verify';
      lines.push(`- ${label}${issue.check_kind ? `: ${issue.check_kind}` : ''}`);
      if (issue.explanation) lines.push(`  ${issue.explanation}`);
      if (issue.rule_assessment && issue.rule_assessment.requirement) {
        lines.push(`  Reporting rule: ${issue.rule_assessment.requirement}`);
      }
      for (const fact of issue.source_facts || []) {
        const loc = fact.location || {};
        const where = loc.page != null ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
        lines.push(`  Source: ${fact.source_field || 'report field'} — ${fact.raw_value == null ? 'value omitted' : `printed "${fact.raw_value}"`} (${where})`);
      }
    }
  }
  for (const o of (rendered.observations || []).filter(o => o.assessment_completed !== false)) {
    lines.push(`- ${o.headline || '(a recorded rule comparison)'}`);
    if (o.check_name) lines.push(`  Rule: ${o.check_name}`);
    if (o.detail) lines.push(`  ${o.detail}`);
    /* GAP-FINDING-003: retain the admitted-source version (digest) beside the comparison. The internal
       source-entry id is not rendered here — it stays in the audit record. */
    if (o.rule_source_version) lines.push(`  Rule version: ${o.rule_source_version}`);
    /* GAP-FINDING-004: trace the comparison to the exact report fact it read — raw printed value, page/line
       location, normalization and uncertainty — never another account's evidence. */
    if (o.rule_source && o.rule_source.location) {
      const loc = o.rule_source.location;
      const pageLine = (loc.page != null) ? `page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''}` : 'source location recorded';
      lines.push(`  Source fact: printed "${o.rule_source.raw_value}" (${pageLine}) → normalized ${o.rule_source.normalization && o.rule_source.normalization.to}`);
    } else if (o.evidence && o.evidence.page != null) {
      lines.push(`  Source: ${o.evidence.section || 'report'} page ${o.evidence.page}, line ${o.evidence.line}${o.evidence.printed_value ? ` — printed "${o.evidence.printed_value}"` : ''}`);
    }
    /* OWNER-GAP-FINDING-002-RESOURCE-001: for a probable finding, name the decisive fact and the report reading
       that left it unavailable, with its source location — never an arbitrary flag. */
    for (const d of (o.decisive_facts_unavailable || [])) {
      const dloc = d.source && d.source.location;
      const dpage = dloc && dloc.page != null ? `page ${dloc.page}${dloc.line != null ? `, line ${dloc.line}` : ''}` : 'source location recorded';
      lines.push(`  Decisive fact unavailable: ${d.identity} — ${d.evidence} (${dpage})`);
    }
  }
  for (const f of (rendered.report_consistency_checks || [])) {
    lines.push(`- ${f.plain || f.headline || '(a factual observation about what the report prints)'}`);
  }
  if (!(rendered.observations || []).length && !(rendered.report_consistency_checks || []).length) {
    lines.push('- (none)');
  }
  /* BLOCKER-COMMON-ERRORS-001 / OWNER-ACCEPT-009: render every performed common-error assessment with its
     outcome, plain explanation, source locations and uncertainty — never only an aggregate count, and never a
     legal determination. A payment-history issue names its account reference, period, conflicting readings and the
     printed legend basis (the meanings are the legend's own words). */
  const commonErrors = (rendered.common_errors || []).filter((ce) =>
    ce.state === 'POTENTIAL_ISSUE' || ce.state === 'SIMILAR_ENTRIES_WORTH_REVIEWING');
  if (commonErrors.length) {
    lines.push('');
    lines.push('REPORT FACTS REVIEWED');
    for (const ce of commonErrors) {
      lines.push(`- ${ce.label || 'Report detail to review'}`);
      if (ce.detail) lines.push(`  ${ce.detail}`);
      for (const sr of (ce.source_records || [])) {
        const loc = sr.location ? `page ${sr.location.page}, line ${sr.location.line}` : 'source location not recorded';
        const account = sr.record_index != null ? `Account ${sr.record_index}` : null;
        const bits = [`${account ? account + ' · ' : ''}${loc}`];
        const ev = sr.evidence || {};
        for (const k of Object.keys(ev)) {
          const v = ev[k];
          if (v === null || v === undefined) continue;
          bits.push(`${k}: ${Array.isArray(v) ? JSON.stringify(v) : String(v)}`);
        }
        lines.push(`  ${bits.join(' · ')}`);
      }
    }
  }
  lines.push('');
  if (rendered.recovery && rendered.recovery.facts_added && rendered.recovery.facts_added.length) {
    lines.push('');
    lines.push(`RECOVERY: ${rendered.recovery.facts_added.length} fact(s) were recovered by a bounded local OCR pass (never substituted).`);
  }
  lines.push('');
  lines.push(rendered.disclaimer || 'This assessment covers the checks listed in this report.');
  lines.push('');
  return lines.join('\n');
}

function assessmentReport(store, actor, caseId) {
  cases.requireOwnedCase(store, actor, caseId);
  const row = latestResultFor(store, caseId);
  if (!row) throw new ServiceError('NO_RESULT_TO_DOWNLOAD');
  return {
    filename: `CRP-assessment-report-${caseId}.txt`,
    content_type: 'text/plain; charset=utf-8',
    body: assessmentReportBody(row.rendered, row.created_at),
    is_a_response_packet: false
  };
}

module.exports = {
  caseView,
  caseViewForResult,
  listResults,
  getResult,
  evaluateCase,
  runDemonstration,
  markReviewed,
  recordClarification,
  requestResponseDraft,
  demonstrationDownload,
  assessmentReport,
  assessmentReportBody,
  publicResult,
  publicExtraction,
  publicFile
};


/** Drop the audit-only machine payload and every internal identifier from a rendered result set. */
function publicResult(rendered) {
  return Object.assign({}, rendered, {
    issues: (rendered.issues || []).slice(),
    observations: rendered.observations.map((o) => {
      const view = Object.assign({}, o);
      delete view.machine;
      return view;
    })
  });
}

/** The consumer sees what was admitted and how the document was judged — never a digest or a path. */
function publicExtraction(extraction) {
  if (!extraction) return null;
  const admission = extraction.admission || {};
  return {
    presentation_evidence: extraction.presentation_evidence === true,
    extraction_ran: extraction.extraction_ran === true,
    container: extraction.container,
    support: extraction.support,
    admitted: admission.admitted === true,
    admission_state: admission.state || null,
    refusal_reason: extraction.refusal ? extraction.refusal.reason : null,
    refusal_predicates: (admission.predicates || []).map((p) => ({ id: p.id, passed: p.passed, detail: p.detail })),
    reference_date_read: Boolean(extraction.reference_date && extraction.reference_date.status === 'RESOLVED'),
    accounts_read: extraction.records.length,
    account_statuses: extraction.records.map((r) => ({ account_number_in_report: r.record_index, status: r.status, reason: r.reason })),
    result_status: extraction.summary ? extraction.summary.status : null,
    result_reason: extraction.summary ? extraction.summary.reason : null
  };
}

function publicFile(fileRow) {
  const recognised = fileRow.presentation_id
    ? formats.displayNameFor(fileRow.presentation_id, fileRow.extraction && fileRow.extraction.bureau)
    : null;
  return {
    file_id: fileRow.file_id,
    original_filename: fileRow.original_filename,
    stored_bytes: fileRow.stored_bytes,
    upload_gate: fileRow.upload_gate,
    container: fileRow.container,
    supported_format: fileRow.supported_format,
    recognised_as: recognised,
    refusal_reason: fileRow.refusal_reason,
    format_predicates: (fileRow.format_predicates || []).map((p) => ({ id: p.id, passed: p.passed, detail: p.detail })),
    extraction: publicExtraction(fileRow.extraction),
    demonstration: fileRow.demonstration === true,
    created_at: fileRow.created_at
  };
}
