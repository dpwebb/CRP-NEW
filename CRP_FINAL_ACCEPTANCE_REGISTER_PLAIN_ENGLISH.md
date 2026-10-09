# Credit Regulator Pro — final acceptance checklist

## October 9 — recovery rehearsal verified on current staging

The requested backup restoration and previous-release rehearsal is **VERIFIED on staging**. An actual complete stopped-service backup was restored in isolation, with real restored sign-in, saved account details, report/assessment and document-byte checks. Public staging was switched to the retained previous release and safely back to the newest build without losing existing records. The final state, private backup custody, cleanup, corrected failed attempts and timings are recorded in `CRP_BACKUP_RESTORE_ROLLBACK_CLOSEOUT_2026_10_09.md`. Production backup cadence/retention/off-host custody and production-specific configuration remain separate, unverified requirements. This current recovery update does not relabel the historical acceptance rows for other features or declare production readiness.

## October 5 — OWNER-V1-SEVEN-DAY-001 adopted

`CRP_OWNER_VERSION_1_SEVEN_DAY_EXECUTION_001.md` overrides conflicting build schedules with October 5–11 checkpoints toward an approved-scope staging candidate. `CRP_VERSION_1_SEVEN_DAY_WORK_REGISTER_001.md` is the single remaining-work schedule. Preserve 82 jurisdictions, existing core obligations, one implementation writer, supported potential issues and release authorization. No runtime source changed or acceptance status closed by this amendment; no full regression needed for documentation. Target date is not a production-readiness guarantee.

## October 5 owner priority — BLOCKER-REPORT-DATA-TO-ISSUE-001

OPEN production blocker; implementation OPEN; staging PENDING. See `CRP_OWNER_REPORT_DATA_TO_ISSUE_BLOCKER_001.md`. Highest priorities: material ordinary-report extraction, relevant functional compliance/factual assessment, delivery through existing consumer-selected packets. Execute together in small complete consumer journeys, starting with TransUnion Canada account-table gaps. Date-only admission does not establish substantive review. Existing packets remain implemented; this blocker does not undo that work. Documentation registration is complete; release-checker/evidence integration is required in the next executable batch and is not claimed complete here. No tests rerun for this documentation-only amendment.

Prepared October 1, 2026, Halifax time. This is the checklist for final acceptance, not a declaration that the product is finished.

## October 4 — CRP_VERSION_1_FINISH_ORDER_001: GB statutory coverage delivered, Canadian rows recorded once, acceptance and staging artifacts prepared

**Delivered consumer outcome (implementation).** A GB selection (GB-ENG, GB-WLS, GB-SCT, GB-NIR) whose report
prints one ordinary account with an opened date later than its closed date is now offered ONE probable reporting
issue: it carries the recorded UK GDPR accuracy/rectification limb (Articles 5(1)(d) and 16; source row
`CRP-LSRC-0407`; legacy rule `uk.accuracy_duty.gdpr5`) together with the factual conflict it rests on, with ONE
verification request, through upload → Issue → Wizzard → selected correspondence → approval → entitled download.
Fictional fixtures only. Section `cd-gb-uk-gdpr-accuracy` (113 assertions, 0 failed). Regions with a recorded
statutory comparison: **67 → 71 of 82**; regions without one: **15 → 11** (all Canadian).

**Why this one was ready where the remaining Canadian rows are not.** The row is owner-accepted; its instrument
class is `STATUTE_OR_REGULATION` with no confirmation outstanding; its legacy atomic rule is an established,
verified mapping; and the provision's own words and its printed `U.K.` territorial extent are retrievable from
the official publisher (`legislation.gov.uk`), so the four GB regions are reached through a recorded relation
built on the instrument's own extent rather than by resolving a bare `UK` token from off-report state. Records:
`SOURCE_CAPTURES/GB-UK-GDPR-ACCURACY/crp-lsrc-0407-provision-retrieval.json`,
`…-uk-gdpr-accuracy-rescreen-disposition.json`, and relation `GB-UK-GDPR-ACCURACY-COUNTRY-WIDE`.

**Not claimed.** No served verification, no production readiness, no universal accuracy. The current-format GB
consumer-disclosure family gap (`CURRENT_GB_SUPPORT_IS_ESTABLISHED`) is untouched and still open **by name**: this
rule runs on the general bureau-report intake. The provision's original commencement date remains NOT RECORDED and
is not claimed. `packet_eligible` stays false.

**Recorded once as blocked (no new inventory pass).**
`SOURCE_CAPTURES/CA-REMAINING-COVERAGE/crp-remaining-canadian-coverage-blocked-candidates.json` names, per
province/territory, the admitted rows that exist and the exact missing prerequisite (`SECTION_NOT_VERIFIED…`,
`LEGACY_OPERATIONAL_MAPPING_NOT_ESTABLISHED`, `REGISTER_DISPOSITION_UNRESOLVED`), why a provincial limitation Act
is not substituted for a reporting duty, and the three recorded blockers on the federal PIPEDA route. No disabled
adapter was built to raise a count and no jurisdiction was dropped.

**Acceptance artifacts prepared.** Failure-to-detect: the held-out inputs are frozen on disk with digests, the
local benchmark and the frozen acceptance run are recorded, and the criterion record
(`accelerated-launch/service/out/fdt-mitigation-evidence.json`) carries every locally demonstrated criterion with
the **two served criteria left FALSE** and staging `PENDING`. Procedure:
`SOURCE_CAPTURES/FDT-ACCEPTANCE-001/staging-fdt-acceptance-procedure.md`. Staging candidate (prepared, not
deployed): `SOURCE_CAPTURES/STAGING-RC-001/staging-release-candidate.json` — candidate `crp-wizard-e5262de035a8c240`,
68 runtime files, the fictional acceptance inputs, the existing rollback procedure, the named missing configuration
and **33 launch-blocking failures recorded at preparation time**. No host was contacted, no bundle published, no
billing setting touched, no provider added.

**Still the active priority, not advanced by this batch.** `BLOCKER-REPORT-DATA-TO-ISSUE-001` (material
ordinary-report extraction → relevant assessment → existing packets). Its release-checker/evidence integration
remains outstanding.

**Remaining exact core work (short list).**
1. The 11 Canadian rows: obtain the missing prerequisite above per region (no substitute instrument).
2. The federal PIPEDA route: the recorded instrument-class confirmation, a recorded region relation, and the
   per-ID rescreen disposition.
3. `BLOCKER-REPORT-DATA-TO-ISSUE-001` release-checker/evidence integration.
4. The two served FDT demonstrations plus a target release identity.
5. `CURRENT_GB_SUPPORT_IS_ESTABLISHED` (a current-format GB family artifact) — separate intake gap.
6. Served/staging verification and the configuration gates named by the release check.

## Historical decision snapshot

**Not complete. Not ready for paid public launch.**

The staging website is running build `crp-wizard-66b39f530e08ed1d`. Its public health check was checked: staging, test billing, not launch ready. Its jurisdiction endpoint lists 82 regions. Listing a region is not proof that its promised assessments work; the substantive statutory checks below are measured separately.

The active Cline task has now deployed the connected US and Australian comparisons, the OWNER-EVIDENCE-001 reported-fact policy, the ACCEPT-002 reassessed public-record legal-event limbs, the ACCEPT-003 D1–D4 owner decisions (collection 180-day rule, satisfied-judgment condition, and per-rule classification), and the ACCEPT-004 classification correction (a permission ceiling caps, never selects, a finding class; the class is derived from a per-assessment legal-evaluation record) to staging build `crp-wizard-dbcaa58638065532`; their execution is recorded in the "Substantive assessment coverage" section below, not claimed from the local matrix alone.

Status meanings: **Demonstrated** means the named test produced the recorded result within its stated scope. **Partly demonstrated** means some of the promise works. **Not demonstrated** means sufficient evidence is missing; it does not mean the feature necessarily fails. **Incomplete** means a known requirement remains unmet. Earlier-build evidence requires a check on the final release before final acceptance.

## Current OWNER-CLOSURE-001 status — October 4, 2026

Implementation closed: 19; implementation open: 9; staging verified: 4; staging pending: 24; production launch failures: 28; launch_ready: false. (October 4: BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and BLOCKER-DISPUTE-PACKET-001 registered as OPEN production blockers; total release-check checks now 51.)

