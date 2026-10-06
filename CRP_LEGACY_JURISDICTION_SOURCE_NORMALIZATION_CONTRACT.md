# CRP Legacy Jurisdiction Source-Normalization Contract

**Status:** Approved Corpus Contract — Rank 4  
**Normalization version:** `CRP-LEGACY-JURISDICTION-NORMALIZATION-1`  
**Effective date:** 2026-09-29

This contract normalizes legacy legal-source identifiers into the canonical jurisdiction vocabulary
defined by `CRP-JURISDICTION-ENUM-1`. It is source-ingestion metadata only and never changes the
consumer-selected `COUNTRY` + `REGION`.

## 1. Canonical Boundary

The sole canonical country and region codes are those in `CRP-JURISDICTION-ENUM-1`.

Legacy source tokens are not valid consumer selectors. No free-text conversion, alias lookup, runtime
fallback, or jurisdiction inference is authorized by this contract.

`CRP-JURISDICTION-ENUM-1` enumerates exactly 82 eligible first-level region records — 13 under `CA`,
57 under `US`, 4 under `GB` and 8 under `AU` — and §3 carries exactly one row for each of them, in
that enumeration's canonical order.

## 2. Country-Wide Source Descriptors

| Legacy source token | Meaning | Canonical-region result |
| --- | --- | --- |
| `US` | United States country-wide source descriptor | No region assigned. |
| `US_FEDERAL` | United States federal source descriptor | No region assigned. |
| `FEDERAL` | Country-scoped federal source descriptor | No region assigned. |
| `CA` | Canada country-wide source descriptor | No region assigned. |
| `CA-FEDERAL` | Canada federal source descriptor | No region assigned. |
| `AU` | Australia country-wide source descriptor | No region assigned. |
| `UK` | United Kingdom country-wide source descriptor | No region assigned. |

A country-wide source may be attached to a selected region only by a later explicit governed-rule
record that states that relationship. No federal pseudo-region exists.

## 3. Exact Legacy Source-Token Mappings

The table carries exactly 82 rows, one for every canonical region in `CRP-JURISDICTION-ENUM-1`, in the
enumeration's canonical order. Each row records the exact legacy source token or tokens that reach that
region and the exact canonical result of normalizing each one. Registry abbreviations used below are
defined in the table notes that follow the table.

