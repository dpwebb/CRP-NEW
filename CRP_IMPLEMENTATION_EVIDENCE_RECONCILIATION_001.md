# Implementation-evidence reconciliation (CRP-RECON-004)

Date: October 5, 2026 (America/Halifax). Command run from `accelerated-launch/service`:
`node release-check.cjs`. Sources: `out/b4-release-check.json`, `out/b2-evidence.json` (the
4,376-assertion full run), and the per-blocker evidence files under `accelerated-launch/service/out/`.

This record reconciles the release check with the ACTUAL build. It does not change any runtime
permission, admits no rule, deploys nothing and asserts no hosted result. Implementation closure,
browser/served verification, staging verification and production readiness are kept separate
(OWNER-CLOSURE-001).

## 1. The picture before and after

| | before | after |
|---|---|---|
| blocking checks (fails) | 33 | 33 |
| capability blockers | 29 | 29 |
| implementation closed (`IMPLEMENTED_AND_TESTED`) | 16 | **25** |
| implementation open | 13 | **4** |
| non-capability gates (config/deployment) | 4 | 4 |

Implementation closure is independent of a hosted journey. All 33 checks still fail, because every
capability blocker's **staging** status is `PENDING_VERIFICATION` and the four config/deployment
gates are unmet. Nothing was moved from "open" to "passing".

## 2. What changed: nine gates were open for STALE EVIDENCE, not missing implementation

Nine gates reported `implementation = OPEN` only because their evidence files predated the shared
implementation-closure block (they already recorded every criterion as passed with real measured
values, and each has a dedicated passing section named for the gap). Their evidence was translated
into the shared format by `SOURCE_CAPTURES/CLOSURE-POLICY-001/refresh-legacy-evidence-closure.cjs`.
No coverage was invented: every `expected`/`measured` value is taken from the artifact already on
disk, the sources and test sections are re-hashed from the real files, and the staging boundary is
recorded as `PENDING`.

| Gate | Dedicated passing section(s) | Criteria covered | Evidence |
|---|---|---|---|
| BLOCKER-CLARIFY-001 | `ap-accept-010-consistency` (74), `k-ui-smoke` (32) | at_most_two_questions, skip_and_dont_know, separate_supplemental_storage, no_escalation | `clarify-evidence.json` |
| GAP-INGEST-003 | `aj-ingest-dates` (37), `am-fdt-recovery` (52) | ocr_confidence_preserved, coordinates_preserved | `gap-ingest-003-evidence.json` |
| GAP-INGEST-007 | `aj-ingest-dates` (37) | reference_date_identified | `gap-ingest-007-evidence.json` |
| GAP-INGEST-008 | `ak-ingest-008-009-010` (40), `ao-ingest-008-mixed-page` (27) | partial_text_recovery | `gap-ingest-008-evidence.json` |
| GAP-INGEST-009 | `ak-ingest-008-009-010` (40) | bureau_segmentation | `gap-ingest-009-evidence.json` |
| GAP-INGEST-010 | `ak-ingest-008-009-010` (40), `u-hardening` (108) | upload_limits, container_handling | `gap-ingest-010-evidence.json` |
| GAP-FINDING-001 | `aq-gap-finding-001` (10) | rule_exceptions | `gap-finding-001-evidence.json` |
| GAP-FINDING-003 | `ar-gap-finding-003` (11) | rule_identity, version_binding | `gap-finding-003-evidence.json` |
| GAP-FINDING-004 | `as-gap-finding-004` (15) | source_linked_facts | `gap-finding-004-evidence.json` |

Each refreshed file carries `identity`, `implementation{configured,status,tests,source_files,evidence_refs}`,
`staging_verification{status:PENDING}` and a `reconciliation` block recording that the values came
from the pre-existing record. A later source or test change re-hashes differently and re-opens the gate.


## 3. The four genuinely open implementation gates