Full regression: 5769 passed, zero failed/skipped (was 5793; −24 from the bf-gap-ingest-006 49→25 trim). GAP-INGEST-006 (month-only / partial-date precision, implementation only; staging PENDING). The same-record date contradiction is persistent (A→B→A and A→B→C never restore a resolved fact) and preserves every raw reading and owning source location. Month-only anchors keep MONTH precision and are compared as a whole-month range (straddle withheld); complete dates keep DAY; invalid forms stay unresolved. Architectural constraint returned: no existing `finding_allowed` rule emits a finding for a MONTH-precision anchor (the adverse rule's finding is withheld by three report-unobservable §1681c(b) exceptions; the bankruptcy rule requires DAY precision), so a month-precision violation-finding path is not claimed. New test `bf-gap-ingest-006` (25 assertions); existing `aj-ingest-dates` (37) and `z-general-intake` (75). GAP-INGEST-001, -002, -004 and -005 remain closed. Billing is 40 assertions. All staging verifications remain pending. See the per-blocker completion records (`CRP_GAP_INGEST_001/002/004/005/006_COMPLETION.md`) for behavior and limitations. Earlier numeric totals elsewhere in this register are historical snapshots.

Implementation open IDs:
- BLOCKER-FDT-001_FAILURE_TO_DETECT_MITIGATION
- BLOCKER-CLARIFY-001_MINIMAL_OPTIONAL_CLARIFICATION
- GAP-INGEST-007_REPORT_REFERENCE_DATE
- GAP-INGEST-008_PARTIAL_NATIVE_TEXT_RECOVERY
- GAP-INGEST-009_BUREAU_SEGMENTATION
- GAP-INGEST-010_UPLOAD_LIMITS_AND_CONTAINERS
- BLOCKER-FINDING-COVERAGE-001
- BLOCKER-ALL82-FACILITATION-001
- BLOCKER-DISPUTE-PACKET-001

## What must work

| What we promised | How we will prove it on the website | Evidence available now | Current decision |
| --- | --- | --- | --- |
| Consumers can create accounts and sign in | Create two accounts, sign in and out, and verify that a signed-out session cannot access private data | An earlier staging journey demonstrated accounts, secure cookies and session revocation after account deletion | Partly demonstrated; repeat on final build |
| One consumer cannot see another consumer's information | Try another account's reports, results, files and downloads through direct requests | Earlier staging test denied another account access with HTTP 403; full access-route coverage is not recorded here | Partly demonstrated |
| Consumers can select any of the 82 jurisdictions | Check every region and confirm incompatible selections are refused rather than guessed | Current public endpoint lists 82 regions; no region is marked launch ready | Region list demonstrated; full selection journey needs final check |
| Every jurisdiction receives useful applicable assessments | Upload suitable examples for every region and demonstrate the relevant checks actually running | The public endpoint declares capability counts, but there is no complete deployed per-region test record here | Incomplete |
| Relevant bureau reports are accepted despite varying layouts | Upload examples for each advertised bureau and country, including unfamiliar layouts | Five named presentations plus general intake are deployed; one synthetic general report was recorded as accepted | Partly demonstrated; bureau-by-bureau results still required |
| Native PDFs can be read | Upload text-based PDFs and compare important extracted values with the source | Earlier staging PDF journey completed three checks; current Linux probe extracted one general record | Partly demonstrated |
| Scanned PDFs can be read | Upload image-only PDFs and verify important values and their page locations | OCR implementation and local tests exist; a complete current deployed scanned-PDF journey is not recorded here | Not demonstrated to completion |
| Photos and screenshots can be read | Upload images through the website and compare extracted values with the image | Current deployment record reports direct image OCR available, reading 10 lines | Partly demonstrated; OCR probe is not a complete upload-and-assessment journey |
| Multiple images form a coherent report | Upload ordered pages, including duplicates and mixed reports; verify boundaries and order | Ordered individual image handling is reported; complete mixed-set browser proof is absent | Partly demonstrated |
| Unrelated documents receive a useful refusal | Upload an unrelated document and a document containing only bureau branding | Current deployed probe refused an unrelated document; broader local tests exist | Partly demonstrated |
| Unreadable reports receive useful recovery instructions | Upload encrypted, blurred and cropped examples; verify specific instructions | Local refusal tests and messages exist; deployed browser evidence is not recorded here | Not demonstrated to completion |
| Dates and accounts are interpreted correctly | Compare expected accounts, event meanings, dates and source locations across layouts | Current deployed general probe extracted one record and its report date; no measured broad accuracy benchmark is recorded | Incomplete |
| Reports receive substantive statutory assessments | Use qualifying, non-qualifying and missing-fact examples for each implemented rule | General-report deployment is documented with one date-consistency check; additional local US/AU connections are work in progress | Incomplete |
| Violations and probable violations are surfaced as promised | Demonstrate authorized examples in each class, with evidence and the applicable rule | ACCEPT-004: 11 US/AU rules now emit `VIOLATION` on a resolved, unexcepted breach; the deployed consumer path (native PDF and scanned-image OCR) recorded `VIOLATION` for the bankruptcy and collection limbs | Partly demonstrated; no authorized `PROBABLE_VIOLATION` case exists among the current rules, and none is manufactured |
| Missing facts affect only the checks needing them | Use a report with one ambiguous field and verify other eligible checks still run | Local behavior is covered by tests; comprehensive deployed examples are absent | Partly demonstrated |
| Consumers are asked only simple, useful questions | Demonstrate one consequential clarification and a skipped question without blocking other checks | Requested in the running work order; no completed deployed evidence reviewed | Not demonstrated |
| Results explain the issue and its evidence | Inspect source links, applicable rule, qualifications and checks not performed | Earlier downloaded assessment contains qualified observations; substantive finding explanations are not demonstrated | Partly demonstrated |
| A purchased report can be downloaded | Purchase in test mode, assess, download twice, and try an unpurchased case | Earlier staging test: download HTTP 200, identical repeat, unpurchased case HTTP 402, three checks performed | Demonstrated on earlier build; repeat on final build |
| Pricing is CAD 5.95 once, 7.95 monthly, 79.50 yearly | Verify Checkout amounts, currency and subscription terms against the displayed offer | Recorded real sandbox payments support one-off and discounted subscription amounts; production billing is not ready | Partly demonstrated |
| The CAD 5.95 upgrade credit works once within 90 days | Test timely upgrade, expired credit and attempted double use | Five completed sandbox sessions include monthly first payment CAD 2.00 and annual CAD 73.55; expiry and duplicate-use tests are local | Partly demonstrated; repeat deployed edge cases |
| Subscription changes and payment failures are handled correctly | Exercise renewals, cancellations, refunds, disputes and duplicate webhooks | Local tests exist; full deployed lifecycle evidence is absent | Not demonstrated to completion |
| Consumers can prepare supported next steps and track their case | Create and review an eligible draft, download it and record response status without implying delivery | Case/draft features exist, but no complete current deployed acceptance record is established here | Not demonstrated to completion |
| Private reports remain private and can be deleted | Test ownership, deletion, retention policy, logs and external transmission boundaries | Earlier staging deletion revoked the session; local privacy tests exist; broader final-release review is required | Partly demonstrated |
| The service survives interruptions and supports multiple users | Run concurrent uploads/assessments and interrupt processing; measure recovery and response time | Local atomic-storage and recovery tests exist; deployed capacity measurements are absent | Not demonstrated to completion |
| Backups can restore service and releases can be rolled back | Restore a copied backup in isolation and rehearse rollback without losing consumer records | October 9: actual full backup restored with sign-in/report/document checks; public staging served the previous build and returned to the newest; existing data preserved. See current recovery closeout. | Staging verified; production backup configuration unverified |
| The website's promises match what it actually checks | Compare purchase wording, coverage and results against executed tests | Staging clearly reports test billing and not launch ready; broad violation-detection promise remains unmet | Incomplete |
| The final production website runs the accepted build | Verify release identity, live billing configuration and the full production journey | Current evidence is staging only; live billing and production acceptance are not established | Incomplete |

## Substantive assessment coverage (measured on `crp-wizard-239163a95166f46e`)

Four statutory checks run on general intake reports, one (CA-NS bankruptcy discharge) anchors on a clearly labelled reported fact, six public-record limbs are reassessed individually, and the ACCEPT-003 owner decisions add the collection 180-day rule, the satisfied-judgment condition, and per-rule classification. Local regression: **4,899 assertions passed, 0 failed, 0 skipped**. For each check, the deployed Linux build was exercised directly, and the `ab-acceptance-statutory` / `ac-evidence-policy` / `ad-legal-event-facts` / `ae-accept-003` sections exercise exceeded / not-exceeded / missing-fact / contradictory-fact / condition / equiv-layout cases.

| Check | Exceeded (actual) | Not exceeded (actual) | Missing fact (actual) | Limitation |
| --- | --- | --- | --- | --- |
| FCRA-605A-5-US-NATIONAL-7Y | `EVALUATED PERIOD_EXCEEDED` | `EVALUATED PERIOD_NOT_EXCEEDED` | not run (no adverse annotation) | observation only; no finding class |
| AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y | `EVALUATED PERIOD_EXCEEDED` | `EVALUATED PERIOD_NOT_EXCEEDED` | not run (no closure date) | observation only |
| AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y | `EVALUATED PERIOD_EXCEEDED` | `EVALUATED PERIOD_NOT_EXCEEDED` | not run (no enquiry) | observation only |
| AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y | `EVALUATED PERIOD_EXCEEDED` | `EVALUATED PERIOD_NOT_EXCEEDED` | `UNRESOLVED` (no original-listing date) | never aged from a current-listing date |

Still withheld: CA-NS last-payment (exact-specimen PR-01). FCRA § 605(a)(2) is an explicitly incomplete observation (the "statute of limitations if longer" alternative is not computed — no owner-accepted US-state limitation record establishes the governing period). GB has no accepted statutory rule. No all-82 statutory coverage is claimed.

## OWNER-EVIDENCE-001 — reported-fact policy (deployed, verified on `crp-wizard-35be7c9f8274005a`)

The owner-authorized evidence policy is now stored, versioned and enforced (not documented-only):

- **Policy:** "A clearly labelled fact printed on an admitted credit report is accepted as the bureau's reported fact for assessment, unless its reading, record association or meaning is materially ambiguous or contradictory. External corroboration is not required merely because the fact describes a legal event." (`OWNER-EVIDENCE-001`, version `1.0`, integrity digest `d48e4633…`).
- **Enforced** through `acceptFact` in `reported-fact-policy.cjs`, and the digest is now pinned in `reported-fact-policy.approval.json` and re-verified on every load — an altered text, version, or missing approval binding refuses to run. Both files are bound into the release manifest and re-hashed on Linux (0 mismatches).
- **Bankruptcy discharge date:** `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` now anchors on `bankruptcy.dischargeDate` (`SINGLE_FIELD`); the deployed Linux build evaluates it `EVALUATED PERIOD_EXCEEDED`. The exact-specimen PR-01 restriction and observation-only ceiling are preserved; accepting the fact does not authorize a finding.
- **Tests:** `ac-evidence-policy` (46 assertions) proves explicit dates are accepted; ambiguous, contradictory, mis-associated, trustee and filing/update dates are withheld; equivalent facts work across layouts; accepting the fact does not authorize a violation finding; and policy alteration is detected. Two separate bankruptcies keep their own discharge dates.

## ACCEPT-002 — reassessed public-record legal-event limbs (deployed on `crp-wizard-35be7c9f8274005a`)

Six limbs previously withheld as `NOT_REPORT_EVIDENCED` are now reassessed individually and anchor on a clearly labelled legal-event date accepted under OWNER-EVIDENCE-001. A filing or update date is never substituted.

| Check | Anchor | Deployed result (exceeded) |
| --- | --- | --- |
| FCRA-605A-1-US-NATIONAL-10Y | order for relief / adjudication (priority chain) | `EVALUATED PERIOD_EXCEEDED` |
| FCRA-605A-2-US-NATIONAL-7Y | judgment entry | `EVALUATED PERIOD_EXCEEDED` |
| FCRA-605A-3-US-NATIONAL-7Y | tax lien paid | `EVALUATED PERIOD_EXCEEDED` |
| US-NY-GBL-380J-F1-I-BANKRUPTCY-14Y | adjudication | `EVALUATED PERIOD_EXCEEDED` |
| US-NY-GBL-380J-F1-III-TAX-LIEN-PAID-7Y | tax lien paid | `EVALUATED PERIOD_EXCEEDED` |
| US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y | order for relief | `EVALUATED PERIOD_EXCEEDED` |

Still withheld with precise reasons: FCRA § 605(a)(4) (the § 605(c)(1) 180-day rule) and the US-NY satisfied-judgment limb (the "satisfied within five years" condition). `ad-legal-event-facts` (19 assertions) demonstrates qualifying / non-qualifying / insufficient-fact / contradictory-fact / equivalent-layout cases, and that a filing date is never substituted.

## ACCEPT-003 — D1–D4 owner decisions (deployed on `crp-wizard-239163a95166f46e`)

- **D2 (collection 180-day rule):** `FCRA-605A-4-US-NATIONAL-7Y` now anchors on `collection.delinquencyDate` and applies the § 605(c)(1) 180-day offset. Deployed Linux result: `EVALUATED PERIOD_EXCEEDED`, anchor shifted to `2017-06-30`, finding `VIOLATION`. A collection-placement/update/payment date is never substituted.
- **D3 (satisfied-judgment condition):** `US-NY-GBL-380J-F1-II-JUDGMENT-5Y` is a multi-fact limb (entry date + satisfaction-within-five-years). Deployed Linux result: `EVALUATED PERIOD_EXCEEDED`, finding `VIOLATION`; satisfaction after five years and a missing satisfaction date are unresolved/refused, never substituted.
- **D1 (judgment SOL):** `FCRA-605A-2-US-NATIONAL-7Y` remains an explicitly incomplete observation — the "statute of limitations if longer" alternative is not computed (no owner-accepted US-state limitation record), so the 7-year comparison is a minimum and never the full threshold.
- **D4 (classification):** superseded by ACCEPT-004 below. A permission ceiling no longer selects the finding class.

## ACCEPT-004 — classification correction (deployed on `crp-wizard-a88c5ae2c99aaf88`)

The owner ruled that a permission ceiling is not a classification decision, then measured that the first ACCEPT-004 classifier still hardcoded `exceptions: []` and derived `breach_established` from `PERIOD_EXCEEDED` alone. Round 2 replaces those defaults with actual rule-specific predicate and exception evaluation.

- **`buildEvaluationRecord` now builds required predicates** (anchor field + condition field + reference date), each explicitly resolved or unresolved, and **derives exceptions from the adapter's recorded exceptions** (`evaluation_required` true/false, per-item `applies`/`resolved`). Missing evaluation stays unresolved; nothing is defaulted to cleared.
- **`classifyEvaluation` validates the complete record** — selected jurisdiction, admitted rule identity/version, every required resolved fact with a source value, reference date, timing (`PERIOD_EXCEEDED`), every resolved condition, and an explicitly resolved exception evaluation. An incomplete record yields no finding.
- **An empty exception list is acceptable only where the rule explicitly records no exception** (`evaluation_required: false`). `FCRA-605A-2`'s "statute of limitations if longer" is the recorded `observation_incomplete` computation gap, not an exception. The CA-NS bankruptcy "second bankruptcy" exception is recorded (`evaluation_required: true`, unresolved) and is observation-only.
- **A nonempty `decisive_facts_unavailable` list is validated per entry** (identity, decisiveness, evidence of genuine unavailability from a resolved reading). An arbitrary or incomplete list is refused, not turned into `PROBABLE_VIOLATION`.
- **`observation_incomplete` blocks findings:** `FCRA-605A-2-US-NATIONAL-7Y` is `finding_allowed: false`, ceiling `observation`; deployed Linux result `EVALUATED PERIOD_EXCEEDED`, finding `null`.
- **Tests go through `runAdapter` and the real extraction→evaluation→render pipeline** (`af-accept-004`, 32 assertions), not only manually constructed classifier objects. Local regression: **4,932 assertions passed, 0 failed, 0 skipped**.
- **Deployed consumer path (native PDF and scanned-image OCR):** `FCRA-605A-1`/`FCRA-605A-4` → `VIOLATION`; `FCRA-605A-2` → `EVALUATED PERIOD_EXCEEDED`, `classification: null`, `is_a_finding: false`.

## ACCEPT-005 — exception modeling + content-check mapping (deployed `crp-wizard-4b0d1f931a0e5f8f`)

- **FCRA § 1681c(a)(1)–(5) now models § 1681c(b) "Exempted cases"** (credit ≥ $150k, life-insurance ≥ $150k, employment ≥ $75k) as off-report, unresolved use exceptions. A resolved federal breach preserves the qualified arithmetic observation and emits **no VIOLATION**; the exception is never defaulted to false nor auto-probable.
- **Every other activated rule carries a rule-specific source reference** (exact citation + recorded start) instead of a blanket "no exception" statement. The US-NY/CA/AU rules record no exception in their admitted text and continue to derive `VIOLATION`; the CA-NS "second bankruptcy" exception remains recorded and unresolved.
- **Tests** (`af-accept-004` 40 assertions, `ae-accept-003`, `test-adapters.cjs`) cover known/unresolved exception, supported non-exempt applicability, and that unresolved applicability cannot produce `VIOLATION`. Regression **4,940 passed, 0 failed, 0 skipped**.
- **Content mapping** (`accelerated-launch/content-rule-mapping.md/.csv`) now carries per-row proposition, jurisdiction and effective information (27 period-executable, 148 report-observable, 51 off-report, 29 unclassified).
- **Benchmark reconciled:** the 11-versus-7 gap was a stale fragment in `CRP_B6_INGEST_004_RELIABLE_EXTRACTION.md`; the reproducible baseline is **11 useful checks / 4 newly-run statutory checks** (re-run 2026-10-02T14:14Z). The stale 7/2 is marked superseded.
- **Paid journey:** a real test-mode Checkout reopened on the deployed service with the full hosted URL intact (443 chars, `https://checkout.stripe.com/c/pay/…`); hosted completion is a browser step, and the signed-webhook → download path is proven by `b5-paid-download-verification.json`. No payment evidence fabricated, no live charge.

## ACCEPT-006 — statutory content assessments (deployed `crp-wizard-a7da58cc225734af`)

Three statutory CONTENT assessments are implemented end-to-end (not mapping-only), each a qualified observation with a
legal predicate, US jurisdiction, required source-linked fact (a content marker) and recorded off-report
exceptions/conditions:

- **Medical information** (`FCRA-605A6-US-NATIONAL-MEDICAL-INFO`, FCRA § 605(a)(6)) — `medical_information` marker.
- **Fraud alert / security freeze** (`FCRA-605A-US-NATIONAL-FRAUD-ALERT-SECURITY-FREEZE`, FCRA § 605A) — `fraud_alert` / `security_freeze` markers.
- **Dispute notation** (`FCRA-605F-US-NATIONAL-DISPUTE-NOTATION`, FCRA § 605(f)) — `dispute` marker.

A marker present yields `OBSERVED` with `classification: null` (qualified observation; the exception/condition is
off-report). Content checks are US-only and surfaced as their own `CONTENT_ASSESSMENT` group. `ag-accept-006`
(12 assertions) covers qualifying / non-qualifying / equivalent-layout / insufficient-fact / US-only reach.

NY/CA/AU finding rules were re-checked against their admitted text: only the NY judgment "satisfied within five years"
condition is recorded (already modeled); no § 1681c(b)-style cross-referenced exemption is in their admitted text.

## ACCEPT-007 — content assessment semantics corrected (deployed `crp-wizard-8f43270bdcad6d24`)

ACCEPT-006's content assessments were re-labeled. The medical proposition was wrong — it asserted "a consumer
report must not contain medical information". Corrected to: **a consumer reporting agency may furnish a report
containing medical information to a third party only with consent; the consumer's own file disclosure is not
restricted.** The three markers are now **detected report information** (extraction, class
`DETECTED_REPORT_INFORMATION`), not statutory evaluations: each records its exact text, page, line and
record-vs-boilerplate context, and carries the off-report legal dependency informatively. Absence of a keyword is
stated not to prove absence or breach. Detection is country-agnostic extraction; the legal dependency names US
FCRA. `ag-accept-006` (16 assertions) verifies legal meaning and source context, not keyword presence.

**Working content checks:** none beyond the retention-period statutory rules; the medical/fraud-alert/freeze/dispute
rules are off-report dependencies, reported as detected report information, not as evaluated predicates. These are
reported separately from mapped source records (27/148/51/29), test assertions (4,956), and upload counts.

## ACCEPT-008 — semantic corrections + production blocker enforcement (deployed `crp-wizard-66b39f530e08ed1d`)

- **NOT_DETECTED / UNRESOLVED wording** corrected ("we did not detect"; failure-to-read is distinct from absence); a word found only in a rights notice/guide is `BOILERPLATE_ONLY`.
- **Medical provisions separated** (§ 1681c(a)(6) vs § 1681b(g)), not a universal "consent-only" paraphrase; dispute initiation ≠ § 1681c(f) notification; a security freeze is a disclosure restriction, not a mandatory printed notation.
- **NY § 380-j(f)(2) use exceptions modeled**: the three NY retention rules no longer derive `VIOLATION` on a resolved breach (off-report, unresolved exception); `US-CA` and `AU` rules still derive `VIOLATION`.
- **`BLOCKER-FDT-001` and `BLOCKER-CLARIFY-001`** are now registered in the release checker as launch-blocking (missing/failed/stale/identity-mismatched evidence keeps them OPEN); the build is `NOT_LAUNCH_READY`. The FDT/CLARIFY features themselves remain to be implemented.

## ACCEPT-009 — release enforcement reconciled with the full §8.1/§8.2 blocker list (local gate; runtime unchanged)

**Implemented capability (this batch):** the production release checker now registers the complete blocker list — the
three §8.1 named blockers (`BLOCKER-FDT-001`, `BLOCKER-CLARIFY-001`, `BLOCKER-COMMON-ERRORS-001`) and all fourteen
§8.2 gap blockers (`GAP-INGEST-001`…`GAP-INGEST-010`, `GAP-FINDING-001`…`GAP-FINDING-004`). Each is
`blocks_launch: true` and OPEN until its own evidence demonstrates **behavior** bound to a release identity. Verified
by probe: writing an evidence file containing only `{"passed": true}` still leaves the blocker FAIL/BLOCKS
("must demonstrate behavior (not merely a passing flag) bound to a release identity"). Missing/failed/stale/
identity-mismatched evidence keeps launch blocked.

**Registered blockers (enforced, not satisfied):** the 17 IDs above, plus three pre-existing launch-blocking checks
(payment provider, GB consumer-format evidence, deployment provenance) → **20 launch-blocking checks, `launch_ready:
false`**.

**Separately reported, not capabilities:** local regression assertion total (4,965), mapped source records, detected
keywords, and the release checker's own FAIL count. None of these clear a blocker.

**Not implemented in this batch (remain OPEN):** the §8.2 shared ingestion foundations (multi-file/image-set
coherence, multi-line record boundaries, OCR uncertainty/coordinates, date forms/conventions/precision/reference
dates, partial native-text recovery, bureau segmentation, upload limits), the common-error consistency assessments
(status, balance, duplicate reporting, payment history), the FDT recovery workflow and its benchmark, the minimal
optional clarification workflow, the report-observable statutory content predicates, the end-to-end PROBABLE_VIOLATION
path, and the current-build paid download (browser-assisted Checkout). The staging runtime is unchanged at
`crp-wizard-66b39f530e08ed1d` (the release checker is a local launch gate, not part of the served bundle).

OWNER-ACCEPT-008 and the acceptance program are **not** marked complete while this required implementation remains
outstanding.

### ACCEPT-009 continued — GAP-INGEST-001 finished (deployed `crp-wizard-57338517595e43f0`)

**Implemented capabilities:**

- **Multi-file assembly.** `evaluateCase` assembles every admitted file in upload order (no silent last-file-only
  replacement). Records are re-indexed globally and carry `source_file_id`/`source_file_sequence`/`source_page`/
  `source_line`/`source_bureau` and `source_report_reference_date`; reading source and OCR confidence/coordinates
  are preserved on each fact's location; exact byte-for-byte duplicates are skipped (content hash); a refused
  upload still evaluates to the honest "not read" result.
- **Report boundaries = bureau identity AND reference date.** Two reports from the same bureau with different
  legitimate dates are separate reports; every record is tied to its own report reference date; a continuation
  page with no printed date is attached to the sole dated report of that bureau; conflicting dates are never
  merged or borrowed.
- **Repeated-page detection within a PDF.** A page is skipped only when its FULL text matches an earlier page
  (so repeated headings and legitimate similar accounts are never duplicates), and the skip is audited
  (`skipped_pages` with `duplicate_of_page`).
- **Likely missing pages.** Flagged only where the document prints its own page numbering; no numbering means
  completeness is unknown and nothing is invented.
- **OCR uncertainty enforced at field acceptance.** A low-confidence OCR line still produces a record (kind is
  decided by wording, never confidence), but its dates are UNRESOLVED (`LOW_CONFIDENCE_OCR_READING`), never
  resolved facts; the report date is likewise never resolved from a low-confidence line.

**Verified:** local regression **5,002 assertions passed, 0 failed, 0 skipped** (37 in `ah-multifile-assessment`);
deployed Linux verification passed (two-file merge; duplicate skip 3→2; distinct bureaus 2 groups; same-bureau
two-dates 2 groups with dates `2025-03-14`/`2026-06-12`; within-PDF duplicate kept 1/skipped 1; missing page `[2]`;
low-confidence OCR `EXTRACTION_UNRESOLVED` with 0 resolved dates).

**GAP-INGEST-001 remains OPEN for:** the end-to-end native-PDF **and** image/OCR consumer journey, and equivalent
(non-byte-identical) repeated-image detection across files. **GAP-INGEST-003 remains OPEN** for full
OCR-uncertainty acceptance evidence on a real image path.

### ACCEPT-009 continued — cross-file continuation, strengthened dedup, equivalent-image retention, date parsing, and the completed consumer journey (deployed `crp-wizard-200be86c82043b08`)

**Implemented capabilities:**

- **Multi-line / continued-account assembly** (`general-intake.cjs` `buildRecords`): a value line starts a new
  account only on an account/creditor boundary word; a field-label line (Opened/Closed/Balance/Limit) is a
  continuation of the account that precedes it. Records are never merged merely on shared bureau/creditor/amount.
- **Cross-file continuation** (`general-intake.cjs` + `multi-file-assembly.cjs`): a field line with no account in
  its own file is retained as a *continuation candidate* and attached to the OPEN account of the immediately
  preceding file only on positive evidence — upload adjacency **and** field-line continuation **and** a compatible
  open-account target. Adjacency alone never merges; reordered continuations, conflicting identifiers and separate
  accounts are preserved; per-file extractions are never mutated (facts/printed deep-copied).
- **Dateless-page attachment** (`multi-file-assembly.cjs`): requires contiguity in upload order, never the sole
  dated report of a bureau.
- **Dedup never discards on text+geometry** (`general-intake.cjs` `dedupePages`): native **or** OCR text+geometry
  matches are retained as `suspected_duplicate` with an explicit flag and a `SUSPECTED_DUPLICATE_RETAINED` audit.
  Only byte-identical file content (`stored_sha256`) is a confirmed discard.
- **Equivalent non-byte-identical images across files** (`multi-file-assembly.cjs`): files whose full-page text+
  geometry signature matches are retained as `suspected_equivalent_duplicate` with an audit, never discarded.
- **Date parsing** (`general-intake.cjs` `normalizePrintedDate` + `findReferenceDate`): full month names resolve;
  `MM/YYYY`/`YYYY/MM` resolve as `MONTH` precision; an ambiguous numeric day/month records `ambiguous` + `alternative`
  instead of hiding the other reading; the report reference date prefers an unambiguous, full-precision candidate.

**Verified:** local regression **5,043 assertions passed, 0 failed, 0 skipped** (66 in `ah-multifile-assessment`;
12 new date tests; cross-file challenges + equivalent-image retention). Deployed real-tesseract probes: cross-file
continuation assembled image A + image B into ONE `CONSUMER_CREDIT_LIABILITY` record (`closed 2021-02-02`,
`continuation_merged_from` naming image B); the paid case's stored uploads show both source-file locations
(`xa-1.png` → `xb-1.png`), the continuation boundary, and per-fact OCR confidence 96.5/96.7 with `trusted:true`.

**Consumer journey completed (Stripe test mode).** The browser completed the sandbox Checkout; entitlement is
`ACTIVE` (`source: stripe`, `access_via: ONE_TIME_CREDIT`, `plan_code: report_once`); two image uploads returned
HTTP 201; assessment returned HTTP 201 with **6 checks performed**; the purchased report download returned HTTP 200
twice with identical bytes; an unpurchased case download returned HTTP 402. The grant was **independently audited**
(`SOURCE_CAPTURES/ACCEPT-009/webhook-signature-audit.json`): the stored `checkout.session.completed` event has
`outcome: APPLIED`, `effect: ACTIVATE` (the service's only signature-verified grant path), and its
`provider_reference` matches the checkout session this run opened — matched, signature-verified, never redirect
success.

**Blockers closed with measured evidence:** `GAP-INGEST-001`, `-002`, `-004`, `-005`, `-006`, `-007`.
**`GAP-INGEST-003`, `-008`, `-009`, `-010` and `BLOCKER-COMMON-ERRORS-001` remain OPEN.**

### ACCEPT-009 — FDT recovery deployed and verified; premature closure corrected (build `crp-wizard-161c24b49d6d0f30`, 59 files)

**BLOCKER-FDT-001 remains OPEN.** The prior batch wrote a `{passed:true}` local-only evidence file, which the release
check wrongly accepted as proof the served release implements the capability. That is corrected: the release check now
requires `deployed: true` (behavioral evidence on the served release), and the local benchmark/tests are preserved but
labelled `local_only`. Deployed behavioral evidence has now been produced, but FDT stays OPEN on two honest gaps:

- the benchmark acceptance thresholds are **PROVISIONAL** (no prior owner authorization; recorded as such, not tuned
  after observing results), and
- the paid report-download surfacing is unit-tested but not re-exercised on the deployed build (the one-time account
  returns 402 DOWNLOAD_NOT_ENTITLED for the download, which is a separate entitlement).

**Duplicate identity corrected.** A normalized creditor/account name is no longer sufficient. `duplicateReporting`
now requires `account.masked_identifier` (a privacy-preserving `MASK-` + trailing-digits token of a printed masked
account number — the full number is never kept). Two accounts with the same creditor name and dates but different
masked identifiers are never flagged as duplicates; without a masked identifier only the qualified
`COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING` observation is retained. Tested: same-mask duplicate, same-creditor
different-mask, creditor-name-only, and different-bureau cases.

**Benchmark audited** (`fdt-benchmark.cjs`): 5 held-out layouts, 10 expected facts, 1 real PDF processed through
`pdftotext`, per-layout missed/incorrect/misattributed counts, recovery attempts, and a recorded `threshold_authority`
of PROVISIONAL. Measured: missed 0, incorrect 0, misattributed 0, uncertainty withheld, recovery added 1 fact, real
PDF read correctly.

**Deployed and verified** through the existing `hostinger-vps` transport (no new access, production untouched):
bundle re-hashed on the VPS with **0 mismatches**, data snapshot `pre-fdt-20261002-212722`, `current` repointed,
`CRP_BUILD_ID` updated, service `active`, public HTTPS `/api/health` reports `crp-wizard-161c24b49d6d0f30`.
Behavioral journeys: native PDF admitted and one account RESOLVED; image OCR (page-1/page-2) admitted with a RESOLVED
account recovered server-side; a native-text + blank image-only-body PDF produced `reading_limitations
{limited:true, incomplete:true}` naming STATUTORY_RULE_COMPARISON / REPORT_FACT_CONSISTENCY / COMMON_ERROR with
`recovery_attempts:1, facts_added:0` — the unsuccessful recovery correctly withholds.

### ACCEPT-009 — FDT acceptance completed to the demonstrated degree; duplicate tightened (build `crp-wizard-470554ec5cb3ceae`, 59 files)

**Paid-download test resolved correctly.** The failed 402 was on a NEW (unpurchased) case, which is correct
one-off-purchase behavior. Using the purchased case from `payment-handoff-state.json`
(`case_8e132b40772177f968bcf0d5`, read without exposing its token) the report download returns **200**.

**Actual recovery evidence completed.** An image-body PDF (page 1 = substantial native text, page 2 = an
image-only account body) uploaded to the purchased case recovered **two accounts** — account 2 exists only in
the image-only body and was recovered by server-side OCR. The unsuccessful-recovery demonstration is preserved: a
native-text + blank image-only-body PDF produces `reading_limitations {limited:true, incomplete:true}` with
`recovery_attempts:1, facts_added:0`.

**Duplicate safeguards tightened.** Masked trailing digits can collide, so `duplicateReporting` now requires
**both** the masked account identifier **and** the printed creditor name (neither alone is sufficient), and keeps
debt identity, bureau and report date distinct. Insufficient matches are `SIMILAR_ENTRIES_WORTH_REVIEWING`, never
an established duplicate debt. Tested: same-mask+same-name (duplicate), same-mask+different-name (collision, not a
duplicate), same-name+different-mask, name-only, and different-bureau cases.

**Owner-approved PROSPECTIVE FDT criteria recorded** (in `fdt-benchmark.cjs` `PROSPECTIVE_CRITERIA`): freeze
expected facts and document selection before the run; independent held-out set covering every recovery scenario;
zero incorrect decisive facts, zero cross-record/bureau borrowing, zero unsupported legal findings; ≥95% of
designated readable assessment-required facts recovered with every miss accounted for; unreadable/conflicting
decisive facts withheld; useful recovery and bounded unsuccessful recovery demonstrated on the deployed service.
These apply to the next run; earlier provisional results are not retroactively relabelled as accepted.

**Verified:** regression **5,154 assertions passed, 0 failed, 0 skipped**. `BLOCKER-FDT-001` remains OPEN pending
the acceptance run against the PROSPECTIVE criteria. **14 blockers remain OPEN** (unchanged): the three
pre-existing launch checks, BLOCKER-FDT-001, BLOCKER-COMMON-ERRORS-001 (3 of 6 areas), GAP-INGEST-003/008/009/010,
BLOCKER-CLARIFY-001 and GAP-FINDING-001–004.

### ACCEPT-009 — prospective FDT acceptance executed; clarification and balance/payment checks implemented; deployed (build `crp-wizard-bc095afed6459b15`, 60 files)

**Prospective FDT acceptance run executed and passed.** The held-out set was frozen before extraction
(`fdt-acceptance.cjs`, sha256 `43aa2280b167451683cbee0a831ac8a8a71c52479e50aa2937c2c8712ffdb51e`): 6 documents,
10 decisive expected facts, 10/10 recovered, 0 incorrect decisive facts, 0 cross-record/bureau borrowing,
0 unsupported legal findings, 0 record-collapse errors, 0 withhold errors. The deployed release identity
(`crp-wizard-bc095afed6459b15`) was verified with useful recovery (image-only body → 2 accounts), bounded
unsuccessful recovery, results and the purchased download (200). **BLOCKER-FDT-001 CLOSED.**
Evidence: `SOURCE_CAPTURES/ACCEPT-009/fdt-acceptance-evidence.json` and
`accelerated-launch/service/out/fdt-mitigation-evidence.json`.

**Minimal optional clarification implemented (`clarification.cjs`).** At most two plain-English material
questions after automatic recovery, each with its benefit explained and both "I don't know" and "Skip" as
first-class answers. Answers are stored separately from report facts with `source: CONSUMER_STATEMENT` /
`evidence_status: CONSUMER_SUPPLIED`, never replace a reading, and never escalate a finding; skipping leaves the
independent checks intact (verified end-to-end: `POST /api/cases/:caseId/results/:resultId/clarify` returns 200
and the answers surface in the consumer view). **BLOCKER-CLARIFY-001 CLOSED.**

**Common-error extraction extended (4 of 6 areas).** Distinct `account.balance`, `account.pastDueAmount`,
`account.paymentAmount`, `account.creditLimit` and `account.currency` are now extracted with their printed
meanings, and a `COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY` check flags a printed past-due/payment amount above
its printed balance (verified on the served build: "Balance $100.00 Past Due $150.00" emits a POTENTIAL_ISSUE).
The two remaining areas (payment-history grid, identity/responsibility) are not implemented.

**Duplicate reporting tightened further (item 4).** A creditor name plus masked trailing digits can still
collide between two accounts with the same creditor, so `duplicateReporting` now requires an **additional
compatible account fact** (a matching printed balance, credit limit or status). The specific collision
(same creditor + same masked trailing digits + no additional evidence) stays a qualified
`SIMILAR_ENTRIES_WORTH_REVIEWING` observation; contradictory additional evidence refutes the duplicate.

**Deployed and verified** through the existing `hostinger-vps` transport (production untouched): bundle
re-hashed on the VPS with **0 mismatches (60 files)**, data snapshot
`pre-crp-wizard-bc095afed6459b15-20261002-221300`, `current` repointed, `CRP_BUILD_ID` updated, service
`active`, public HTTPS `/api/health` reports `crp-wizard-bc095afed6459b15`.

**Verified:** regression **5,176 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN** (down
from 14): BLOCKER-COMMON-ERRORS-001 (payment-history grid and identity/responsibility areas remain),
GAP-INGEST-003/008/009/010, GAP-FINDING-001–004, and the three pre-existing launch checks (GB support, payment
provider, deployment provenance).

### ACCEPT-009 continuation — payment-history and identity/responsibility assessments finished; clarification verified in the wizard (build `crp-wizard-9aeea6ec818e3ac8`, 60 files)

**Payment-history extraction and assessment.** `general-intake.cjs` now reads a clearly printed payment-history
grid: the printed `code -> meaning` legend, the period=code cells, raw cells and source locations, and
uncertainty. A blank cell is absent/unknown (never a missed payment), and a code with no printed legend keeps
`meaning: null` (never guessed). `common-errors.cjs` adds `COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY`, which
compares the most recent readable cell against the printed current status only for the same period/meaning: a
clean ("paid as agreed") latest cell alongside a delinquent ("charged off") status is flagged, while historical
delinquency followed by a current status is never contradictory.

**Identity/responsibility extraction and assessment.** `general-intake.cjs` now reads printed
individual/joint/authorized-user responsibility with its role; `common-errors.cjs` adds
`COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY`, which flags the same account (same masked identifier plus the same
creditor) printed with two different responsibility labels. An authorized-user, joint or individual role is
preserved as a distinct role, and an unfamiliar name/address/creditor alone never becomes identity theft or
incorrect ownership. **BLOCKER-COMMON-ERRORS-001 CLOSED (all six areas).**

**Duplicate evidence reviewed (item 4).** A single matching generic field (balance/limit/status) is never
sufficient to describe two entries as established duplicate debts; the output remains a qualified
"potential duplicate reporting" / "similar entries worth reviewing" observation when identity stays uncertain.

**Clarification verified in the wizard.** The consumer UI (`ui/app.js`) now renders the optional clarification
block after a real report result (never on a labelled demonstration), explains each question's benefit, offers
"I don't know" and "Skip", and persists answers separately. Verified in the UI smoke test (node:vm) and on the
served build: `caseView` exposes `clarification_questions` and `result_id`, and the clarify endpoint returns 200.

**Acceptance evidence** (per new assessment: qualifying, legitimate lookalike, ambiguous/missing, equivalent
layout) is in `al-common-errors` and `k-ui-smoke`; deployed native-PDF evidence in
`SOURCE_CAPTURES/ACCEPT-009/accept-009-common-errors-deployed-evidence.json`.

**Deployed and verified** through the existing `hostinger-vps` transport (production untouched): 60 files,
0 hash mismatches, service `active`, public HTTPS `/api/health` reports `crp-wizard-9aeea6ec818e3ac8`.

**Verified:** regression **5,196 assertions passed, 0 failed, 0 skipped**. **11 blockers remain OPEN** (down
from 12): GAP-INGEST-003/008/009/010, GAP-FINDING-001–004, and the three pre-existing launch checks.

### ACCEPT-009 correction — COMMON-ERRORS reconciled and comparisons corrected (build `crp-wizard-81185849b1d991cc`, 60 files)

**COMMON-ERRORS closure reconciled (item 1).** The prior closure lacked a deployed image/OCR demonstration and a
real-browser (not node:vm) demonstration, and counted responsibility extraction as a complete identity assessment.
`BLOCKER-COMMON-ERRORS-001` is **REOPENED** with three precise remaining requirements: (a) a deployed image/OCR
demonstration of the payment-history and responsibility checks, (b) a real-browser demonstration of the consumer
clarification interface, and (c) a report-internal identity assessment (responsibility extraction alone is not a
complete identity assessment). An image/OCR attempt was made on the served build: the grid image was admitted
(account RESOLVED) but the cells were not decoded by OCR, so no check fired — the OCR demonstration remains
outstanding.

**Payment-history comparison corrected (item 2).** A latest "paid as agreed" cell beside a "charged off" status is
no longer flagged (the status may describe an earlier event or a different reporting period). The only genuine
same-period contradiction now asserted is the grid printing the SAME period twice with two different cells.
Stale statuses, historical charge-off, later payments, unknown legends and missing periods are all preserved
without asserting an error. Verified on the served build.

**Responsibility comparison corrected (item 3).** A responsibility conflict now requires the same bureau AND the
same report reference date snapshot, the same masked identifier and creditor, AND an additional corroborating
account fact. Different bureau snapshots, changed responsibility over time, joint relationships and
masked-identifier collisions are never conflicts.

**Verified:** regression **5,199 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN** (COMMON-ERRORS
reopened): BLOCKER-COMMON-ERRORS-001, GAP-INGEST-003/008/009/010, GAP-FINDING-001–004, and the three pre-existing
launch checks.

### ACCEPT-009 ingestion foundations — report-internal identity assessment + grid-image diagnosis (build `crp-wizard-815fc4a8aeabb5d4`, 60 files)

**Report-internal identity assessment (item 4).** `general-intake.cjs` now reads printed name/address/alias/
co-applicant fields with their roles (primary, historical, alias, co-applicant) and reduces values to
non-identifying tokens (no raw name/address retained). `common-errors.cjs` adds `COMMON-ERROR-IDENTITY-DISCREPANCY`,
which flags two identity fields of the SAME role with different tokens (a report contradicting itself). Aliases,
historical addresses and co-applicants are distinct roles and are never flagged; an unfamiliar detail alone never
becomes identity theft or incorrect ownership, and the check states when the report cannot establish whose
information is correct. Verified on the served build.

**Grid-image example diagnosed (item 2).** The earlier image/OCR failure was the old status-vs-cell comparison
requiring a delinquent status that the image did not print. The corrected same-period comparison now fires via the
deployed image/OCR path (`COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY` for "2024-01=OK 2024-01=30").

**Verified:** regression **5,205 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN.**

### ACCEPT-009 geometry-aware payment-history grid ingestion (build `crp-wizard-6c8e557380c51e00`, 61 files)

**Positional evidence (item 1).** Native PDF positional extraction is added to the document model via
`pdftotext -bbox` (word-level bounding boxes, top-left origin, points); OCR `word_evidence` (per-word tesseract
coordinates + confidence) is threaded through `collectPages` and the extraction pipeline, without removing the
existing `-layout` reading path.

**Grid assembler (item 2).** `payment-history-grid.cjs` assembles actual row/column grids from positioned words:
separate month/year headings, code cells and a printed legend are associated by position (column x-alignment,
row y-grouping with a scale-relative tolerance), and the grid is associated with its account by the nearest
account line. Raw cells, printed meanings, source coordinates and uncertainty are preserved; a blank, unlisted or
ambiguously aligned cell is never guessed and never becomes delinquency.

**Demonstrated (item 3).** A positioned-word table fixture (separate headings, cells and legend — not an inline
`period=code` string) is read through native `pdftotext -bbox` AND a rendered image/OCR version (local tesseract
word coordinates), decoding the same cells and legend with source coordinates. A clean table produces no false
flag, an unfamiliar code stays UNKNOWN, and two nearby accounts keep their histories separate. Expected cells were
recorded in the test independently of extraction.

**Verified:** regression **5,215 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN.**

### ACCEPT-009 finish grid continuation + paid-report content (build `crp-wizard-a5a79a9f31b97a50`, 61 files)

**Payment-history continuation across pages.** A page that prints a repeated grid with no account line carries the
account context (and legend, when absent) from the immediately preceding page only when the same source is
established; a new account on the next page keeps its own account and never borrows another account's periods or
legend. Tested: repeated-header continuation and a new account on the next page.

**Paid-report rendering.** The purchased report-download now lists every performed common-error assessment with its
outcome, plain-English explanation, source location and uncertainty — never only an aggregate count. A
payment-history issue names the account reference, page/line, period, conflicting readings and the printed legend
basis (the meanings are the legend's own words). Distinct from findings and from observations. Verified on the
deployed release (download body names `COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY` with `Account · page/line ·
period · first_code/meaning · second_code/meaning`).

**Verified:** regression **5,224 assertions passed, 0 failed, 0 skipped**. **12 blockers remain OPEN.**

### ACCEPT-009 GAP-INGEST-008 single-page partial-text recovery (build `crp-wizard-4891dc7797a6956b`, 61 files)

**GAP-INGEST-008 — CLOSED.** A PDF page carrying substantial native text AND an embedded image-only
account/table region is now detected **structurally** (the page's image XObjects via `pdfimages -list`, not a
character-count heuristic) and the region is recovered through the bounded local OCR reader. Recovered lines keep
their source, confidence and coordinates, and are renumbered so a native line and a recovered line can never
collide. Conflicting native/OCR values are both preserved and the affected conclusion withheld; an image region
with no recoverable content is reported as unread with an honest incomplete-review limitation (never equated with
absence). Tested (27 assertions in `ao-ingest-008-mixed-page`): useful recovery of an image-only account body, no
duplicate extraction on a fully readable page, conflicting readings kept unresolved, an unreadable region with
honest messaging, and the equivalent layout with the region in a different position. Deployed and verified over
HTTP (upload → extraction → assessment → results → purchased download; the recovered fact is `LOCAL_OCR`, page 1,
and the download carries the resulting assessment).

**Verified:** regression **5,252 assertions passed, 0 failed, 0 skipped**. **11 blockers remain OPEN.**

### NOT yet implemented (exact remaining criteria)

- **BLOCKER-COMMON-ERRORS-001** (reopened): a real-browser demonstration of the consumer clarification interface
  (node:vm UI tests and endpoint responses are not browser usability evidence).
- **GAP-INGEST-003** (OCR uncertainty → decisive fact + affected assessment withheld on the served release;
  injected confidence labelled test evidence) — no evidence file.
- **GAP-INGEST-009** (separate per-section reference dates, boilerplate/ambiguous-boundary/conflicting-date
  cases; no cross-section borrowing) — `passed:false` evidence written.
- **GAP-INGEST-010** (representative long-PDF/multi-image measurement against bounded limits; partial-upload
  recovery; server/UI agreement) — no evidence file.
- **GAP-FINDING-001–004** remain OPEN (exception evaluation, PROBABLE_VIOLATION path, rule identity/version,
  source-linked finding facts).
- The three pre-existing launch checks remain OPEN: current GB consumer-format evidence, a configured payment
  provider (Stripe stays test-mode), and production deployment provenance/release authorization.








## Evidence used

- Current read-only HTTPS checks: `/api/health` and `/api/jurisdictions` on staging.creditregulatorpro.com.
- `SOURCE_CAPTURES/ACCEPT-009/staging-deployment-provenance.json`: build `crp-wizard-200be86c82043b08`; 57 files transferred, zero hash mismatches; data snapshot `pre-accept-009-dates-20261002-173800`; blockers closed/remaining recorded; local regression 5,043 assertions passed, zero failed, zero skipped.
- `SOURCE_CAPTURES/ACCEPT-009/browser-payment-verification.json` and `payment-resume-evidence.json`: browser-completed sandbox Checkout; entitlement ACTIVE; uploads 201; assessment 201 (6 checks); downloads 200 twice (identical bytes); unpurchased 402.
- `SOURCE_CAPTURES/ACCEPT-009/webhook-signature-audit.json`: independent, redacted audit of the stored `APPLIED`/`ACTIVATE` billing event, matched to the opened checkout session.
- `accelerated-launch/service/out/gap-ingest-001-evidence.json`, `gap-ingest-002-evidence.json`, `gap-ingest-003-evidence.json`: behavioral, identity-bound evidence that clears the three ingestion blockers.
- `SOURCE_CAPTURES/ACCEPT-009/payment-handoff-state.json` and `payment-resume.cjs`: retained only as the test-state handoff that produced the above evidence; credentials remain private.
- `SOURCE_CAPTURES/ACCEPT-009/image-journey-evidence.json`: earlier HTTP image-upload attempt (pre-payment) blocked by the paid-entitlement gate (402).
- `SOURCE_CAPTURES/ACCEPT-009/release-enforcement-reconciliation.json`: registers all 17 §8.1/§8.2 blockers; documents the "behavior-not-flag" probe (a `{passed:true}`-only evidence file still blocks) and the 20 launch-blocking checks with `launch_ready:false`.
- `SOURCE_CAPTURES/ACCEPT-008/staging-deployment-provenance.json`: build `crp-wizard-66b39f530e08ed1d`; 56 files transferred, zero hash mismatches; data snapshot `pre-accept-008-20261002-151714`; local regression 4,965 assertions passed, zero failed, zero skipped.
- `SOURCE_CAPTURES/ACCEPT-007/staging-deployment-provenance.json`: build `crp-wizard-8f43270bdcad6d24`; 56 files transferred, zero hash mismatches; local regression 4,956 assertions passed.
- `SOURCE_CAPTURES/ACCEPT-006/staging-deployment-provenance.json`: build `crp-wizard-a7da58cc225734af`; 56 files transferred, zero hash mismatches; local regression 4,952 assertions passed.
- `SOURCE_CAPTURES/ACCEPT-005/staging-deployment-provenance.json`: build `crp-wizard-4b0d1f931a0e5f8f`; 55 files transferred, zero hash mismatches; local regression 4,940 assertions passed.
- `SOURCE_CAPTURES/ACCEPT-004/staging-deployment-provenance.json`: build `crp-wizard-a88c5ae2c99aaf88` (round 2); 55 files transferred, zero hash mismatches; local regression 4,932 assertions passed. Round-1 build was `crp-wizard-dbcaa58638065532` (regression 4,917 assertions).
- `SOURCE_CAPTURES/ACCEPT-003/staging-deployment-provenance.json`: build `crp-wizard-239163a95166f46e`; 55 files transferred, zero hash mismatches; the collection 180-day rule, the satisfied-judgment condition and the per-rule classification verified on Linux; local regression 4,899 assertions passed, zero failed, zero skipped.
- `SOURCE_CAPTURES/ACCEPT-002/staging-deployment-provenance.json`: build `crp-wizard-35be7c9f8274005a`; 55 files transferred, zero hash mismatches; the policy approval binding, the corrected contradiction scope, and the reassessed judgment/tax-lien/bankruptcy legal-event facts verified on Linux.
- `SOURCE_CAPTURES/OWNER-EVIDENCE-001/staging-deployment-provenance.json`: build `crp-wizard-b0af4511df43e1c3`; 54 files transferred, zero hash mismatches; the reported-fact policy module and the CA-NS bankruptcy discharge evaluation verified on Linux.
- `SOURCE_CAPTURES/B6-INGEST-003/staging-deployment-provenance.json`: 52 files transferred, zero hash mismatches; one general record extracted; image OCR read 10 lines; unrelated input refused; local regression reported 4,777 assertions passed, zero failed, zero skipped.
- `SOURCE_CAPTURES/B5-STAGING-001/https-journey-verification.json`: earlier build `crp-wizard-ef04486655ae2e2f`; real sandbox webhook, PDF assessment, download/access checks and account deletion.
- `accelerated-launch/service/out/b5-chrome-payment-verification.json`: five paid test-mode Checkout sessions and recorded subscription invoice amounts. This is sandbox evidence, not live billing proof.
- `accelerated-launch/service/out/b5-paid-download-verification.json`: earlier test download and unpurchased-case denial.
- `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md` and owner ingestion direction: launch promises and boundaries.
- Local `accelerated-launch/check-field-matrix.json`: observed work-in-progress claims only; not counted as deployed passes.

No production change was made. Staging test billing (Stripe sandbox) was kept. The ACCEPT-004 correction involved a Cline implementation edit (classifier, config, tests), a staging deployment, and a local regression rerun (4,917 assertions). Existing evidence records for earlier builds were read, not independently recreated.

## Final sign-off rule

For every row, attach the exact release tested, test date, input/example designation, expected outcome, measured outcome and remaining limitation. Cross-reference every advertised bureau and all 82 jurisdiction rows. Demonstrate positive, negative and uncertain cases for substantive assessments.

Every core promise must pass on the final deployed release before it is marked complete. An evidence gap remains open until tested. Passing thousands of local assertions does not substitute for this register. Final acceptance is product acceptance, not independent legal certification or a guarantee of detecting every possible issue.


## Owner-required consumer experience — October 2, 2026

Next available corrective work slot: **OWNER-ACCEPT-010**, authorized by the Owner and defined in CRP_OWNER_ACCEPT_010_BUILD_CONSISTENCY_WORK_ORDER.md. Finish the running bounded batch first; avoid concurrent edits. Six audit inconsistencies remain **OPEN / NOT YET RESOLVED**: release-evidence validation, unique grid-cell association, grid confidence enforcement, account/bureau grid boundaries, material consequential clarification, and accurate release reporting. Existing blockers remain enforced. Resolution requires per-issue passing evidence and a confirmation matrix; issuing the order does not clear any issue.

Five additional production blockers are OPEN pending implementation and measured acceptance. Existing functionality may be reused but has not been accepted against these new requirements. No deployed result is claimed by this amendment.

| ID | Required capability | State |
| --- | --- | --- |
| BLOCKER-RESULTS-001 | Prioritized action list with reasons and evidence strength | OPEN |
| BLOCKER-EXPLANATIONS-001 | Plain-English why-this-was-flagged cards, report fact, rule basis and uncertainty | OPEN |
| BLOCKER-BILLING-001 | Subscription, renewal/cancellation and 90-day upgrade-credit dashboard | OPEN |
| BLOCKER-PRIVACY-001 | Stored-document inventory, implemented retention settings and deletion controls | OPEN |
| BLOCKER-SUPPORT-001 | Privacy-safe diagnostic reference and protected useful support lookup | OPEN |

Full criteria are in build-plan section 8.3. These five augment existing blockers; earlier blocker totals are historical and must be remeasured. Release evidence requires deployed expected/measured outcomes per criterion and matching CRP_BUILD_ID/served identity. Case reminders, case timeline and accessible PDF are optional, not release blockers.

## OWNER-ACCEPT-010 — Final acceptance revalidation (October 3, 2026)

Revalidated against the staging release `crp-wizard-ea8734598db36f9f` (test-only Stripe billing; production, legal authority and finding safeguards unchanged).

**Corrected implementation (regression-verified, 5,324 assertions, 0 failed):**
- C1 evidence validator enforces per-blocker required criteria, release-bound references, FDT prospective acceptance, and finite-metric rejection.
- C5 clarification backfills safe unique question keys for historical eligibility (or requires reassessment); special-answer controls preserve "I don't know"/"Skip".
- FDT thresholds and metric definitions aligned to the Owner-approved prospective criteria (≥95% recovery, zero incorrect decisive facts, zero borrowing, zero unsupported findings).

**Passing current-release acceptance (measured):**
- C1: both exact validator probes independently confirmed rejected.
- C5 fresh browser: real Chrome save/reload PASSED (account A `I_DONT_KNOW`, account B `SKIP`, separate `CONSUMER_STATEMENT`).
- FDT **local prospective acceptance**: PASS — 6 documents, 10 decisive-fact denominator, recovery 10/10 (1.0 ≥ 0.95), 0 incorrect, 0 borrowing, 0 unsupported; benchmark passed.

**Remaining product blockers (still OPEN):**
- **FDT deployed-recovery criterion**: a fresh-case probe shows the recovery audit records `recovery_attempts: 1` but `facts_added: []` for a fully image-only page, so the download never prints a `RECOVERY:` line, and the fresh-case report download returns 402 (unpurchased) while the purchased case is at its 8-file limit. `BLOCKER-FDT-001` stays OPEN (local acceptance passes; deployed-recovery behavior not yet measured end-to-end). Evidence: `SOURCE_CAPTURES/ACCEPT-010/fdt-revalidation-honest-20261003.json`.
- **C5 historical-result browser step**: exact pre-key result ids identified (earliest `res_695b85afa443efe52a23`), but the case view selects only the latest result and `getResult` does not expose a historical result's clarification, so there is no supported browser path; a runtime correction (result-specific clarification view) or an isolated synthetic historical-compatibility case is required.
- BLOCKER-CLARIFY-001 (evidence still bound to an obsolete build).
- COMMON-ERRORS, GAP-INGEST-001…010, GAP-FINDING-001…004, the five consumer-experience blockers, `CURRENT_GB_SUPPORT_IS_ESTABLISHED`, `PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING`, `DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED`.

OWNER-ACCEPT-010 is **not declared complete**: C1, C5, FDT deployed-recovery and the clarification blocker require the remaining measured acceptance before C1–C6 are closed. No prior evidence was rewritten; new revalidation evidence lives under `SOURCE_CAPTURES/ACCEPT-010/`.


## OWNER-ACCEPT-010 — runtime corrections deployed (October 3, 2026, build `crp-wizard-b117b12b76a68bc0`)

- **Recovery accounting fixed** (`fdt-recovery.cjs`): `recoveryAudit` now records genuinely accepted recovered assessment facts and their source locations for an image-only page with no native "before" reading, distinguishes ordinary OCR ingestion from useful recovery, and excludes arbitrary OCR text via a date/amount fact filter. Verified on the served build: a fresh-case probe now records `facts_added = [{page:2,line:1,source:LOCAL_OCR}]` (was empty). Regression: 5,339 assertions, 0 failed.
- **Historical-result clarification path implemented** (`journey.caseViewForResult` + `GET /api/cases/:caseId/results/:resultId/view` + a Result selector in the UI): an explicitly selected, owned result exposes its own normalized clarification eligibility and answers with ownership enforced and no silent fallback to the latest. The actionable historical result is `res_e6e5e1be0e838f41e77a`; `res_695b85afa443efe52a23` has no actionable questions. Cross-account access is refused (tested).
- **Paid-case constraint resolved legitimately**: a fresh synthetic case `case_c66a310ce30c51ea8336d222` and a service-created Stripe sandbox Checkout were prepared; the complete hosted URL (including its fragment) is preserved in the private handoff `SOURCE_CAPTURES/ACCEPT-010/fdt-checkout-handoff-private.json`. No entitlement was granted, no gate weakened, no live charge.

**Remaining browser handoffs (OPEN):** (1) complete the sandbox Checkout in Chrome, then run upload → mixed-page recovery → assessment → purchased download to record the `RECOVERY:` wording; (2) a real Chrome run on the historical result via the new Result selector. Production remains unchanged; Stripe stays in test mode. OWNER-ACCEPT-010 is not declared complete until these measured.

## OWNER-ACCEPT-010 — browser handoffs measured and follow-up defects corrected

October 3, 2026: the two browser handoffs above have now been measured. The pre-key historical result saved separate unknown/skip answers in Chrome, survived reload/reselection, and its assessment digest was unchanged. The supplied sandbox checkout omitted its case binding; its download failed honestly. A correctly case-bound sandbox checkout produced the paid download with actual RECOVERY wording.

Staging now serves `crp-wizard-628b2904cffb48fe`. Checkout preparation includes the case ID; clarification save retains the selected result, and the selector displays its correct timestamp/identity. Chrome tested a non-latest result, separate account answers, and preservation of the assessment; the final-build paid download returned 200 with RECOVERY wording. Full regression: 5,340 passing assertions before the final selector adjustment; focused final consistency: 79 passing assertions, plus the served Chrome/API verification. See `CRP_OWNER_ACCEPT_010_BROWSER_COMPLETION.md` and `SOURCE_CAPTURES/ACCEPT-010-COMPLETION/`.

These measured handoffs are complete; the prior OPEN handoff statement is historical. Unrelated production blockers and release-evidence requirements are not waived or automatically closed. Production remains unchanged, Stripe test mode, and public health still reports not launch ready.

## Combined-bureau report ingestion — measured staging delivery

October 3, 2026, build `crp-wizard-ee6158243e6f51a1`: general-report records keep their own bureau segment and report date through assembly and assessment. A combined upload with the same adverse date but two different bureau-report dates produces the correct different period comparisons. Conflicting or ambiguous segment dates withhold the comparison rather than borrowing a date. Notices and repeated headings have bounded acceptance tests; dateless continuation requires a printed continuation marker.

Three fresh synthetic native-PDF journeys on the final release reached upload, assessment, visible results and actual paid download content. Stripe sandbox Checkout was completed in Chrome with a case-bound purchase. GAP-INGEST-009 passes the current-build strict evidence gate. Evidence and exact validation limits are in `CRP_INGEST_009_SEGMENTATION_COMPLETION.md` and `SOURCE_CAPTURES/INGEST-009-COMPLETION/`.

Other launch requirements remain open: the release check records 24 current-target failures, including stale/missing evidence and unfinished features. This delivery does not establish universal report-format accuracy, all-82 legal assessment coverage, or public-launch readiness. Production remains unchanged; billing remains test mode.

## Upload limits and containers - final staging revalidation (October 3, 2026)

GAP-INGEST-010 is CLOSED on served build `crp-wizard-acca8b714f2f08ae`, with all three exact criteria passing strict identity-bound evidence validation. Representative tests exposed and corrected longer-scan raster filename handling and region selection being cleared during browser redraw. Upload guidance now discloses the existing 40-page scanned-PDF reading budget.

Final regression: 5,370 passing assertions, zero failed/skipped. Twenty-three deployed/browser checks include 100-page native reports, readable 12-page scans, eight screenshots, JPEG, the ninth-file and exact 40 MiB storage refusal boundaries, unsupported types, oversized images/files, retry preservation, and a fresh upload through actual purchased download. All 61 runtime hashes match locally and remotely. Disposable test cases were deleted; the existing legitimately purchased case was preserved. Production is unchanged and Stripe remains in test mode.


## October 4 — CA adverse-information branch implemented + AU new-arrangement source retrieved — OWNER-CANDIDATE-007

**B — California § 1785.13(a)(8) implemented (not a proposal).** New adapter
`US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y` (`CRP-LSRC-0268`, `rules.ca.ts` 7DDBF5C4) measures the residual adverse
information — the record's own "NN days past due as of Mon YYYY" delinquency rating — seven years from the rating's
own date with **NO 180-day offset** (event-date timing). § 1785.13(b)'s 180-day start (which includes "any similar
action") is applied only in the (a)(5) collection branch; the (a)(8) branch defers (NOT_APPLICABLE) whenever the
record prints COLLECTION / CHARGE-OFF / PLACED FOR COLLECTION (new `reportedAccount.collectionOrChargeOffContext`
fact), and it does not assert that (b) is inapplicable as a settled matter for any unlabelled "similar action".
Applicability rule `ADVERSE_RATING_ON_NON_COLLECTION_ACCOUNT`; `bk-us-ca-adverse-rating.cjs` (18 assertions) covers
the positive VIOLATION + no-offset, the negative, extraction, deferral, and the end-to-end "Reporting issue" output.

**C — Australian § 20W items 6/7 retrieved and captured** (official Federal Register of Legislation, compilation
`C2026C00227` dated 2026-06-04): `SOURCE_CAPTURES/PHASE5-001G/PA1988-s6S-s20W-extracted.txt`. The two limbs are now
recorded **separately** — item 6 (§ 6S(1) default) runs 2 years from the CRB collecting the default information;
item 7 (§ 6S(2) serious-credit-infringement opinion) runs 2 years from the CRB collecting the opinion. The grouped
corpus row `CRP-LSRC-0425` was therefore wrong for item 7. The bounded public search (OAIC guide lists no "new
arrangement" row; PUB-012 prints no § 6S entry; Equifax guide 404) confirms no report-evidenced "new arrangement"
entry. **First blocker:** no admitted/located AU report sample prints the "terms varied / new credit" § 6S entry with
its event date and its default (item 6) or opinion (item 7) association, so extraction is not built.

## October 4 — B fail-closed correction + C source amendment — OWNER-CANDIDATE-007

**Permission-change correction (accurate record):** the prior batch enabled a NEW finding permission — it set
`finding_allowed: true` on the new `US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y` adapter (previously "no permission changes"
was stated incorrectly). That is now reversed to **`finding_allowed: false`, `max_conclusion: observation`** (fail
closed), because absence of COLLECTION/CHARGE-OFF wording does not establish that § 1785.13(b) is inapplicable —
(b) also covers "any similar action". The adapter still evaluates the period but emits NO finding; direct adapter
invocation does not bypass the classifier gate. The unsupported eighth demonstrated VIOLATION is removed; measured
counts are now **demonstrated VIOLATION 7, observation-only 5, finding_allowed 14**, jurisdictions still **10/82**.

**Tri-state account/action context (with source provenance):** new fact `reportedAccount.accountActionContext`
(`COLLECTION_OR_CHARGE_OFF` / `EVENT_DATE_SUPPORTED` reserved / default UNKNOWN) drives the renamed applicability
rule `ADVERSE_RATING_ACTION_CONTEXT`: established (b) context → NOT_APPLICABLE (defers to (a)(5) + 180-day offset);
established event-date context → APPLICABLE (no evidence basis yet, unreachable); unknown/conflicting/unsupported →
APPLICABILITY_UNRESOLVED, no finding. `bk-us-ca-adverse-rating.cjs` (22 assertions) exercises the refusal boundaries:
fail-closed adapter, the three states, bare "days past due" (no context), collection (COLLECTION_OR_CHARGE_OFF),
repossession/foreclosure/write-off stay UNKNOWN, cross-account context is not borrowed, and the bare-account
end-to-end upload emits NO (a)(8) finding. `q-record-applicability` and `p-us-consumer-format` re-measured (1 executed
comparison; 5 unresolved; 13 limb resolutions accounted). Collection/paid-tax-lien/bankruptcy paths unchanged.

**C source amendment:** official FRL compilation `C2026C00227` (dated 2026-06-04) retrieved; § 6S and § 20W items 6/7
captured (`SOURCE_CAPTURES/PHASE5-001G/PA1988-s6S-s20W-extracted.txt`, sha256 `23fb5774…453ff45`; EPUB `document_1.html`
sha256 `6d0a43e5…2c5c3b`). The grouped `CRP-LSRC-0425` start is corrected in the derived mapping
(`content-rule-mapping.md`): item 6 (s. 6S(1) default) runs 2y from the CRB collecting the DEFAULT information; item 7
(s. 6S(2) serious-credit-infringement opinion) runs 2y from the CRB collecting the OPINION — the source field for each
limb is distinct from any arrangement event date. Historical captures are not overwritten. Extraction/coverage stay
pending (no report-evidenced "new arrangement" entry).

Full suite (final regression) and pins below.


Full suite **5,993 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34; `verifyConfigs` clean.
Coverage stays **10/82** (the (a)(8) rule is a new US-CA category, not a new jurisdiction). The four broad blockers
remain OPEN.

The final release check has 20 passing checks and 24 launch-blocking failures, including stale/missing evidence and unfinished capabilities. Other blockers remain OPEN; this is not public-launch readiness or universal extraction proof. Current evidence and boundaries: `CRP_INGEST_010_UPLOAD_LIMITS_COMPLETION.md` and `SOURCE_CAPTURES/INGEST-010-REVALIDATION/`. Earlier evidence is preserved without relabelling.

## GAP-INGEST-003 - sandbox payment and HTTP journey completed (October 3, 2026)

The existing CA$5.95 Checkout completed in connected Chrome. Stripe paid state, the exact applied signed webhook, case binding and active entitlement were verified. All five fictional fixtures reached upload, assessment, results and actual purchased download. No duplicate Checkout, manual entitlement, simulated webhook, runtime edit or production change.

Historical payment-only verdict: GAP-INGEST-003 remained OPEN for consumer-output and applicable-comparison proof on `crp-wizard-4f676b00426083f7`. The final verdict below supersedes this entry; do not ask for another payment.

## GAP-INGEST-003 — final closure, October 3, 2026

**CLOSED** on served staging build `crp-wizard-d3a090bcfa22cec7`. Decisive OCR trust now gates labelled legal-event dates as well as ordinary dates/amounts. Results and purchased downloads show the unaccepted reading, owning account/bureau, actual page/line source and incomplete checks. The genuine existing purchase remains paid with its matched signed applied webhook and active entitlement.

5,385 regression assertions and the focused 11 checks pass, zero failed/skipped; all 61 deployed hashes match. Served real tesseract 5.3.4 freshly tested seven fixtures. Seven paid HTTP journeys pass; the original five reuse preceding-release stored extractions with current-release evaluation/output, while two statutory fixtures have fresh current-release HTTP extraction. The clear statutory date performs its applicable comparison; the blurred counterpart is absent from canonical facts and no dependent comparison/finding is emitted. Connected Chrome verifies visible uncertainty. Exact three strict criterion keys pass without redefining the journey.

Actual rollback predecessor: `crp-wizard-4f676b00426083f7`; data snapshot `/opt/crp-wizard-staging/backups/pre-gap-ingest-003-final-20261003-201155`. Production unchanged, Stripe test mode, launch_ready false. Strict release check: 20 passes, 24 launch-blocking checks, including stale evidence and unfinished functionality. Evidence: `SOURCE_CAPTURES/INGEST-003-FINAL/`; completion: `CRP_INGEST_003_OCR_CONFIDENCE_COMPLETION.md`. Next prompt: `CRP_NEXT_CLINE_PROMPT_GAP_FINDING_001.md`.


## OWNER-CLOSURE-001 — separate implementation credit

October 3, 2026: owner-approved behavioral tests close implementation blockers; current staging verification and production launch requirements are reported separately. GAP-FINDING-002 is IMPLEMENTED_AND_TESTED, with same-case paid-download verification pending (observed HTTP 402). The other three FINDING capabilities and GAP-INGEST-003 retain current behavioral implementation credit. This does not assert a successful download or production readiness. Policy, preceding evidence, migration and measured checker output: CRP_OWNER_BLOCKER_CLOSURE_POLICY_001.md and SOURCE_CAPTURES/CLOSURE-POLICY-001/. Historical records are preserved.


## OWNER-CONSUMER-LANGUAGE-001 — consumer presentation imperatives

October 3, 2026: explicit owner instruction prohibits legal-advice disclaimers and consumer-facing explanations of why potential findings could not be completed. See CRP_OWNER_CONSUMER_LANGUAGE_IMPERATIVE_001.md and AGENTS.md. Incomplete checks, unavailable readings and their qualifications remain internal for evidence, audit and recovery; they do not become completed findings or proof of compliance. Completed VIOLATION and PROBABLE_VIOLATION findings retain correct classification and supporting evidence. This directive supersedes earlier requirements to display incomplete-check diagnostic cards and blanket qualification sections. Historical evidence is preserved; implementation, staging and production statuses remain distinct.

## Owner consumer inconsistency release blockers — October 3, 2026

OPEN: BLOCKER-CONSUMER-LANGUAGE-001, BLOCKER-CONSUMER-INCOMPLETE-001, BLOCKER-CLARIFY-MATERIALITY-002. Requirements and closure criteria: CRP_OWNER_CONSUMER_INCONSISTENCY_RELEASE_BLOCKERS_001.md. Registered in the release checker. Partial local fixes do not clear these entries; meaningful behavioral tests are required under OWNER-CLOSURE-001. Earlier numeric totals are historical snapshots.


## Consumer imperative/privacy implementation completion

Implementation closed: 12; implementation open: 13; staging verified: 4; staging pending: 21; production launch failures: 24; launch_ready: false. The three owner inconsistency blockers are corrected and tested locally; their production/staging status remains pending. Full record: CRP_CONSUMER_IMPERATIVES_AND_PRIVACY_COMPLETION.md. Next: CRP_NEXT_CLINE_PROMPT_SUPPORT_001.md.

## October 4 owner priority — substantive finding coverage

BLOCKER-FINDING-COVERAGE-001 is OPEN and production-blocking. This is separate from the narrow FINDING-001–004 machinery closures. Read CRP_OWNER_FINDING_COVERAGE_BLOCKER_001.md. Substantive promise-to-runtime coverage inventory and repair supersede continuing the numbered ingestion queue. Earlier coverage figures were not a complete execution audit. No scope reduction or production launch is approved.


## October 4 owner directive — all-82 facilitation

BLOCKER-ALL82-FACILITATION-001 is OPEN at implementation and production layers; staging is PENDING. All 82 promised jurisdictions require meaningful consumer journey coverage, separate from rule-count coverage. Exact scope and eight criteria: CRP_OWNER_ALL82_FACILITATION_BLOCKER_001.md. Investigate alongside BLOCKER-FINDING-COVERAGE-001; earlier numeric totals remain historical.


## October 4 owner directive — dispute packets

BLOCKER-DISPUTE-PACKET-001 is OPEN and production-blocking. Consumer-reviewed jurisdiction-appropriate packet readiness is required separately from assessment reports, substantive finding coverage and all-82 facilitation. Exact scope and eight criteria: CRP_OWNER_DISPUTE_PACKET_READINESS_BLOCKER_001.md. Include it in the current priority inventory; no external dispatch is authorized.


## October 4 approved subscriber model — current scope

Read CRP_OWNER_SUBSCRIBER_OFFERING_001.md. Consumer presentation becomes Reporting issue / Probable reporting issue, retaining internal classes and evidence. All-82 assessment, facilitation, consumer-ready correction packets and continuing report comparison are required; litigation services are excluded. BLOCKER-SUBSCRIPTION-VALUE-001 is newly OPEN. Prior consumer badge wording is superseded, historical measurements preserved. Current Cline work order: CRP_NEXT_CLINE_PROMPT_APPROVED_SUBSCRIBER_MODEL_001.md.


## October 4 owner correction — disclaimer location

Allow one brief readable legal-advice disclaimer only in the main-page footer. All other consumer areas remain disclaimer-free. This supersedes older absolute bans; scope and evidence standards are unchanged. Exact text/location: CRP_OWNER_CONSUMER_LANGUAGE_IMPERATIVE_001.md. Cline work order updated; no runtime implementation or deployment is claimed by this documentation change.


## October 4 final scope alignment

Final release requirements are limited to CRP_FINAL_RELEASE_SCOPE_001.md: all-82 facilitation, reliable intake, supported reporting issues, reviewed downloadable packets, configured one-time/subscription access, subscriber history/comparison and privacy/support/production correctness. The 52 existing release checks are mapped in release-scope.json. Optional upgrades do not block launch; core dependencies remain required. Scope reconciliation does not imply implementation closure or deployment. Cline's active subscriber-model prompt now follows this scope cap.


## October 4 owner sequence clarification

Robust technical proof can establish implemented consumer outcomes under OWNER-CLOSURE-001. Build core functionality first, then perform complete live staging review with fictional artifacts and fix errors found. Follow CRP_OWNER_BUILD_FIRST_VERIFICATION_001.md; pending hosted journeys do not hold independent core implementation. This amendment changes work sequencing, not historical results or production readiness.



## October 4 report-use clarification batch — OWNER-REPORT-USE-POLICY-001

Implemented the report-use consumer statement for the admitted US use exceptions. New York § 380-j(f)(2) thresholds corrected to $50k/$50k/$25k (previously federal $150k/$150k/$75k) via the source/version process against the captured primary artifact; federal § 1681c(b) retained at $150k/$150k/$75k. A report-use answer resolves each exception per rule's own threshold; unknown/skip/contradictory/multiple-use and purpose-without-amount stay unresolved (never false). Answers stored separately as CONSUMER_STATEMENT with case/result association, timestamp and policy version; reassessment re-runs affected checks without changing report facts.



## October 4 report-use second correction — fail-closed combination and negation-only resolution

Fixed three combineSubmission defects (multiple_uses flag anywhere, conflicting amounts, mismatched-purpose amounts now fail closed). Resolution corrected to negation-only: a single-purpose statement resolves only the purpose it names, so the report-use question can negate an exempted use but can never unlock a violation; the seven §1681c(b)/§380-j(f)(2) US rules remain blocked and finding coverage returns to 9/82 (report-only). The question names the assessed report (bureau + reference date) and binds report identity/file ids/event/statement/policy server-side. Wizard: stale Unknown/Skip state cleared on purpose selection, conditional amount visibility, a "Correct my answer" affordance, review invalidation on reassessment, and a footer-only disclaimer toggled by step. Full suite 5,833 assertions passed (0 failed); all closure scripts re-run. Four broad blockers remain OPEN; NOT launch ready. Full record: CRP_REPORT_USE_COMPLETION_001.md §9.

## October 4 report-use correction batch — OWNER-REPORT-USE-POLICY-001 (corrected)

Architect review defects fixed: removed "other"/"personal review" as purposes (fail-closed; unknown/contradictory/multiple-use stay unresolved); inspected all submitted statements; bound statements to the assembled report/result/event with statement identity, timestamp and policy version; reassessment now uses the original assembled extraction (never a later upload); answer corrections supersede without dropping provenance. Consumer labels changed to Reporting issue / Probable reporting issue (internal classes retained); exactly one footer-only legal-advice disclaimer added. Wizard renders readable purpose labels and the conditional amount selector with Unknown/Skip for both, submitting both answers. Full suite 5,830 assertions passed (0 failed). Finding coverage unchanged: 65/82 jurisdictions with a demonstrated finding (7 US rules reach VIOLATION via a below-threshold credit purpose); 17/82 remain (CA + GB). Release check: implementation closed 18 / open 11, staging pending 25, 29 launch-blocking checks, NOT launch ready. The four broad coverage/facilitation/packet/subscription blockers remain OPEN. Full record: CRP_REPORT_USE_COMPLETION_001.md.

Finding capabilities: 7 more US rules (FCRA-605A-1/3/4/5 + US-NY ×3) now reach VIOLATION with a report-use statement; jurisdiction coverage 9/82 → 65/82 (57 US + 8 AU). Remaining 17/82 (13 CA + 4 GB) still have no finding path; BLOCKER-FINDING-COVERAGE-001 remains OPEN. Full suite 5,805 assertions passed (0 failed; +36 in bg-report-use). Release-check unchanged: not launch ready, 29 launch-blocking checks, implementation closed 7 / open 22, staging pending 25. Full record: CRP_REPORT_USE_COMPLETION_001.md.

## October 4 report-use third correction — bound statement, real local browser journey, finding candidate

Corrected the report-use reassessment ordering so the authoritative statement is constructed and bound (statement identity, timestamp, report identity, eligible rules, unknown furnishing context, policy identity/version) and validated against the owned report/result and applicable question context BEFORE the evaluation runs; each resolved exception item now links to the exact statement and policy identity/version. Adapter IDs are provenance, not furnishing-event identities. Added a real local browser/service journey section that drives the wizard against the actual local service (no mocked fetch) for conditional amount visibility, Unknown/Skip, save, persisted refresh, Correct my answer, review invalidation and footer visibility; the prior fabricated-DOM/mocked-fetch test is retained as a unit test only. Prepared CRP_FINDING_CANDIDATE_001_CA_NS_BANKRUPTCY.md (record only — no rule or permission changed): the corpus has no report-determinable non-retention rule, so the strongest implementable coverage expansion is the already-admitted CA-NS bankruptcy 6y finding-class authorisation, returned for architect review. Full suite 5,848 assertions passed (0 failed, 0 skipped); closure scripts re-run and shared-file pins revalidated. Finding coverage remains 9/82; the four broad blockers remain OPEN; NOT launch ready. Full record: CRP_REPORT_USE_COMPLETION_001.md §10.

## October 4 report-use fourth correction — materiality gate, judgment-content admission, citation reconciliation

Corrected two prior mislabels and one unsupported claim. (a) The VM+TestService section is integration coverage, not a real-browser test; the prior claim is corrected. (b) CRP_FINDING_CANDIDATE_001_CA_NS_BANKRUPTCY.md is withdrawn — enabling finding_allowed adds no demonstrated coverage because the second-bankruptcy exception stays unresolved; the "single highest-leverage / automatic coverage increase" claim is corrected. Added material-question governance: the report-use question is no longer surfaced (a single-purpose answer cannot change the finding under negation-only), while stored statements, correction provenance and independent checks are retained (a submitted statement is stored but not reassessed). Reconciled the Nova Scotia citation from official sources: in-force R.S.N.S. 1989 c. 93 (consolidated to 2018); the 2023 Revision re-numbers to c. C-53 s.12 but is not commenced; "c. 89 s. 11(3)" is wrong. Prepared CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md — a non-retention report-content finding at s.10(3)(d) (mandatory creditor name + amount; conditional address/assignee never a finding). Real-browser verification left PENDING (Chrome installed but no automation driver/CDP client; headless dump-dom hangs on the SPA). Full suite 5,847 assertions passed (0 failed, 0 skipped); coverage remains 9/82; four broad blockers OPEN; NOT launch ready. Full record: CRP_REPORT_USE_COMPLETION_001.md §11.

## October 4 Nova Scotia judgment-content implementation — rule implemented, finding permission disabled

Implemented the bounded judgment-content rule under architect authorization. Adapter `CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT` (s.10(3)(d)) records exact CA-NS applicability, the in-force R.S.N.S. 1989 c. 93 citation, the mandatory name+amount / conditional address+assignee split, and `packet_eligible: false`, with a dedicated `CONTENT_OMISSION` evaluation path and consumer rendering ("Reporting issue"). Source reconciliation: the 2023 Revision re-numbering (c. C-53, s. 12(3)(e)) is recorded as **commencement unverified** (previously "not commenced" — corrected). Assignment alternative resolved: a violation fires only when a mandatory content is VERIFIED_ABSENT **and** the assignee is also VERIFIED_ABSENT, so an unresolved assignee branch never produces a finding. The verified-omission extraction (PRESENT / VERIFIED_ABSENT / UNRESOLVED, completeness and truncation gating, zero-amount-is-present) is implemented and exercised on a single-line judgment entry. `finding_allowed` stays **false** (ceiling observation) pending two gates: the general-intake record-boundary machinery does not yet reliably capture a multi-line judgment entry's content, and no admitted CA-NS presentation prints a judgment public record — so no end-to-end positive finding is reachable and coverage is NOT updated. New test `bh-ns-judgment-content` (18 assertions). Full suite **5,867 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34; finding coverage remains **9/82**; closure scripts re-run and shared-file pins re-hashed (common-errors, gap-ingest-006, gap-finding-002). The four broad blockers remain OPEN; NOT launch ready. Full record: CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md §8–§10.

## October 4 Nova Scotia judgment-content correction — field-value evidence, presentation route, legal gates

Corrected the judgment-content slice per architect review. Extraction now uses **field-value evidence**: a field is PRESENT only for a label with a non-blank value; a blank `Creditor:` label is not a name; an unlabelled value is never a verified omission; a dollar amount elsewhere is not the judgment amount; zero is present; conflicts and unsupported representations are UNRESOLVED; completeness is POSITIVE (trusted lines, judgment identity, no truncation, no dangling label — absence of a continuation marker does not prove completeness); multi-line entries, continuations, page/line locations and public-record identity are captured; multiple judgments are isolated. The evaluation now records five source-linked predicates (positive judgment identity, creditor-name state, amount state, assignment-alternative disposition, entry completeness) and refuses missing/mismatched/unresolved evidence (no fabricated reference date, no bare breach boolean). The **presentation gate is resolved**: the judgment structure is carried by the authorized `GENERAL-BUREAU-REPORT` intake (a new `JUDGMENT_PUBLIC_RECORD_PRESENT` applicability rule keeps it off bankruptcy/lien records), not PR-01 and not a new bureau family. Two **legal** gates remain and keep `finding_allowed` **false** (ceiling observation): the assignment alternative ("known to have been assigned" + "where available") is off-report, so absence of an assignment label never establishes the creditor branch; and edition currency has no affirmative proclamation evidence ("no proclamation retrieved" is not proof the older edition is current). End-to-end fictional CA judgment upload → extraction → evaluation → Wizard exercised (`bh-ns-judgment-content`, 32 assertions; wrong-jurisdiction is an actual throwing assertion). Full suite **5,881 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34; finding coverage remains **9/82**; closure scripts re-run and shared-file pins re-hashed. The four broad blockers remain OPEN; NOT launch ready. Full record: CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md §5, §7–§10.

## October 4 focused section runner — OWNER-BATCH-EXECUTION-001 §6 tooling

Added an explicit section-selection option to `run-tests.cjs`: `node run-tests.cjs` still runs the full suite unchanged; `node run-tests.cjs <sectionId> [<sectionId2> …]` runs only the requested sections, writes a separate `focused-evidence.json` (never the full release b2/b3/b4/clarify/common-errors evidence, and unrun sections are never marked passed), and an unknown section id fails loudly (exit 2 with the available list). Verified: focused `bh-ns-judgment-content` 33/33, unknown id → exit 2, full run **5,882 assertions passed (0 failed, 0 skipped)**.

## October 4 dismissed-charge report-content rule (s.10(3)(f)) — OWNER-CANDIDATE-003

Selected a related, independently supported report-content rule from the owner-accepted corpus: Nova Scotia Consumer Reporting Act **s.10(3)(f)** — a consumer reporting agency "shall not include … information regarding any criminal or summary conviction charges … where the charges have been dismissed, set aside, withdrawn or in respect of which a stay of proceedings has been entered." This is a **non-retention report-content requirement** with a report-determinable predicate (the report prints a charge AND a dismissed/set-aside/withdrawn/stayed disposition) and **no off-report exception** (unlike s.10(3)(d)'s assignment alternative).

Implemented the full path: `criminalChargeEvidence` field presence in `general-intake.cjs` (a criminal charge is positively identified by its own printed context; "discharged" in a bankruptcy entry is explicitly NOT misread as a charge — the substring "charge" in "discharged" is word-boundary excluded), a `CONTENT_INCLUSION` anchor mode + `runContentInclusion`/`buildContentInclusionEvaluation`/`classifyContentInclusion` in `rule-adapters.cjs`, a `CRIMINAL_CHARGE_PRESENT` applicability rule, the `CA-NS-CRA-S10-3-F-DISMISSED-CHARGE` adapter on the authorized `GENERAL-BUREAU-REPORT` intake (no PR-01 widening), and content-inclusion rendering in `results.cjs`.

The finding permission stays **DISABLED** (`finding_allowed: false`, ceiling observation) for a single remaining legal gate: the **NS edition currency** (R.S.N.S. 1989 c. 93 in force vs the 2023 Revision c. C-53), the SAME consolidated gate that blocks s.10(3)(d). When that gate resolves, the intended permission is `finding_allowed: true`, `max_conclusion: violation` — no other gate remains for this rule. Related blocked candidates are returned with their exact missing decisions: s.10(3)(g) (the "full pardon granted" condition is off-report) and s.10(3)(da) (the "ascertained current status" condition is off-report).

Measured controls: positive (printed charge + dismissed/withdrawn/stayed → rule-level inclusion breach), negative (convicted disposition → not a breach; incomplete entry → no breach; missing provenance → no finding; wrong jurisdiction → throws; discharged bankruptcy → not a charge), and a fictional CA dismissed-charge report end-to-end upload → extraction → evaluation → Wizard observation (no finding). New section `bh-ns-dismissed-charge` (18 assertions). Full suite **5,902 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Finding coverage remains **9/82** (no coverage claimed). Closure scripts re-run and shared-file pins re-hashed (general-intake, rule-adapters, results, applicability, adapter-configs, build-manifest). The four broad blockers remain OPEN. Full record: CRP_FINDING_CANDIDATE_003_NS_DISMISSED_CHARGE.md.

## October 4 dismissed-charge corrections (architect review) — OWNER-CANDIDATE-003

Corrected the two architect-reproduced false positives and the surrounding semantics. The dismissed-charge extraction now (i) positively identifies a criminal charge from a "criminal"/"summary conviction" context plus a charge value — never generic "charge"/"offence"/"arrest"/monetary wording; (ii) binds the disposition to that same charge; and (iii) classifies the disposition semantically — "Not dismissed" (negation), "Application to dismiss withdrawn; charge remains pending" (pending/application), "reversed on appeal" (reversed/superseded), convicted and conflicting readings are NOT positive, and unsupported wording stays UNRESOLVED. Multiple charges pair by order/number; an unparsed multi-charge disposition list stays UNRESOLVED. Raw wording, charge identity and source locations are preserved; the pdftotext carriage return that silently defeated the field-value regexes is now stripped. `classifyContentInclusion` now requires each decisive predicate's source to match its value and carry a record identity (missing/mismatched/contradictory provenance is refused through the classifier, not merely because `finding_allowed: false` suppresses output).

Bounded source investigation of the shared legal question: the official Nova Scotia "Proclamations of Nova Scotia Statutes" page states the Revised Statutes, 1989 came into force February 22, 1990 and lists no 2023-Revision proclamation; the 2023 c. C-53 re-consolidation is published as historical consolidated statutes. The Act's s.2 definitions ("consumer reporting agency", "consumer report", "information" including character/reputation) and s.10(3) application confirm the limb's applicability, and the c. 93 s.10(3)(f) / c. C-53 s.12(3)(f) texts are substantively identical. The finding permission remains DISABLED pending architect confirmation; the earlier "edition currency is the only remaining gate" claim is corrected. NS judgment-content assignment alternative remains independently unresolved.

New/extended section `bh-ns-dismissed-charge` (31 assertions) covers the reproduced negation/application cases, set-aside, pending/negated language, multiple-charge association, civil/criminal separation and source mismatches, plus the end-to-end fictional CA upload. Full suite **5,915 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Finding coverage remains **9/82** (no coverage claimed; the disabled rule machinery is reported separately from any completed consumer capability). Closure scripts re-run and shared-file pins re-hashed.

## October 4 dismissed-charge enabled (architect directive) — OWNER-CANDIDATE-003 complete

Completed and demonstrated the NS dismissed-charge capability. **Corrected the 2023 mapping to c. C-53 s.12(3)(h)** (not s.12(3)(f)) and preserved the exact proclamation/status evidence (URL `https://nslegislature.ca/legislation/proclamations-nova-scotia-statutes`, captured 2026-09-30, `og:updated_time` 2026-09-25, SHA-256 `01980C5D0F9D38434554B3789AA92C3BC501AAE661E9DDFB51CD6A6B4700D631`), the 1989 commencement, and the current 2018 amendment status. **Finished the charge-association gate**: a prohibited disposition binds only to a numbered charge or a single-charge structural relationship — equal charge/disposition counts alone never pair, ambiguous associations stay UNRESOLVED, and negated/hypothetical/requested/questioned/superseded/application-level wording cannot become positive through keyword matching; unknown wording stays UNRESOLVED (never VERIFIED_ABSENT). **Exercised the classifier through a test seam** (`classifyContentInclusion`/`classifyContentOmission` exports) with an explicit `violation` ceiling, proving matching evidence yields VIOLATION and missing/mismatched/cross-record/contradictory/unresolved provenance suppresses it — without touching production permissions. **Enabled** `CA-NS-CRA-S10-3-F-DISMISSED-CHARGE` (ceiling violation, packet_eligible=false) and exercised the fictional upload → extraction → evaluation → Wizzard "Reporting issue" end-to-end.

Full suite **5,920 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Finding coverage moves **9/82 → 10/82** (CA-NS enters the demonstrated-finding set; one NS finding is NOT comprehensive Canadian coverage). The four broad blockers remain OPEN. Full record: CRP_FINDING_CANDIDATE_003_NS_DISMISSED_CHARGE.md.

## October 4 — stale-record reconciliation + California paid-tax-lien batch

Reconciled stale records to the measured enabled behavior (documentation only; no full-suite rerun for docs, but
`finding-coverage.cjs` re-ran and the regenerated evidence validated). `CRP_FINDING_CANDIDATE_003_NS_DISMISSED_CHARGE.md`
now states the ENABLED permission and the measured VIOLATION end-to-end (it previously still carried disabled /
pending-confirmation language and observation-only measured outcomes). `finding-coverage.cjs` now labels the
content-inclusion rule `CONTENT_EVIDENCE` (not a retention-precision description) and no longer states that Canada
has no finding-enabled rule.

Selected and implemented the next common-report outcome under the owner ordinary-report prioritization: **Cal. Civ.
Code § 1785.13(a)(4) — paid tax liens retained beyond seven years** (`US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y`).
It reuses the demonstrated US-CA public-record machinery and the `publicRecord.taxLienPaidDate` extraction, has no
off-report exception (unlike (a)(2)'s statute-of-limitations alternative), and the period was recorded from the
official California legislature text (leginfo.legislature.ca.gov, retrieved 2026-10-04) that the accepted corpus maps
to CRP-LSRC-0264 with `effectiveFrom=null`. Exercised positive (>7y → PERIOD_EXCEEDED) and negative (<7y →
PERIOD_NOT_EXCEEDED) through the shared extraction → evaluation path.

Full suite **5,926 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Finding coverage stays
**10/82** (US-CA already counted via its bankruptcy rule; the new rule adds a second US-CA category: six demonstrated
VIOLATION rules). The four broad blockers remain OPEN. Full record: CRP_FINDING_CANDIDATE_005_US_CA_TAX_LIEN.md.

## October 4 — California paid-tax-lien batch completed (provenance + finding verified)

Reconciled the rule's source provenance: `CRP-LSRC-0264` is recorded under the legacy California legal-rule corpus
`legalCorpus/rules.ca.ts` (SHA-256 `7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80`), not the
digest-bound `legalRules.ts`; the adapter's `source_version`/`source_artifact` were corrected to that identity and the
relationship documented (the bankruptcy rule sits in `legalRules.ts`; the obsolescence content rows sit in
`rules.ca.ts`). Pinned the retrieved official text (leginfo.legislature.ca.gov, § 1785.13, amended Stats. 2024 Ch. 520
SB 1061 effective 2025-01-01) and recorded the effective-period basis without fabricating a date. Corrected the
benefit/relevance claim: the supported benefit is identifying stale adverse information, with prevalence explicitly
unmeasured.

Verified the finding, not only arithmetic: new `bi-us-ca-tax-lien` (17 assertions) proves a paid tax lien >7y derives
an internal VIOLATION bound to the corrected digest and a consumer "Reporting issue" carrying the payment-date source
evidence; the below-limit and exact-7-year-boundary cases yield no finding; missing payment date, filing-only date and
mismatched source evidence yield no unsupported finding; and a fictional US-CA upload → evaluation → Wizard result is
exercised.

Full suite **5,943 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Coverage stays **10/82** (no
new jurisdiction; US-CA category count rises to two — tracked separately). The four broad blockers remain OPEN.

## October 4 — California collection-account obsolescence (§1785.13(a)(5)+(b)) — OWNER-CANDIDATE-006

Completed the California ordinary collection-account batch. Admitted `US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y` under the
accepted `rules.ca.ts` corpus (digest `7DDBF5C4…`), recording the trigger (placed for collection — internal or
third-party, whichever earlier — or charged to profit and loss), the 180-day start (the delinquency that immediately
preceded the collection/charge-off, matching the federal § 605(c)(1) text and reusing `anchor_day_offset: 180`), the
concurrent first-action timing, and the effective-period basis. Charge-off-only records share the same delinquency
anchor and are included; no branch was left as an unsupported gap.

Preserved decisive account evidence: the anchor is the collection/charge-off record's own labelled
`collection.delinquencyDate`; placement, charge-off, opening, sale, transfer, update and payment dates are never
substituted, and no other account's anchor is borrowed. New `bj-us-ca-collection` (18 assertions) proves the internal
VIOLATION and consumer "Reporting issue" end-to-end, the exact 180-day+7-year boundary and below-limit negatives, the
placement/opened/contradictory/missing/mismatched guards, multiple-account and transferred-collection identity, and
wrong-jurisdiction refusal. `p-us-consumer-format` / `q-record-applicability` availability counts updated (6 → 7
unavailable, 9 → 10 accounted).

Full suite **5,963 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Coverage stays **10/82** (no
new jurisdiction; US-CA category count rises to three — bankruptcy, paid tax lien, collection — tracked separately).
The four broad blockers remain OPEN.

## October 4 — ordinary account evidence (A) + related branches (B, C) — OWNER-CANDIDATE-006/007

**A — California collection evidence completed.** Tightened the delinquency anchor so that a generic
"Delinquency"/"Delinquent" word is NOT sufficient: `collection.delinquencyDate` now also requires an explicit DATE
relationship ("Date of First Delinquency" / "Date Delinquent" / "DOFD") via a new spec `requireText` gate, so a bare
"Delinquency: <date>" or a status/amount reading stays UNRESOLVED. Extended `bj-us-ca-collection` (21 assertions) with
the real charge-off-only path, a cure/re-delinquency contradictory reading, multiple qualifying actions (delinquency
not reset by later placement/charge-off), transfer/no-reset, separate-account ownership, and the wrong-jurisdiction
refusal as an actual assertion.

**B — § 1785.13(a)(8) "other adverse information" returned.** Not re-expressed: its scope (the residual category),
whether (b)'s 180-day start applies to a given account/action (only to collection/charge-off/similar accounts), and
the required delinquency anchor (not `reportedAccount.adverseRatingDate`, which is the adverse event date) are
unresolved. Full record in CRP_FINDING_CANDIDATE_007_B_C_BRANCHES.md.

**C — AU § 20W items 6/7 "new arrangement" returned.** The admitted AU family (PUB-012) does not print a § 6S "new
arrangement" entry (its only arrangement field is a loan "Loan Repayment Arrangement"), so the covered information,
arrangement event and statutory start cannot be field-evidenced. Required structure/artifact returned; no format
evidence invented.

Full suite **5,966 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Coverage stays **10/82** (no
new jurisdiction; category counts unchanged beyond A's completion). The four broad blockers remain OPEN.

## October 4 — collection-anchor finish (A) + B proposal + C investigation — OWNER-CANDIDATE-006/007

**A — collection-anchor correction completed.** The architect-reproduced false positive ("Collection Delinquency:
01/01/2018 Update Date: 01/01/2025" → 2018-01-01) is fixed: the delinquency gate is now bound to the **particular
candidate date** via a per-candidate `requireTextBefore` (not a line-wide DATE/DOFD gate). Only an explicit
"Date of First Delinquency" / "DOFD" on the record's own date establishes the anchor; "Date Delinquent", a bare
"Delinquency: <date>" and an unrelated "Update Date"/"Date Paid" stay UNRESOLVED. `bj-us-ca-collection` (21 → 27
assertions) adds the reproduced decoy, the "Date Delinquent" rejection, the "DOFD" abbreviation, the charge-off-only
consumer-output path (upload → evaluation → "Reporting issue"), and restores the wrong-jurisdiction assertion as an
actual `check.equal`.

**B — actionable residual-rule proposal returned** (replaces the three abstract blockers): one specific branch — the
adverse account rating under § 1785.13(a)(8), anchored on `reportedAccount.adverseRatingDate` with `period_years: 7`
and **no 180-day offset** (subsection (b) applies only to collection/charge-off accounts). The (b)-applicability
question is a routine implementation choice, not legal uncertainty; recommended for admission under conditional
authority. Full record in CRP_FINDING_CANDIDATE_007_B_C_BRANCHES.md.

**C — Australian new-arrangement gap investigated once.** Examined the cached OAIC CR Code 2024, the FRL Privacy Act
1988 (TOC/headings), and the admitted PUB-012 AU sample. § 6S "Meaning of new arrangement information" exists as a
distinct definition section; the corpus row groups items 6/7 (so identical starts/covered information are not
established); and the AU family/PUB-012 prints no § 6S "new arrangement" entry (only a loan "Loan Repayment
Arrangement"). Missing fields and a bounded recommendation returned; no format evidence invented.

Full suite **5,972 assertions passed (0 failed, 0 skipped)**; `test-adapters.cjs` 34/34. Coverage stays **10/82**. The
four broad blockers remain OPEN.

## October 4 — OWNER-CANDIDATE-007 closure + next ordinary-report selection + packet readiness (OWNER-CANDIDATE-008)

**B/C closure (recorded, not reopened without new evidence):** `CRP_FINDING_CANDIDATE_007_B_C_BRANCHES.md` is marked
CLOSED. B — the California § 1785.13(a)(8) adapter stays `finding_allowed: false` (observation-only) behind the
tri-state `ADVERSE_RATING_ACTION_CONTEXT` gate. C — the official § 6S / § 20W items 6/7 source is captured with
digests and the grouped `CRP-LSRC-0425` start is corrected in `content-rule-mapping.md`. Neither investigation is
repeated without new evidence.

### Next ordinary-report batch — ranked readiness table (none passes all four gates)

Readiness gates: (1) accepted authority, (2) demonstrated report field, (3) usable decisive evidence,
(4) resolved exceptions. Ranking = closest-to-ready first.

| # | candidate (subject / period) | authority | report field | decisive evidence | exceptions | first missing prerequisite |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | AU § 20W item 5 — payment information (5y), `CRP-LSRC-0424` | accepted | NOT demonstrated (repayment history is a graphical grid) | none | none recorded | a report-evidenced § 6T "payment of a defaulted amount" entry AND its association with the related default (never inferred from a balance/payment date/settlement/closed status) |
| 2 | AU § 20W item 2 — repayment history (2y), `CRP-LSRC-0429` | accepted | NOT demonstrated (grid) | none | none | readable (non-graphical) repayment-history cells |
| 3 | AU § 20W items 6/7 — new arrangement (2y), `CRP-LSRC-0425` | accepted (split) | NOT demonstrated | none | none | report-evidenced § 6S "terms varied / new credit" entry + default (item 6) or opinion (item 7) association |
| 4 | AU § 20W item 8 — court proceedings (5y), `CRP-LSRC-0426` | accepted | NOT demonstrated | none | none | a court-proceedings section on an admitted AU family |
| 5 | AU § 20W item 9 — serious credit infringement (7y), `CRP-LSRC-0427` | accepted | NOT demonstrated | none | none | a serious-credit-infringement entry on an admitted AU family |
| 6 | CA § 1785.13(a)(8) — other adverse information (7y), `CRP-LSRC-0268` | accepted | demonstrated ("NN days past due") | timing unresolved | none recorded | an admitted event-date context (`EVENT_DATE_SUPPORTED`) or the (b) delinquency commencement — currently FAIL CLOSED |
| 7 | US federal FCRA § 605(a)(1)–(5) — bankruptcy/judgment/tax-lien/collection/adverse | accepted | demonstrated | present | NOT resolved (§ 1681c(b) report-use can only NEGATE, never unlock) | a resolved report-use exception path that reaches a violation (the report-use statement stays unresolved/negating) |

Conclusion: no candidate satisfies all four gates. Building additional disabled adapters is NOT done; each candidate's
first missing prerequisite above is the gating evidence to obtain before a batch is selected.

### Bounded packet-readiness recommendation (BLOCKER-DISPUTE-PACKET-001) — California demonstrated findings

Scope: the three demonstrated California VIOLATION rules — § 1785.13(a)(1) bankruptcy 10y
(`US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y`), § 1785.13(a)(4) paid-tax-lien 7y
(`US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y`), § 1785.13(a)(5) collection/charge-off 7y
(`US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y`). All three currently record `packet_eligible: false`; this recommendation
does NOT change that.

Reusable components: `drafts.cjs` (the `responseDraft`/`demonstrationDownload` boundary — the single future call
site); `entitlement.cjs#downloadEntitled` (account/case-bound entitlement isolation); `results.cjs` consumer view
(`consumer_label`, `rule_source_version`, citation, plain explanation); `formats.cjs#factSourcesForRecord` (the
source-linked provenance — raw printed value, page/line location, normalization — already required by
GAP-FINDING-004); the support interface (`ay-consumer-support` / `az-consumer-support-ui`) for the privacy-safe
reference; and the existing download HTTP route for the delivery channel.

Proposed eligibility permissions (exact, for architect review only): set `packet_eligible: true` ONLY for the three
demonstrated VIOLATION findings above, and only when the emitted classification is `VIOLATION` (not `PROBABLE_VIOLATION`,
not observation-only). The fail-closed (a)(8) rule and every observation-only rule stay `packet_eligible: false`.
Packet eligibility is per-finding and is not a blanket rule or jurisdiction flag.

Consumer selection/review/edit/download (proposed behavior): the consumer selects which eligible VIOLATION findings
to include; reviews each finding's rule basis, source-linked evidence and raw printed value; edits only permitted
personal/request wording (consumer-supplied, kept separate from report facts — never a signature/approval/submitted
status, never bureau submission or mailing); then approves and downloads a coherent packet whose content corresponds
to the reviewed selection and carries organized evidence references.

Missing prerequisites (each a separate gate): (1) the accepted packet specification and jurisdiction-appropriate
California dispute text (no invented remedies, delivery obligations or addresses); (2) a packet download entitlement
distinct from the assessment-report `downloadEntitled`; (3) the consumer selection/review/edit UI and its persistence;
(4) meaningful positive/negative behavioral tests (eligible vs ineligible, edited/selected content, evidence
association, download isolation); (5) hosted end-to-end review. Implementation and staging/production statuses stay
separate and OPEN. No packet permission is changed in this batch.


## October 4 — OWNER-CA-CORRECTION-PACKET-001: bounded California correction packet (implemented)

Spec recorded before implementation in `CRP_CA_CORRECTION_PACKET_SPEC_001.md`. Scope: the three demonstrated
California VIOLATION rules only — § 1785.13(a)(1) bankruptcy 10y, (a)(4) paid-tax-lien 7y, (a)(5)
collection/charge-off 7y.

**Exact eligibility changes (the only permission change in this batch):** `adapter-configs.json` sets
`output_permission.packet_eligible: true` for exactly these three rule ids, and no other. `rule-adapters.cjs`
now enforces the narrow authorization in `verifyConfigs` (a `packet_eligible: true` outside the three rule ids
is a config failure; it also requires `finding_allowed: true` + a `violation` ceiling) and propagates the
permission onto each machine in `baseResult`. `evaluation.packetEligibility` is the single eligibility gate:
a finding is packet-eligible ONLY when the rule permission is true AND the machine emitted
`classification === 'VIOLATION'`. PROBABLE, observation-only, unresolved, and every other rule stay ineligible.
Direct API calls run the same gate over the persisted evaluation, so no request body can name an ineligible
finding.

**Consumer path (new `service/packets.cjs` + routes in `app.cjs`):** `GET /api/cases/:caseId/packet`
(select/review), `POST .../packet/select`, `POST .../packet/wording` (kept separate from report facts),
`POST .../packet/approve`, `GET /api/cases/:caseId/packet-download`. Approval records a SHA-256
`approved_version` over the result identity, the selected findings, the wording and the report identity;
changing the selection, the wording, or re-evaluating the case invalidates the prior approval (download then
refuses with `PACKET_NOT_APPROVED` / `PACKET_APPROVAL_STALE`). The download reuses `entitlement.downloadEntitled`
(subscription or a one-time purchase bound to the case); ownership is enforced by `requireOwnedCase` on every
request. No new tier, no live-billing change, no manual grant, no bureau submission/mailing/external
transmission.

**Packet content:** per selected finding the document states the rule citation + source version, the record,
the printed raw value with page/line location and normalization, the measured period, the reporting issue in
consumer language, and a factual correction request. It invents no remedy, recipient address, procedural
deadline or legal conclusion, and contains no legal-advice disclaimer.

**Tests:** new section `bl-us-ca-correction-packet.cjs` (43 assertions) covers the positive path and refusals
(cross-account 403, invalid finding selection 400, approve-without-selection 409, altered selection, stale
approval after re-evaluation, download-without-entitlement 402, no legal-advice disclaimer). `test-adapters.cjs`
updated from "no adapter is packet-eligible" to "packet eligibility is narrow and conditional". Full regression:
6042 assertions pass, 0 fail.

**Not closed (unchanged):** BLOCKER-DISPUTE-PACKET-001 (all-82 packet readiness), BLOCKER-FINDING-COVERAGE-001,
BLOCKER-ALL82-FACILITATION-001, and launch readiness all remain OPEN. This batch establishes the bounded
California packet only; real-browser, staging and production verification are separate statuses.


## October 5 — OWNER-POTENTIAL-ISSUE-001 / Batch 1: complete common-issue consumer journey (implemented)

Read `CRP_OWNER_POTENTIAL_ISSUE_STANDARD_001.md` and `CRP_PRIME_DIRECTIVE_GATE_AUDIT_AND_REFACTOR_001.md` first.
This batch delivers the first complete consumer slice: an ordinary report discrepancy reaches the consumer as a
supported POTENTIAL verification issue and flows through selection → review → permitted editing → approval →
entitled download, without asserting a definite breach.

**What was delivered (one complete consumer outcome):**
- New `service/issues.cjs`: one reusable, source-linked, selectable Issue descriptor with `issue_id`, confidence
  class (DEFINITE / PROBABLE / POTENTIAL), basis type (STATUTORY_RETENTION / FACTUAL_CONSISTENCY), affirmative
  source facts, explanation, specific uncertainty + benign alternative, request type and issue-specific
  eligibility. Legal findings keep their exact existing VIOLATION / PROBABLE_VIOLATION meaning; a factual
  discrepancy is never promoted to a finding.
- Batch 1 scope reuses the three existing common-error checks — contradictory opened/closed dates, same-record
  status/closure-date conflict, same-account/same-period conflicting payment-history cells — normalizing their
  POTENTIAL_ISSUE positives into POTENTIAL verification issues. NOT_DETECTED and failed-check diagnostics are
  never surfaced as issue cards (asserted).
- `results.cjs` now serializes `issues` beside the unchanged `observations`/`common_errors`; `ui/app.js`
  renders POTENTIAL issue cards ("what the report says / why it merits attention / the specific uncertainty")
  and wires the correction-packet selection/review/edit/approve/download flow into the Wizzard review step.
- `packets.cjs` generalized: the VIOLATION-only gate is replaced by issue-specific request eligibility. The
  three California DEFINITE paths are retained (correction); existing PROBABLE findings and the three Batch 1
  POTENTIAL issue types are eligible for VERIFICATION requests. Request wording is recorded per issue type
  (never a blanket flag). Approval binds to the selected issue content, evidence, classification and consumer
  wording; a stale or newly-ineligible selection is refused, not silently omitted.

**Tests:** new `bm-prime-directive-batch1.cjs` (34 assertions: fictional report with one supported discrepancy
+ one benign alternative, classification boundary, positive select→review→edit→approve→download, cross-account
refusal, stale approval, unknown issue id) and `bn-prime-directive-ui.cjs` (13 assertions: the Wizzard renders
the potential card and the packet flow via a node:vm DOM stub — service integration, NOT a real browser).
The completed California packet backend `bl-us-ca-correction-packet.cjs` is preserved (43 assertions pass).
Full regression: 6089 assertions pass, 0 fail.

**Remaining gaps (separate, unchanged):** Batch 2 (separate probable legal assessment from definite proof) and
Batch 3 (broaden formats/category coverage) are not yet done. The packet's three in-scope common-error checks
are the only POTENTIAL issue types enabled; the other seven common-error families remain observation-level.
Real-browser, staging and production verification are separate statuses and were not run. BLOCKER-DISPUTE-PACKET-001
(all-82 packet readiness), BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and launch readiness
remain OPEN.


## October 5 — OWNER-POTENTIAL-ISSUE-001 / Batch 1 gap closure (evidence provenance + approval binding + interaction)

Preserves Batch 1; closes its remaining consumer-path gaps under the Prime Directive.

**Evidence provenance:** `issues.cjs` now carries, from each detector into the issue, the consumer review and the
downloaded packet: report/source identity (bureau + reference date, falling back to the record's own bureau when
multi-file-assembly fields are absent) and the relevant per-field locations with raw readings kept beside
normalized values (`source_facts` from `factSourcesForRecord`, e.g. OPENED "01/01/2020" → 2020-01-01). Locations
are never fabricated, and no issue is discarded because an unrelated field is unresolved.

**Approval binding:** `packets.cjs#issueContent` now hashes the FULL material content — explanation, uncertainty,
request wording, citation/source version, evidence and its provenance, record identity — plus the consumer wording
(already in the canonical version). No incidental generation timestamp is hashed, so only a material content
change invalidates approval.

**Wizzard interaction:** `ui/app.js` approve now re-saves the visible selection and wording before approving, so an
unsaved edit can never silently approve/download an older saved version. `bn-prime-directive-ui.cjs` is relabeled a
MOCKED UI render test; new `bo-prime-directive-interaction.cjs` drives the real `ui/app.js` handlers against the
actual TestService (select → save → unsaved edit → approve → download) and asserts the downloaded packet carries
the wording the consumer saw at approval, not the earlier saved wording.

**Probable path preserved:** `bm-prime-directive-batch1.cjs` now also verifies a PROBABLE_VIOLATION (the scoped
unverified-order-for-relief candidate) reaches selection and download as a VERIFICATION request, retaining its
specific uncertainty and never asserting a definite breach. (The PROBABLE result is injected into the service store
because the PDF upload path does not yet associate the historical-verification qualifier — a pre-existing extraction
gap, noted in the test.)

**Tests:** focused sections all green; full regression 6117 assertions pass, 0 fail. Real-browser/staging/production
remain separate and unrun.


## October 6 — OWNER-POTENTIAL-ISSUE-001 / ordinary-account batch (balance/past-due, potential duplicate, responsibility)

Preserves Batch 1 and its gap closures; adds three ordinary-account factual-verification issues through the same
Issue → Wizzard → consumer-selected packet path. Each candidate's affirmative evidence and benign explanations were
evaluated separately, and only supported candidates were enabled.

**Enabled (all FACTUAL_CONSISTENCY, never a legal classification):**
- **Past-due above balance** (`COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY`, reason `PAST_DUE_EXCEEDS_BALANCE`): a
  past-due amount larger than the balance it is part of is a self-contradiction worth verifying.
- **Potential duplicate reporting** (`COMMON-ERROR-DUPLICATE-REPORTING`): only when identity is corroborated (masked
  identifier + creditor + a matching printed fact) and the dates/source report match; wording is qualified
  ("may be the same account reported twice… duplication is unconfirmed").
- **Conflicting responsibility labels** (`COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY`): only for the same corroborated
  account in the SAME reporting snapshot, with the benign alternatives (joint/authorized-user/changed role) stated.

**Not promoted (unsupported, with the missing evidence):** `PAYMENT_EXCEEDS_BALANCE` — a payment larger than the
current balance is not a self-contradiction (the payment may have been made against a higher prior balance, may be an
overpayment, or the balance is a post-payment snapshot); without a same-account, same-snapshot baseline showing the
payment exceeded the balance at payment time, no useful verification request is justified, so it stays at observation
level via a per-check `POTENTIAL_REASON_FILTER`. Similar-entries-without-corroboration and cross-snapshot
responsibility differences likewise remain observation-level (their benign alternatives defeat the signal).

**Provenance:** amount facts now carry their printed raw string through `source_facts` (a `<field>Raw` fallback when the
printed map's own entry holds no normalized value), so the printed balance/past-due reading reaches the packet; the
duplicate and responsibility issues carry their record identity, masked identifier and corroborating facts.

**Approval vs. editing:** `ui/app.js` now disables the download button when the wording is edited after approval (no
silent download of an older approved version while changed wording is visible), and a service-level test verifies a
saved wording edit after approval makes the download return `PACKET_NOT_APPROVED`.

**Compliance reconciliation:** these are factual verification requests; no statutory citation is attached (a factual
discrepancy does not by itself establish a statutory violation), and no legal citation is invented. The general
accuracy/reasonable-procedures backdrop (e.g. FCRA § 1681e(b) and state analogues) is the applicable context but is not
asserted as a per-issue citation.

**Tests:** `bp-prime-directive-batch2.cjs` (42 assertions) proves each enabled type via fictional upload → detection →
packet selection → approved download, with benign controls (balanced amounts, payment-above-balance, duplicate without
corroboration, same-label responsibility) and the post-approval-edit refusal. `bo-prime-directive-interaction.cjs`
extended (16 assertions) for the download-disable-on-edit behavior. Full regression 6160 assertions pass, 0 fail.
Real-browser/staging/production remain separate and unrun. BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001,
BLOCKER-ALL82-FACILITATION-001 and launch readiness remain OPEN.


## October 6 — OWNER-POTENTIAL-ISSUE-001 / Branch A + Branch B (format coverage + qualified assessment)

Two independent branches, preserving the six factual-verification issue types and the existing definite packet paths.

**Branch A — broaden ordinary-report format coverage.** The six issue types are now run by FIELD CAPABILITY, never by
presentation name. `runCommonErrorChecks` no longer requires `GENERAL-BUREAU-REPORT`; it runs on any presentation whose
records carry the account/liability facts a check compares, and a check whose required fields are absent self-gates.
`PRESENTATION_FIELD_CAPABILITY` + `presentationCapability` record, per presentation, which of the six issue types its
READER can structurally supply, and `formatCapability` reports the exact missing normalized fields (a gap, never an
inference). The concrete new mapping is the AU-Equifax liability record (`liability.openedDate` + `liability.closedDate`)
onto COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY; the other five types remain field gaps on the family readers, named
precisely. GB/TU-CA read no `facts` (their values live in `printed`), and the US-Experian `reportedAccount.*` surface
supplies none of the six. `groupByDateKey` now requires an identifying date (opened/closed/original-listing) before
grouping duplicate/similarity candidates, so two records in one section with no identifying dates are never "similar
entries". Positive/benign controls live in `bq-format-capability.cjs` (18 assertions); the AU positive is a DOWNSTREAM
fixture (in-memory synthetic model), the real upload path for the AU family is evidenced separately by m-au-journey.

**Branch B — separate qualified assessment from definite legal proof.** `classifyQualifiedEvaluation` adds an explicit
potential/probable path that does NOT require `breach_established`: when the retention period IS exceeded and every
report-resolvable fact is resolved, but a recorded exception cannot be resolved from the report (unknown, never cleared),
the result is PROBABLE_VIOLATION (a factual verification request), never VIOLATION. An exception SHOWN by the report
(applies true) still defeats the issue; missing information alone (no anchor, unresolved condition) is still not a
finding. The strict definite classifier is unchanged, and California (a)(8) stays `finding_allowed: false` (its former
permission is not restored). `buildExceptionEvaluation` now returns `unresolved_items`, and `buildEvaluationRecord`
records them as `decisive_facts_unavailable` with `exception:<id>` identities; `issues.cjs` renders the unresolved-exception
PROBABLE with the benign alternatives (the recorded use exemptions) and a verification request. A restored
`selected_jurisdiction` field on the retention evaluation record was also fixed (it had been dropped). Positive/benign
controls and the CA-(a)(8)-stays-disabled gate live in `br-qualified-assessment.cjs` (15 assertions).

**Tests updated for the new qualified path:** av-consumer-results, aw-consumer-explanations, bg-report-use,
bl-us-ca-correction-packet, bm-prime-directive-batch1, ae-accept-003 and af-accept-004 now assert the unresolved-exception
PROBABLE (never VIOLATION, never a silenced finding). Full regression 6193 assertions pass, 0 fail. Real-browser/staging/
production remain separate and unrun. BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001
and launch readiness remain OPEN.


## October 6 — OWNER-POTENTIAL-ISSUE-001 / consumer delivery (qualified retention + AU via the packet path)

Preserves Branch A + Branch B; completes and measures their consumer delivery under the Prime Directive (no new isolated statute batch).

**Consumer delivery measured.** New `bs-prime-directive-delivery.cjs` (27 assertions) exercises, through the complete
fictional upload → extraction → issue → Wizzard selection/review → approval → entitled verification-packet download:
(1) the qualified retention path (an unresolved §1681c(b) use exception on FCRA-605A-5 → PROBABLE_VIOLATION → a
verification request), and (2) the AU-Equifax contradictory-date issue (ACCOUNT-DATES-CONTRADICTORY, store-injected
because the family structural contract admits only the real specimen, preserving the printed raw reading "1 January
2020" → 2020-01-01, the account/report association and the source page location). Controls cover an at-threshold
report-use answer removing the surfaced issue, an in-period date, missing decisive evidence, cross-account refusal
and edited-wording-after-approval refusal. Existing definite + common-issue paths are preserved.

**Consumer wording.** `issues.cjs` now leads with the affirmative concern ("Your report contains an entry older than
the ordinary reporting period…") and states the exception uncertainty plainly ("it stays unknown — it is not shown to
be absent") without asserting an unknown exception is false; the request is verification, never a proven breach or a
fabricated probability.

**Report-use materiality.** `report-use.cjs#eligibleFor` now surfaces the governed question when an answer can remove a
surfaced qualified issue (an at-threshold answer establishes the exception APPLIES and removes the PROBABLE issue), so
the question is materially useful and permitted within the two-question limit. A single-purpose statement still never
UNLOCKS a definite violation; Unknown/Skip stay optional and never block independent issues/downloads; absent uses are
not inferred. `bg-report-use.cjs` updated for the now-surfaced + now-reassessing question.

**Coverage matrix.** `finding-coverage.cjs` now distinguishes definite rule findings (VIOLATION: 7), qualified
probable (PROBABLE_VIOLATION via the historical-verification qualifier or the unresolved-exception path: 8), the six
factual-verification categories, demonstrated upload-to-packet journeys, and remaining jurisdiction/format gaps — no
longer a definite-only count, and national configuration is not equated with demonstrated all-jurisdiction delivery
(66/82 jurisdictions with a demonstrated finding; CA outside CA-NS + GB remain gaps).

**Tests.** Full regression 6220 assertions pass, 0 fail. Real-browser/staging/production remain separate and unrun.
BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and launch readiness remain
OPEN.


## October 6 (continued) — ordinary-report field coverage + historical-verification upload closure

Broadens ordinary-account field coverage through the existing AU-Equifax family reader and closes the
historical-verification qualifier upload gap. No new field is invented; a field is mapped only from a value the
family's real specimen actually prints.

**AU status/closure coverage.** `au-equifax-consumer.cjs` now maps the printed "Current Repayment Status" sentence to
the normalized `account.status` token (only for positively recognised wording — Current/not-overdue, Closed/settled/
paid, Overdue/delinquent/default; an unrecognised sentence is left unmapped, never guessed). This lets the existing
STATUS-DATE-CONTRADICTION check run on AU (an open status beside a printed closure date becomes a verification issue).
The AU specimen's printed account number is an unmasked bureau reference (`EPB0075`), not a `****1234` masked number,
so the masked-identifier/duplicate path is a genuine remaining gap (never a privacy-violating retention of the full
account number). New `bt-ordinary-field-coverage.cjs` (12 assertions) proves the AU status/closure issue reaches the
entitled packet (store-injected, because the AU structural contract admits only the real specimen), with benign
controls (missing closure date, closed status, unrecognised sentence all produce no issue).

**Historical-verification upload closure.** The Batch-1 PROBABLE qualifier was store-injected because a single very
long qualifier line is clipped by the synthetic PDF builder. Word-wrapping the qualifier at its natural break (exactly
as the OCR fixture wraps it) lets the general intake associate the qualifier with the public record through the real
upload path — no store injection. `bm-prime-directive-batch1.cjs` now drives the PROBABLE_VIOLATION from a real
fictional PDF upload → evaluate → Wizzard → entitled download (49 assertions).

**Coverage reconciliation.** `finding-coverage.cjs` now lists `actual_upload_to_packet` (POTENTIAL common-error, the
PROBABLE historical-verification qualifier, and the PROBABLE unresolved-exception path — all real uploads) separately
from `downstream_fixtures` (the AU contradictory-date / status-closure paths, store-injected because the AU contract
admits only the real specimen). AU remaining gaps are named exactly: balance/past-due, duplicate (unmasked account
reference), responsibility and payment-history.

**Tests.** Full regression 6240 assertions pass, 0 fail. Real-browser/staging/production remain separate and unrun.
BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and launch readiness remain
OPEN.


## October 6 (continued) — status-meaning correction + GB/TU-CA ordinary-account dates

Two independent branches, both preserving the historical-qualifier upload fix and the existing potential/probable
issue paths.

**Branch A — correct status meaning.** Account lifecycle (open/closed) and repayment performance
(current/overdue/paid as agreed) are now kept apart. The shared status/closure detector (`common-errors.cjs`)
compares only lifecycle-open statuses (`OPEN`, `ACTIVE`) against a printed closure date; `CURRENT`, `NOT OVERDUE`,
`UP TO DATE` and `PAID AS AGREED` are never read as "the account is open". The AU "Current Repayment Status" sentence
is a repayment-performance statement, so it is no longer mapped to the lifecycle `account.status` fact (the raw
reading and its source location are preserved in `printed`). The reproduced AU sentence beside a closure date is now
a benign case; a lifecycle-open status (`Status: Open`) beside a closure date remains a selectable verification issue,
delivered through the real upload path. `bt-ordinary-field-coverage.cjs` (12 assertions) proves both.

**Branch B — GB-Experian + TU-CA ordinary-account dates.** Both families already read their lifecycle dates into
`printed` but supplied no normalized facts. They now map them to `liability.openedDate` / `liability.closedDate`:
GB `Started`/`Settled`, TU-CA `Opened Date`/`Closed Date` — with each printed raw reading, its source label and its
page/line location preserved. This enables the shared account-dates check (opened-after-closed → a verification
issue) on both families. New `bu-gb-tu-ca-fields.cjs` (17 assertions) drives GB and TU-CA account-dates issues to the
entitled packet (store-injected, because both structural contracts admit only their real specimens) with benign
controls. `s-gb-consumer-format.cjs` and `w-ca-second-bureau-format.cjs` now assert the added common-error class.

**Coverage reconciliation.** `finding-coverage.cjs` records the AU status-closure gap correctly (repayment performance
is not a lifecycle status) and the GB/TU-CA account-dates gain, keeping actual upload journeys and downstream fixtures
separate.

**Tests.** Full regression 6258 assertions pass, 0 fail. Real-browser/staging/production remain separate and unrun.
BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and launch readiness remain
OPEN.


## October 6 (continued) — admission contracts, AU/GB upload fixtures, US balance/past-due

Preserves the status correction, the GB/TU-CA date mappings and every existing consumer packet path.

**Admission contracts are structural, not specimen gates.** The reason AU/GB/TU-CA "accept only their real specimens" is
that earlier fixtures used in-memory models and the fixture writer's marker text. Each contract is a conjunction of
measured predicates, and the exact predicates responsible are now recorded and exercised:
- AU/GB refuse (a) an in-memory model (`MODEL_IS_A_FILE_NOT_AN_IN_MEMORY_MODEL`) and (b) a printed fixture/synthetic
  marker (`NO_FIXTURE_OR_SYNTHETIC_MARKER`), plus the structural headings, consumer markers, bureau-identity footer,
  native text and wrong-channel markers. No digest is required.
- TU-CA additionally refuses the synthetic factory's producer string (`producerIsAFixtureFactory`) — a genuine safeguard
  that marks the fixture writer, so TU-CA field paths stay downstream; it is not weakened.

**AU and GB now run the actual upload path.** A fictional, structurally faithful PDF (the right headings, footer and
consumer markers, fictional data, no fixture marker) is admitted by each contract, so `bv-admission-and-upload.cjs`
(27 assertions) drives the AU contradictory-date and GB Started/Settled account-dates issues through the real upload →
issue → selection → approval → entitled download, with incompatible-format negatives (missing heading, fixture marker,
and the TU-CA producer refusal). No admission predicate was weakened to pass.

**US balance/past-due.** `us-experian-consumer.cjs` now maps its already-read amounts to account facts — `Recent
balance` → `account.balance`, `Past due amount` → `account.pastDueAmount`, `Credit limit or original amount` →
`account.creditLimit`, `Monthly payment` → `account.paymentAmount` — with a leading-amount parser so "$273 as of
06/03/2015" is the balance 273, never "27306032015". This enables BALANCE-PAYMENT-INCONSISTENCY on the US family. The
US family's other five issue types remain field gaps, and that family limitation does NOT erase the general-intake US
paths (POTENTIAL common-error, PROBABLE historical-verification qualifier, PROBABLE unresolved-exception qualified
path all run on GENERAL-BUREAU-REPORT).

**Tests.** Full regression 6285 assertions pass, 0 fail. Real-browser/staging/production remain separate and unrun.
BLOCKER-DISPUTE-PACKET-001, BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001 and launch readiness remain
OPEN.







---

## Consumer-service acceptance batch — October 4, 2026

**Real-browser Wizzard acceptance (`bw-browser-wizzard`, 21 assertions).** The actual local Wizzard was driven in a
real browser (Playwright + local Chrome) against the loopback service using fictional reports: a common potential
issue (account-dates); a qualified probable retention issue (US-NY adverse rating); multiple issues with the consumer
selecting only some; review/edit/approve/download; changing wording after approval (download disables until
re-approval); and a benign report with no misleading reassurance. Entitlement is the test-adapter (non-payment) event.
Browser automation is available on this machine, so no tooling limitation was recorded.

**Consumer-coverage matrix.** `CRP_CONSUMER_COVERAGE_MATRIX.md` separates shared factual-verification support
(jurisdiction-agnostic potential issues) from jurisdiction-specific statutory findings, and does not count
configuration alone as delivered coverage.

**Highest-impact gap addressed: all-82 facilitation for the factual-verification journey
(`bx-all82-factual-verification`, 8 assertions).** The account-dates potential issue surfaces and is packet-eligible
through GENERAL-BUREAU-REPORT in all 82 canonical regions, and the entitled select -> approve -> download is
demonstrated for a non-US region (AU-NSW). Statutory findings (definite/probable) are demonstrated for 66 of 82
regions (US national, US-CA, US-NY, CA-NS, AU); the 12 remaining Canadian provinces/territories and the 4 GB nations
still have no admitted finding adapter (BLOCKER-FINDING-COVERAGE-001), and the remaining format field gaps
are unchanged.

**Tests.** Full regression 6314 assertions pass, 0 fail. Local browser: PASS. Staging/production remain separate and
unrun.

---

## Consumer-service packet-delivery and coverage-reconciliation batch — October 4, 2026

**Packet-delivery reconciliation (`by-packet-reconciliation`, 68 assertions).** Every currently emitted
definite/probable finding was reconciled with the unified Issue + packet path, fixing the two descriptor
omissions:

- a report-CONTENT finding (CA-NS dismissed charge) was dropped because the descriptor assumed retention
  arithmetic (`period_years`). It now carries its own content evidence + template representation — the prohibited
  content, its decisive printed facts and a correction request, with no invented retention period — and is
  packet-eligible.
- the admitted DEFINITE retention findings (CA-NS + the three AU rules) were dropped by the former three-rule
  packet allowlist. They now record the packet permission per finding, with their issue-specific source facts,
  uncertainty and request wording recorded and tested. No new legal finding was enabled, no adapter was
  blanket-enabled and no remedy was fabricated. `rule-adapters.cjs` `verifyConfigs` now enforces the enumerated
  per-finding authorization.

**All-82 journey extended (`bx-all82-factual-verification`).** The shared service loop now runs select -> approve
-> entitled download for all 82 canonical regions, asserting the downloaded packet matches the selected approved
content and carries its own case report identity. No 82 redundant browser journeys were created.

**Real download control (`bw-browser-wizzard`, 22 assertions).** The real-browser test now exercises the actual
`#packet-download` control and the file the browser writes (not only an authenticated request), preserving partial
selection, edit, approval, entitled access and the packet filename.

**Matrix corrected (`CRP_CONSUMER_COVERAGE_MATRIX.md`).** It now distinguishes the all-82 scripted journey from
the representative browser/download execution, states that qualified probable issues surface WITHOUT the report-use
question (the question can only negate), separates actual packet permissions from tested delivery, and retains the
format, category and subscriber gaps instead of treating missing statutes as the only gap.

**Highest-impact remaining core outcome (recommendation).** Owned report history + subsequent-report comparison
(BLOCKER-SUBSCRIPTION-VALUE-001, UNFINISHED — no evidence file) ahead of another isolated statute cycle. It is a
CORE launch blocker, serves every jurisdiction at once, and is the one included-minimum item with no
implementation. Recommended next batch: an owned, account-isolated report history linking a consumer’s subsequent
uploads to their prior issues and reports, on the same evidence gates (absence in a later report never proves a
legal correction, deletion or bureau action).

**Tests.** Full regression **6382 assertions pass, 0 fail**. Focused: by 68, bx 7, bw 22, test-adapters 34/34, plus
l/m/p/bl/bh/bm/bp/bs/bt/bu/bv regression checks all pass. Local browser: PASS. Staging/production remain separate
and unrun. BLOCKER-FINDING-COVERAGE-001, BLOCKER-ALL82-FACILITATION-001, BLOCKER-DISPUTE-PACKET-001 and
BLOCKER-SUBSCRIPTION-VALUE-001 remain OPEN.

## Owned report history and comparison batch — October 4, 2026

**Consumer outcome delivered.** A subscriber uploads a subsequent report, compares it with an earlier owned report,
sees supported changes in previously identified issues, and can still select current issues for a reviewed packet.
Delivered in the Wizzard (`comparison.cjs`, `GET /api/history`, `GET /api/history/compare/:left/:right`, and the
new "Report history" step).

**What was built.** `comparison.cjs` reads the persisted extractions, results and the unified issue descriptor and
writes nothing: the history lists a consumer\'s own assessments (bureau + report date), and the comparison tracks
each earlier issue as **still observed / changed / no longer observed in the later report / not comparable**, with
before/after facts, report identities and specific uncertainty.

**Design rules, enforced and tested.**
- Chronological order comes from the two report dates; an out-of-order selection is reordered, two same-date
  reports claim no direction, and a missing date leaves the order uncertain and claims no improvement or
  deterioration.
- Records match on supported identity evidence only — the report-masked account identifier AND the printed
  creditor identity (the same key the duplicate check uses). Index, balance, dates or a creditor name alone never
  match; a mask-only or name-only match stays qualified and is never merged; a different account (a legitimate
  transfer) does not match at all. Where several later accounts could match, or several earlier accounts could claim one later account, the entries stay QUALIFIED and are never merged (extended coverage).
- Absence in a later report alone never proves a correction, deletion, a bureau action or compliance, and that
  sentence is present in the same view.
- Read-only: no earlier fact, result or packet is changed. An unrelated approved packet is unchanged and still
  downloads after a comparison (asserted); material changes to a packet\'s own selection still require renewed
  approval through the existing packet gate.
- Ownership and the paid gate are enforced on both endpoints (another account → 403 and an empty history; unknown
  result → 404; reading your own history needs no purchase). No price, tier, live-billing or manual-entitlement
  change was introduced, and the one-time purchaser\'s assessment and packet are preserved.

**Validation.** `bz-report-history` (51 assertions) covers unchanged, changed, no-longer-observed, uncertain match
(mask-only), a different account, different bureau, missing field, out-of-order date, same date, one-to-many and many-to-one identity collisions, cross-account
refusal, the unentitled refusal and the packet regression. `bw-browser-wizzard` (31 assertions) drives the
history and comparison in the real browser. Full regression (clean state): **4376 assertions pass, 0 fail, 0 skip**.

**BLOCKER-SUBSCRIPTION-VALUE-001 status.** Implementation scope recorded: `build-subscription-value-evidence.cjs`
writes `out/subscription-value-evidence.json` with the source hashes, the behavioral tests that cover every
required criterion, and an explicit PENDING staging boundary. The release check now reports **Implementation:
IMPLEMENTED_AND_TESTED; staging: PENDING_VERIFICATION** — implementation closure is independent of a hosted
journey (OWNER-CLOSURE-001), and the production gate stays open until a current-release served build is measured.

**Matrix updated.** Section 5 records the subscriber-value behavior; section 6 updates the recommendation to
**BLOCKER-FINDING-COVERAGE-001** — substantive finding coverage for the 16 regions with no admitted finding adapter
(12 Canadian provinces/territories + the 4 GB nations).


## FRESH-EYES-REFACTOR-001 — verified completion (October 5, 2026)

Owner authority: “make it so” after CRP_FRESH_EYES_BUILD_ASSERTION_AUDIT_001.md. Implemented comparison uniqueness/collision safeguards; named Wizzard step contracts and repaired privacy/support/billing tests; active unified Issue packet eligibility tests and removal of the unused certainty-only gate; distinct own-case all-82 packet evidence; consolidated shared predicates; 23 historical source checks moved into an explicitly selected source-audit lane; meaningful catalog/wording/benign-alternative oracles; current source-bound execution evidence and standing verification lanes.

Measured current product regression: 4,376 passed, 0 failed, 0 skipped; all 77 sections completed; no source drift; all 149 recorded source hashes independently matched. Duration 165,177 ms (2m45s) versus audit 309,435 ms (5m9s), about 47% less elapsed time in these local runs. The 82 infrastructure contracts still execute 2,050 underlying behavioral predicates; all 82 actual upload-to-entitled-packet journeys remain. Historical source lane: 23/23. Real browser: 31/31, including repaired navigation and actual download.

The completed matching full run was reused from the shared workspace rather than repeating it; interrupted processes are not credited. Affected evidence refreshed through 14 generator/refresher operations; no remaining stale active implementation source pins were found. See CRP_FRESH_EYES_REFACTOR_COMPLETION_001.md, AUDIT_PRIME_DIRECTIVE_ASSERTIONS/refactor-verified-full.json and refactor-evidence-refresh.json. Standing instructions updated in CRP_OWNER_BATCH_EXECUTION_001.md and accelerated-launch/service/tests/README.md. Disclose this implemented source state at the next Cline handoff; do not repeat the refactor or full regression without a changed executable state or concrete unresolved concern.

Implementation and local browser: verified for this bounded refactor. Staging/production: unchanged and unverified. No broad core/launch blocker closed by reducing assertion totals; no legal admission/permission, billing, entitlement, provider, external transmission, deployment or legacy-corpus change.

## Implementation-evidence reconciliation batch — October 5, 2026

**Release check run from `accelerated-launch/service`; every open implementation gate reconciled.** Full record in
`CRP_IMPLEMENTATION_EVIDENCE_RECONCILIATION_001.md`.

- **Nine gates were open for STALE EVIDENCE, not missing implementation** (BLOCKER-CLARIFY-001,
  GAP-INGEST-003/007/008/009/010, GAP-FINDING-001/003/004). Their evidence files predated the shared
  implementation-closure block even though each already recorded every criterion as passed with real measured values
  and has a dedicated passing section. `SOURCE_CAPTURES/CLOSURE-POLICY-001/refresh-legacy-evidence-closure.cjs`
  translated that existing record into the shared format (identity + implementation + staging PENDING + a
  `reconciliation` block). No coverage was invented, no source or permission changed, and every source/test hash is
  real, so a later change re-opens the gate.
- **Implementation closure rose from 16 to 25 of 29 capability blockers.** All 33 release checks still FAIL: every
  capability blocker keeps `staging = PENDING_VERIFICATION`, and the four config/deployment gates are unmet.
  Implementation closure, browser/served verification, staging and production remain separate.
- **New evidence produced from existing passing behavioral coverage**: `out/all82-facilitation-evidence.json`
  (BLOCKER-ALL82-FACILITATION-001) and `out/dispute-packet-evidence.json` (BLOCKER-DISPUTE-PACKET-001), written by
  `closure-all82-facilitation.cjs` and `closure-dispute-packet.cjs`. Every required criterion is mapped to its actual
  test and source identity; each file leaves exactly ONE criterion explicitly open rather than asserting coverage
  for all 82 rows.
- **The four genuinely open implementation gates**: BLOCKER-FINDING-COVERAGE-001 (missing functionality — 16/82 rows),
  BLOCKER-ALL82-FACILITATION-001 (`applicable_assessment` for 66/82 rows; the journey itself is demonstrated for all
  82), BLOCKER-DISPUTE-PACKET-001 (`jurisdiction_content` under the 66 supported duties; the 16 rows are a recorded
  permission gap), and BLOCKER-FDT-001 (staging/benchmark-gated — two required criteria are `on_deployed`). The three
  substantive gates share the same 16 rows.
- **Ranked remaining core gaps** (matrix section 7): (1) the 16-row substantive rule path, (2) family-reader field
  coverage for AU/GB/TU-CA/US, (3) the fail-closed US-CA adverse-information rule, (4) served/staging verification and
  the four config/deployment gates. The Prime Directive leads; no certainty-only gate was restored and no obscure
  statute is proposed to raise a jurisdiction count.
- **Tests.** No executable source changed. The completed **4,376-assertion regression (0 failed, 0 skipped)** was
  reused. The closure scripts refuse to write unless the referenced section passed in `out/b2-evidence.json`.

## Four-outcome reconciliation and coverage-proposal batch — October 5, 2026

**The claim that the 16 missing statutory adapters cause all three promise blockers is corrected: they cause one.**
`CRP_NEXT_BATCH_COVERAGE_PROPOSAL_001.md` measures four outcomes separately (fictional reports only, one region per
market, one ordinary account whose printed opened date is later than its closed date):

- jurisdiction-specific statutory assessment: **66/82** rows (absent for the 12 Canadian provinces/territories and
  the 4 GB nations);
- supported potential/probable issue delivery: **82/82** rows - the six shared factual-verification potential issues
  are jurisdiction-agnostic;
- consumer-selected verification/correction packet delivery: **82/82** rows - CA-ON, CA-NS and GB-ENG each download a
  `Request (verification)` packet naming no citation, and AU-NSW additionally downloads a `Request (correction)`
  packet naming its recorded citation;
- jurisdiction-specific correspondence requirements: **none promised or owed** (the packet is a local
  consumer-review document; this service sends, mails, emails, submits and signs nothing).

**Precise remaining behavior per gate.** FINDING-COVERAGE-001: a supported substantive rule for the 12 Canadian and
4 GB rows. ALL82-FACILITATION-001: that rule path for the 12 Canadian rows, **plus a current-format intake artifact**
for the 4 GB rows - adding 16 statutory adapters alone does not close it. DISPUTE-PACKET-001: **nothing** - outcomes
3 and 4 are satisfied for all 82 rows, so `jurisdiction_content` is demonstrated (a factual verification request
needs no citation), the packet evidence is corrected and the packet implementation is now `IMPLEMENTED_AND_TESTED`.

**`CURRENT_GB_SUPPORT_IS_ESTABLISHED` corrected** to a current-format **intake-evidence** gap (a missing required
artifact for the GB family reader), distinct from a configuration, deployment, implementation or staging
requirement. GB intake is live through the general bureau-report path. The check keeps its GB scope, its
`blocks_launch` flag and its evidence framing, and still fails.

**Ranked next-batch proposal** (by consumer usefulness, demonstrated evidence and readiness - not jurisdiction
count): (1) a Canadian compliance rule on already-extracted facts (named candidates Ontario Consumer Reporting Act
R.S.O. 1990, Quebec, British Columbia, Alberta; ledger `CRP-LSRC-0321`); (2) ordinary-account field coverage on the
existing family readers; (3) current GB report intake (named source `CRP-LSRC-0407`, UK GDPR Articles 5(1)(d)/16 -
recorded and owner-accepted, so the missing piece is the artifact). Each candidate states its supported issue, its
uncertainty, the consumer-selected packet request, a positive case and a benign control.

**State.** Implementation closed **26** of 29 capability blockers; implementation open **3** (FDT-001 staging
/benchmark, FINDING-COVERAGE-001, ALL82-FACILITATION-001); staging verification pending 29; all 33 release checks
still fail.

**Tests.** One executable change (`release-check.cjs`: the GB check detail and rationale). Focused verification only:
`v-presentation-and-release` 110/110, `historical-gb-source` 8/8, `historical-legacy-source` 15/15. No other
executable source changed, so the completed 4,376-assertion regression was reused rather than re-run.

## Packet-correspondence, AU ordinary-field and Canadian-candidate batch — October 5, 2026

**The correspondence statement is corrected.** CRP does not transmit, but the CONSUMER sends the packet, so the
packet must carry the applicable correspondence and organized evidence references. See
`CRP_PACKET_CORRESPONDENCE_AND_CANDIDATE_001.md`.

**The actual downloaded packet was measured against the accepted specification** (reproduced: a CA-ON case, 1,439
bytes). It states the selected issue, the request wording, the printed facts with page/line and the report identity,
but it has **no recipient type, no place for the consumer-supplied correspondence details, and no organized
correspondence/evidence section**. `BLOCKER-DISPUTE-PACKET-001` implementation closure is therefore **corrected from
`IMPLEMENTED_AND_TESTED` to `OPEN`** for `packet_scope`, `consumer_review` and `usable_download`, while
`finding_evidence` and `jurisdiction_content` stay demonstrated (a factual verification request needs no citation).
No address, remedy, deadline or signature was invented.

**One concrete ordinary-account field improvement was implemented** on the Equifax Australia family reader: it now
reads the leading printed date of its own `Opened Date`/`Closed Date` value when the value carries the report
classification on the same printed line. The admitted PUB-012 sample prints `15 Nov 2013 Secured or Partially
Secured`, which previously yielded no date at all; nothing is inferred and the full printed value is retained as the
raw reading. Verified by the new `ca-au-ordinary-field` section (19 assertions): the real sample, a benign control,
the positive case through the real Issue -> Wizzard -> selected-packet path, the provenance and the downloaded
content.

**One Canadian compliance candidate was returned, not implemented**: `CRP-LSRC-0319` (PIPEDA, S.C. 2000, c. 5,
Schedule 1, clause 4.6 accuracy and clause 4.9), federal/`COUNTRY_WIDE_SOURCE`, trigger = the accuracy duty matched
to the report own self-contradiction (not a shared date field), uncertainty = which printed value is wrong is not
established so the issue stays PROBABLE, request = verify and correct. Its recorded dependencies (instrument class,
country-wide-to-region relation, register disposition) are stated rather than assumed; Ontario `CRP-LSRC-0362`
s. 9(3)(a) is a second candidate with no recorded provision text.

**Corrected state.** Implementation closed **25** of 29 capability blockers; implementation **open 4** (FDT-001,
FINDING-COVERAGE-001, ALL82-FACILITATION-001, DISPUTE-PACKET-001); staging verification pending 29; all 33 release
checks still fail.

**Tests.** Executable changes: the EQX AU family reader, `tests/run-tests.cjs` registration and the new
`ca-au-ordinary-field` section. Focused verification passed for `ca-au-ordinary-field` 19/19, `l-au-format-family`
85/85 and `m-au-journey` 103/103; the final full regression passed: **4395 assertions, 0 failed, 0 skipped** (previous 4376 + the new 19-assertion section), with no section failing.

**Operational note (next batch):** a full `run-tests.cjs` run rewrites `out/clarify-evidence.json` and
`out/common-errors-evidence.json` with its own built-in writers, which overwrite the OWNER-CLOSURE-001 implementation
blocks and re-open BLOCKER-CLARIFY-001 and BLOCKER-COMMON-ERRORS-001. Re-run
`SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-common-errors.cjs` and `refresh-legacy-evidence-closure.cjs` after any
full regression (this batch did, restoring implementation closed 25).

## OWNER-PACKET-CORRESPONDENCE-001 — the packet completed as the consumer's own correspondence (October 4, 2026)

**What the consumer gets now.** The correction packet was already a coherent, approved, entitled download, but it stopped
short of what the consumer actually needs to act on. It now (a) states the recipient by TYPE — "the consumer reporting
agency that issued this report" — because this service supplies no postal address and never invents one, (b) collects the
consumer's own correspondence details (name, a reply contact, an optional reference), keeps them on the packet row
SEPARATELY from the report facts and binds them into the approval, (c) states one request for each issue the consumer
SELECTED and nothing else, and (d) adds an organized evidence-reference section giving, for each selected issue, the report
and record identity, the printed readings, the normalized values, the available source locations and the recorded rule where
a statutory duty applies. The consumer reviews that correspondence and evidence in the Wizzard before approving.

**What it refuses to do.** No address, remedy, deadline, signature or submitted status is invented, and no legal-advice
disclaimer appears in the packet, the review or the download. A missing necessary detail refuses approval AND download
(`409 PACKET_CORRESPONDENCE_REQUIRED`) instead of producing an unusable document. Editing a detail after approval leaves the
packet unapproved and the download refused until reapproval; a re-evaluation marks the approval stale
(`409 PACKET_APPROVAL_STALE`); another account is refused 403 and an unpaid account 402. Sending stays the consumer's
decision: the document says so, and this service sends nothing.

**Corrected state.** `BLOCKER-DISPUTE-PACKET-001` moved to IMPLEMENTED_AND_TESTED. Implementation closed **26** of 29
capability blockers; implementation **open 3** (FDT-001, FINDING-COVERAGE-001, ALL82-FACILITATION-001); staging
verification pending 29; all 33 release checks still fail. The 16 rows without an admitted statutory duty remain
BLOCKER-FINDING-COVERAGE-001 and were not relabelled.

**Tests.** New `cb-packet-correspondence` section (84 assertions): potential verification, probable verification and
definite correction; partial selection; edited correspondence; a missing necessary detail; a stale approval; ownership and
entitlement refusals; the details never entering the persisted report; and readability and the absence of invented content
on the actual download. `bw-browser-wizzard` (44, real browser) and `bo-prime-directive-interaction` (23) exercise the same
path through the real UI. Final full regression: **4499 assertions, 0 failed, 0 skipped**.

**Operational note (supersedes the previous one).** The earlier note asking for the closure scripts to be re-run by hand
after a full regression is obsolete. A successful full regression now re-derives every closure record and the
subscription-value evidence builder from that same run (16 records in the last run), and a FAILED run restores nothing, so
no record can claim a pass the run did not demonstrate. Each record still re-hashes the sources it cites, which is why this
batch's own change to `app.cjs`, `ui/app.js` and `errors.cjs` correctly invalidated BLOCKER-BILLING-001,
BLOCKER-SUPPORT-001 and BLOCKER-SUBSCRIPTION-VALUE-001 before they closed again on re-derivation.


## OWNER-CA-ORDINARY-REPORT-001 — the first substantive Canadian ordinary-report issue (October 4, 2026)

**What the consumer now gets for an Ontario selection.** When a report prints an ordinary account whose opened
date is later than its closed date, the consumer is offered a **probable reporting issue** under the recorded
Ontario provision — Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a), admitted as source entry
`CRP-LSRC-0362` and recorded against the legacy atomic rule `ca-on.cra.s9_3_a.best_evidence_basis`, whose provision
now reads, from the located text: **a consumer reporting agency shall not include in a consumer report any credit
information based on evidence that is not the best evidence reasonably available**. The issue states the two printed
values, the recorded rule and the uncertainty, and it travels the same path as every other issue: select, review, the
consumer's own correspondence, approval, entitled download. The same printed conflict reaches the consumer **once**:
the shared factual observation is folded into this issue as a second supported base rather than offered as a second
card.

**What it deliberately does not say.** It is a **verification**, not a correction demand, and it is never an
established breach: the report shows that its own two values cannot both be right, but not which of them is
unreliable, nor whether a benign explanation (a later correction of one date, or an account reopened after
closure) applies. A reading that could not be made is never treated as an absent date, and an absent date is never
treated as compliance — a single printed date, an unresolvable date convention or a United States selection each
produce nothing rather than reassurance.

**How the candidate was chosen, once.** Of the admitted Canadian entries, only `CRP-LSRC-0362` had an exact
regional association, an owner-accepted instrument confirmed as a statute or regulation, and an established legacy
operational mapping. The country-wide PIPEDA candidate `CRP-LSRC-0319` still needs a recorded region relation and
an instrument-class confirmation, and the remaining Ontario IDs `CRP-LSRC-0363` to `CRP-LSRC-0372` still carry an
inconclusive instrument-class screen. They stay recorded and unimplemented; no broad inventory was repeated and no
disabled adapter was built to raise a count. The one implementation dependency the ledger named — the durable
per-ID rescreen disposition — is now recorded durably, together with the administrative limitations the ledger
retains.

**Correction (OWNER-CA-ORDINARY-REPORT-002, October 4, 2026).** The provision was retrieved or located and its
wording is now recorded in `SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json`: Consumer
Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a) — "any credit information based on evidence that is not the
best evidence reasonably available"; s. 9 is "Procedures of agencies", s. 9(2) "Information included in consumer
report", s. 9(3) "Idem". Publisher: Government of Ontario, e-Laws; applicable edition: the consolidation in force
(from July 1, 2026 to the e-Laws currency date; last amendment 2025, c. 24, Sched. 6, which amends s. 12(3) and not
s. 9). The provision supports the assessment, so the attribution and the statutory coverage claim are **kept** — with
the ceiling at PROBABLE and the specific uncertainty stated. Two things were corrected rather than left standing: the
recorded subject previously used an unrecorded gloss ("the most reliable evidence reasonably available") that is not
this provision's wording, and an earlier note said commencement did not matter because no arithmetic is performed.
Temporal applicability **does** matter to attribution for a content rule; it is simply a different question from
retention arithmetic, which this rule does not perform. No commencement date is claimed, and the absence — with the
absence of an authoritative full-page render of paragraph (a) in this environment — stays recorded as a limitation.

**Corrected state.** The substantive rule path now covers **67 of 82** regions (was 66). Implementation closed
**26** of 29 capability blockers; implementation **open 3** (`BLOCKER-FDT-001`, `BLOCKER-FINDING-COVERAGE-001`,
`BLOCKER-ALL82-FACILITATION-001`); staging verification pending 29; all 33 release checks still fail. The 15 rows
without a substantive rule are the 11 remaining Canadian provinces/territories and the 4 GB nations.

**Tests.** New `cc-ca-on-ordinary-report` section (88 assertions when first written; **120** after this correction):
the recorded candidate row and its one outstanding item, the recorded provision with its wording, edition, publisher
and retrieval limitation, the configured rule and its ceiling, the complete journey with the recorded rule and both
printed readings in the downloaded packet, the single issue carrying both supported bases, the duplicate factual card
suppressed, and five benign controls. Two assertions that encoded the previous no-Ontario-adapter state were updated
to assert the new state precisely, and `bx-all82-factual-verification` now locates the factual base where a region's
own issue carries it, so no region is skipped and the all-82 count still reads 82. Focused verification after this
correction: the affected sections plus the all-82 and packet sections (`cc-ca-on-ordinary-report`, `n-applicability`,
`bx-all82-factual-verification`, `i-shared-regressions`, `al-common-errors`, `by-packet-reconciliation`,
`cb-packet-correspondence`, `r-ca-factual-assessment`, `bt-ordinary-field-coverage`, `av-consumer-results`,
`bm-prime-directive-batch1`, `bs-prime-directive-delivery`), 0 failed. Final full regression: **4,623 assertions, 0
failed, 0 skipped**, which re-derives all 16 closure records from its own run (the retrieval record is now among the
hashed evidence references of `closure-all82-facilitation.cjs`).

**Served surface.** Ontario's availability row now names one recorded rule comparison alongside its four factual
observations, and the aggregate moved with it. The fictional-fixture journey is not counted as real-evidence
performance, so no real-evidence figure was inflated, and the ledgers keep implementation, staging and production
statuses separate.