| Canonical country code | Canonical region code | Legacy source token or tokens | Normalization status | Legacy-source state |
| --- | --- | --- | --- | --- |
| `CA` | `CA-AB` | `CA-AB` (exact; `SOL` x1; `PROV`); `AB` -> `CA-AB` (bare; `CIT`, scope `CA`); `AB` -> `CA-AB` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-BC` | `CA-BC` (exact; `SOL` x1; `PROV`); `BC` -> `CA-BC` (bare; `CIT`, scope `CA`); `BC` -> `CA-BC` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-MB` | `CA-MB` (exact; `SOL` x1; `PROV`); `MB` -> `CA-MB` (bare; `CIT`, scope `CA`); `MB` -> `CA-MB` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-NB` | `CA-NB` (exact; `SOL` x1; `PROV`); `NB` -> `CA-NB` (bare; `CIT`, scope `CA`); `NB` -> `CA-NB` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-NL` | `CA-NL` (exact; `SOL` x1; `PROV`); `NL` -> `CA-NL` (bare; `CIT`, scope `CA`); `NL` -> `CA-NL` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-NS` | `CA-NS` (exact; `PROV`; `REF`); `NS` -> `CA-NS` (bare; `CIT`, scope `CA`); `CANADA_NOVA_SCOTIA` -> `CA-NS` (owner-approved named token); `NS` -> `CA-NS` (bare; `SEL-CA`, scope `CA`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_REFUSAL` |
| `CA` | `CA-NT` | `CA-NT` (exact; `SOL` x1; `PROV`); `NT` -> `CA-NT` (bare; `CIT`, scope `CA`); `NT` -> `CA-NT` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-NU` | `CA-NU` (exact; `SOL` x1; `PROV`); `NU` -> `CA-NU` (bare; `CIT`, scope `CA`); `NU` -> `CA-NU` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-ON` | `CA-ON` (exact; `PROV`; `REF`); `ON` -> `CA-ON` (bare; `CIT`, scope `CA`); `CANADA_ONTARIO` -> `CA-ON` (owner-approved named token); `ON` -> `CA-ON` (bare; `SEL-CA`, scope `CA`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_REFUSAL` |
| `CA` | `CA-PE` | `CA-PE` (exact; `SOL` x1; `PROV`); `PE` -> `CA-PE` (bare; `CIT`, scope `CA`); `PE` -> `CA-PE` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-QC` | `CA-QC` (exact; `PROV`; `REF`); `QC` -> `CA-QC` (bare; `CIT`, scope `CA`); `QC` -> `CA-QC` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_REFUSAL` |
| `CA` | `CA-SK` | `CA-SK` (exact; `SOL` x1; `PROV`); `SK` -> `CA-SK` (bare; `CIT`, scope `CA`); `SK` -> `CA-SK` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `CA` | `CA-YT` | `CA-YT` (exact; `SOL` x1; `PROV`); `YT` -> `CA-YT` (bare; `CIT`, scope `CA`); `YT` -> `CA-YT` (bare; `SEL-CA`, scope `CA`) | `CONTEXT_SCOPED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |

| `US` | `US-AK` | `US-AK` (exact; `SOL` x1); `AK` -> `US-AK` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-AL` | `US-AL` (exact; `SOL` x3); `AL` -> `US-AL` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-AR` | `US-AR` (exact; `SOL` x3); `AR` -> `US-AR` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-AS` | `US-AS` (exact; `SOL` x2); `AS` -> `US-AS` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-AZ` | `US-AZ` (exact; `SOL` x1); `AZ` -> `US-AZ` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-CA` | `US-CA` (exact; `SOL` x2); `CA` -> `US-CA` (bare; `USO`, scope `US`); `CA` -> `US-CA` (bare; `JENF`, scope `US`); `US_CALIFORNIA` -> `US-CA` (owner-approved named token); `CA` -> `US-CA` (bare; `SEL-US`, scope `US`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-CO` | `US-CO` (exact; `SOL` x1); `CO` -> `US-CO` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-CT` | `US-CT` (exact; `SOL` x1); `CT` -> `US-CT` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-DC` | `US-DC` (exact; `SOL` x1); `DC` -> `US-DC` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-DE` | `US-DE` (exact; `SOL` x2); `DE` -> `US-DE` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-FL` | `US-FL` (exact; `SOL` x2); `FL` -> `US-FL` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-GA` | `US-GA` (exact; `SOL` x2); `GA` -> `US-GA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-GU` | `US-GU` (exact; `SOL` x1); `GU` -> `US-GU` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-HI` | `US-HI` (exact; `SOL` x1); `HI` -> `US-HI` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-IA` | `US-IA` (exact; `SOL` x2); `IA` -> `US-IA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-ID` | `US-ID` (exact; `SOL` x2); `ID` -> `US-ID` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-IL` | `US-IL` (exact; `SOL` x2); `IL` -> `US-IL` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-IN` | `US-IN` (exact; `SOL` x1); `IN` -> `US-IN` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-KS` | `US-KS` (exact; `SOL` x2); `KS` -> `US-KS` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-KY` | `US-KY` (exact; `SOL` x2); `KY` -> `US-KY` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-LA` | `US-LA` (exact; `SOL` x3); `LA` -> `US-LA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MA` | `US-MA` (exact; `SOL` x1); `MA` -> `US-MA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MD` | `US-MD` (exact; `SOL` x1); `MD` -> `US-MD` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-ME` | `US-ME` (exact; `SOL` x1); `ME` -> `US-ME` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MI` | `US-MI` (exact; `SOL` x2); `MI` -> `US-MI` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MN` | `US-MN` (exact; `SOL` x1); `MN` -> `US-MN` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MO` | `US-MO` (exact; `SOL` x2); `MO` -> `US-MO` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MP` | `US-MP` (exact; `SOL` x1); `MP` -> `US-MP` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MS` | `US-MS` (exact; `SOL` x1); `MS` -> `US-MS` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-MT` | `US-MT` (exact; `SOL` x2); `MT` -> `US-MT` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |

| `US` | `US-NC` | `US-NC` (exact; `SOL` x1); `NC` -> `US-NC` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-ND` | `US-ND` (exact; `SOL` x1); `ND` -> `US-ND` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NE` | `US-NE` (exact; `SOL` x2); `NE` -> `US-NE` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NH` | `US-NH` (exact; `SOL` x1); `NH` -> `US-NH` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NJ` | `US-NJ` (exact; `SOL` x1); `NJ` -> `US-NJ` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NM` | `US-NM` (exact; `SOL` x3); `NM` -> `US-NM` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NV` | `US-NV` (exact; `SOL` x2); `NV` -> `US-NV` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-NY` | `US-NY` (exact; `SOL` x2); `NY` -> `US-NY` (bare; `USO`, scope `US`); `US_NEW_YORK` -> `US-NY` (owner-approved named token); `NY` -> `US-NY` (bare; `SEL-US`, scope `US`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-OH` | `US-OH` (exact; `SOL` x1); `OH` -> `US-OH` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-OK` | `US-OK` (exact; `SOL` x2); `OK` -> `US-OK` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-OR` | `US-OR` (exact; `SOL` x1); `OR` -> `US-OR` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-PA` | `US-PA` (exact; `SOL` x1); `PA` -> `US-PA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-PR` | `US-PR` (exact; `SOL` x1); `PR` -> `US-PR` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-RI` | `US-RI` (exact; `SOL` x1); `RI` -> `US-RI` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-SC` | `US-SC` (exact; `SOL` x1); `SC` -> `US-SC` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-SD` | `US-SD` (exact; `SOL` x1); `SD` -> `US-SD` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-TN` | `US-TN` (exact; `SOL` x1); `TN` -> `US-TN` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-TX` | `US-TX` (exact; `SOL` x1); `TX` -> `US-TX` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |

| `US` | `US-UM` | none — no legacy source token exists for this region in the admitted artifacts, and none is invented | `NO_LEGACY_SOURCE_ENTRY` | `NO_LEGACY_SOURCE_ENTRY` |
| `US` | `US-UT` | `US-UT` (exact; `SOL` x2); `UT` -> `US-UT` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-VA` | `US-VA` (exact; `SOL` x2); `VA` -> `US-VA` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-VI` | `US-VI` (exact; `SOL` x1); `VI` -> `US-VI` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-VT` | `US-VT` (exact; `SOL` x2); `VT` -> `US-VT` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-WA` | `US-WA` (exact; `SOL` x1); `US_WASHINGTON` -> `US-WA` (owner-approved named token); `WA` -> `US-WA` (bare; `SEL-US`, scope `US`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-WI` | `US-WI` (exact; `SOL` x1); `WI` -> `US-WI` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-WV` | `US-WV` (exact; `SOL` x2); `WV` -> `US-WV` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `US` | `US-WY` | `US-WY` (exact; `SOL` x2); `WY` -> `US-WY` (bare; `SEL-US`, scope `US`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |

| `GB` | `GB-ENG` | `UK-ENG` -> `GB-ENG` (owner-approved `UK-*` to `GB-*` mapping; `SOL` x2); `ENG` -> `GB-ENG` (bare; `SEL-UK`, scope `UK`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `GB` | `GB-NIR` | `UK-NIR` -> `GB-NIR` (owner-approved `UK-*` to `GB-*` mapping; `SOL` x1); `NIR` -> `GB-NIR` (bare; `SEL-UK`, scope `UK`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `GB` | `GB-SCT` | `UK-SCT` -> `GB-SCT` (owner-approved `UK-*` to `GB-*` mapping; `SOL` x1); `SCT` -> `GB-SCT` (bare; `SEL-UK`, scope `UK`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `GB` | `GB-WLS` | `UK-WLS` -> `GB-WLS` (owner-approved `UK-*` to `GB-*` mapping; `SOL` x2); `WLS` -> `GB-WLS` (bare; `SEL-UK`, scope `UK`) | `OWNER_APPROVED_SOURCE_MAPPING` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-ACT` | `AU-ACT` (exact; `SOL` x1); `ACT` -> `AU-ACT` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-NSW` | `AU-NSW` (exact; `SOL` x1); `NSW` -> `AU-NSW` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-NT` | `AU-NT` (exact; `SOL` x1); `NT` -> `AU-NT` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-QLD` | `AU-QLD` (exact; `SOL` x1); `QLD` -> `AU-QLD` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-SA` | `AU-SA` (exact; `SOL` x1); `SA` -> `AU-SA` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-TAS` | `AU-TAS` (exact; `SOL` x1); `TAS` -> `AU-TAS` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-VIC` | `AU-VIC` (exact; `SOL` x1); `VIC` -> `AU-VIC` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |
| `AU` | `AU-WA` | `AU-WA` (exact; `SOL` x1); `WA` -> `AU-WA` (bare; `SEL-AU`, scope `AU`) | `EXACT_SOURCE_FORM` | `SOURCE_RECORD_PRESENT` |

**Table notes.**

*Registry abbreviations.* Every abbreviation names an admitted static declaration of the 34
digest-bound legacy artifacts listed in `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` §2.

| Abbreviation | Admitted declaration | Country scope declared by that registry |
| --- | --- | --- |
| `SOL` | `solTable.ts` — `SOL_ROWS` limitation records | The row's own exact composite `CC-XX` token. |
| `USO` | `legalRules.ts` — `US_STATE_RULES` | `US`: its keys are the READ US state-overlay records for a `US-<state>` token. |
| `JENF` | `solTable.ts` — `JUDGMENT_ENFORCEMENT` | `US`: US state judgment-enforcement records; the single record's own instrument names its region. |
| `PROV` | `legalRules.ts` — `PROVINCE_INSTRUMENTS` (13 exact `CA-*` keys) and `PROVINCE_CONTENT_RULES` (5 exact `CA-*` keys) | `CA`, by exact composite key. |
| `REF` | `solTable.ts` — `SOL_REFUSED_UNITS` (3 exact `CA-*` keys) | `CA`, by exact composite key. |
| `CIT` | `citations_registry.ts` — `CA_UNITS`; `citations.json` — `by_jurisdiction`; `docs\citation-objects.tsv` — `jurisdiction` column | `CA`: the Canadian provincial unit list (`FEDERAL` in the same column is a country-scoped descriptor of §2). |
| `SEL-<CC>` | `subJurisdictions.ts` — `SUB_JURISDICTIONS[<CC>]` | The map key `<CC>`: a declared-scope selection vocabulary only. It is not a source record and, per §1, never a consumer selector. |
| `GAPSCOPE` | `solTable.ts` — `SOL_GAPS`; `legalRules.ts` — `UNVERIFIED_GAPS` | Declared in each record's own text (see the descriptor note below). |

*Normalization status.* Each row carries exactly one value: the strongest action required by that
region's source-record tokens (`SOL`, `USO`, `JENF`, `PROV`, `REF`, `CIT`, `GAPSCOPE`). Precedence is
`NO_LEGACY_SOURCE_ENTRY` > `OWNER_APPROVED_SOURCE_MAPPING` > `CONTEXT_SCOPED_SOURCE_MAPPING` >
`EXACT_SOURCE_FORM`. A `SEL-<CC>` entry records a declared-scope vocabulary mapping; being neither a
source record nor a selector (§1), it does not raise a row's status.

*Legacy-source state.* `SOURCE_RECORD_GAP` and `SOURCE_RECORD_UNMAPPED` are carried by zero rows: no
admitted region token fails to normalize under this contract, and every admitted gap record is
scope-descriptive rather than a region's sole record. Those two values are therefore unused rather than
satisfied by inference.

*Country-scope and region-scope descriptors that are not region rows.* `US-*`, `CA-*`, `AU-*` and `UK`
(`SOL_GAPS`, 4 records) and the 10 records of `UNVERIFIED_GAPS`, whose own text declares its scope
(`AU`; `UK`; `Canada` ×4; `United States` ×2; `Australia`; `Canada / United Kingdom`;
`Prince Edward Island`). The `Prince Edward Island` record is region-scoped, but it is a recorded gap
on a province that already holds its own limitation record, so `CA-PE` remains
`SOURCE_RECORD_PRESENT`. Also observed and recorded with no region attached: the US federal corpus
token `US-FEDERAL` and the Canadian federal authority-id prefix `ca-federal`, both country-scoped
forms of the §2 descriptors `US_FEDERAL` and `CA-FEDERAL`.

*Bare-token collisions.* The bare tokens `CA`, `NT`, `WA` and `SA` occur inside more than one declared
scope, and each is normalized only by the containing registry's declared scope: `CA` (`USO`, `JENF`
and `SEL-US`, scope `US`; separately §2's Canada country-wide descriptor), `NT` (`CIT`/`SEL-CA`, scope
`CA`, and `SEL-AU`, scope `AU`), `WA` (`SEL-US`, scope `US`, and `SEL-AU`, scope `AU`), `SA`
(`SEL-AU`, scope `AU`). The `JUDGMENT_ENFORCEMENT` key `CA` is additionally scoped by its own recorded
instrument, `Cal. Civ. Proc. Code § 683.020`, a California provision. No row above rests on inference,
and no country-wide or region-wide token in this table creates a federal pseudo-region or replaces a
consumer-selected region.

*Table totals (self-check).* 82 rows: `EXACT_SOURCE_FORM` 61, `OWNER_APPROVED_SOURCE_MAPPING` 9,
`CONTEXT_SCOPED_SOURCE_MAPPING` 11, `NO_LEGACY_SOURCE_ENTRY` 1. Legacy-source state:
`SOURCE_RECORD_PRESENT` 78, `SOURCE_RECORD_REFUSAL` 3, `SOURCE_RECORD_GAP` 0,
`SOURCE_RECORD_UNMAPPED` 0, `NO_LEGACY_SOURCE_ENTRY` 1. Rows per country: `CA` 13, `US` 57, `GB` 4,
`AU` 8.

## 4. Ratified Source-Family Labels

| Code | Source-family label |
| --- | --- |
| F1 | `LIMITATION_OR_RETENTION` |
| F2 | `CONSUMER_CREDIT_REGISTRY` |
| F3 | `PRIVACY_OR_DATA_HANDLING` |
| F4 | `REPORT_ACCURACY_OR_COMPLETENESS` |
| F5 | `DISCLOSURE_OR_FILE_ACCESS` |
| F6 | `DISPUTE_OR_CORRECTION` |
| F7 | `PUBLIC_RECORD_OR_JUDGMENT` |
| F8 | `PERMISSIBLE_PURPOSE_OR_CONSENT` |
| F9 | `IDENTITY_THEFT_OR_MIXED_FILE` |
| F10 | `UNCLASSIFIED_SOURCE_FAMILY` |

These labels describe source material only. They are not evaluator triggers, finding classes, scores,
or legal conclusions.

## 5. Unresolved Source-Provenance Items

| Identifier | Status |
| --- | --- |
| R6 | `UNRESOLVED_SOURCE_PROVENANCE` — California authority attribution remains unresolved. |
| R8 | `UNRESOLVED_SOURCE_PROVENANCE` — two incomplete New York source entries remain unfit for governed-rule construction. |

Under owner directive PHASE5-001O these two items are implementation dependencies, not acceptance bars.
A statute whose text is accepted is not rejected because an attribution or a source entry is incomplete;
the incompleteness is recorded as an administrative limitation, and the missing attribution is work to be
completed rather than a reason to exclude the provision from coverage planning. No attribution may be
invented to close either item, and this paragraph changes no normalization result in §3 and no row's
legacy-source state.



## 6. Non-Applicability

```text
NORMALIZED GOVERNED LEGAL RULES: 0
GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0
PERMITTED LEGAL FINDINGS: 0
```

## 7. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-29 | PHASE2-001K | Created the 82-region legacy source-normalization contract, ratified source-family labels, and preserved unresolved provenance without creating legal coverage or findings. |

| 2026-09-30 | PHASE5-001O | Valid owner amendment: section 5 now records that the unresolved source-provenance items R6 and R8 are implementation dependencies rather than acceptance bars, that an incomplete attribution does not exclude an accepted statute from coverage planning, and that no attribution may be invented to close either item. The 82-row normalization table, the source-family labels and every normalization result are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md. No rule, coverage, mapping or finding was created. |

