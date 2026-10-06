# CRP Gap and Refusal Resolution Register

**Status:** Companion register to an approved corpus contract — Rank 4 (source-level; not executable authority)
**Register version:** `CRP-GAP-REFUSAL-RESOLUTION-1`
**Effective date:** 2026-09-30
**Work order:** PHASE5-001C — Apply Owner-Authorized Gap and Refusal Resolutions
**Primary catalogue:** `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md`, amended under `PHASE5-001C`
**Owner-authorised input document:** `gap fix.md`, SHA-256 `8FA1D3D92DF2166FA515B2B54E703D2772CAC225C132A32E8677A7E5BA16FC62`
**Catalogue SHA-256 before this amendment:** `83E2F949D95B87B1AA3CF87436B085E6B23AA2DF8DBD08061A09EB60B84E49A8`
**Catalogue SHA-256 after this amendment:** `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`

This register exists because the catalogue's §4 entry schema is fixed at exactly fifteen fields. It
preserves the owner-authorised detail for the twenty-one reconciled IDs without changing that schema,
and it records the remaining limits explicitly rather than closing items that the owner document does
not resolve.

## 1. Purpose, authority and limits

- This register is a companion record to the catalogue. Like the catalogue it is not executable
  authority, is not a governed legal-rule corpus, and cannot itself produce a
  `VIOLATION` or `PROBABLE_VIOLATION`.
- The factual and disposition content of the owner-authorised input document is accepted as
  owner-authorised truth for the purposes of this amendment. That document's pseudocode, proposed
  runtime behaviour and sample "validation verified" statements are recorded here as owner-supplied
  intent only. They are not evidence that any code was implemented or tested, this work order
  authorises no runtime change, and none of them was copied into production code or into any
  catalogue or register field.
- Report-only safeguards applied to every row below: the uploaded credit report remains the sole
  consumer-evidence source. No request, dispute, account record, bureau action, creditor action,
  session or account profile datum, or other off-report evidence was added as proof of, or as an
  input to, a finding. A missing parser field is not proof that a fact is absent from the report; a
  generic date is not a statutory event date; if actual report representation was not inspected or
  mapped, the report-specific question remains unresolved; unknown statutory exceptions stay visible
  and are neither assumed to apply nor assumed not to apply.
- Recorded catalogue fields were preserved verbatim as prefixes wherever catalogue text was amended,
  so no previously recorded value was deleted or replaced. Owner-authorised content was appended with
  provenance. No entry's `record_type`, `legal_family`, jurisdiction reference, canonical jurisdiction
  fields, `source_artifact`, `source_artifact_sha256` or `catalogue_status` was changed.
- Totals are unchanged: 437 source entries (`CONTENT_RULE` 255, `LIMITATION_RECORD` 111,
  `AUTHORITY_RECORD` 27, `CITATION_RECORD` 23, `GAP` 18, `REFUSAL` 3); governed legal coverage 0;
  permitted legal findings 0. No governed rule, coverage, finding or consumer-facing output was
  created, and no entry was converted into a rule.
- No status below asserts that a statute was officially retrieved, or that any provision is an
  admitted executable rule. Every citation recorded in this register is owner-supplied unless a
  retrieval is expressly stated; none of the provisions named in this work order was independently
  retrieved or verified.

## 2. Resulting status of the twenty-one reconciled IDs

| ID | Record type | Scope | Resulting status | Owner-authorised information recorded | Remaining limitation |
| --- | --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | `GAP` | US federal | `GAP_CLOSED_SCOPE_DECISION` | Review scope is strictly limited to primary statutory and regulatory authorities; it does not account for non-binding administrative guidance, agency interpretive letters or secondary legal commentary. | Non-binding guidance and commentary stay outside the review; no CFPB or FTC material was retrieved and no secondary-authority source is admitted. |
| `CRP-LSRC-0076` | `GAP` | US federal | `GAP_OPEN — DISPOSITION RECORDED` | FCRA § 605(c) and § 623(a)(5)(A) remain read-and-verified but unreachable from report evidence, so no rule is entered; the owner document proposes a fallback for a missing original date of first delinquency based on Equifax Notice to Furnishers guidance and general regulatory practice, recorded as an owner-supplied proposal only. | The proposed fallback is not a verified official quotation, carries no recorded locator, is not an admitted primary or secondary source and is not entered as a rule; the evidence-reachability gap remains open. |
| `CRP-LSRC-0077` | `GAP` | US federal | `GAP_OPEN — DISPOSITION RECORDED` | Owner-supplied single federal-baseline matrix (bankruptcies under chapter 7 or chapter 11: 10 years; chapter 13: 7 years; civil suits and judgments: 7 years; paid tax liens: 7 years; accounts placed for collection: 7 years; any other adverse information: 7 years) proposed to apply to all states under FCRA § 625(b)(1)(E). | The all-states proposal is not adopted and no universal or all-states rule is created; the list of state content rules surviving § 625(b)(1)(E) remains incomplete (one state entered) and open. |
| `CRP-LSRC-0078` | `GAP` | `US-*` states and territories | `GAP_OPEN — WILDCARD UNRESOLVED` | Owner-supplied ingestion and session-metadata design that would resolve `US-*` from the consumer session or account profile, with fallback to session state; recorded as owner-supplied only. | Not adopted: it depends on off-report session and account-profile data and cannot close a jurisdiction wildcard or prove a finding; no US state or territory mapping was supplied, so per-unit limitation variation remains unresolved. |
| `CRP-LSRC-0310` | `GAP` | California | `GAP_CLOSED_SCOPE_DECISION` | Cross-reference statement recorded: California primary statutory language (California Civil Code) was cross-referenced with California Department of Financial Protection and Innovation (DFPI) administrative guidance and Witkin California Law treatises. | No locator or retrieval is recorded for the named guidance or treatises; they are not admitted as retrieved sources and no authority record is created. |
| `CRP-LSRC-0311` | `GAP` | New York | `GAP_CLOSED_SCOPE_DECISION` | Cross-reference statement recorded: New York primary statutory language (New York CPLR and the Fair Consumer Debt Reporting Act) was cross-referenced with New York Department of Financial Services (NYDFS) industry guidance and McKinney's Practice Commentaries. | No locator or retrieval is recorded for the named guidance or commentaries; the named State Act is owner-supplied naming only and is not otherwise identified in the corpus. |
| `CRP-LSRC-0312` | `GAP` | Washington | `GAP_CLOSED_SCOPE_DECISION` | Cross-reference statement recorded: Washington primary statutory parameters (Washington Collection Agency Act and the Fair Credit Reporting Act) were cross-referenced with Washington State Attorney General's Office formal opinions and Department of Financial Institutions compliance manuals; the owner document also states that logic rules actively enforce Washington's total medical debt reporting prohibition and mandated multi-point billing disclosures. | No locator or retrieval is recorded for the named opinions or manuals; the statement about actively enforced logic rules is an owner assertion and is not evidence that code was implemented or tested; the Washington medical-debt rule is not restated, extended or generalised. |
| `CRP-LSRC-0321` | `GAP` | Canada-wide | `GAP_PARTIALLY_RESOLVED — RELATIONSHIP RECORDED; CONFLICT LIMB OPEN` | Federal baseline recorded as PIPEDA (privacy) with Bank Act and FCAC guidelines (banking) and every province and territory already listed. Relationship statements: (i) federal bank — federal baseline priority, with provincial data-accuracy and privacy laws still respected absent direct conflict; (ii) provincial lender or collector — provincial instrument governs operational timelines such as credit aging and collections; (iii) timeline conflict — the owner document proposes applying the shortest, most consumer-friendly window. | Statement (iii) is recorded as a proposal only and is not adopted: no shortest-period or global override rule is applied, so cross-layer conflict resolution remains unresolved. Relationships were not independently retrieved. |
| `CRP-LSRC-0322` | `GAP` | Canada-wide | `GAP_PARTIALLY_RESOLVED — STATUTORY BASIS IDENTIFIED (UNRETRIEVED)` | Owner-supplied statutory bases for the FCAC-recorded bureau reporting periods, given as bankruptcy-first years / collections-and-judgments years: Ontario 7/6 (Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 9(3)); Quebec 6/6 (Civil Code of Québec, CQLR c CCQ-1991, art. 30); British Columbia 6/6 (Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2, s. 109); Alberta 6/6 (Consumer Protection Act, R.S.A. 2000, c. C-26.3 and Consumer Reporting Regulation, s. 16); Manitoba 6/6 (Personal Investigations Act, C.C.S.M. c. P34, s. 9(3)); Saskatchewan 6/6 (The Credit Reporting Act, S.S. 2004, c. C-43.2, s. 18); Nova Scotia 6/6 (Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3)); New Brunswick 7/6 (Consumer Reporting Act, S.N.B. 2014, c. 31, s. 13); Prince Edward Island 7/6 (Consumer Reporting Act, R.S.P.E.I. 1988, c. C-18, s. 10); Newfoundland and Labrador 7/6 (Consumer Reporting Act, R.S.N.L. 1990, c. C-32, s. 11); Yukon, Northwest Territories and Nunavut 6/6 under the Consumers Protection Act or Consumer Protection Act with no provision supplied. | No cited provision was retrieved or verified; the supplied bases replace bureau practice only as recorded claims; the three territory rows carry no provision; the Prince Edward Island Consumer Reporting Act chapter number is recorded inconsistently (c. C-18 here, c. C-20 in `CRP-LSRC-0323`) and is unresolved. |
| `CRP-LSRC-0323` | `GAP` | Canada-wide (four provincial regimes) | `GAP_CLOSED_SCOPE_DECISION — EXCLUSION GROUNDED (UNRETRIEVED)` | Provisions supplied for the four regimes read and deliberately not entered: Ontario — Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 2(2) and s. 2(3) (carve-outs including professional investigations and specialised financial data transfers); Nova Scotia — Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 2 (scope limited to reports compiled for profit or commercial dissemination); New Brunswick — Consumer Reporting Act, S.N.B. 2014, c. 31, s. 2 (limits on what constitutes an active consumer reporting file); Prince Edward Island — Consumer Reporting Act, R.S.P.E.I. 1988, c. C-20, s. 2 (jurisdictional parameters and exemptions for commercial credit lines or cross-border file processing). | The deliberate non-entry is retained; the provisions were not retrieved and no rule is entered and no exclusion is applied; the Prince Edward Island chapter number conflicts with the `CRP-LSRC-0322` row and is unresolved. |
| `CRP-LSRC-0324` | `GAP` | Canada / United Kingdom | `GAP_CLOSED_SCOPE_DECISION — OUT OF SCOPE FOR REPORT-ONLY FINDINGS` | Bureau-side frameworks read and deliberately not entered. Canada: Ontario Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 8 (accurate files) and s. 13 (30-day dispute investigation framework); Civil Code of Québec, CQLR c CCQ-1991, art. 35 to 40 (reputation and privacy) with the Act respecting the protection of personal information in the private sector; British Columbia Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2, Part 6, s. 107 to 112 (agency responsibilities and file corrections). United Kingdom: UK Data Protection Act 2018 and UK GDPR Article 5(1)(d) (accuracy); Consumer Credit Act 1974, s. 157 to 159 (disclosure and correction framework). Recorded omission reason: this node enforces data-furnisher obligations only. | Bureau-side duties and bureau conduct cannot be established from report content, so they remain out of scope for report-only findings and are not entered as rules; no bureau-behaviour finding, dispute workflow or request obligation is created; the provisions were not retrieved. |
| `CRP-LSRC-0325` | `GAP` | `CA-*` provinces and territories | `GAP_OPEN — WILDCARD UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Owner-supplied exact-jurisdiction limitation mapping held in §3.2 of this register: Ontario 2 years; British Columbia 2 years; Alberta 2 years; Quebec 3 years; Nova Scotia 3 years; New Brunswick 3 years. The owner document also proposes resolving the wildcard from the locked session province or the account profile. | Mapping is not applied and covers only six of thirteen units, so `CA-*` remains an unresolved wildcard; the session/account-profile route is not adopted; no provision was retrieved; no session or account-profile metadata may be substituted for the wildcard. |
| `CRP-LSRC-0395` | `REFUSAL` | Nova Scotia (`CA-NS`) | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | Limitation of Actions Act, S.N.S. 2014, c. 35, s. 12 (ultimate limitation period); source locator S.N.S. 2014, c. 35, s. 12; in force since 2015-06-01; rationale recorded as supplied: an absolute ultimate ceiling measured from the act or omission rather than from discovery or acknowledgment. Recorded refusal retained. | Citation and in-force date were not retrieved; the rationale is owner-supplied limitation analysis only and creates no operational collection or reporting block and no finding authority. |
| `CRP-LSRC-0396` | `REFUSAL` | Ontario (`CA-ON`) | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, s. 5 (discovery) and s. 15 (ultimate limitation period); source locator S.O. 2002, c. 24, Sched. B, ss. 5 and 15; in force since 2004-01-01; the recorded owner direction retaining this refusal is dated 2026-09-17; rationale recorded as supplied: the two-year clock runs from discovery rather than as a flat period, with s. 15 as the ultimate ceiling. Recorded refusal retained. | Citations were not retrieved; the rationale is owner-supplied limitation analysis only and creates no operational collection or reporting block and no finding authority. |
| `CRP-LSRC-0397` | `REFUSAL` | Québec (`CA-QC`) | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | Civil Code of Québec, CQLR c CCQ-1991, art. 2898 (acknowledgment of a right) and art. 2925 (general extinctive prescription); source locator CQLR c CCQ-1991, arts. 2898 and 2925; in force since 1994-01-01; rationale recorded as supplied: interruption analysis is required and a partial payment alone does not automatically reset the three-year prescription without a clear and unambiguous acknowledgment of the debt obligation. Recorded refusal retained. | Citations were not retrieved; interruption analysis remains required and no automatic reset on payment is assumed; the rationale creates no operational collection or reporting block and no finding authority. |
| `CRP-LSRC-0398` | `GAP` | Prince Edward Island (`CA-PE`) | `GAP_CLOSED_RELATIONSHIP_DECISION — NO DUPLICATE RULE` | Catch-all recorded as Limitation of Actions Act, R.S.P.E.I. 1988, c. L-15, s. 2(1)(g) (actions not otherwise provided for; six years from when the cause of action arose); relationship recorded as supplied: the catch-all was read and deliberately not entered as a rule because consumer contract and account debts are already covered by the specific provision s. 2(1)(e) of the same Act (six-year limit for actions on account or debt grounded on a lending contract), which controls. | Citations were not retrieved; no effective-period or commencement information was supplied and none is recorded; no duplicate catch-all rule and no overlapping rule is created. |
| `CRP-LSRC-0412` | `GAP` | United Kingdom (bare `UK` token) | `GAP_OPEN — COUNTRY TOKEN UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Owner-supplied exact-nation limitation mapping held in §3.4 of this register: England and Wales 6 years (procedural bar only); Scotland 5 years (extinctive prescription); Northern Ireland 6 years (procedural bar only). The owner document also proposes resolving the token from the locked session nation or the account profile. | Mapping is not applied, Wales is not identified separately, and a bare `UK` token still identifies no single nation, so the entry remains unanswerable at country level; the session/account-profile route is not adopted; no provision was retrieved. |
| `CRP-LSRC-0413` | `GAP` | United Kingdom (CRAIN searches row) | `GAP_OPEN — SOURCE UNVERIFIED (STATEMENTS RECORDED)` | Owner-supplied CRAIN search distinctions: a hard search (credit application) is stated to remain visible to other lenders for twelve months from the date of the search; a soft search (quotation, eligibility, audit) is stated to be visible only to the consumer and the bureau, invisible to third-party lenders, decoupled from credit scoring, and typically purged or archived after twelve to twenty-four months depending on the bureau architecture. Cited base: UK GDPR Article 5(1)(c) (data minimisation) and Article 5(1)(e) (storage limitation) as interpreted by CRAIN Section 5. | The twelve-month figure is a CRAIN framework statement and not a specific statutory twelve-month rule; CRAIN is an industry notice rather than primary legislation and remains outside the primary-authority scope; neither CRAIN Section 5 nor the cited UK GDPR provisions were retrieved; the searches row remains unverified and cannot support a finding. |
| `CRP-LSRC-0435` | `GAP` | `AU-*` states and territories | `GAP_OPEN — WILDCARD UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Owner-supplied exact-jurisdiction limitation mapping held in §3.5 of this register: New South Wales 6 years; Victoria 6 years; Queensland 6 years; Western Australia 6 years with the debt recorded as extinguished; South Australia 6 years; Tasmania 6 years; Northern Territory 3 years; Australian Capital Territory 6 years. The owner document also proposes resolving the wildcard from the locked session state or the account profile. | Mapping is not applied and the remedy-barred and extinguishment labels are owner-supplied; `AU-*` still identifies no single state or territory, so the wildcard remains unresolved; the session/account-profile route is not adopted; no provision was retrieved. |
| `CRP-LSRC-0436` | `GAP` | Australia-wide | `GAP_OPEN — PROVISIONS IDENTIFIED; OPERATIVE TEXT UNRETRIEVED` | Privacy Act 1988 (Cth), Schedule 1, APP 10 (quality of personal information: reasonable steps so that information collected is accurate, up-to-date and complete and, having regard to the purpose, accurate, up-to-date, complete and relevant) and APP 13 (correction of personal information where the entity is satisfied the information is inaccurate, out-of-date, incomplete, irrelevant or misleading, or where the individual requests correction). Owner-supplied qualification: correction is described as due within a reasonable timeframe, typically 30 days for credit reporting data. | The described criteria sets are owner-supplied descriptions, not admitted verified quotations; the 30-day figure is a qualified owner-supplied statement and not an unconditional statutory deadline; the verbatim Act text and pinpoint locators remain unretrieved, so the recorded text gap stays open; no correction request or dispute workflow is implemented and no provider or bureau conduct is inferred from report content. |
| `CRP-LSRC-0437` | `GAP` | Australia-wide | `GAP_OPEN — PROVISIONS IDENTIFIED; CODE TEXT UNRETRIEVED` | Privacy (Credit Reporting) Code 2024 provisions named by the owner document for this table: s. 16 (data quality), s. 20 (correction timelines), s. 21 (dispute flagging), with a reference to Office of the Australian Information Commissioner guidance on those requirements. | Code text and pinpoint locators were not retrieved, so no Code provision is admitted, no Code rule is entered, and the recorded gap that the table cites no Code provisions remains open; the correction and dispute provisions are procedural duties that report content cannot establish and stay out of scope for report-only findings; no dispute or request workflow is implemented. |

## 3. Exact-jurisdiction mappings recorded separately from unresolved wildcard and scope entries

These mappings are recorded here — separately from the still-unresolved wildcard or country-scope
catalogue entries — for entries `CRP-LSRC-0078`, `CRP-LSRC-0321`, `CRP-LSRC-0322`, `CRP-LSRC-0325`,
`CRP-LSRC-0412` and `CRP-LSRC-0435`. Every mapping below is owner-supplied and unretrieved. None of it
is applied, admitted or converted into a rule by this work order, and none of it closes the wildcard or
country-scope entry it accompanies.

### 3.1 United States — `CRP-LSRC-0078` (`US-*`)

No exact-jurisdiction mapping was supplied. The owner document supplies an ingestion and
session-metadata design instead. The wildcard therefore stays unresolved: state and territory
limitation law continues to vary by debt type and by jurisdiction, no single unit was identified, and no
off-report session or account-profile datum may be substituted for the wildcard.

### 3.2 Canada — limitation periods — `CRP-LSRC-0325` (`CA-*`)

| Unit | Period | Provision (owner-supplied) |
| --- | --- | --- |
| Ontario (ON) | 2 years | Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, s. 4 |
| British Columbia (BC) | 2 years | Limitation Act, S.B.C. 2012, c. 13, s. 6 |
| Alberta (AB) | 2 years | Limitations Act, R.S.A. 2000, c. L-12, s. 3(1)(a) |
| Quebec (QC) | 3 years | Civil Code of Québec, CQLR c CCQ-1991, art. 2925 |
| Nova Scotia (NS) | 3 years | Limitation of Actions Act, S.N.S. 2014, c. 35, s. 8 |
| New Brunswick (NB) | 3 years | Limitation of Actions Act, S.N.B. 2009, c. L-8.5, s. 5(1) |

Coverage limitation: only six of the thirteen provincial and territorial units were supplied. The
remaining units are unmapped, so `CA-*` remains an unresolved wildcard.

### 3.3 Canada — reporting-period retention bases — `CRP-LSRC-0322` (Canada-wide)

| Unit | Bankruptcy (first) | Collections / judgments | Provision (owner-supplied) |
| --- | --- | --- | --- |
| Ontario (ON) | 7 years | 6 years | Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 9(3) |
| Quebec (QC) | 6 years | 6 years | Civil Code of Québec, CQLR c CCQ-1991, art. 30 |
| British Columbia (BC) | 6 years | 6 years | Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2, s. 109 |
| Alberta (AB) | 6 years | 6 years | Consumer Protection Act, R.S.A. 2000, c. C-26.3, Consumer Reporting Regulation, s. 16 |
| Manitoba (MB) | 6 years | 6 years | Personal Investigations Act, C.C.S.M. c. P34, s. 9(3) |
| Saskatchewan (SK) | 6 years | 6 years | The Credit Reporting Act, S.S. 2004, c. C-43.2, s. 18 |
| Nova Scotia (NS) | 6 years | 6 years | Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3) |
| New Brunswick (NB) | 7 years | 6 years | Consumer Reporting Act, S.N.B. 2014, c. 31, s. 13 |
| Prince Edward Island (PE) | 7 years | 6 years | Consumer Reporting Act, R.S.P.E.I. 1988, c. C-18, s. 10 |
| Newfoundland and Labrador (NL) | 7 years | 6 years | Consumer Reporting Act, R.S.N.L. 1990, c. C-32, s. 11 |
| Yukon, Northwest Territories, Nunavut (YT, NT, NU) | 6 years | 6 years | Consumers Protection Act or Consumer Protection Act respectively — no precise provision supplied |

Provenance limitations: no provision in this table was retrieved or verified; the three territory rows
carry no provision; and the Prince Edward Island Consumer Reporting Act is cited as c. C-18 here while
`CRP-LSRC-0323` cites c. C-20 for the same Act, which is unresolved.

### 3.4 United Kingdom — limitation periods — `CRP-LSRC-0412` (bare `UK` token)

| Nation | Period | Legal effect (owner-supplied) | Provision (owner-supplied) |
| --- | --- | --- | --- |
| England and Wales | 6 years | procedural bar only | Limitation Act 1980, c. 58, s. 5 (actions on simple contract) |
| Scotland | 5 years | extinguishes the debt | Prescription and Limitation (Scotland) Act 1973, c. 52, s. 6 (extinctive prescription) |
| Northern Ireland | 6 years | procedural bar only | Limitation (Northern Ireland) Order 1989, S.I. 1989/1339, art. 4 |

Coverage limitation: the owner document treats England and Wales as a single unit and does not identify
Wales separately; the bare `UK` token still identifies no single nation, so the country-level entry
remains unanswerable and unresolved.

### 3.5 Australia — limitation periods — `CRP-LSRC-0435` (`AU-*`)

| Jurisdiction | Period | Legal effect (owner-supplied) | Provision (owner-supplied) |
| --- | --- | --- | --- |
| New South Wales (NSW) | 6 years | remedy barred only | Limitation Act 1969 (NSW), s. 14(1)(a) |
| Victoria (VIC) | 6 years | remedy barred only | Limitation of Actions Act 1958 (Vic), s. 5(1)(a) |
| Queensland (QLD) | 6 years | remedy barred only | Limitation of Actions Act 1974 (Qld), s. 10(1)(a) |
| Western Australia (WA) | 6 years | debt extinguished completely | Limitation Act 2005 (WA), s. 13 and s. 84 |
| South Australia (SA) | 6 years | remedy barred only | Limitation of Actions Act 1936 (SA), s. 35 |
| Tasmania (TAS) | 6 years | remedy barred only | Limitation Act 1974 (Tas), s. 4(1)(a) |
| Northern Territory (NT) | 3 years | remedy barred only | Limitation Act 1981 (NT), s. 12(1)(a) |
| Australian Capital Territory (ACT) | 6 years | remedy barred only | Limitation Act 1985 (ACT), s. 11(1)(a) |

Coverage limitation: the legal-effect labels are owner-supplied and unverified, and `AU-*` still
identifies no single state or territory, so the wildcard remains unresolved.

### 3.6 Canada — federal, provincial and sector layering — `CRP-LSRC-0321`

The owner-supplied relationship statements, recorded without applying any of them:

1. Where a federally regulated bank is the data furnisher, the federal baseline (privacy) is stated to
   have priority, while provincial data-accuracy and privacy laws are still stated to be respected
   absent a direct conflict.
2. Where a provincial lender or collector is involved, the provincial instrument is stated to govern
   operational timelines such as credit aging and collections.
3. Where the timelines conflict, the owner document proposes applying the shortest, most
   consumer-friendly window.

Statement 3 is recorded as a proposal only and is **not adopted**. No shortest-period rule, no global
override rule and no conflict-resolution rule is entered, so the cross-layer conflict limb remains open
and visible. The relationship statements were not independently retrieved or verified.

### 3.7 Canada — four provincial regimes read and deliberately not entered — `CRP-LSRC-0323`

| Regime | Provision named (owner-supplied) | Owner-stated carve-out |
| --- | --- | --- |
| Ontario | Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 2(2) and s. 2(3) | Carve-outs including professional investigations and specialised financial data transfers |
| Nova Scotia | Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 2 | Scope limited to reports compiled for profit or commercial dissemination |
| New Brunswick | Consumer Reporting Act, S.N.B. 2014, c. 31, s. 2 | Limits on what constitutes an active consumer reporting file |
| Prince Edward Island | Consumer Reporting Act, R.S.P.E.I. 1988, c. C-20, s. 2 | Jurisdictional parameters and exemptions for commercial credit lines or cross-border file processing |

The deliberate non-entry is retained. These provisions were not retrieved; no rule is entered, no
exclusion is applied against any report, and the Prince Edward Island chapter number conflicts with the
`CRP-LSRC-0322` row in §3.3 and is unresolved.

### 3.8 Canada and United Kingdom — bureau-side duties read and deliberately not entered — `CRP-LSRC-0324`

The owner document confirms that the following bureau-side frameworks were read and deliberately not
entered, and confirms the recorded omission reason that this node enforces **data-furnisher**
obligations only: Canada — Ontario Consumer Reporting Act s. 8 (accurate files) and s. 13 (30-day
dispute investigation framework); Civil Code of Québec art. 35 to 40 (reputation and privacy) with the
Act respecting the protection of personal information in the private sector; British Columbia Business
Practices and Consumer Protection Act, Part 6, s. 107 to 112 (agency responsibilities and file
corrections). United Kingdom — Data Protection Act 2018 and UK GDPR Article 5(1)(d) (accuracy); Consumer
Credit Act 1974, s. 157 to 159 (disclosure and correction framework).

Because bureau duties and bureau conduct cannot be established from report content, these remain out of
scope for report-only findings. No bureau-behaviour finding, dispute workflow, correction request or
furnisher-response obligation is created, and none of the provisions was retrieved.

### 3.9 United Kingdom — CRAIN search-visibility statements — `CRP-LSRC-0413`

| Search class | Owner-supplied statement |
| --- | --- |
| Hard search (credit application) | Stated to remain visible to other lenders for 12 months from the date of the search |
| Soft search (quotation, eligibility, audit) | Stated to be visible only to the consumer and the bureau, invisible to third-party lenders, decoupled from credit scoring, and typically purged or archived after 12 to 24 months depending on bureau architecture |

Cited base recorded as supplied: UK GDPR Article 5(1)(c) (data minimisation) and Article 5(1)(e)
(storage limitation) as interpreted by CRAIN Section 5. No CRAIN provision is admitted: CRAIN is an
industry notice, not primary legislation, and it remains outside the primary-authority scope of the
catalogue. Neither the Code nor the cited UK GDPR provisions was retrieved. The `SEARCHES` row stays
unverified and no 12-month statutory rule is entered; visibility and retention are not treated as proof
of any search's legitimacy or of any furnisher's conduct.

### 3.10 Australia — correction criteria and procedural Code duties — `CRP-LSRC-0436` and `CRP-LSRC-0437`

Owner-supplied identifications for `CRP-LSRC-0436`: Privacy Act 1988 (Cth), Schedule 1, APP 10 (quality
of personal information) and APP 13 (correction), with the qualification that correction is described
as due within a reasonable timeframe, typically 30 days for credit reporting data. The APP criteria
descriptions are owner-supplied descriptions, not admitted verified quotations, and the 30-day figure
is a qualified statement rather than an unconditional statutory deadline.

Owner-supplied identifications for `CRP-LSRC-0437`: Privacy (Credit Reporting) Code 2024, s. 16 (data
quality), s. 20 (correction timelines), s. 21 (dispute flagging), with a reference to Office of the
Australian Information Commissioner guidance. No Code provision is admitted, no Code rule is entered,
and the recorded gap that the table cites no Code provisions remains open. Both the correction and the
dispute provisions are procedural duties that report content cannot establish, so they stay out of scope
for report-only findings and no dispute or correction-request workflow is implemented.

## 4. Disposition summary for the twenty-one reconciled IDs

The catalogue disposition text below is quoted as recorded in each entry under `PHASE5-001C`. Every
entry remains `catalogue_status` `ADMITTED_SOURCE_ONLY` with its original `record_type`.

| Disposition group | Catalogue disposition as recorded | IDs | Count |
| --- | --- | --- | --- |
| A — closed by owner scope or relationship decision | `closed as a scope decision, not as a statute` (`0075`); `scope decision only; no secondary source is retrieved` (`0310`, `0311`, `0312`); `exclusion provisions recorded; the deliberate non-entry is retained` (`0323`); `bureau-side duties recorded; scoping retained and out of scope for report-only findings` (`0324`); `catch-all recorded and closed as a relationship decision; no duplicate rule created` (`0398`) | `0075`, `0310`, `0311`, `0312`, `0323`, `0324`, `0398` | 7 |
| B — disposition recorded, gap NOT closed | `disposition recorded; this gap is NOT closed` (`0076`, `0077`); `wildcard preserved; this gap is NOT closed` (`0078`, `0325`, `0435`); `bare UK token preserved; this gap is NOT closed` (`0412`); `the SEARCHES row is NOT verified and this gap is NOT closed` (`0413`); `the text gap is NOT closed` (`0436`); `Code provisions identified; this gap is NOT closed` (`0437`) | `0076`, `0077`, `0078`, `0325`, `0412`, `0413`, `0435`, `0436`, `0437` | 9 |
| C — partially resolved, a limb remains open | `relationship recorded; cross-layer conflict remains open` (`0321`); `statutory-basis identifications supplied for the named provinces; retrieval still owed` (`0322`) | `0321`, `0322` | 2 |
| D — refusals retained with citations, dates and rationale | `refusal retained; citations, dates and rationale recorded` (`0395`, `0396`, `0397`) | `0395`, `0396`, `0397` | 3 |

Group A + B + C = 18 `GAP` entries; group D = 3 `REFUSAL` entries; total 21, matching the eighteen
`GAP` and three `REFUSAL` entries in the catalogue exactly. No group changes an entry's `record_type`,
no group converts an entry into a rule, and no group asserts that a provision was retrieved.

## 5. Items that remain open or unresolved

Each item below stays visible and unresolved; none was silently closed, defaulted or inferred.

1. `CRP-LSRC-0078` — `US-*` wildcard unresolved. No state or territory mapping was supplied and no
   single unit was identified; no off-report session or account-profile datum may be substituted.
2. `CRP-LSRC-0076` — the FCRA provisions named in the entry stay unreachable from report evidence; no
   rule is entered and no state or universal rule is created.
3. `CRP-LSRC-0076` / `CRP-LSRC-0077` — neither proposal is adopted. `0076`: the owner-supplied
   fallback for a missing original date of first delinquency, resting on Equifax Notice to Furnishers
   guidance, is not a verified quotation, carries no locator or retrieval and is not an admitted source.
   `0077`: the single federal-baseline matrix proposed to apply to all states under FCRA
   § 625(b)(1)(E) creates no universal or all-states rule, and the list of state content rules
   surviving that provision stays incomplete with only one state entered.
4. `CRP-LSRC-0321` — the cross-layer conflict limb stays open: the proposed shortest, most
   consumer-friendly window is not adopted and no override rule is entered.
5. `CRP-LSRC-0322` — every supplied statutory basis is unretrieved. The three territory rows
   (Yukon, Northwest Territories, Nunavut) carry no provision, and the Prince Edward Island Consumer
   Reporting Act chapter number is inconsistent across two rows (`c. C-18` in `0322` and `c. C-20` in
   `0323`) and is unresolved.
6. `CRP-LSRC-0325` — the `CA-*` mapping covers only six of thirteen provincial and territorial units,
   so the wildcard remains unresolved.
7. `CRP-LSRC-0323` / `CRP-LSRC-0324` — the deliberate non-entry of the named provincial and
   bureau-side provisions is retained; the provisions are unretrieved and no exclusion is applied.
8. `CRP-LSRC-0412` — the bare `UK` token still identifies no single nation, and Wales is not
   separately identified; the country-level entry remains unanswerable.
9. `CRP-LSRC-0413` — the `SEARCHES` row stays unverified: CRAIN is an industry notice outside the
   primary-authority scope, the 12-month figure is not recorded as a statutory rule, and neither CRAIN
   nor the cited UK GDPR provisions were retrieved.
10. `CRP-LSRC-0435` — `AU-*` is unresolved; the remedy-barred and extinguishment labels are
    owner-supplied and unverified.
11. `CRP-LSRC-0436` / `CRP-LSRC-0437` — the recorded text gap stays open: the APP 10 and APP 13
    criteria descriptions are owner-supplied descriptions, the 30-day figure is qualified, and the
    Privacy (Credit Reporting) Code 2024 text and pinpoint locators are unretrieved.
12. `CRP-LSRC-0395`, `CRP-LSRC-0396`, `CRP-LSRC-0397` — the refusals are retained and their
    citations, in-force dates and rationales are recorded, but no citation was retrieved and the
    rationales are owner-supplied limitation analysis only.
13. Provenance limitation applying to the whole work order: **no provision named anywhere in this work
    order was independently retrieved or verified**, so every citation recorded in the catalogue
    amendments and in this register is owner-supplied.
14. Not adopted anywhere: the off-report route that resolves a wildcard or country token from the
    locked session jurisdiction or from account-profile data (`0078`, `0325`, `0412`, `0435`).

## 6. Owner-supplied material recorded but not adopted

| Owner-supplied material | Recorded | Adopted? | Effect on authority |
| --- | --- | --- | --- |
| Off-report resolution of a wildcard or country token from the locked session jurisdiction or account profile (`0078`, `0325`, `0412`, `0435`) | Yes, as a proposal | **No** | Creates no session- or profile-derived input to any finding |
| Shortest / most consumer-friendly window selected on cross-layer timeline conflict (`0321`) | Yes, as a proposal | **No** | Creates no override, priority or conflict rule |
| FCRA missing date-of-first-delinquency fallback resting on Equifax Notice to Furnishers guidance and general regulatory practice (`0076`), and the proposed all-states FCRA § 605 baseline matrix for § 625(b)(1)(E) (`0077`) | Yes, as owner-supplied only | **No** | Not admitted sources; create no state, universal or all-states rule |
| CRAIN 12-month hard-search visibility figure and 12-to-24-month soft-search archiving figure (`0413`) | Yes, as owner-supplied statements | **No** | Not a statutory rule; the `SEARCHES` row remains unverified |
| "Typically 30 days" correction expectation for Australian credit reporting data (`0436`) | Yes, as a qualified statement | **No** | Not an unconditional statutory deadline |
| Refusal rationales for `0395`, `0396`, `0397` | Yes, with citations, in-force dates and rationale | Recorded as the basis for retaining each refusal | Creates no operational collection or reporting block |
| Owner document pseudocode, proposed runtime behaviour and sample "validation verified" statements | Yes, as owner-supplied intent only | **No** | Not evidence that any code was implemented or tested; no runtime change is authorised; nothing was copied into production code or into any catalogue or register field |

## 7. Change record and verification

### 7.1 Files changed by this work order

| File | Change | SHA-256 |
| --- | --- | --- |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | Amended all 21 target entries (`GAP` 18, `REFUSAL` 3) in six batches and added one amendment-history row for `PHASE5-001C`. No other entry or section was touched. | Before: `83E2F949D95B87B1AA3CF87436B085E6B23AA2DF8DBD08061A09EB60B84E49A8` — after: `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D` |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | Created as the companion register (this document). | Recorded in §7.4 |
| `gap fix.md` (owner-authorised input, outside the repository working set) | Read only; not modified. | `8FA1D3D92DF2166FA515B2B54E703D2772CAC225C132A32E8677A7E5BA16FC62` |

### 7.2 Catalogue integrity after amendment

Structure preserved: 437 entries, fifteen fields per entry, and the file's JSON block parses. Record-type
counts are unchanged from the pre-amendment baseline — `CONTENT_RULE` 255, `LIMITATION_RECORD` 111,
`AUTHORITY_RECORD` 27, `CITATION_RECORD` 23, `GAP` 18, `REFUSAL` 3 — with 437 distinct IDs, no duplicate
IDs and no missing IDs. All 21 amended entries retain `catalogue_status` `ADMITTED_SOURCE_ONLY`, and each
entered field value is preserved verbatim as a prefix with the owner-authorised content appended after it.

### 7.3 No authority change

No runtime behaviour, evaluator, governed legal rule, legal coverage, permitted legal finding or
consumer-facing output was created, modified or authorised by this work order. Governed legal coverage
remains 0 and permitted legal findings remain 0. Because no provision named in this work order was
retrieved, every citation recorded here is owner-supplied and is not an admitted executable rule; the
catalogue and this register remain source-level records only and neither can produce a `VIOLATION` or
`PROBABLE_VIOLATION`.

### 7.4 Per-ID index for the twenty-one reconciled IDs

| ID | Record type | §2 row | §3 mapping recorded | §4 disposition group |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | `GAP` | Yes | — | A |
| `CRP-LSRC-0076` | `GAP` | Yes | — | B |
| `CRP-LSRC-0077` | `GAP` | Yes | — | B |
| `CRP-LSRC-0078` | `GAP` | Yes | §3.1 | B |
| `CRP-LSRC-0310` | `GAP` | Yes | — | A |
| `CRP-LSRC-0311` | `GAP` | Yes | — | A |
| `CRP-LSRC-0312` | `GAP` | Yes | — | A |
| `CRP-LSRC-0321` | `GAP` | Yes | §3.6 | C |
| `CRP-LSRC-0322` | `GAP` | Yes | §3.3 | C |
| `CRP-LSRC-0323` | `GAP` | Yes | §3.7 | A |
| `CRP-LSRC-0324` | `GAP` | Yes | §3.8 | A |
| `CRP-LSRC-0325` | `GAP` | Yes | §3.2 | B |
| `CRP-LSRC-0395` | `REFUSAL` | Yes | — | D |
| `CRP-LSRC-0396` | `REFUSAL` | Yes | — | D |
| `CRP-LSRC-0397` | `REFUSAL` | Yes | — | D |
| `CRP-LSRC-0398` | `GAP` | Yes | — | A |
| `CRP-LSRC-0412` | `GAP` | Yes | §3.4 | B |
| `CRP-LSRC-0413` | `GAP` | Yes | §3.9 | B |
| `CRP-LSRC-0435` | `GAP` | Yes | §3.5 | B |
| `CRP-LSRC-0436` | `GAP` | Yes | §3.10 | B |
| `CRP-LSRC-0437` | `GAP` | Yes | §3.10 | B |

Twenty-one IDs indexed: eighteen `GAP` and three `REFUSAL`, with no ID omitted and none indexed twice.

Register digests and verification are consolidated in §9 at the end of this register. The
`PHASE5-001C` value is restated there, unchanged, and this pointer carries no digest of its own.

## 8. PHASE5-001D — official primary-source retrievals and per-ID results

### 8.1 Method, evidence rules and what counts as a retrieval

Retrieval was performed against official government or legislative publishers only: the United Kingdom
Statute Law Database (`legislation.gov.uk`, The National Archives), the Australian Federal Register of
Legislation (`legislation.gov.au`), the Office of the Australian Information Commissioner (`oaic.gov.au`,
a Commonwealth of Australia publisher), the U.S. Government Publishing Office (`govinfo.gov`, United
States Code), the British Columbia King's Printer (`bclaws.gov.bc.ca`), the Ontario e-Laws service
(`ontario.ca/laws`) and the Department of Justice Canada (`laws-lois.justice.gc.ca`).

Evidence rules applied, and applied against this work order's own convenience:

- A record counts as **retrieved** only where the publisher page returned **and** the target provision
  text was captured. Anything less is marked `PARTIAL` (page returned, provision not captured) or
  `NOT RETRIEVED` (blocked, not found, binary-only or JavaScript-only).
- Search-result snippets, secondary summaries, industry notices, agency guidance, law-firm material
  and the owner-supplied citations themselves were **not** accepted as retrieval evidence, and none was
  admitted as a rule or as a paraphrase of one.
- Search engines were used only as discovery aids. They proved unusable for this work (bot challenges,
  or results unrelated to the query), so every record below comes from a direct publisher URL.
- A retrieval does not convert a provision into a report-only candidate, does not create a governed
  rule, legal coverage or finding authority, and does not close a wildcard, refusal or
  deliberately-not-entered item.
- **Capture-window limitation, disclosed rather than hidden:** the retrieval channel returns only a
  limited window of each page. Where a target provision lay inside a long page's elided middle, the
  provision is recorded `PARTIAL` even though the publisher page and its currency statement were
  retrieved. Only where a compact publisher route served the provision alone (for example
  `legislation.gov.uk/.../data.html`) is a provision recorded as fully captured. Nothing in §8 is
  reconstructed from memory or quoted from a non-official source.
- Retrieval date for every record in §8: **2026-09-30**. Requests issued: 52. Records returning
  provision-relevant content from an official publisher: 24. Requests that were blocked, not found,
  binary-only, JavaScript-only, search-noise or resolved to a different instrument: 28. Requests that returned are marked as `VERIFIED_RETRIEVAL_PENDING_OWNER_DISPOSITION`.

### 8.2 Provisions captured from official publishers

| # | Provision | Publisher (official) | Retrieval route | Version / effective-period evidence | Capture |
| --- | --- | --- | --- | --- | --- |
| R1 | Limitation Act 1980 (c. 58), s. 5 — "Time limit for actions founded on simple contract.": "An action founded on simple contract shall not be brought after the expiration of six years from the date on which the cause of action accrued." | Statute Law Database, `legislation.gov.uk` | `/ukpga/1980/58/section/5` and `/section/5/data.html` | "up to date with all changes known to be in force on or before 30 September 2026"; extent E+W+N.I.; alternative version 01/02/1991; unapplied prospective effect recorded (Act applied by 2024 c. 13 s. 234(4)); s. 5 extended 11.11.1999 by 1999 c. 31 ss. 7(3), 10(2)(3) | FULL |
| R2 | Prescription and Limitation (Scotland) Act 1973 (c. 52), s. 6 — "Extinction of obligations by prescriptive periods of five years.": an obligation subsisting "for a continuous period of five years" without a relevant claim and without relevant acknowledgment "shall be extinguished"; subsections (1)–(5) including the bill-of-exchange proviso and the fraud, error and legal-disability computation rules | Statute Law Database, `legislation.gov.uk` | `/ukpga/1973/52/section/6/data.html`, plus the `enacted` version | "up to date with all changes known to be in force on or before 30 September 2026"; extent S; version points 1991-02-01, 1991-09-25, 2004-07-22, 2004-11-28, 2017-03-09, 2018-06-09 and 2025-02-28; s. 6(4A) inserted 28.2.2025 by Prescription (Scotland) Act 2018 (asp 15) ss. 4(3), 17(2) with S.S.I. 2022/78 | FULL |
| R3 | Limitation (Northern Ireland) Order 1989 (S.I. 1989/1339), art. 4 — "Subject to Articles 5, 7 and 9, the following actions may not be brought after the expiration of six years from the date on which the cause of action accrued — (a) an action founded on simple contract; (b) an action founded on quasi-contract; (c) an action to enforce an award where the arbitration agreement is not under seal; (d) an action to recover any sum recoverable by virtue of any statutory provision ..." | Statute Law Database, `legislation.gov.uk` | `/nisi/1989/1339/article/4/data.xml` | extent N.I.; order current to 2026-04-06; earlier version points 2006-01-01 and 2009-10-01; art. 4(d)(ii) omitted 1.10.2009 by S.I. 2009/1941 Sch. 1 para. 105(2) | FULL |
| R4 | UK GDPR (Regulation (EU) 2016/679 as it forms part of UK law), Article 5 — "Principles relating to processing of personal data", including 5(1)(c) "adequate, relevant and limited to what is necessary ... ('data minimisation')", 5(1)(d) "'accuracy'", 5(1)(e) "kept in a form which permits identification of data subjects for no longer than is necessary ... ('storage limitation')", plus 5(2) accountability and 5(3) | King's Printer of Acts of Parliament, `legislation.gov.uk` | `/eur/2016/679/article/5/data.html` | extent E+W+S+N.I.; current to 2026-09-30; amended by Data (Use and Access) Act 2025 (c. 18) ss. 71(2)–(3), 87(1)(a) (in force 5.2.2026) with S.I. 2026/82; this is the UK-modified text, not the EU text | FULL |
| R5 | Consumer Credit Act 1974 (c. 39): s. 157 "Duty to disclose name etc. of agency"; s. 158 "Duty of agency to disclose filed information" (including the fee and the statutory meaning of "file"); s. 159 "Correction of wrong information" (s. 159(2) agency response "within 28 days"; s. 159(3) objector's notice of correction "not exceeding 200 words"; s. 159(4)–(8) resolution by the Information Commissioner or, for partnerships and unincorporated bodies, the FCA) | Statute Law Database, `legislation.gov.uk` | `/ukpga/1974/39/section/157/data.html`, `/section/158/data.html` and `/section/159/data.html` | extent E+W+S+N.I.; current to 2026-07-15; s. 159 substituted 1.3.2000 by 1998 c. 29 s. 62; UK GDPR cross-references substituted 31.12.2020 by S.I. 2019/419 Sch. 3 para. 5 | FULL |

Further captured provisions follow in the continuation of §8.2.

| # | Provision | Publisher (official) | Retrieval route | Version / effective-period evidence | Capture |
| --- | --- | --- | --- | --- | --- |
| R6 | Privacy Act 1988 (Cth), Schedule 1, Australian Privacy Principle 10 (quality of personal information): 10.1 reasonable steps so that collected personal information is "accurate, up-to-date and complete"; 10.2 reasonable steps so that used or disclosed information is, having regard to the purpose of the use or disclosure, "accurate, up-to-date, complete and relevant" | Office of the Australian Information Commissioner, `oaic.gov.au` (Commonwealth of Australia) | APP guidelines, Chapter 10: APP 10 Quality of personal information | Chapter 10 "Publication date: 22 July 2019, Version 1.1"; the APPs are the text of Schedule 1 as inserted by the Privacy Amendment (Enhancing Privacy Protection) Act 2012, and the chapter quotes 10.1 and 10.2 directly | FULL (as reproduced by the regulator) |
| R7 | Privacy Act 1988 (Cth), Schedule 1, Australian Privacy Principle 13 (correction of personal information): 13.1 correction where the entity is satisfied the information is "inaccurate, out of date, incomplete, irrelevant or misleading" or on the individual's request; 13.2 notification of correction to third parties; 13.3 written notice of a refusal setting out the reasons, the complaint mechanisms and any prescribed matter; 13.4 request to associate a statement of inaccuracy; 13.5 "must respond to the request: if the entity is an agency — within 30 days after the request is made; or if the entity is an organisation — within a reasonable period after the request is made", and must not charge for the request, the correction or the association | Office of the Australian Information Commissioner, `oaic.gov.au` (Commonwealth of Australia) | "Read the Australian Privacy Principles" | Page "Updated: 25 July 2022"; states the APPs replaced the NPPs and IPPs on 12 March 2014 and directs readers to the Federal Register of Legislation for the latest versions | FULL (as reproduced by the regulator) |
| R8 | 15 U.S.C. 1681t (FCRA § 625): (a) general rule preserving state law except to the extent of inconsistency; (b)(1)(A)–(K) subject matters on which no state requirement or prohibition may be imposed, including (b)(1)(E) "section 1681c of this title, relating to information contained in consumer reports, except that this subparagraph shall not apply to any State law in effect on September 30, 1996" and (b)(1)(F)(i)–(ii) preserving only "section 54A(a) of chapter 93 of the Massachusetts Annotated Laws" and "section 1785.25(a) of the California Civil Code"; (b)(2) preserving "subsection (a) or (c)(1) of section 2480e of title 9, Vermont Statutes Annotated" | U.S. Government Publishing Office, `govinfo.gov` | `USCODE-2023-title15-chap41-subchapIII-sec1681t.htm` | "United States Code, 2023 Edition", Title 15, Chapter 41, Subchapter III, published by the U.S. Government Publishing Office; the page carries the 2018, 2003, 1996, 1978 and original effective-date notes | FULL |
| R9 | Business Practices and Consumer Protection Act (SBC 2004, c. 2), Part 6 — Credit Reporting: s. 106 definitions ("credit information", "report", "reporting agency"); s. 107 consent for a report; s. 108 to whom reports may be given; s. 110 notice of denial of a benefit or increase in its cost, to be given "not later than 30 days after the decision was made"; s. 111 consumer explanation of "not more than 100 words" to be retained and included in later reports; s. 112 prohibition on supplying false or misleading information | King's Printer, Victoria, British Columbia, `bclaws.gov.bc.ca` | `/civix/document/id/complete/statreg/04002_07` | "This Act is current to September 22, 2026"; the Act's own currency statement was also retrieved on the contents route `04002_00` | FULL |

Further captured provisions continue in §8.2 (Ontario, then the partial captures).

| # | Provision | Publisher (official) | Retrieval route | Version / effective-period evidence | Capture |
| --- | --- | --- | --- | --- | --- |
| R10 | Consumer Reporting Act, R.S.O. 1990, c. C.33 (Ontario): s. 13 (correction of errors) — a consumer may dispute the "accuracy or completeness of any item of information contained in his or her file" and the agency "shall, within a reasonable time and in accordance with any prescribed requirements, use its best endeavours to confirm or complete the information and shall correct, supplement or delete the information in accordance with good practice"; s. 13(2) notification of a correction to persons supplied with a report within 60 days and to specifically designated recipients within one year (personal information) or six months (credit information); s. 14 Registrar orders to obtain proof and documentation and to amend, delete, restrict or prohibit use of information | King's Printer for Ontario, e-Laws, `ontario.ca/laws` | `/laws/statute/90c33` | "Consolidation Period: From July 1, 2026 to the e-Laws currency date. Last amendment: 2025, c. 24, Sched. 6"; s. 13 as amended by 2018, c. 7, s. 7 | FULL for ss. 13 and 14 |

Captured only in part, and therefore recorded as `PARTIAL` rather than counted as pinned:

| # | Provision | Publisher and route | Captured | Not captured |
| --- | --- | --- | --- | --- |
| P1 | 15 U.S.C. 1681c (FCRA § 605) | GPO, `govinfo.gov` — `USCODE-2023-title15-chap41-subchapIII-sec1681c.htm` and the 2022 Edition granule | (a)(1)–(8) verbatim, including (a)(4) "Accounts placed for collection or charged to profit and loss which antedate the report by more than seven years." and (a)(5) "Any other adverse item of information, other than records of convictions of crimes which antedates the report by more than seven years."; (b)(1)–(3) verbatim; the (c) heading and the opening words of (c)(1): "The 7-year period referred to in paragraphs (4) and (6) of subsection (a) shall begin, with respect to any delinquent account that is ..." | the remainder of (c)(1) and all of (c)(2)–(3), and therefore the statutory definition of "date of delinquency"; the Office of the Law Revision Counsel site (`uscode.house.gov`) was unreachable over both HTTP and HTTPS on this channel, and `govinfo.gov` serves no provision-only route for § 605(c) |
| P2 | 15 U.S.C. 1681s-2 (FCRA § 623) | GPO, `govinfo.gov` — `USCODE-2023-title15-chap41-subchapIII-sec1681s-2.htm` | (a)(1)(A) prohibition where the furnisher "knows or has reasonable cause to believe that the information is inaccurate"; (a)(1)(B) prohibition after consumer notice and confirmation of error; (a)(1)(C) address requirement; (a)(1)(D) definition of "reasonable cause to believe that the information is inaccurate"; (a)(1)(E) private-education-loan rehabilitation; part of (a)(1)(F) on COVID-19-era reporting | (a)(2)–(a)(4), the body of (a)(5) (the duty to report the date of delinquency), (a)(6)–(a)(9) and subsections (b) to (e), all of which lay inside the elided middle of the page |
| P3 | Business Practices and Consumer Protection Act (BC), s. 109 "Contents of reports" | King's Printer, Victoria BC — `04002_07` | s. 109(1)(j)–(p) verbatim, including "(m) information about the payment or non-payment of lawfully imposed fines 6 years after the fine was imposed", "(n) information about a legal proceeding 12 months after the date the proceeding began, unless the current status of the proceeding has been ascertained and is included in the report" and "(o) any other information adverse to the individual's interest 6 years after the event that gave rise to the information"; s. 109(2) and s. 109(3) | s. 109(1)(a)–(i) (bankruptcy, judgment, charge and related items) lay inside the elided middle, so British Columbia's bankruptcy and judgment retention figures were not captured |

Publisher pages that returned but did not yield the target provision text follow in §8.2 (final part).

| # | Target | Publisher and route | What the retrieval did establish |
| --- | --- | --- | --- |
| N1 | Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 9(3) retention periods | King's Printer for Ontario, e-Laws — `/laws/statute/90c33` | The Act's page, consolidation period and amendment history were retrieved (consolidation from 1 July 2026; last amendment 2025, c. 24, Sched. 6), and ss. 13–14 were captured, but s. 9 lay outside the capture window, so the owner-supplied Ontario 7-year bankruptcy and 6-year collection figures remain **not verified** |
| N2 | Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, ss. 4 and 5 | King's Printer for Ontario, e-Laws — `/laws/statute/02l24` | Consolidation period (from 4 December 2024) and last amendment (2024, c. 27, Sched. 9) retrieved; the section list confirms ss. 4 (Basic limitation period) and 5 (Discovery) exist, but their text lay outside the capture window, so the two-year period and the discovery rule remain **not verified** |
| N3 | Personal Information Protection and Electronic Documents Act (PIPEDA), federal baseline | Department of Justice Canada — `laws-lois.justice.gc.ca/eng/acts/P-8.6/` | Identity and currency only: "Act current to 2026-09-21 and last amended on 2025-03-04", with the list of amendments and the Schedule 1 CSA-model-code principles. No PIPEDA provision is named in the owner-supplied Canadian rows, so no provision text was targeted or captured |
| N4 | Privacy Act 1988 (Cth), Schedule 1 text on the Register itself | Federal Register of Legislation — `/C2004A03712/latest/text` | Compilation identity confirmed: "Privacy Act 1988 No. 119, 1988 — In force", compilation **C2026C00227 (C104), 04 June 2026**, administered by the Attorney-General's Department and the Treasury. The Act's Schedule 1 text lay outside the capture window, so the pinned APP 10 and APP 13 wording in R6 and R7 rests on the regulator's reproduction, not on this compilation |
| N5 | FCRA statutory text via the FTC | `ftc.gov/legal-library/browse/statutes/fair-credit-reporting-act` | Publisher identity only: the page states the Act is Title VI of the Consumer Credit Protection Act and links a file "Fair Credit Reporting Act (Revised March 2026) (862.51 KB)". That file was **not** retrieved, so it is recorded as an identified version marker, not as retrieval evidence, and it is not relied on anywhere in §8 |
| N6 | Ontario regulation route for Consumer Reporting retention | King's Printer for Ontario, e-Laws — `/laws/regulation/900581` | The route resolved to an unrelated instrument (R.R.O. 1990, Reg. 581, accessible parking for persons with disabilities under the Highway Traffic Act). No consumer-reporting material was retrieved by this route; recorded as a failed route with no evidence value |

### 8.3 Result for each of the twenty-one targeted IDs

`Source found` means an official publisher page for the named provision, or for the instrument named in
the entry, was actually retrieved; it does **not** mean the entry is closed. No ID below changed record
type, catalogue status, governed coverage or finding authority.

| ID | Official source found | Publisher and route | Provision pinned? | Status after PHASE5-001D |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. No CFPB or FTC interpretive material was retrieved, and none was admitted as a rule merely to reduce the gap count. The FTC landing page (N5) confirmed only that a March 2026 FTC-published version of the Act exists |
| `CRP-LSRC-0076` | Yes | GPO, `govinfo.gov` (§ 605 and § 623 granules) | Partial | `GAP_OPEN — DISPOSITION RECORDED` unchanged. § 605(a)(4)–(5) and § 605(b) were pinned verbatim; § 605(c) and § 623(a)(5), the two provisions the entry actually names, are `PARTIAL` (P1, P2). The Equifax-guidance fallback is still **not** adopted and still creates no rule |
| `CRP-LSRC-0077` | Yes | GPO, `govinfo.gov` (`…-sec1681t.htm`) | Yes — § 625(a) and § 625(b)(1)(A)–(K) | `GAP_OPEN — DISPOSITION RECORDED` unchanged, and now source-supported: the retrieved text of § 625(b)(1)(E) preempts state requirements about § 605 subject matter except state law "in effect on September 30, 1996", and § 625(b)(1)(F) preserves only Massachusetts and California provisions. The owner's all-states matrix is not adopted; the survival list remains incomplete and open |
| `CRP-LSRC-0078` | No | — | No | `GAP_OPEN — WILDCARD UNRESOLVED` unchanged. No state or territory was mapped in the owner input, so nothing was retrieved for `US-*`; the session/account-profile route remains not adopted and no rule is entered for `US-*` |

Per-ID results continue in §8.3 (continuation A).

| ID | Official source found | Publisher and route | Provision pinned? | Status after PHASE5-001D |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0310` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The named DFPI administrative guidance and Witkin treatises are secondary material outside the primary-authority scope and were not retrieved; the recorded cross-reference statement stays owner-supplied and unverified |
| `CRP-LSRC-0311` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The named NYDFS guidance and McKinney's commentaries were not retrieved; the named New York State Act remains owner-supplied naming only |
| `CRP-LSRC-0312` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The named Attorney-General opinions and Department of Financial Institutions manuals were not retrieved. Note for the record: the retrieved federal text (R8) shows § 625(b)(1)(E) preserves state law in effect on 30 September 1996, so any Washington medical-debt reporting rule would still have to be located and dated in a primary source; it was not, and it is not restated or generalised here |
| `CRP-LSRC-0321` | Yes, for the named federal baseline only | Department of Justice Canada (N3) | No | `GAP_OPEN — CROSS-LAYER CONFLICT OPEN` unchanged. PIPEDA's identity and currency were retrieved (current to 2026-09-21), but no retrieved provision states any priority, supplement or override relationship between the federal baseline and provincial instruments, and the proposed shortest-window rule is not adopted. No relationship rule is entered |
| `CRP-LSRC-0322` | Yes, in part | King's Printer of BC (`04002_07`), King's Printer for Ontario (`90c33`), Justice Canada (N3) | Partly — only the BC items captured in P3, R9 and R10 | Gap **not** closed. British Columbia's adverse-information (6 years), fine (6 years) and legal-proceeding (12 months) items are now pinned, and Ontario's correction framework is pinned, but no bankruptcy or collection retention figure was verified for any province: BC s. 109(1)(a)–(i) was not captured, Ontario s. 9 was not captured, and the Québec, Manitoba, New Brunswick, Newfoundland and Labrador and Prince Edward Island texts were not retrievable at all (see §8.4). The three territory rows still carry no provision, and the Prince Edward Island chapter conflict (`c. C-18` here against `c. C-20` in `0323`) is unresolved |
| `CRP-LSRC-0323` | Yes, in part | King's Printer of BC (`04002_07`) | Partly — the BC scope provisions in s. 106 to s. 108 and s. 110 to s. 112 | Deliberate non-entry **retained**; no exclusion is applied against any report. The British Columbia scope provisions were retrieved and show who may obtain a report and on what conditions, but Ontario's s. 2, Nova Scotia's s. 2, New Brunswick's s. 2 and Prince Edward Island's s. 2 were not retrieved, so the carve-out analysis remains unverified in four of the four regimes named. The PEI chapter conflict remains unresolved |
| `CRP-LSRC-0324` | Yes, in part | King's Printer for Ontario (`90c33`), King's Printer of BC (`04002_07`), Statute Law Database (R4, R5) | Partly — Ontario s. 13 and s. 14, British Columbia ss. 107–112, UK GDPR Article 5, Consumer Credit Act 1974 ss. 157–159 | Scoping **retained**: bureau-side duties remain out of scope for report-only findings and no dispute, correction or furnisher-response obligation is created. A specific conflict with the entry's parenthetical wording is recorded in §8.4: the retrieved Ontario s. 13(1) requires best endeavours "within a reasonable time", not within 30 days, and the retrieved UK framework runs on 28-day periods. Québec's Civil Code articles 35–40 and the Ontario s. 8 accurate-files duty were not captured or not retrievable |
| `CRP-LSRC-0325` | Yes, in part | King's Printer for Ontario (`02l24`, N2) | No | Wildcard `CA-*` remains unresolved. Only the Ontario and British Columbia pages were reachable; Ontario ss. 4 and 5 were not captured, no British Columbia limitation provision was retrieved, and Québec, Manitoba, New Brunswick, Newfoundland and Labrador, Nova Scotia and Prince Edward Island were not retrievable. No limitation period for any Canadian unit is verified, and the session/account-profile route remains not adopted |

Per-ID results continue in §8.3 (continuation B).

| ID | Official source found | Publisher and route | Provision pinned? | Status after PHASE5-001D |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0395` | Not usable | Nova Scotia Legislature (`nslegislature.ca`, Limitation of Actions Act PDF) | No | Refusal **retained**; `s. 12` and the 2015-06-01 in-force date remain unverified. The publisher returns the Act only as a binary PDF, from which no provision text could be extracted, so the ultimate-limitation-period rationale stays owner-supplied. No collection or reporting block is created |
| `CRP-LSRC-0396` | Yes, for the instrument | King's Printer for Ontario, e-Laws (`02l24`, N2) | No | Refusal **retained**; the retrieved page confirms the instrument, its consolidation period (from 4 December 2024) and its last amendment (2024, c. 27, Sched. 9), and its contents list confirms ss. 4, 5 and 15 exist, but ss. 5 and 15 were not captured. The discovery-start and ultimate-ceiling rationale therefore stays owner-supplied, and the recorded 2026-09-17 owner direction is unaffected |
| `CRP-LSRC-0397` | No | LégisQuébec (`legisquebec.gouv.qc.ca`) returned HTTP 403 on the Civil Code document route and on an article-level route | No | Refusal **retained**; arts. 2898 and 2925 and the 1994-01-01 in-force date remain unverified. Interruption analysis is still required and no automatic reset on payment is assumed anywhere |
| `CRP-LSRC-0398` | No | `princeedwardisland.ca` returned a bot-verification interstitial, and the legislation PDF route returned HTTP 404 | No | `GAP_CLOSED_RELATIONSHIP_DECISION — NO DUPLICATE RULE` unchanged. The Limitation of Actions Act, R.S.P.E.I. 1988, c. L-15, ss. 2(1)(e) and 2(1)(g) could not be retrieved, so the no-duplicate-rule relationship remains owner-supplied; no duplicate or overlapping rule is created, and the separate Consumer Reporting Act chapter conflict (`c. C-18` against `c. C-20`) is still unresolved |
| `CRP-LSRC-0412` | Yes — all three nations | Statute Law Database, `legislation.gov.uk` (R1, R2, R3) | Yes — Limitation Act 1980 s. 5; Prescription and Limitation (Scotland) Act 1973 s. 6; Limitation (Northern Ireland) Order 1989 art. 4 | **Materially advanced, still open at country level.** For the first time the three owner-supplied nation-level mappings are verified against official text, and each is consistent with what the owner document stated: England and Wales six years and expressed as a bar on bringing the action; Scotland five years and expressed as **extinguishing** the obligation; Northern Ireland six years and expressed as a bar on bringing the action. The bare `UK` token still identifies no single nation, Wales is still not separately identified, and no country-level rule is entered — so the entry stays `GAP_OPEN — COUNTRY TOKEN UNRESOLVED` |

Per-ID results continue in §8.3 (continuation C).

| ID | Official source found | Publisher and route | Provision pinned? | Status after PHASE5-001D |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0413` | Yes for the cited base; not applicable to CRAIN | King's Printer of Acts of Parliament (`legislation.gov.uk`), R4 | Yes for UK GDPR Article 5(1)(c) and 5(1)(e) | Row stays **unverified**. The cited base is now pinned, and the retrieved Article 5 addresses minimisation and storage limitation as general processing principles: neither subparagraph mentions credit searches, search visibility or any retention period, and no 12-month or 12-to-24-month figure appears anywhere in Article 5. CRAIN remains an industry notice outside the primary-authority scope and was not retrieved, so the 12-month figure is still not a statutory rule and no search-visibility rule is entered |
| `CRP-LSRC-0435` | No | Attempted against each state's official legislation publisher | No | Wildcard `AU-*` remains unresolved. New South Wales returned HTTP 403; Victoria, Queensland and Tasmania returned HTTP 404 on the current-reprint routes; the Northern Territory publisher served a JavaScript document viewer with no retrievable text; the Australian Capital Territory route resolved to a different, repealed 1985 instrument rather than the Limitation Act 1985 (ACT). Western Australia and South Australia were not attempted once that block pattern was established across six jurisdictions, and are recorded here as **unreviewed** rather than as clean. No Australian period or remedy-bar / extinguishment label is verified, and the session/account-profile route remains not adopted |
| `CRP-LSRC-0436` | Yes | Office of the Australian Information Commissioner (R6, R7); Federal Register of Legislation for the compilation identity (N4) | Yes — APP 10.1–10.2 and APP 13.1–13.5 as reproduced by the regulator | Text gap **partly closed**: the APP 10 and APP 13 wording is no longer only an owner-supplied description, and the "typically 30 days" qualification is now source-resolved — 30 days is the statutory response period for an **agency**, while an **organisation** must respond "within a reasonable period" and must not charge (R7). Version caution: the regulator's reproduction is dated 25 July 2022 while the Act's current compilation is C2026C00227 of 4 June 2026, and this work order did **not** establish that Schedule 1 wording is identical across the two, so the entry stays `GAP_OPEN` on that point. No correction request or dispute workflow is implemented and no provider or bureau conduct is inferred |
| `CRP-LSRC-0437` | No | Federal Register of Legislation and OAIC routes attempted | No | Gap remains **open**. The register entry for the Privacy (Credit Reporting) Code 2024 was not located: the Federal Register search route returned unfiltered results rather than the title, the OAIC credit-reporting-code routes returned HTTP 404, and the Act's interactions tab lists only amending Acts. No Code provision text and no pinpoint locator were obtained, so ss. 16, 20 and 21 remain unverified and no Code rule is entered |

### 8.4 Material divergences and conflicts found in the retrieved sources

Each item below is a factual difference between the retrieved official text and something recorded in
this register or in the catalogue under `PHASE5-001C`. Per the work order the owner-approved decision is
**preserved** in every case, the conflict is recorded, and no disposition is changed unilaterally.

1. **Ontario bureau-side correction — "30-day dispute investigation framework" is not supported.**
   `CRP-LSRC-0324` (and §3.8) describes the Ontario Consumer Reporting Act as containing "s. 13 (30-day
   dispute investigation framework)". The retrieved current text of s. 13(1), as amended by 2018, c. 7,
   s. 7, requires the agency to use its best endeavours "within a reasonable time and in accordance with
   any prescribed requirements" and to correct, supplement or delete information "in accordance with good
   practice". No 30-day period appears in s. 13. The 30-day figures that do appear in the retrieved
   Canadian material sit elsewhere: Ontario's Registrar may order production "in a reasonable time
   period" (s. 14), and British Columbia requires a notice of denial under s. 110 "not later than 30 days
   after the decision was made". The provision remains deliberately not entered, and the parenthetical
   description is recorded as unverified pending owner direction.

Divergences 2 to 6 follow.

2. **Australia — "typically 30 days" is agency-specific, not a general deadline.** `CRP-LSRC-0436`
   records correction as described as due within a reasonable timeframe, "typically 30 days for credit
   reporting data". The retrieved APP 13.5 gives an agency 30 days and an organisation "a reasonable
   period", and prohibits charging. The owner description is therefore best read as an agency rule, and no
   unconditional 30-day deadline is entered for organisations or for furnishers.
3. **United States — § 625(b)(1)(E) does not support an all-states baseline.** `CRP-LSRC-0077` records an
   owner-supplied federal-baseline matrix proposed to apply to all states under § 625(b)(1)(E). The
   retrieved text shows (b)(1)(E) is a **preemption** provision: no state requirement or prohibition may
   be imposed about § 605 subject matter, saving only state law "in effect on September 30, 1996", while
   § 625(b)(1)(F) preserves only two identified state provisions (Massachusetts and California) for
   § 623 furnisher duties. The owner's non-adoption is corroborated by the source, the survival list
   remains incomplete, and no universal rule is created.
4. **United Kingdom — the retrieved correction framework runs on 28-day periods.** `CRP-LSRC-0324` cites
   the Consumer Credit Act 1974 ss. 157 to 159 as a "disclosure and correction framework". The retrieved
   text of s. 159 uses consecutive 28-day periods (s. 159(2), (3) and (4)) and a 200-word limit on the
   consumer's notice of correction, so any 30-day figure would be an assumption rather than a statutory
   one. Those provisions remain out of scope and are not entered.
5. **Version caution on the cited UK GDPR base.** The retrieved Article 5 has been amended by the Data
   (Use and Access) Act 2025 with effect from 5 February 2026 (words in Article 5(1)(e) substituted, and a
   new Article 5(3) inserted). The cited base in `CRP-LSRC-0413` should therefore be read as the currently
   amended Article 5, and any reliance on an earlier reading of 5(1)(e) is superseded.
6. **No divergence was found in the UK limitation mapping.** The three retrieved limitation provisions are
   consistent with the owner-supplied periods and legal-effect labels in §3.4, including the distinctive
   Scottish extinguishment wording. Consistency is not adoption, however: no rule is entered for `0412`.

### 8.5 Source-record counts, kept separate from unique legal provisions

| Measure | Count | Basis |
| --- | --- | --- |
| Retrieval requests issued for this work order | 52 | Every HTTP request recorded in §8, including failed and duplicate routes |
| Source records counted: pages that returned provision-relevant content from an official publisher | 24 | Counted per successful retrieval, so the same provision retrieved twice (for example as `data.xml` and `data.html`) counts as two source records |
| Source records where the publisher page returned but the target provision was not captured | 6 | Records `N1` to `N6` |
| Requests that were blocked, not found, binary-only, JavaScript-only, search-noise, or resolved to a different instrument | 28 | Includes the unreachable Law Revision Counsel site, three `govinfo.gov` path errors, six Australian state publishers, Québec, Manitoba, Newfoundland and Labrador, New Brunswick, Prince Edward Island and Nova Scotia |
| **Unique legal provisions fully captured** | **18** | UK: Limitation Act 1980 s. 5; Prescription and Limitation (Scotland) Act 1973 s. 6; Limitation (Northern Ireland) Order 1989 art. 4; UK GDPR art. 5; Consumer Credit Act 1974 ss. 157, 158 and 159. Australia: Privacy Act 1988 Sch. 1 APP 10 and APP 13. United States: 15 U.S.C. 1681t. Canada: BPCPA ss. 106, 107, 108, 110, 111 and 112; Ontario Consumer Reporting Act ss. 13 and 14 |
| **Unique legal provisions partially captured** | **3** | 15 U.S.C. 1681c (subsection (c) incomplete); 15 U.S.C. 1681s-2 (subsection (a)(5) and others incomplete); BPCPA s. 109 (subsection (1)(a) to (i) incomplete). These are counted as `PARTIAL` and are **not** included in the 18 |
| Entries whose disposition changed as a result of this work order | 0 | All twenty-one IDs keep their `PHASE5-001C` status; the retrievals are recorded evidence, not dispositions |
| Governed legal coverage after this work order | 0 | No rule, coverage or finding authority was created |
| Permitted legal findings after this work order | 0 | Neither the catalogue nor this register can produce a `VIOLATION` or `PROBABLE_VIOLATION` |

A source record is not a provision and a provision is not a rule: 24 retrieved pages and 18 fully captured
provisions produced no governed rule and closed no gap by themselves.

### 8.6 Authority statement after PHASE5-001D

No runtime behaviour, evaluator, unit test, consumer workflow, API surface, governed legal rule, legal
coverage, permitted legal finding or discovery registry was created, modified or authorised by this work
order. All twenty-one targeted IDs keep the record types and statuses recorded under `PHASE5-001C`, no
entry was converted into a rule, and governed legal coverage and permitted legal findings both remain
**0**. The uploaded credit report remains the only consumer-evidence source, the off-report route that
would resolve a wildcard or a bare country token from the locked session jurisdiction or the account
profile is still **not adopted**, and no retrieval in §8 supplies a report-specific fact. A retrieval
changed only this register's evidence record — it did not change what either document is allowed to do.

### 8.7 Remaining owner decisions

1. `CRP-LSRC-0076` — accept `PARTIAL` for § 605(c) and § 623(a)(5), or authorise another official route
   (the Law Revision Counsel site is unreachable and `govinfo.gov` serves no provision-level page for
   § 605(c)). The Equifax-guidance fallback stays not adopted either way.
2. `CRP-LSRC-0077` — authorise which state content rules to research, if any; each surviving state law
   would need its own primary retrieval and a date-in-force test against 30 September 1996.
3. `CRP-LSRC-0078` — supply or refuse a state or territory mapping; the session/account-profile route
   remains not adopted.
4. `CRP-LSRC-0322` — resolve the Prince Edward Island chapter conflict (`c. C-18` against `c. C-20`);
   supply provisions for Yukon, the Northwest Territories and Nunavut; and authorise alternative official
   routes for Québec (403), Manitoba (retired link), New Brunswick (document absent), Newfoundland and
   Labrador (404), Prince Edward Island (bot verification) and Nova Scotia (PDF only).
5. `CRP-LSRC-0323` and `CRP-LSRC-0324` — decide whether the "30-day dispute investigation framework"
   description of Ontario s. 13(1) should be corrected to the retrieved wording, and whether Québec's
   Civil Code articles 35 to 40 and Ontario's s. 8 accurate-files duty should be pursued at all.
6. `CRP-LSRC-0325` and `CRP-LSRC-0435` — authorise a retrieval route that works for the blocked
   publishers, or confirm that both wildcards stay unresolved.
7. `CRP-LSRC-0395`, `0396` and `0397` — accept "instrument confirmed, provision not captured" for Ontario
   and "not retrievable" for Nova Scotia and Québec, or authorise another official route.
8. `CRP-LSRC-0398` — confirm that the no-duplicate-rule relationship stands on the owner's reading alone,
   since the Prince Edward Island statute could not be retrieved.
9. `CRP-LSRC-0412` — decide whether the verified nation-level mapping is sufficient while the bare `UK`
   token remains unresolved; making the token answerable requires a nation-selection rule, which is an
   owner decision and not something a source retrieval can supply.
10. `CRP-LSRC-0413` — decide whether CRAIN stays recorded-but-unverified, noting that the retrieved
    Article 5 contains no 12-month or 12-to-24-month search-visibility or retention rule.
11. `CRP-LSRC-0435` — Western Australia and South Australia are **unreviewed**; authorise those two
    retrievals or record them as deliberately skipped.
12. `CRP-LSRC-0436` — decide whether the regulator's 25 July 2022 reproduction is acceptable evidence, or
    whether Schedule 1 must be pinned to compilation C2026C00227 before the text gap is treated as closed.
13. `CRP-LSRC-0437` — supply the Privacy (Credit Reporting) Code 2024 register ID or an official copy, as
    the register entry could not be located from the official sites reachable in this work order.

### 8.8 Next unreviewed cohort

The next cohort is the set of publishers that blocked retrieval in this work order: the Canadian
provincial and territorial legislation sites (Québec, Manitoba, New Brunswick, Newfoundland and Labrador,
Prince Edward Island, Nova Scotia, Alberta and Saskatchewan) and the Australian state and territory
limitation publishers (New South Wales, Victoria, Queensland, Western Australia, South Australia,
Tasmania, the Northern Territory and the Australian Capital Territory), approached through alternative
official routes or official print/PDF captures. After that, the remaining FCRA subsections (§ 605(c),
§ 623(a)(2) to (a)(5)) need an official route that serves provision-level text, and the Privacy (Credit
Reporting) Code 2024 needs a located register entry. No entry outside the twenty-one targeted IDs was
reviewed or touched by this work order.

## 9. Register digests and verification

Register SHA-256 at completion of `PHASE5-001C`, as recorded in §7:
`ABDC7484253449F9F9901E2E428C2DF5D7E4692B227CDD1B57FE02394B28BDAC`

That value covered the first 349 lines of this register as it stood at the end of `PHASE5-001C`. Because
`PHASE5-001D` appends §8 and §9 after that point, the register no longer ends at line 349, so the value
can no longer be reproduced from this file alone; it is retained unchanged as a historical record, and
`PHASE5-001D` altered no line of §1 to §7. The register's full-file SHA-256 immediately before this work
order's edits was `A49F99DC5BB643AB037D7E73189E8E42DAC91C04399AA712F49FDE7B28CE8D53`, which identifies the
pre-`PHASE5-001D` state from which the `PHASE5-001C` value is reproducible; that state carried the same
digest method note as before, namely: the value covered every byte up to and including the blank line
preceding its digest line, hashed as UTF-8 without a BOM with CRLF line endings, 349 lines and 42,173
bytes. The catalogue's hash for this phase is unchanged because `PHASE5-001D` amended no catalogue entry
field: `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`.


Register SHA-256 at completion of `PHASE5-001D`: `EB459C428FFCEB7CC6BC5BE93415F03E69EF7090EFB4DB45C6ACADED1B26E99D`

Digest method for the PHASE5-001D value: it covers every line of this register up to and including the last blank line that precedes this digest line, that is all of section 1 to section 9 as amended by PHASE5-001D, including the retained PHASE5-001C digest statement above. It deliberately excludes this digest line, the blank line after it and this note, which keeps the value stable and non-circular. To verify, delete everything from the start of this digest line to the end of the file, then hash the remainder as UTF-8 without a BOM with CRLF line endings: 610 lines and 84,280 bytes.

## 10. PHASE5-001E — continuing official retrieval and owner decisions

### 10.1 Method, evidence rules and new structural findings

This work order continues §8 under the same evidence rules: a record counts as **retrieved** only where the
publisher page returned *and* the target provision text was captured; a page that returned without the
provision is `PARTIAL`; a blocked, absent, binary-only or JavaScript-only route is `NOT RETRIEVED`. Search
snippets, summaries, agency guidance, law-firm material and the owner-supplied citations were again **not**
admitted as evidence, and no retrieval below creates a governed rule, legal coverage, finding authority,
jurisdiction resolution or closure of a refusal. Retrieval date for every record below: **2026-09-30**.
Requests issued in this work order: **35**, counted per HTTP request, so where a publisher was probed through
several forms of the same address each form is counted separately and the count exceeds the number of distinct
records. Publishers used: the U.S. Government Publishing Office
(`govinfo.gov`), the Federal Trade Commission, the Federal Register of Legislation and the Office of the
Australian Information Commissioner, the Western Australian Parliamentary Counsel's Office, the South
Australian Attorney-General's Department, the Queensland Parliamentary Counsel, the Manitoba Queen's
Printer, the Ontario King's Printer (e-Laws), the Nova Scotia Legislative Counsel, the New Brunswick
Queen's Printer, the Newfoundland and Labrador Queen's Printer, the California Legislative Counsel, the
Massachusetts General Court and the New York State Senate.

Three structural findings about the retrieval channel and the publishers were established, and they are
recorded as findings about the channel, not about any law:

- **Official PDF routes are locatable but not capturable.** The Nova Scotia Legislative Counsel serves its
  consolidated statutes as official PDFs. Two were requested; both returned HTTP 200 with
  `Content-Type: application/pdf` (215,628 bytes for the Limitation of Actions Act and 351,156 bytes for the
  Consumer Reporting Act), but the body was a binary PDF object stream, so provision text is **not
  extractable through this channel**. An official print or PDF copy can therefore be *located* without being
  *captured*. Every item whose publisher is PDF-only is recorded `NOT RETRIEVED — OFFICIAL PDF LOCATED, NOT
  CAPTURED`, and nothing in this section is reconstructed from memory or from a non-official source.
- **Search engines remain unusable as locators.** Two Bing requests returned an AI-generated dictionary and
  thesaurus result set about the word "limitation", with no publisher URL. No search result was used to
  construct any record below; the Manitoba, Newfoundland and Labrador and California routes were reached by
  direct publisher URL construction only.
- **The Australian compilation route has two faces.** The bare and `/latest/text` forms of the compilation
  ID returned "The requested title could not be loaded", while the `/Details/` form of the same ID served
  the record. This is recorded because it governs what counts as a retrieval: the record identity and its
  table of contents were captured, the Schedule 1 wording was not.

Per-ID results, newly captured provisions, conflicts and remaining decisions follow in §10.2 to §10.7.

### 10.2 Retrieval ledger for PHASE5-001E

| Route requested | Official publisher | Outcome | Result class |
| --- | --- | --- | --- |
| `govinfo.gov` granule `USCODE-2023-title15-…-subchapIII-sec1681c.htm` | U.S. Government Publishing Office | Page returned. § 605(a)(1)–(8), § 605(b) and the § 605(c) heading with its opening sentence captured; the rest of § 605(c) lay in the elided middle of the capture window | `PARTIAL` |
| `govinfo.gov` granule `USCODE-2023-title15-…-subchapIII-sec1681s-2.htm` | U.S. Government Publishing Office | Page returned. § 623(a)(1)(A)–(F) and the amendment notes captured, including the note describing the 2003 change to § 623(a)(5) that inserted the date-of-delinquency words and added subparagraph (B); the operative text of § 623(a)(5) lay in the elided middle | `PARTIAL` |
| `uscode.house.gov` pinpoint granules for § 1681c and § 1681s-2 (two requests) | Office of the Law Revision Counsel | Both failed at the network layer (`fetch failed`), as in §8 | `NOT RETRIEVED` |
| FTC Legal Library record "Fair Credit Reporting Act" | Federal Trade Commission | Record returned. It offers the Act as a **file only** — "Fair Credit Reporting Act (Revised March 2026) (862.51 KB)" — and serves no section-level HTML text of the Act | `NOT RETRIEVED` (route identity captured) |
| `legislation.gov.au/C2026C00227` with its `/latest/text` and `/latest/downloads` forms | Federal Register of Legislation | "The requested title could not be loaded" on all three forms | `NOT RETRIEVED` |
| `legislation.gov.au/Details/C2026C00227` | Federal Register of Legislation | **Record returned**: "Privacy Act 1988 No. 119, 1988", status "In force", register ID `C2026C00227`, compilation `C104`, dated 04 June 2026, with the compilation table of contents | `PARTIAL` |
| `legislation.gov.au/Details/C2026C00227/Text` and `/Downloads` (two requests) | Federal Register of Legislation | HTTP 404 "Page not found" on both | `NOT RETRIEVED` |
| `legislation.gov.au/search?q=Privacy (Credit Reporting) Code 2024` | Federal Register of Legislation | Search page returned 132,478 unfiltered results with no matching record, as in §8 | `NOT RETRIEVED` |
| OAIC privacy codes register | Office of the Australian Information Commissioner | Register page returned and lists "Privacy (Credit Reporting) Code 2024" among the current codes, with the OAIC's own statement of what a CR code does | `PARTIAL` (identity only) |
| OAIC detail page for the Privacy (Credit Reporting) Code 2024 | Office of the Australian Information Commissioner | HTTP 404 | `NOT RETRIEVED` |
| `legislation.wa.gov.au` alpha index, site search and home page (three requests) | Parliamentary Counsel's Office, Western Australia | Alpha index retired ("Unknown URL … no longer available"); search route HTTP 404; home page returned and named the publisher but rendered navigation labels without usable URLs | `NOT RETRIEVED` |
| `legislation.sa.gov.au` consolidated path and root (two requests) | Attorney-General's Department, South Australia | HTTP 403 on both | `NOT RETRIEVED` |
| `legislation.qld.gov.au/…/act-1974-009` | Office of the Queensland Parliamentary Counsel | HTTP 404 | `NOT RETRIEVED` |
| Nova Scotia Limitation of Actions Act and Consumer Reporting Act PDFs (two requests) | Nova Scotia Legislative Counsel | HTTP 200, `Content-Type: application/pdf` (215,628 and 351,156 bytes), binary body, no extractable text | `NOT RETRIEVED — OFFICIAL PDF LOCATED, NOT CAPTURED` |
| `nslegislature.ca/legc/statutes/limitation of actions.htm` | Nova Scotia Legislative Counsel | HTTP 404 — no HTML route | `NOT RETRIEVED` |
| `web2.gov.mb.ca/laws/statutes/ccsm/l150e.php` | Manitoba Laws, Queen's Printer | Outdated-link notice; the site was re-laid out on 1 May 2023 | `NOT RETRIEVED` (pointer captured) |
| `web2.gov.mb.ca/laws/statutes/ccsm/l150.php` | Manitoba Laws, Queen's Printer | **Page returned**: "The Limitations Act, C.C.S.M. c. L150", with currency statement and table of contents | `PARTIAL` |
| `laws.gnb.ca/en/showdoc/cs/2014-31` | New Brunswick Queen's Printer | "The document does not exist in the database" | `NOT RETRIEVED` |
| `laws.gnb.ca/en/showdoc/cs/C-19` | New Brunswick Queen's Printer | Resolved to the Contributory Negligence Act — a different, repealed instrument, not the target | `NOT RETRIEVED` |
| `laws.gnb.ca/en/display/statutes` | New Brunswick Queen's Printer | "Page Not Found" | `NOT RETRIEVED` |
| `legisquebec.gouv.qc.ca/en/document/cs/CCQ-1991` | Éditeur officiel du Québec | HTTP 403 | `NOT RETRIEVED` |
| `princeedwardisland.ca/en/legislation/consumer-reporting-act` | Government of Prince Edward Island | Radware bot interstitial ("Verifying your browser before proceeding"), as in §8 | `NOT RETRIEVED` |
| `ontario.ca/laws/statute/90c33` | King's Printer for Ontario (e-Laws) | **Page returned**: currency statement, full table of contents, s. 1, s. 13 and s. 14 captured; ss. 2 and 8 lay in the elided middle | `PARTIAL` |
| `ontario.ca/laws/statute/02l24` | King's Printer for Ontario (e-Laws) | **Page returned**: currency statement, full table of contents and s. 2 captured; ss. 4, 5 and 15 lay in the elided middle | `PARTIAL` |
| `leginfo.legislature.ca.gov` Civil Code §§ 1785.10 and 1785.13 (two requests) | Legislative Counsel of California | **Both returned in full** | `RETRIEVED` |
| `malegislature.gov` G.L. c. 93, §§ 50 and 52 (two requests) | General Court of Massachusetts | **Both returned in full** | `RETRIEVED` |
| `nysenate.gov/legislation/laws/GBS/380-J` | New York State Senate | HTTP 403 | `NOT RETRIEVED` |
| `assembly.nl.ca/Legislation/sr/statutes/l16-1.htm` | Queen's Printer, Newfoundland and Labrador | **Page returned**: official-version statement, amendment history, commencement and the full section analysis captured; the operative text of ss. 5 to 8 and 22 lay in the elided middle | `PARTIAL` |
| Bing locator requests for the Western Australian and South Australian Acts (two requests) | — (search engine, not a publisher) | AI-generated dictionary and thesaurus results for the word "limitation", with no publisher URL | `NOT RETRIEVED` |

Counts, kept separate from provisions as §8.1 and §8.5 require: 35 requests issued; **12 returned content
bearing on a targeted provision's text, heading or record identity** (the two federal section granules, the
two Ontario consolidations, the Manitoba and Newfoundland and Labrador consolidations, the four California and
Massachusetts sections, the Federal Register compilation record and the OAIC codes register); **4 returned only
a route-status notice** (a different repealed New Brunswick Act, a retired Manitoba pointer, the Western
Australian publisher's home page and the FTC file-only route); and the remaining 19 requests were blocked,
absent, binary-only, JavaScript-only or search noise, of which two were official PDFs that this channel cannot
read. Because several publishers were probed through more than one form of their address, the request count
exceeds the record count: the 16 content-bearing returns correspond to **8 distinct provisions captured in
whole or in part**, the rest being heading-level, record-identity or route-status findings. **Record counts are
not provision counts.**

### 10.3 Provisions and provision headings newly captured from official publishers

**A. United States federal — 15 U.S.C. 1681c (§ 605(c)) and 1681s-2 (§ 623(a)(5)), both still partial.**
Publisher: U.S. Government Publishing Office, `govinfo.gov`, "United States Code, 2023 Edition", whose own
header line reads "U.S.C. Title 15 - COMMERCE AND TRADE … Sec. 1681c - Requirements relating to information
contained in consumer reports / From the U.S. Government Publishing Office, www.gpo.gov". The subsection is
headed "Running of reporting period" and the capture ends inside the first sentence of paragraph (1):
"(c) Running of reporting period (1) In general The 7-year period referred to in paragraphs (4) and (6) of
subsection (a) shall begin, with respect to any delinquent account that is". The remainder of paragraph (1)
and paragraph (2) lie beyond the capture window, so § 605(c) stays `PARTIAL` and must not be quoted further.
For § 623(a)(5) the operative text was again out of reach; what was newly captured is the official amendment
note in that section's own note block: "Subsec. (a)(5). Pub. L. 108-159, §312(d), designated existing
provisions as subpar. (A), inserted heading, inserted "date of delinquency on the account, which shall be
the" before "month" and "on the account" before "that immediately preceded", and added subpar. (B)." That
note evidences the shape of § 623(a)(5) — a date-of-delinquency requirement in subparagraph (A) and an added
subparagraph (B) — without being operative text, and it is recorded as a note, never as a provision. The
route set is now exhausted as follows: the govinfo section granules truncate the two target subsections;
`uscode.house.gov` is unreachable from this channel; the FTC publishes the Act as a file only. Both
provisions therefore remain **unretrieved in operative form**, the Equifax-guidance fallback remains **not
adopted**, and no rule is entered.

**B. California — Civil Code §§ 1785.10 and 1785.13, captured in full.** Publisher: Legislative Counsel of
California, `leginfo.legislature.ca.gov`. Both sit inside "TITLE 1.6. CONSUMER CREDIT REPORTING AGENCIES ACT
[1785.1 - 1785.36] ( Title 1.6 repealed and added by Stats. 1975, Ch. 1271. )" and "CHAPTER 2. Obligations
of Consumer Credit Reporting Agencies … ( Chapter 2 added by Stats. 1975, Ch. 1271. )". Section 1785.10(a):
"Every consumer credit reporting agency shall, upon request and proper identification of any consumer, allow
the consumer to visually inspect all files maintained regarding that consumer at the time of the request."
Its history line reads "(Repealed (in Sec. 1) and added by Stats. 2002, Ch. 9, Sec. 2. Effective February 19,
2002. Section operative January 1, 2003, by its own provisions.)". Section 1785.13(a) reads "No consumer
credit reporting agency shall make any consumer credit report containing any of the following items of
information:", followed by (1) "Bankruptcies that, from the date of the order for relief, antedate the report
by more than 10 years."; (2) "Suits and judgments that, from the date of entry or renewal, antedate the report
by more than seven years or until the governing statute of limitations has expired, whichever is the longer
period."; (4) "Paid tax liens that, from the date of payment, antedate the report by more than seven years.";
(5) "Accounts placed for collection or charged to profit and loss that antedate the report by more than seven
years."; (6) "Records of arrest, indictment, information, misdemeanor complaint, or conviction of a crime
that, from the date of disposition, release, or parole, antedate the report by more than seven years."; (7)
"Medical debt."; (8) "Any other adverse information that antedates the report by more than seven years."
Subsection (b) provides that the seven-year period in paragraphs (5) and (8) "shall commence to run … upon
the expiration of the 180-day period beginning on the date of the commencement of the delinquency that
immediately preceded the collection activity, charge to profit and loss, or similar action", and subsection
(d) that "A consumer credit report shall not include any adverse information concerning a consumer
antedating the report by more than 10 years or that otherwise is prohibited from being included in a
consumer credit report." Its history line reads "(Amended by Stats. 2024, Ch. 520, Sec. 2. (SB 1061)
Effective January 1, 2025.)".

**C. Massachusetts — G.L. c. 93, §§ 52 and 50, captured in full.** Publisher: General Court of
Massachusetts, `malegislature.gov` (page dated "September 30, 2026"). Section 52 is headed "Information not
to be contained in consumer report; exceptions" and reads "(a) Except as authorized under subsection (b) no
consumer reporting agency shall make any consumer report containing any of the following items of
information:" — (1) "Bankruptcies which, from date of adjudication of the most recent bankruptcy, antedate
the report by more than fourteen years."; (2) suits and judgments more than seven years "or until the
governing statute of limitations has expired, whichever is the longer period"; (3) paid tax liens more than
seven years from date of payment; (4) accounts placed for collection or charged to profit and loss antedating
the report by more than seven years; (5) records of arrest, indictment, or conviction of crime more than
seven years from disposition, release or parole; (6) "Any other adverse item of information which antedates
the report by more than seven years."; (7) "Eviction records sealed pursuant to section 16 of chapter 239."
Subsection (b) disapplies subsection (a) for a credit transaction "involving, or which may reasonably be
expected to involve, a principal amount of fifty thousand dollars or more" and for life-insurance
underwriting of the same amount. Section 50 is the definitions section ("As used in this section and
sections fifty-one through sixty-seven, inclusive, the following words shall have the following meanings")
and defines "consumer report" for that chapter. The publisher serves **no enactment or amendment history
note**, so no effective date for § 52 is established by the retrieved source.

**D. Canada — four publisher routes returned, two of them carrying provision headings.** (i) Ontario, King's
Printer for Ontario (`ontario.ca/laws`): the Consumer Reporting Act page states "Consolidation Period: From
July 1, 2026 to the e-Laws currency date. Last amendment: 2025, c. 24, Sched. 6", and its table of contents
lists "2. Registrar", "8. To whom reports may be given" and "13. Correction of errors"; the Limitations
Act, 2002 page states "Consolidation Period: From December 4, 2024 to the e-Laws currency date. Last
amendment: 2024, c. 27, Sched. 9" and its table of contents lists "4. Basic limitation period", "5.
Discovery" and "15. Ultimate limitation periods". (ii) Manitoba, Queen's Printer (`web2.gov.mb.ca`): the
page returned as "C.C.S.M. c. L150 / The Limitations Act", enacted by "SM 2021, c. 44", in force 30 September
2022, stating "This is an unofficial version. If you need an official copy, use the bilingual (PDF) version.
This version is current as of September 25, 2026. It has been in effect since May 30, 2023.", and its table
of contents lists "6 Basic limitation — 2 years from discovery" and "10 Ultimate limitation". (iii)
Newfoundland and Labrador, Queen's Printer (`assembly.nl.ca`): the page returned as "SNL1995 CHAPTER L-16.1
LIMITATIONS ACT", stating "This is an official version. Copyright © 2024: Queen's Printer, St. John's,
Newfoundland and Labrador, Canada", amended last by "2024 c13", brought into force on "Apr. 1/96", with a
section analysis listing "5. Limitation period 2 years", "6. Limitation period 6 years", "7. Limitation
period 10 years", "8. No limitation period", "17. Extinguishment of rights" and "22. Ultimate limitation".
In each case the operative wording of the listed sections fell in the elided middle of the capture window, so
these are recorded as **heading-level retrievals from official publishers, not as captured provision text**.
(iv) Nova Scotia: the official PDFs returned but were unreadable, so the Nova Scotia citations remain
unverified.

**E. Australia — compilation identity and code register identity, without the wording.** (i) The Federal
Register of Legislation record page for the compilation returned as "Privacy Act 1988 No. 119, 1988", status
"In force", register ID `C2026C00227`, compilation `C104`, dated **04 June 2026**, and its own table of
contents lists "Part 4—Integrity of personal information: 10 Australian Privacy Principle 10—quality of
personal information, 11 …" and "Part 5—Access to, and correction of, personal information: 13 Australian
Privacy Principle 13—correction of personal information". The Schedule 1 **wording** was not captured, so
the 2022 regulator reproduction remains the only captured text and the identity of the 2026 wording is still
unproven. (ii) The OAIC privacy codes register returned and lists "Privacy (Credit Reporting) Code 2024"
among the current codes, alongside the 2014 versions, and states the OAIC's own framework: "The Privacy Act
also requires the development of a code of practice about credit reporting, called the CR code." The Code's
own text, pinpoint sections and commencement were not obtained, and the OAIC detail page for the Code
returned HTTP 404.

### 10.4 Per-ID results for PHASE5-001E (continuation D of §8.3)

| ID | Official source found | Publisher and route | Provision captured? | Resulting status after PHASE5-001E |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | Not targeted by design | FTC Legal Library route probed only to test whether the FTC serves provision-level statutory text of the Act | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The FTC serves the Act as a file only ("Revised March 2026"), so no interpretive or secondary material was retrieved or admitted and the scope decision is not reopened |
| `CRP-LSRC-0076` | Yes, still partial | GPO `govinfo.gov`, both section granules; `uscode.house.gov` and the FTC route attempted | **Partly**: the § 605(c) heading and its opening sentence, and the official §312(d) note describing the 2003 change to § 623(a)(5); the operative text of § 605(c) paragraph (1) onward and of § 623(a)(5) is not captured | `GAP_OPEN — DISPOSITION RECORDED` unchanged. The proposal to fall back on Equifax Notice to Furnishers guidance remains **not adopted** and still creates no rule; the evidence-reachability gap stays open |
| `CRP-LSRC-0077` | Yes, for two named states and for the first time at provision level | California Legislative Counsel (`leginfo.legislature.ca.gov`); Massachusetts General Court (`malegislature.gov`) | Yes: Cal. Civ. Code §§ 1785.10 and 1785.13 and Mass. G.L. c. 93 §§ 52 and 50, all in full | `GAP_OPEN — DISPOSITION RECORDED` unchanged. The all-states matrix is still **not adopted** and no state rule is entered. The surviving-state list is now partly evidenced but still incomplete: California's Title 1.6 entered law by Stats. 1975, Ch. 1271, so it was in effect before 30 September 1996, yet its retrieved text was amended with effect from 1 January 2025; the Massachusetts page carries no history note at all. A precise question is recorded for the owner in §10.5 |
| `CRP-LSRC-0078` | No | — | No | `GAP_OPEN — WILDCARD UNRESOLVED` unchanged. No state or territory mapping exists to retrieve against, `US-*` remains unresolved, and the session/account-profile route remains not adopted |
| `CRP-LSRC-0310` | Not targeted by design | The California route was used for `CRP-LSRC-0077`, not for this entry | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. DFPI administrative guidance and Witkin treatises remain unretrieved, unadmitted and unlocated; no authority record is created |
| `CRP-LSRC-0311` | No | `nysenate.gov/legislation/laws/GBS/380-J` returned HTTP 403 | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. Neither NYDFS guidance, the McKinney's commentaries nor the named State Act were retrieved; the New York route is now recorded as attempted and blocked |
| `CRP-LSRC-0312` | No | No United States Washington-state route was attempted in this work order; the separate Western Australia attempts are recorded under `CRP-LSRC-0435` and are unrelated | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The note recorded in §8.3 stands: § 625(b)(1)(E) saves only state law in effect on 30 September 1996, so any Washington medical-debt prohibition would still have to be located and dated in a primary source; it was not, and it is not restated or generalised here |
| `CRP-LSRC-0321` | Yes, for the named federal instrument only | Department of Justice Canada route as in §8.3 (N3) | No | `GAP_OPEN — CROSS-LAYER CONFLICT OPEN` unchanged. No retrieved provision states any priority, supplement or override relationship between the federal baseline and provincial instruments; the proposed shortest-window rule remains not adopted and no relationship rule is entered |
| `CRP-LSRC-0322` | Yes, at heading level for two provinces, both new | Manitoba Laws, Queen's Printer (`web2.gov.mb.ca`); Queen's Printer, Newfoundland and Labrador (`assembly.nl.ca`) | **Headings only**: Manitoba's table of contents ("6 Basic limitation — 2 years from discovery", "10 Ultimate limitation") and Newfoundland and Labrador's section analysis ("5. Limitation period 2 years", "17. Extinguishment of rights", "22. Ultimate limitation") | Gap **not** closed. No bankruptcy or collection retention figure is verified for any province; British Columbia's s. 109(1)(a)–(i) is still not captured; the Québec, New Brunswick and Prince Edward Island texts are still not retrievable; the Prince Edward Island chapter conflict (`c. C-18` in this entry against `c. C-20` in `CRP-LSRC-0323`) remains unresolved and no chapter number was verified this phase. Nothing is reconstructed from the headings |
| `CRP-LSRC-0323` | Yes, in part, and with a new conflict | King's Printer for Ontario (`ontario.ca/laws/statute/90c33`); New Brunswick Queen's Printer routes failed; Nova Scotia PDF unreadable; PEI blocked | Partly: Ontario's current table of contents only | Deliberate non-entry **retained**; no exclusion is applied against any report. The Ontario consolidation's own contents list "2. Registrar" and "8. To whom reports may be given", which does **not** correspond to the recorded description of Ontario s. 2(2)–(3) as scope carve-outs — a citation-description conflict recorded in §10.5 and not silently corrected. Nova Scotia s. 2, New Brunswick s. 2 and Prince Edward Island s. 2 remain unretrieved; the carve-out analysis is therefore unverified in all four named regimes |
| `CRP-LSRC-0324` | Yes, in part, and with a second description conflict | King's Printer for Ontario (`ontario.ca/laws/statute/90c33`) | Partly: Ontario's contents list, its currency line and s. 13 (already recorded in §8.4); the section block "13.1-13.8 Repealed: 2002, c. 30, Sched. E, s. 5 (2)" was also captured | Scoping **retained**: bureau-side duties stay out of scope for report-only findings and no dispute, correction or response obligation is created. Ontario s. 8 is listed as "To whom reports may be given", not as an accurate-files duty: recorded as a description conflict in §10.5. The retrieved s. 13(1) wording remains "within a reasonable time", so the recorded "30-day dispute investigation framework" description stays counter-sourced. Québec's Civil Code articles 35–40 (HTTP 403) and Ontario's s. 8 text were not captured; the UK framework remains on 28-day periods (R5) |
| `CRP-LSRC-0325` | Yes, at heading level for two previously entirely unmapped units | Manitoba Queen's Printer; Newfoundland and Labrador Queen's Printer; King's Printer for Ontario (`ontario.ca/laws/statute/02l24`) | **Headings and currency only**: Ontario ss. 4, 5 and 15 subject headings with the consolidation statement; Manitoba ss. 6 and 10; Newfoundland and Labrador ss. 5 to 8, 17 and 22 | Wildcard `CA-*` **remains unresolved**. The seven units that were unmapped are now reduced in one respect only: Manitoba and Newfoundland and Labrador have official heading-level evidence (two years basic, discovery-based, with an ultimate limitation and, in Newfoundland and Labrador, extinguishment of rights), leaving Saskatchewan, Prince Edward Island, Yukon, the Northwest Territories and Nunavut still entirely unreviewed. No operative limitation wording is captured for **any** unit, no unit is mapped by this work order, and the session/account-profile route remains not adopted |
| `CRP-LSRC-0395` | No | Nova Scotia official PDF served but unreadable; no HTML route exists | No | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` unchanged. The s. 12 citation and its in-force date remain unverified; the official copy is locatable but not capturable through this channel, and the rationale stays owner-supplied limitation analysis that creates no collection or reporting block and no finding authority |
| `CRP-LSRC-0396` | Yes, at heading level only | King's Printer for Ontario (`ontario.ca/laws/statute/02l24`) | **Headings only**: "4. Basic limitation period", "5. Discovery", "15. Ultimate limitation periods", with "Consolidation Period: From December 4, 2024 to the e-Laws currency date. Last amendment: 2024, c. 27, Sched. 9" | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` unchanged. The two cited sections now exist in a retrieved official contents list with the recorded subject matter, but their operative wording was not captured, so the citation is neither verified nor contradicted; the refusal stands and creates no operational block |
| `CRP-LSRC-0397` | No | Éditeur officiel du Québec (`legisquebec.gouv.qc.ca`) returned HTTP 403 | No | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` unchanged. Articles 2898 and 2925 and their in-force dating remain unretrieved; the interruption rationale stays owner-supplied and no automatic reset on payment is assumed; no operational block and no finding authority are created |
| `CRP-LSRC-0398` | No | Government of Prince Edward Island returned a bot interstitial; no other official Prince Edward Island route was reachable | No | `GAP_CLOSED_RELATIONSHIP_DECISION — NO DUPLICATE RULE` unchanged. Because no provision text could be read this phase, no source conflict could be tested and the decision is left exactly as recorded: the catch-all relationship is retained, the chapter numbering remains unverified, and **no duplicate catch-all rule and no overlapping rule is created** |
| `CRP-LSRC-0412` | Yes, unchanged from §8 (R1, R2, R3) | Statute Law Database (`legislation.gov.uk`) | Yes: Limitation Act 1980 s. 5 (extent E+W+N.I.), Prescription and Limitation (Scotland) Act 1973 s. 6 (extent S), Limitation (Northern Ireland) Order 1989 art. 4 (extent N.I.) | Entry **remains unresolved at country level**, but under the recorded owner direction the three provisions may be recorded for the exact regions whose territorial scope the retrieved sources themselves state — England and Wales and Northern Ireland together under the 1980 Act, Scotland separately under the 1973 Act, and Northern Ireland additionally under the 1989 Order. No new retrieval was made this phase, the bare `UK` token still identifies no single nation, Wales is still not separately identified, and **no country-level rule is entered** |
| `CRP-LSRC-0413` | Not applicable — closed as a scope decision | — | No | **Closed as a scope decision for this primary-law corpus**, per owner direction. CRAIN remains a non-statutory industry notice and is not a source for a statutory 12-month rule; the retrieved Article 5 base (R4) contains no 12-month or 12-to-24-month search-visibility or retention figure; the recorded owner statements stay as non-adopted information; no search-visibility rule is entered |
| `CRP-LSRC-0435` | No, but the two previously unreviewed units were attempted | Parliamentary Counsel's Office, Western Australia (three routes); Attorney-General's Department, South Australia (two routes); Office of the Queensland Parliamentary Counsel | No | Wildcard `AU-*` **remains unresolved**. Western Australia and South Australia, previously recorded as *unreviewed*, are now recorded as **attempted and blocked**: the Western Australian publisher was reached but its alpha index is retired and its search route returned HTTP 404, and the South Australian publisher returned HTTP 403 on both the consolidated path and its root. Queensland returned HTTP 404. No Australian period and no remedy-bar or extinguishment label is verified, and the session/account-profile route remains not adopted |
| `CRP-LSRC-0436` | Yes, for the compilation identity; still no wording | Federal Register of Legislation (`legislation.gov.au/Details/C2026C00227`); OAIC reproduction as in §8 (R6, R7) | **Identity only**: register ID `C2026C00227`, compilation `C104`, 04 June 2026, status "In force", whose own table of contents lists APP 10 (Schedule 1 Part 4) and APP 13 (Schedule 1 Part 5) | Text gap **partly closed and still open on one point**: the compilation is now pinned by ID, number and date, and its contents list confirms both APPs exist in that compilation with those titles — but the 2026 wording was not captured (the `/Text` and `/Downloads` sub-paths returned HTTP 404 and the `/latest` forms did not load), so the 25 July 2022 regulator reproduction remains the only captured text and the identity of the wording across the two is still not established. The "typically 30 days" statement stays qualified as an agency-only period, with organisations on "a reasonable period" and no charge (R7). No correction, dispute or deadline rule is entered |
| `CRP-LSRC-0437` | Partly, for the Code's identity only | OAIC privacy codes register (returned); OAIC Code detail page (HTTP 404); Federal Register of Legislation search (unfiltered results) | No | Gap remains **open**. The Code's existence and its listing among the registered codes are now officially evidenced, together with the OAIC's own statement that the Privacy Act requires a CR code and that a breach of a registered code is an interference with privacy under s. 13. No Code wording, pinpoint section or commencement date was obtained, so ss. 16, 20 and 21 remain unverified. Per owner direction the gap stays open and the attempts are documented here rather than closed by inference |

### 10.5 New material divergences and conflicts found in this work order

Per the work order, every owner-authorised determination below is **preserved**, the conflict is recorded,
and no disposition is silently overwritten. Items 7 to 9 continue the §8.4 numbering.

7. **Ontario s. 2 is not, in the current consolidation, a scope carve-out.** `CRP-LSRC-0323` records
   Ontario's "s. 2(2) and s. 2(3)" as carve-outs "including professional investigations and specialised
   financial data transfers". The retrieved current consolidation's own contents list for the Consumer
   Reporting Act reads "Interpretation and Administration 1. Definitions and interpretation 2. Registrar" —
   that is, s. 2 is the Registrar provision. The s. 2 wording itself lay in the elided middle and was not
   captured, so this is a **description-level conflict**, recorded for owner ruling, and the deliberate
   non-entry is retained.
8. **Ontario s. 8 is titled "To whom reports may be given", not an accurate-files duty.** `CRP-LSRC-0324`
   records Ontario s. 8 as "(accurate files)". The same retrieved contents list shows "8. To whom reports may
   be given" and "9. Procedures of agencies". Recorded as a second description-level conflict, with the
   scoping decision preserved and the s. 8 wording still uncaptured.
9. **Both retrieved state content laws depart from the federal § 605 list, and the savings-clause date test
   cannot be completed from the retrieved pages.** Massachusetts G.L. c. 93, § 52(a)(1) permits bankruptcies
   to be reported for fourteen years from adjudication where § 605(a)(1) uses ten; its exemption thresholds
   are "fifty thousand dollars or more" where § 605(b) uses $150,000 and $75,000; and it adds sealed eviction
   records to the excluded list. California Civil Code § 1785.13(a)(7) excludes "Medical debt." outright —
   added by Stats. 2024, Ch. 520 with effect from 1 January 2025 — which is a different construction from the
   veteran-medical-debt paragraphs of § 605(a)(7)–(8). Separately, § 1785.13(b) uses the same 180-day
   commencement construction as the opening sentence captured from § 605(c)(1); the two are near-parallel in
   that respect, and identity of wording is **not** asserted because § 605(c)(1) is only partly captured.
   The date test is the live problem: § 625(b)(1)(E) saves only state law "in effect on September 30, 1996";
   California's Title 1.6 was added in 1975 and so was in effect on that date, but its retrieved text was
   amended with effect from 1 January 2025 and § 1785.10 was re-enacted in 2002 (operative 1 January 2003);
   Massachusetts serves no history note at all, so its 1996 status cannot be established from the retrieved
   page. **Question Q1 for the owner: does § 625(b)(1)(E) preserve the state law as it stood on 30 September
   1996, or the state's law as later amended?** Until that question is answered, no state content rule is
   entered, the surviving-state list stays incomplete, and the all-states matrix stays unadopted.

### 10.6 Boundaries observed, and what this work order did not do

- **No disposition changed for any of the twenty-one IDs.** All keep their `PHASE5-001C` or `PHASE5-001D`
  statuses, with two exceptions that are themselves owner-directed changes of record rather than source-driven
  ones: `CRP-LSRC-0413` is closed as a scope decision, and within `CRP-LSRC-0435` the Western Australia and
  South Australia entries move from *unreviewed* to *attempted and blocked*.
- Governed rules created: **0**. Legal coverage created: **0**. Authority to emit `VIOLATION` or
  `PROBABLE_VIOLATION`: **none**. Wildcards resolved: **0**. Refusals closed: **0**. Deliberately-not-entered
  items entered: **0**. Off-report inference of any report fact, statutory event date or jurisdiction: **none**.
- Runtime code, the evaluator, tests, consumer workflows and the legacy application were not touched, and no
  permanent discovery registry was created. Source-record counts remain separate from unique legal provisions,
  as set out in §10.2.
- **The catalogue was not amended.** No entry in `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` needed a field change
  to record these retrievals, and the work order forbids amending it for convenience, so it remains at 437
  entries, 437 distinct IDs and 15 fields with SHA-256
  `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`, unchanged from §8 and from
  `PHASE5-001D`.
- **Recorded for honesty:** three of the eleven content-bearing returns are heading-level or contents-list
  evidence only, and none of them is presented as provision text anywhere in this register. Where the
  publisher itself warns that its HTML is unofficial (Manitoba), that warning is recorded with the finding.

### 10.7 Remaining owner decisions and the next unreviewed cohort

Of the thirteen items listed in §8.7, this work order advanced items 1 (`0076`, further official routes
attempted and exhausted), 6 (`0077`, two states now captured at provision level, with question Q1 now the
gating issue), 8 (`0398`, the Prince Edward Island route attempted and still blocked), 11 (Western Australia
and South Australia attempted), 12 (`0436`, compilation identity pinned) and 13 (`0437`, Code identity
evidenced). The remaining decisions are these, and each is an owner call rather than a retrieval problem:

1. `CRP-LSRC-0076` — accept the documented route exhaustion as the state of the record, or supply an official
   print or PDF copy of §§ 605(c) and 623(a)(5) for out-of-band capture. The Equifax-guidance fallback remains
   not adopted under either course.
2. `CRP-LSRC-0077` — answer **Q1** in §10.5 (state law frozen at 30 September 1996, or the state's law as
   amended), and decide whether per-state retrieval continues. If it does, note what this phase established:
   the Massachusetts publisher serves no history notes, so the 1996 status of G.L. c. 93 § 52 would have to be
   established from Session Laws, and the New York route is blocked at HTTP 403.
3. `CRP-LSRC-0078` — supply a state/territory mapping, or record the wildcard as permanently unresolved for
   this corpus.
4. `CRP-LSRC-0322` — decide whether heading-level official evidence satisfies "source capture" for Manitoba
   and Newfoundland and Labrador, and rule which Prince Edward Island chapter number is correct (`c. C-18` or
   `c. C-20`); neither was verified this phase.
5. `CRP-LSRC-0323` and `CRP-LSRC-0324` — rule on the two Ontario description conflicts at §10.5 items 7 and 8
   (s. 2 as Registrar rather than carve-outs; s. 8 as "To whom reports may be given" rather than accurate
   files), and say whether the parenthetical descriptions in the two entries may be corrected once the section
   texts are captured.
6. `CRP-LSRC-0325` — authorise an out-of-band capture of the official Canadian PDFs or a print copy, and say
   whether heading-level evidence may count as mapping evidence. Saskatchewan, Prince Edward Island, Yukon,
   the Northwest Territories and Nunavut remain entirely unreviewed.
7. `CRP-LSRC-0395` to `0398` — authorise print copies for Nova Scotia s. 12, Ontario ss. 5 and 15, and Québec
   articles 2898 and 2925, and identify any official route that can reach Prince Edward Island.
8. `CRP-LSRC-0412` — confirm the per-region recording (England and Wales with Northern Ireland under the 1980
   Act, Scotland under the 1973 Act, Northern Ireland under the 1989 Order) while leaving the `UK` token
   unresolved.
9. `CRP-LSRC-0436` — say whether the compilation-identity confirmation is sufficient for this entry, or
   whether the `C2026C00227` wording must be pinned through a channel able to read the compilation file.
10. `CRP-LSRC-0437` — supply the Code's register ID or an official copy; the OAIC privacy codes register is the
    one official page that this phase could reach that lists it.

**Next unreviewed source cohort.** First, the publishers this phase proved to be PDF-only or bot-gated, for
which an out-of-band capture route must be agreed: the Nova Scotia Legislative Counsel, the Manitoba
bilingual PDF series, the Prince Edward Island site, LégisQuébec and the remaining Canadian provincial and
territorial publishers, plus the Western Australian, South Australian, New South Wales, Victorian,
Queensland, Tasmanian, Northern Territory and Australian Capital Territory limitation publishers. Second,
provision-level official routes still needed for: the remaining FCRA subsections (`§ 605(c)` complete and
`§ 623(a)(2)` to `(a)(5)`), the further state content laws that may survive § 625(b)(1)(E) beyond California
and Massachusetts, the Privacy Act 1988 Schedule 1 wording in compilation `C2026C00227`, the Privacy (Credit
Reporting) Code 2024, the Québec civil-law articles 35 to 40, and the British Columbia s. 109(1)(a)–(i),
Ontario ss. 2, 4, 5 and 8, Manitoba ss. 6 and 10 and Newfoundland and Labrador ss. 5 to 8 operative texts. No
entry outside the twenty-one targeted IDs was reviewed or touched by this work order.

Register SHA-256 at completion of `PHASE5-001E`: `6F404D379E7A9026A55359D5B446B36017119303629E7E37957C8B4E22BD39A4`

Digest method for the PHASE5-001E value: it covers every line of this register up to and including the last
blank line that precedes this digest line — that is all of §1 to §9 as they stood at the end of
`PHASE5-001D` plus §10 as added by `PHASE5-001E` — and it deliberately excludes this digest line, the blank
line after it and this note, which keeps the value stable and non-circular. To verify, delete everything from
the start of this digest line to the end of the file, then hash the remainder as UTF-8 without a BOM with CRLF
line endings: `928` lines and `127,508` bytes. The `PHASE5-001D` value above is
unaffected by this section, because §10 begins after that digest block; deleting from the start of the
`PHASE5-001D` digest line to the end of the file still reproduces its recorded 610-line, 84,280-byte region.

## 11. PHASE5-001F — owner rulings recorded and official retrieval continued

### 11.1 Method, evidence rules and new channel findings

This work order continues §8 and §10 under the same evidence rules: a record counts as **retrieved** only where the
publisher page returned *and* the target provision text was captured; a page that returned without the provision
is `PARTIAL`; a blocked, absent, binary-only or JavaScript-only route is `NOT RETRIEVED`. Search snippets,
summaries, agency guidance, law-firm material and owner-supplied citations were again **not** admitted as evidence,
and no retrieval below creates a governed rule, legal coverage, finding authority, jurisdiction resolution or
closure of a refusal. Retrieval date for every record below: **2026-09-30**. Requests issued in this work order:
**54**, counted per HTTP request, so where a publisher was probed through several forms of the same address each
form is counted separately. Publishers used: the U.S. Government Publishing Office (`govinfo.gov`), the Federal
Trade Commission, the Consumer Financial Protection Bureau, the Federal Register of Legislation, the Office of the
Australian Information Commissioner, the Australian Capital Territory Legislation Register, the Northern
Territory and Queensland legislation services, the Western Australian Parliamentary Counsel's Office, the South
Australian Attorney-General's Department, the New South Wales, Victorian and Tasmanian legislation services, the
King's Printer for Ontario (e-Laws), the Manitoba Queen's Printer, the Saskatchewan Publications Centre, the
Government of Prince Edward Island, the Yukon laws site, the Government of Nunavut, and LégisQuébec.

Four findings were established, and they are findings about the retrieval channel, not about any law:

- **The channel returns the head and the tail of a document and elides the middle.** For a returned page, roughly
  the first 4.5 kB and the last 11 kB are readable and the text between those regions is dropped before it reaches
  this register. This explains the "elided middle" recorded in §8 and §10 and it yields a usable rule for retrieval
  design: a target provision is reachable when it sits near either end of a page, or when an alternative official
  page presents the same provision near an end. Both new federal text captures below were obtained that way, by
  choosing a different official page — not by finding a better publisher.
- **The GovInfo granule path must name the subchapter, and the edition of the granule decides what is readable.**
  `USCODE-<year>-title15-chap41-subchapIII-sec1681c.htm` returns the section, while the same path without
  `subchapIII` returns the GPO "Page Not Found" page (two such requests this phase), and no `USCODE-2022` or
  `USCODE-2024` form of the subchapter path exists for this section. Because the 2020, 2022 and 2023 Editions
  carry the veteran-medical-debt paragraphs (a)(7)–(8), which push § 605(c) past the readable head, the **2018
  Edition** is the edition in which § 605(c) is readable; the 2020, 2022 and 2023 Editions show the identical
  opening of § 605(c)(1) and then elide the balance. `uscode.house.gov` again could not be reached at all, and no
  Statutes at Large HTML granule exists for volume 112, so the amending-public-law route contemplated in § 10.5
  item 1 is not available in HTML on GovInfo.
- **A route recorded as dead in an earlier phase can be live under a different address.** The OAIC page carrying
  the Privacy (Credit Reporting) Code 2024 sits at
  `oaic.gov.au/privacy/privacy-registers/privacy-codes/privacy-credit-reporting-code-2024`; the
  `…/privacy-codes-register/…` form used in § 10 returns HTTP 404, which is why that phase recorded the detail page
  as unreachable. § 10.4's row for `CRP-LSRC-0437` remains an accurate record of the address tried then, and the
  corrected address is recorded here as a route finding only.
- **Publisher-side "official version" warnings survive the HTML route.** Where a publisher states that its HTML is
  unofficial (Manitoba) or that the official copy is a PDF (Manitoba, Nova Scotia, the Australian territories),
  the warning is recorded with the finding and no text captured through that route is treated as an official
  capture. Manitoba's warning and the Australian Capital Territory's PDF-only text route are both recorded in
  § 11.2.

### 11.2 Retrieval ledger for PHASE5-001F

| Route | Publisher | Outcome | Status |
| --- | --- | --- | --- |
| `govinfo.gov` granule `USCODE-2018-title15-chap41-subchapIII-sec1681c.htm` | U.S. Government Publishing Office | **Page returned**: § 605(a)(1)–(6), § 605(b), **§ 605(c)(1) and (2) in full**, and the opening of § 605(d)(1) | `RETRIEVED` — target subsection captured |
| The same granule, 2020, 2022 and 2023 Editions (three requests) | U.S. Government Publishing Office | **Pages returned**: each shows the same § 605(c)(1) opening sentence and then elides the balance | `PARTIAL` |
| The same path without `subchapIII`, 2022 and 2024 Editions (two requests) | U.S. Government Publishing Office | GPO "Page Not Found" | `NOT RETRIEVED` |
| `govinfo.gov` granule `USCODE-2014-title15-chap41-subchapIII-sec1681s-2.htm` | U.S. Government Publishing Office | **Page returned**: § 623(a)(1)–(4) and **§ 623(a)(5)(A) in full**, with (a)(5)(B) captured from its heading to "provided that the consumer does not disput" | `RETRIEVED` — paragraph (A) captured, (B) partial |
| The same granule, 2012 Edition | U.S. Government Publishing Office | **Page returned**: identical text to the 2014 Edition, cut at the same word | `PARTIAL` |
| The same granule, 2018 and 2020 Editions (two requests) | U.S. Government Publishing Office | **Pages returned**: each elides before (a)(5); the §312(d) amendment note for (a)(5) captured again | `PARTIAL` |
| `govinfo.gov/content/pkg/STATUTE-112/html/STATUTE-112-Pg3211.htm` | U.S. Government Publishing Office | GPO "Page Not Found" — no HTML Statutes at Large granule for that volume | `NOT RETRIEVED` |
| `uscode.house.gov/view.xhtml?req=(title:15 section:1681c edition:prelim)` | Office of the Law Revision Counsel | Fetch failed — host unreachable from this channel, as in § 8 | `NOT RETRIEVED` |
| `ftc.gov/legal-library/browse/statutes/fair-credit-reporting-act` | Federal Trade Commission | **Page returned**: the Act is offered as a file only, "Fair Credit Reporting Act (Revised March 2026) (862.51 KB)" | `NOT RETRIEVED` for text (record identity only) |
| `consumerfinance.gov/rules-policy/fair-credit-reporting-act/` | Consumer Financial Protection Bureau | HTTP 404 | `NOT RETRIEVED` |
| `oaic.gov.au/…/privacy-codes/privacy-credit-reporting-code-2024` (two requests) | Office of the Australian Information Commissioner | **Page returned**: the Code's own text is published on it; its defined terms captured verbatim (§ 11.3 C) | `RETRIEVED` — Code wording partly captured |
| `oaic.gov.au/…/privacy-codes-register` (two requests) | Office of the Australian Information Commissioner | **Pages returned**: the code list and the OAIC's framework statements, as in § 10 | `PARTIAL` |
| `oaic.gov.au/…/chapter-10-app-10-quality-of-personal-information` | Office of the Australian Information Commissioner | **Page returned**: APP 10.1–10.2 reproduced; publication date 22 July 2019, version 1.1 | `RETRIEVED` |
| `oaic.gov.au/…/chapter-13-app-13-correction-of-personal-information` | Office of the Australian Information Commissioner | **Page returned**: APP 13 response periods and the no-charge rule captured (§ 11.3 D) | `RETRIEVED` |
| `legislation.gov.au/C2026C00227/latest/text` and `/asmade/downloads` (two requests) | Federal Register of Legislation | "The requested title could not be loaded" on both | `NOT RETRIEVED` |
| `legislation.gov.au/Details/C2026C00227/Html/Text` | Federal Register of Legislation | The Register's own "Page not found" notice | `NOT RETRIEVED` |
| `legislation.gov.au/Details/C2026C00227` (two requests) | Federal Register of Legislation | **Pages returned**: compilation identity and full table of contents, including Schedule 1 Parts 4 and 5 | `PARTIAL` (identity) |
| `legislation.gov.au/F2024L01047/asmade` | Federal Register of Legislation | **Page returned**: resolves to a different instrument, "Statement of Principles concerning Meniere disease and Meniere syndrome (Reasonable Hypothesis) (No. 68 of 2024)", 22 August 2024 | `NOT RETRIEVED` (different instrument) |
| `ontario.ca/laws/statute/90c33/v9` (two requests) | King's Printer for Ontario (e-Laws) | **Pages returned**: the 2008 historical version in full (50,295 characters); contents list and s. 1 captured, ss. 2 and 8 in the elided middle | `PARTIAL` — heading level |
| `web2.gov.mb.ca/laws/statutes/ccsm/l150.php` | Manitoba Queen's Printer | **Page returned**: currency and legislative-history lines, both contents lists and ss. 21 to 23 captured; publisher states "This is an unofficial version" | `PARTIAL` — text captured, but not the target sections |
| `publications.saskatchewan.ca/#/products/6997` | Saskatchewan Publications Centre | **Page returned**: a 1,215-byte application shell reading only "Publications Centre" | `NOT RETRIEVED` |
| `publications.saskatchewan.ca/api/v1/products/6997` and `…/file` (two requests) | Saskatchewan Publications Centre | HTTP 404 on both | `NOT RETRIEVED` |
| `princeedwardisland.ca/en/legislation/limitation-of-actions-act` | Government of Prince Edward Island | Radware bot interstitial, new incident ID `20b86515-cbnf-4a90-96dd-35c659c23711` | `NOT RETRIEVED` |
| `laws.yukon.ca/` | Yukon laws site | HTTP 403 | `NOT RETRIEVED` |
| `gov.nu.ca/justice/information/acts-and-regulations` | Government of Nunavut | HTTP 403 | `NOT RETRIEVED` |
| `legisquebec.gouv.qc.ca/fr/document/lc/CCQ-1991` | Éditeur officiel du Québec | HTTP 403 | `NOT RETRIEVED` |
| `legislation.act.gov.au/a/1985-66` and `…/current/html/1985-66.html` (two requests) | ACT Legislation Register | **Pages returned**: the law record and its version history (R4A to R28; currency 26 November 2025); no separate readable text page | `PARTIAL` (identity and version history) |
| `legislation.act.gov.au/a/1985-66/current/pdf/1985-66.pdf` | ACT Legislation Register | HTTP 200 `application/pdf`, 900,536 bytes, binary | `NOT RETRIEVED` |
| `legislation.nt.gov.au/en/Legislation/LIMITATION-ACT-1981` | Northern Territory legislation service | **Page returned**: Act record ("In Force", reprint REPL026) naming Word and PDF downloads only | `PARTIAL` (identity) |
| `legislation.qld.gov.au/view/html/inforce/current/act-1974-075` | Queensland Parliamentary Counsel | **Page returned**: JavaScript shell, "Results: match 0 of 0 provisions" | `NOT RETRIEVED` |
| `legislation.qld.gov.au/view/pdf/current/act-1974-075` | Queensland Parliamentary Counsel | HTTP 200 `application/pdf`, 475,692 bytes, binary | `NOT RETRIEVED` |
| `legislation.tas.gov.au/view/html/inforce/current/act-1974-074` and `…/view/whole/html/inforce/current/act-1974-074` (two requests) | Tasmanian legislation service | HTTP 404 on both forms | `NOT RETRIEVED` |
| `legislation.vic.gov.au/in-force/acts/limitation-of-actions-act-1958`, `/034` and `/035` (three requests) | Victorian legislation service | HTTP 404 on all three forms | `NOT RETRIEVED` |
| `legislation.nsw.gov.au/view/html/inforce/current/act-1969-031` | New South Wales legislation service | HTTP 403 | `NOT RETRIEVED` |
| `legislation.sa.gov.au/lz?path=…LIMITATION+OF+ACTIONS+ACT+1936` | South Australian Attorney-General's Department | HTTP 403 | `NOT RETRIEVED` |
| `legislation.wa.gov.au/…/main_mrtitle_528_homepage.html` | Western Australian Parliamentary Counsel's Office | **Page returned**: resolves to *Law Reform (Statute of Frauds) Act 1962*, with the publisher's note that the link "has been updated to law_a442.html" | `NOT RETRIEVED` (different instrument) |
| `legislation.wa.gov.au/…/law_a147065.html` | Western Australian Parliamentary Counsel's Office | **Page returned**: resolves to *Election of Senators Amendment Act 2015* | `NOT RETRIEVED` (different instrument) |

Counts, kept separate from provisions: 54 requests issued; **24 returned content bearing on a targeted
provision's text, heading or record identity** (the eight federal section granules, the OAIC Code page, the two
OAIC APP guideline chapters, the two OAIC code-register returns, the two Australian Register compilation-details
returns, the two Ontario historical-version returns, the Manitoba consolidation, the two Australian Capital
Territory record-page forms, the Northern Territory record page and the Federal Trade Commission statute page);
**3 returned only a different-instrument or moved-pointer notice** (the two Western Australian addresses and the
Federal Register of Legislation instrument ID probed for the Code); and the remaining **27** were blocked, absent,
binary-only or JavaScript-only, including four official PDFs that this channel cannot read. As in § 8.5 and § 10.2,
the request count exceeds the record count, and **record counts are not provision counts**.

### 11.3 Provisions and provision text newly captured from official publishers

**A. United States federal — 15 U.S.C. 1681c (§ 605(c)) is now captured in full.** Publisher: U.S. Government
Publishing Office, `govinfo.gov`, granule `USCODE-2018-title15-chap41-subchapIII-sec1681c.htm`, whose own header
reads "U.S.C. Title 15 - COMMERCE AND TRADE … United States Code, 2018 Edition … Sec. 1681c - Requirements
relating to information contained in consumer reports / From the U.S. Government Publishing Office, www.gpo.gov".
The subsection reads, verbatim and in full:

> (c) Running of reporting period (1) In general The 7-year period referred to in paragraphs (4) and (6) of
> subsection (a) shall begin, with respect to any delinquent account that is placed for collection (internally or by
> referral to a third party, whichever is earlier), charged to profit and loss, or subjected to any similar action,
> upon the expiration of the 180-day period beginning on the date of the commencement of the delinquency which
> immediately preceded the collection activity, charge to profit and loss, or similar action. (2) Effective date
> Paragraph (1) shall apply only to items of information added to the file of a consumer on or after the date that
> is 455 days after September 30, 1996.

Paragraph (1) is the whole of the operative rule and paragraph (2) is the whole of its commencement rule, so the
subsection is complete; the capture also runs on into § 605(d)(1) "Information required to be disclosed … Title 11
information". Three points are recorded with the capture so that it is not over-read. First, the 2020, 2022 and
2023 Editions of the same granule show the identical words "The 7-year period referred to in paragraphs (4) and (6)
of subsection (a) shall begin, with respect to any delinquent account that is" and then elide the balance, so no
later-edition variation of (c) was observed, but neither was (c)(2) re-read in a later edition. Second, the edition
captured is a post-2018 edition, because its § 605(a)(7) and (8) carry the veteran-medical-debt paragraphs added by
Pub. L. 115–174, so it is not an as-enacted text. Third, the section's own notes, captured in the same request,
record no amendment to subsection (c) after the 1998 and 2003 amendments, and the 1998-amendment note reads
"Amendment by Pub. L. 105–347 deemed to have same effective date as amendments made by section 2403 of Pub. L.
104–208, see section 7 of Pub. L. 105–347". Those are source observations about the edition and its notes, not a
finding that the words are the current operative text of every edition.

**B. United States federal — 15 U.S.C. 1681s-2 (§ 623(a)(5)) is now captured down to part of subparagraph (B).**
Publisher: the same GPO, `govinfo.gov`, granule `USCODE-2014-title15-chap41-subchapIII-sec1681s-2.htm`, header
"United States Code, 2014 Edition". Paragraph (A) reads, verbatim and in full:

> (5) Duty to provide notice of delinquency of accounts (A) In general A person who furnishes information to a
> consumer reporting agency regarding a delinquent account being placed for collection, charged to profit or loss,
> or subjected to any similar action shall, not later than 90 days after furnishing the information, notify the
> agency of the date of delinquency on the account, which shall be the month and year of the commencement of the
> delinquency on the account that immediately preceded the action.

Subparagraph (B) is captured only from its heading to these words: "(B) Rule of construction For purposes of this
paragraph only, and provided that the consumer does not disput". The page is then elided, so the balance of (B) —
the words that follow "does not disput" — is **not captured** and must not be paraphrased or supplied from memory.
The 2012 Edition returns the identical text cut at the identical word, and the 2018 and 2020 Editions elide the whole
paragraph, so no edition on this channel completes (B). The §312(d) amendment note in all four captured editions
reads: "Subsec. (a)(5). Pub. L. 108–159, §312(d), designated existing provisions as subpar. (A), inserted heading,
inserted \"date of delinquency on the account, which shall be the\" before \"month\" and \"on the account\" before
\"that immediately preceded\", and added subpar. (B)." That note identifies the origin of the present shape of the
paragraph but is a note, never a provision.

**C. Australia — the Privacy (Credit Reporting) Code 2024's own wording, partly captured for the first time.**
Publisher: Office of the Australian Information Commissioner, `oaic.gov.au/privacy/privacy-registers/privacy-codes/privacy-credit-reporting-code-2024`,
whose page title is "Privacy (Credit Reporting) Code 2024 | OAIC" and whose breadcrumb is "Privacy ‣ Privacy
registers ‣ Privacy codes ‣ Privacy (Credit Reporting) Code 2024". The page publishes the Code's text and the
following dictionary entries were captured verbatim:

> section 6Q notice means a written notice of the kind described in paragraph 6Q(1)(b) of the Act informing the
> individual of the overdue payment and requesting that the individual pay the amount of the overdue payment. Note:
> In order for information to be default information, a section 6Q notice must be given: see section 6Q of the Act
> and section 9 of Schedule 2 to this instrument.

> temporary FHA means an agreed financial hardship arrangement which involves temporary relief from or deferral of
> the individual's obligations in relation to consumer credit (as described in subparagraph 6QA(1)(d)(ii) of the
> Act). … During a temporary FHA, payments will typically continue to accrue under the terms of the consumer credit,
> however repayment history information will reflect the terms of the temporary FHA (as set out in paragraph 8(2)(b)
> and subsection 8(5) of Schedule 2 to this instrument, rather than the contractual obligation under the consumer
> credit. At the end of the arrangement, the individual will need to pay the payments that have accrued under the
> terms of the consumer credit or agree with the credit provider to another financial hardship arrangement that
> deals with those overdue payments. If they do not, repayment history information will show those payments as
> missed.

> transfer event means an event whereby the rights of a credit provider in relation to the repayment of an amount of
> consumer credit are acquired by an acquirer.

> variation FHA means an agreed financial hardship arrangement which: involves a permanent variation to the terms of
> the consumer credit (as described in subparagraph 6QA(1)(d)(i) of the Act); and meets the requirements of
> subsection 8A(11) of Schedule 2 to this instrument.

Two limits are recorded with these captures. The capture is a word-for-word capture of defined terms and notes only:
the Code's citation clause, commencement clause, clause numbers, clause headings and the provisions of Schedules 1
and 2 were **not** captured, so the text of the Code's operative rules and its date of effect remain unestablished
and `CRP-LSRC-0437`'s text gap stays open. The captured notes do establish, from the instrument's own words, that
the Code is structured with Schedules 1 and 2 and that its obligations refer back to the Act's ss. 6Q, 6QA, 8, 8A
and 21D; that is structure and internal cross-reference evidence, not a captured operative rule. The register itself
(§ 10.3 E) separately records the OAIC's statement that a breach of a registered code is an interference with
privacy under s. 13.

**D. Australia — the regulator's reproduction of APP 10 and APP 13 in the APP guidelines, two chapters captured.**
Publisher: Office of the Australian Information Commissioner, `oaic.gov.au/privacy/australian-privacy-principles-guidelines`,
chapters 10 and 13, each stating "Publication date: 22 July 2019 / Version 1.1". Chapter 10 reproduces:
"10.1 An APP entity must take reasonable steps to ensure that the personal information it collects is accurate,
up-to-date and complete (APP 10.1). 10.2 An APP entity must also take reasonable steps to ensure that the personal
information it uses or discloses is, having regard to the purpose of the use or disclosure, accurate, up-to-date,
complete and relevant (APP 10.2)." Chapter 13 states, of the correction request period: "The 30 day time period
commences on the day after the day the agency receives the request. An organisation must respond within a reasonable
period after the request is made. As a general guide, a reasonable period should not exceed 30 calendar days." It
also records at 13.65: "An APP entity cannot impose any charge upon an individual for correcting personal
information under APP 13. This includes: a charge for the making of the request to correct personal information a
charge for making a correction or for associating a statement with the personal information (APP 13.5(b))." These
passages are a regulator reproduction published by a Commonwealth government publisher; they are **not** the
compilation text of `C2026C00227`, so `CRP-LSRC-0436`'s wording gap is not closed by them, but the 30-day/“reasonable
period” distinction that § 10.5 item 9 and § 8.4 item 2 recorded is now evidenced from a second official page, and
nothing in it is promoted to a statutory deadline.

**E. Canada — Ontario: the same two headings confirmed at a second consolidation point.** Publisher: King's
Printer for Ontario (e-Laws), `ontario.ca/laws/statute/90c33/v9`, whose page states "Consumer Reporting Act R.S.O.
1990, CHAPTER C.33 — Historical version for the period January 1, 2008 to January 16, 2008. Last amendment: 2007,
c. 4, s. 28." Its contents list reads, among others, "1. Definitions and interpretation / 2. Registrar / … 8. To whom
reports may be given / 9. Procedures of agencies / 10. Disclosure of report on request / 13. Correction of errors /
14. Order by Registrar re information". The current consolidation's list recorded in § 10.3 D contains the identical
entries "2. Registrar" and "8. To whom reports may be given". Heading evidence is not operative text, and the
sections themselves lie in the elided middle of the returned page, but the record now shows the same two headings at
two consolidation points fifteen years apart, which is the basis on which § 11.4 item 5 records the owner's
description corrections. Text of ss. 2 and 8 remains uncaptured, as does any 1996-baseline version.

**F. Canada — Manitoba: currency, history and three sections of operative text, from a version the publisher calls
unofficial.** Publisher: Manitoba Queen's Printer, `web2.gov.mb.ca/laws/statutes/ccsm/l150.php`, page headed
"C.C.S.M. c. L150 / The Limitations Act / Loi sur les délais de prescription, c. L150 de la C.P.L.M.", stating "This
is an unofficial version. If you need an official copy, use the bilingual (PDF) version. This version is current as
of September 25, 2026. It has been in effect since May 30, 2023." Its legislative-history block reads "Enacted by
Proclamation status … SM 2021, c. 44 • whole Act – in force: 30 Sept. 2022 (proclamation published: 29 Oct. 2021) /
Amended by SM 2023, c. 19, s. 98 / SM 2023, c. 22, Part 1", and it lists "Previous version(s) 30 Sept. 2022 to
29 May 2023 — bilingual version (PDF)". Its contents list includes "BASIC LIMITATION PERIOD 6 Basic limitation —
2 years from discovery / 7 When is a claim discovered? / … / ULTIMATE LIMITATION PERIOD 10 Ultimate limitation / …
/ NO LIMITATION PERIOD 18 Claims with no limitation period". Because the page prints the Act in both languages, the
readable tail contains operative text for later sections, captured verbatim in English as:

> Amending pleadings 22 Despite the expiry of a limitation period after a proceeding is commenced, a judge may allow
> the pleadings to be amended to add a new claim or to add or substitute a party, but only if (a) the claim added by
> the amendment, or the claim by or against the new party, arises out of the same transaction or occurrence as the
> original claim; and (b) the judge is satisfied that no party will suffer actual prejudice as a result of the
> amendment that cannot be compensated for by costs or an adjournment.

> Definition of "non-judicial remedy" 23(1) In this section, "non-judicial remedy" means a remedy that a person is
> entitled, by law or by contract, to exercise respecting a claim without court proceedings.

The capture also contains ss. 21(1) and 21(2) (claims of a successor and of a principal, each with deemed-knowledge
rules referring to "clauses 7(a) to (d) (discovery of claim)") and the opening of s. 23(2). None of this is the
target of `CRP-LSRC-0325` (ss. 6 and 10) and none of it is treated as an official capture, because the publisher
states that the version is unofficial and that the bilingual PDF is the official copy; the PDF was not captured.
The captured sentences are therefore recorded as unofficial-publisher text, useful only to show which sections the
page carries and that the sections carrying the target rule sit in the elided middle.

### 11.4 Owner rulings recorded in this work order

The ten owner rulings carried into this work order are applied as follows. Each ruling is recorded in the owner's
terms; where a ruling disposes of a question this register had left open, the question is marked answered here rather
than left standing, and no disposition is changed beyond what the ruling directs.

1. **`CRP-LSRC-0076`** — the owner accepted the documented official-route exhaustion for this pass and directed that
   § 605(c) and § 623(a)(5) be kept partial/open, that the Equifax fallback not be adopted, and that no copy be
   required from the owner now. Recorded as ruled: the Equifax route stays **not adopted**, no rule is entered, and
   the entry's disposition is unchanged. The premise of the ruling — that the two subsections were unreachable — is
   overtaken by the captures at § 11.3 A and B, which were made after the ruling was given; that is recorded as a
   conflict at § 11.6 item 10, not as a silent replacement of the ruling.
2. **`CRP-LSRC-0077` — question Q1 is answered.** The owner ruled that, for corpus admission, the text in effect on
   **30 September 1996** is the baseline for § 625(b)(1)(E); that later amendments are not automatically saved and
   must be recorded separately; that one may be admitted only if official primary authority establishes that it
   survives the federal provision; and that the all-states matrix stays **unadopted**. Effect recorded: Q1 is no
   longer open, and the baseline requirement is now a defined retrieval target. The two states already captured at
   current text are recorded as follows — California's Title 1.6 (added by Stats. 1975, Ch. 1271) was in effect on
   the baseline date, but the text captured in `PHASE5-001E` is the later text, so the **2024 medical-debt amendment
   (added by Stats. 2024, Ch. 520, effective 1 January 2025)** and **the 2002 repeal-and-re-enactment of § 1785.10**
   are recorded as later amendments, not admitted, pending baseline capture or official primary authority on
   survival; Massachusetts G.L. c. 93 § 52 is recorded as date-uncertain, because its publisher serves no history
   note, so neither its 1996 text nor its later amendment history is established. No state rule is entered.
3. **`CRP-LSRC-0078`** — the owner directed that `US-*` stay unresolved and that no session, account-profile, inferred
   or off-report data be used to resolve it, with exact-state work continuing only where an existing record names a
   jurisdiction. Recorded as ruled. No state or territory mapping exists in the report, nothing was retrieved against
   `US-*` this phase, and the wildcard remains unresolved. The only exact-state work this phase is the California and
   Massachusetts baseline question at item 2, which arises from an existing record.
4. **`CRP-LSRC-0322`** — the owner ruled that headings and contents lists may identify a provision for research but
   are not sufficient evidence of its operative rule or period, and that the Prince Edward Island `c. C-18` /
   `c. C-20` conflict must not be resolved by guess. Recorded as ruled. Effect: the Manitoba and Newfoundland and
   Labrador contents-list captures recorded in § 8.3 and § 10.3 D remain usable for identification only; the
   Manitoba section text captured at § 11.3 F does not reach the target sections and is in any event text the
   publisher calls unofficial; and the Prince Edward Island chapter number stays unresolved, the island route being
   still blocked (this phase: Radware interstitial, incident `20b86515-cbnf-4a90-96dd-35c659c23711`).
5. **`CRP-LSRC-0323` and `CRP-LSRC-0324`** — the owner directed that the Ontario descriptions be corrected to match
   captured official evidence: that s. 13(1) be described as requiring action "within a reasonable time" and not as a
   universal 30-day rule; that s. 2 carve-outs and s. 8 not be called an accuracy duty unless captured operative text
   supports it; and that the report-only scope decision for bureau procedures be preserved. Recorded as ruled, and
   the corrected descriptions are carried in § 11.5 rather than in the catalogue, which this work order leaves
   untouched. The s. 13(1) "reasonable time" description is consistent with the wording already captured in § 8.4
   item 1; the s. 2 and s. 8 corrections are now supported at heading level by two consolidation points (§ 11.3 E);
   and the scope decision is preserved.
6. **`CRP-LSRC-0325`** — the owner authorised official government PDFs or official print captures as alternative source
   routes, ruled that heading-only evidence can assist jurisdiction and provision mapping but cannot certify an
   operative legal test, and directed that unmapped units stay open. Recorded as ruled and applied: the authorisation
   is recorded for the Canadian publishers, and every one of the five units § 10.7 item 6 called entirely unreviewed
   was probed this phase — Saskatchewan (JavaScript-only application shell; the two `publications.saskatchewan.ca`
   API paths returned HTTP 404), Prince Edward Island (Radware bot interstitial), Yukon (`laws.yukon.ca` HTTP 403),
   the Northwest Territories (record page only; downloads are a Word document and a PDF) and Nunavut
   (`gov.nu.ca` HTTP 403). No operative test was obtained for any of them, no heading-level capture was made for any
   of them either, and every unit therefore stays open and unmapped.
7. **`CRP-LSRC-0395` to `CRP-LSRC-0398`** — the owner authorised official print or PDF copies for source capture,
   directed that the three refusal dispositions and the no-duplicate-rule decision be preserved unless retrieved text
   establishes a concrete conflict, and directed that limitation provisions not be turned into an operational
   collection block. Recorded as ruled. Effect: nothing retrieved this phase establishes a conflict with the three
   refusal dispositions or with the no-duplicate rule, both of which are preserved unchanged; no limitation provision
   is used to block collection and none is entered as a rule; the still-unretrieved texts named in § 10.7 item 7
   (Nova Scotia s. 12, Ontario ss. 5 and 15, Québec articles 2898 and 2925) remain unretrieved, the Québec route
   returning HTTP 403 again in French this phase, and the Prince Edward Island route remains the only way to reach
   the island provisions, which it did not reach.
8. **`CRP-LSRC-0412`** — the owner directed that the verified nation-specific provisions be recorded for the exact
   applicable regions; that where the source expressly covers England and Wales, the same source may be linked to
   `GB-ENG` and `GB-WLS` separately; that the bare `UK` token stay unresolved; and that no consumer's nation be
   derived from session or profile data. Recorded as ruled. Effect: the three provisions captured in § 8 (Limitation
   Act 1980 s. 5, extent E+W+N.I.; Prescription and Limitation (Scotland) Act 1973 s. 6, extent S; Limitation
   (Northern Ireland) Order 1989 art. 4, extent N.I.) are recorded for those exact regions, with the 1980 Act
   linked to `GB-ENG` and to `GB-WLS` separately because the retrieved source's own extent covers both, Scotland
   recorded separately, and Northern Ireland recorded under both the 1980 Act and the 1989 Order as the sources
   state. The bare `UK` token remains unresolved, no nation is inferred for any consumer, and **no country-level
   rule is entered**. No new retrieval was needed or made for this item.
9. **`CRP-LSRC-0436`** — the owner directed that the operative APP 10 and APP 13 text be pinned to the exact current
   compilation `C2026C00227`, that compilation identity alone is insufficient, and that the qualified "typically
   30 days" statement not be promoted to a universal legal deadline. Recorded as ruled. Effect: the compilation
   remains pinned by identity only — this phase's four further attempts to read its text failed
   (`/latest/text` and `/asmade/downloads` returned "The requested title could not be loaded"; `/Html/Text` returned
   the Register's "Page not found" notice) — so the wording gap stays open. The regulator reproduction captured at
   § 11.3 D is a 22 July 2019 guideline text, not the compilation, and nothing in it is treated as the compilation's
   operative wording. The "typically 30 days" statement remains qualified and no correction deadline is entered.
10. **`CRP-LSRC-0437`** — the owner ruled that the OAIC register entry can establish the Code's identity but not the
    cited provisions' operative text, directed that an official Code copy continue to be sought, and directed that
    the text gap stay open until captured. Recorded as ruled. Effect: the Code's identity is now evidenced by the
    Code's own page as well as by the register (§ 11.3 C), the wording captured there is limited to defined terms and
    notes, the cited provisions (ss. 16, 20 and 21 as recorded in the catalogue entry) remain unverified, and the
    text gap **stays open** exactly as the ruling requires.

### 11.5 Per-ID results for PHASE5-001F (continuation E of § 8.3)

| ID | Official source found | Publisher and route | Provision captured? | Resulting status after PHASE5-001F |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | Not targeted by design | The Federal Trade Commission statute page was probed again only as a route test (§ 11.2) | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The FTC still serves the Act as a file only ("Fair Credit Reporting Act (Revised March 2026)"), so no interpretive or secondary material was retrieved or admitted and the scope decision is not reopened |
| `CRP-LSRC-0076` | Yes, and for the first time at paragraph level | GPO `govinfo.gov`: the 2018, 2020, 2022 and 2023 Edition granules of § 1681c and the 2012, 2014, 2018 and 2020 Edition granules of § 1681s-2 | **Yes, § 605(c)(1) and (2) in full, and § 623(a)(5)(A) in full; § 623(a)(5)(B) only to "does not disput"** (§ 11.3 A and B) | `GAP_OPEN — DISPOSITION RECORDED` unchanged by owner direction, and the Equifax fallback remains **not adopted**. The reachability gap recorded in § 10 is now partly closed by source text, but no rule is entered and the disposition stands as ruled for this pass (§ 11.4 item 1); the ruling's premise is recorded as overtaken at § 11.6 item 10 |
| `CRP-LSRC-0077` | Yes, for two states, as in § 10; no new state retrieved | California and Massachusetts routes not re-probed this phase | No new provision captured | `GAP_OPEN — DISPOSITION RECORDED` unchanged, and the all-states matrix remains **unadopted** under the owner's ruling. Question **Q1 is answered**: the baseline is the text in effect on 30 September 1996. The California and Massachusetts texts captured in `PHASE5-001E` are recorded as later or date-uncertain and are **not admitted**; the 1996-baseline texts are now a defined retrieval target (§ 11.4 item 2) |
| `CRP-LSRC-0078` | No | — | No | `GAP_OPEN — WILDCARD UNRESOLVED` unchanged under the owner's ruling. No state or territory mapping exists, nothing was retrieved against `US-*`, and the session, account-profile and inference routes remain not adopted (§ 11.4 item 3) |
| `CRP-LSRC-0310` | Not targeted by design | The California route was used for `CRP-LSRC-0077` in § 10 and was not re-probed | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. DFPI administrative guidance and the Witkin material remain unretrieved, unadmitted and unlocated; no authority record is created |
| `CRP-LSRC-0311` | No | The New York route was blocked at HTTP 403 in § 10 and was not re-probed | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. NYDFS guidance, the McKinney's commentaries and the named State Act remain unretrieved |
| `CRP-LSRC-0312` | No | No Washington-state route exists in this work order; the Western Australian probes in § 11.2 are unrelated and are not Washington-state evidence | No | `GAP_CLOSED_SCOPE_DECISION` unchanged. The § 8.3, § 10.4 and § 11.6 notes stand: § 625(b)(1)(E) saves only state law in effect on 30 September 1996, which is the same date the owner has now adopted as the corpus baseline, so any Washington medical-debt prohibition would still have to be located and dated in a primary source. It was not, and it is not restated or generalised here |
| `CRP-LSRC-0321` | Yes, for the named federal instrument only, as in § 8 and § 10 | Department of Justice Canada route as in § 8.3 (N3); not re-probed | No | `GAP_OPEN — CROSS-LAYER CONFLICT OPEN` unchanged. No retrieved provision states any priority, supplement or override relationship between the federal baseline and provincial instruments; the proposed shortest-window rule remains not adopted, and the owner's § 625(b)(1)(E) baseline ruling does not create one |
| `CRP-LSRC-0322` | Yes, at heading level for two provinces as in § 10, and now at section level for Manitoba sections outside the target | Manitoba Queen's Printer (`web2.gov.mb.ca/laws/statutes/ccsm/l150.php`, § 11.3 F); the Newfoundland and Labrador route was not re-probed | **Headings only for Manitoba ss. 6 and 10 and for the Newfoundland and Labrador ss. 5 to 8; Manitoba ss. 21 to 23 captured from a version the publisher calls unofficial** | `GAP_OPEN` unchanged. Under the owner's ruling, headings remain identification evidence and cannot supply the operative rule or period; the Manitoba text does not reach the target sections and is unofficial text; the Prince Edward Island `c. C-18`/`c. C-20` conflict remains unresolved by direction (§ 11.4 item 4) |
| `CRP-LSRC-0323` | Yes, at heading level, now at two consolidation points | King's Printer for Ontario: the current consolidation (as in § 10) and the 2008 historical version `ontario.ca/laws/statute/90c33/v9` (§ 11.3 E); the Prince Edward Island, New Brunswick and Nova Scotia routes unchanged | **Headings only**: "2. Registrar" and "8. To whom reports may be given" in both consolidations | `GAP_CLOSED_SCOPE_DECISION` unchanged and the deliberate non-entry is **retained**. By owner direction the catalogued description is corrected at register level: s. 2 is headed "Registrar", and no captured text shows ss. 2(2) and 2(3) to be the carve-outs the catalogue parenthetical asserts. No exclusion is applied and the catalogue is not amended in this work order (§ 11.4 item 5, § 11.6 item 13) |
| `CRP-LSRC-0324` | Yes, at heading level as above | King's Printer for Ontario (`ontario.ca/laws/statute/90c33` and its 2008 historical version); the United Kingdom and British Columbia routes unchanged from § 8 | **Headings, plus the s. 13 text already captured in § 8.4**: "8. To whom reports may be given", "13. Correction of errors" | `GAP_CLOSED_SCOPE_DECISION` unchanged and scoping **retained**. By owner direction the register-level description is corrected: s. 8 is a to-whom-reports-may-be-given provision and not an "(accurate files)" duty, and s. 13(1) requires action "within a reasonable time" and not within a universal 30 days; the United Kingdom and British Columbia comparison items are unaffected and no rule is entered (§ 11.4 item 5) |
| `CRP-LSRC-0325` | Yes, at record level for one unit, and none at provision level | Manitoba Queen's Printer (recorded above); Saskatchewan Publications Centre (`publications.saskatchewan.ca`, application shell and two HTTP 404 API paths); Government of Prince Edward Island (bot interstitial); `laws.yukon.ca` (HTTP 403); Nunavut (`gov.nu.ca` HTTP 403); the Northwest Territories route not re-probed | **No**: every unit probed is either JavaScript-only, blocked or PDF-only, and the Manitoba capture does not reach ss. 6 or 10 | `GAP_OPEN` unchanged, with every previously *unreviewed* unit now recorded as **attempted** and its blocker named: Saskatchewan (JavaScript-only), Prince Edward Island (bot interstitial), Yukon (403), Nunavut (403), Northwest Territories (Word/PDF downloads only). Under the owner's ruling, PDF and print capture are authorised source routes; no unit is mapped and no operative test is certified (§ 11.4 item 6) |
| `CRP-LSRC-0395` | No new source | Nova Scotia, Manitoba and Ontario limitation routes as recorded in § 10; no route reached a target provision this phase | No | `GAP_OPEN` unchanged, and the refusal disposition recorded in `PHASE5-001E` is **preserved**: nothing retrieved establishes a concrete conflict with it. The Nova Scotia official PDF remains located but unreadable on this channel (§ 10.1) |
| `CRP-LSRC-0396` | Yes, but not for the target sections | King's Printer for Ontario, `ontario.ca/laws/statute/02l24`, not re-probed this phase; Manitoba's consolidation captured only for other sections | No | `GAP_OPEN` unchanged: the Ontario limitations headings recorded in § 10.4 stand, the Manitoba ss. 6 and 10 text was not reached, and the refusal disposition is **preserved** under the owner's ruling (§ 11.4 item 7) |
| `CRP-LSRC-0397` | No | The Québec route returned HTTP 403 again, this phase in French (`/fr/document/lc/CCQ-1991`) | No | `GAP_OPEN` unchanged: articles 2898 and 2925 remain unretrieved and the refusal disposition is **preserved**. Under the owner's ruling these limitation provisions remain a source question and are not turned into an operational collection block (§ 11.4 item 7) |
| `CRP-LSRC-0398` | No | The Prince Edward Island route was probed a second time and again returned the Radware interstitial (new incident ID) | No | `GAP_OPEN` unchanged and the refusal disposition is **preserved**. The `c. C-18`/`c. C-20` chapter question raised in § 10.7 item 4 remains unresolved, and the PEI publisher remains the only official route to the island provisions and remains unreachable through this channel (§ 11.4 items 4 and 7) |
| `CRP-LSRC-0412` | Yes, as in § 8; no new retrieval needed or made | Statute Law Database (`legislation.gov.uk`), as recorded in § 8 | Yes: Limitation Act 1980 s. 5 (extent E+W+N.I.), Prescription and Limitation (Scotland) Act 1973 s. 6 (extent S), Limitation (Northern Ireland) Order 1989 art. 4 (extent N.I.) | Entry **remains unresolved at country level**, and the owner's ruling is recorded and applied: the verified provisions are recorded for the exact regions their own extents state, the 1980 Act being linkable to `GB-ENG` and `GB-WLS` separately because the source covers England and Wales, with Scotland separate and Northern Ireland under both the 1980 Act and the 1989 Order. The bare `UK` token still identifies no single nation, no consumer's nation is derived from session or profile data, and **no country-level rule is entered** (§ 11.4 item 8) |
| `CRP-LSRC-0413` | Not applicable — closed as a scope decision in `PHASE5-001E` | — | No | **Closed as a scope decision for this primary-law corpus**, unchanged. CRAIN remains a non-statutory industry notice and is not a source for a statutory 12-month rule; nothing this phase touches that decision, and no search-visibility or retention rule is entered |
| `CRP-LSRC-0435` | No jurisdiction reached provision level; four jurisdiction publishers were newly probed or newly characterised | ACT Legislation Register; Northern Territory legislation service; Queensland Parliamentary Counsel; New South Wales, Victorian and Tasmanian legislation services; Western Australian Parliamentary Counsel's Office (`legislation.wa.gov.au`); South Australian Attorney-General's Department | **No** operative text from any Australian State or Territory | Wildcard `AU-*` **remains unresolved**, and every unit's blocker is now named individually: New South Wales HTTP 403; South Australia HTTP 403; Victoria HTTP 404 on three address forms; Tasmania HTTP 404 on two address forms; Queensland a JavaScript-only shell with a PDF-only text route (475,692 bytes); the Australian Capital Territory a record page and version history with a PDF-only text route (900,536 bytes); the Northern Territory a record page with Word and PDF downloads only; Western Australia reachable but with both probed numeric addresses resolving to *different* instruments, so the Limitation Act 2005's own address was not located. No Australian limitation period, remedy-bar or extinguishment label is verified, no heading-level capture was obtained, and the session/account-profile route remains not adopted. Per § 11.4 item 6 and item 7, official PDF and print capture are authorised routes for the next cohort, and no limitation provision is used as a collection block |
| `CRP-LSRC-0436` | Yes, for the compilation identity and now for a regulator reproduction of the APP text, but still not for the compilation's wording | Federal Register of Legislation (`legislation.gov.au/Details/C2026C00227`, and the failing `/latest/text`, `/asmade/downloads` and `/Html/Text` forms) and the OAIC APP guidelines chapters 10 and 13 | **Identity, plus APP 10.1–10.2 and the APP 13 timing and no-charge passages reproduced in the guidelines (version 1.1, 22 July 2019)** (§ 11.3 D); the `C2026C00227` wording is still not captured | Text gap **still open on the operative wording**. The compilation remains pinned by register ID `C2026C00227`, compilation `C104`, 04 June 2026, "In force", whose contents list carries APP 10 in Schedule 1 Part 4 and APP 13 in Schedule 1 Part 5; four further attempts to read its text failed this phase. Per the owner's ruling the compilation identity alone is insufficient, so the 22 July 2019 guideline reproduction is recorded as a regulator reproduction only. The "typically 30 days" statement stays qualified as an agency-only period, with organisations on "a reasonable period" that the guidelines describe as a general guide not exceeding 30 calendar days, and with no charge. No correction, dispute or deadline rule is entered (§ 11.4 item 9, § 11.6 item 11) |
| `CRP-LSRC-0437` | Yes, and for the first time the Code's own wording, though only its dictionary entries | OAIC Code page at the corrected slug `oaic.gov.au/privacy/privacy-registers/privacy-codes/privacy-credit-reporting-code-2024`; the OAIC privacy codes register; the Federal Register of Legislation instrument ID probed for the Code in § 10.7 item 10 resolved to a different instrument | **Partly**: four defined terms and their notes, quoted verbatim in § 11.3 C; no clause numbering, no commencement clause and none of the cited provisions | Gap **remains open** as the owner directed. The Code's identity is now evidenced by the Code's own page as well as by the register, and its text is shown to be published by the OAIC, but the captured wording is limited to defined terms and notes, so ss. 16, 20 and 21 remain unverified, its date of effect is unestablished, and no Code rule is entered (§ 11.4 item 10) |

### 11.6 New material divergences, conflicts and route corrections

Per the work order, every owner ruling recorded in § 11.4 is **preserved**, every conflict is recorded with the
source described or quoted, and no disposition is silently overwritten. Items 10 to 15 continue the § 8.4 and § 10.5
numbering.

10. **The factual premise of the owner's ruling on `CRP-LSRC-0076` is overtaken by source text captured after the
    ruling.** The ruling directs that § 605(c) and § 623(a)(5) be kept partial/open because the official routes were
    exhausted. Those routes were exhausted as documented in § 10.1 to § 10.3 for the address forms used in that work
    order, but this work order captured § 605(c)(1) and (2) in full and § 623(a)(5)(A) in full from the same
    publisher's Edition-specific granules (§ 11.3 A and B). The conflict is between the ruling's premise and the new
    record, not between the ruling and any legal text. Recorded for direction: the ruling stands, the disposition
    stands, the Equifax fallback remains **not adopted**, and the newly captured text is recorded as captured text
    that creates no rule.
11. **Australia — the 30-day figure is corroborated as an agency period and as a non-binding guide, and remains not
    a deadline.** APP guidelines chapter 13 (version 1.1, 22 July 2019) states: "The 30 day time period commences on
    the day after the day the agency receives the request. An organisation must respond within a reasonable period
    after the request is made. As a general guide, a reasonable period should not exceed 30 calendar days." That is
    consistent with the qualified reading preserved at § 10.5 item 9 and § 8.4 item 2, so it is recorded as
    corroboration rather than as a conflict. The caution recorded with it is that the same page is the source of both
    the "30 day" and the "30 calendar days" figures, so no entry may cite it as a statutory period; the owner's
    direction not to promote the "typically 30 days" statement is preserved.
12. **The "elided middle" recorded in § 8 and § 10 is a property of this retrieval channel, not of the publishers.**
    Pages recorded there as eliding a provision were not necessarily unreachable in principle: the elision follows
    from the channel's head-and-tail capture (§ 11.1, first finding), and this phase reached two provisions that
    § 10.3 had recorded as unretrieved by choosing different official pages rather than different publishers. This is
    recorded as a correction of a *method* finding. Nothing recorded in § 8 or § 10 as unretrieved is promoted by it:
    each such record stands as the record of the address tried in that work order.
13. **Ontario description divergence, corrected at register level only.** By owner direction the two catalogue
    descriptions are corrected in this register: s. 2 is headed "Registrar" and s. 8 is headed "To whom reports may
    be given", while the catalogue's parentheticals still describe carve-outs and "(accurate files)", and s. 13's
    parenthetical still describes a "30-day dispute investigation framework". The corrections are supported at
    heading level at two consolidation points (§ 11.3 E), and the s. 13 correction by the operative wording already
    captured in § 8.4 item 1. Because this work order preserves the catalogue's schema and entries, the catalogue is
    left unamended and the divergence is recorded here so that the parentheticals are not relied on in any later
    work.
14. **Route corrections recorded for the record.** Four route findings of earlier phases are corrected as route
    findings, not as legal findings: the OAIC page carrying the Privacy (Credit Reporting) Code 2024 is live under
    the `…/privacy-codes/…` slug recorded in § 11.2, the `…/privacy-codes-register/…` form used in § 10 being the
    404; the Western Australian address `…/main_mrtitle_528_homepage.html` recorded in § 10.4 as the publisher's
    index now resolves to *Law Reform (Statute of Frauds) Act 1962*, so that row's description is corrected to a
    different-instrument return; the King's Printer for Ontario serves complete historical consolidations at
    `ontario.ca/laws/statute/90c33/v9`, which no earlier phase used; and the GovInfo section granules require
    `subchapIII` in the path and an Edition old enough that the target subsection is not pushed past the readable
    head.
15. **Q1 is answered and no retrieved source conflicts with the answer.** The owner's ruling adopts the text in
    effect on 30 September 1996 as the baseline for § 625(b)(1)(E) and sets the admission test for later amendments
    (§ 11.4 item 2). The retrieved text of § 625(b)(1)(E) — that no state requirement or prohibition may be imposed
    about § 605 subject matter, saving only state law "in effect on September 30, 1996" — is consistent with that
    baseline, and nothing retrieved this phase contradicts it. No source conflict is therefore recorded for Q1. What
    is recorded instead is that the two states already captured at current text cannot supply baseline rules:
    California's Title 1.6 text was amended with effect from 1 January 2025 and § 1785.10 was re-enacted in 2002, and
    the Massachusetts publisher serves no history note at all, so both baseline texts must still be located in
    official primary sources before any state rule is admitted. That is a source-completion gap, not a conflict.

### 11.7 Boundaries observed, and what this work order did not do

- **No disposition field changed for any of the twenty-one IDs.** Every `GAP_*` value recorded in § 3, § 8.3, § 10.4
  or `PHASE5-001E` stands. Two things did move, and both are recorded rather than inferred: **Q1 is answered** by
  owner ruling, and the **review status** of the units that § 10.7 called entirely unreviewed (Saskatchewan, Prince
  Edward Island, Yukon, the Northwest Territories and Nunavut) and of the Australian State and Territory units moves
  from *unreviewed* to *attempted*, with each blocker named in § 11.5. Neither movement is a closure and neither
  creates a rule.
- Governed rules created: **0**. Legal coverage created: **0**. Authority to emit `VIOLATION` or
  `PROBABLE_VIOLATION`: **none**. Wildcards resolved: **0**. Refusals closed: **0**. Deliberately-not-entered items
  entered: **0**. Off-report inference of any report fact, statutory event date or consumer jurisdiction: **none** —
  in particular the newly captured § 605(c) and § 623(a)(5)(A) text was not used to derive any date, period,
  commencement point or delinquency rule for any account, and no period was entered anywhere in this register from
  it.
- Runtime code, the evaluator, tests, consumer workflows and the legacy application were not touched, and no
  permanent discovery registry was created. Source-record counts remain separate from unique legal provisions, as
  § 11.2 states.
- **The catalogue was not amended.** No entry in `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` needed a field change to
  record these retrievals, and this work order preserves its schema and its unrelated entries, so it remains at 437
  entries, 437 distinct IDs and 15 fields with SHA-256
  `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`, unchanged from § 8, `PHASE5-001D` and
  `PHASE5-001E`. The Ontario description corrections directed by the owner are therefore recorded in this register
  only (§ 11.6 item 13).
- **Recorded for honesty.** The two federal captures are Edition-specific U.S. Code granules whose editions are
  earlier than the current edition, and the § 605(c) page states its own edition in its header; § 623(a)(5)(B) is
  captured only in part and is labelled partial everywhere it appears; the Code wording captured from the OAIC is a
  dictionary extract, not a clause; the APP passages are a regulator reproduction dated 22 July 2019, not the
  compilation; the Manitoba section text is text the publisher itself calls unofficial; the record-level captures
  for the Australian Capital Territory, the Northern Territory and the Federal Trade Commission are identity or
  version-history evidence and are never presented as provision text; and the three Western Australian and Federal
  Register addresses that resolved to other instruments are recorded as such, not as retrievals.

### 11.8 Remaining owner decisions, external-capture needs and the next cohort

This section continues § 10.7 and supersedes that list for the remainder of this work order, because § 10.7 sits
inside the hashed `PHASE5-001E` region. Of § 10.7's ten items this phase advanced item 1 (with the premise conflict
at § 11.6 item 10), answered item 2 (Q1 by ruling, the baseline capture it implies being carried forward below), left
item 3 unchanged, settled the heading-evidence half of item 4 while leaving the Prince Edward Island chapter
question open, settled item 5 by ruling, acted on items 6 and 7 by giving the authorisations and naming each
publisher's blocker, settled item 8 by ruling, left item 9 open with four further failed attempts, and advanced item
10 by locating the Code's own text page. The items that remain are these.

**Genuine external-capture needs — routes that exist but cannot be read through this channel:**

1. **Canadian publishers that serve only PDFs, print or a JavaScript application.** The Nova Scotia Legislative
   Counsel (the two official PDFs of 215,628 and 351,156 bytes located in § 10.1); the Manitoba bilingual (PDF)
   official version of C.C.S.M. c. L150, which the publisher's own page names as the official copy; the Northwest
   Territories download files `6BA257645CA52C3069257FFE000523EC_PDFVersion_1.pdf` and its Word twin; the
   Saskatchewan Publications Centre, whose application shell and two HTTP 404 API paths yielded no file pointer at
   all; the Prince Edward Island publisher, which is bot-gated; the Yukon and Nunavut publishers, which return
   HTTP 403; and LégisQuébec, which returns HTTP 403 on both language paths.
2. **Australian publishers that serve only PDFs.** The Australian Capital Territory's Limitation Act 1985 R28 PDF
   (900,536 bytes) and the Queensland Limitation of Actions Act 1974 PDF (475,692 bytes) are both located, both
   named and both unreadable here; and the Federal Register of Legislation's file for compilation `C2026C00227`,
   which is needed to pin the Schedule 1 wording of APP 10 and APP 13 under the owner's ruling on `CRP-LSRC-0436`.
3. **United States state baseline texts as at 30 September 1996.** California's Consumer Credit Reporting Agencies
   Act (Civil Code Title 1.6) as in effect on that date, and Massachusetts G.L. c. 93 § 52 as in effect on that date
   together with its amendment history. Without these the owner's baseline admission test cannot be applied to
   either state, so no state content rule can be admitted even though the all-states matrix remains unadopted.
4. **One partial-capture completion.** The balance of § 623(a)(5)(B) after the words "does not disput" — a short
   passage, but the only part of the two federal provisions in `CRP-LSRC-0076` that no official page reached through
   this channel exposes.

**Decisions still needed from the owner:**

1. `CRP-LSRC-0076` — whether the newly captured § 605(c) and § 623(a)(5)(A) text may be treated as captured source
   text for this corpus and whether the disposition stays open as ruled, and whether an out-of-band capture of the
   balance of § 623(a)(5)(B) is wanted. The Equifax fallback stays not adopted under either course.
2. `CRP-LSRC-0077` — whether the 1996-baseline texts of California's Title 1.6 and Massachusetts G.L. c. 93 § 52 are
   to be captured from official session-law or print sources, and confirmation that the 2024 California
   medical-debt amendment and the 2002 re-enactment remain recorded as later amendments only.
3. `CRP-LSRC-0078` — unchanged from § 10.7 item 3: supply a state or territory mapping, or record the wildcard as
   permanently unresolved for this corpus.
4. `CRP-LSRC-0322` — rule which Prince Edward Island chapter number is correct (`c. C-18` or `c. C-20`); the
   heading-evidence question is settled by the owner's own ruling of this phase.
5. `CRP-LSRC-0323` and `CRP-LSRC-0324` — confirm that the register-level description corrections at § 11.6 item 13
   are the corrected record, and say whether the catalogue's parentheticals may be amended in a later, separately
   authorised catalogue edit.
6. `CRP-LSRC-0325` — confirm that the named blockers in § 11.5 satisfy the "attempted" record for the five units
   § 10.7 called unreviewed, and whether out-of-band captures should be requested for any of them.
7. `CRP-LSRC-0395` to `CRP-LSRC-0398` — authorise the specific print or PDF captures listed in the external-capture
   list above, and confirm that the three refusal dispositions and the no-duplicate-rule decision remain preserved as
   recorded.
8. `CRP-LSRC-0435` — decide whether the per-jurisdiction blockers recorded in § 11.5 are to be pursued through
   out-of-band captures of the State and Territory PDFs, and whether Western Australia's Limitation Act 2005 address
   should be supplied from an official source rather than probed further.
9. `CRP-LSRC-0436` — decide whether an out-of-band read of the `C2026C00227` file is required, given that the
   compilation identity is confirmed and the regulator's own guideline reproduction is now captured but is not the
   compilation's wording.
10. `CRP-LSRC-0437` — decide whether the Code's dictionary extract at § 11.3 C is to be recorded as partial Code
    wording while the text gap stays open, and whether an out-of-band read of the Code's file is required.
11. `CRP-LSRC-0412` — confirm the per-region recording directed by the owner's ruling as applied at § 11.4 item 8,
    while the bare `UK` token stays unresolved.

**Next unreviewed source cohort.** The remaining work is no longer mainly a matter of finding publishers: it is the
external-capture list above, plus three provision-level routes that remain unlocated — the Western Australian
Limitation Act 2005's own address, the Federal Register of Legislation's file route for `C2026C00227`, and a complete
official page for § 623(a)(5)(B). No entry outside the twenty-one targeted IDs was reviewed or touched by this work
order, and no cohort may be reported as complete while any of these remains outstanding.

Register SHA-256 at completion of `PHASE5-001F`: `0A610719E21BF5B6EB58BA6D08A71496FBD59D53EBAD52CD5B592DD04F95BC6D`

Digest method for the PHASE5-001F value: it covers every line of this register up to and including the last blank
line that precedes this digest line — that is all of §1 to §10 as they stood at the end of `PHASE5-001E` plus §11 as
added by `PHASE5-001F` — and it deliberately excludes this digest line, the blank line after it and this note, which
keeps the value stable and non-circular. To verify, delete everything from the start of this digest line to the end of
the file, then hash the remainder as UTF-8 without a BOM with CRLF line endings: `1448` lines and `192,458` bytes. The
`PHASE5-001E` value above is unaffected by this section, because §11 begins after that digest block; deleting from the
start of the `PHASE5-001E` digest line to the end of the file still reproduces its recorded 928-line, 127,508-byte
region.

## 12. PHASE5-001G — owner rulings applied and official files captured

### 12.1 Method, tools, evidence rules and the change in the retrieval channel

This work order continues § 11 under the same evidence rules: a record counts as **retrieved** only where the
publisher's own route returned *and* the target provision text was captured; a route that returned without the
provision is `PARTIAL`; a blocked, absent, binary-only or JavaScript-only route is `NOT RETRIEVED`. Search
snippets, summaries, regulator guidance used as a substitute for an instrument, law-firm material, unofficial
mirrors and any reconstruction from memory were again **not** admitted as evidence, and no retrieval below
creates a governed rule, legal coverage, finding authority, jurisdiction resolution or closure of a refusal.
Retrieval date for every record below: **2026-09-30**.

**The channel changed, and that is the single most important finding of this phase.** §§ 10.1 and 11.1 recorded
that official PDFs were *locatable but not capturable*, that a returned page was truncated to roughly its first
4.5 kB and last 11 kB, and that binary bodies carried no extractable text. Those findings were accurate about the
web-reading channel used in those phases and they remain accurate as records of those phases. This work order
instead **downloaded each official file to local storage and extracted its text locally**: an ordinary HTTP
client for retrieval (`curl`, `Invoke-WebRequest`) and Poppler `pdftotext -layout -enc UTF-8` for PDF text, with
Python 3.12 `pypdf` 6.14.2 and `PyMuPDF` 1.23.14 available as secondary extractors. On that path there is no
head-and-tail elision, no truncation and no binary blindness, so every publisher that serves a stable official
file URL became capturable. Nothing about the publishers changed; only the retrieval path did. Where §§ 10 and
11 named a blocker of the form "binary PDF, no extractable text" or "elided middle", those records stand as
written and are **superseded for text capture only** by the captures at § 12.5, item by item.

**Evidence handling.** Every original official file is preserved unmodified under `SOURCE_CAPTURES\PHASE5-001G\`
with its publisher URL, byte size and SHA-256 recorded in § 12.7; each extracted text is preserved beside its
original, and each capture at § 12.5 cites the extracted text by page or section locator. That directory is an
evidence store for this register: it is not runtime code, not an evaluator, not a test, not a consumer workflow,
not part of the legacy application and not a permanent discovery registry, and no product path reads or executes
anything in it.

**No OCR was used and no scanned page was transcribed.** Every PDF retrieved carried a real text layer;
`pdftotext` returned text on the first attempt in each case (page counts 11, 13, 18, 27, 28, 47, 60 and 72 for
the eight extracted PDFs), so no page image was transcribed as if it were verified text and no OCR caveat
attaches to any quotation below. The one non-PDF binary that mattered is the Federal Register of Legislation's
public OData service, which returns JSON and is recorded as a route finding, never as a provision.

**Requests issued in this work order: 94**, counted per HTTP request, so where one publisher was probed through
several forms of the same address each form is counted separately. Retrieval families used: the U.S. Government
Publishing Office; the Federal Register of Legislation and its public OData API; the Office of the Australian
Information Commissioner; the Australian Capital Territory and Queensland legislation services and the Western
Australian Parliamentary Counsel's Office; the Nova Scotia Legislative Counsel, the Manitoba Queen's Printer, the
Northwest Territories Department of Justice, the Prince Edward Island publisher, the Saskatchewan Publications
Centre, the Yukon laws site, the Government of Nunavut and LégisQuébec; the California Legislative Counsel; and
the Massachusetts General Court together with the State Library of Massachusetts.

### 12.2 The eleven owner rulings recorded

Each ruling is recorded in the owner's terms, then its effect on this register is stated. No disposition field is
changed beyond what a ruling directs, and no ruling creates a governed rule.

1. **`CRP-LSRC-0076`** — accepted, and the accepted premise is now complete rather than partly complete. The
   § 605(c) text captured in § 11.3 B and the § 623(a)(5)(A) text captured in § 11.3 B are recorded as captured
   source text of the United States Code as published by the Government Publishing Office, and the register no
   longer states that those passages are unreachable. **§ 623(a)(5)(B) is no longer partial**: its remaining
   words were captured in full this phase from the same publisher's 2014 Edition granule (§ 12.5 A), so no part
   of § 623(a)(5) is outstanding. The Equifax fallback remains **not adopted** and creates no rule; no date,
   period, commencement point or delinquency rule is entered anywhere in this register from either provision.
2. **`CRP-LSRC-0077`** — the 30 September 1996 baseline stands and official historical capture continued for both
   named states. Massachusetts' 1995 c. 125, an emergency act effective 31 January 1996, was captured in full from
   the State Library of Massachusetts (§ 12.5 G), and the California sections' current text and their official
   amendment-history lines were captured (§ 12.5 H). Later amendments remain recorded as later amendments only:
   no amendment is admitted as saved state law, the all-states matrix remains **not adopted**, and no state
   content rule is entered.
3. **`CRP-LSRC-0078`** — recorded as directed: `US-*` is a **permanently non-operative wildcard** for this corpus,
   not a jurisdiction mapping and not a legal rule. No mapping was created, nothing was retrieved against it, no
   state or territory rule is entered from it, and no consumer's jurisdiction is or may be resolved from session,
   account-profile or other off-report data. Exact-state work continued only where an existing record already
   names a jurisdiction, namely the California and Massachusetts baseline work at item 2.
4. **`CRP-LSRC-0322`** — the Prince Edward Island chapter-number conflict (`c. C-18` against `c. C-20`) is
   **left unresolved**, as directed, because no official capture settled it (§ 12.5 I). The prohibition is
   recorded as operative: headings and contents lists may identify a section for research, but no operative test
   is certified from a heading, and none is certified anywhere below. No chapter number is recorded as verified.
5. **`CRP-LSRC-0323`** and **`CRP-LSRC-0324`** — approved: the register corrections at § 11.6 item 13 are the
   corrected record, matching the captured Ontario headings and wording, namely that the Consumer Reporting Act's
   s. 2 is "Registrar", its s. 8 is "To whom reports may be given", and that the Limitations Act, 2002's s. 13(1)
   is "within a reasonable time" rather than a universal 30-day period. No description of any operative effect
   was added beyond the captured headings, and the catalogue's parentheticals are **not** amended by this work
   order: the catalogue is untouched and remains at its recorded digest (§ 12.7 item 2), so any such edit remains
   a separate, later, separately authorised catalogue action.
6. **`CRP-LSRC-0325`** — the attempted status of the five blocked Canadian units is accepted, and this phase
   advanced it where an official file existed: Nova Scotia, Manitoba and the Northwest Territories are now
   captured as **official text** (§ 12.5 D and E), while Saskatchewan, Prince Edward Island, Yukon and Nunavut
   remain blocked with their exact blockers named in § 12.3 and § 12.5 I. No unit is mapped from a heading, and
   each unit stays unmapped except where operative text is now captured.
7. **`CRP-LSRC-0395`** to **`CRP-LSRC-0398`** — the three refusal dispositions and the Prince Edward Island
   no-duplicate relationship are unchanged. Nova Scotia s. 12 (`0395`) and Québec's articles 2898 and 2925
   (`0397`) are now captured from official sources (§ 12.5 D and F); Ontario's ss. 5 and 15 (`0396`) remain
   uncaptured; no limitation rule operates as a collection block, and the 2015-06-01 in-force date for the Nova
   Scotia Act remains unverified by the captured source (§ 12.6 item 4).
8. **`CRP-LSRC-0412`** — the exact-region recording made at § 11.4 item 8 is confirmed and is not reopened. The
   England-and-Wales source may be linked to `GB-ENG` and to `GB-WLS` separately because its own recorded
   territorial extent covers both; the bare `UK` token stays unresolved and non-operative; no new retrieval was
   made or needed for this item.
9. **`CRP-LSRC-0435`** — official captures for all Australian jurisdictions remain authorised, and two of the
   blocked jurisdictions are now captured: the Australian Capital Territory and Queensland (§ 12.5 C). Western
   Australia and South Australia remain attempted with their precise blockers (§ 12.5 I); `AU-*` stays
   non-operative and no jurisdiction is resolved from any wildcard.
10. **`CRP-LSRC-0436`** — the exact text in compilation `C2026C00227` is required, and it is **not** captured. Its
    identity is now joined by the compilation's own document record from the Register's public API — 472 pages,
    an authorised PDF of 1,920,725 bytes, with unauthorised Word and Epub twins — but no route reachable from
    this environment returns those bytes (§ 12.5 I). The requirement therefore stands unmet, the OAIC
    reproduction at § 11.3 D remains a regulator reproduction and not the compilation's wording, and no deadline
    is entered from any reproduction.
11. **`CRP-LSRC-0437`** — the captured dictionary is accepted and labelled **partial** as directed, and the text
    gap the ruling left open is now closed by capture rather than by argument: the Privacy (Credit Reporting)
    Code 2024 was retrieved as the OAIC's own PDF and extracted in full, so ss. 1 to 3, 16, 20 and 21 — the
    provisions the ruling named — are captured verbatim at § 12.5 B along with the rest of the instrument. The
    partial-dictionary statement at § 11.3 C remains an accurate record of what the previous phase held; it is
    superseded for text capture by the full-instrument capture recorded here.

### 12.3 Retrieval ledger for PHASE5-001G

| Route requested | Publisher | Outcome | Result class |
| --- | --- | --- | --- |
| `govinfo.gov` granule `USCODE-2014-title15-chap41-subchapIII-sec1681s-2.htm`, downloaded whole | U.S. Government Publishing Office | **Page returned in full**: § 623(a)(5)(A) and **§ 623(a)(5)(B)(i) to (iii) complete**, then § 623(a)(6) onward | `RETRIEVED` — target paragraph captured complete |
| `oaic.gov.au/privacy/privacy-registers/privacy-codes/privacy-credit-reporting-code-2024`, downloaded whole | Office of the Australian Information Commissioner | **Page returned in full** (107,870 bytes): it publishes the Code and carries the Code's own PDF at `/__data/assets/pdf_file/0029/242588/Privacy-Credit-Reporting-Code-2024.pdf` | `RETRIEVED` — route and file link |
| The Code's PDF at that path (643,427 bytes) | Office of the Australian Information Commissioner | **Official PDF downloaded** (60 pages) and extracted in full (178,406 characters) | `RETRIEVED` — Code text captured |
| `legislation.act.gov.au/DownloadFile/a/1985-66/current/PDF/1985-66.PDF` (900,536 bytes) | ACT Parliamentary Counsel's Office | **Official PDF downloaded** (72 pages): "Limitation Act 1985, A1985-66, Republication No 28, Republication date: 26 November 2025" | `RETRIEVED` |
| `legislation.qld.gov.au/view/pdf/inforce/current/act-1974-075` (475,692 bytes) | Office of the Queensland Parliamentary Counsel | **Official PDF downloaded** (47 pages): "Limitation of Actions Act 1974, Current as at 28 April 2026" | `RETRIEVED` |
| `nslegislature.ca/sites/default/files/legc/statutes/limitation%20of%20actions.pdf` (215,628 bytes) | Nova Scotia Legislative Counsel | **Official PDF downloaded** (13 pages): "Limitation of Actions Act, CHAPTER 35 OF THE ACTS OF 2014, as amended by 2015, c. 22" | `RETRIEVED` |
| `nslegislature.ca/sites/default/files/legc/statutes/consumer%20reporting.pdf` (351,156 bytes) | Nova Scotia Legislative Counsel | **Official PDF downloaded** (18 pages): "Consumer Reporting Act, CHAPTER 93 OF THE REVISED STATUTES, 1989" | `RETRIEVED` |
| `web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=l150` (408,047 bytes) | Manitoba Queen's Printer | **Official bilingual PDF downloaded** (28 pages), the copy the publisher's own HTML names as the official version: "Current from 30 May 2023 to 28 Sept. 2026", accessed 30 Sept. 2026 | `RETRIEVED` |
| `justice.gov.nt.ca/en/files/legislation/limitation-of-actions/limitation-of-actions.a.pdf` (89,694 bytes) | Northwest Territories Department of Justice | **Official bilingual PDF downloaded** (27 pages): "LIMITATION OF ACTIONS ACT / LOI SUR LES PRESCRIPTIONS, R.S.N.W.T. 1988, c.L-8 … In force July 19, 1993" | `RETRIEVED` |
| `legisquebec.gouv.qc.ca/en/document/cs/CCQ-1991` | LégisQuébec | **Page returned in full** (6,001,882 bytes): the HTTP 403 recorded in §§ 8, 10 and 11 is not reproduced on this path | `PARTIAL` — arts. 2898 and 2925 captured; the whole Code was not converted |
| `leginfo.legislature.ca.gov` section pages for Civil Code 1785.10, 1785.13 and 1785.16, downloaded whole | California Legislative Counsel | **Pages returned in full** with each section's operative text and its official amendment-history line | `RETRIEVED` — current text and history |
| `leginfo.legislature.ca.gov` bill pages `199519960AB1376` and `199519960SB1691`, and the 1995-1996 session bill list | California Legislative Counsel | **Bill pages returned as complete bills**, so the 1995-1996 session is served here; the session bill list returns 1,013,777 bytes but exposes no bill rows on this path, and the section page's "cross-reference chaptered bills" control is a JSF postback | `PARTIAL` — route availability proven, baseline text not reached |
| `archives.lib.state.ma.us` DSpace item search and item, bundle and bitstream endpoints | State Library of Massachusetts | **Item found and file retrieved**: "1995 Chapter 0125. An Act Further Regulating Consumer Reporting Agencies." (handle 2452/25465), served as a 348,019-byte page PDF and as the publisher's own 30,828-byte text | `RETRIEVED` — 1995 Act captured |
| `malegislature.gov/Laws/SessionLaws/Acts/1996` and `…/Acts/1996/Chapter1` | Massachusetts General Court | HTTP 404 on both, although `…/Acts/1997` returns; no 1996 session-law index is served on this path | `NOT RETRIEVED` |
| `api.prod.legislation.gov.au/v1/titles?registerId=C2026C00227` (585,662 bytes), `…/v1/$metadata` and `…/v1/documents?$filter=registerId eq 'C2026C00227'` | Federal Register of Legislation | **Records returned**: title and version records, the OData service metadata, and the compilation's three document records — Word 511,923 bytes, Epub 234,835 bytes, **Pdf 1,920,725 bytes, 472 pages, isAuthorised=true** | `PARTIAL` — document record captured, file bytes not |
| `legislation.gov.au` `/C2026C00227/latest/downloads`, `/latest/download/pdf`, `/latest/download/docx`, `/asmade/download/pdf`, `/latest/downloads/pdf`, `/Details/C2026C00227/Download` and `/api/titles/C2026C00227` (seven forms) | Federal Register of Legislation | **Each returned HTTP 200 with the single-page application shell** (62,729 to 62,758 bytes, titled "Home Page" or "Federal Register of Legislation Home Page"); none returned a file body | `NOT RETRIEVED` — no file route on this channel |
| OData key addressing of the compilation document, two forms (named and positional composite key) | Federal Register of Legislation | HTTP 404 on both; the `Document` entity type carries no stream and the `Content` entity set serves site content only | `NOT RETRIEVED` |
| `princeedwardisland.ca/sites/default/files/legislation/<chapter>.pdf` for `c-17` and `l-08` | Government of Prince Edward Island | **Official PDFs downloaded** (15,836 and 15,888 bytes) and identified from their own first lines as, respectively, the repealed Conflict of Interest Act (Cap. C-17) and the repealed Legislative Assembly Retirement Allowances Act (Cap. L-8) | `RETRIEVED` — file path proven, non-target instruments |
| The same path for `c-18`, `C-18`, `c18`, `cap-c-18`, `c-18_consumer_reporting_act`, `c-18-consumer-reporting-act`, `c-18-consumer-reporting`, `consumer_reporting_act`, `c-19`, `c-20`, `c-21`, `c-22`, `l-07`, `l-09` and `s-07` (fifteen further forms) | Government of Prince Edward Island | HTTP 404 with "The page you requested does not exist" for every form; the statute index pages return a Radware browser challenge instead of the index | `NOT RETRIEVED` — chapter question unsettled |
| `legislation.wa.gov.au/legislation/statutes.nsf/RedirectURL?OpenAgent&query=Limitation+Act+2005` and `…/legislation/statutes.nsf/law_a2914.html` | Parliamentary Counsel's Office, Western Australia | **Pages returned**: the first is titled "WALW - Unknown File"; the second resolves to the Naval Deserters Act 1884, not to the Limitation Act 2005 | `NOT RETRIEVED` |
| `publications.saskatchewan.ca/` | Saskatchewan Publications Centre | HTTP 200 with a 1,215-byte application shell and no file pointer | `NOT RETRIEVED` |
| `laws.yukon.ca/legislation/legis_reg_acts.html` and `gov.nu.ca/justice/information/acts-and-regulations` | Yukon laws site; Government of Nunavut | HTTP 403 on both (5,560 and 5,609-byte challenge pages) | `NOT RETRIEVED` |
| `legislation.sa.gov.au` | Attorney-General's Department, South Australia | Not re-probed this phase; the HTTP 403 recorded in § 10.2 and § 11.2 stands | `NOT RETRIEVED` |

Two notes on this ledger. First, the byte sizes of the four files that §§ 10 and 11 had *located without
capturing* match this phase's downloads exactly — 215,628 and 351,156 bytes for the two Nova Scotia PDFs,
900,536 for the Australian Capital Territory and 475,692 for Queensland — which confirms that those phases had
identified the same official files that this phase retrieved. Second, `RETRIEVED` above means the publisher's
own file or page was captured on this path; it is not a statement about any law's operation, and no row in this
ledger creates a governed rule, a period, a deadline or a jurisdiction.

### 12.4 Per-ID results for PHASE5-001G (continuation F of § 8.3)

| ID | Source found | Publisher and route | Provision captured? | Resulting status after PHASE5-001G |
| --- | --- | --- | --- | --- |
| `CRP-LSRC-0075` | Not targeted by design | The FTC route was not re-probed | No | `GAP_CLOSED_SCOPE_DECISION` unchanged: the FTC serves the Act as a file only, no interpretive or secondary material was retrieved or admitted, and the scope decision is not reopened |
| `CRP-LSRC-0076` | Yes, and complete | GPO `govinfo.gov`, the 2014 Edition granule of `…sec1681s-2.htm` downloaded whole | **Yes: § 623(a)(5)(B)(i) to (iii) in full**, completing the paragraph whose capture had stopped at "does not disput" | `GAP_OPEN — DISPOSITION RECORDED` unchanged by owner direction and the Equifax fallback remains **not adopted**. The partial-capture limitation recorded in §§ 10.4 and 11.3 B is cleared for text capture, no rule is entered, and the § 11.6 item 10 premise conflict is closed because no part of § 623(a)(5) remains unreachable |
| `CRP-LSRC-0077` | Yes, and for the first time for a 1996-effective amendment of a named state | State Library of Massachusetts DSpace (handle 2452/25465); California Legislative Counsel section pages | **Massachusetts 1995 c. 125 in full** (§ 12.5 G), California's three current section texts with their official amendment-history lines (§ 12.5 H); no baseline text captured | `GAP_OPEN — DISPOSITION RECORDED` unchanged and the all-states matrix remains **unadopted**. The 1995 Act is recorded as 1996-effective historical evidence and not as the § 52 baseline, because it does not amend § 52; California's pre-1996 text is still not captured; no state rule is entered |
| `CRP-LSRC-0078` | No | — | No | `GAP_OPEN — WILDCARD UNRESOLVED`, now recorded by owner direction as a **permanently non-operative wildcard**: not a mapping, not a rule, and never resolvable from session, profile or off-report data |
| `CRP-LSRC-0310` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged; DFPI guidance and the Witkin material remain unretrieved, unadmitted and unlocated, and no authority record is created |
| `CRP-LSRC-0311` | No; not re-probed | The New York route's HTTP 403 stands | No | `GAP_CLOSED_SCOPE_DECISION` unchanged; NYDFS guidance, the McKinney's commentaries and the named State Act remain unretrieved |
| `CRP-LSRC-0312` | Not targeted; the Western Australian probes in § 12.3 are unrelated and are not Washington-state evidence | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged; § 625(b)(1)(E)'s 30 September 1996 baseline is now the owner's ruled corpus baseline, and any Washington medical-debt prohibition would still have to be located and dated in a primary source |
| `CRP-LSRC-0321` | Yes, indirectly: four provincial instruments captured this phase | Nova Scotia Legislative Counsel; Manitoba Queen's Printer; Northwest Territories Department of Justice | Captured text of Nova Scotia's Limitation of Actions Act ss. 8 and 12 and Consumer Reporting Act s. 10(3), Manitoba's C.C.S.M. c. L150 ss. 1 and 10, and the Northwest Territories' Limitation of Actions Act s. 2 | `GAP_OPEN — CROSS-LAYER CONFLICT OPEN` unchanged. No captured provision states any federal-provincial priority, supplement or override relationship; Manitoba's s. 1(c) is a conflict rule between Manitoba's own statutes ("does not apply if another Act contains a specific limitation period … or otherwise conflicts with this Act") and not a cross-layer rule; the proposed shortest-window rule remains **not adopted** |
| `CRP-LSRC-0322` | Yes, for two of the named bases | Nova Scotia Legislative Counsel; LégisQuébec | **Yes, in part**: Nova Scotia's Consumer Reporting Act s. 10(3)(c), (ca), (da) and (e); Québec's Civil Code arts. 2898 and 2925 — neither provision being the one the owner's list named for those jurisdictions | Gap **not** closed. The captured Nova Scotia text places the six-year reporting limits in **s. 10(3)** rather than the recorded s. 11(3) and states the Act's chapter as **c. 93**; the captured Québec provisions are arts. 2898 and 2925 rather than art. 30; Manitoba's named Personal Investigations Act c. P34 was not captured (the Limitations Act c. L150 was retrieved instead); the Prince Edward Island chapter conflict (`c. C-18` against `c. C-20`) is unresolved; no bankruptcy or collection retention figure is verified for any province and no mapping is created |
| `CRP-LSRC-0323` | Yes, per the owner's ruling | King's Printer for Ontario, as recorded in §§ 10.3 D and 11.3 E | Headings only: "2. Registrar" and "8. To whom reports may be given" | `GAP_CLOSED_SCOPE_DECISION — EXCLUSION GROUNDED (UNRETRIEVED)` unchanged. The register description is corrected as approved by the owner, ss. 2 and 8 text remains uncaptured, the deliberate non-entry stands, and the catalogue is not amended |
| `CRP-LSRC-0324` | Yes, per the owner's ruling | King's Printer for Ontario, as recorded in §§ 8.4 and 11.3 E | Headings plus the s. 13(1) wording already captured | `GAP_CLOSED_SCOPE_DECISION` unchanged and the scoping is retained. s. 8 is a "to whom reports may be given" provision and not an accurate-files duty, and s. 13(1) reads "within a reasonable time" and not a universal 30 days; the United Kingdom and British Columbia comparison items are unaffected and no substantive rule is added |
| `CRP-LSRC-0325` | Yes, for three of the five units | Nova Scotia Legislative Counsel; Manitoba Queen's Printer; Northwest Territories Department of Justice | **Yes**: Nova Scotia Limitation of Actions Act ss. 8 and 12 (§ 12.5 D); Manitoba C.C.S.M. c. L150 ss. 1 and 10 (§ 12.5 E); Northwest Territories Limitation of Actions Act s. 2(1) (§ 12.5 E) | Units **not mapped**. Official text is captured for three units that § 10.7 called unreviewed, so no unit's status now rests on a heading alone; Saskatchewan, Prince Edward Island, Yukon and Nunavut remain blocked; no bankruptcy or collections retention figure is entered and no operative test is certified from any heading |
| `CRP-LSRC-0395` | Yes | Nova Scotia Legislative Counsel | **Yes: Limitation of Actions Act s. 12 in full** (§ 12.5 D), the provision the register recorded as unverified | Refusal **retained**. The 2015-06-01 in-force date is still not stated by the source, whose title page reads "CHAPTER 35 OF THE ACTS OF 2014 / as amended by 2015, c. 22 / © 2016" and whose page footers read "SEPTEMBER 1, 2015"; the ultimate-limitation rationale stays owner-supplied and no collection or reporting block is created |
| `CRP-LSRC-0396` | No new retrieval | Ontario King's Printer (e-Laws) not re-probed this phase | No | Refusal **retained** and unchanged: Ontario's ss. 5 and 15 remain uncaptured, the consolidation and last-amendment lines recorded in §§ 10.3 D and 11.3 E stand, and the discovery-start and ultimate-ceiling rationale stays owner-supplied |
| `CRP-LSRC-0397` | Yes, and the publisher's earlier blocks do not reproduce on this path | LégisQuébec | **Yes: Civil Code of Québec arts. 2898 and 2925 in full** (§ 12.5 F) | Refusal **retained**. The articles are now captured, but the interruption analysis the refusal requires is still required, no automatic reset on payment is assumed anywhere, and the articles' own history notes are recorded as captured rather than interpreted |
| `CRP-LSRC-0398` | No | The Prince Edward Island route remains blocked (§ 12.5 I) | No | Refusal **retained** and the recorded no-duplicate relationship is unchanged; the chapter question stays unresolved and no island provision is inferred |
| `CRP-LSRC-0412` | Not needed; confirmation only | — | No | Confirmed as ruled: the per-region recording made at § 11.4 item 8 stands, the England-and-Wales source may be linked to `GB-ENG` and to `GB-WLS` separately, the bare `UK` token stays unresolved, and no country-level rule is entered and no consumer's nation is derived |
| `CRP-LSRC-0413` | Not targeted by design | — | No | `GAP_CLOSED_SCOPE_DECISION` unchanged: CRAIN remains a non-statutory industry notice outside primary-authority scope, and no search-visibility or retention rule is entered |
| `CRP-LSRC-0435` | Yes, for two of the blocked jurisdictions | ACT Parliamentary Counsel's Office; Office of the Queensland Parliamentary Counsel; Western Australian Parliamentary Counsel's Office | **Yes**: Limitation Act 1985 (ACT) s. 11, with ss. 10 and 12, and Limitation of Actions Act 1974 (Qld) s. 10 (§ 12.5 C) | `AU-*` stays **non-operative**. Two jurisdictions move from *attempted* to *captured*; Western Australia's own address is still not located and South Australia's HTTP 403 record stands; no jurisdiction is resolved from any wildcard and no captured period is entered as a rule |
| `CRP-LSRC-0436` | Yes, at document-record level | Federal Register of Legislation public OData API | **No provision captured.** The compilation's PDF is identified — 472 pages, 1,920,725 bytes, `isAuthorised=true` — but no route reachable here returns its bytes, and the OAIC reproduction at § 11.3 D is not a substitute | Wording gap **stays open** exactly as the ruling requires; the qualified "typically 30 days" statement remains qualified and no correction deadline is entered |
| `CRP-LSRC-0437` | Yes, and completely | Office of the Australian Information Commissioner | **Yes: the Code's own PDF captured and extracted in full**, including ss. 1 to 3, 16, 20 and 21 (§ 12.5 B) | Text gap **closed by capture**: no Code provision the ruling named remains uncaptured, the partial-dictionary limitation recorded at § 11.3 C is superseded for text capture, and no Code obligation is converted into a governed rule by this work order |

### 12.5 Captured provision text and locators

**A. United States — § 623(a)(5)(B) of the Fair Credit Reporting Act, captured complete.** Publisher: U.S.
Government Publishing Office, `govinfo.gov`, granule
`USCODE-2014-title15-chap41-subchapIII-sec1681s-2.htm` (2014 Edition), downloaded whole and preserved
(30,945 bytes, SHA-256 `CDDD5665…`, § 12.7). Paragraph (A) was captured in § 11.3 B; paragraph **(B) is now
captured from its heading to its final clause**, which completes the paragraph whose capture had stopped at the
words "does not disput":

> (B) Rule of construction — For purposes of this paragraph only, and provided that the consumer does not
> dispute the information, a person that furnishes information on a delinquent account that is placed for
> collection, charged for profit or loss, or subjected to any similar action, complies with this paragraph,
> if— (i) the person reports the same date of delinquency as that provided by the creditor to which the account
> was owed at the time at which the commencement of the delinquency occurred, if the creditor previously
> reported that date of delinquency to a consumer reporting agency; (ii) the creditor did not previously report
> the date of delinquency to a consumer reporting agency, and the person establishes and follows reasonable
> procedures to obtain the date of delinquency from the creditor or another reliable source and reports that
> date to a consumer reporting agency as the date of delinquency; or (iii) the creditor did not previously
> report the date of delinquency to a consumer reporting agency and the date of delinquency cannot be
> reasonably obtained as provided in clause (ii), the person establishes and follows reasonable procedures to
> ensure the date reported as the date of delinquency precedes the date on which the account is placed for
> collection, charged to profit or loss, or subjected to any similar action, and reports such date to the
> credit reporting agency.

Three limits are recorded with this capture. It is an **Edition-specific** United States Code granule: the text
is that of the 2014 Edition as published by the Government Publishing Office, and the current Edition was not
retrieved, so no statement about the provision's present wording is made. The captured text contains **no
period, deadline or commencement rule for any account**, and none is derived from it anywhere in this register;
the paragraph is a rule of construction about how a furnisher satisfies paragraph (A), and paragraph (A) itself
is recorded at § 11.3 B as captured text only. And the § 312(d) amendment note describing this paragraph's
origin remains a note, never a provision.

**B. Australia — the Privacy (Credit Reporting) Code 2024, captured in full from the regulator's own PDF.**
Publisher: Office of the Australian Information Commissioner. The Code's page
(`oaic.gov.au/privacy/privacy-registers/privacy-codes/privacy-credit-reporting-code-2024`) was downloaded whole
and it links the instrument's own file at
`oaic.gov.au/__data/assets/pdf_file/0029/242588/Privacy-Credit-Reporting-Code-2024.pdf`, which was downloaded
and preserved (643,427 bytes, SHA-256 `F8CF6C99…`, 60 pages, extracted text 178,406 characters). The
instrument's preliminary part reads, at page 1:

> 1 Name — This instrument is the Privacy (Credit Reporting) Code 2024.
> 2 Commencement — (1) This instrument commences on the day it is registered on the Federal Register of
> Legislation, with the exception of the provisions set out below: (a) Section 5, day on which the consumer
> credit is entered into (a) …
> 3 Authority — (1) This instrument is a CR Code described in section 26N of the Act. (2) This instrument is
> included on the Codes Register under paragraph 26T(5)(b) of the Act. Note: This instrument is the Registered
> CR Code described in section 26M of the Act.

Section 16, "Use and disclosure of credit-related personal information by CPs and affected information
recipients", opens at page 29: "(1) This section is made for the purposes of Subdivision D of Division 3 of Part
IIIA of the Act." and then, under the sub-heading "Purposes for which credit eligibility information and
regulated information must not be disclosed or used": "(2) A credit provider or an affected information
recipient must not use or disclose credit eligibility information or regulated information for the purposes of:
(a) assessing the likelihood that the individual to which the information relates may accept an invitation to
apply for, or an offer of, any of the following: (i) credit; (ii) a variation of the amount of, or terms on
which, credit is provided; (iii) insurance in relation to mortgage credit or commercial credit; or (iv) a
variation of amount of, or terms on which, insurance in relation to mortgage credit or commercial credit is
provided; (b) targeting or inviting an individual to apply for, or accept an offer of, any of the following:
(i) credit; … (c) direct marketing." Its exceptions and the credit reporting body disclosure rule follow at
subsection (4) and (5), and subsection (6) requires a written notice of refusal, where credit reporting
information is used to assess an application for credit, that "meets the requirements of subsection 21P(2) of
the Act" and "explains the individual's right to access their credit reporting information without charge
during the 90 days following the date of the credit provider's notice of refusal".

Section 20, "Correction of information", opens at page 39 with "(1) This section is made for the purposes of
sections 20T and 21V of the Act." Its Note 1 records the Act's scheme in the Code's own words: "Section 20T of
the Act sets out a regime for individuals to seek correction of information relating to them from credit
reporting bodies. A credit reporting body must correct the information if it is inaccurate, out-of-date,
incomplete, irrelevant or misleading for a purpose for which it is held. … Correction requests, and correcting
information as a result, must be free for the individual." Subsection (3) provides that, for a credit provider
that does not participate in the credit reporting system, "the provider may, within 30 days of the individual's
correction request" consult other bodies or providers and give the individual a written notice; subsection (4)
requires the first responder to provide a consultation request "within five business days of the correction
request being made"; and subsection (5) governs extensions. The subsection (5) Note is the passage that matters
for this register's recorded "typically 30 days" question, and it attributes the period to the **Act**, not to
the Code: "Under the Act, a credit reporting body or a credit provider must correct information within a period
of 30 days that starts on the day on which the individual requests correction, or such longer period the
individual has agreed to in writing: see subsections 20T(2) and 21V(2) of the Act."

Section 21, "Complaints", opens at page 45 with "(1) This section is made for the purposes of Division 5 of Part
IIIA of the Act." Its operative provisions require a body or provider that is already subject to complaints
handling requirements to comply with those (subsection (2)); otherwise to comply with named clauses of ISO
10002:2018(E) (subsection (3)); a credit reporting body to be a member of, or subject to, a recognised external
dispute resolution scheme (subsection (4)); a consulted body or provider to respond "as soon as practicable"
(subsection (5)); and, where a body or provider "forms the view that it will not be able to resolve a complaint
within the 30 day period required by Part IIIA of the Act", to inform the individual of the delay before the end
of that period, give the reason, state the expected timeframe and seek agreement to a reasonable extension
(subsection (6)).

**What this capture does and does not establish.** The instrument's text is now captured from the publisher's
own file, so the Code is no longer represented by defined terms and notes alone: its citation, commencement and
authority clauses, its sections and its Schedules are all present in the preserved file and its extracted text.
Two limits are recorded. First, this register quotes the provisions above and does not convert the remaining
clauses of Schedule 2 into operative rules: a captured clause is not an entered rule, and none of the periods
named in the Code — 30 days, five business days, 90 days — is entered anywhere in this register as a rule, a
deadline or a finding. Second, where the Code states that a period comes from the Act, as the subsection (5)
Note does, the Code is evidence of what the Act is said to require and not the enactment itself; the Act's
wording remains the compilation text that `CRP-LSRC-0436` still requires.

**C. Australia — the two blocked limitation statutes of the Australian Capital Territory and Queensland, now
captured as official PDFs.** Publishers: the ACT Parliamentary Counsel's Office and the Office of the Queensland
Parliamentary Counsel. The ACT file
(`legislation.act.gov.au/DownloadFile/a/1985-66/current/PDF/1985-66.PDF`, 900,536 bytes, extracted text 168,044
characters, 72 pages) is headed "Australian Capital Territory / Limitation Act 1985 / A1985-66 / Republication
No 28 / Republication date: 26 November 2025", and each page carries "Authorised by the ACT Parliamentary
Counsel—also accessible at www.legislation.act.gov.au", so it is an authorised republication. Its Division 2.2
carries:

> 11 General — (1) Subject to subsection (2), an action on any cause of action is not maintainable if brought
> after the end of a limitation period of 6 years running from the date when the cause of action first accrues to
> the plaintiff or to a person through whom he or she claims. (2) Subsection (1) does not apply to a cause of
> action in relation to which another limitation period is provided by this Act.
> 12 Accounts — An action on a cause of action for an account is not maintainable after the end of any time
> limit under this Act applies to the claim that is the basis of the duty to account.

Section 12 is quoted exactly as published, including its wording, and is not paraphrased. The same Part carries
s. 10, "More than 1 bar": "If, under each of 2 or more provisions of this part, an action is not maintainable if
brought after a specified time, the action is not maintainable if brought after the earlier or earliest of those
times."

The Queensland file (`legislation.qld.gov.au/view/pdf/inforce/current/act-1974-075`, 475,692 bytes, extracted
text 107,576 characters, 47 pages) is headed "Queensland / Limitation of Actions Act 1974 / Current as at 28
April 2026" and its Part 2 carries:

> 10 Actions of contract and tort and certain other actions — (1) The following actions shall not be brought
> after the expiration of 6 years from the date on which the cause of action arose— (a) subject to section 10AA,
> an action founded on simple contract or quasi-contract or on tort where the damages claimed by the plaintiff
> do not consist of or include damages in respect of personal injury to any person; (b) an action to enforce a
> recognisance; (c) an action to enforce an award; (d) an action to recover a sum recoverable by virtue of any
> enactment, other than a penalty or forfeiture or sum by way of a penalty or forfeiture.
> (2) An action for an account shall not be brought in respect of a matter that arose more than 6 years before
> the commencement of the action. (3) An action upon a deed shall not be brought after the expiration of 6 years
> from the date on which the cause of action accrued. … (4) An action shall not be brought upon a judgment after
> the expiration of 12 years from the date on which the judgment becomes enforceable.

Neither statute is mapped to a rule by this work order: the texts are captured, `AU-*` remains non-operative,
and no period in either Act is entered as a rule, a deadline or a finding, whether for reporting, collection or
any other purpose.

**D. Canada — Nova Scotia: both official PDFs captured, including s. 12 of the Limitation of Actions Act and the
Consumer Reporting Act's reporting limits.** Publisher: Nova Scotia Legislative Counsel. The Limitation of
Actions Act file (`nslegislature.ca/sites/default/files/legc/statutes/limitation%20of%20actions.pdf`, 215,628
bytes, extracted text 29,320 characters, 13 pages) is titled "Limitation of Actions Act / CHAPTER 35 OF THE ACTS
OF 2014 / as amended by 2015, c. 22", carries the notice "© 2016 Her Majesty the Queen in right of the Province
of Nova Scotia / Published by Authority of the Speaker of the House of Assembly / Halifax", and prints
"SEPTEMBER 1, 2015" in the footer of each page. Its general limitation rules read:

> 8 (1) Unless otherwise provided in this Act, a claim may not be brought after the earlier of (a) two years from
> the day on which the claim is discovered; and (b) fifteen years from the day on which the act or omission on
> which the claim is based occurred. (2) A claim is discovered on the day on which the claimant first knew or
> ought reasonably to have known (a) that the injury, loss or damage had occurred; (b) that the injury, loss or
> damage was caused by or contributed to by an act or omission; (c) that the act or omission was that of the
> defendant; and (d) that the injury, loss or damage is sufficiently serious to warrant a proceeding.

Its s. 12, the provision `CRP-LSRC-0395` recorded as unverified, is headed "Disallowance or invocation of
limitation period" and reads: "(1) In this Section, 'limitation period' means the limitation period established
by (a) clause 8(1)(a); or (b) any enactment other than this Act. (2) This Section applies only to claims brought
to recover damages in respect of personal injuries. (3) Where a claim is brought without regard to the limitation
period applicable to the claim, and an order has not been made under subsection (4), the court in which the claim
is brought, upon application, may disallow a defence based on the limitation period and allow the claim to
proceed if it appears to the court to be just having regard to the degree to which (a) the limitation period
creates a hardship to the claimant or any person whom the claimant represents; and (b) any decision of the court
under this Section would create a hardship to the defendant or any person whom the defendant represents, or any
other person. (4) Where a limitation period has expired, a person who wishes to invoke the limitation period,
upon giving at least 30 days' notice to any person who may have a claim, may apply to the court for an order
terminating the right of the person to whom such notice was given from commencing the claim …" The Act's
transitional section defines "effective date" as "the day on which this Act comes into force" and provides, for a
claim discovered before that date, that it "may not be brought after the earlier of (a) two years from the
effective date; and (b) the day on which the former limitation period expired or would have expired", with
subsection (4) permitting a claim referred to in s. 11 to be brought at any time. **No commencement proclamation
date appears in the file**, so
the 2015-06-01 in-force date recorded in the register remains unverified; the page footers state 1 September 2015
and the title page states the amending Act (2015, c. 22) and a 2016 copyright line, which are consolidation
statements and not commencement evidence.

The Consumer Reporting Act file (`nslegislature.ca/…/consumer%20reporting.pdf`, 351,156 bytes, extracted text
46,012 characters, 18 pages) is titled "Consumer Reporting Act / CHAPTER 93 OF THE REVISED STATUTES, 1989", runs
with the header "R.S., c. 93 consumer reporting" and the footer "OCTOBER 11, 2018", and its reporting limits sit
in s. 10(3):

> 10 (3) A consumer reporting agency shall not include in a consumer report … (c) information regarding any debt
> more than six years after the last payment was made or, where no payment was made, more than six years after
> the date on which the default in payment occurred; (ca) information regarding any judgment against the
> consumer more than six years after the judgment was given, unless the judgment creditor or an agent of the
> judgment creditor confirms that the judgment remains unpaid, in whole or in part, and the confirmation appears
> in the file; … (da) information regarding any actions or other court proceedings that are more than six years
> old or actions or court proceedings commenced against the consumer more than twelve months prior to the making
> of the report unless the consumer reporting agency has ascertained the current status of the action or
> proceeding and has a record of this on file; (e) information as to the bankruptcy of a consumer after six years
> from the date of the discharge of the consumer unless he has been bankrupt more than once.

That capture is recorded as it stands and creates no rule: no six-year figure is entered anywhere in this
register, no collection or reporting block is created, and no disposition changes. It does settle two facts
about the entry's own provenance, which are recorded at § 12.6 item 3.

**E. Canada — Manitoba and the Northwest Territories: the two bilingual official PDFs captured.** Publishers: the
Manitoba Queen's Printer and the Northwest Territories Department of Justice. Manitoba's file
(`web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=l150`, 408,047 bytes, extracted text 106,994 characters, 28
pages) is the copy the publisher's own HTML names as the official version, headed "MANITOBA / THE LIMITATIONS ACT
/ LOI SUR LES DÉLAIS DE PRESCRIPTION", assented to 20 May 2021, and stamped "Accessed: 30 Sept. 2026 at 5:50 am
CDT / Current from 30 May 2023 to 28 Sept. 2026". Its overview and ultimate limitation period read:

> 1 This Act sets out limitation periods for civil claims. … For most claims, the Act (a) establishes a basic
> limitation period of two years, which begins to run on the day the claim is discovered; (b) establishes a
> maximum limitation period of 15 years (beyond which the basic limitation period cannot extend), which begins to
> run on the day the event giving rise to the claim takes place; (c) does not apply if another Act contains a
> specific limitation period that applies to the claim or otherwise conflicts with this Act.
> 10(1) Even if the basic limitation period for a claim has not expired, a proceeding must not be commenced more
> than 15 years after the day the act or omission on which the claim is based took place.
> 10(2) As an exception to subsection (1), a proceeding respecting (a) existing Aboriginal and treaty rights that
> are recognized and affirmed in the Constitution … [the subparagraph continues at the captured page].

Section 9 places the burden on the claimant: "The claimant has the burden of proving that a proceeding has been
commenced within the basic limitation period." Because this is the publisher's *official* copy, this capture
supersedes the unofficial-HTML capture of the same Act recorded at § 11.3 F for text purposes; the two are
consistent on the sections both contain.

The Northwest Territories file
(`justice.gov.nt.ca/en/files/legislation/limitation-of-actions/limitation-of-actions.a.pdf`, 89,694 bytes,
extracted text 142,475 characters over 27 pages in English and French) is headed "LIMITATION OF ACTIONS ACT / LOI
SUR LES PRESCRIPTIONS / R.S.N.W.T. 1988, c.L-8 / L.R.T.N.-O. 1988, ch. L-8 / INCLUDING AMENDMENTS MADE BY /
MODIFIÉE PAR … In force July 19, 1993" and carries the instrument numbers "SI-008-93 TR-008-93". Its Part I
carries:

> 2. (1) The following actions must be commenced within and not after the following times: (a) actions for
> penalties imposed by any Act brought by an informer suing for himself or herself alone or for Her Majesty as
> well as for himself or herself, or by any person authorized to sue for such penalties, not being the person
> aggrieved, within one year after the cause of action arose; (b) actions for penalties, damages or sums of money
> in the nature of penalties given by any Act to Her Majesty or the person aggrieved … within two years after the
> cause of action arose; (c) actions of defamation, whether libel or slander, within two years after the
> publication of the libel or the speaking of the slanderous words …; (d) actions for trespass to the person,
> assault, battery, wounding or other injury to the person, whether arising from an unlawful act or from
> negligence, or for false imprisonment, within two years after the cause of action arose; (f) actions … for
> detention or conversion of goods … or for a sum recoverable … whether recoverable as a debt or damages …
> within six years after the cause of action arose; (g) actions grounded on fraudulent misrepresentation, within
> six years after the discovery of the fraud; (h) actions grounded on accident, mistake or other equitable ground
> of relief not specifically dealt with in paragraphs (a) to (g), within six years after the discovery of the
> cause of action; (i) actions on a judgment or order for the payment of money, within 10 years after the cause
> of action on the judgment or order arose; (j) any other action not specifically provided for in this Act or any
> other Act, within six years after the cause of action arose.

Subsection 2(2) opens with the words "The limitation period set out in paragraph …" and was captured only to that
point; it is recorded as partial and nothing is inferred from its heading. Neither territorial instrument is
mapped to a rule: no period in either Act is entered as a rule, a deadline or a finding, and no unit is assigned
a jurisdiction mapping by this work order.

**F. Canada — Québec: Civil Code articles 2898 and 2925 captured from LégisQuébec.** Publisher: LégisQuébec
(`legisquebec.gouv.qc.ca`), whose English document page for `CCQ-1991` was downloaded whole (6,001,882 bytes,
preserved). The HTTP 403 recorded in §§ 8, 10 and 11 for the French and article-level paths is **not reproduced**
on this path, which is recorded as a route finding only. The captured text reads:

> 2898. Acknowledgement of a right, as well as renunciation of the benefit of the time elapsed, interrupts
> prescription. 1991, c. 64, a. 2898; I.N. 2014-05-01; I.N. 2015-11-01.
> 2925. An action to enforce a personal right or movable real right is prescribed by three years, if the
> prescriptive period is not otherwise determined. 1991, c. 64, a. 2925; I.N. 2014-05-01.

Two limits are recorded. The Code's own commencement date was **not** captured on this route, so the 1994-01-01
in-force date that `CRP-LSRC-0397` records as unverified remains unverified. And the capture supplies the articles'
wording and their own history notes, nothing more: the interruption analysis the refusal requires is still
required, no automatic reset on payment is assumed anywhere, and no period from either article is entered as a
rule.

**G. United States — Massachusetts: the 1996-effective amending Act captured in full.** Publisher: State Library
of Massachusetts (the Commonwealth's official state-library repository), DSpace item "1995 Chapter 0125. An Act
Further Regulating Consumer Reporting Agencies.", handle `2452/25465`. Both of the item's files were preserved:
the publisher's own text (`1995acts0125.txt`, 30,828 bytes, SHA-256 `FD0F5F52…`) and the page PDF
(`1995acts0125.pdf`, 348,019 bytes, 11 pages, extracted text 34,689 characters). The Act opens with an emergency
preamble — "Whereas, The deferred operation of this act would tend to defeat its purpose, which is to immediately
regulate consumer reporting agencies, therefore it is hereby declared to be an emergency law, necessary for the
immediate preservation of the public convenience." — and ends:

> SECTION 14. This act shall take effect on January thirty-first, nineteen hundred and ninety-six. Approved
> September 7, 1995.

Its fourteen sections amend chapter 93 of the General Laws of Massachusetts, each expressed against the same base
text, for example: "SECTION 1. Section 50 of chapter 93 of the General Laws, as appearing in the 1994 Official
Edition, is hereby amended by inserting before the definition of 'Investigative consumer report' the following
definition:- 'Firm offer of credit' …". The sections amend or insert §§ 50 (twice), 51 (struck out and replaced),
53 (struck out and replaced), 54A (inserted), 56 (struck out and replaced), 57, 58 and 59 (both struck out and
replaced), 60, 60A (inserted), 62, 63 and 64. Section 3's replacement of s. 51 begins: "Section 51. (a) A
consumer reporting agency may furnish a consumer report under the following circumstances and no other: (1) in
response to the order of a court having jurisdiction to issue such an order; or (2) in accordance with the
written instructions of the consumer to whom it relates; or (3) to a person which it reasonably believes: (i)
intends to use the information in connection with a credit transaction involving the consumer …".

**Section 52 is not among the provisions this Act amends.** That is a fact about the capture, taken from all
fourteen of the Act's sections, and it has a direct consequence for the baseline work: the text of G.L. c. 93
§ 52 in force on 30 September 1996 is the text of the **1994 Official Edition** that the Act itself uses as its
base, plus any later amendment taking effect before the baseline date. A search of the same official repository
filtered to 1996 surfaced 1996 chapters on credit-union share insurance and insurance redlining and **no**
consumer-reporting chapter, but a complete sweep of the 1996 session laws was not performed, so the baseline text
of § 52 is **not captured** and nothing is reconstructed from the current text. One supporting fact is recorded:
the current § 52 text captured in § 10.3 C includes a paragraph (7) on "Eviction records sealed pursuant to
section 16 of chapter 239" which is not among the 1995 Act's amendments, so the current text is established to
post-date the baseline at least in that respect.

**H. United States — California: current text and official amendment-history lines captured, baseline text not.**
Publisher: California Legislative Counsel (`leginfo.legislature.ca.gov`). Three section pages were downloaded whole
and preserved — Civil Code 1785.10 (167,473 bytes), 1785.13 (167,769 bytes) and 1785.16 (175,250 bytes) — together
with the Title 1.6 and Chapter 2 descriptive lines, which record that the Title was "repealed and added by Stats.
1975, Ch. 1271" and that Chapter 2 was "added by Stats. 1975, Ch. 1271". Each section page carries its own
official amendment-history line, captured verbatim:

> 1785.10 … (Repealed (in Sec. 1) and added by Stats. 2002, Ch. 9, Sec. 2. Effective February 19, 2002. Section
> operative January 1, 2003, by its own provisions.)
> 1785.13 … (Amended by Stats. 2024, Ch. 520, Sec. 2. (SB 1061) Effective January 1, 2025.)
> 1785.16 … (Amended by Stats. 2001, Ch. 354, Sec. 3. Effective January 1, 2002.)

Those lines establish what the register previously only suspected: the current text of § 1785.10 is a 2002
repeal-and-re-addition, the current text of § 1785.13 is a 2024 amendment, and the current text of § 1785.16 is a
2001 amendment, so **none** of the three current texts can be the text in effect on 30 September 1996. No
baseline text is admitted and no state rule is entered. On route availability, the publisher serves the
1995-1996 session: the bill pages at `bill_id=199519960AB1376` and `bill_id=199519960SB1691` each returned a
complete bill ("Bill Status - AB-1376 Oil spill reporting requirements"), so pre-1996 chaptered Bill text is
reachable **where a Bill number is known**. The session's bill list page returns 1,013,777 bytes but exposes no
bill rows on this path, and the section page's "cross-reference chaptered bills" control is a JSF postback, so
the chapters that amended Title 1.6 before the baseline date were not enumerated. That enumeration — not the
publisher — is the outstanding step for California.

**I. Routes that remain closed, with their exact blockers.** The following were attempted in this phase and are
recorded `NOT RETRIEVED` with the blocker that stops them; none is reported as complete and none is filled from
another source.

1. **The `C2026C00227` compilation file (Federal Register of Legislation).** The compilation's own PDF is
   identified through the Register's public OData API: registerId `C2026C00227`, titleId `C2004A03712`,
   compilation 104, start 4 June 2026, rectified 17 June 2026, format Pdf, `isAuthorised=true`, 472 pages,
   1,920,725 bytes, with unauthorised Word (511,923 bytes) and Epub (234,835 bytes) siblings. Every download
   address tried returns HTTP 200 with the single-page-application shell rather than a file; the OData
   `Document` entity type declares no media stream; its eight-field composite key returned HTTP 404 in both
   named and positional form; and the `Content` entity set serves site content such as menus, not legislation.
   The blocker is therefore the publisher's file-delivery path, not the existence or identity of the file.
2. **Prince Edward Island.** The chapter question (`c. C-18` against `c. C-20`) is still unsettled. The file
   path itself works — `…/sites/default/files/legislation/c-17.pdf` and `…/l-08.pdf` were downloaded and are the
   repealed Conflict of Interest Act and Legislative Assembly Retirement Allowances Act — but fifteen further
   chapter-name forms for the Consumer Reporting Act returned HTTP 404, and the statute index pages serve a
   Radware browser challenge rather than an index. The blocker is a bot gate plus a file-naming scheme that does
   not expose the target chapter.
3. **Western Australia's Limitation Act 2005 address.** The site's redirect query agent returns a page titled
   "WALW - Unknown File" for the Act's name, and the numeric address probed resolves to the Naval Deserters Act
   1884. The blocker is that the Act's own address has not been located; the register does not guess one.
4. **Saskatchewan, Yukon and Nunavut.** The Saskatchewan Publications Centre returns a 1,215-byte application
   shell with no file pointer; `laws.yukon.ca` and `gov.nu.ca` both return HTTP 403. South Australia's HTTP 403
   record stands and was not re-probed.
5. **Ontario's ss. 5 and 15 (`CRP-LSRC-0396`) and the California pre-1996 chaptered bills and Massachusetts 1994
   Official Edition text (`CRP-LSRC-0077`).** These are provision-level gaps rather than publisher blocks: the
   publishers are reachable and were captured for other provisions, but the specific historical or textual
   targets were not reached in this phase.

### 12.6 Conflicts, corrections, route findings and status movements

1. **The § 11.6 item 10 premise conflict is closed.** § 11 recorded that owner ruling 1 rested on the premise that
   § 605(c) and § 623(a)(5) were unreachable, and that the premise had been overtaken by later captures. With
   § 623(a)(5)(B) now captured complete, **no part of either provision remains unreachable**, so nothing about the
   ruling rests on an unretrieved source. The ruling's disposition is unchanged, the Equifax fallback remains not
   adopted, and no rule follows from the closure.
2. **The Ontario description corrections approved by the owner are recorded in this register only.** They are
   factual corrections to the register's own descriptions of captured headings and wording, taken from captures
   already recorded in §§ 8.4, 10.3 D, 10.5 and 11.3 E. The catalogue is untouched, so its parentheticals still
   read as they read before, and the correction of those parentheticals remains a separate, later, separately
   authorised catalogue edit.
3. **A recorded Nova Scotia citation does not match the captured official text.** `CRP-LSRC-0322`'s owner-supplied
   list records "Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3)". The official PDF retrieved from the Nova
   Scotia Legislative Counsel is titled "CHAPTER 93 OF THE REVISED STATUTES, 1989" and carries the running header
   "R.S., c. 93 consumer reporting"; its six-year reporting limits stand in **s. 10(3)**. The chapter number and the
   section number in the recorded base therefore both differ from the captured official text. The captured text is
   recorded as captured; the owner-supplied record is not amended, no rule is entered, and the discrepancy is left
   for the owner.
4. **The Nova Scotia in-force date remains unverified.** The register records 2015-06-01 for the Limitation of
   Actions Act. The captured official PDF states no commencement date: its title page reads "CHAPTER 35 OF THE ACTS
   OF 2014 / as amended by 2015, c. 22 / © 2016", and its page footers read "SEPTEMBER 1, 2015". Those are
   consolidation statements and they neither confirm nor contradict 1 June 2015, so the date is left as recorded
   and marked still unverified.
5. **A recorded Manitoba base names a different instrument from the one captured.** `CRP-LSRC-0322`'s list names the
   Personal Investigations Act, C.C.S.M. c. P34, s. 9(3) for Manitoba. This phase captured **The Limitations Act,
   C.C.S.M. c. L150** — a different Act with a different subject matter, stating a two-year basic period and a
   fifteen-year ultimate period — because that is the instrument the publisher serves as the province's limitation
   statute. The mismatch is recorded, not resolved: no Manitoba rule is entered, and c. P34 remains unretrieved.
6. **A recorded Québec base names a different provision from the ones captured.** The same list names art. 30 of the
   Civil Code of Québec; this phase captured arts. 2898 and 2925, which are the interruption and prescription
   articles `CRP-LSRC-0397` names. Recorded as a mismatch, with no rule entered and art. 30 still unretrieved.
7. **Massachusetts: the baseline route is now defined by the publisher's own base-text reference.** Because the
   1995 Act amends c. 93's sections "as appearing in the 1994 Official Edition" and does not amend § 52, the
   baseline capture required is the 1994 Official Edition text of § 52, subject to any 1996 amendment taking effect
   before 30 September 1996. That is a source-completion requirement, not a conflict, and no state rule is entered.
8. **California: the current texts are established to be later than the baseline.** The captured amendment-history
   lines (§ 12.5 H) show a 2002 repeal-and-re-addition of § 1785.10, a 2024 amendment of § 1785.13 and a 2001
   amendment of § 1785.16, so no current text may be used as the baseline and none is admitted.
9. **The Code's own Note supplies the "typically 30 days" qualification with instrument support, and the
   qualification is not lifted.** The subsection (5) Note to s. 20 attributes the 30-day correction period to the
   **Act** (subsections 20T(2) and 21V(2)), not to the Code, and s. 21(6) speaks of "the 30 day period required by
   Part IIIA of the Act". Nothing in the captured Code states a general 30-day rule of its own, so the register's
   recorded qualification stands and no correction deadline is entered anywhere.
10. **The § 11.1 channel finding is neither contradicted nor withdrawn.** The head-and-tail elision the register
    recorded for the web-reading channel remains a true statement about that channel; this phase simply did not use
    it. One independent confirmation of identity is recorded: the byte sizes of the four previously located but
    uncaptured files match this phase's downloads exactly (§ 12.3).
11. **New route findings of general use, recorded as findings about routes and not about any law.** (i) The OAIC page
    carrying the Privacy (Credit Reporting) Code 2024 links the instrument's own PDF, which makes the Code
    capturable from the regulator alone. (ii) The Federal Register of Legislation exposes a public OData service
    (`api.prod.legislation.gov.au/v1/…`) whose `Documents` entity set returns per-compilation document records with
    format, page count, size and authorisation flags. (iii) The Prince Edward Island publisher's file path
    `…/sites/default/files/legislation/<chapter>.pdf` serves official chapter PDFs where the slug is known.
    (iv) LégisQuébec's English document path for `CCQ-1991` does not reproduce the HTTP 403 recorded in earlier
    phases. (v) The State Library of Massachusetts exposes a DSpace REST API that serves Acts and Resolves items
    with both a page PDF and the publisher's own text. (vi) A GovInfo section granule downloaded with an ordinary
    HTTP client arrives whole, without the elision that affects the reading channel, which is how § 623(a)(5)(B)
    was completed.
12. **Status movements, recorded precisely.** No `GAP_*` disposition changed. Three things did move: the
    partial-capture limitation on § 623(a)(5)(B) is **cleared**; the Privacy (Credit Reporting) Code 2024's text
    gap is **closed by capture** while `CRP-LSRC-0436`'s compilation-wording gap **stays open**; and the Canadian
    and Australian instruments and the two Québec articles listed at § 12.5 C to F move from *unretrieved* or
    *attempted* to **captured** while remaining **unmapped** to any rule.

### 12.7 Preserved official artifacts and their digests

Every file below is preserved unmodified in `SOURCE_CAPTURES\PHASE5-001G\`. The directory holds **37 files,
12,910,700 bytes** in total. Hashes are SHA-256 over the file as downloaded. Nothing in this table is a governed
rule, and a preserved file is not an admitted source.

**1. Original publisher files (13).**

| File | Publisher URL | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `USCODE-2014-sec1681s-2.htm` | `govinfo.gov/content/pkg/USCODE-2014-title15/html/USCODE-2014-title15-chap41-subchapIII-sec1681s-2.htm` | 30,945 | `CDDD5665E5BF6C36022D777C00A4F6DD88741AC7B9E51CAFE6BB73C47E8AF785` |
| `OAIC-Privacy-Credit-Reporting-Code-2024.pdf` | `oaic.gov.au/__data/assets/pdf_file/0029/242588/Privacy-Credit-Reporting-Code-2024.pdf` | 643,427 | `F8CF6C99C548DA34FEF15A9F4CD8249EEE24EB4D85402E22763D34D7B911CC21` |
| `ACT-limitation-act-1985-r-current.pdf` | `legislation.act.gov.au/DownloadFile/a/1985-66/current/PDF/1985-66.PDF` | 900,536 | `F5BA3B89150F40B003EDCBFEA416499D26AF51970AC29BBC45A9809B8E793504` |
| `QLD-limitation-of-actions-act-1974.pdf` | `legislation.qld.gov.au/view/pdf/inforce/current/act-1974-075` | 475,692 | `9A77114C16ECE94F73680A109A40549FE0D063149E56ACCAA6B620B231BFD158` |
| `NS-limitation-of-actions.pdf` | `nslegislature.ca/sites/default/files/legc/statutes/limitation%20of%20actions.pdf` | 215,628 | `1C2253D9EAFF51F81A2B678774D983B1756709A37AEAAA3D95FC463CA6B847FD` |
| `NS-consumer-reporting.pdf` | `nslegislature.ca/sites/default/files/legc/statutes/consumer%20reporting.pdf` | 351,156 | `5AD228066B3281E1702C2C63DA012C28128D444B8D528069075DC65939445500` |
| `MB-limitations-act-ccsm-l150.pdf` | `web2.gov.mb.ca/laws/statutes/ccsm/_pdf.php?cap=l150` | 408,047 | `0B9FE7C0096E3C7370D3307EAF8BAEB0F2274327BCD2EC9A6285D565FD304805` |
| `NWT-limitation-of-actions.pdf` | `justice.gov.nt.ca/en/files/legislation/limitation-of-actions/limitation-of-actions.a.pdf` | 89,694 | `FF670BBE4FC226845647142540BAAA48D728C28B8B6571E280B14AD0B72EA1F4` |
| `QC-CCQ-1991-en.html` | `legisquebec.gouv.qc.ca/en/document/cs/CCQ-1991` | 6,001,882 | `E2D7503D387880F0847307216B68C7E976BC97857EE504A3B3566C1C914C22A8` |
| `MA-1995-acts-0125.pdf` | `archives.lib.state.ma.us/server/api/core/bitstreams/c1d29653-c9ed-4e85-8681-fe08f62a29a9/content` (ORIGINAL bundle) | 348,019 | `EC152115EB8D582480C1DAF1399BB7468A1EF3A1707CBCA0BD236E6E36E54FCE` |
| `MA-1995-acts-0125.txt` | `archives.lib.state.ma.us/server/api/core/bitstreams/9ac05974-08db-4d67-a064-6d46ab8bef89/content` (TEXT bundle) | 30,828 | `FD0F5F52669B1EDDD6537C21BB0D246F5B93D5C90B027F1E28A54C179557A3A1` |
| `PEI-c-17.pdf` | `princeedwardisland.ca/sites/default/files/legislation/c-17.pdf` | 15,836 | `0858E796A88873C713FC6667C32367D9E3B334E9C69C4BCCD05208BD36F135AC` |
| `PEI-l-08.pdf` | `princeedwardisland.ca/sites/default/files/legislation/l-08.pdf` | 15,888 | `264F617410EA366EC341525AFEA8E2C8998BA03D7D38F716AD72B061F277FFCC` |

**2. Extracted texts (11), each beside its original and each cited by locator in § 12.5.**

| File | Source original | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `ACT-limitation-act-1985-r-current.txt` | ACT PDF, 72 pp., `pdftotext -layout` | 168,044 | `3B3FDF0B63150219B101ABEDDAAE3C71ABB54CDCD4F51E03E2556004E7FFD46E` |
| `ACT-p6.txt` | the same PDF, page-6 extraction kept to verify the s. 12 wording | 879 | `B1975DA605172EC6C32C27E12A903AB068B0DFB5A494E2548335D375B2B66017` |
| `QLD-limitation-of-actions-act-1974.txt` | Queensland PDF, 47 pp. | 107,576 | `016913B3AC877B5AB3B57F0F31589564E6BA72C15DF4CA5FD540C5E9F9AF8117` |
| `NS-limitation-of-actions.txt` | Nova Scotia limitation PDF, 13 pp. | 29,320 | `E0A354F425240928480117E129D51FB07063A0508B94A8E34BF8FBD1D2309DF3` |
| `NS-consumer-reporting.txt` | Nova Scotia consumer-reporting PDF, 18 pp. | 46,081 | `C7EB74B9D9BE0104709200E283010225F52951F88EFBD6C0D5F8DBCB6641DDEA` |
| `MB-limitations-act-ccsm-l150.txt` | Manitoba bilingual PDF, 28 pp. | 108,401 | `6C2B1B0E2ACD50ECDA6F00511578CD2101AB397E1C1E376A9807020E6F953423` |
| `NWT-limitation-of-actions.txt` | Northwest Territories bilingual PDF, 27 pp. | 145,114 | `98EB33EB753747556D844D4526D9E831C8D8EA38D0FC1724B381027A30407083` |
| `OAIC-Privacy-Credit-Reporting-Code-2024.txt` | OAIC Code PDF, 60 pp. | 179,025 | `60E305FF2F3DC6AA4AF646723200EAF41FF18B27AA925E673B91D83DE039BA03` |
| `MA-1995-acts-0125-pdf.txt` | Massachusetts chapter PDF, 11 pp. | 34,689 | `0D6ADC11B4B9899D76B93233F49DB987670365C7992DE159A28078C5A59593CF` |
| `PEI-c-17.txt` | PEI c-17 PDF | 145 | `CB2513261CCAF02C16AAAD1AED7F7A507E0E8E46124C6866DC6AFAA89A889763` |
| `PEI-l-08.txt` | PEI l-08 PDF | 148 | `5150A507049512E96FD3FFDC362951C4D6BD0EE742A1EB812FEF8A4D9BE387F5` |

**3. Route-evidence captures (13), recorded as findings about routes and not as legal text.**

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `C2026C00227-downloads.html` | 62,729 | `B53AB9E7DC2A9ACBB42710F2B4C7850A22183EC62C2DC14180AD0D0EECAB5B0A` |
| `FRL-C2026C00227-Download.html` | 37,010 | `4057FBF640C020CFADF557CD7E9879335195A2E9094C2F9ED497226D3664E04E` |
| `FRL-api-metadata.xml` | 30,308 | `561759C4B740ADF12326A56134631C3BF910A16B3D50C288DAF551A291EB8724` |
| `FRL-api-titles-C2026C00227.json` | 585,662 | `0A11A5F581CD06F160F1D63DA41C8133A33D9DF65CAF5CB7C92189D161BA4E27` |
| `FRL-api-documents-C2026C00227.json` | 652 | `A48A55DD126CDD8003B2E942E31DDE4B87ABB8544017D0DA0A08FEBE677DD0A9` |
| `FRL-api-documents-full-C2026C00227.json` | 1,856 | `FF12EBB844D1D96D31583A6BB43F7F8F9626DC35CD478180DD124C348D79CBAF` |
| `CA-CIV-1785.10.html` | 167,473 | `878D5FDBBD3AA0A75F0D14483B6B5A2DEA2990C8A23B5B7E5C18AD6EA739124D` |
| `CA-CIV-1785.13.html` | 167,769 | `01D05562BAB3D4197C41A450D1457C71191467CCD8AB35DE4CCE123A0116CA93` |
| `CA-CIV-1785.16.html` | 175,250 | `D15E99A4A8F2B170C87F7D5B38A5467343A60FFC7484BA5A7D5BC4C46DF840B5` |
| `CA-1995-96-billlist.html` | 1,013,777 | `40ABF37D95B453170BEDA7D5E5D5BA25415D247495621F225BEA9226609FDFFC` |
| `CA-1995-96-search-credit-reporting.html` | 131,337 | `5DFF23A7F8D74FE1A4119B1145F61C1B33BC9D90F85B1A5932BBFFE522AFB01F` |
| `OAIC-CR-code-2024-page.html` | 107,870 | `5D522F8D204ADFB3E1DAACE2CD35F383989234C89182F8797EFE5659D99FA53B` |
| `MA-DSpace-search-1996.json` | 82,007 | `AC5748C15DDA320BDB45C11D685210D1DE886106B9F951A5A99599B2AE503656` |

No preserved file was modified after download, and every extracted text is a direct `pdftotext -layout -enc
UTF-8` output of its own preserved original. Two files created during this phase were **not** preserved because
they are not evidence: a copy of the Register's site JavaScript bundle, fetched solely to test whether it exposed
a download route (it did not), and a zero-byte file produced by a failed write to the Massachusetts chapter
text. Neither is cited anywhere in this section.

**The catalogue remains untouched** at 437 entries, 437 distinct IDs, 15 fields and SHA-256
`5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`, unchanged from §§ 8, `PHASE5-001D`,
`PHASE5-001E` and `PHASE5-001F`. No entry in it needed a field change to record these retrievals, and the
description corrections approved by the owner are therefore recorded in this register only (§ 12.6 item 2).

### 12.8 Boundaries observed, and what this work order did not do

- **No disposition field changed for any of the twenty-one IDs.** Every `GAP_*` value recorded in § 3, § 8.3, § 10.4
  or `PHASE5-001E` or `PHASE5-001F` stands. What moved is recorded at § 12.6 item 12 and is limited to: a cleared
  partial-capture limitation, a text gap closed by capture, and five jurisdictions' instruments moving from
  *unretrieved* or *attempted* to *captured*. None of those movements is a closure and none creates a rule.
- Governed rules created: **0**. Legal coverage created: **0**. Authority to emit `VIOLATION` or
  `PROBABLE_VIOLATION`: **none**. Wildcards resolved: **0** — and by owner direction `US-*` and `AU-*` are now
  recorded as permanently non-operative rather than merely unresolved. Refusals closed: **0**. Deliberately
  not-entered items entered: **0**. Off-report inference of any report fact, statutory event date or consumer
  jurisdiction: **none**. In particular, no period, commencement point or delinquency rule was derived from the
  Fair Credit Reporting Act text captured here, and no period from any limitation statute, civil-code article or
  code clause captured here was entered anywhere in this register.
- Runtime code, the evaluator, tests, consumer workflows and the legacy application were **not touched**, and no
  permanent discovery registry was created: the capture directory is a per-phase evidence store, this register is
  its only index, and its inventory is recorded at § 12.7 in full so that it can be verified or removed without
  leaving anything unrecorded. Source-record counts remain separate from unique legal provisions, as § 11.2
  states.
- **The catalogue was not amended**, as § 12.7 records, and its digest is unchanged from §§ 8 and PHASE5-001D to
  `PHASE5-001F`.
- **Recorded for honesty.** The Fair Credit Reporting Act text captured is **Edition-specific** (the 2018 Edition
  for § 605(c) in § 11 and the 2014 Edition for § 623(a)(5) here) and the current edition was not retrieved; the
  Australian Capital Territory's s. 12 is quoted exactly as published, including wording that reads unusually,
  rather than being smoothed; the Northwest Territories' s. 2(2) is recorded as partial after its opening words;
  the two Prince Edward Island files retrieved are **repealed, non-target** Acts and prove only that the file path
  works; the Western Australian addresses probed resolve to other instruments and are recorded as such, not as
  retrievals; the Massachusetts 1995 Act is a 1996-effective amendment recorded as historical evidence and not as
  the baseline text of § 52; the Québec capture is the publisher's English text of two articles and not the Code's
  commencement evidence; and the Privacy (Credit Reporting) Code 2024 capture is the instrument's own text, whose
  remaining clauses are preserved but deliberately not converted into rules by this work order.

**Genuine owner input still required.** Ten items, and only these, need a decision that this work order cannot
take for itself. Each is a decision about scope, authorisation or an owner-supplied record, not a retrieval this
phase failed to perform.

1. `CRP-LSRC-0436` — whether an out-of-band read of the compilation's authorised PDF (472 pages, 1,920,725 bytes,
   identified but not reachable here) is to be commissioned, or whether the wording gap stays open indefinitely.
2. `CRP-LSRC-0077` — whether the Massachusetts **1994 Official Edition** text of G.L. c. 93 § 52 and the
   California pre-1996 chaptered Bill text are to be captured out of band from edition or print sources, and if so
   from which publisher.
3. `CRP-LSRC-0322` — whether the owner-supplied bases are to be corrected where the captured official text differs:
   Nova Scotia's chapter (c. 89 recorded, c. 93 captured) and section (s. 11(3) recorded, s. 10(3) captured),
   Manitoba's instrument (c. P34 recorded, c. L150 captured) and Québec's article (art. 30 recorded, arts. 2898 and
   2925 captured).
4. `CRP-LSRC-0322` and `CRP-LSRC-0398` — whether a print or PDF copy of Prince Edward Island's Consumer Reporting
   Act is to be obtained out of band, and which chapter number the owner's record should carry.
5. `CRP-LSRC-0395` — whether the Nova Scotia Act's 2015-06-01 in-force date is to be evidenced from a proclamation
   or royal-gazette source, or left as an owner-supplied date.
6. `CRP-LSRC-0396` — whether Ontario's ss. 5 and 15 are to be captured, the publisher being reachable.
7. `CRP-LSRC-0435` — whether Western Australia's Limitation Act 2005 address is to be supplied from an official
   source, or whether Western Australia and South Australia stay recorded as attempted.
8. `CRP-LSRC-0325` — whether out-of-band routes are to be sought for Saskatchewan, Yukon and Nunavut, all three
   still blocked by an application shell or HTTP 403.
9. `CRP-LSRC-0323` and `CRP-LSRC-0324` — authorisation for the separate, later catalogue edit that would carry the
   approved Ontario description corrections into the catalogue's parentheticals. The catalogue is otherwise
   complete as it stands.
10. **Evidence-store retention.** Whether the 37-file, 12,910,700-byte capture directory recorded at § 12.7 is to
    remain beside the register or be archived elsewhere. This is a housekeeping decision and it changes no record
    in this section.

### 12.9 Completion report — complete, partial and still inaccessible passages

**Now complete (captured as source text, with the locator recorded at § 12.5):** FCRA § 623(a)(5)(A) and (B),
the latter completed this phase from the 2014 Edition granule; the Privacy (Credit Reporting) Code 2024 in full,
including ss. 1 to 3, 16, 20 and 21; the Australian Capital Territory's Limitation Act 1985 ss. 10, 11 and 12
(Republication No 28); Queensland's Limitation of Actions Act 1974 s. 10; Nova Scotia's Limitation of Actions Act
ss. 8 and 12 and its Consumer Reporting Act s. 10(3)(c), (ca), (da) and (e); Manitoba's The Limitations Act,
C.C.S.M. c. L150, ss. 1, 9 and 10(1) to (2); the Northwest Territories' Limitation of Actions Act s. 2(1)(a) to
(j); Québec's Civil Code arts. 2898 and 2925; and Massachusetts' 1995 c. 125 in full, effective 31 January 1996.
Together with the § 11 captures, this is the first phase in which every named federal provision in the
twenty-one-ID set is captured in full.

**Partial:** the Northwest Territories' s. 2(2), captured to its opening words; Manitoba's s. 10(2)(a), whose
subparagraph continues beyond the captured page; and Québec, where the two target articles are captured and
converted while the preserved Code file is not converted further. Nova Scotia's transitional s. 23, provisionally
listed as partial while this section was drafted, is captured at subsections (1) to (4) and is therefore recorded
as complete.

**Still inaccessible, with the blocker named:** the exact text of compilation `C2026C00227` (the publisher's
file-delivery path returns the application shell; the file's identity, size and page count are confirmed);
California's 30 September 1996 baseline text and Massachusetts' 1994 Official Edition text of G.L. c. 93 § 52
(the publishers are reachable; the historical sources are not); Prince Edward Island's Consumer Reporting Act and
its chapter number (bot gate plus a file-naming scheme that does not expose the target chapter); Western
Australia's Limitation Act 2005 (address not located); Saskatchewan (application shell), Yukon and Nunavut and
South Australia (HTTP 403); Ontario's ss. 5 and 15 (reachable publisher, target not reached); Nova Scotia's
1 June 2015 in-force date (not stated by the captured source); and the current edition of the United States Code
text of §§ 1681c and 1681s-2 (only Edition-specific granules were captured).

**No cohort is reported complete.** The § 11.8 list of outstanding routes is reduced but not emptied: the
§ 623(a)(5)(B) completion has been achieved, the two Australian statutes and three Canadian instruments named
there have been captured, and there remain the compilation file, the two United States baseline texts, the
Prince Edward Island and Western Australian publishers, and the Saskatchewan, Yukon, Nunavut and South Australian
blocks. Nothing outside the twenty-one targeted IDs was reviewed or touched by this work order.

Register SHA-256 at completion of `PHASE5-001G`: `FC14FB30A7CA274E4D9340348CC84F01D05FA04E083B6699470B30CCFB41B0C0`

Digest method for the PHASE5-001G value: it covers every line of this register up to and including the last blank
line that precedes this digest line — that is all of §1 to §11 as they stood at the end of `PHASE5-001F` plus §12
as added by `PHASE5-001G` — and it deliberately excludes this digest line, the blank line after it and this note,
which keeps the value stable and non-circular. To verify, delete everything from the start of this digest line to
the end of the file, then hash the remainder as UTF-8 without a BOM with CRLF line endings: `2207` lines and
`275,511` bytes. The `PHASE5-001F` value above is unaffected by this section, because §12 begins after that digest
block; deleting from the start of the `PHASE5-001F` digest line to the end of the file still reproduces its
recorded 1,448-line, 192,458-byte region, and the `PHASE5-001E` and `PHASE5-001D` values above are likewise
untouched.

## 13. PHASE5-001H — evidence reconciliation and Canadian source completion

**Status:** appended by `PHASE5-001H` under the issued order `CRP_PHASE5_001H_EVIDENCE_RECONCILIATION_WORK_ORDER.md`
and the owner/architect delegation recorded in it. It reconciles evidence already in this register against the
bytes now held under `SOURCE_CAPTURES\PHASE5-001H\`, corrects seven documentary statements, and records one
result per H target. No line of §§1–12 is revised, relabelled or deleted; every correction is stated here and
points back to the historical statement it affects.

### 13.1 Baseline checks, verification performed, and what this phase did not do

Read-only state measured from the files themselves at the start of `PHASE5-001H`:

| Artefact | Measured | Recorded or expected | Result |
| --- | --- | --- | --- |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | 2,219 lines, 276,556 bytes, 2,219 CRLF, no lone LF, UTF-8 without BOM, SHA-256 `3790E4EEC5F6EC13F6A5882AB6A7C4B43E4023A2653442CF60EF4BBFDEABBA15` | the same value in H order §1 | matched |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 445,785 bytes; SHA-256 `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`; JSON block parses | the same value, 437 distinct entries with 15 fields each | matched; catalogue **not amended** |
| G evidence directory | 37 files, 12,910,700 bytes; every file named in the § 12.7 table present; all 37 sizes and SHA-256 values re-hashed against that table; 0 mismatches; no unlisted file | H order §1 | matched; no G file was moved, renamed, overwritten, added to or deleted |

Prefix digests were recomputed from this file for the four regions whose recorded truncation instruction can
still be executed, in each case by deleting everything from the start of the digest line to the end of the file
and hashing the remainder as UTF-8 without a BOM with CRLF line endings:

| Region | Lines hashed | Bytes hashed | Recorded value | Result |
| --- | --- | --- | --- | --- |
| `PHASE5-001D` | 610 | 84,280 | `EB459C428FFCEB7CC6BC5BE93415F03E69EF7090EFB4DB45C6ACADED1B26E99D` | reproduced |
| `PHASE5-001E` | 928 | 127,508 | `6F404D379E7A9026A55359D5B446B36017119303629E7E37957C8B4E22BD39A4` | reproduced |
| `PHASE5-001F` | 1,448 | 192,458 | `0A610719E21BF5B6EB58BA6D08A71496FBD59D53EBAD52CD5B592DD04F95BC6D` | reproduced |
| `PHASE5-001G` | 2,207 | 275,511 | `FC14FB30A7CA274E4D9340348CC84F01D05FA04E083B6699470B30CCFB41B0C0` | reproduced |

The `PHASE5-001C` value in § 9 is not re-derived here: it covered the first 349 lines as that file stood at the
end of `PHASE5-001C`, and this file no longer ends there. For identification only, the region of this file from
line 1 through the blank line before the `PHASE5-001D` digest line — that is the whole of §§ 1–9 as they now
stand — measures 595 lines, 83,110 bytes and hashes to
`092AA8189E75EE6C794845954BA5AE5EF8C6CF45E5E59B3A44D494D3D8ED4B1F`. That measurement is **not** a
re-derivation of the `PHASE5-001C` value and does not replace it.

Method: existing bytes were used first. The two whole-source files already retained from `PHASE5-001G`
(Nova Scotia's Consumer Reporting Act extraction and Manitoba's bilingual `c. L150` PDF extraction) were
inventoried, hashed and re-read; their printed pages were re-checked by page-pinning extraction
(`VER-MB-L150-pages7-9-extract.txt`) rather than by re-quoting the earlier section. Fresh official retrieval
was limited to the H targets named in H order §3 — Ontario's Limitations Act, 2002, Nova Scotia's commencement
evidence, plus route re-pulls used to test whether the previously probed routes are still the same bytes. Every
file written by this phase is a first-time capture under `SOURCE_CAPTURES\PHASE5-001H\` or a clearly identified
local derivative of one; derivatives are labelled as such and are not offered as publications.

This phase did **not**: amend the catalogue; change any gap, refusal or source disposition; enter a rule, period,
coverage entry, jurisdiction mapping, candidate or consumer finding; read or edit legacy application code;
create a permanent discovery registry; or move, rename or delete any earlier evidence file.

### 13.2 The ten decisions recorded by the issued order

These are decisions taken under the current delegation and recorded in H order §2. They are not additional
historical owner quotations, and none of them amends a historical statement.

| §12.8 item | Decision recorded | Boundary preserved with the decision |
| --- | --- | --- |
| 1 — exact Australian compilation | Continue official public file retrieval in the next Australian batch, using publisher-linked download, API or browser routes for `C2026C00227`. | No paid commission, outside correspondence or consumer-supplied copy is required now; the wording gap stays open for want of actual bytes and target text; indefinite abandonment is not chosen. |
| 2 — US historical texts | Continue official historical-source research after that batch: the California baseline, and Massachusetts 1994 Official Edition §52 with the intervening amendment history through 30 September 1996, from evidenced official legislative, government-archive or state-library routes. | No publisher need be supplied by the owner; the 1994 edition is a research target; §52's absence from one amending Act does not establish the complete intervening amendment history. |
| 3 — purported citation mismatches | Register-only correction of the Nova Scotia chapter/section description where the preserved source supports it. | Manitoba reporting retention is not replaced by a limitations statute, and Québec reporting retention is not replaced by prescription articles; these are different research questions and the original reporting-retention bases remain unresolved. |
| 4 — PEI | Continue official-source identification in a later blocked-publisher batch. | Neither `c. C-18` nor `c. C-20` is selected without evidence; the `c-17`/`l-08` non-target PDFs prove neither chapter identity nor operative wording. |
| 5 — Nova Scotia commencement | Targeted official proclamation, gazette and commencement evidence authorised in this H batch. | `2015-06-01` is retained as owner-supplied until verified; a consolidation footer is not substituted for commencement evidence. |
| 6 — Ontario | Official capture of Limitations Act, 2002 ss. 5 and 15 authorised in H, with necessary definitions, qualifications and source-version information. | The refusal disposition is preserved. |
| 7 — WA/SA | Continue discovery of the official Western Australian Act address and alternative public South Australian routes in the later Australian State/Territory batch. | The owner is not asked to supply URLs; wrong-instrument probes establish no target text. |
| 8 — SK/YT/NU | Continue official public alternatives in a later blocked-Canadian-publisher batch, recording each actual blocker. | No bot or access-control circumvention, and no blind repetition of failed routes. |
| 9 — catalogue corrections | Keep the catalogue unchanged during H and prepare exact before/after correction proposals in this appendix for a separate amendment. | The catalogue's historical owner-supplied descriptions are not silently replaced; this is sequencing, not a request for routine confirmation. |
| 10 — retention | Retain all 37 G files in place and unchanged, and authorise a bounded H evidence directory for new official files and clearly identified derivatives, with URL, custody, size and SHA-256 recorded in this register. | No archive, deletion, renaming, registry implementation or reorganisation. |

### 13.3 Historical scope discrepancy and source-only treatment of the broader G evidence

The discrepancy that H order §3 addresses is this: the G evidence directory holds complete publications of
foreign and Canadian legislation, while this register's admitted baseline is the Legacy Legal Corpus Admission
Contract and admits no rule, no governed legal coverage, no period and no finding from them. Those bytes are
therefore carried as **source-only**: retained, hashed, inventoried, quotable for documentary reconciliation,
and productive of no rule, coverage entry, jurisdiction mapping, candidate or consumer finding. H order §3 also
restates that the excluded legacy detector behaviour does not define legal-source scope, and that legacy
application code is not read or edited by this work. This phase neither widened nor narrowed that treatment; it
used the source-only files only to check statements already in this register.

H's Canadian target scope, taken from H order §3 verbatim in effect, was:

| IDs | Task authorised for H | Result |
| --- | --- | --- |
| 0322, 0323, 0324 | Reconcile the Nova Scotia and Ontario descriptions against existing evidence, preserving Manitoba `c. P34` and Québec art. 30 as separate unresolved reporting-retention research targets with no substitution and no fresh research in H. | complete — § 13.9 |
| 0325 | Complete the register's partial NWT s. 2(2) and Manitoba s. 10(2) captures from the existing whole files; locate Manitoba ss. 6 and 10 in full context rather than from contents headings. | source-text complete — § 13.7 |
| 0395 | Capture official evidence for the recorded Nova Scotia commencement date, preserving the refusal and distinguishing commencement, amendment, transition and consolidation dates. | captured with correction — § 13.6 |
| 0396 | Capture Ontario Limitations Act, 2002 ss. 5 and 15 from its official publisher, with incorporated material needed to understand the target, and report unresolved dependencies. | captured with qualification — § 13.5 |
| 0397 | Preserve Québec arts. 2898 and 2925 under their own limitation/refusal purpose, with no expansion to the whole Civil Code and no reporting-retention rule. | preserved, source-text complete — § 13.8 |

All other IDs received carry-forward status only; the full 21 are restated in § 13.14.

### 13.4 The seven corrections

Each correction names the historical statement it affects by section and by line number in this file as it stood
at 2,219 lines, states the evidence relied on, states the correction, and states what the correction does not do.

#### 13.4.1 Ontario instrument identity — "within a reasonable time" is the Consumer Reporting Act's s. 13(1), not the Limitations Act, 2002's

*Historical statements corrected:* §12.2 item 5, lines 1533–1539 ("…that the Limitations Act, 2002's s. 13(1) is
'within a reasonable time' rather than a universal 30-day period"), and §11.4 item 5, lines 1217–1222, which
carries the same attribution inside the item that cross-refers to the wording already captured at §8.4.

*Evidence already in this register:* §8.4 item 1, lines 483–491, records the retrieved current text of the
**Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 13** (correction of errors) as amended by 2018, c. 7, s. 7,
requiring the agency to use its best endeavours "within a reasonable time and in accordance with" the Act's
requirement. The wording therefore sits in the Consumer Reporting Act's correction-of-errors section.

*Evidence captured by this phase:* the Limitations Act, 2002's **s. 13 is headed "Acknowledgments"** and opens
"If a person acknowledges liability in respect of a claim for payment of a liquidated sum, the recovery of
personal property, the enforcement of a charge on personal property or relief from enforcement of a charge on
personal property, the act or omission on which the claim is based shall be deemed to have taken place on the day
on which the acknowledgment was made. 2002, c. 24, Sched. B, s. 13 (1)."
(`ONT-02l24-consolidated-text-derivative.txt`, line 309; the subject is confirmed by s. 14(5) at line 383 — "A
notice of possible claim is not an acknowledgment for the purpose of section 13"). No "reasonable time" period
appears anywhere in s. 13 of the Limitations Act, 2002 in the captured response.

*Correction recorded:* the passage "within a reasonable time and in accordance with [prescribed requirements]" is
the wording of the **Ontario Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 13(1)**, captured at §8.4 item 1.
The Limitations Act, 2002's **s. 13 is the acknowledgment provision** and is not a correction or reporting-time
provision. Lines 1218 and 1535–1536 are corrected to that effect, and the correction is confined to those
descriptions.

*What the correction does not do:* it enters no rule and no period; it does not lift the gaps on
`CRP-LSRC-0322` or `CRP-LSRC-0324`; it does not turn the Limitations Act ss. 5/15 capture into evidence about any
consumer-reporting duty; and it does not re-open the Ontario Consumer Reporting Act capture, whose retained
Admission Contract §2 pins remain
`evidence\canada\ontario\source-retrievals\wo05-wo14-ontario-cra-source-efa6d96d.html`
(`EFA6D96D82D188FDA04B1AF154F898A93FFFB14B2A779544AB76FFC940EAA063`) and
`evidence\canada\ontario\source-retrievals\wo15-ontario-cra-source-4c760ead.html`
(`4C760EAD418B84F97EEFB314865EC3509AA8E9DBDBFFFD04D582C99E7F7B1D7E`). Those bytes were not re-downloaded in
this phase.

#### 13.4.2 Separate legal subjects — a limitation provision does not answer a reporting-retention question

*Historical statements qualified:* §12.6 items 5 and 6, lines 2005–2011 (Manitoba's `c. P34, s. 9(3)` against the
captured `c. L150`; the owner-supplied Civil Code of Québec art. 30 against the captured arts. 2898 and 2925), and
§12.8 item 3's decision on the purported citation mismatches.

*Evidence:* §12.6 item 5 records that this project captured **The Limitations Act, C.C.S.M. c. L150** — a
different Act on a different subject — because that is the instrument Manitoba's publisher serves as the
province's limitation statute, and §12.6 item 6 records the same position for the Québec prescription articles.

*Correction recorded:* the reporting-retention bases **`The Personal Investigations Act, C.C.S.M. c. P34, s. 9(3)`**
(Manitoba) and **art. 30 of the Civil Code of Québec** are labelled **unverified and unresolved**; the limitation
instruments captured (`c. L150`; arts. 2898 and 2925) are **not** substituted for them, are **not** contradictory
evidence about them, and certify no owner-supplied period. The owner-supplied periods for those two
reporting-retention bases remain **not adopted**.

*What the correction does not do:* no rule, no period and no certification follows; no fresh research on `c. P34`
or on Code art. 30 is performed by H (H order §3, first row).

#### 13.4.3 Nova Scotia — chapter 93 and s. 10(3), with the limb check kept individual

*Historical statement corrected:* §12.6 item 3, lines 1992–1997, and the owner-supplied list line 113 ("Consumer
Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3)"), which §12.6 item 3 already records as inconsistent with the
captured official text.

*Evidence:* the whole-file pair preserved by `PHASE5-001G` was re-hashed in this phase and its printed pages
re-read. `NS-consumer-reporting.pdf` is 351,156 bytes with SHA-256
`5AD228066B3281E1702C2C63DA012C28128D444B8D528069075DC65939445500`; `NS-limitation-of-actions.pdf` is 215,628
bytes with SHA-256 `1C2253D9EAFF51F81A2B678774D983B1756709A37AEAAA3D95FC463CA6B847FD`. **Both values are exactly
the Admissions Contract §2 pins** `historical-ns-cra-source-5ad22806.pdf` and
`ns-limitation-of-actions-source-1c2253d9.pdf`. The extracted text (`NS-consumer-reporting.txt`, 46,081 bytes)
titles the Act "CHAPTER 93 OF THE REVISED STATUTES, 1989" with the running header "R.S., c. 93 consumer
reporting", and stands the six-year reporting limits in **s. 10(3)** (§12.6 item 3; §12.9 line 2180).

*Correction recorded:* the register's description of that base is corrected to
**`Consumer Reporting Act, R.S.N.S. 1989, c. 93, s. 10(3)`**, replacing the recorded `c. 89` and `s. 11(3)`. The
limbs are checked **individually** and only the limbs the capture reaches are named: **s. 10(3)(c), (ca), (da) and
(e)** (§12.9). No statement is made that "every claimed reporting period has been verified"; the owner-supplied
six-year period quoted in the register's summary tables is not certified by this correction.

*Provenance and counting rule:* because those two PDFs' SHA-256 values equal pins already listed in the
Admissions Contract §2, this phase counts them as **reused G evidence, not new unique authority**. They keep
their original retrieval provenance, are listed in § 13.11 as reused with today's review recorded separately, and
add nothing to any "unique provisions captured" count.

*What the correction does not do:* it changes no gap or refusal disposition, enters no rule, and does not amend
the catalogue (see § 13.9).

#### 13.4.4 Partial-capture accuracy — Manitoba s. 10(2) and NWT s. 2(2) are complete; the §12.9 inconsistency is resolved

*Historical statements affected:* §12.9 lines 2180–2181 (both instruments listed under **"Now complete"**, including
"Manitoba's The Limitations Act, C.C.S.M. c. L150, ss. 1, 9 and 10(1) to (2)") and §12.9 lines 2186–2187 (the same
instruments listed under **"Partial"**: "the Northwest Territories' s. 2(2), captured to its opening words;
Manitoba's s. 10(2)(a), whose subparagraph continues beyond the captured page"). H order §4 item 4 directed that
this inconsistency be resolved explicitly and that the original page be inspected before the partial item is
declared complete.

**Manitoba.** Complete file possession: `MB-limitations-act-ccsm-l150.pdf` (408,047 bytes, SHA-256
`0B9FE7C0096E3C7370D3307EAF8BAEB0F2274327BCD2EC9A6285D565FD304805`). Complete extracted text:
`MB-limitations-act-ccsm-l150.txt` (108,401 bytes). Page-checked extract made in this phase:
`VER-MB-L150-pages7-9-extract.txt` (13,176 bytes, SHA-256
`BD11CE621011E000C4E2D582856F284DE09CF447C9D675399356D89FF3908AE3`), whose form-feed boundaries carry the printed
page footers **3**, **4** and **5** and the publisher's own currency line "Current from 30 May 2023 to 28 Sept. 2026"
printed with "Accessed: 30 Sept. 2026 at 5:50 am CDT". Printed page 3 carries the heading "Basic limitation
period — 2 years from discovery" over **s. 6**; printed page 4 carries "When is a claim discovered?" over
**s. 7** and the discovery provisions of **s. 8**; printed page 5 carries "Burden of proof" over **s. 9**, then
"Ultimate limitation period — 15 years" over **s. 10(1)** and "Exception for Aboriginal claims — 30 years" over **s. 10(2)**, including limb **(a)**
("existing Aboriginal and treaty rights that are recognized and affirmed in the Constitution Act, 1982"), limb
**(b)** ("an equitable claim by an Aboriginal people against the Crown") and the concluding words "must not be
commenced more than 30 years after the day the act or omission on which the claim is based took place." The
bilingual columns are retained in the extract, so the French text of the same subsection is present alongside the
English.

**Northwest Territories.** Complete file: `NWT-limitation-of-actions.pdf` (89,694 bytes, SHA-256
`FF670BBE4FC226845647142540BAAA48D728C28B8B6571E280B14AD0B72EA1F4`); complete extracted text
(`NWT-limitation-of-actions.txt`, 145,114 bytes); page-checked extract `VER-NWT-p4-extract.txt` (7,262 bytes,
SHA-256 `31F1EBAF986A713C438E8C0479B6C61545DEB7D257EB8B0E343FE13D347F81D0`), whose printed page footer is **3**.
That page carries the closing limbs of s. 2(1) — **(h)** accident, mistake or other equitable ground, within six
years; **(i)** an action on a judgment or order for payment of money, within 10 years; **(j)** any other action
not specifically provided for, within six years — and then the **whole** of **s. 2(2)**: "Exception (2) Nothing in
subsection (1) extends to any action where the time for bringing the action is specially limited by an Act." The
French column reads "Le paragraphe (1) ne s'applique pas à une action dont le délai de prescription est
expressément prévu par une loi."

*Resolution of the §12.9 inconsistency:* the two entries describe different states of the same capture, and the
**"Partial"** note is superseded. Manitoba's **s. 10(2) is complete** — subsection opening, both limbs and the
concluding words are present in the saved text and were matched to the printed page — and the NWT's **s. 2(2) is
complete**, not merely captured to its opening words. The H order's four-way distinction is recorded for each:
(i) complete file possession; (ii) complete extracted text; (iii) the excerpt quoted in § 12.5 E; and (iv) **no
unverified transcription** — every passage quoted above is the publisher's own text from the retained PDF and was
located on the printed page shown by the form-feed boundary.

*What the correction does not do:* it changes no disposition, enters no rule (neither the Manitoba 15-year or
30-year periods nor the NWT six-year and 10-year periods become governed coverage), and does not touch the
Manitoba `c. P34` reporting-retention question (§ 13.4.2).

#### 13.4.5 Massachusetts — the baseline route is a route finding, and the 1996 sweep it needs was not performed

*Historical statement qualified:* §12.6 item 7, lines 2012–2015, read together with §12.5 G, lines 1917–1926.

*Evidence:* the captured Act is the Commonwealth's own text of **1995 c. 125**, "An Act Further Regulating
Consumer Reporting Agencies", preserved as `1995acts0125.txt` (30,828 bytes, SHA-256 `FD0F5F52…`) and
`1995acts0125.pdf` (348,019 bytes, 11 pages) from the State Library of Massachusetts DSpace item `2452/25465`. Its
own closing section reads "SECTION 14. This act shall take effect on January thirty-first, nineteen hundred and
ninety-six. Approved September 7, 1995." Each of its fourteen sections amends chapter 93 of the General Laws
"as appearing in the 1994 Official Edition", and **s. 52 is not among the sections amended** (§12.5 G).

*Correction recorded:* the register states the baseline position as **a route definition, not a capture**. For the
30 September 1996 baseline, the text of G.L. c. 93 s. 52 in force on that date is the **1994 Official Edition**
text that the amending Act itself names as its base, subject to any amendment taking effect on or before 30
September 1996. Two limits are stated with it and are not softened: (i) a repository search filtered to 1996
surfaced 1996 chapters on credit-union share insurance and insurance redlining and **no** consumer-reporting
chapter, but **a complete sweep of the 1996 session laws was not performed**, so the baseline text of s. 52 is
**not captured**; and (ii) nothing is reconstructed from the current text. The one supporting fact already
recorded stands: the current s. 52 text captured in § 10.3 C contains a paragraph (7) on "Eviction records sealed
pursuant to section 16 of chapter 239" which is not among the 1995 Act's amendments, so the current text is
established to post-date the baseline at least in that respect.

*What the correction does not do:* it enters no Massachusetts period and no state rule; it does not treat the
1995 Act's capture as satisfaction of the baseline requirement; and it does not convert the search result into a
negative finding about the 1996 session laws.

#### 13.4.6 Australia — the "typically 30 days" qualification rests on the Act, not on the Code, and it stays

*Historical statement qualified:* §12.6 item 9, lines 2019–2023, and the qualification carried in the owner-supplied
summary at line 213.

*Evidence:* the Privacy (Credit Reporting) Code 2024 was captured in full (§ 12.5 B), including s. 20,
"Correction of information", which opens at page 39 with "(1) This section is made for the purposes of sections
20T and 21V of the Act." The Code's own Note to the s. 20 subsection (5) attributes the 30-day correction period
to the **Act** — subsections 20T(2) and 21V(2) — and s. 21(6) speaks of "the 30 day period required by Part IIIA
of the Act".

*Correction recorded:* the register's recorded qualification "typically 30 days" is correct **as a statement about
the Act**, and the Code alone does not supply it: nothing in the captured Code states a general 30-day rule of its
own. The correction is that the attribution is recorded with its instrument — the qualification rests on the
Privacy Act's Part IIIA subsections 20T(2) and 21V(2) as the Code's own Note reports them, with the Code's s. 21(6)
in agreement — and that **no correction deadline is entered** anywhere in this register.

*What the correction does not do:* it lifts no refusal, enters no deadline and no period, and it neither adopts nor
rejects the owner-supplied "typically 30 days" entry at line 213, which remains owner-supplied and unadopted.

#### 13.4.7 Cross-reference and precision corrections forced by the other six

Five further statements in this file are corrected so that the six preceding corrections do not leave stale
pointers. Each is bounded and none changes a disposition.

1. **§12.2 item 1, line 1512.** The sentence "The § 605(c) text captured in § 11.3 B and the § 623(a)(5)(A) text
   captured in § 11.3 B" mis-points the first capture. In this file § 11.3 A is 15 U.S.C. 1681c (§ 605(c)) at
   line 1042 and § 11.3 B is 15 U.S.C. 1681s-2 (§ 623(a)(5)) at line 1069. The first pointer is corrected to
   **§ 11.3 A**.
2. **Line 2183–2184 — "every named federal provision in the twenty-one-ID set".** Read with § 13.3, this clause is
   a statement about **federal** provisions only and is **not** a statement that the twenty-one IDs are resolved:
   the set also names provincial, territorial and state instruments whose dispositions are unchanged (see § 13.8
   and § 13.10).
3. **§12.9 "Partial" list, lines 2186–2187.** Corrected by § 13.4.4: the Northwest Territories' s. 2(2) and
   Manitoba's s. 10(2)(a) come off that list; the Québec entry stays, because it records a conversion limit
   rather than a text limit (the two target articles are captured and converted while the preserved Code file is
   not converted further); and the Nova Scotia transitional s. 23 note stands as complete.
4. **Line 113, the owner-supplied Nova Scotia row.** Its description is corrected by § 13.4.3 to `c. 93` and
   `s. 10(3)`, and its **status is unchanged** — it remains owner-supplied, unadopted and unverified.
5. **The two Nova Scotia PDFs.** They are recorded in § 13.11 as **reused** G evidence whose digests equal
   Admissions Contract §2 pins, so no unique-authority count is increased by their presence in the H evidence
   directory (§ 13.4.3).
6. **`US-*` and `AU-*` are non-operative source descriptors.** §3.1 line 82 and §3.5 line 135 name
   `CRP-LSRC-0078` as `US-*` and `CRP-LSRC-0435` as `AU-*`, and this correction records what those tokens may and
   may not be read as. They identify owner-supplied, unretrieved source-ledger units and nothing more: they are
   **not** consumer jurisdiction mappings, they identify no single state, territory or nation, they create no
   coverage entry, and they are not deleted or narrowed. The per-region work recorded beneath them — §3.1's
   ingestion and session-metadata design, §3.5's per-state table, and the separate §12.8 item 1, 2 and 7 work on
   Australian compilations and United States historical baselines — is preserved in full and is not absorbed by,
   or discharged by, the wildcard token.
7. **Five distinct statuses are separated and are not to be conflated.** For every target in this appendix:
   (i) **source-text completion** (are the bytes and the text of the named provision in hand? — §§ 13.5 to 13.8);
   (ii) **gap disposition** (`GAP_OPEN` / `GAP_*` in the catalogue or this register — unchanged by H except where a
   decision says otherwise); (iii) **corpus certification** (is the passage verified against its official
   publisher under the Admissions Contract? — only the entries noted as such); (iv) **refusal disposition**
   (`REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` and its four sibling rows — all unchanged); and (v) **legal
   admission** (is a rule, period, coverage entry or mapping entered? — none in H). A capture moves status (i)
   only. The single exception is stated where it occurs: the partial-text limitation on 15 U.S.C. 1681s-2
   § 623(a)(5)(B) was cleared in G (§12.6 item 12), not in H.

### 13.5 `CRP-LSRC-0396` — Ontario `Limitations Act, 2002` ss. 5 and 15

**Result: captured with qualification — the source text of the two target sections is complete and in hand; the recorded refusal is preserved and no period is entered.** This is a source-text result only: it moves status (i) of § 13.4.7 item 7 and nothing else.

Capture. The official e-Laws publication of the Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, was reached on
its publisher's own routes and the consolidation text was obtained from the publisher's search response. The
displayed publication is the English consolidation `elaws/02l24_e.html`, whose recorded consolidation period is
**"From December 4, 2024 to the e-Laws currency date"** (consolidation period `December 4, 2024`; version `0`,
state `current`; publisher record `updatedAt` 2024-12-24T17:31:30.0; alias `statute/02l24`). The file's own
currency statement is the last amendment shown in the captured text: `2023, c. 21, Sched. 9, s. 14 - 04/12/2023`.

| H file | Bytes | SHA-256 | What it is |
| --- | ---: | --- | --- |
| `ONT-elaws-main-js-route-probe.js` | 1,680,682 | `DD6B253CA444521CE449E417D83E22F2435A8A28D586FC3008065EE6ACAE6ED0` | route evidence only — the e-Laws front-end bundle that the statute page loads; it carries no statute text and is not a publication |
| `ONT-limitations-act-2002.html` | 54,243 | `3F7B30261ACB525BFEBD99FAE6C97CD17C46C6AD2F7EF4BE55A4C35E9C18242A` | the statute page as delivered — a client-side application shell (title `e-Laws \| Ontario.ca`); **no** consolidated text is present in the delivered HTML, so the page alone is route evidence |
| `ONT-02l24-doc-search.json` | 78,439 | `395196A1ECF28E9EA58F926A6666D798BA5950701E2B5452D45D50DFB3F5C472` | the publisher's own search response for `statute/02l24`; its `content` field carries the consolidation text and its `comments` field carries the consolidation period and last-amendment note |
| `ONT-02l24-consolidated-text-derivative.txt` | 38,433 | `1AE13009495B506C394B03943ABD8EA57BEE0D188ACB6F496DCC3E118ACED9EA` | **local derivative** (892 lines) — text extracted from that `content` field; it is not a publication of the Act and is not offered as one |
| `ONT-02l24-act-versions.json` | 13,553 | `81A392706D8D16553C79DD8B37FA7F8D23DC64DF08C1CEC4C02142AE34FED3F0` | the publisher's version list for `statute/02l24`: 34 versions, `version` 0 (current) to 33, `dateFrom` spanning 2004-01-01 to 2024-12-04 |

**Publication status recorded without inference.** No H Ontario file is offered as a publication: two are route
evidence, one is a publisher search response, one is a clearly labelled local derivative. The statute text quoted
in § 13.5 below is the publisher's consolidation text as returned by the publisher; the embedded French
defined-term glosses (for example `("réclamation")` beside `"claim"`) are part of the published text and are
retained where quoted.

**Version corroboration, and its limit.** The publisher's version list begins with `dateFrom` **2004-01-01**, which
is consistent with the `2004-01-01` in-force date recorded for `CRP-LSRC-0396` in § 2 and in the catalogue. That
is corroboration from the publisher's publication history and **not** a commencement instrument: no proclamation
or commencement order was retrieved, so the recorded `2004-01-01` remains recorded-as-supplied.

**Effect on §12.9.** The line-2198 item "Ontario's ss. 5 and 15 (reachable publisher, target not reached)" is
closed as to source text by this capture. Nothing else in that sentence changes: Nova Scotia's recorded 1 June
2015 in-force date is dealt with in § 13.6, and the current-edition United States Code text of 15 U.S.C. 1681c
and 1681s-2 remains outstanding.

**Ontario instrument identity is not re-opened.** This capture is the Limitations Act, 2002 only. The corrected
attribution of the "within a reasonable time" passage (§ 13.4.1) is a correction about the Consumer Reporting Act,
not about these sections, and the two are not interchangeable.

Captured target text, quoted from the publisher's consolidation through the derivative identified above (line numbers
are those of `ONT-02l24-consolidated-text-derivative.txt`):

> 4 Unless this Act provides otherwise, a proceeding shall not be commenced in respect of a claim after the second
> anniversary of the day on which the claim was discovered. 2002, c. 24, Sched. B, s. 4.
>
> 5 (1) A claim is discovered on the earlier of, (a) the day on which the person with the claim first knew,
> (i) that the injury, loss or damage had occurred, (ii) that the injury, loss or damage was caused by or
> contributed to by an act or omission, (iii) that the act or omission was that of the person against whom the
> claim is made, and (iv) that, having regard to the nature of the injury, loss or damage, a proceeding would be
> an appropriate means to seek to remedy it; and (b) the day on which a reasonable person with the abilities and
> in the circumstances of the person with the claim first ought to have known of the matters referred to in clause
> (a). 2002, c. 24, Sched. B, s. 5 (1).
>
> (2) *Presumption* — A person with a claim shall be presumed to have known of the matters referred to in clause
> (1) (a) on the day the act or omission on which the claim is based took place, unless the contrary is proved.
> 2002, c. 24, Sched. B, s. 5 (2).
>
> (3) *Demand obligations* — For the purposes of subclause (1) (a) (i), the day on which injury, loss or damage
> occurs in relation to a demand obligation is the first day on which there is a failure to perform the
> obligation, once a demand for the performance is made. 2008, c. 19, Sched. L, s. 1.
>
> (4) Subsection (3) applies in respect of every demand obligation created on or after January 1, 2004. 2008,
> c. 19, Sched. L, s. 1.
>
> 15 (1) Even if the limitation period established by any other section of this Act in respect of a claim has not
> expired, no proceeding shall be commenced in respect of the claim after the expiry of a limitation period
> established by this section. 2002, c. 24, Sched. B, s. 15 (1).
>
> (2) *General* — No proceeding shall be commenced in respect of any claim after the 15th anniversary of the day
> on which the act or omission on which the claim is based took place. 2002, c. 24, Sched. B, s. 15 (2).
>
> (3) *Exception, purchasers for value* — Despite subsection (2), no proceeding against a purchaser of personal
> property for value acting in good faith shall be commenced in respect of conversion of the property after the
> second anniversary of the day on which the property was converted. 2002, c. 24, Sched. B, s. 15 (3).
>
> (4) *Period not to run* — The limitation period established by subsection (2) does not run during any time in
> which, (a) the person with the claim, (i) is incapable of commencing a proceeding in respect of the claim
> because of his or her physical, mental or psychological condition … [continues beyond the extent quoted here]

Section headings recorded in the same file alongside the excerpts: *Basic limitation period* (s. 4), *Discovery*
(s. 5), *Presumption* (s. 5 (2)), *Demand obligations* (s. 5 (3)), *Same* (s. 5 (4)), *Ultimate Limitation Periods*
(division heading), *Ultimate limitation periods* (s. 15), *General* (s. 15 (2)), *Exception, purchasers for value*
(s. 15 (3)), *Period not to run* (s. 15 (4)).

**Included material and its extent.** The derivative carries the Act's contents list, s. 1 *Definitions* (with the
bilingual defined-term glosses), ss. 2–3, s. 4, s. 5 at subsections (1)–(4) with their per-provision amendment
notes, s. 15 with its subsections, the *General Rules* division including s. 24 *Transition*, the *Schedule*
(section 19), and the closing *Section Amendments with date in force (d/m/y)* list whose last entry is
`2023, c. 21, Sched. 9, s. 14 - 04/12/2023`. Quotations above are exact to that derivative.

**Unresolved dependencies reported, not resolved.** (i) No commencement instrument for the Act was retrieved; the
`2004-01-01` date stays recorded-as-supplied. (ii) The Act's text refers outward to other statutes — for example
the Environmental Protection Act and the Consumer Protection Act, 2002 — and those references are **not** followed
in H. (iii) The Consumer Reporting Act provision corrected in § 13.4.1 was **not** re-captured in H, so that
correction rests on the evidence already recorded in this register. (iv) The stubs in the file's contents list —
`18. Contribution and indemnity`, `19. Other Acts, etc.`, `20. Statutory variation of time limits`,
`21. Adding party`, `22. Limitation periods apply despite agreements`, `23. Conflict of laws`,
`24. Transition` — show that later sections exist in the file; they were not read for this target and no rule is
taken from them.

**Disposition statement for `CRP-LSRC-0396`.** Source text: complete for the two target sections. Gap or refusal
disposition: **unchanged** — `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` (§ 2 and catalogue row
`CRP-LSRC-0396`). Corpus certification: unchanged and not claimed. Legal admission: **none** — no basic period, no
ultimate period, no suspension rule and no demand-obligation rule is entered anywhere in this register, and none is
applied to any unit.

### 13.6 `CRP-LSRC-0395` — Nova Scotia `Limitation of Actions Act` commencement evidence

**Result: captured with correction — the Act's commencement is evidenced by two independent official statements as
proclaimed on 4 August 2015 and in force on 1 September 2015. The owner-supplied `2015-06-01` is not merely
unevidenced; it is contradicted by both. The recorded refusal is retained and no period, block or finding follows.**

**What was recorded, and what H was authorised to do.** Register §2 line 64 and catalogue row `CRP-LSRC-0395`
record, as owner-supplied, "in force since 2015-06-01". H order §2 item 5 authorises targeted official
proclamation, gazette and commencement evidence in this batch, retains `2015-06-01` as owner-supplied until
verified, and forbids substituting a consolidation footer for commencement evidence. H order §3 row 0395 adds that
commencement, amendment, transition and consolidation dates must be distinguished.

**Evidence 1 — the instrument's own printed commencement statement, on a page of the file already retained.** The
G whole file `NS-limitation-of-actions.pdf` (215,628 bytes; SHA-256
`1C2253D9EAFF51F81A2B678774D983B1756709A37AEAAA3D95FC463CA6B847FD`; 13 pages) was re-read by page-pinned
extraction into `VER-NS-LAA-pages11-13-extract.txt` (2,562 bytes; SHA-256
`9D140EEC2DBEDC001E41A78E1917A7B61933976B49E0D83067BC0E563A40729E`) — PDF pages 11 to 13, which are printed
folios 9 and 10. Printed folio 10 carries the Act's own effective-date section and, immediately beneath it, the
publisher's printed commencement annotation:

> Effective date
>  31     This Act comes into force on such day as the Governor in Council
> orders and declares by proclamation. 2014, c. 35, s. 31.
>
>                                   Proclaimed -      August 4, 2015
>                                   In force   -   September 1, 2015

That is a proclamation statement inside the official publication: **proclaimed 4 August 2015, in force
1 September 2015**. Both extracted PDF pages end with the running footer `SEPTEMBER 1, 2015`.

**Correction of this register's own earlier reading.** §12.5 D, lines 1801–1805, states "**No commencement
proclamation date appears in the file**, so the 2015-06-01 in-force date recorded in the register remains
unverified", and treats the footers and the title page as consolidation statements only. That negative is
corrected: the commencement annotation **does** appear in the retained file, on its last printed page, and it was
already present in the retained extraction `NS-limitation-of-actions.txt` at its lines 499–500. The second half of
that sentence stands unchanged — the footer `SEPTEMBER 1, 2015`, the amending reference "as amended by
2015, c. 22" and the "© 2016" notice are consolidation and amendment statements, and none of them is used here as
commencement evidence.

**Evidence 2 — the Legislature's own commencement record, captured fresh in this phase.** `NS-legislature-proclamations-of-nova-scotia-statutes.html`
(343,353 bytes; SHA-256 `01980C5D0F9D38434554B3789AA92C3BC501AAE661E9DDFB51CD6A6B4700D631`), page title
"Nova Scotia Legislature - Proclamations of Nova Scotia Statutes", heading "Proclamations of Nova Scotia Statutes".
Under its "L" heading it carries the statute's own entry:

> Limitation of Actions Act (R.S. 1989, c. 258) (name changed to Real Property Limitations Act) Limitation of
> Actions Act 2014, c. 35 -- September 1, 2015

and, elsewhere on the same page, it records that the amendments made by the same chapter to five other Acts
("amended 2014, c. 35, ss. 25-27 -- September 1, 2015" for the Real Property Limitations Act, and the parallel
entries for 2014, c. 35, ss. 24, 28, 29 and 30) took effect on the same day. The page also marks other matters
"NOT PROCLAIMED IN FORCE", which shows its date column is a commencement column and not a currency footer. This
page is offered **only** as a commencement-status statement; it is not statute text and no provision is taken from
it.

**The four date classes, kept apart.** (i) **Commencement:** proclaimed 4 August 2015, in force 1 September 2015
(Evidence 1 and 2). (ii) **Amendment:** the retained publication is `CHAPTER 35 OF THE ACTS OF 2014` "as amended by
2015, c. 22"; the same file shows s. 23(4) as "2014, c. 35, s. 23; 2015, c. 22, s. 4", so the amending chapter is
dated 2015, not 2015-06-01. (iii) **Transition:** s. 23 of the Act defines "effective date" as "the day on which
this Act comes into force" and uses that date in the two-year rule for claims discovered before it. The corrected
commencement date therefore feeds that transitional provision; H records the classes and **performs no
computation** and enters no transitional rule. (iv) **Consolidation:** the footer `SEPTEMBER 1, 2015` and the
"© 2016" notice are consolidation statements, used here only as corroboration and never as the commencement
evidence itself.

**Gazette and route evidence, with the null result recorded rather than relied on.** The following fresh captures
were made beside the positive Evidence 2 so that the commencement finding does not rest on a single page:

| H file | Bytes | Finding |
| --- | ---: | --- |
| `NS-royal-gazette-partII-2015-08-07.pdf` / `.txt` | 493,224 / 51,630 | Royal Gazette Part II issue of 7 August 2015 (the issue following the proclamation): 0 hits for `limitation of actions`, 0 for `c. 35`, 0 for `proclamation`; the 3 `in force` hits are the standing note on regulation commencement dates |
| `NS-royal-gazette-partII-2015-09-04.pdf` / `.txt` | 3,534,856 / 46,042 | Royal Gazette Part II issue of 4 September 2015 (the issue following commencement): the same nil result |
| `NS-royal-gazette-partI-2015-index.pdf` / `.txt` | 935,127 / 313,226 | "Index of Advertisements for the Royal Gazette Part I, Volume 224, 2015": 0 hits for `limitation of actions`, `c. 35`, `proclamation` and `in force` |
| `NS-royal-gazette-part-II-issues-index.html`, `NS-royal-gazette-part-I-issues-index.html` | 117,298 / 128,827 | the Registrar of Regulations' Part II and Part I issue indexes, captured as route evidence for the two PDFs above |
| `NS-registrar-regulations-rg2-home.html`, `ROUTE-REPIN-NS-rg2htm-20260930.html` | 9,589 / 10,480 | Registrar of Regulations home page and Royal Gazette Part II page, captured as route evidence |

**Null result, stated as a null result:** no gazette or royal-gazette notice of this proclamation was recovered in
the issues and indexes inspected. That absence is **not** the basis of the finding and is not recorded as evidence
that no such notice exists; the finding rests on the two positive official statements above.

**Disposition statement for `CRP-LSRC-0395`.** Source text: s. 12 remains as captured in G (§ 13.11 records it as
reused) and is not re-quoted here. Commencement evidence: **complete** — two independent official statements agree.
Recorded date: the owner-supplied `2015-06-01` is **corrected to `2015-09-01`** (proclaimed `2015-08-04`), and the
correction is made at register level in § 13.9.2, whose proposed catalogue text is marked unapplied. Gap or
refusal disposition: **unchanged** — `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE`. Corpus certification:
unchanged and not claimed. Legal admission: **none** — the corrected date creates no limitation period, no
collection or reporting block and no finding, and the rationale behind the refusal remains owner-supplied
limitation analysis.

**What this result does not do.** It does not re-open the Nova Scotia Consumer Reporting Act question (§ 13.4.3
and § 13.9), does not count the two reused PDFs as new unique authority (§ 13.11), and does not clear any other
Canadian commencement date: Manitoba's, Ontario's and Québec's recorded dates are dealt with in §§ 13.7 to 13.9
on their own evidence.

### 13.7 `CRP-LSRC-0325` — Manitoba `c. L150` ss. 6 and 10 and Northwest Territories s. 2(2): source-text complete

**Result: source-text complete for the two passages H order §3 names, and for Manitoba's ss. 6 and 10 in their full
context. The §12.9 "Partial" entries are superseded (§ 13.4.4). The disposition of `CRP-LSRC-0325` is unchanged:
wildcard `CA-*` remains unresolved, and no limitation period, coverage entry or finding follows.**

**Method required, and method used.** H order §3 row 0325 required both partial captures to be completed **from the
existing whole files** and Manitoba's ss. 6 and 10 to be located "in their full context rather than from contents
headings". H order §4 item 4 required the original page to be inspected before a partial item is declared complete,
and required four distinct things to be kept apart. No fresh retrieval was performed for this target and no G file
was modified; existing bytes were used first, and page-pinned extraction was run over the retained publisher PDFs.
The resulting files are labelled derivatives and are not offered as publications.

**Manitoba — ss. 6 and 10 located in full context.** Extract `VER-MB-L150-pages7-9-extract.txt` (13,176 bytes,
SHA-256 `BD11CE621011E000C4E2D582856F284DE09CF447C9D675399356D89FF3908AE3`) covers PDF pages 7 to 9 of the
retained official bilingual PDF `MB-limitations-act-ccsm-l150.pdf` (408,047 bytes; SHA-256
`0B9FE7C0096E3C7370D3307EAF8BAEB0F2274327BCD2EC9A6285D565FD304805`; the 28-page copy the publisher's own page names
as the official version, § 12.5 F). Those three sheets are printed folios **3**, **4** and **5**, and reading them in
sequence — rather than reading the contents list — establishes the section order actually printed:

| Printed folio | What the page contains |
| --- | --- |
| 3 | part heading "BASIC LIMITATION PERIOD / DÉLAI DE PRESCRIPTION DE BASE"; **s. 6** in full, alone on the page |
| 4 | "When is a claim discovered?" over **s. 7** (limbs (a) to (d)) and the discovery provisions of **s. 8**, headed by its opening words on the previous page |
| 5 | closing limb **s. 8(f)**, then "Burden of proof" over **s. 9**, then the part heading "ULTIMATE LIMITATION PERIOD / DÉLAI DE PRESCRIPTION MAXIMAL" over **s. 10(1)** and **s. 10(2)** |

The verbatim text now captured for the two sections directly named by the register's §12.9 "complete" entry — and
not quoted in § 13.4.4 — reads:

> **6**  Unless this Act provides otherwise, a proceeding respecting a claim must not be commenced more than two
> years after the day the claim is discovered.
>
> **9**  The claimant has the burden of proving that a proceeding has been commenced within the basic limitation
> period.
>
> **10(1)**  Even if the basic limitation period for a claim has not expired, a proceeding must not be commenced
> more than 15 years after the day the act or omission on which the claim is based took place.
>
> **10(2)**  As an exception to subsection (1), a proceeding respecting (a) existing Aboriginal and treaty rights
> that are recognized and affirmed in the Constitution Act, 1982; or (b) an equitable claim by an Aboriginal people
> against the Crown; must not be commenced more than 30 years after the day the act or omission on which the claim
> is based took place.

Each sheet also prints the publisher's own currency line — "Accessed: 30 Sept. 2026 at 5:50 am CDT" with "Current
from 30 May 2023 to 28 Sept. 2026", and its French counterpart "À jour du 30 mai 2023 au 28 sept. 2026" — and the
French column is retained beside the English in the extract. The page attribution recorded in § 13.4.4 for s. 6
(printed folio 3, not 4) and for the following sections is corrected here; the substance of § 13.4.4 is unaffected.
The section order found by page inspection matches the order given by the contents list, so that list is now
**corroborated** rather than relied on, which is exactly what H order §3 required.

**Northwest Territories — s. 2(2) complete.** Extract `VER-NWT-p4-extract.txt` (7,262 bytes, SHA-256
`31F1EBAF986A713C438E8C0479B6C61545DEB7D257EB8B0E343FE13D347F81D0`) covers PDF page 4 — printed folio **3** —
of the retained official bilingual PDF `NWT-limitation-of-actions.pdf` (89,694 bytes; SHA-256
`FF670BBE4FC226845647142540BAAA48D728C28B8B6571E280B14AD0B72EA1F4`; the 27-page bilingual copy recorded at §§ 12.5 E
and 12.7). That one sheet carries the closing limbs of **s. 2(1)** — **(h)** accident, mistake or other equitable
ground, six years; **(i)** an action on a judgment or order for the payment of money, 10 years; **(j)** any other
action not specifically provided for, six years — then **s. 2(2) in its entirety**, then **s. 2.1** subsections
(1) to (3) ("Definition of 'action'", "No limitation period for sexual assault in certain situations", "Other
limitation period does not start until person capable of commencing action") and the opening of s. 2.1(4)
("Presumption"). The French column is retained throughout, so the same subsection is present in both languages.
The register's §12.9 words "captured to its opening words" are therefore superseded in full — that note described the
excerpt G quoted, not the state of the file, which always held the complete subsection:

> Exception (2) Nothing in subsection (1) extends to any action where the time for bringing the action is specially
> limited by an Act.

> (2) Le paragraphe (1) ne s'applique pas à une action dont le délai de prescription est expressément prévu par une
> loi.

Those are the English and French columns of the same subsection, not two provisions, and nothing is added to the
paragraph by reading across them.

**The four things H order §4 item 4 requires to be kept apart.** They are kept apart for each instrument:

| Aspect | Manitoba `c. L150` | Northwest Territories `Limitation of Actions Act` |
| --- | --- | --- |
| (i) Complete file possession | Yes — official bilingual PDF, 408,047 bytes, SHA-256 `0B9FE7C0…`, retained unmodified from G | Yes — official bilingual PDF, 89,694 bytes, SHA-256 `FF670BBE…`, retained unmodified from G |
| (ii) Complete extracted text | Yes — `MB-limitations-act-ccsm-l150.txt`, 108,401 bytes, retained | Yes — `NWT-limitation-of-actions.txt`, 145,114 bytes, retained |
| (iii) The excerpt quoted in G | Partial by design: § 12.5 F quoted the currency, history and contents material, and § 12.9 quoted s. 10(2)(a) only to its opening words | Partial by design: § 12.9 quoted s. 2(2) only to its opening words |
| (iv) Unverified transcription | **None** — every passage in § 13.4.4 and above was read from the retained file and matched to the printed folio shown by the form-feed boundary | **None** — same method, same result on printed folio 3 |

**Result classification and the separations required by correction 7.** For `CRP-LSRC-0325` the outcome is
classified on those five separate axes, and only the first moves: **source-text completion — complete** for the two
named passages; **gap disposition — unchanged**, because `CA-*` still identifies no single province or territory and
the entry's status token and blocker text are untouched; **corpus certification — unchanged and not claimed**; **no
governed legal coverage and no rule** — the Manitoba two-year, 15-year and 30-year periods and the NWT six-year and
10-year periods are captured text, not coverage entries, periods or deadlines; **no legal admission** and no finding.
Two further boundaries: Manitoba's reporting-retention basis `C.C.S.M. c. P34, s. 9(3)` is a **different Act and a
different research question** that H neither researched nor replaced (§ 13.4.2, § 13.9); and nothing in this section
amends the catalogue, whose proposed corrections are set out in §§ 13.9.2 and 13.9.3 and marked unapplied.

### 13.8 `CRP-LSRC-0397` — Québec arts. 2898 and 2925 preserved; refusal retained

**Result: preserved and source-text complete. The two articles stay captured source text under their own
limitation/refusal purpose; the refusal is retained; H made no Québec request; and neither the whole Civil Code nor
any reporting-retention rule is brought in.**

**The boundary H was given.** H order §3 row 0397 authorises preservation only: arts. 2898 and 2925 are kept "under
their own limitation/refusal purpose", with "no expansion to the whole Civil Code or reporting-retention rule". H
order §2 item 3 adds the separation that matters: those two prescription articles must not be used to replace the
owner-supplied reporting-retention basis for Québec, which is **Civil Code art. 30** in the `CRP-LSRC-0322` row.
Capturing a prescription provision is not contradictory evidence about a separate reporting-retention provision, and
the two remain different research questions with the reporting-retention side unresolved.

**What is preserved, and from where.** The publisher file retained from G is `QC-CCQ-1991-en.html` — LégisQuébec's
English document page for `CCQ-1991`, downloaded whole at 6,001,882 bytes, SHA-256
`E2D7503D387880F0847307216B68C7E976BC97857EE504A3B3566C1C914C22A8`. Its two target articles, as captured and
quoted at § 12.5 F, read:

> 2898. Acknowledgement of a right, as well as renunciation of the benefit of the time elapsed, interrupts
> prescription. 1991, c. 64, a. 2898; I.N. 2014-05-01; I.N. 2015-11-01.

> 2925. An action to enforce a personal right or movable real right is prescribed by three years, if the
> prescriptive period is not otherwise determined. 1991, c. 64, a. 2925; I.N. 2014-05-01.

**What this phase did and did not do.** No file in the H evidence directory is a Québec retrieval, no LégisQuébec
request was made during H, and the French-path HTTP 403 recorded in §§ 10 and 11 is not re-tested or superseded
here. The § 12.9 conversion limitation also stands unchanged: the two target articles are captured and converted
while the preserved Code file is not converted further. No article text is altered, no article is added, and the
articles' own amendment annotations ("I.N. 2014-05-01", "I.N. 2015-11-01") are reported as printed in the retained
file, not interpreted.

**The five axes, separated.** *Source-text completion:* complete for the two named articles. *Gap or refusal
disposition:* **unchanged** — `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE`; interruption analysis is still
required and no automatic reset on payment is assumed anywhere. *Corpus certification:* unchanged and not claimed.
*Rules and coverage:* the captured articles create no limitation period, no coverage entry, no collection or
reporting block. *Legal admission:* none, and no finding about any bureau, furnisher or consumer.

**The wider unchanged-disposition record.** So that this section is not read as clearing the other provincial,
territorial and state instruments it sits beside, their dispositions are restated as untouched by H, with the
separate research target named where one exists: Manitoba — reporting-retention basis `C.C.S.M. c. P34, s. 9(3)`
still unverified and **not** replaced by the captured `c. L150` (§ 13.4.2, § 13.7); Québec — reporting-retention
basis art. 30 still unverified and **not** replaced by arts. 2898/2925 (above); New Brunswick `S.N.B. 2014, c. 31,
s. 13`, Prince Edward Island `c. C-18`/`c. C-20` s. 10 with its unresolved chapter conflict, Newfoundland and
Labrador `c. C-32, s. 11`, British Columbia `s. 109`, Alberta with the Consumer Reporting Regulation s. 16,
Saskatchewan `c. C-43.2, s. 18`, and Yukon, the Northwest Territories and Nunavut "with no precise provision
supplied" — all still owner-supplied and unverified; and on the limitation side, the `CA-*` mapping held separately
in § 3 for six of thirteen units, the Saskatchewan, Yukon and Nunavut publisher blocks, and the unreviewed
Australian Western Australian and South Australian targets all remain exactly as §§ 11 and 12 record them. None of
these is closed, reopened or narrowed by H, and the per-region work is preserved in full.

### 13.9 `CRP-LSRC-0322`, `CRP-LSRC-0323`, `CRP-LSRC-0324` — description reconciliation, and the catalogue's amendment standing

**Result: complete for the reconciliation H was given, and the catalogue is unchanged. No fresh research was
performed on Manitoba `c. P34` or on Québec art. 30, no limitation provision was substituted for a
reporting-retention basis, and every correction proposed below is marked unapplied.**

#### 13.9.1 What was reconciled, against which evidence, and with what result

| ID and standing | Recorded description at issue | Evidence actually relied on in H | Reconciliation recorded |
| --- | --- | --- | --- |
| `CRP-LSRC-0322` — `GAP`, `GAP_PARTIALLY_RESOLVED — STATUTORY BASIS IDENTIFIED (UNRETRIEVED)`, Canada-wide | The FCAC-practice row's supplied statutory bases, in which Nova Scotia's consumer-reporting base is given as "Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3)", and Prince Edward Island's chapter is given as `c. C-18` | The retained whole-file pair re-hashed in this phase: `NS-consumer-reporting.pdf` (351,156 bytes, SHA-256 `5AD22806…`) and its extraction `NS-consumer-reporting.txt` (46,081 bytes), whose title page reads "CHAPTER 93 OF THE REVISED STATUTES, 1989" and whose running header reads "R.S., c. 93 consumer reporting" | Nova Scotia's base is corrected at register level to **`Consumer Reporting Act, R.S.N.S. 1989, c. 93, s. 10(3)`**, with the limbs checked individually as **(c), (ca), (da) and (e)** (§ 13.4.3). Manitoba's `Personal Investigations Act, C.C.S.M. c. P34, s. 9(3)` and Québec's Civil Code art. 30 are **preserved as separate, unresolved reporting-retention research targets**, with no substitution and no fresh research (H order §3, first row; § 13.4.2). The Prince Edward Island `c. C-18`/`c. C-20` conflict has **no** resolving evidence in H and stays open |
| `CRP-LSRC-0323` — `GAP`, scope decision retained | The four provincial consumer-reporting regimes read and deliberately not entered, in which Nova Scotia's exclusion provision is given on the same `c. 89` reference, and Prince Edward Island's on `c. C-20` | The same retained Nova Scotia file and extraction as above; no new capture for this ID | The same chapter correction applies to the Nova Scotia limb (§ 13.4.3). The deliberate non-entry of all four regimes is **retained** and is unchanged; the Ontario `s. 2(2)`/`s. 2(3)`, New Brunswick `c. 31, s. 2` and Prince Edward Island `c. C-20, s. 2` descriptions remain owner-supplied and unretrieved; the `c. C-18`/`c. C-20` inconsistency is recorded, not resolved |
| `CRP-LSRC-0324` — `GAP`, `GAP_CLOSED_SCOPE_DECISION — OUT OF SCOPE FOR REPORT-ONLY FINDINGS`, Canada/UK dual country scope | The bureau-side duties read and not entered, including Ontario's Consumer Reporting Act `s. 8` and `s. 13` | The Admission-Contract-pinned Ontario captures already in this register — `wo05-wo14-ontario-cra-source-efa6d96d.html` (`EFA6D96D…`) and `wo15-ontario-cra-source-4c760ead.html` (`4C760EAD…`) — which were **not** re-downloaded in H, plus the Limitations Act, 2002 capture made in this phase | The register's attribution of the "within a reasonable time" wording to the Limitations Act, 2002's `s. 13(1)` is corrected to the **Consumer Reporting Act, R.S.O. 1990, c. C.33, s. 13(1)** (§ 13.4.1); the captured Limitations Act `s. 13` is the **acknowledgments** provision and is not a reporting or correction provision. The dual Canada/United Kingdom country scope and the out-of-scope character of bureau-side duties are unchanged, and the UK material (Data Protection Act 2018, UK GDPR Art. 5(1)(d), Consumer Credit Act 1974 ss. 157–159) remains owner-supplied and unretrieved |

**The axes, separated for these three IDs.** *Source-text completion:* **unchanged** — the description
reconciliation used evidence already retained, and no new source text was obtained for `CRP-LSRC-0322`,
`CRP-LSRC-0323` or `CRP-LSRC-0324`. *Gap disposition:* **unchanged** for all three; the status tokens
`GAP_PARTIALLY_RESOLVED — STATUTORY BASIS IDENTIFIED (UNRETRIEVED)`, the retained scope decision for the four
regimes, and `GAP_CLOSED_SCOPE_DECISION — OUT OF SCOPE FOR REPORT-ONLY FINDINGS` all stand as recorded. *Corpus
certification:* unchanged and not claimed. *Rules and coverage:* none entered — no statutory basis, no reporting or
retention period and no bureau duty becomes a rule or a governed coverage entry, and the six-year figures quoted in
the register's summary tables remain **not certified** by the correction. *Legal admission:* none, and no finding
about any bureau, furnisher or consumer.

#### 13.9.2 Proposed catalogue text for the `CRP-LSRC-0395` commencement correction — **not applied**

The catalogue was **not** amended in this phase. It is re-hashed after the H writes as 445,785 bytes with SHA-256
`5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D`, which equals the value in H order §1, § 13.1
and § 12.7; its 437 entries and 15-field schema are untouched. What follows is the exact text a separate
catalogue-amendment order would carry, marked unapplied. Line numbers are those of
`CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` as it stands.

Quoted *current text* below is reproduced literally from the field named, with `…` marking omitted words; the
register's token marking is added only in proposed text and in this appendix's own sentences, never inside a
quotation. Each field named was read back from the catalogue at the line stated before this table was written.

| Field of row `CRP-LSRC-0395` (lines 6799–6814) | Current text | Proposed replacement (**unapplied**) |
| --- | --- | --- |
| `instrument_title` (line 6806) | "…in force since 2015-06-01…" | "…in force since `2015-09-01` (proclaimed `2015-08-04`)…" |
| `effective_information_as_recorded` (line 6809) | "In force from 2015-06-01 (owner-supplied; not retrieved in this work order)" | "In force from 2015-09-01, proclaimed 2015-08-04. Corrected under PHASE5-001H from the owner-supplied 2015-06-01 on two independent official statements: the Act's own printed commencement annotation on printed folio 10 of the retained publication, and the Nova Scotia Legislature's proclamations record entry `Limitation of Actions Act 2014, c. 35 -- September 1, 2015`. No limitation period is applied from report content" |
| `verification_state_as_recorded` (line 6810) | "…the citation and in-force date were not retrieved in this work order…" | Same sentence with the correction appended: "…the citation was not retrieved in this work order; the in-force date was verified in PHASE5-001H against the two official commencement statements described in the register, § 13.6, and the recorded refusal disposition is unchanged…" |
| `provision_or_citation` (line 6807), `source_locator` (line 6808) | s. 12 identification and locator, carrying no date | **No change proposed** — neither field carries the date, and s. 12 itself is still not re-retrieved |

**Register-level correction, which is made here and not deferred.** Because §§1–12 are preserved byte-for-byte, the
correction is recorded in this appendix and supersedes the earlier text on its own terms: register §2's
`CRP-LSRC-0395` row and the catalogue row, both of which read "in force since 2015-06-01", are **corrected to
2015-09-01** (proclaimed 2015-08-04), and the §12.5 D statement that "no commencement proclamation date appears in
the file" is corrected as § 13.6 records — the annotation **is** present, on the file's last printed page and at
lines 499–500 of the retained extraction. The refusal disposition those rows record is unchanged by the date
correction. The date classes stay distinct as § 13.6 sets them out: commencement (1 September 2015), amendment
(`2015, c. 22`), transition (s. 23's "effective date" rule, recorded and not computed) and consolidation (the
`SEPTEMBER 1, 2015` footer and the "© 2016" notice, used as corroboration only).

#### 13.9.3 Proposed catalogue text for the Nova Scotia chapter correction in `CRP-LSRC-0322` and `CRP-LSRC-0323` — **not applied**

The evidence that supports § 13.4.3 also corrects the chapter in these two rows. The section identifications differ
and are proposed separately, because the evidence reaches them differently. Quoted *current text* is reproduced
literally from the field named, as in § 13.9.2.

| Row and field | Current text | Proposed replacement (**unapplied**) |
| --- | --- | --- |
| `CRP-LSRC-0322` (lines 5558–5573), `instrument_title` (line 5565) | "Nova Scotia 6/6 (Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 11(3))…" | "Nova Scotia 6/6 (Consumer Reporting Act, R.S.N.S. 1989, `c. 93, s. 10(3)`) — chapter and section corrected under PHASE5-001H from the captured official text; the limbs reached by the capture are s. 10(3)(c), (ca), (da) and (e)" |
| `CRP-LSRC-0322`, `verification_state_as_recorded` (line 5569) | "…No cited provision was retrieved or verified in this work order…" | Same text with: "…the Nova Scotia chapter and section were corrected in PHASE5-001H against the retained official capture (`c. 93`, `s. 10(3)`); all other cited provisions remain unretrieved and unverified, and no period is certified" |
| `CRP-LSRC-0323` (lines 5575–5590), `instrument_title` (line 5582) | "Nova Scotia (Consumer Reporting Act, R.S.N.S. 1989, c. 89, s. 2: scope limited to consumer reports compiled for profit or commercial dissemination)…" | "Nova Scotia (Consumer Reporting Act, R.S.N.S. 1989, `c. 93`, `s. 2`): chapter corrected under PHASE5-001H from the captured official text; the recorded scope description is corroborated by the captured definitions — `consumer report` requiring communication `for consideration`, and `consumer reporting agency` requiring furnishing `for gain or profit` — while the recorded words remain the owner's paraphrase and are not adopted as the Act's words" |
| `CRP-LSRC-0323`, `verification_state_as_recorded` (line 5586) | "…The four provisions were not retrieved in this work order…" | Same text with: "…the Nova Scotia chapter was corrected in PHASE5-001H to `c. 93` on the retained official capture; the other three provisions and the Nova Scotia section's operative wording remain unretrieved" |

**Sections confirmed rather than changed.** The captured file's title page reads "CHAPTER 93 OF THE REVISED
STATUTES, 1989", its running header reads "R.S., c. 93 consumer reporting", and its short-title section reads "1
This Act may be cited as the Consumer Reporting Act. R.S., c. 93, s. 1." Its "Interpretation and application"
section is s. 2 and ends "This Act applies notwithstanding any agreement or waiver to the contrary. R.S., c. 93,
s. 2; 2014, c. 39, s. 4; 2017, c. 9, s. 14." That confirms `s. 2` for `CRP-LSRC-0323` and leaves the previously
recorded `s. 11(3)` in `CRP-LSRC-0322` unsupported: the reporting limits sit in **s. 10(3)**, whose limbs were
checked individually and only to the extent the capture reaches them.

#### 13.9.4 Proposals deliberately *not* made, and the catalogue's standing after H

No correction is proposed for the following, and each omission has a reason on the record rather than a silent
choice:

1. **Prince Edward Island chapter (`c. C-18` in `CRP-LSRC-0322` against `c. C-20` in `CRP-LSRC-0323`).** H order §2
   item 4 continues that identification work in a later blocked-publisher batch and states that neither chapter is
   selected without evidence; the `c. 17`/`l-08` non-target PDFs prove neither chapter identity nor operative
   wording. H adds no evidence to the conflict, which the catalogue itself records as unresolved, so it is left
   open rather than "corrected" to a guess.
2. **`CRP-LSRC-0324`'s bureau-side duties.** They remain recorded, deliberately not entered and out of scope for
   report-only findings. The only change touching this ID is the register-level attribution corrected in § 13.4.1,
   which is a description correction and not catalogue text.
3. **`CRP-LSRC-0325` and `CRP-LSRC-0397`.** Their captured source text raises no description error: the catalogue
   records no provision and no period for either, and § 13.7 and § 13.8 enter none.
4. **`CRP-LSRC-0396`.** The Ontario refusal row's recorded `2004-01-01` in-force date is **corroborated**, not
   corrected, by the publisher's own version list (§ 13.5), and the row is left unchanged.
5. **Every other row.** No other catalogue row, field or status token is touched, proposed or re-described by H.

**Standing.** H order §2 item 9 requires the catalogue to stay unchanged during H, with any correction proposed
exactly in this register for a separate amendment and no silent replacement of the historical owner-supplied
descriptions. §§ 13.9.2 and 13.9.3 do that: they state before-and-after text, mark it **unapplied**, and leave the
catalogue's bytes and hash as measured. The catalogue's historical text stands until a later order adopts the
proposals, and until then this appendix is the only place where the corrected reading is recorded — the register's
own §2 and §12.5 rows being preserved byte-for-byte as H order §4 requires.

### 13.10 No disposition changed, the authority counts, and the one internal pointer repaired

**Every H target has one recorded result, and the only axis that moved is source text.** Of the five axes § 13.4.7
item 7 separates, H moved **(i) source-text completion only**, and only for the targets H order §3 names:
`CRP-LSRC-0396` — captured with qualification (§ 13.5); `CRP-LSRC-0395` — captured with correction (§ 13.6);
`CRP-LSRC-0325` — source-text complete, for the two named passages and for Manitoba ss. 6 and 10 in full context
(§ 13.7); `CRP-LSRC-0397` — preserved and source-text complete, refusal retained (§ 13.8); `CRP-LSRC-0322`,
`CRP-LSRC-0323` and `CRP-LSRC-0324` — descriptions reconciled against evidence already held, catalogue unchanged
(§ 13.9). No target row is reported as blocked, not attempted or partial as to its own named passage. The two
partial results H does record are of a different kind and are labelled as such: the Nova Scotia gazette search
returned a **null result** (§ 13.6), and several H files are **route evidence only** — publisher shells, asset
bundles and index pages that carry no statute text (§§ 13.5, 13.11, 13.12).

**Counts, stated as counts** — the negative acceptance requirements of H order §6 are met without qualification:

| Item | Count |
| --- | ---: |
| Gap/refusal IDs carried forward, none dropped (restated in § 13.14) | 21 — 18 `GAP`, 3 `REFUSAL` |
| Dispositions changed by H | 0 |
| Wildcard or country tokens resolved | 0 — `US-*`, `CA-*`, `AU-*`, bare `UK` remain unresolved |
| Rules, limitation or reporting-retention periods, or deadlines entered | 0 |
| Governed legal coverage entries or jurisdiction mappings created | 0 |
| Candidates, consumer findings or legal admissions | 0 |
| Refusal dispositions changed, including all rows outside the twenty-one-ID set | 0 |
| Catalogue entries amended, or schema drift | 0 — 437 entries, 15 fields each, bytes and hash unchanged |
| Files in the H evidence directory that bear on a target, are route evidence, or are local derivatives respectively | 6 / 15 / 8 of 29 (enumerated and labelled in § 13.11) |

**The catalogue's standing is unchanged and its proposals stay unapplied.** No catalogue byte was written by H.
The proposals in §§ 13.9.2 and 13.9.3 state before-and-after text, name the exact rows and line numbers, and are
marked **unapplied**; the catalogue's own historical owner-supplied descriptions remain in place until a separate
amendment order adopts them. The catalogue hash re-measured after all H writes is unchanged from H order §1 and
from §§ 13.1 and 12.7.

**§§ 1–12 are byte-for-byte preserved, and that is verified rather than asserted.** The region of this file from
line 1 through the blank line before the § 13 heading — that is, the whole of §§ 1–12 as this phase found them —
measures **2,219 lines and 276,556 bytes** and hashes to
**`3790E4EEC5F6EC13F6A5882AB6A7C4B43E4023A2653442CF60EF4BBFDEABBA15`**, which is exactly the whole-file value
recorded in H order §1 and § 13.1. Because the whole file has since grown, that identity also proves that H added
its appendix after those bytes and rewrote none of them. The four earlier prefix digests reproduced in § 13.1
stand for the same reason.

**The one internal pointer repaired.** Inside this appendix, § 13.8's closing sentence pointed the reader to
"§ 13.10" for the catalogue's proposed corrections. The proposals are set out in **§§ 13.9.2 and 13.9.3** (with
the deliberate non-proposals in § 13.9.4), so that pointer was corrected to name them, before the § 13 digest at the end
of this appendix was taken and before anything was hashed. It is the only line of § 13 rewritten during this phase;
no other pointer in § 13 was found stale on re-reading, and no line of §§ 1–12 was touched, which the region
measurement above confirms byte-for-byte.

### 13.11 Evidence ledger, inventory, custody and counts

**How this section is organised.** The ledger below names each route H actually used and the file(s) that route
produced; the inventory then lists **every one of the 29 files** in the H evidence directory with its size and
SHA-256 and puts it in one of three custody classes — **(a) target or commencement text** served by the publisher,
**(b) route evidence** (shells, asset bundles, index and landing pages that carry no decided text), and
**(c) local derivatives** extracted from files held. Nothing is listed twice and no file is left unclassified; the
twenty-three files that are not target text are pointed at as route or derivative evidence, never as source.

**Route ledger — each route, and the file it produced.**

| Route as recorded | Files produced | What the response carried |
| --- | --- | --- |
| Ontario e-Laws statute page for `statute/02l24` (the displayed publication; the page's own title is `e-Laws`, with the site banner reading `Ontario.ca`) | `ONT-limitations-act-2002.html`; re-pull `ROUTE-REPIN-ONT-statute-page-20260930.html` | A JavaScript application shell: no statute text, no `<main>` content, and a deferred `main.dbd400db.js` bundle (§ 13.5) |
| The asset that shell loads, `/laws/static/js/main.dbd400db.js` | `ONT-elaws-main-js-route-probe.js` | The application bundle, captured to show what the shell defers its text to |
| Ontario e-Laws document search for `statute/02l24` | `ONT-02l24-doc-search.json`; re-pull `ROUTE-REPIN-ONT-doc-search-20260930.json` | The publisher's own search response, which does carry the consolidation text |
| Ontario e-Laws version list for `statute/02l24` | `ONT-02l24-act-versions.json`; re-pull `ROUTE-REPIN-ONT-act-versions-20260930.json` | The publisher's version list — 34 versions, current version from 4 December 2024 |
| Nova Scotia Office of the Registrar of Regulations home page | `NS-registrar-regulations-rg2-home.html`; re-pull `ROUTE-REPIN-NS-rg2-index-20260930.html` | The Home page, which carries the "website structure has changed for the Royal Gazette Part II" notice (§ 13.12) |
| The address that notice names, `novascotia.ca/just/regulations/rg2.htm` | re-pull `ROUTE-REPIN-NS-rg2htm-20260930.html` | The Royal Gazette Part II landing page — a different page from the notice, and not a notice of its own (§ 13.12) |
| Nova Scotia Royal Gazette Part II issues index | `NS-royal-gazette-part-II-issues-index.html`; re-pull `ROUTE-REPIN-NS-rg2issues-20260930.html`; and, through its document-relative links `rg2/2015/au0715.pdf` and `rg2/2015/se0415.pdf`, the two gazette issues and their text extractions | One row per issue: "Issue No. 16 August 7 N.S. Reg. 280/2015 – 292/2015" and "Issue No. 18 September 4 N.S. Reg. 302/2015 – 311/2015" are the rows that carry the two links |
| Nova Scotia Royal Gazette Part I issues index | `NS-royal-gazette-part-I-issues-index.html`; re-pull `ROUTE-REPIN-NS-rg1issues-20260930.html`; and, through its volume-index link `rg1/RG1-2015-Index.pdf`, the 2015 index PDF and its text extraction | Volume-level index rows, of which "Volume 224 (2015)" is the year H needed |
| `nslegislature.ca` proclamations of Nova Scotia statutes page | `NS-legislature-proclamations-of-nova-scotia-statutes.html` | The publisher's own commencement listing, which is the evidence § 13.5 rests on |

**All eight routes are the publishing government's own services.** No route in H is a paywalled database, a
commercial aggregator, a secondary summary or a third-party repost; the retrieval method for each is an ordinary
unauthenticated HTTP request, and every file is stored exactly as delivered.

**Custody classes, stated once so the inventory can be read at a glance.**

- **(a) Published documents bearing on a target (6 files).** Two Part II gazette issues and the Part I 2015 index
  (published gazette documents, each searched by keyword with the nil result recorded in § 13.6), the e-Laws search
  response and version list (which carry Ontario's consolidation text and its publication history), and the
  Legislature's own proclamations page.
- **(b) Route evidence (15 files).** Files served by the publisher that locate text but do not themselves decide
  anything: the e-Laws shell and its application bundle, the registrar's Home page, the two gazette issue indexes,
  and the ten files of the re-pull pass.
- **(c) Local derivatives (8 files).** Text extracted locally from files held, named so that no derivative can be
  mistaken for a publication: the three gazette extractions, the e-Laws consolidation extraction, and the four
  page-pinned `VER-` extracts.

**Inventory — every H file, its size, its digest and its custody class.** Sizes are the bytes on disk as stored;
each digest is the SHA-256 of that file as stored, computed in this phase.

**(a) Published documents bearing on a target (6 files).**

| File | Bytes | SHA-256 | Bearing, and where used |
| --- | ---: | --- | --- |
| `ONT-02l24-doc-search.json` | 78,439 | `395196A1ECF28E9EA58F926A6666D798BA5950701E2B5452D45D50DFB3F5C472` | publisher's search response carrying the consolidation text of the Limitations Act, 2002 — § 13.5 |
| `ONT-02l24-act-versions.json` | 13,553 | `81A392706D8D16553C79DD8B37FA7F8D23DC64DF08C1CEC4C02142AE34FED3F0` | publisher's version list for `statute/02l24` (34 versions; current from 2024-12-04) — § 13.5 |
| `NS-legislature-proclamations-of-nova-scotia-statutes.html` | 343,353 | `01980C5D0F9D38434554B3789AA92C3BC501AAE661E9DDFB51CD6A6B4700D631` | the Legislature's own proclamations page — § 13.6, Evidence 2 |
| `NS-royal-gazette-partII-2015-08-07.pdf` | 493,224 | `3554B66A52FD7CA2534E6937DA76C59A847C46184D7FA5FFA7080D32CA48722B` | Royal Gazette Part II, issue of 7 August 2015 — searched, nil result — § 13.6 |
| `NS-royal-gazette-partII-2015-09-04.pdf` | 3,534,856 | `D675C7CDA6204CC96F8B8BA9F40C033917F8CB9D910EE2E652903D65904AEACE` | Royal Gazette Part II, issue of 4 September 2015 — searched, nil result — § 13.6 |
| `NS-royal-gazette-partI-2015-index.pdf` | 935,127 | `98521E9961BAEC87D97E65EB2FBF1A0749C2EF709AC79CB6B518BEBBD72125C5` | "Index of Advertisements for the Royal Gazette Part I, Volume 224, 2015" — searched, nil result — § 13.6 |
| *Subtotal* | *5,398,552* | | |

**(b) Route evidence (15 files).**

| File | Bytes | SHA-256 | Role |
| --- | ---: | --- | --- |
| `ONT-limitations-act-2002.html` | 54,243 | `3F7B30261ACB525BFEBD99FAE6C97CD17C46C6AD2F7EF4BE55A4C35E9C18242A` | e-Laws statute page as delivered — application shell, no statute text — § 13.5 |
| `ONT-elaws-main-js-route-probe.js` | 1,680,682 | `DD6B253CA444521CE449E417D83E22F2435A8A28D586FC3008065EE6ACAE6ED0` | the bundle that shell loads; carries no statute text — § 13.5 |
| `NS-registrar-regulations-rg2-home.html` | 9,589 | `19661048AE318CCA9AF9102B4CF2F46379C9430BB8E86CA3691E6EBAD382319E` | Registrar of Regulations Home page, carrying the structure-change notice — §§ 13.6, 13.12 |
| `NS-royal-gazette-part-I-issues-index.html` | 128,827 | `C05DE83113A4FDD50C9A237BA0872F11C3C11C684C3DA4DA667994757A4CCE7B` | Part I issues index; route to the 2015 index PDF — § 13.6 |
| `NS-royal-gazette-part-II-issues-index.html` | 117,298 | `E32261186F059A8901A508F3413807776C072DE47DB791CE51ACFA5022E79F6E` | Part II issues index; route to the two 2015 Part II issues — § 13.6 |
| `ROUTE-REPIN-ONT-statute-page-20260930.html` | 54,243 | `1780A008871EB7A9972977D127A62B1B7825986C7DFA62B64694B17154D7A94C` | re-pull of the e-Laws statute page — § 13.12 |
| `ROUTE-REPIN-ONT-doc-search-20260930.json` | 78,439 | `395196A1ECF28E9EA58F926A6666D798BA5950701E2B5452D45D50DFB3F5C472` | re-pull of the e-Laws search response — byte-identical to the file it repeats — § 13.12 |
| `ROUTE-REPIN-ONT-act-versions-20260930.json` | 13,553 | `7E93BC5B684FDB5C433F69C7D962C2681C095E50B6BB9D334AF9C3CA90A9E381` | re-pull of the version list — § 13.12 |
| `ROUTE-REPIN-NS-rg1issues-20260930.html` | 128,827 | `C05DE83113A4FDD50C9A237BA0872F11C3C11C684C3DA4DA667994757A4CCE7B` | re-pull of the Part I issues index — byte-identical — § 13.12 |
| `ROUTE-REPIN-NS-RG1-2015-Index-20260930.pdf` | 935,127 | `98521E9961BAEC87D97E65EB2FBF1A0749C2EF709AC79CB6B518BEBBD72125C5` | re-pull of the 2015 Part I index PDF — byte-identical — § 13.12 |
| `ROUTE-REPIN-NS-rg2issues-20260930.html` | 116,566 | `CD1623723AFD091A81C4D88E06118438F627005B917172F8F42D77340278A8D2` | re-pull of the Part II issues index — same characters, vendor bytes stored raw — § 13.12 |
| `ROUTE-REPIN-NS-rg2-index-20260930.html` | 9,585 | `72BCC03B89897B61462AAD8F8E3C2A46291CAF96C8CD9173B11F05E2C0F5927E` | re-pull of the Registrar's Home page — same characters, vendor bytes stored raw — § 13.12 |
| `ROUTE-REPIN-NS-rg2htm-20260930.html` | 10,480 | `FA0DDCE96C5D4739E9D4D06491A0BC984E13947D6ABE62177E1D3BC75E08E872` | re-pull of the address the notice names — the Part II page — § 13.12 |
| `ROUTE-REPIN-NS-rg2-au0715-20260930.pdf` | 493,224 | `3554B66A52FD7CA2534E6937DA76C59A847C46184D7FA5FFA7080D32CA48722B` | re-pull of the 7 August 2015 Part II issue — byte-identical — § 13.12 |
| `ROUTE-REPIN-NS-rg2-se0415-20260930.pdf` | 3,534,856 | `D675C7CDA6204CC96F8B8BA9F40C033917F8CB9D910EE2E652903D65904AEACE` | re-pull of the 4 September 2015 Part II issue — byte-identical — § 13.12 |

**(c) Local derivatives (8 files).**

| File | Bytes | SHA-256 | Extracted from, and where used |
| --- | ---: | --- | --- |
| `ONT-02l24-consolidated-text-derivative.txt` | 38,433 | `1AE13009495B506C394B03943ABD8EA57BEE0D188ACB6F496DCC3E118ACED9EA` | the `content` field of `ONT-02l24-doc-search.json` (892 lines) — § 13.5 |
| `NS-royal-gazette-partI-2015-index.txt` | 313,226 | `546D84650633C35636AB868D509389F991900E9877B87CC846CC9C25EE0CF9DC` | the Part I 2015 index PDF — § 13.6 |
| `NS-royal-gazette-partII-2015-08-07.txt` | 51,630 | `57BD03C1C28526EEB0A0801301E28942B8D607EA375D9A45A6E3B15E14105480` | the 7 August 2015 Part II issue — § 13.6 |
| `NS-royal-gazette-partII-2015-09-04.txt` | 46,042 | `7EBF6DB86F54E4294230E7B9777DB92FE579C256BB1A3D2CBA860A99E32F8946` | the 4 September 2015 Part II issue — § 13.6 |
| `VER-MB-L150-pages7-9-extract.txt` | 13,176 | `BD11CE621011E000C4E2D582856F284DE09CF447C9D675399356D89FF3908AE3` | page-pinned extract from `MB-limitations-act-ccsm-l150.pdf` (printed folios 3–5) — § 13.7 |
| `VER-NWT-p4-extract.txt` | 7,262 | `31F1EBAF986A713C438E8C0479B6C61545DEB7D257EB8B0E343FE13D347F81D0` | page-pinned extract from `NWT-limitation-of-actions.pdf` (printed folio 3) — § 13.7 |
| `VER-NS-LAA-pages11-13-extract.txt` | 2,562 | `9D140EEC2DBEDC001E41A78E1917A7B61933976B49E0D83067BC0E563A40729E` | page-pinned extract from `NS-limitation-of-actions.pdf` (printed folios 9–10) — § 13.8 |
| `VER-NS-LAA-p6-extract.txt` | 3,129 | `EB57D76909E6886D2B22545430279A383D29C8F55ABD0B7750DDF7F09BEBEE3A` | page-pinned extract from the same PDF (its page 6: the closing limbs of s. 10 and s. 11), made with the extract above |
| *Subtotal* | *475,460* | | |

**Identity and duplicate groups.** Five files are byte-for-byte repeats of five others, each a re-pull of the route
that first produced the file it repeats: `ONT-02l24-doc-search.json` = `ROUTE-REPIN-ONT-doc-search-20260930.json`
(78,439; `395196A1…`); `NS-royal-gazette-part-I-issues-index.html` =
`ROUTE-REPIN-NS-rg1issues-20260930.html` (128,827; `C05DE831…`); `NS-royal-gazette-partI-2015-index.pdf` =
`ROUTE-REPIN-NS-RG1-2015-Index-20260930.pdf` (935,127; `98521E99…`); `NS-royal-gazette-partII-2015-08-07.pdf` =
`ROUTE-REPIN-NS-rg2-au0715-20260930.pdf` (493,224; `3554B66A…`); and `NS-royal-gazette-partII-2015-09-04.pdf` =
`ROUTE-REPIN-NS-rg2-se0415-20260930.pdf` (3,534,856; `D675C7CD…`). The directory therefore holds **24 distinct
digests across 29 files**, and no two files with different names hold the same content by accident: the five
repeats are deliberate re-pulls, counted once each, and no other two documents share a digest.

**Reused `PHASE5-001G` evidence, re-hashed and re-read in this phase.** These eight files are not in the H
directory; they are held from G, were re-measured here, and their digests are unchanged. They are counted as
**reused G evidence, not new unique authority** (§ 13.4.3), and they keep their original retrieval provenance.

| G file | Bytes | SHA-256 | Today's review |
| --- | ---: | --- | --- |
| `NS-consumer-reporting.pdf` | 351,156 | `5AD228066B3281E1702C2C63DA012C28128D444B8D528069075DC65939445500` | equals Admission Contract §2 pin `historical-ns-cra-source-5ad22806.pdf`; printed pages re-read — § 13.4.3 |
| `NS-consumer-reporting.txt` | 46,081 | `C7EB74B9D9BE0104709200E283010225F52951F88EFBD6C0D5F8DBCB6641DDEA` | title page and running header re-read — § 13.4.3 |
| `NS-limitation-of-actions.pdf` | 215,628 | `1C2253D9EAFF51F81A2B678774D983B1756709A37AEAAA3D95FC463CA6B847FD` | equals Admission Contract §2 pin `ns-limitation-of-actions-source-1c2253d9.pdf`; re-read page-pinned — § 13.8 |
| `NS-limitation-of-actions.txt` | 29,320 | `E0A354F425240928480117E129D51FB07063A0508B94A8E34BF8FBD1D2309DF3` | the commencement annotation located at its lines 499–500 — § 13.8 |
| `MB-limitations-act-ccsm-l150.pdf` | 408,047 | `0B9FE7C0096E3C7370D3307EAF8BAEB0F2274327BCD2EC9A6285D565FD304805` | source of the § 13.7 page-pinned extract |
| `MB-limitations-act-ccsm-l150.txt` | 108,401 | `6C2B1B0E2ACD50ECDA6F00511578CD2101AB397E1C1E376A9807020E6F953423` | read for printed folios 3–5 — § 13.7 |
| `NWT-limitation-of-actions.pdf` | 89,694 | `FF670BBE4FC226845647142540BAAA48D728C28B8B6571E280B14AD0B72EA1F4` | source of the § 13.7 page-pinned extract |
| `NWT-limitation-of-actions.txt` | 145,114 | `98EB33EB753747556D844D4526D9E831C8D8EA38D0FC1724B381027A30407083` | read for printed folio 3 — § 13.7 |

**Two further reused sets, measured here and unchanged.** The Massachusetts pair, held in G as
`MA-1995-acts-0125.pdf` and `MA-1995-acts-0125.txt` and named `1995acts0125.pdf` / `.txt` in § 13.4.5,
re-measures at 348,019 bytes (`EC152115EB8D582480C1DAF1399BB7468A1EF3A1707CBCA0BD236E6E36E54FCE`) and 30,828 bytes
(`FD0F5F52669B1EDDD6537C21BB0D246F5B93D5C90B027F1E28A54C179557A3A1`), matching the sizes recorded there. The two
Ontario Consumer Reporting Act pins of § 13.4.1 were **not** re-downloaded in this phase and their digests stand as
recorded.

**Timestamps as the file system records them.** Creation and last-write times for the 29 H files run from
**2026-09-30 08:11:26** (the e-Laws statute page) through the four page-pinned extracts at **08:48:18–08:48:30** and
the re-pull pass at **08:50:05–08:51:23**, ending with the two Part II index re-pulls. These are the values the
operating system recorded for the writes; the machine's offset from UTC was not separately captured for this batch,
so they fix the order of capture rather than an absolute instant, and no file's timestamp is offered as evidence of
anything other than when it was written.

**Totals.**

| Custody class | Files | Bytes |
| --- | ---: | ---: |
| (a) published documents bearing on a target | 6 | 5,398,552 |
| (b) route evidence | 15 | 7,365,539 |
| (c) local derivatives | 8 | 475,460 |
| **Total** | **29** | **13,239,551** |

**No new unique authority is claimed.** Two of the six class (a) documents supply publication history and
commencement status only (the e-Laws version list; the Legislature's proclamations page), and the three gazette
documents returned nil on the keyword search recorded in § 13.6. The only target text newly captured by H is
Ontario's ss. 5 and 15 with the provisions read alongside them (§ 13.5) — text only, from which no rule, period,
coverage entry or mapping follows (§ 13.10). The two Nova Scotia PDFs whose digests equal Admission Contract §2 pins
are reused and increase no count (§ 13.4.3); the eight derivatives are extractions of files already held or of H
files, so nothing is counted twice. Every one of the 29 files appears above exactly once, and the three subtotals
sum to the directory total: 5,398,552 + 7,365,539 + 475,460 = 13,239,551 bytes.

### 13.12 Route re-pull findings — what changed on re-retrieval, and what did not

**Method.** Every route recorded in § 13.11 was re-pulled in the same session, after the first pass, and each
re-pull was stored under a `ROUTE-REPIN-…-20260930` name and compared with the file it repeats: byte-for-byte first,
then character-for-character with every non-ASCII character replaced by a single placeholder, and, where the two did
differ, by locating the differing offsets and quoting the bytes on each side. The placeholder used for every collapse
reported in this section is `~` (U+007E), one placeholder per non-ASCII character, so a collapse never changes the
character count. Ten re-pull files were produced.

| Route re-pulled | Pair compared | Bytes | Result |
| --- | --- | ---: | --- |
| Ontario e-Laws document search for `statute/02l24` | `ONT-02l24-doc-search.json` / `ROUTE-REPIN-ONT-doc-search-20260930.json` | 78,439 / 78,439 | **Identical** — SHA-256 `395196A1…` on both sides |
| Ontario e-Laws version list | `ONT-02l24-act-versions.json` / `ROUTE-REPIN-ONT-act-versions-20260930.json` | 13,553 / 13,553 | **Two bytes differ, at offsets 8 and 9**: `{"took":24,…` against `{"took":36,…`. Nothing else differs at all; the field is the search engine's own elapsed-time counter, so this is one response delivered with a different timing value |
| Ontario e-Laws statute page | `ONT-limitations-act-2002.html` / `ROUTE-REPIN-ONT-statute-page-20260930.html` | 54,243 / 54,243 | **62 bytes between offsets 51,324 and 51,426**, all inside `<script>var __uzdbm_1 = "…";var __uzdbm_2 = "…";`; no other byte of the page differs — detail below |
| Nova Scotia Part I issues index | `NS-royal-gazette-part-I-issues-index.html` / `ROUTE-REPIN-NS-rg1issues-20260930.html` | 128,827 / 128,827 | **Identical** — SHA-256 `C05DE831…` on both sides |
| Nova Scotia Part I 2015 index PDF | `NS-royal-gazette-partI-2015-index.pdf` / `ROUTE-REPIN-NS-RG1-2015-Index-20260930.pdf` | 935,127 / 935,127 | **Identical** — SHA-256 `98521E99…` on both sides |
| Nova Scotia Part II issue of 7 August 2015 | `NS-royal-gazette-partII-2015-08-07.pdf` / `ROUTE-REPIN-NS-rg2-au0715-20260930.pdf` | 493,224 / 493,224 | **Identical** — SHA-256 `3554B66A…` on both sides |
| Nova Scotia Part II issue of 4 September 2015 | `NS-royal-gazette-partII-2015-09-04.pdf` / `ROUTE-REPIN-NS-rg2-se0415-20260930.pdf` | 3,534,856 / 3,534,856 | **Identical** — SHA-256 `D675C7CD…` on both sides |
| Nova Scotia Part II issues index | `NS-royal-gazette-part-II-issues-index.html` / `ROUTE-REPIN-NS-rg2issues-20260930.html` | 117,298 / 116,566 | **Same document, different transport encoding** — detail below |
| Registrar of Regulations Home page | `NS-registrar-regulations-rg2-home.html` / `ROUTE-REPIN-NS-rg2-index-20260930.html` | 9,589 / 9,585 | **Same page, different transport encoding** — detail below |
| The address the structure-change notice names | `ROUTE-REPIN-NS-rg2htm-20260930.html`, against the Home page held from the first pass | 10,480 | **A different page** from the one the first pass recorded under that route — detail below |

**The Ontario statute page: 62 differing bytes, all of them session tokens.** The two deliveries of the page are the
same length (54,243 bytes) and agree everywhere except two strings inside an inline script:
`var __uzdbm_1 = "39579f25-168c-4dc2-991c-1234ff45aaca";var __uzdbm_2 = "MGEyMmQ3Y2MtZHB4cS00ZGU4LTgyNjctYTYwOTcwMjRmNzhiJDE0Mi4xNjMuODYuMTM5"` in the first
capture against `var __uzdbm_1 = "1a0e70c0-2e52-46c2-8612-ad0416f828c6";var __uzdbm_2 = "ZjFlYjllZmUtZHB4cS00ODRlLTkxMmMtNzM4ZGY5YTFhMDQ0JDE0Mi4xNjMuODYuMTM5"` in
the re-pull. Both values are per-session anti-automation tokens; both end in the same base64 tail
`JDE0Mi4xNjMuODYuMTM5`, which decodes to the address string `$142.163.86.139`. Every other element of the page —
title, asset references (`main.dbd400db.js`, `main.3a4b1b30.css`), the estate-wide scripts and the entire markup
outside that script — is identical. The re-pull therefore confirms § 13.5's reading rather than qualifying it: the
delivered page is a client-side shell, it is the same shell, and the tokens it rotates are session machinery that
carries no statute text.

**The two encoding-only differences: 732 characters, and four.** In the Part II issues index, both copies contain
the same **116,566 characters**: the first pass stores 732 non-ASCII characters as UTF-8 (728 × U+0096, one ©, three
ç, giving 1,464 high bytes) while the re-pull stores the same 732 characters as the vendor's single ISO-8859-1
bytes (728 × 0x96, one 0xA9, three 0xE7, giving 732 high bytes, which read as UTF-8 appear as 732 replacement
characters). One further check settles it: decoding the first copy as UTF-8 and the re-pull as ISO-8859-1 makes the
two character sequences **identical** — 116,566 characters each, with no character differing — and with every
non-ASCII character collapsed to the placeholder `~` (U+007E) the two files are **equal character for
character**, the collapsed text being 116,566 characters with SHA-256
`057C53B899B35C2E702E4F3922CD5E96A56D0162FEDADFBD3C8452B34F54F7A3`. The Registrar's Home page differs the same
way and no other way: four non-ASCII characters (one ©, three ç), 8 high bytes in the first file against 4 in the
re-pull, and, decoded as UTF-8 and ISO-8859-1 respectively, the two deliveries are equal on the same placeholder at
**9,585 collapsed characters**, hashing to
`3D17391343F58EEF1D414358CB54CB35208243F08F0E308B2B21B812DA006AB8`. The route re-pull therefore reproduces these
two pages exactly; what differs is which byte encoding the store happened to write, and the affected characters are
punctuation — including the separator glyph used between regulation numbers — not text.

**The 2015 rows the two gazette retrievals rest on, verified in both copies.** In each copy of the Part II issues
index the row carrying `rg2/2015/au0715.pdf` reads "Issue No. 16 August 7 N.S. Reg. 280/2015 – 292/2015" and the row
carrying `rg2/2015/se0415.pdf` reads "Issue No. 18 September 4 N.S. Reg. 302/2015 – 311/2015" (the dash between the
two regulation numbers is one of the non-ASCII characters described immediately above). Both linked documents were
retrieved, and both are byte-identical to what the first pass already held, so index and document agree between
passes.

**The structure-change notice: held, and not recovered from the address it names.** The file the first pass recorded
from the Registrar's Home page route carries, in its footer navigation, the notice "Please note, the website
structure has changed for the Royal Gazette Part II. Please see https://novascotia.ca/just/regulations/rg2.htm", and
its own title is "Nova Scotia Office of the Registrar of Regulations - Home". The address that notice names was then
pulled on its own and returned a **different page**: title "Nova Scotia Office of the Registrar of Regulations -
Royal Gazette Part II", 10,480 bytes, SHA-256 `FA0DDCE9…`, which does **not** carry the notice. Three things are
recorded and nothing more: (i) the notice is **held**, verbatim, in the file listed in §§ 13.6 and 13.11, and its
re-pull is identical to it but for the four characters described above; (ii) the notice was **not recovered** at the
address it names, and this register does not claim the notice is still displayed there; and (iii) what the retrieval
actually needed — the Part II issue index, its links to the 2015 issues, and the three gazette documents — was
delivered unchanged, so § 13.6's null result stands exactly as recorded.

**Not re-pulled, and declared as such.** Two recorded routes were not re-pulled: the Legislature's proclamations
page and the e-Laws application bundle. No re-pull file exists for either, their single captures stand as listed in
§ 13.11, and nothing in this section is a statement about their stability.

**Nothing in this section changes a finding.** No difference found on re-retrieval touches a byte H relies on: the
two Ontario files that differ supply a timing counter and session tokens and no text; the two Nova Scotia pages that
differ are character-identical to their re-pulls; and every document whose text is quoted in §§ 13.5 to 13.8 was
either byte-identical on re-pull, or is held once and not re-pulled at all. No disposition, refusal, date, quotation
or count in this appendix moves because of a re-pull.

### 13.13 The remaining jurisdiction and source queue after H

**What this section is.** § 12.9 left a list of passages still inaccessible, and § 12.8 left ten decisions that only
the owner can take. H closed some of that list, moved one item without closing it, and touched nothing else. This
section states the post-H position of each item so that the queue cannot be read as shorter, or longer, than it is.

| # | Queue item, as § 12.8 / § 12.9 recorded it | State after H |
| --- | --- | --- |
| 1 | Compilation `C2026C00227` — exact text unretrievable (publisher's file-delivery path returns the application shell) | **Unchanged.** Not attempted in H; the blocker stands as recorded |
| 2 | California's 30 September 1996 baseline text and Massachusetts' 1994 Official Edition text of G.L. c. 93 § 52 | **Advanced, not closed** — § 13.4.5 states the baseline as a route definition, records that the 1996 session-law sweep was **not** performed, and leaves the baseline text uncaptured |
| 3 | Ontario `Limitations Act, 2002` ss. 5 and 15 (reachable publisher, target not reached) | **Closed as to source text** (§ 13.5). What remains is the commencement instrument (`2004-01-01` stays recorded-as-supplied) and the Act's outward references, which H did not follow |
| 4 | Nova Scotia's `2015-06-01` in-force date, not stated by the captured source | **Closed as an evidence question, and reversed** — two independent official statements give proclaimed 4 August 2015, in force 1 September 2015 (§ 13.6); the corrected date is recorded at register level in § 13.9.2, while the §2 line 64 record stays byte-preserved as owner-supplied (§ 13.10) |
| 5 | Prince Edward Island's Consumer Reporting Act and its chapter number (`c. C-18` against `c. C-20`) | **Unchanged.** No Prince Edward Island retrieval in H; the conflict stays open |
| 6 | Western Australia's Limitation Act 2005 — address not located | **Unchanged.** No H retrieval; `AU-*` remains an unresolved source descriptor (§ 13.4.7 item 6) |
| 7 | Saskatchewan (application shell); Yukon, Nunavut and South Australia (HTTP 403) | **Unchanged.** No H retrieval for any of the four |
| 8 | Current-edition United States Code text of 15 U.S.C. 1681c and 1681s-2 | **Unchanged.** Only Edition-specific granules are held; H did not attempt the current edition |
| 9 | Manitoba `The Personal Investigations Act, C.C.S.M. c. P34, s. 9(3)` and Québec Civil Code art. 30 — reporting-retention bases | **Unchanged and expressly not researched** (§ 13.4.2); the owner-supplied periods stay unadopted |
| 10 | § 12.9's "Partial" list (Northwest Territories s. 2(2); Manitoba s. 10(2)(a); Québec's conversion limit) | **Corrected by § 13.4.4** — the first two are complete, Québec's entry stays because it records a conversion limit, and Nova Scotia's transitional s. 23 remains complete |
| 11 | Authorisation for the separate catalogue amendment (owner decision 9) | **Still required.** H's proposals are stated in §§ 13.9.2 and 13.9.3 and marked **unapplied** (§ 13.10) |
| 12 | Evidence-store retention (owner decision 10) | **Extended; the decision is unchanged.** The H directory (29 files, 13,239,551 bytes) joins the store recorded at § 12.7, and where the store is kept remains housekeeping |
| 13 | Nova Scotia gazette notice of the 2015 proclamation (not on § 12.9's list; produced by H) | **Recorded as a null result** (§ 13.6). The two issue indexes and the 2015 Part I index and Part II issues were searched and are held; the nil result is not evidence that no notice exists, and no further retrieval of the same routes is proposed |
| 14 | Nova Scotia's transitional provision, s. 23 (computable once commencement is fixed) | **Not computed, by design** (§ 13.6). Fixing commencement makes such a computation possible; H performs none and enters no transitional rule, so computing one would be a new and separate decision |

**What H did not do to the queue, said plainly.** It added no jurisdiction to the set. It did not retrieve
Saskatchewan, Yukon, Nunavut, South Australia, Western Australia, Prince Edward Island or compilation
`C2026C00227`, did not attempt the current-edition United States Code text or the historical California and
Massachusetts baselines, and did not research the two reporting-retention bases. The queue after H is therefore:
items 1, 2, 5, 6, 7, 8 and 9 as they stood, item 3 closed as to text, item 4 closed by correction, items 11 and 12
pending the owner, and items 13 and 14 as H's own recorded results. Nothing was dropped, and nothing is described as
complete that is not complete.

### 13.14 Closing statement — the state in which PHASE5-001H leaves this register

**No determination moved, and nothing was closed by assertion.** `PHASE5-001H` moved one axis — source-text
completion — and only for the targets H order §3 names (§ 13.10). It changed no disposition; entered no rule, no
limitation or reporting-retention period and no deadline; created no governed legal coverage entry, no jurisdiction
mapping, no candidate, no consumer finding and no legal admission; wrote no byte of the catalogue; and left §§ 1 to
12 of this register byte-for-byte as it found them, which the region measurement in § 13.10 verifies rather than
asserts. Two earlier statements of this register that H found to be wrong — the negative commencement sentence in
§ 12.5 D and the description errors dealt with in § 13.9 — are corrected inside § 13, without rewriting the rows in
which they stand.

**The twenty-one IDs, carried forward whole, none dropped and none indexed twice.** Each entry below keeps the
record type, the catalogue status and the disposition it carried under `PHASE5-001C` and `PHASE5-001D`. The fourth
column states what H did with it, and in every one of the twenty-one cases the disposition itself is unchanged.

| ID | Record type | Status carried forward unchanged | What H did |
| --- | --- | --- | --- |
| `CRP-LSRC-0075` | `GAP` | `GAP_CLOSED_SCOPE_DECISION` | Not targeted; no CFPB or FTC material retrieved, and none admitted |
| `CRP-LSRC-0076` | `GAP` | `GAP_OPEN — DISPOSITION RECORDED` | Not targeted; the Equifax-guidance fallback stays unadopted |
| `CRP-LSRC-0077` | `GAP` | `GAP_OPEN — DISPOSITION RECORDED` | Not targeted; the all-states baseline matrix stays unadopted |
| `CRP-LSRC-0078` | `GAP` | `GAP_OPEN — WILDCARD UNRESOLVED` | Not targeted; `US-*` still identifies no unit, and the session route stays unadopted |
| `CRP-LSRC-0310` | `GAP` | `GAP_CLOSED_SCOPE_DECISION` | Not targeted; no DFPI guidance or Witkin treatise retrieved or admitted |
| `CRP-LSRC-0311` | `GAP` | `GAP_CLOSED_SCOPE_DECISION` | Not targeted; no NYDFS guidance or McKinney's commentary retrieved or admitted |
| `CRP-LSRC-0312` | `GAP` | `GAP_CLOSED_SCOPE_DECISION` | Not targeted; no Attorney-General opinion or compliance manual retrieved or admitted |
| `CRP-LSRC-0321` | `GAP` | `GAP_PARTIALLY_RESOLVED — RELATIONSHIP RECORDED; CONFLICT LIMB OPEN` | Not targeted by H; the conflict limb and the shortest-window proposal stay as recorded |
| `CRP-LSRC-0322` | `GAP` | `GAP_PARTIALLY_RESOLVED — STATUTORY BASIS IDENTIFIED (UNRETRIEVED)` | Description reconciled: Nova Scotia's base corrected at register level to `c. 93, s. 10(3)` (§§ 13.4.3, 13.9.1, 13.9.3); Manitoba `c. P34` and Québec art. 30 preserved as separate unresolved targets; evidence for `c. C-18`/`c. C-20` is **nil** and that conflict stays open (§ 13.9.4 item 1) |
| `CRP-LSRC-0323` | `GAP` | `GAP_CLOSED_SCOPE_DECISION — EXCLUSION GROUNDED (UNRETRIEVED)` | Description reconciled: the same Nova Scotia chapter correction; the deliberate non-entry of all four regimes is retained; evidence for the chapter conflict is **nil** |
| `CRP-LSRC-0324` | `GAP` | `GAP_CLOSED_SCOPE_DECISION — OUT OF SCOPE FOR REPORT-ONLY FINDINGS` | Description reconciled: the "within a reasonable time" wording is attributed to the Ontario Consumer Reporting Act `s. 13(1)`, not to the Limitations Act, 2002 `s. 13` (§ 13.4.1); no new capture entering this ID (§ 13.9.1) |
| `CRP-LSRC-0325` | `GAP` | `GAP_OPEN — WILDCARD UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Source-text complete for the two named passages and for Manitoba ss. 6 and 10 in full context (§ 13.7): § 12.9's "Partial" entries are superseded, and `CA-*` remains unresolved |
| `CRP-LSRC-0395` | `REFUSAL` | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | Commencement evidenced from two independent official statements — proclaimed `2015-08-04`, in force `2015-09-01` (§ 13.6); the owner-supplied `2015-06-01` is corrected at register level (§ 13.9.2); the refusal is preserved |
| `CRP-LSRC-0396` | `REFUSAL` | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | ss. 5 and 15 captured with qualification from the official publisher (§ 13.5); `2004-01-01` corroborated as recorded-as-supplied and not adopted as the refusal's basis; the refusal is preserved |
| `CRP-LSRC-0397` | `REFUSAL` | `REFUSAL_RETAINED_WITH_CITATIONS_AND_RATIONALE` | Québec arts. 2898 and 2925 preserved under their own limitation purpose and source-text complete, with no expansion to the whole Civil Code and no reporting-retention rule (§ 13.8); the refusal is preserved |
| `CRP-LSRC-0398` | `GAP` | `GAP_CLOSED_RELATIONSHIP_DECISION — NO DUPLICATE RULE` | Not targeted; no duplicate or overlapping rule created |
| `CRP-LSRC-0412` | `GAP` | `GAP_OPEN — COUNTRY TOKEN UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Not targeted; the bare `UK` token remains unresolved and the mapping stays unapplied |
| `CRP-LSRC-0413` | `GAP` | `GAP_OPEN — SOURCE UNVERIFIED (STATEMENTS RECORDED)` | Not targeted; the `SEARCHES` row remains unverified and the CRAIN figures stay owner-supplied |
| `CRP-LSRC-0435` | `GAP` | `GAP_OPEN — WILDCARD UNRESOLVED (MAPPING RECORDED SEPARATELY)` | Not targeted; `AU-*` remains unresolved and no Western Australian address was located |
| `CRP-LSRC-0436` | `GAP` | `GAP_OPEN — PROVISIONS IDENTIFIED; OPERATIVE TEXT UNRETRIEVED` | Not targeted; the "typically 30 days" figure stays a qualified statement and no deadline is entered |
| `CRP-LSRC-0437` | `GAP` | `GAP_OPEN — PROVISIONS IDENTIFIED; CODE TEXT UNRETRIEVED` | Not targeted; no Code provision is admitted and no dispute workflow is created |

That index is the same set, the same order and the same statuses as the per-ID index in § 7.4 and the disposition
groups in § 4: eighteen `GAP` rows and three `REFUSAL` rows, twenty-one in all, each appearing once.

**Nothing in H is evidence of a rule, and no H capture is admitted.** Every H file is either a published document
that bears on a target without being converted into one, a page that shows only where a document lives, or an
extraction of a file already held (§ 13.11). No H capture was admitted under the Legacy Legal Corpus Admission
Contract, whose pins of § 13.4.3, 13.4.4 and 13.11 this phase leaves untouched. Nothing in this appendix may be read
as a limitation or reporting-retention period, a deadline, a governed legal coverage entry, a jurisdiction mapping, a
candidate, a consumer finding or a legal admission; no rule was added to any layer; and no runtime behaviour,
evaluator or consumer-facing output was created or authorised. The queue in § 13.13 remains the register's complete
statement of what is outstanding, and the twenty-one rows above remain its complete disposition record.

Register SHA-256 at completion of `PHASE5-001H`: `AA3FD4D4D7323E1C6E8E9CA27132AADA88CCCFB64F0FA94A42BC4D6CB7982E7C`

Digest method for the PHASE5-001H value: it covers every line of this register up to and including the last blank
line that precedes this digest line — that is all of §§ 1 to 12 as this phase found them, the whole of § 13, and the
introductory lines of this closing statement — and it deliberately excludes this digest line, the blank line after it
and this note, which keeps the value stable and non-circular. To verify, delete everything from the start of this
digest line to the end of the file, then hash the remainder as UTF-8 without a BOM with CRLF line endings: `3326`
lines and `388,458` bytes. That region is lines 1 to 3,326 of the file as it now stands — everything through the
blank line immediately before this digest line — and the value was taken after the last write of this phase, so no
later edit of this closing statement can be hidden behind it.

**The earlier boundaries, re-measured against this file as it now stands.** Every value below was recomputed from
the present bytes rather than copied from earlier notes, and every one holds: deleting from the start of the
`PHASE5-001F` digest line to the end of the file reproduces that phase's 1,448-line, 192,458-byte region, hashing to
`0A610719E21BF5B6EB58BA6D08A71496FBD59D53EBAD52CD5B592DD04F95BC6D`, the value that line records; deleting from
the start of the `PHASE5-001G` digest line to the end of the file reproduces that phase's 2,207-line, 275,511-byte
region, hashing to `FC14FB30A7CA274E4D9340348CC84F01D05FA04E083B6699470B30CCFB41B0C0`, the value that line records;
and the §§ 1–12 region that § 13.10 measures — line 1 of this file through the blank line before the § 13 heading,
this file's line 2,219 — is still 2,219 lines and 276,556 bytes and still hashes to
`3790E4EEC5F6EC13F6A5882AB6A7C4B43E4023A2653442CF60EF4BBFDEABBA15`. That third value is reproduced on the boundary
§ 13.10 itself names, because § 13.10 records it as a sentence inside a paragraph rather than as the start of a line,
so it is reached by taking lines 1 to 2,219 and not by a line-start deletion; the two values that are also digest
lines are the ones the deletions above reproduce. None of the three has to be re-taken, restated or superseded, and
the `PHASE5-001C`, `PHASE5-001D` and `PHASE5-001E` values earlier in this register stand for the same reason.

**Tail.** This note, the blank line before it and the digest line above are the only parts of the file the
`PHASE5-001H` digest excludes, and the register ends with this note. No trailing content, marker, placeholder or
further digest line follows it: the drafting marker used while § 13 was being written has been removed, and the file
ends with the CRLF that closes this paragraph and nothing else. A **full-file** value is deliberately not written
into this note: a hash of the bytes that include the hash cannot be embedded without changing what it measures, so
the register's full-file SHA-256 is reported separately, in this phase's completion record, and this note claims
nothing about it.