| Gate | Release-check reason | Class |
|---|---|---|
| BLOCKER-FINDING-COVERAGE-001 | implementation evidence is absent or not configured | **MISSING FUNCTIONALITY** — 16 of 82 rows (12 Canadian provinces/territories + the 4 GB nations) have no admitted substantive rule |
| BLOCKER-ALL82-FACILITATION-001 | implementation behavior `applicable_assessment` is not covered by a passing test | **MISSING FUNCTIONALITY** — the usable journey is demonstrated for all 82 rows, but only 66 reach a supported substantive rule path |
| BLOCKER-DISPUTE-PACKET-001 | ~~implementation behavior `jurisdiction_content` is not covered by a passing test~~ | **CLOSED (OWNER-PACKET-CORRESPONDENCE-001)** — the packet now carries the recipient type, the consumer-supplied correspondence details (stored separately from the report facts and bound into the approval), a correspondence covering only the selected issues, and an organized evidence-reference section; measured on the ACTUAL downloaded document by `cb-packet-correspondence` (84 assertions). The 16 rows without an admitted duty remain BLOCKER-FINDING-COVERAGE-001 and are NOT relabelled here |
| BLOCKER-FDT-001 | implementation evidence is absent or not configured | **STAGING / BENCHMARK-GATED** — two of its eleven required criteria are explicitly `on_deployed` demonstrations, so implementation closure cannot be claimed without a served measurement |

The three substantive gates share ONE root cause (the same 16 rows). They are registered separately
because the owner requires the finding coverage, the usable journey and the packet readiness to be
tracked as separate outcomes; they will be repaired together.

## 4. Staging-only requirements (not implementation gaps)

- `end_to_end_journey` on every capability blocker — a real served-release journey with a purchased
  download. Passing local tests do not stand in for it and it is not relabelled successful.
- The two `on_deployed` failure-to-detect recovery demonstrations.
- The four config/deployment gates: `SUPPORT_REFERENCE_SECRET_IS_CONFIGURED`,
  `PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING`, `CURRENT_GB_SUPPORT_IS_ESTABLISHED`,
  `DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED`.

## 5. New evidence produced this batch

`SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-all82-facilitation.cjs` writes
`out/all82-facilitation-evidence.json` and `closure-dispute-packet.cjs` writes
`out/dispute-packet-evidence.json`, both from existing passing behavioral coverage. Each maps every
required criterion to its actual test and source identity, and both leave exactly one criterion
explicitly open (`applicable_assessment` / `jurisdiction_content`) rather than asserting coverage
for all 82 rows. One demonstrated category is not treated as comprehensive coverage.

## 6. Executable sources

No executable source was changed by this batch. The 4,376-assertion regression (0 failed,
0 skipped) remains valid and was reused; the closure scripts read `out/b2-evidence.json` and refuse
to write if the referenced section did not pass.

## 7. OWNER-PACKET-CORRESPONDENCE-001 — the packet completed as consumer-controlled correspondence

Status after this batch: **implementation closed 26, implementation open 3, staging verification
pending 29, 33 release checks still failing**. `BLOCKER-DISPUTE-PACKET-001` moved from OPEN to
`IMPLEMENTED_AND_TESTED`. `BLOCKER-SUBSCRIPTION-VALUE-001`, `BLOCKER-BILLING-001` and
`BLOCKER-SUPPORT-001` were briefly re-opened by this batch's own source change (their records hash the
implementation sources they cite) and were re-derived, correctly, by the same run — that is the intended
behaviour, not a regression.

What the packet now is, measured on the ACTUAL downloaded file:

| Addition | Where | Evidence |
| --- | --- | --- |
| The recipient **TYPE** — "the consumer reporting agency that issued this report". No postal address is invented, because this service supplies none. | `packets.cjs` (`RECIPIENT_TYPE`, `recipientTypeOf`) | `cb-packet-correspondence` |
| The consumer-entered **correspondence details** (name, reply contact, optional reference), stored on the packet row SEPARATELY from the report facts and hashed into the approved version. | `packets.cjs` (`setCorrespondence`, `canonicalVersion`) | `cb-packet-correspondence` — the details never appear in the persisted result, extraction or evaluation |
| A **correspondence** stating one request per SELECTED issue and nothing else, ending with a statement that the consumer reviews, edits and sends it and that this service supplies no address and sends nothing. | `packets.cjs` (`correspondenceLines`) | `cb-packet-correspondence`, `bw-browser-wizzard` |
| An **organized evidence-reference section**: report and record identity, the raw printed readings, the normalized values, the available source locations, and the recorded rule only where a statutory duty applies (a factual verification request still carries no citation). | `packets.cjs` (`evidenceLines`, `evidenceFacts`) | `cb-packet-correspondence`, `bo`, `bl`, `bs`, `bx` |
| The **consumer review** of that correspondence and evidence in the Wizzard, before approval. | `ui/app.js`, `ui/style.css` | `bn`, `bo`, `bw` (real browser) |

