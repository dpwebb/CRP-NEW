# CRP-DISC-002C-NY-0194 — New York Medical-Debt Content Candidate

**Record type:** Source-discovery candidate; not a governed legal rule and not a consumer finding.  
**Assessment basis:** PHASE4-002E-R1, PHASE4-002F, PHASE4-002G, and owner decision PHASE4-002H.  
**Status:** `PROBABLE_CANDIDATE` only. This record does not establish a violation or independently certify the statute's construction.

## Source and provenance

| Field | Value |
|---|---|
| `DISCOVERY_ID` | `CRP-DISC-002C-NY-0194` |
| `COUNTRY_CODE` / `REGION_CODE` | `US` / `US-NY` |
| `OFFICIAL_PUBLISHER` | New York State Senate — OpenLegislation (as recorded in the admitted catalogue) |
| `INSTRUMENT_TITLE` | Fair Credit Reporting Act (New York), N.Y. Gen. Bus. Law art. 25, §§ 380–380-v |
| `CITATION` | N.Y. Gen. Bus. Law § 380-j(a)(3); incorporated definition at § 380-a(v) |
| `OFFICIAL_LOCATION` | <https://www.nysenate.gov/legislation/laws/GBS/> |
| `APPLICABILITY_STATUS` | `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` |
| `APPLICABILITY_BASIS` | The admitted baseline records an outcome-relevant question under 15 U.S.C. § 1681t(b)(1)(E), status `uncertain_not_decided`, and retains the state provision rather than suppressing it. No preemption conclusion is made here. |
| `APPLICABILITY_QUALIFICATION` | New York's rule may apply, but whether 15 U.S.C. § 1681t(b)(1)(E) displaces it remains unresolved. This record does not decide enforceability or preemption. |
| `SOURCE_VERSION` | Digest-bound admitted baseline snapshot: `packages/backend/src/services/legalCorpus/rules.ny.ts`, SHA-256 `201F5035084F60C92B03E0140E32702ED72E79AD2CEE31405977E05525133590`; source-recorded verification date `2026-09-26`. Formal statutory publication/consolidation/amendment edition: `NOT RECORDED`. The digest identifies the snapshot, not a statutory edition. |
| `RETRIEVED_AT_UTC` | `NOT RECORDED` |
| `LEGACY_SOURCE_DATE_ONLY` | `2026-09-26` (date-only provenance; not a UTC retrieval timestamp) |
| `EFFECTIVE_FROM` / `EFFECTIVE_TO` | `UNRESOLVED` / `UNRESOLVED` (`effectiveFrom=null`, `effectiveTo=null` in admitted catalogue; no open-ended status asserted) |
| `TEMPORAL_STATUS` | `CURRENT_SOURCE_DATE_ONLY` — the admitted baseline records the provision as in force at its date-only verification point; the historical effective period is not established. |

## Rule text and report-only assessment

**Admitted baseline text** (`rules.ny.ts`, row `us-ny.gbl.380j.a.3.medical_debt_prohibited`; digest above):

> No consumer reporting agency shall report or maintain in the file on a consumer information relative to a medical debt as defined in § 380-a(v) — any obligation or alleged obligation of a consumer to pay any amount related to the receipt of health care services, products or devices provided by a hospital licensed under public health law article 28, a health care professional authorised under education law title 8, or an ambulance service certified under public health law article 30, excluding debt charged to a credit card unless the card is issued under a plan offered specifically for the payment of health care.

The incorporated definition includes both an obligation and an **alleged obligation**, the stated healthcare-service/product/device and provider categories, and the credit-card carve-out.

| Field | Assessment |
|---|---|
| `EVIDENCE_TEXT` | The quoted admitted-baseline text above. It is carried forward from the digest-bound snapshot; it was not freshly retrieved. |
| `REPORT_REPRESENTATION` | The explicit report label or description by which the bureau identifies the item as medical debt. This establishes what the bureau represented in the report. Do not infer medical debt solely from a furnisher/provider name, statistical proxy, or absent field. |
| `DECISIVE_HISTORICAL_FACTS` | `[]`. Under owner decision PHASE4-002H, an explicit bureau label/description establishes the representation for report-only candidate classification; the consumer need not prove actual medical origin before the issue can be surfaced as probable. This is a product classification rule, not a conclusion that the underlying debt legally qualifies or that a court has resolved the statute's scope. |
| `OFF_REPORT_PREREQUISITES` | `[]`. No consumer proof of transaction, provider, service, product, device, debt validity, or actual medical origin is required for this probable candidate. |
| `UNRESOLVED_EXCEPTIONS` | The § 380-a(v) credit-card carve-out: whether the debt was charged to a credit card and whether that card was issued under a plan offered specifically for healthcare. If the uploaded report does not establish whether it applies, retain it as unresolved; its unknown status does not suppress the candidate. If the report affirmatively establishes that the carve-out applies, the item is not a candidate under this rule. |
| `SOURCE_STATUS` | `PROBABLE_CANDIDATE` |
| `EXCLUSION_REASON` | Not applicable at this status. |

## Candidate-gate result and consumer qualification

The explicit label/description supplies the report representation without inference. The unknown credit-card carve-out is handled as an unresolved express exception and not as an off-report prerequisite. Under PHASE4-002H, the underlying-origin truth is not a decisive historical fact for this report-only candidate.

The record cannot be a `CONFIRMED_CANDIDATE`: the effective period is unresolved and applicability/preemption remains undecided. Its ceiling is `PROBABLE_CANDIDATE`; it is not a `PROBABLE_VIOLATION`, `VIOLATION`, or finding. A later governed rule, if admitted, must preserve a plain-English timing qualification and the unresolved federal-applicability caveat.

**Consumer-facing qualification if later used:** The bureau's report labels or describes this as medical debt, which may raise an issue under New York law. The source snapshot records the rule as in force on a date-only verification date, but does not establish its full effective period; whether federal law displaces the New York rule is also unresolved. The report does not establish whether the credit-card exception applies. This is a possible issue, not a legal determination.

## Provenance and limits

- This is a report-only product classification decision under PHASE4-002H, not a judicial resolution of statutory scope and not a statement that the debt legally qualifies as medical debt.
- Preemption uncertainty is separate from the credit-card statutory carve-out.
- The admitted global catalogue entry is `CRP-LSRC-0194` and remains source-only; this discovery record does not amend that catalogue or create a governed rule, jurisdiction coverage, or finding.
- No fresh network retrieval is represented by this record. `RETRIEVED_AT_UTC` remains `NOT RECORDED`; the date-only legacy provenance is not a retrieval timestamp.
