# CRP_REPORT_USE_COMPLETION_001 — report-use clarification batch (implementation record)

Date: October 4, 2026 (America/Halifax). Authority: reconciled owner/lead-architect plan; OWNER-REPORT-USE-POLICY-001.

## 1. Behavior implemented

1. **Report-use consumer statement** (`adapters/report-use.cjs`, `service/clarification.cjs`, `service/report-use-policy.json`):
   a governed, at-most-two-question clarification. Q1 asks what the report was USED for (credit transaction /
   life-insurance underwriting / employment / other); Q2 asks the amount/salary ONLY where the applicable rule's
   threshold makes it material. "I don't know" and "Skip" are first-class answers.
2. **Tri-state exception resolution** (`adapters/rule-adapters.cjs`): a report-use statement resolves each
   § 1681c(b)/§ 380-j(f)(2) exception item to `applies: true / false / unresolved`. Unknown, Skip, contradictory,
   multiple-use, and purpose-only-without-amount answers stay UNRESOLVED (never false). Thresholds are never
   inferred from account balances.
3. **Separate storage**: answers are stored as `CONSUMER_STATEMENT` with case/result association, timestamp,
   policy version (`OWNER-REPORT-USE-POLICY-001` @ `1.0`), and the rule families they inform. They are never
   merged into report facts and never reused automatically for unrelated reports or accounts.
4. **Reassessment** (`service/journey.cjs`): recording a report-use answer re-runs the affected checks against
   the same extraction (report facts unchanged), updating only exception resolution and derived findings.
5. **Question surfacing**: a report-use question appears only when a finding-enabled result still carries an
   unresolved consumer-resolvable exception (never a quota; never to repair a report omission).

## 2. Source / policy amendments (exact scope)

- **New York threshold correction** (via the existing source/version process, historical artifacts preserved):
  the three US-NY adapters (`US-NY-GBL-380J-F1-I/-II/-III`) now record the correct § 380-j(f)(2) thresholds —
  credit transaction principal amount $50,000+; life-insurance face amount $50,000+; employment annual salary
  $25,000+ — instead of the federal figures. Sourced to the captured primary artifact
  `SOURCE_CAPTURES/PHASE5-001N/retrieved/R07-US-NY-public-law-380-j.html` (SHA-256 `144FBBA7…D51AFCC`). The federal
  § 1681c(b) thresholds ($150,000 / $150,000 / $75,000) are retained and now recorded with a `source` block.
  `rule-adapter-catalog.json` was regenerated from `adapter-configs.json` via `build_rule_catalog.py`.
- **`OWNER-REPORT-USE-POLICY-001`** (`CRP_OWNER_REPORT_USE_POLICY_001.md` + `service/report-use-policy.json`):
  a narrow, versioned evidence-policy amendment authorizing consumer statements to inform ONLY the named
  report-use exception evaluations. It authorizes no new legal duty, no conversion of consumer statements into
  bureau facts, and no blanket permissions. Unrelated safeguards (packet, dispatch, finding gates) are unchanged.

## 3. Meaningful measured tests

- New section `bg-report-use` (36 assertions): rule-specific thresholds and boundary bands; purpose/context and
  insufficient-context (purpose-only) cases; unknown/skip/contradictory/multiple-use; answer/report/account
  isolation and reassessment; eligible positives and legitimate negatives; unknown-never-false; internal
  VIOLATION classification preserved with no legal-advice disclaimer; and the local upload → evaluate → answer →
  reassessment → result HTTP behaviour.
- Full suite: **5,805 assertions passed, 0 failed, 0 skipped** (was 5,769; +36).
- `finding-coverage-evidence.json` and `clarify-evidence.json` regenerated.

## 4. Finding capabilities and jurisdiction coverage (before/after)

