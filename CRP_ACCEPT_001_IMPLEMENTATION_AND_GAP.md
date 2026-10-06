# ACCEPT-001 — Core consumer promise: measured implementation and gap

Owner authorization: `CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md` as the checklist. This records the reconciled evidence, the complete implementation gap, the finding-permission dependency, and the measured results for the four connected statutory checks.

## 1. B6-004 evidence reconciliation

- **Benchmark totals.** The register was prepared against build `crp-wizard-4b372a4858b87997` (B6-INGEST-003) and cited "4,777 assertions". The current measured regression is **4,808 assertions, 0 failed, 0 skipped** (build `crp-wizard-491f86ed65f174db`); the ingestion benchmark grew from 7 to **9 fixtures**. The earlier totals were the then-current build's numbers, not errors; this register records the current build's numbers.
- **Discharge-date contradiction.** B6-INGEST-003's check-field matrix said the bankruptcy checks are withheld because "no canonical report field carries the discharge date"; B6-INGEST-004 then added a printed "Discharged" date reading. Reconciliation: a printed "Discharged"/"Discharge" date is a **general public-record fact** (kept in `printed`), not a legal anchor. The bankruptcy checks are `NOT_REPORT_EVIDENCED` because their recorded start is the **legal event** of discharge / order for relief, which a printed date does not establish without a legal determination the owner has not authorized. The code documents this and sets no `facts` anchor for the discharge date. No historical evidence was regenerated.

## 2. Complete implementation gap (item 3)

The owner-accepted legacy corpus is classified in `accelerated-launch/adapters/rule-adapter-catalog.json`:

| Class | Count | Meaning |
| --- | --- | --- |
| EXECUTABLE_RULE_CANDIDATE | 27 | retention-period rules that are period-comparable in principle |
| CONTENT_RULE_NOT_PERIOD_EXECUTABLE | 228 | accuracy/duty/content rules — not a simple date comparison |
| AUTHORITY / CITATION / LIMITATION / GAP / REFUSAL | 27/23/111/18/3 | authority and supporting records, not executable checks |

Implemented adapters: **14**, of which **5 are `SINGLE_FIELD`** (a comparison can run) and **9 are `NOT_REPORT_EVIDENCED`** (legal-event start). Of the five:

| Check | Jurisdiction | Required fact | Ceiling | On general intake |
| --- | --- | --- | --- | --- |
| CA-NS-CRA-S10-3-C-LIMB-1 (6y) | CA-NS (exact) | `tradeline.lastPaymentDate` | observation | withheld — exact-specimen PR-01 (genuine restriction, preserved) |
| FCRA-605A-5-US-NATIONAL-7Y (7y) | US | `reportedAccount.adverseRatingDate` | observation | **connected** |
| AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y | AU | `liability.closedDate` | observation | **connected** |
| AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y | AU | `enquiry.date` | observation | **connected** |
| AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y | AU | `overdue.originalListingDate` | observation | **connected** |

The nine `NOT_REPORT_EVIDENCED` limbs (CA-NS bankruptcy; FCRA bankruptcy/judgment/tax-lien/collection; US-NY judgment/tax-lien/bankruptcy; US-CA bankruptcy) are withheld because their start is a legal event, not a printed field; connecting them would reopen legal provenance. The 228 content rules are out of scope for the shared elapsed-period engine and remain unimplemented, not hidden behind a count.

**Per-jurisdiction coverage.** Every one of the 82 regions runs the two general report-fact consistency checks on a general report; the four statutory comparisons run only for their recorded jurisdiction. GB has **no** accepted statutory rule (its relation is guidance), so GB coverage is factual/policy observation only. No all-82 statutory coverage is claimed.

## 3. Finding permissions (item 5)

Governing clauses preventing VIOLATION / PROBABLE_VIOLATION:

- `CRP_LEGAL_INVARIANT.md` §1 — four conjunctive requirements: consumer-selected jurisdiction, applicable governed rule, reliable facts, deterministic evaluation. §2.5 — VIOLATION needs every report-determinable fact reliably resolved plus deterministic breach; PROBABLE_VIOLATION needs strong deterministic evidence plus decisive facts genuinely unavailable from the report.
- `adapter-configs.json` `output_permission.finding_allowed: false`, `max_conclusion: observation` on every adapter; `rule-adapters.cjs` `emitFinding()` refuses unconditionally.

## 4. Measured results for the four connected checks (item 2)

`node accelerated-launch/service/tests/run-tests.cjs` → **4,808 assertions passed, 0 failed, 0 skipped**. The new `ab-acceptance-statutory` section demonstrates, for each of the four checks: the period exceeded, the period not exceeded, a missing/ambiguous fact, and the same fact in a different layout; the full consumer journey (upload → extraction → assessment) is exercised over HTTP for the FCRA adverse case. The same positive/negative results are verified on the deployed Linux build (see the acceptance register update).

- `constants.cjs` `PRESERVED_CLASSIFICATION` (legacy D3 → `observation`), preserved by the owner.

No elapsed-period comparison may be relabelled a finding. The change needs an owner amendment to `output_permission` and `emitFinding`, not a label change. Proposed owner wording (before → after) for review:

- Before: `"max_conclusion": "observation", "finding_allowed": false`
- After: `"max_conclusion": "probable_violation", "finding_allowed": true` — only for named single-field retention checks whose four requirements are demonstrably met, and only after the owner records that the elapsed-period comparison is a permitted conclusion for that specific check.

Until that amendment, every output stays `observation`; this batch does not convert observations into findings.