Refusals and controls, all typed: a missing necessary detail refuses approval AND download
(`409 PACKET_CORRESPONDENCE_REQUIRED`) rather than producing an unusable document; editing a detail after
approval leaves the packet unapproved and the download refused until reapproval; a re-evaluation marks the
approval stale (`409 PACKET_APPROVAL_STALE`); a stranger is refused `403` and an unpaid account `402`.
No address, remedy, deadline, signature or submitted status is invented, and no legal-advice disclaimer
appears in the packet, the review or the download.

**Evidence generation is now self-restoring.** The run's own writers refresh the measured content of several
evidence files, so after writing them the full regression now re-derives every closure record (plus the
subscription-value evidence builder) from that same run — 16 records in this run. A successful run therefore
leaves valid implementation evidence with no manual step, and a FAILED run restores nothing, so no record can
claim a pass the run did not demonstrate. Each record still re-hashes the sources it cites.

## 8. Executable sources (this batch)

`packets.cjs`, `errors.cjs`, `app.cjs`, `ui/app.js`, `ui/style.css`, `tests/run-tests.cjs` and the new
`tests/sections/cb-packet-correspondence.cjs`; `tests/sections/bw-browser-wizzard.cjs` and
`bo-prime-directive-interaction.cjs` were extended, and the existing packet-flow sections gained the
(correct) step of supplying the correspondence details before approving. Final full regression:
**4,499 assertions passed, 0 failed, 0 skipped** — the previous 4,395 plus the new coverage.


## 9. OWNER-CA-ORDINARY-REPORT-001 — the first substantive Canadian ordinary-report rule

**Status after this batch:** implementation closed **26**, implementation open **3** (`BLOCKER-FDT-001`,
`BLOCKER-FINDING-COVERAGE-001`, `BLOCKER-ALL82-FACILITATION-001`); staging verification pending 29; 33 release
checks still failing. The substantive rule path now covers **67 of 82** regions instead of 66: Ontario joined the
demonstrated set, and the 15 rows still without one are the 11 remaining Canadian provinces/territories and the
4 GB nations.

**The candidate investigation, done once.** Only `CRP-LSRC-0362` satisfied all three prerequisites in its own
record: EXACT `CA-ON` association (`COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED` does not apply), instrument
class `STATUTE_OR_REGULATION` with `instrument_class_confirmation_required: false`, and
`existing_operational_mapping.state: ESTABLISHED` on the legacy atomic rule
`ca-on.cra.s9_3_a.best_evidence_basis`. `CRP-LSRC-0319` (PIPEDA) keeps three unresolved dependencies and the other
Ontario IDs are `SCREEN_INCONCLUSIVE`; none of them was implemented or turned into a disabled adapter.

**What is recorded, not assumed.** One implementation dependency existed — `REGISTER_DISPOSITION_UNRESOLVED` —
with a recorded clearing authority of "WORK … record a durable per-ID rescreen disposition". That disposition is
now a durable artifact, it states exactly what the rule turns on (the already-established ordinary-account
opened/closed mapping) and therefore why no additional authorised evidence route is required, and it retains every
administrative limitation the ledger records. **(Corrected 2026-10-04, OWNER-CA-ORDINARY-REPORT-002: the provision
wording is now recorded rather than merely unrecorded — see the paragraph below. The ledger's remaining
administrative limitations are still retained.)**

