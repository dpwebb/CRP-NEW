# CRP Finding Candidate 005 — California paid-tax-lien obsolescence (§ 1785.13(a)(4))

**Status:** ENABLED — `finding_allowed: true`, ceiling `violation`, `packet_eligible: false`.
**Batch authority:** Architect directive "Select the next common-report outcome … complete a bounded useful batch"
(2026-10-04), with the owner prioritization clarification in CRP_OWNER_BATCH_EXECUTION_001.md (select for demonstrated
relevance to ordinary supported credit reports, not merely ease).

## 1. Admission

| Field | Value |
| --- | --- |
| `adapter_id` | `US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y` |
| `legacy_rule_id` | `us.ca.tax_lien_paid.7y` |
| `source_entry_id` | `CRP-LSRC-0264` |
| `citation` | Consumer Credit Reporting Agencies Act (California), Civ. Code § 1785.13(a)(4) |
| `source_artifact` | `packages/backend/src/services/legalCorpus/rules.ca.ts` |
| `source_version` | `7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80` |
| `jurisdiction` | US / US-CA (exact) |
| `anchor_mode` | `SINGLE_FIELD`; anchor `publicRecord.taxLienPaidDate`; period 7 years |
| `presentation` | `US-CONSUMER-DISCLOSURE` + `GENERAL-BUREAU-REPORT` |

**Source-provenance reconciliation:** CRP-LSRC-0264 is recorded in the global catalogue under the legacy
California legal-rule corpus `packages/backend/src/services/legalCorpus/rules.ca.ts` (SHA-256
`7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80`), which the legacy-corpus admission contract
lists as the admitted "Legal-rule corpus" California file. The US-CA bankruptcy rule (CRP-LSRC-0171,
§ 1785.13(a)(1)) is separately recorded under the digest-bound declarative file `legalRules.ts`
(`FE5C1BA6…`). Both are admitted California sources; this rule binds to the identity its own catalogue row
records (`rules.ca.ts`, `7DDBF5C4`), corrected from the earlier copy of the bankruptcy rule's identity.

## 2. Predicates, exceptions and effective period

**Official text** (retrieved 2026-10-04 from leginfo.legislature.ca.gov, Civ. Code § 1785.13, chapter-amended
"Amended by Stats. 2024, Ch. 520, Sec. 2. (SB 1061) Effective January 1, 2025."):
> (4) Paid tax liens that, from the date of payment, antedate the report by more than seven years.

**Effective period:** the corpus records `status=in_force; effectiveFrom=null; effectiveTo=null` (the
recorded-gap publication basis did not record the period's dates). The official consolidation page states the
section is amended by Stats. 2024, Ch. 520 (SB 1061), effective January 1, 2025. The paid-tax-lien limb (a)(4) is
substantively unchanged by SB 1061 (which primarily removed the (a)(7) medical-debt reporting restriction); the
seven-year-from-payment period is applied, and the in-force status is recorded without a fabricated effective date.

**Decisive report-determinable predicate:** a public record prints a clearly labelled tax-lien "Date Paid"; the
check compares it against the report's own reference date. A filing date is never substituted.

**Exceptions:** none recorded. Unlike § 1785.13(a)(2) (suits/judgments — "or until the governing statute of
limitations has expired, whichever is longer"), (a)(4) has no statute-of-limitations alternative.

## 3. Relevance (owner prioritization)

- **Report fields/structures:** the captured United States consumer-disclosure artifact (PUB-001) and the shared
  GENERAL-BUREAU-REPORT intake already demonstrate the tax-lien "Date Paid" public-record field; the same
  `publicRecord.taxLienPaidDate` extraction serves the FCRA and US-NY tax-lien rules.
- **Correction benefit:** the supported benefit is identifying stale adverse information — a paid tax lien retained
  beyond the statutory seven-year period is an item that should no longer appear, so the consumer can act to correct
  it. No score impact or prevalence is claimed; recorded format support establishes implementability, not current
  prevalence, which is **unmeasured**.
- **Why it outranks adjacent work:** it reuses the demonstrated US-CA public-record machinery and has no off-report
  exception, unlike § 1785.13(a)(2) (SOL alternative) or the federal § 1681c(b)-blocked limbs.

## 4. Measured controls (finding-level)

- **Positive (finding):** a paid tax lien "Date Paid" > 7 years before the reference date → internal **VIOLATION**
  bound to the corrected source digest, and the consumer result carries `consumer_label: "Reporting issue"` plus the
  payment-date source evidence.
- **Negative / boundary:** a "Date Paid" within 7 years and the exact 7-year boundary → `PERIOD_NOT_EXCEEDED`,
  no finding.
- **Uncertainty / evidence gates:** no payment date, a filing-only date (unpaid lien), and a mismatched source
  value each yield no unsupported finding.
- **End-to-end:** a fictional US-CA report with a paid tax lien uploads → evaluates → a "Reporting issue" finding in
  the Wizard, carrying the rule/source identity and payment-date evidence. Covered by `bi-us-ca-tax-lien` (17
  assertions) and the `ad-legal-event-facts` arithmetic assertions; the `p-us-consumer-format` /
  `q-record-applicability` availability counts reflect the added limb (5 → 6 unavailable, 8 → 9 accounted).