| Metric | Before | After |
| --- | --- | --- |
| Demonstrated report-only VIOLATION rules | 4 | 4 |
| Demonstrated PROBABLE_VIOLATION | 1 | 1 |
| VIOLATION reachable only with a report-use statement | 0 | **7** (FCRA-605A-1/3/4/5 + US-NY ×3) |
| Finding-enabled rules blocked by exceptions | 7 | **0** |
| Observation-only | 3 | 3 |
| Jurisdictions with a demonstrated finding | 9 / 82 | **65 / 82** (57 US + 8 AU) |
| Jurisdictions with no demonstrated finding | 73 / 82 | **17 / 82** (13 CA + 4 GB) |

The report-use path is supplementary consumer evidence, not report-only coverage; it does NOT close the all-82
promise. CA (13 regions) still has no finding-enabled rule, and GB (4 regions) has no adapter.

## 5. Actual blocker counts (release-check.cjs)

- Implementation closed: 7; implementation open: 22; staging verification pending: 25.
- Not launch ready: **29 launch-blocking checks** across 13 categories.
- BLOCKER-FINDING-COVERAGE-001 — OPEN (17/82 still no finding; CA + GB).
- BLOCKER-ALL82-FACILITATION-001 — OPEN. BLOCKER-DISPUTE-PACKET-001 — OPEN. BLOCKER-SUBSCRIPTION-VALUE-001 — OPEN.
- Production/staging statuses remain separate from implementation closure (OWNER-CLOSURE-001).

## 6. Directed requirements NOT completed in this batch

- Consumer-label migration ("Reporting issue / Probable reporting issue") and the main-page-footer legal-advice
  disclaimer are separate, not implemented here (BLOCKER-CONSUMER-LANGUAGE-001; internal VIOLATION/PROBABLE
  classification is preserved, and no legal-advice disclaimer is introduced by this batch).
- CA finding-enabled rule admission and GB adapter admission remain legal-admission decisions (Batch 2 of the
  inventory), not code.
- Packet readiness, all-82 facilitation and subscriber history/comparison remain OPEN core work.

## 7. Next bounded core implementation recommendation

Proceed to **dispute/correction packet readiness for the now-reachable US findings** in the core build sequence:
bind the packet to its own case/records and completed eligible findings, preserve classification and source
precision, allow consumer review/selection/editing, and produce a usable entitled download — without blanket
packet permissions or external dispatch. In parallel, return the precise CA/GB legal-admission decision needed
(a finding-enabled CA rule; a GB rule + current format) for architect review.

No deployment, hosted payment, external message, new provider, private-report access, manual entitlement grant or
production/live billing change was performed. Workspace, historical captures, secrets and read-only legacy corpus
are preserved.

---

## 8. Correction batch (October 4) — architect review defects fixed

### Fail-closed validation and resolution
- Removed "other" and "personal review" as report-use purposes; only the three exempted-use categories remain.
  An unrecognized/malformed purpose (`personal_review`, `other`, arbitrary) is rejected (`valid: false`) and stays
  UNRESOLVED — never resolved to false. The explicit `multiple_uses` flag is honored regardless of the answer value.
- `resolveItem` now rejects unrecognized answers, and `buildExceptionEvaluation` inspects ALL submitted report-use
  statements (conflicting/multiple statements → unresolved) instead of selecting the first.
- `validateAnswers` combines the purpose and conditional amount answers, detects distinct/conflicting purposes
  (contradictory), and records answer corrections: a new answer supersedes the previous statement, which is retained
  (never silently dropped) with its provenance.

### Report/event context and reassessment
- The statement is bound to the identified report/event: `report_file_ids` (the assembled report), `result_id`,
  `event` (the eligible adapters), `statement_id`, `recorded_at`, and the policy identity/version.
- `recordClarification` reassesses the ORIGINAL assembled extraction (`row.extraction`) — every included record,
  source location, bureau association and reference date — never a single re-read file; later uploads and other case
  files are not incorporated. Unaffected results are preserved and question eligibility is refreshed after reassessment.

### Consumer presentation
- Consumer surfaces now use "Reporting issue" / "Probable reporting issue" (`consumer_label`), retaining the exact
  internal `VIOLATION`/`PROBABLE_VIOLATION` classifications and completed probable-finding uncertainty.