**Corrected legal basis (OWNER-CA-ORDINARY-REPORT-002).** The provision was retrieved or located and its wording is
now recorded: Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a) — "any credit information based on
evidence that is not the best evidence reasonably available", within "9(3) A consumer reporting agency shall not
include in a consumer report,". Section 9 is "Procedures of agencies"; s. 9(2) is "Information included in consumer
report" and s. 9(3) is "Idem". Publisher: Government of Ontario, e-Laws. Applicable edition: the consolidation in
force (consolidation period from July 1, 2026 to the e-Laws currency date; last amendment 2025, c. 24, Sched. 6,
which amends s. 12(3) and not s. 9). Record:
`SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json`.

What that corrected: the rule's recorded subject previously read "information that is not based on the most
reliable evidence reasonably available" — a gloss on another instrument's phrase, not this provision's words. The
provision supports the assessment (a report whose own two printed values for one account cannot both be right is
affirmative, still rebuttable, evidence that the credit information included for that account was not based on the
best evidence reasonably available), so the attribution and the statutory coverage claim are **kept**, with the
ceiling at `PROBABLE_VIOLATION` and the specific uncertainty stated. Retained limitations: no authoritative
full-page render of paragraph (a) was obtained in this environment, and the Act's definition of "credit
information" is an enumeration that does not name account dates expressly.

**Temporal applicability corrected too.** An earlier note in this batch said commencement did not matter because
the rule performs no arithmetic. That conflated two questions: temporal applicability is a condition of legal
**attribution** for every rule, content rules included (the provision must be in force, and the applied version must
govern the report's period, before it is named), whereas retention arithmetic — counting a period, applying a day
offset, aging an entry — is what this rule does not do. No commencement date is claimed, and the absence stays a
recorded limitation rather than being treated as irrelevant.

**One issue, not two.** The same printed conflict previously reached the consumer twice — as the shared factual
observation and as the Ontario issue. `issues.cjs` now folds an overlapping factual observation into the content
finding's issue as a second supported base (internal classification, check id, evidence and source locations all
preserved), so the Wizzard offers **one** issue with **one** verification request and the downloaded packet names
both bases. Outside Ontario the factual observation is still offered on its own, and all 82 rows still run the
journey: `bx-all82-factual-verification` now locates the factual base explicitly where it is carried inside a
region's own issue instead of skipping that region.

**What the rule can and cannot say.** A report-evidence RELIABILITY rule: the report's own two printed values for
one ordinary account cannot both be right. The ceiling is `PROBABLE_VIOLATION` — the report never shows which of
the two values is unreliable or whether a benign explanation applies — so the request is a verification, never a
correction demand. A reading that could not be made is never treated as an absent date; an absent date is never
treated as compliance.

