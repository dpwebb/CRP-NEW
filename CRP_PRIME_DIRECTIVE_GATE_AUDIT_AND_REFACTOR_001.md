# Prime Directive gate audit and refactor plan

Date: October 5, 2026. Scope: static inspection of the current accelerated-launch source from intake through consumer results and correction download. No application code, configuration permission or entitlement changed. This is a code-based plan, not a runtime test or legal admission. Current Cline edits may continue; reconcile this snapshot at handoff. C:\CRP-NEW is not a Git repository, so no commit identity was available.

## Conclusion and measurements

Preserve the existing platform. Its problem is the coupling between definite legal classification, consumer issue visibility and correction eligibility, not a need to rebuild ingestion.

- 19 configured adapters: 14 finding-enabled, 5 finding-disabled, 3 packet-enabled. These are configuration counts, not measured consumer coverage.
- All 3 packet-enabled adapters are the bounded California bankruptcy, paid-tax-lien and collection rules. Packet eligibility additionally requires an emitted VIOLATION. PROBABLE_VIOLATION is explicitly refused.
- 10 common-error check families already run on GENERAL-BUREAU-REPORT: contradictory account dates, status/date contradiction, balance/payment consistency, payment-history consistency, responsibility inconsistency, duplicate reporting, similar-entry review, date order, adverse-after-first-report, identity discrepancy. A family can return no result; ten configured calls do not mean ten checks were performed on each report.
- Their positive output is already POTENTIAL_ISSUE, but it has observation ceiling and is_legal_finding=false. Legal classification need not change to make these useful consumer issues.
- results.cjs serializes common_errors. The current main ui/app.js has no common_errors reference. Its resultBlock renders observations and report_consistency_checks only. Therefore the common-error collection has no rendering path in that main Wizzard component; this is a static finding, not a browser observation.
- packets.cjs and five HTTP packet routes now exist. ui/app.js contains no packet endpoint, eligible_findings or finding_ids references. Preserve backend selection/wording/approval/download machinery; connect and verify the actual UI rather than assuming its existence from backend tests.

## Gate register

The 26 rows below enumerate distinct decision/representation boundaries along the inspected assessment-to-download path. They are not counts of every if statement, test assertion, external dependency or every legal rule in the corpus. Preserve means retain the safeguard; separate means keep it for definite classification but provide an independent potential/probable path; refactor means current behavior blocks the Prime Directive directly.

