# CRP Jurisdiction Enumeration

**Status:** Approved Corpus Contract — Rank 4  
**Enumeration version:** `CRP-JURISDICTION-ENUM-1`  
**Effective date:** 2026-09-29

This is the closed jurisdiction enumeration required by `JURISDICTION_CONTRACT.md` §§12.1–12.3.
It is subordinate to the Core Constitution, Legal Invariant, and Jurisdiction Contract.

## 1. Frozen Source Provenance

| Field | Value |
| --- | --- |
| Repository | `amckenna41/iso3166-2` |
| Source path | `iso3166_2/iso3166-2.json` |
| Commit | `1d1a86a6d5ff67359c0ae7287037f66b136be9dc` |
| Git blob SHA-1 | `9bb8d0c020b81b2294177ca5ab43222d1f0d3d3f` |
| Licence | MIT |
| Repository attribution | `amckenna41/iso3166-2` |
| Retrieval date | 2026-09-29 |
| Source filter | country key is exactly `CA`, `US`, `GB`, or `AU`; `parentCode` is `null` |

## 2. Scope and Canonical Identity

This enumeration contains exactly 82 eligible first-level region records: 13 under `CA`, 57 under
`US`, 4 under `GB`, and 8 under `AU`.

The canonical CRP country code is the exact case-sensitive source country key. The canonical CRP
region code is the exact case-sensitive composite source record key. The region source identifier is
identical to the canonical CRP region code.

A listed country code and region code identify only the enumerated jurisdiction. They do not infer,
validate, replace, refine, or override the consumer-selected `COUNTRY` + `REGION`.

Only exact listed codes are recognized. Display names, `localOtherName`, aliases, free text, alpha-3
forms, numeric forms, inferred mappings, conversion rules, and case-insensitive matching are not
recognized selectors.

The region display name is the exact `name` value from the frozen source artifact. A display-name
change does not change the canonical CRP region code. A retired code must never be reused.

## 3. Excluded Source Population

Exactly 217 records under the four-country source scope are excluded because `parentCode` is not
`null`. They are not omissions, aliases, or recognized CRP jurisdictions in this enumeration.

| Country code | Eligible first-level records | Excluded child/deeper records |
| --- | ---: | ---: |
| `CA` | 13 | 0 |
| `US` | 57 | 0 |
| `GB` | 4 | 217 |
| `AU` | 8 | 0 |
| **Total** | **82** | **217** |

## 4. Enumerated Jurisdictions