**Executable sources.** `accelerated-launch/adapters/rule-adapters.cjs` (the `CONTENT_RELIABILITY` anchor mode, its
evaluation builder and its guarded classifier, with the provision's own words in the recorded comments),
`accelerated-launch/adapters/adapter-configs.json` and `rule-adapter-catalog.json` (the 20th adapter, with the
catalog mirror and config digest regenerated by the idempotent builder
`SOURCE_CAPTURES/PHASE5-001O/add-ca-on-ordinary-report-adapter.cjs`), `accelerated-launch/service/applicability.cjs`
(the `ORDINARY_ACCOUNT_BOTH_DATES_PRESENT` reach rule), `accelerated-launch/service/issues.cjs` (the recorded
wording, a recorded per-rule request type, and the overlap fold that delivers one issue with both supported bases),
`accelerated-launch/service/packets.cjs` (the correspondence stating each additional supported base),
`accelerated-launch/launch-matrix.json` (Ontario's availability row), the section
`tests/sections/cc-ca-on-ordinary-report.cjs` (now 120 assertions), `tests/sections/bx-all82-factual-verification.cjs`
(which locates the factual base where it is carried inside a region's own issue, so no row is skipped), and the two
assertions that encoded the previous no-adapter state (`adapters/test-adapters.cjs`,
`tests/sections/n-applicability-records.cjs`), updated to assert that Ontario carries exactly its OWN recorded limb
and that a province with none still gets nothing.

## 10. CRP_VERSION_1_FINISH_ORDER_001 — the GB statutory outcome, the recorded Canadian blockers, and the prepared acceptance/staging artifacts

**Delivered (implementation).** The four canonical GB regions now each offer one recorded statutory comparison on
the general bureau-report intake: the report's own two printed values for one ordinary account cannot both be
right, raised as a **probable** content issue under the recorded UK GDPR accuracy/rectification limb (Articles
5(1)(d) and 16; source row `CRP-LSRC-0407`; legacy rule `uk.accuracy_duty.gdpr5`). It reaches the consumer as ONE
issue carrying both its supported bases with ONE verification request, through upload → Issue → Wizzard → selected
correspondence → approval → entitled download. Regions with a recorded statutory comparison: 67 → **71 of 82**.

**Why it was ready.** Owner-accepted row; `STATUTE_OR_REGULATION` with no confirmation outstanding; verified,
established legacy mapping; and the provision's own words plus its printed `U.K.` territorial extent retrieved
from the official publisher (`legislation.gov.uk`). The relation `GB-UK-GDPR-ACCURACY-COUNTRY-WIDE` therefore
rests on the instrument's own extent — **not** on renaming the bare `UK` token, which the existing relation
records as NOT adopted. Records: `SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json` and
`…-rescreen-disposition.json`.

**Not claimed.** No served verification, no production readiness. The provision's original commencement date stays
NOT RECORDED. `packet_eligible` stays false (a probable content finding is packet-eligible by confidence, not by a
widened per-rule permission). `CURRENT_GB_SUPPORT_IS_ESTABLISHED` is untouched: this rule runs on the general
intake, and the GB family reader's currency remains a separate intake gap reported by name.

**Recorded once as blocked.** `SOURCE_CAPTURES/CA-REMAINING-COVERAGE/crp-remaining-canadian-coverage-blocked-candidates.json`
names per region the admitted rows and the exact missing prerequisite, why a provincial limitation Act is not
substituted for a reporting duty, and the three recorded blockers on the federal PIPEDA relation. No new inventory
pass and no disabled adapter.

**Acceptance artifacts prepared.** `SOURCE_CAPTURES/FDT-ACCEPTANCE-001/` — frozen fictional held-out inputs with
digests, the local benchmark and frozen acceptance results, the criterion record
(`accelerated-launch/service/out/fdt-mitigation-evidence.json`) with the two served criteria FALSE and staging
PENDING, and the served-run procedure. The release check now reports the blocker's precise reason instead of
"evidence absent". `SOURCE_CAPTURES/STAGING-RC-001/staging-release-candidate.json` — candidate
`crp-wizard-e5262de035a8c240`, 68 runtime files, fictional inputs, the existing rollback procedure, named missing
configuration and **33 launch-blocking failures recorded at preparation time**. Not deployed; no host contacted.

**Executable sources this batch.** `accelerated-launch/adapters/adapter-configs.json`, `applicability-records.json`
and `rule-adapter-catalog.json` (the 21st adapter, the recorded relation and the mirror, regenerated by the
idempotent builder `SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/add-gb-uk-gdpr-accuracy-adapter.cjs`),
`accelerated-launch/service/issues.cjs` (the GB wording and the overlap fold that keeps the consumer to one issue),
`accelerated-launch/launch-matrix.json` (the four GB availability rows, with the classes each region already had
preserved), the new section `tests/sections/cd-gb-uk-gdpr-accuracy.cjs` (113 assertions), and the assertions that
encoded the previous GB state (`tests/sections/n-applicability-records.cjs`).

**Evidence generation.** Focused runs during development (the new section, the Ontario section, the applicability
suite, the all-82 factual journey, the shared regressions, the GB format section, the all-82 infrastructure, the
refusal, qualification, packet-reconciliation, admission and GB/TU field sections — 1,657 assertions, 8 failures
found and fixed, then 1,200 assertions green), followed by one full regression that re-derives every closure
record from its own run.

**Evidence generation.** The change was validated with focused runs only (the affected sections plus the all-82 and
packet sections), and then one full regression, which re-derives every closure record from its own run — including
the retrieval record now listed among `closure-all82-facilitation.cjs`'s hashed evidence references. Two stale
coverage strings in that closure record ("66/82 … the 12 Canadian modules", "66 with a statutory rule comparison, 16
without") were corrected to the measured 67 / 11 / 15 alongside the change.