| ID | Boundary and source | Current effect | Disposition |
|---|---|---|---|
| G01 | formats.cjs admission; general-intake.cjs detect | Exact/family/general paths require a plausible readable report; unsupported material refused | Preserve. Use existing general fallback; no universal parser rewrite |
| G02 | general-intake.cjs decisiveWordsTrusted, canonicalAssessmentFields | Unreadable/low-confidence or ambiguous values withheld from resolved facts | Preserve raw readings. A supported issue can use independently readable facts; unread alone is not an issue |
| G03 | general-intake.cjs acceptLegalEventFact | Exact event labels/own dates required; no DOFD substitution | Preserve for legal timing; do not require a DOFD for unrelated supported status or balance checks |
| G04 | formats.cjs factsForRecord/factSourcesForRecord; extraction identities | Own account/report facts and locations, no borrowed anchors | Preserve across all confidence classes |
| G05 | evaluation.cjs carriesReportEvidence early return | No assessment when no report evidence is available | Preserve; never create issues from an unread document |
| G06 | evaluation.cjs applicableAdapters, unconfirmed bucket | Only confirmed regional associations run statutory rules | Preserve legal applicability; common factual checks need their own applicable compliance basis, not a fabricated regional admission |
| G07 | evaluation.cjs gateOnApplicability; applicability.cjs | Unknown legal applicability stops that adapter before comparison | Separate: retain definite refusal; allow issue-specific potential assessment using affirmative facts and named uncertainty |
| G08 | evaluation.cjs record kinds and record.status | No candidate kind, or unresolved record, stops statutory comparison | Separate: use check-specific readable fields for potential checks, never indiscriminately declare the whole record resolved |
| G09 | rule-adapters.cjs presentation/source/refusal path | Rule-specific format/evidence/source permission limits | Preserve actual source support. Potential checks must state their own minimum evidence contract rather than bypass the source gate |
| G10 | evaluation-primitives.cjs date/range arithmetic | Missing/conflicting dates or boundary-straddling precision gives unresolved timing | Separate outcome from visibility: preserve arithmetic; allow an issue only if supported facts justify a verification request with honest bounds |
| G11 | rule-adapters.cjs classify output_permission | finding_allowed=false or non-finding ceiling suppresses legal finding | Keep for definite rules; add explicit governed issue permissions, not blanket-enable the 5 disabled adapters |
| G12 | rule-adapters.cjs buildEvaluationRecord/classifyEvaluation | breach_established and predicates_resolved required before probable decision | Main refactor: independent probable/potential decision contract, not a relaxation of definite breach_established |
| G13 | classifyEvaluation required facts/reference/timing/conditions | Resolved required facts, report reference, exceeded period and met conditions required | Preserve for definite retention; probable/potential checks require only their documented affirmative decisive facts |
| G14 | classifyEvaluation exceptions; report-use.cjs resolveItem | Unresolved use exceptions suppress findings; a single purpose cannot negate other uses | Preserve truth of unknown exception. Assess a separate qualified potential path; never unknown=>false |
| G15 | classifyEvaluation decisive_facts_unavailable | PROBABLE only after prior gates, with structured genuine unavailable fact | Broaden governed probable pathways; maintain the existing narrow bankruptcy probable outcome and do not claim probability from any missing value |
| G16 | classifyContentOmission/Inclusion/sourceMatchesFact | Complete content evidence, consistent values and record identity required | Preserve fact fidelity/negation. Do not call unread content absent. A separate verification issue may use an affirmative discrepancy without declaring statutory omission |
| G17 | common-errors.cjs runCommonErrorChecks | Runs only GENERAL-BUREAU-REPORT | Broaden incrementally by actual field capability, not presentation name alone. Family formats are not automatically compatible |
| G18 | common-errors.cjs entry; factual-checks.cjs; content-assessments.cjs | Common positives remain observation; factual differences and markers separate from findings | Create actionable issue descriptors for supported positives. Markers/benign similarity/NOT_DETECTED are not automatically issues |
| G19 | results.cjs renderResultSet/commonRendered | No common-error classification, consumer issue ID, request metadata or selection eligibility | Add stable persisted issue identity, confidence, actual facts, inference/uncertainty, compliance basis and request permission |
| G20 | ui/app.js resultBlock; ui/index.html | Common errors not rendered by main resultBlock; observation-heavy public copy; no packet wiring in app.js | Render actionable probable/potential cards and selection flow, preserving Wizzard. Reconcile obsolete observation-only claims |
| G21 | clarification.cjs eligibleQuestions; report-use.cjs eligibleFor | Legacy questions empty; report-use materiality tied to existing finding effect | Keep at most two material questions. Reassess materiality against qualified issue/request outcome; no question required to rescue every uncertain case |
| G22 | evaluation.cjs packetEligibility | Only packet flag plus emitted VIOLATION; excludes common/probable issues | Replace with issue-specific request eligibility independent of legal certainty, retaining provenance and permission |
| G23 | rule-adapters.cjs verifyConfigs; test-adapters.cjs | Hard-coded three-rule packet allowlist and violation ceiling | Replace with explicit request-policy validation per enabled issue type. Do not erase permission tests or legal ceilings |
| G24 | packets.cjs eligibleFindings/publicFinding/findingLines | Model assumes adapter@record, one retention anchor, citation, years, and stale-entry removal wording; California header | Generalize descriptors/templates for multiple facts, discrepancy and uncertainty. Use factual verification wording and actual jurisdiction; don't invent legal citations for factual-only issues |
| G25 | packets.cjs selection, canonicalVersion, approval, download | Owned current result, selected eligible IDs, version approval; document filters selected keys against current eligibility | Preserve and strengthen: hash actual selected evidence/classification/request content; reject missing or newly ineligible selections rather than silently dropping them |
| G26 | app.cjs packet routes; entitlement.cjs downloadEntitled | Authentication, case ownership, paid changes and entitled download | Preserve existing offering. No new tier, entitlement grant or billing refactor |

## Existing detector meaning must be reviewed, not blindly promoted

Reuse all ten common-error mechanisms, but initially admit only concrete supported discrepancies with tested benign alternatives. Similar identifiers can be legitimate original-creditor/collector records. Payment greater than current balance can be legitimate depending on payment type and snapshot. An adverse event later than first report is not by itself proof of re-aging. Keep these as qualified review signals or withhold unless the documented evidence contract makes a useful request justified. This is reasoning from the source's comparisons, not a new legal conclusion.

Do not demand proof of wrongdoing to show an issue, but do not label every comparison a probable violation. The Prime Directive is satisfied by supported potential/probable issues with honest wording and consumer-chosen requests. No numerical probability is asserted.

## Refactor sequence

### Batch 1 — complete the common-issue consumer journey

Outcome: uploaded ordinary report -> concrete potential reporting discrepancy -> Wizzard explanation -> consumer selection/review/edit/approval -> downloaded factual dispute/verification packet. This is the first implementation priority; no new obscure statutory adapter is required.