| Country code | Canonical CRP region code | Region source identifier | Region display name |
| --- | --- | --- | --- |
| `CA` | `CA-AB` | `CA-AB` | Alberta |
| `CA` | `CA-BC` | `CA-BC` | British Columbia |
| `CA` | `CA-MB` | `CA-MB` | Manitoba |
| `CA` | `CA-NB` | `CA-NB` | New Brunswick |
| `CA` | `CA-NL` | `CA-NL` | Newfoundland and Labrador |
| `CA` | `CA-NS` | `CA-NS` | Nova Scotia |
| `CA` | `CA-NT` | `CA-NT` | Northwest Territories |
| `CA` | `CA-NU` | `CA-NU` | Nunavut |
| `CA` | `CA-ON` | `CA-ON` | Ontario |
| `CA` | `CA-PE` | `CA-PE` | Prince Edward Island |
| `CA` | `CA-QC` | `CA-QC` | Quebec |
| `CA` | `CA-SK` | `CA-SK` | Saskatchewan |
| `CA` | `CA-YT` | `CA-YT` | Yukon |
| `US` | `US-AK` | `US-AK` | Alaska |
| `US` | `US-AL` | `US-AL` | Alabama |
| `US` | `US-AR` | `US-AR` | Arkansas |
| `US` | `US-AS` | `US-AS` | American Samoa |
| `US` | `US-AZ` | `US-AZ` | Arizona |
| `US` | `US-CA` | `US-CA` | California |
| `US` | `US-CO` | `US-CO` | Colorado |
| `US` | `US-CT` | `US-CT` | Connecticut |
| `US` | `US-DC` | `US-DC` | District of Columbia |
| `US` | `US-DE` | `US-DE` | Delaware |
| `US` | `US-FL` | `US-FL` | Florida |
| `US` | `US-GA` | `US-GA` | Georgia |
| `US` | `US-GU` | `US-GU` | Guam |
| `US` | `US-HI` | `US-HI` | Hawaii |
| `US` | `US-IA` | `US-IA` | Iowa |
| `US` | `US-ID` | `US-ID` | Idaho |
| `US` | `US-IL` | `US-IL` | Illinois |
| `US` | `US-IN` | `US-IN` | Indiana |
| `US` | `US-KS` | `US-KS` | Kansas |
| `US` | `US-KY` | `US-KY` | Kentucky |
| `US` | `US-LA` | `US-LA` | Louisiana |
| `US` | `US-MA` | `US-MA` | Massachusetts |
| `US` | `US-MD` | `US-MD` | Maryland |
| `US` | `US-ME` | `US-ME` | Maine |
| `US` | `US-MI` | `US-MI` | Michigan |
| `US` | `US-MN` | `US-MN` | Minnesota |
| `US` | `US-MO` | `US-MO` | Missouri |
| `US` | `US-MP` | `US-MP` | Northern Mariana Islands |
| `US` | `US-MS` | `US-MS` | Mississippi |
| `US` | `US-MT` | `US-MT` | Montana |
| `US` | `US-NC` | `US-NC` | North Carolina |
| `US` | `US-ND` | `US-ND` | North Dakota |
| `US` | `US-NE` | `US-NE` | Nebraska |
| `US` | `US-NH` | `US-NH` | New Hampshire |
| `US` | `US-NJ` | `US-NJ` | New Jersey |
| `US` | `US-NM` | `US-NM` | New Mexico |
| `US` | `US-NV` | `US-NV` | Nevada |
| `US` | `US-NY` | `US-NY` | New York |
| `US` | `US-OH` | `US-OH` | Ohio |
| `US` | `US-OK` | `US-OK` | Oklahoma |
| `US` | `US-OR` | `US-OR` | Oregon |
| `US` | `US-PA` | `US-PA` | Pennsylvania |
| `US` | `US-PR` | `US-PR` | Puerto Rico |
| `US` | `US-RI` | `US-RI` | Rhode Island |
| `US` | `US-SC` | `US-SC` | South Carolina |
| `US` | `US-SD` | `US-SD` | South Dakota |
| `US` | `US-TN` | `US-TN` | Tennessee |
| `US` | `US-TX` | `US-TX` | Texas |
| `US` | `US-UM` | `US-UM` | United States Minor Outlying Islands |
| `US` | `US-UT` | `US-UT` | Utah |
| `US` | `US-VA` | `US-VA` | Virginia |
| `US` | `US-VI` | `US-VI` | Virgin Islands, U.S. |
| `US` | `US-VT` | `US-VT` | Vermont |
| `US` | `US-WA` | `US-WA` | Washington |
| `US` | `US-WI` | `US-WI` | Wisconsin |
| `US` | `US-WV` | `US-WV` | West Virginia |
| `US` | `US-WY` | `US-WY` | Wyoming |
| `GB` | `GB-ENG` | `GB-ENG` | England |
| `GB` | `GB-NIR` | `GB-NIR` | Northern Ireland |
| `GB` | `GB-SCT` | `GB-SCT` | Scotland |
| `GB` | `GB-WLS` | `GB-WLS` | Wales [Cymru GB-CYM] |
| `AU` | `AU-ACT` | `AU-ACT` | Australian Capital Territory |
| `AU` | `AU-NSW` | `AU-NSW` | New South Wales |
| `AU` | `AU-NT` | `AU-NT` | Northern Territory |
| `AU` | `AU-QLD` | `AU-QLD` | Queensland |
| `AU` | `AU-SA` | `AU-SA` | South Australia |
| `AU` | `AU-TAS` | `AU-TAS` | Tasmania |
| `AU` | `AU-VIC` | `AU-VIC` | Victoria |
| `AU` | `AU-WA` | `AU-WA` | Western Australia |

## 5. Integrity Rules

The table must contain exactly 82 rows. Each region code and source identifier must be globally
unique, identical to one another, uppercase, and match the exact source record key. Each row’s region
code must begin with its country code followed by `-`. Each listed display name must equal the exact
source `name` value for that record.

This enumeration establishes no legal rule, legal coverage, routing, consumer-selection interface,
application behavior, API, persistence design, or implementation.

## 6. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-29 | PHASE1-001K | Created the first approved closed jurisdiction enumeration from the pinned source artifact; admitted exactly 82 first-level region records and excluded 217 non-first-level records. |