- Exactly one readable legal-advice disclaimer in the main-page footer ("Credit Regulator Pro provides credit-report
  information, not legal advice."); it is not repeated in wizard steps, results, downloads or other views.

### Wizard interaction
- `service/ui/app.js` renders readable purpose labels and the conditional amount/salary selector (with accurate
  inclusive bands and Unknown/Skip for both), and submits both answers through the real consumer flow.

### Measured tests
- Full suite: **5,830 assertions passed, 0 failed, 0 skipped** (was 5,805; `bg-report-use` expanded to 56 assertions
  covering thresholds/boundaries, life insurance, personal-review/malformed/multiple/conflicting, answer corrections,
  same-owner separation, later uploads, unchanged facts, negative controls, both labels, and the wizard UI submit).
- `test-adapters.cjs`: 34 passed. `closure-common-errors.cjs` and all other affected closure scripts re-run to
  revalidate source-pinned evidence.

### Coverage and blockers (unchanged, honest)
- Finding coverage: report-only VIOLATION 4; PROBABLE 1; VIOLATION_WITH_REPORT_USE 7 (now via a below-threshold
  credit purpose, not "other"); observation-only 3; jurisdictions with a demonstrated finding **65/82**
  (57 US + 8 AU); remaining **17/82** (13 CA + 4 GB).
- Release check: implementation closed 18 / open 11; staging pending 25; **29 launch-blocking checks; NOT launch ready.**
  BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001, BLOCKER-DISPUTE-PACKET-001 and
  BLOCKER-SUBSCRIPTION-VALUE-001 remain OPEN.

### Precise source/policy decisions (none blocked)
- The corrected model resolves a violation only from an affirmative single exempted-use category stated below that
  rule's threshold (plus the material amount/salary); a consumer's personal disclosure/review, "other", unknown,
  contradictory or multiple-use statements stay unresolved. No legal source or policy decision blocked this batch.

---

## 9. Second correction batch (October 4) — fail-closed combination, negation-only resolution, context and wizard

### combineSubmission defects fixed
- A `multiple_uses` flag (or array answer) on ANY purpose or amount fragment now fails closed (`MULTIPLE_USES`).
- Conflicting amounts for one purpose are `CONTRADICTORY`, never first-wins.
- An amount tagged with a mismatched purpose is `CONTRADICTORY`, never accepted via a fallback.

### Negation-only resolution (evidence-policy decision)
- A single-purpose statement now resolves ONLY the purpose it names; the other use-exception items stay UNRESOLVED.
  A generic purpose and low amount therefore NEGATES an exempted use (at/above threshold → no finding) but can never
  unlock a violation. The seven §1681c(b)/§380-j(f)(2) US rules remain **blocked**, and the coverage matrix reflects
  **9/82** jurisdictions with a demonstrated finding (report-only), not the earlier 65/82. This is the precise
  evidence-policy decision: a single-purpose consumer statement cannot, by itself, establish the absence of the
  other exempted uses, so it cannot create a finding.

### Report/event context
- The question names the particular assessed report (bureau + reference date) and its benefit distinguishes the
  report's furnishing use from obtaining a personal disclosure. The statement carries `report_identity`
  (bureau + reference date), `report_file_ids`, `event`, `statement_id`, `recorded_at` and the policy version,
  bound server-side from the evaluated report — never from the consumer's submission.

### Wizard answer lifecycle and review invalidation
- The wizard clears a stale Unknown/Skip special-answer state when a purpose is later selected and shows only the
  matching amount selector. A "Correct my answer" affordance re-opens the question after saving (even when refreshed
  eligibility is empty). Reassessment invalidates the prior review (`reviewed_at` → null, status back to OPEN),
  preserving the historical review evidence.

### Footer placement
- The legal-advice disclaimer is shown only on the main page (step 0) and hidden on assessment/results, review/
  download, billing, privacy and support steps (via a `footerDisclaimer()` toggle), never in exports or downloads.

### Measured tests
- Full suite: **5,835 assertions passed, 0 failed, 0 skipped** (bg-report-use 61; v-presentation-and-release 118).
- `test-adapters.cjs`: 34/34. All closure scripts re-run to revalidate source-pinned evidence.
- Coverage: report-only VIOLATION 4; PROBABLE 1; observation-only 3; **blocked by unresolved exceptions 7**;
  jurisdictions with a demonstrated finding **9/82** (US-CA + 8 AU); remaining **73/82** (13 CA + 4 GB + 57 US
  blocked rules requiring a legal-admission or additional-evidence decision).
- Release check: implementation closed 18 / open 11; staging pending 25; **29 launch-blocking checks; NOT launch
  ready.** The four broad coverage/facilitation/packet/subscription blockers remain OPEN.

## 10. Third correction (October 4) — bound statement, integration coverage, finding candidate

1. **Bound statement before reassessment** (`service/journey.cjs`, `adapters/rule-adapters.cjs`,
   `service/clarification.cjs`): `recordClarification` now constructs the authoritative statement first
   (`statement_id`, `recorded_at`, `report_identity`, `eligible_rules`, `furnishing_context`, `policy_id`,
   `policy_version`) and validates the owned report/result plus the applicable question context **before**
   evaluating; the evaluation is then run against that bound statement. `buildExceptionEvaluation` links every
   resolved exception item to the exact `statement_id` and the policy identity/version. Adapter IDs are now
   recorded as `eligible_rules` (provenance), never described as furnishing-event identities; the furnishing
   context is retained explicitly as unknown (`furnishing_context.established === false`).
2. **Integration coverage** (`service/tests/sections/bg-report-use.cjs` §14): a VM section that drives the wizard
   against the **actual local service** (the vm `fetch` delegates to the live `TestService` HTTP, no mocked
   fetch). **This is integration coverage, not a real-browser test** (the architect corrected the prior
   labelling). The prior fabricated-DOM + mocked-fetch test is retained as a unit test (§13).
3. **Finding candidate** (record only): `CRP_FINDING_CANDIDATE_001_CA_NS_BANKRUPTCY.md` — **withdrawn** (the
   second-bankruptcy exception prevents a demonstrated finding; enabling a flag would add no coverage).

Measured: full suite **5,848 assertions passed, 0 failed, 0 skipped**; closure scripts re-run and shared-file
pins revalidated (common-errors evidence restored; gap-finding-002 pins re-hashed).

## 11. Fourth correction (October 4) — materiality gate, judgment-content admission, citation reconciliation

1. **Material-question governance** (`adapters/report-use.cjs` `eligibleFor`, `adapters/rule-adapters.cjs`): the
   report-use question is now surfaced only when a single answer could MATERIALLY change a consumer finding.
   Under the negation-only policy a single-purpose statement resolves only the purpose it names, and every use
   exception rule records three distinct purposes, so the question is **not surfaced** and a stored statement is
   **retained but not reassessed** (no pointless review invalidation). Stored statements, correction provenance
   and the independent report checks are preserved.
2. **Citation reconciliation** (official Nova Scotia sources read locally): the in-force citation is
   **R.S.N.S. 1989, c. 93** (consolidated to 2018); the 2023 Revision re-numbers the Act as **c. C-53** with the
   "Reporting" section at s.12, but its commencement is **not established**. The recorded "c. 89, s. 11(3)" is
   wrong; "s. 11(3)" names the "Consent and notice" section.
3. **Admission proposal** (record only): `CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md` — a genuine
   **non-retention** report-content finding at **s.10(3)(d)** (judgment must mention the creditor name and the
   amount; the "where available" address and assignee are conditional and never a finding). A verified printed
   omission of the name/amount is a VIOLATION; an extraction failure, incomplete page or conditional address is
   not. No rule/permission changed.
4. **Real-browser verification** — **PENDING** (unavailable): a real Chrome browser is installed and headless
   `--dump-dom` works for static pages, but no automation driver (puppeteer/playwright) or WebSocket/CDP client
   is installed, and `--dump-dom` hangs on the SPA (async start + session cookie). The VM+TestService section is
   accurately labelled integration coverage, not a browser test.

Measured: full suite **5,847 assertions passed, 0 failed, 0 skipped** (bg-report-use 73). Coverage remains **9/82**.