1. Introduce one reusable Issue descriptor alongside unchanged legal finding payloads: issue_id, case/result/report/record associations, check/policy version, confidence class, affirmative source facts, basis type (statutory compliance or factual consistency), applicable supported requirement when available, explanation, specific uncertainty/benign alternative, request type and eligibility. Persist it, deduplicate shared signals, and preserve old results without retroactively asserting new findings.
2. First scope: opened-after-closed dates, same-record open-status/closure-date conflict, and same-account/same-period conflicting payment-history cells. Reuse existing checks. Establish their actual field/period contracts and benign controls before promotion; a legitimate explanation means a qualified request or no signal, not a forced finding.
3. Normalize positives into issues without setting VIOLATION. A report-linked discrepancy may support a factual verification request even where legal breach is not established. If an applicable rule basis is claimed, it must be relevant and sourced; do not attach a generic statute simply for appearance.
4. Render the same issues in the Wizzard and downloaded assessment. Do not show NOT_DETECTED results, internal failed-check lists or machine-policy digests as issue cards. Display readable supporting facts, what may need correction, and why verification is warranted.
5. Broaden request eligibility for these exact issue types and existing supported probable findings after their wording/evidence policy is recorded. Retain the 3 existing definite California packet paths. Replace the VIOLATION-only check and validator allowlist with narrowly enumerated issue request contracts, not a global true flag.
6. Adapt packet descriptors and templates. Separate consumer statements from report facts. Reuse owned selection, wording, approval and entitled-download endpoints. Wire them in the real Wizzard; the current static source does not demonstrate that UI path.
7. Bind approval to selected issue content and evidence. Selection, wording, source facts, assessment/confidence or policy changes invalidate approval. Download must fail for stale/ineligible selection rather than generate a partial packet silently.

Acceptance: a fictional upload with one supported uncertain discrepancy and one benign alternative produces the appropriate card(s); consumer selects only one issue; downloaded request agrees with reviewed facts/uncertainty; no definite breach is asserted. Test direct API selection, unknown issue, wrong account/report, stale result/approval, consumer edit separation, existing definite/probable regression and legitimate entitlement refusal. Verify actual Wizzard interaction and readable download, accurately distinguishing service integration from real-browser evidence.

### Batch 2 — separate probable legal assessment from definite proof

Inventory each affected legal rule's unresolved fact/exception once. For each, document affirmative trigger, plausible alternatives, confidence ceiling, relevant compliance basis and verification request. Implement separate assessPotential/assessProbable logic using available facts. Do not make classifyEvaluation's breach_established gate the entrance to all classes.

Preserve definite arithmetic, legal applicability, DOFD and negation controls. Unknown exception does not become false; a supported potential concern may remain reportable with qualified wording. California (a)(8) stays disabled as a definite finding unless its legal timing basis is established. No automatic reinstatement of the withdrawn eighth definite finding. Prioritize report-supported ordinary concerns; disabled status alone is not evidence of an issue.

### Batch 3 — broaden formats and category coverage

Run common checks on family readers only where their normalized, source-linked fields meet the same contract. Add compatible ordinary-report checks in related batches, map relevant compliance requirements and all-82 jurisdiction reach honestly, and add subsequent-report comparisons through the same issue representation. Missing AU payment/new-arrangement presentation stays a specific gap, not a blocker on other supported issue delivery.

## Verification, files and effort

Primary changes: common-errors.cjs, evaluation.cjs, results.cjs, packets.cjs, ui/app.js, ui/index.html; permission validation in rule-adapters.cjs and test-adapters.cjs; compatible storage/API handling and issue-policy configuration. Follow-on changes: applicability.cjs, clarification.cjs, relevant extraction readers and report serializers. Preserve drafts.cjs's unimplemented legacy responseDraft boundary; implement the existing correction-packet path, not a competing draft system.

Tests to adapt: al-common-errors, av-consumer-results, aw-consumer-explanations, bl-us-ca-correction-packet, existing classifier/provenance/applicability tests, presentation tests and new Prime Directive integration coverage. Existing assertions that forbid a factual discrepancy from becoming a definite legal VIOLATION remain useful. Assertions that forbid any supported uncertain issue from packet eligibility must change under the owner amendment.

This is a medium cross-layer refactor, not a rebuild and not a single flag change. Three outcome batches are recommended, with Batch 1 delivering the first complete usable slice. No reliable elapsed-time estimate without implementation and fixture execution. Run focused sections during development and one final full regression per executable batch; this documentation audit did not run or overwrite release evidence.

## Status and limits

Static boundaries measured, refactor planned. No runtime/browser or full-suite pass claimed in this audit. Prior 5,999 assertion report is not asserted to validate newly observed packet code. Existing adapter counts reflect this inspected workspace, not all-82 substantive coverage. Broader blockers, legal-source gaps, packet breadth and staging/production readiness remain separate. Architecture direction is established by CRP_OWNER_POTENTIAL_ISSUE_STANDARD_001.md; adoption is not runtime completion.
