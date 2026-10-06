# CRP PROD-001 — Production-Readiness Audit and Implementation Plan

**Status:** Read-only audit report and plan-level recommendation — not executable authority, not a build authorization, not a governed-rule corpus  
**Plan version:** `CRP-PROD-001-READINESS-1`  
**Effective date:** 2026-09-30  
**Work order:** `CRP_PROD_001` — production-readiness audit and first-jurisdiction recommendation  
**Method:** inspection of durable artifacts already in this workspace; no network retrieval, no code change, no build, no deployment, no rule admission, no finding authorization  
**Authority created by this document:** none

This document answers one question: **which single supported jurisdiction × bureau × report presentation ×
admitted rule set combination may be implemented first?** It answers it from the governed artifacts as they
stand, and it keeps every Phase 5 exit gate in force rather than waiving any of them.

## 1. Purpose, scope, authority and method

### 1.1 Purpose

1. Determine, from durable evidence only, whether any combination of jurisdiction, bureau, report
   presentation and admitted rule set is ready to be implemented and released.
2. If none is ready, name the closest evidenced candidate and the exact blockers that stand between it and
   a buildable state.
3. Classify every material claim in this report as **verified**, **proposed**, **blocked** or **unknown**,
   so no later work order can mistake a plan statement for an admitted fact.
4. Propose the next implementation work order with exact scope and an exact permitted-file list.

### 1.2 Governing authority consulted (in rank order)

| Rank | Artifact | Role in this audit |
| --- | --- | --- |
| 1 | `CRP_CORE_CONSTITUTION.md` | Conflict format, non-finding representation, protected surfaces |
| 2 | `CRP_LEGAL_INVARIANT.md` | Findings must not be invented, labelled or presented without authorization |
| 3 | `JURISDICTION_CONTRACT.md` | Canonical `COUNTRY` + `REGION` selection boundary |
| 4 | `CRP_JURISDICTION_ENUMERATION.md` — `CRP-JURISDICTION-ENUM-1` | The closed 82-region enumeration |
| 4 | `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` | Required rule fields and the admission/change-control gate |
| 4 | `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` | What the legacy corpus may and may not contribute |
| 4 | `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` | Source-token normalization; country-wide descriptors |
| 4 | `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` | Report-representation route, candidate gate, permanent exclusions |
| 5 | `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | Phases 5.1–5.7 and Gates 5.1–5.7 |
| — | `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | Dispositions, owner rulings, retrieval evidence, authority statements |
| — | `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 437-entry source baseline and coverage counters |
| — | `CRP-DISC-002C-NY-0194.md` | The one source-discovery record present in this workspace |
| — | `CRP_PHASE5_001G_*` / `CRP_PHASE5_001H_*` work orders | Issued orders under which the latest evidence was produced |

### 1.3 Method, and what this audit deliberately did not do

- Every statement below is traceable to a named artifact, section or line, or it is explicitly classed as
  `UNKNOWN`. No claim is sourced from conversation memory, recollection or inference.
- Inspection was limited to the workspace tree: `Get-ChildItem`, targeted `Select-String`, direct file
  reads, and one read-only execution of the demo self-check `wizard-check.cjs` (result recorded at §5.4).
- This audit performed **no** official-source retrieval, **no** catalogue amendment, **no** register
  amendment, and wrote **no** file other than this one.
- This audit does not decide any preemption question, does not decide any statutory-scope question, does
  not admit any rule, does not authorize any finding class, and does not modify the legacy application.
- This audit does not unpack, modify or rely on `consumer-wizard.tar.gz`; it is treated as an artifact and
  left untouched.

## 2. Evidence base examined

### 2.1 Artifacts present in the workspace

| Artifact | Bytes | Audit use |
| --- | ---: | --- |
| `CRP_CORE_CONSTITUTION.md` | 14,820 | Rank 1 boundary for findings and consumer-facing surfaces |
| `CRP_LEGAL_INVARIANT.md` | 17,647 | Non-invention and non-presentation invariants |
| `JURISDICTION_CONTRACT.md` | 19,220 | Selection boundary for `COUNTRY` + `REGION` |
| `CRP_JURISDICTION_ENUMERATION.md` | 6,912 | 82 enumerated regions; explicit statement that it establishes no legal coverage |
| `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` | 18,608 | `ADMITTED LEGAL RULES: 0` registry block; admission gate |
| `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` | 11,092 | `ADMITTED LEGACY SOURCE ARTIFACTS: 34`; re-expressed rules `0` |
| `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` | 21,241 | 82-row source-token mapping; country-wide descriptors |
| `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` | 30,768 | Required discovery schema including `REPORT_REPRESENTATION`; expanded-scope counters at `0` |
| `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` | 18,938 | Phases 5.1–5.7, Gates 5.1–5.7, durable-artifact list, stop conditions |
| `CRP_PHASE5_001G_OFFICIAL_SOURCE_TEXT_COMPLETION_WORK_ORDER.md` | 10,199 | Issued order for the G evidence batch |
| `CRP_PHASE5_001H_EVIDENCE_RECONCILIATION_WORK_ORDER.md` | 14,552 | Issued order for the H evidence batch |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | 391,651 | Dispositions, owner rulings, retrieval ledger, authority statements |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | 445,785 | 437-entry source baseline; coverage counters |
| `CRP-DISC-002C-NY-0194.md` | 6,824 | The only source-discovery record in this workspace |
| `wizard-check.cjs` | — | Read-only self-check of the demo wizard flow |
| `consumer-wizard/` (4 files) | 19,842 | Demo UI only — see §5.4 |
| `SOURCE_CAPTURES/PHASE5-001G/` | 37 files | Legal-source captures indexed at register §12.7 |
| `SOURCE_CAPTURES/PHASE5-001H/` | 29 files | Legal-source captures indexed by register §13 |
| `consumer-wizard.tar.gz` | — | Artifact; not unpacked, not relied on |

### 2.2 Recorded digests relied on by this audit

| Artifact | Digest type | Recorded value | Where recorded |
| --- | --- | --- | --- |
| `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` | SHA-256 after PHASE5-001C amendment | `5BCC3CDE2827C33D8DE318434EA25C26B79363D63C9818A2449B5195DBCD019D` | Register §7.1; §13.1 confirms unchanged |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | SHA-256 at completion of PHASE5-001G | `FC14FB30A7CA274E4D9340348CC84F01D05FA04E083B6699470B30CCFB41B0C0` | Register §12.9 digest block (2,207 lines, 275,511 bytes) |
| `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | Measured at start of PHASE5-001H | 2,219 lines, 276,556 bytes, SHA-256 `3790E4EEC5F6EC13F6A5882AB6A7C4B43E4023A2653442CF60EF4BBFDEABBA15` | Register §13.1 |
| `gap fix.md` (owner input, outside the repository working set) | SHA-256 | `8FA1D3D92DF2166FA515B2B54E703D2772CAC225C132A32E8677A7E5BA16FC62` | Register header; §7.1 |

The catalogue digest is identical before and after the G and H phases: the catalogue was **not amended** by
either phase (register §12.7 item 2, §13.1). No artifact in this workspace carries a registry block above
zero for rules, coverage or findings.

### 2.3 Structural facts verified by inspection

- The workspace contains **no application, backend, evaluator, parser or rule-corpus source tree**: there is
  no `packages/` directory, no `rules.ny.ts`, and no `legalCorpus` path anywhere in the tree.
- The only executable content is `wizard-check.cjs` plus the `consumer-wizard/` demo bundle.
- Both `SOURCE_CAPTURES` subdirectories contain **legal-source captures only**; neither contains a consumer
  report, a report layout, a report-format specification, a field list or a parser fixture.
- No file in the workspace is named or structured as a report-representation register, a field-mapping
  register, or a candidate-to-rule-unit crosswalk.

## 3. Verified state of the governed corpus and the admitted rule set

### 3.1 The admitted-rule count is zero, in every registry that states it

| Registry | Block | Values as recorded | Location |
| --- | --- | --- | --- |
| Governed legal corpus contract | Current coverage state | `ADMITTED LEGAL RULES: 0` / `GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0` / `PERMITTED LEGAL FINDINGS: 0` | `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 |
| Global legal source catalogue | Catalogue scope | `TOTAL SOURCE ENTRIES: 437`; `ADMITTED_SOURCE_ONLY: 437`; `GOVERNED LEGAL COVERAGE: 0`; `PERMITTED LEGAL FINDINGS: 0` | `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §1 |
| Global legal source catalogue | Non-applicability | `GOVERNED LEGAL RULES: 0` / `GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0` / `PERMITTED LEGAL FINDINGS: 0` | `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §5 |
| Legacy corpus admission | Current legal-coverage state | `ADMITTED LEGACY SOURCE ARTIFACTS: 34` / `RE-EXPRESSED GOVERNED LEGAL RULES: 0` / coverage `0` / findings `0` | `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` §4 |
| Legacy source normalization | Non-applicability | coverage `0` / findings `0` | `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` §6 |
| Direct report-content expansion | Current state | `EXPANDED-SCOPE SOURCE DISCOVERIES: 0` / `EXPANDED-SCOPE GOVERNED LEGAL RULES: 0` / `EXPANDED-SCOPE GOVERNED JURISDICTIONS: 0` / `EXPANDED-SCOPE PERMITTED FINDINGS: 0` | `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §8 |
| Gap and refusal register | Authority statements | "governed legal coverage 0; permitted legal findings 0" (§1); "Governed legal coverage remains 0 and permitted legal findings remain 0" (§7.3); "Governed rules created: 0. Legal coverage created: 0. Authority to emit `VIOLATION` or `PROBABLE_VIOLATION`: none" (§12.8) | Register §1, §7.3, §8.5, §12.8 |

The consequence is stated by the contract itself, not by this audit:
`CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 — "Until a conforming legal-rule corpus is explicitly approved,
every candidate issue has no applicable governed legal rule and therefore cannot emit `VIOLATION` or
`PROBABLE_VIOLATION`."

### 3.2 Source records, provisions and rules are three different things

The register's own accounting (register §8.5) is the clearest available statement of where the corpus
actually stands, and it is preserved here unchanged:

| Measure | Count | Basis as recorded |
| --- | ---: | --- |
| Retrieval requests issued in that work order | 52 | Every HTTP request recorded, including failed and duplicate routes |
| Source records returned with provision-relevant content | 24 | Counted per successful retrieval |
| Publisher pages where the target provision was not captured | 6 | Records `N1` to `N6` |
| Blocked, not-found, binary-only, JavaScript-only or mis-resolved requests | 28 | Includes six Australian state publishers, Québec, Manitoba, Newfoundland and Labrador, New Brunswick, Prince Edward Island, Nova Scotia |
| **Unique legal provisions fully captured** | **18** | UK: Limitation Act 1980 s. 5; Prescription and Limitation (Scotland) Act 1973 s. 6; Limitation (Northern Ireland) Order 1989 art. 4; UK GDPR art. 5; Consumer Credit Act 1974 ss. 157–159. Australia: Privacy Act 1988 Sch. 1 APP 10 and APP 13. United States: 15 U.S.C. 1681t. Canada: BPCPA ss. 106–108, 110–112; Ontario Consumer Reporting Act ss. 13 and 14 |
| **Unique legal provisions partially captured** | **3** | 15 U.S.C. 1681c (subsection (c) incomplete); 15 U.S.C. 1681s-2 (subsection (a)(5) and others incomplete); BPCPA s. 109 (subsection (1)(a)–(i) incomplete) — counted `PARTIAL`, not included in the 18 |
| Entries whose disposition changed as a result | 0 | Retrievals are recorded evidence, not dispositions |
| Governed legal coverage after that work order | 0 | No rule, coverage or finding authority created |
| Permitted legal findings after that work order | 0 | Neither the catalogue nor the register can produce a `VIOLATION` or `PROBABLE_VIOLATION` |

Register §8.5 states the boundary in one line: "A source record is not a provision and a provision is not a
rule: 24 retrieved pages and 18 fully captured provisions produced no governed rule and closed no gap by
themselves."

### 3.3 What the most recent two evidence phases did and did not achieve

- PHASE5-001G completed every named **federal** provision in the twenty-one-ID set; register §12.9 reports
  "**No cohort is reported complete**".
- PHASE5-001H reconciled evidence already held and resolved no substantive gap; register §12.8 records
  governed rules created `0`, coverage `0`, findings authority `none`, wildcards resolved `0`, refusals
  closed `0`, and off-report inference `none`.
- Ten owner decisions remain genuinely required (register §12.8 items 1–10); none of them is a rule, a
  candidate or a finding.
- `US-*` and `AU-*` are recorded as **permanently non-operative wildcards** (register §12.2 items 3 and 9;
  §12.8), and the bare `UK` token remains unresolved and non-operative (register §12.2 item 8).

### 3.4 Consequence for this audit

There is exactly **one admitted rule set available for any jurisdiction, and it is empty.** No combination
in the requested four dimensions can satisfy Phase 5.7 / Gate 5.7 as it stands, and none can emit a finding
under `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7. That is a verified state of the corpus, not a judgement
about any provision's legal merit.

## 4. Verified state of jurisdiction readiness

### 4.1 The selectable population, and the non-selectable ones

| Dimension | Verified value | Source |
| --- | --- | --- |
| Canonical countries | `US`, `CA`, `GB`, `AU` | `CRP_JURISDICTION_ENUMERATION.md` §2, §4; `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` §1 |
| Canonical first-level regions | Exactly 82 — 13 `CA`, 57 `US`, 4 `GB`, 8 `AU` | `CRP_JURISDICTION_ENUMERATION.md` §2, §4 |
| Excluded deeper records | Exactly 217, all under `GB`; not aliases, not recognized jurisdictions | `CRP_JURISDICTION_ENUMERATION.md` §3 |
| Legacy source-token rows | Exactly one row per canonical region, in enumeration order | `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` §3 |
| Country-wide source descriptors assigned to no region | `US`, `US_FEDERAL`, `FEDERAL`, `CA`, `CA-FEDERAL`, `AU`, `UK` — attachable only by a later explicit governed-rule record | `CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md` §2 |
| Federal pseudo-region | None exists | Same, §2 |
| `US-UM` | No legacy source token exists and none is invented (`NO_LEGACY_SOURCE_ENTRY`) | Same, §3 |
| `CA-NS` | `SOURCE_RECORD_REFUSAL` | Same, §3 |
| Region resolved from session, account profile or off-report data | Not adopted; prohibited | Register §11.4 item 3, §12.2 item 3, §12.8 |
| Governed jurisdictions with legal coverage | **0** | `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §5; `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 |

The enumeration is explicit that it "establishes no legal rule, legal coverage, routing, consumer-selection
interface, application behavior, API, persistence design, or implementation"
(`CRP_JURISDICTION_ENUMERATION.md` §5). Every one of the 82 regions is therefore **selectable but
uncovered**.

### 4.2 Per-country readiness

| Country | Regions | Exact-region legal coverage | Verdict for a first build |
| --- | ---: | --- | --- |
| `US` | 57 | 0 regions | Only exact-state work is permissible; `US-*` is a permanently non-operative wildcard. Two states have partial research histories (`US-CA`, `US-MA`) and one has a discovery record (`US-NY`) |
| `CA` | 13 | 0 regions | Federal/provincial layering unresolved; the shortest-window conflict proposal is recorded as a proposal only and not adopted (register §2 row `CRP-LSRC-0321`) |
| `GB` | 4 | 0 regions | Four limitation provisions are recorded for `GB-ENG`, `GB-WLS`, `GB-SCT`, `GB-NIR`, but limitation provisions may not be used as a collection block and no rule was entered (register §11.4 item 8, §12.2 item 8) |
| `AU` | 8 | 0 regions | `AU-*` is a permanently non-operative wildcard; the s 20W inquiry limb and items 4–7 and 9 are `UNRESOLVED` for want of exact event/date mapping (direct-report contract §6; register §12.2 item 9) |

### 4.3 The one jurisdiction with an exact-region discovery record

`CRP-DISC-002C-NY-0194.md` names `US` / `US-NY`, cites N.Y. Gen. Bus. Law § 380-j(a)(3) with the
incorporated definition at § 380-a(v), and records `SOURCE_STATUS: PROBABLE_CANDIDATE` with an explicit
ceiling: "it is not a `PROBABLE_VIOLATION`, `VIOLATION`, or finding." Its reported provenance is a
digest-bound admitted baseline snapshot at `packages/backend/src/services/legalCorpus/rules.ny.ts`, row
`us-ny.gbl.380j.a.3.medical_debt_prohibited`, SHA-256
`201F5035084F60C92B03E0140E32702ED72E79AD2CEE31405977E05525133590`. **That artifact is not present in this
workspace**, so its digest cannot be re-verified here; see §7 (blocked claims B-1 and U-1).

## 5. Verified state of bureau and report-presentation readiness

### 5.1 What the contracts require before a presentation may be relied on

| Requirement | Exact source |
| --- | --- |
| Every discovered candidate must record an exact `REPORT_REPRESENTATION`: "Exact report field, statement, label, or omission that corresponds to the source rule." | Direct-report contract §5 field table |
| The candidate gate requires that "the source directly supports the proposed report representation", that "the representation and every legal element can be resolved from the uploaded report without inference", and that "the report contains no resolved contradiction of the representation" | Direct-report contract §6 items 2, 3, 6 |
| The uploaded report is the sole consumer-evidence source; a generic account, update, report or nearby date is not a statutory event date; a missing canonical parser field does not establish that the report lacks the information | Direct-report contract §6 owner decision on report-event dates |
| A `PROBABLE_VIOLATION` rule must "identify the exact report representation, the exact listed `DECISIVE_HISTORICAL_FACTS`, every resolved legal element, the no-contradiction condition, and the consumer-displayable source citation" | Direct-report contract §7 |
| Phase 5.3 must inventory the actual consumer-report formats/fields the application is intended to support, inspect representative layouts or authoritative format documentation, map the exact displayed statement/date to the exact legal event, and define a report-location locator surviving extraction | Phase 5 build plan §Phase 5.3 |
| **Gate 5.3:** "each proposed candidate has a verifiable report representation and exact location, or remains explicitly unresolved/excluded with a source-grounded reason. No rule enters certification merely because a field seems likely to exist." | Phase 5 build plan §Phase 5.3 |
| Durable artifact 2, which does not yet exist: "Report-representation and field-mapping register: supported report format, exact displayed field/event mapping, locations, extraction limitations, and unresolved mappings." | Phase 5 build plan §4 item 2 |

The Phase 5.3 stop condition is also in force: "report layouts do not permit reliable event/date mapping
after reasonable inspection" pauses the affected rule or cohort and requires the blocker to be recorded
(build plan §5).

### 5.2 Bureau dimension: no bureau is established by evidence

- Exact-string search of every markdown artifact in this workspace returns **25** bureau-name occurrences
  (17 in the register, 7 in the catalogue, 1 in the PHASE5-001G work order). Every one of them is a
  **legal-source or evidence-provenance** reference, not a supported report presentation.
- In particular, the Equifax reference in the register is a legal-source fallback for FCRA § 605(c) and
  § 623(a)(5) that the owner expressly directed **not to be adopted** (register §11.4 item 1, §12.2 item 1).
  Treating that reference as evidence of a supported Equifax report presentation would be an invented
  claim. It is not used that way here.
- No artifact names a bureau as the source of an inspectable consumer disclosure, and no artifact contains
  a bureau report layout, field list or report sample.

### 5.3 Presentation dimension: Gate 5.3 has not been reached

| Phase | Required outcome | Verified status |
| --- | --- | --- |
| 5.1 Freeze and reconcile the inventory | One disposition per catalogue ID, 437 reconciled | Partially evidenced: catalogue counters and per-ID dispositions exist and the register records the twenty-one reconciled IDs; no durable full-rescreen register exists in this workspace |
| 5.2 Reconcile accepted legal decisions and finish report-only dispositions | All 437 entries have a reconciled report-only disposition or a documented reason | Not evidenced in this workspace |
| 5.3 Resolve report-schema and representation questions | Representation and location for every proposed candidate, or explicit unresolved/excluded reasons | **Not started in any durable artifact**; artifact 2 of build plan §4 does not exist |
| 5.4 Select and certify rule units | Complete field-by-field rule records | **Not started** |
| 5.5 Specify deterministic report evaluation | Deterministic evaluators over resolved report facts plus admitted rules | **Not started** |
| 5.6 Validate before authorizing findings | Full fixture and negative-test suite, independent replay | **Not started** |
| 5.7 Formal owner admission and finding authorization | Owner-approved corpus amendment for units that passed Gates 5.1–5.6 | **Not reached**; Gate 5.7 requires "at least one complete rule unit [to have] been formally admitted and its evaluator [to pass] the validation suite" |

The only report-presentation statement that exists anywhere in this workspace is the **class rule**, not a
layout mapping: an explicit bureau report label or description identifying an item as medical debt
establishes the report-content representation for candidate classification, and medical debt may not be
inferred from a furnisher name, proxy, code or absent field (direct-report contract §6, PHASE4-002H for
`US-NY` § 380-j(a)(3) and PHASE4-002I-B14-R1 for `US-CA` § 1785.13(a)(7)).

### 5.4 The demo wizard is not a report presentation

`consumer-wizard/dist/app.js`, `dist/index.html` and `dist/style.css` implement a five-step interactive
demonstration. Verified by inspection:

- The generated letter is labelled `DEMONSTRATION DRAFT — fictional report; do not send` and is addressed
  to `Sample Credit Bureau` (`dist/app.js` line 5).
- The step-1 panel text begins "Start with your credit report. A production case begins with your consumer
  disclosure. Explore this vers…" — the demo explicitly separates itself from a production case
  (`dist/app.js` line 11).
- The demo contains no legal source, no citation, no rule, no finding class, no confidence value and no
  parser; it holds no jurisdiction registry beyond the selection gate it enforces. It is not a
  report-ingestion or evaluation path.
- Read-only self-check executed for this audit: `node wizard-check.cjs` → `PASS: jurisdiction, sample,
  review and approval gates; full flow; reset`, on Node v24.16.0 (Windows). This confirms the demo wiring
  only. It is not evidence of any production capability and is not a substitute for Gates 5.3–5.7.

### 5.5 Consequence for this audit

The presentation dimension is **UNKNOWN and UNMAPPED**, not merely unverified for one bureau: there is no
supported report format, no bureau layout, no field list, no locator definition and no mapping register in
the workspace. Under Gate 5.3 no rule may enter certification on a presumed field, so the presentation
dimension currently blocks every jurisdiction equally.

## 6. Readiness determination and the single recommended combination

### 6.1 Determination

**No combination of jurisdiction × bureau × report presentation × admitted rule set is ready to be
implemented.** The product cannot enter Phase 5.4 as a build, cannot pass Gate 5.7, and cannot lawfully emit
`VIOLATION` or `PROBABLE_VIOLATION` for any consumer, for four independent reasons:

1. **Admitted rule set: zero.** No conforming legal-rule corpus exists in this workspace, so
   `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 withholds every finding it would otherwise permit.
2. **Report presentation: unmapped.** Gate 5.3 has not been reached, and the durable artifact that would
   evidence it does not exist (build plan §4 item 2).
3. **Bureau: unestablished.** No bureau is named in evidence as a supported report source; the only bureau
   name in the corpus is an expressly non-adopted legal-source fallback.
4. **Rules that did get captured are largely outside the buildable class anyway.** The 18 fully captured
   provisions are predominantly limitation, retention and privacy provisions. The direct-report contract
   §4 permanently excludes limitation/retention rules whose clock needs a true external event, rules with
   off-report affirmative elements, and procedural/privacy-process rules — and the register records that no
   limitation provision may be turned into a collection block (register §11.4 item 7, §12.2 item 7).

### 6.2 Recommendation R-1 — the one combination to be worked first

Exactly one combination is recommended as the first supported target. It is recommended as the **next
target**, not as a ready product: it is the closest evidenced candidate, and it is blocked until the items
in §6.4 clear.

| Dimension | Recommended value | Basis |
| --- | --- | --- |
| **Jurisdiction** | `US` / `US-NY` | The only exact-region source-discovery record in the workspace; an exact region in the closed enumeration; no wildcard, no off-report jurisdiction inference |
| **Bureau** | `UNVERIFIED — one bureau to be fixed by Phase 5.3 evidence`, recorded as `BUREAU_PRESENTATION_UNVERIFIED` and not as a name | No bureau is evidenced (§5.2). Naming one now would invent a fact. The first bureau must be the one whose admitted, inspectable consumer disclosure carries the label in the next row; fixing it is a Phase 5.3 output, not an audit assumption |
| **Report presentation** | An explicit bureau **label or description identifying the item as medical debt**, at an exact recorded page/section/block and text span | Direct-report contract §6 class rule (PHASE4-002H); the discovery record's `REPORT_REPRESENTATION` states exactly this and prohibits inference from a furnisher/provider name, proxy or absent field |
| **Admitted rule set** | To be created: **exactly one rule unit** from one source record. As recorded by this audit: `CRP-LSRC-0194` → N.Y. Gen. Bus. Law § 380-j(a)(3), incorporating the § 380-a(v) definition, currently `PROBABLE_CANDIDATE` only with ceiling `PROBABLE_VIOLATION` at most. **OWNER DECISION PROD-003 (2026-09-30).** The owner broadened the first-unit selection: any jurisdiction and relevant statute already accepted under PHASE5-001O may be selected, on evidence, and the unresolved `US-NY` medical-debt candidate is preserved with every qualification unchanged while ceasing to be the exclusive first implementation target. No report-evidence requirement, ceiling, gate or exclusion is waived. | `CRP-DISC-002C-NY-0194.md`; catalogue entry `CRP-LSRC-0194` remains source-only; direct-report contract §6 and §7; `CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md` records the unit selected under the broadened decision |

### 6.3 Why this combination and not another

| Candidate | Why it is not R-1 |
| --- | --- |
| `US-CA`, Cal. Civ. Code § 1785.13(a)(7) | A class rule exists (PHASE4-002I-B14-R1) and the current § 1785.10/§ 1785.13 text with its amendment-history lines was captured, but **no discovery record exists in this workspace**, the 30 September 1996 baseline text and the 2002 repeal-and-re-enactment survival question remain unresolved (register §11.4 item 2), and its ceiling is likewise `PROBABLE_CANDIDATE` |
| `US-MA`, G.L. c. 93 § 52 | Recorded as date-uncertain; the publisher serves no history note, so neither the 1996 text nor the later amendment history is established (register §11.4 item 2) |
| Australia — Privacy Act 1988 (Cth) s 20W items 4–7 and 9 (`CRP-LSRC-0423`–`0425`, `0427`) and the inquiry-retention limb (`CRP-LSRC-0422`) | Each is `UNRESOLVED` until an exact report representation and field mapping are verified in which the date is explicitly the bureau's collection of the information, or the exact information-request date (direct-report contract §6 and its owner decision). No `AU-*` wildcard may resolve the region, and the operative compilation `C2026C00227` wording is still uncaptured (register §12.2 item 10) |
| `CA-NS`, Credit Reporting Act s 10(3)(c) (`CRP-LSRC-0354`) | `UNRESOLVED` until the exact last-payment presentation is verified; `CA-NS` also carries `SOURCE_RECORD_REFUSAL` in the normalization table |
| PIPEDA Schedule 1 clause 4.6 (`CRP-LSRC-0319`); omitted source/court-information limb (`CRP-LSRC-0288`) | Limb paths are permitted for research only; no discovery record, no representation mapping, no rule |
| `GB` limitation provisions (`GB-ENG`, `GB-WLS`, `GB-SCT`, `GB-NIR`) | Captured and region-attributed, but limitation rules are excluded from this build class and may not operate as a collection block (direct-report contract §4; register §11.4 item 7) |
| Country-wide descriptors (`US`, `US_FEDERAL`, `FEDERAL`, `CA`, `CA-FEDERAL`, `AU`, `UK`) | Attach to no region except by a later explicit governed-rule record; `US-*` and `AU-*` are permanently non-operative and the bare `UK` token is unresolved and non-operative |


### 6.4 Blockers that must clear before R-1 is buildable

| ID | Blocker | Clears when |
| --- | --- | --- |
| B-1 | The admitted baseline snapshot `rules.ny.ts` (SHA-256 `201F50…3590`) is not present in this workspace, so the New York rule text relied on by `CRP-DISC-002C-NY-0194` cannot be re-verified here | The snapshot is restored to the workspace, or a fresh owner-authorized source pin for § 380-j(a)(3) and § 380-a(v) is recorded |
| B-2 | No supported report presentation exists; Gate 5.3 has not been reached and artifact 2 of build plan §4 does not exist | A report-representation and field-mapping register records the exact label, its exact location and its extraction status for the first bureau |
| B-3 | The first bureau is `UNVERIFIED` | One bureau is fixed by Phase 5.3 mapping evidence, not by assumption |
| B-4 | `APPLICABILITY_STATUS` is `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` under 15 U.S.C. § 1681t(b)(1)(E), so the record "may support only a `PROBABLE_CANDIDATE`, never a `CONFIRMED_CANDIDATE` or `VIOLATION`" | The rule is admitted with an `APPLICABILITY_BASIS` quoting the recorded legal question and an `APPLICABILITY_QUALIFICATION` in plain English, keeping the ceiling at probable-only |
| B-5 | `TEMPORAL_STATUS` is `CURRENT_SOURCE_DATE_ONLY`; the historical effective period is not established and the formal edition is `NOT RECORDED` | The governed rule carries the required plain-English timing qualification; a `VIOLATION` path stays unavailable while the period is unresolved |
| B-6 | The § 380-a(v) credit-card carve-out is an express exception not established by a report | The rule records it as an `UNRESOLVED_EXCEPTION` that is non-suppressing when unknown and defeating when the report affirmatively shows it |
| B-7 | No rule unit, no deterministic evaluator and no validation suite exist | Gates 5.4, 5.5 and 5.6 pass for the single unit, with independent replay |
| B-8 | No owner-approved rule-corpus amendment exists | Gate 5.7 passes: the unit is formally admitted and its evaluator passes the suite |
| B-9 | Release readiness (deployment, consumer surface, wording review) is a separate decision not covered by any artifact in this workspace | A later release decision after Gate 5.7 |

### 6.5 What R-1 does not assert

R-1 does not assert that any consumer has a violation, that the New York rule is enforceable
notwithstanding 15 U.S.C. § 1681t(b)(1)(E), that any item is legally medical debt, that any bureau is
supported, that the credit-card exception does or does not apply in any case, or that any deadline runs. It
creates no governed rule, legal coverage, jurisdiction coverage or permitted finding, and it does not amend
the legacy application.

### 6.6 The one owner decision that most improves R-1

The single highest-value decision is **which bureau's consumer disclosure is to be the first supported
presentation**, together with the format artifact that evidences it. Every other blocker in §6.4 can then be
closed by work orders under existing authority, because PHASE5-001A already accepts the source,
jurisdiction, effective-period and legal-test determinations as owner-authorized truth, and PHASE4-002H
already settles the medical-debt class rule for `US-NY`.

## 7. Claim classification — verified, proposed, blocked, unknown

Every material claim in this audit carries exactly one class. `VERIFIED` means a durable artifact in this
workspace states it or it was directly measured read-only. `PROPOSED` means this plan recommends it and no
existing artifact authorizes it. `BLOCKED` means the required evidence or authority is absent. `UNKNOWN`
means no artifact in this workspace resolves it.

### 7.1 Verified claims

| ID | Claim | Evidence |
| --- | --- | --- |
| V-1 | `ADMITTED LEGAL RULES: 0` and coverage/findings `0` | `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 |
| V-2 | Catalogue holds 437 source entries, all `ADMITTED_SOURCE_ONLY`, coverage `0`, findings `0` | `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` §1, §5 |
| V-3 | Legacy admission holds 34 admitted source artifacts and 0 re-expressed governed rules | `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` §4 |
| V-4 | Expanded-scope discoveries, governed rules, governed jurisdictions and permitted findings are all `0` | `CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md` §8 |
| V-5 | Until a conforming rule corpus is approved, no candidate issue can emit `VIOLATION` or `PROBABLE_VIOLATION` | `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` §7 |
| V-6 | The jurisdiction enumeration is closed at 82 first-level regions (13 `CA`, 57 `US`, 4 `GB`, 8 `AU`) and establishes no legal coverage or implementation | `CRP_JURISDICTION_ENUMERATION.md` §2, §4, §5 |
| V-7 | Country-wide descriptors assign no region; no federal pseudo-region exists; `US-*` and `AU-*` are permanently non-operative; the bare `UK` token is unresolved and non-operative | Normalization contract §2; register §12.2 items 3, 8, 9; §12.8 |
| V-8 | PHASE5-001G captured every named federal provision in the twenty-one-ID set but reported "No cohort is reported complete" | Register §12.9 |
| V-9 | PHASE5-001H created 0 governed rules, 0 coverage, 0 findings authority, resolved 0 wildcards, closed 0 refusals and made no off-report inference | Register §12.8 |
| V-10 | 18 unique legal provisions are fully captured and 3 partially; the counts are explicitly not rules | Register §8.5 |
| V-11 | The catalogue was not amended by the G or H phases and its digest is unchanged at `5BCC3C…019D` | Register §12.7 item 2; §13.1 |
| V-12 | `CRP-DISC-002C-NY-0194` is `PROBABLE_CANDIDATE` only, ceiling `PROBABLE_VIOLATION`; its provenance is a digest-bound snapshot at `rules.ny.ts`; `RETRIEVED_AT_UTC` is `NOT RECORDED` | The discovery record, all sections |
| V-13 | No bureau is evidenced as a supported report presentation; the 25 bureau-name occurrences are legal-source or provenance references, and the Equifax fallback is expressly not adopted | Register §11.4 item 1, §12.2 item 1; measured search described in §5.2 |
| V-14 | `consumer-wizard/` is a demonstration with a fictional report and a `Sample Credit Bureau` recipient; `wizard-check.cjs` passes on Node v24.16.0 | `dist/app.js` lines 5 and 11; self-check output recorded in §5.4 |
| V-15 | No report layout, format specification, field list, parser fixture or mapping register exists in the workspace | §2.3; `SOURCE_CAPTURES` inventories |

### 7.2 Proposed claims (this plan recommends them; nothing existing authorizes them)

| ID | Proposal | Authority needed |
| --- | --- | --- |
| P-1 | That R-1 (`US-NY` × explicit medical-debt label presentation × one rule unit from `CRP-LSRC-0194`) is the first target | Owner acceptance of this plan, now partly given and partly superseded: **OWNER DECISION PROD-003 (2026-09-30).** The owner broadened the first-unit selection: any jurisdiction and relevant statute already accepted under PHASE5-001O may be selected, on evidence, and the unresolved `US-NY` medical-debt candidate is preserved with every qualification unchanged while ceasing to be the exclusive first implementation target. No report-evidence requirement, ceiling, gate or exclusion is waived. The exclusivity in this proposal is withdrawn; its recorded readiness content stands. |
| P-2 | That the first bureau be fixed only from Phase 5.3 presentation evidence rather than named now | Owner direction, or the Phase 5.3 mapping result |
| P-3 | That the next work order be read-only with respect to all legal sources and the catalogue, and create only the three missing durable artifacts | Owner issuance of the work order in §8 |
| P-4 | That the first admitted rule be capped at `PROBABLE_VIOLATION` and never `VIOLATION` while the effective period and the § 1681t(b)(1)(E) question remain unresolved | Owner approval at Gate 5.7 |
| P-5 | That the § 380-a(v) credit-card carve-out be recorded as an unresolved, non-suppressing express exception | Owner approval at Gates 5.4 and 5.7 |

### 7.3 Blocked claims

| ID | Blocked item | Blocker |
| --- | --- | --- |
| C-1 | Any finding-emission capability | No admitted rule corpus (V-1, V-5) |
| C-2 | Any report-representation certification | Gate 5.3 not reached; artifact 2 absent (B-2) |
| C-3 | Any bureau-specific statement | No bureau evidenced (V-13, B-3) |
| C-4 | A `CONFIRMED_CANDIDATE` or `VIOLATION` for `US-NY` | `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` and `CURRENT_SOURCE_DATE_ONLY` cap the record (B-4, B-5) |
| C-5 | Any evaluator, validation suite or release | Gates 5.4–5.7 not reached (B-7, B-8, B-9) |
| C-6 | Any resolution of an `AU`, `CA` or `GB` content rule from the captured limitation/privacy provisions | Direct-report contract §4 permanent exclusions; register §11.4 item 7 |
| C-7 | Re-verification of the New York rule text or its digest in this workspace | The snapshot file is absent (B-1) |

### 7.4 Unknown claims

| ID | Unknown | Why unresolved |
| --- | --- | --- |
| U-1 | Whether the `rules.ny.ts` snapshot bytes still hash to `201F50…3590` | The artifact is not in this workspace |
| U-2 | Which bureau's disclosure will be supported first, and what its medical-debt label, section and block look like | No format artifact and no Phase 5.3 work |
| U-3 | Whether the New York rule's effective period can be determined at all | Formal edition `NOT RECORDED`; effective dates `UNRESOLVED` |
| U-4 | How 15 U.S.C. § 1681t(b)(1)(E) interacts with § 380-j(a)(3) | Recorded as an undecided question; this audit does not decide it |
| U-5 | Whether the medical-debt label can be extracted deterministically from any given disclosure | No extraction or locator evidence exists |
| U-6 | Whether a durable full rescreen register for all 437 entries exists outside this workspace | Not present here; Phase 5.2 is not evidenced |
| U-7 | What the ten outstanding owner decisions (register §12.8 items 1–10) will be | Awaiting owner direction |
| U-8 | Whether any release-level requirement (hosting, credentials, consumer wording review) is already satisfied | No artifact in this workspace addresses release |

No claim in this audit is stated at a class higher than its evidence supports. Nothing in §7 is a legal
conclusion, and no `VIOLATION`, `PROBABLE_VIOLATION`, `CONFIRMED_CANDIDATE` or confidence value is created
anywhere in this document.

## 8. Proposed next implementation work order

### 8.1 Identity and objective

| Field | Value |
| --- | --- |
| Proposed work order | `PHASE5-001I — Report-representation and field-mapping completion for the New York medical-debt unit` |
| Objective | Convert R-1 from a probable candidate into a certifiable rule unit by creating the durable artifacts Phase 5.3 requires, leaving all legal source work untouched |
| Governing gates | Phase 5.3 and **Gate 5.3** first; Phase 5.4 and Gate 5.4 only if Gate 5.3 passes |
| Authority sought | Plan-level authorization to create the three durable artifacts in §8.3. No rule admission, no coverage, no finding authorization, no runtime implementation |
| Read-only boundary | All legal sources, the catalogue, the register §§1–13, the legacy application and `SOURCE_CAPTURES\PHASE5-001G` / `PHASE5-001H` are read-only |

### 8.2 Exact scope (and explicit non-scope)

**In scope, in this order:**

1. Record the Phase 5.3 report-format inventory for the single presentation named in R-1: the supported
   report source or sources to be inspected, obtained through authorized official or owner-supplied routes
   only, with a stated provenance and limitation for every artifact inspected.
2. Map the exact displayed statement that identifies an item as medical debt to the exact report location
   (page, section, block, and text span or bounding box), and record extraction limitations, including OCR
   ambiguity and section-not-inspected outcomes, as explicit statuses rather than as absence.
3. Define the report-location locator that survives extraction, with raw value, normalized value and a
   traceable normalization record, per build plan §Phase 5.3.
4. Record the `REPORT_REPRESENTATION` value for `US-NY` § 380-j(a)(3) exactly as evidenced, including the
   `ABSENT_FROM_REPORT` versus `EXTRACTION_UNRESOLVED` distinction of Gate 5.5's fact model where relevant.
5. Record the single rule unit's proposed fields for `CRP-LSRC-0194` against the required field list:
   immutable rule ID/version, exact jurisdiction, source ID and pin, formal edition status, effective
   dates/status, exact legal text/proposition, applicability and preemption qualification, report-required
   facts, decisive facts, exceptions, deterministic breach test, consumer citation and consumer-facing
   qualifications — capped at `PROBABLE_VIOLATION` (B-4, B-5).
6. Build the candidate-to-rule-unit crosswalk for exactly one source record to exactly one unit.

**Explicitly out of scope (must not be done under this work order):**

- no new legal-source retrieval, no catalogue edit, no register `§§1–13` edit, no gap or refusal closure;
- no additional consumer evidence request of any kind (build plan §1; direct-report contract §2);
- no second rule unit, no second jurisdiction, no second bureau, no wildcard resolution;
- no evaluator implementation, no parser implementation, no test suite, no consumer-facing surface;
- no rule admission, no coverage change, no finding class, and no `VIOLATION` or `PROBABLE_VIOLATION`;
- no legacy-application change, and no modification of this plan's own recorded evidence.

### 8.3 Deliverables and the permitted-file list

Only these files may be created. Anything else must be named in a later work order.

| # | Permitted file to create | Purpose |
| --- | --- | --- |
| 1 | `CRP_PHASE5_001I_REPORT_REPRESENTATION_AND_FIELD_MAPPING_WORK_ORDER.md` | The issued order text, its decisions and its completion record |
| 2 | `CRP_REPORT_REPRESENTATION_AND_FIELD_MAPPING_REGISTER.md` | Build plan §4 item 2 — supported format, exact field/event mapping, locations, extraction limitations, unresolved mappings |
| 3 | `CRP_CANDIDATE_TO_RULE_UNIT_CROSSWALK.md` | Build plan §4 item 3 — source ID to unique provision/limb, jurisdiction, status, disposition |
| 4 | `SOURCE_CAPTURES\PHASE5-001I\` (new directory, new files only) | Format documentation and layout evidence inspected, each hashed and inventoried in the work order's completion record |
| 5 | One append-only section, numbered `## 14`, in `CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md` | The phase's own completion record, in the same form as `§13`, with a prefix digest of `§§1–13` recomputed before the append |

**Forbidden file operations:** overwriting, renaming, deleting or moving any existing file; editing
`CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md`; editing register `§§1–13`; editing any `SOURCE_CAPTURES\PHASE5-001G`
or `SOURCE_CAPTURES\PHASE5-001H` file; touching `consumer-wizard/` or `consumer-wizard.tar.gz`; touching
this plan's §7 classifications except by a later plan amendment.

### 8.4 Gates, stop conditions and completion report required

- **Gate 5.3** governs completion: every proposed candidate must have a verifiable report representation and
  exact location, or remain explicitly unresolved or excluded with a source-grounded reason.
- Stop and record the blocker, without touching unrelated artifacts, if: the first bureau's disclosure
  cannot be inspected through an authorized route; the medical-debt label cannot be located deterministically
  at a stable location; the label requires an inference from a furnisher or provider name; the label's
  presence is ambiguous under OCR; or any event/date mapping would require a non-report fact.
- The phase must end with a completion report containing: what was verified, what remains blocked, and the
  resulting status of the single rule unit — in the same structure as register §13.1 to §13.2.

## 9. Closing report

### 9.1 Verified

- This audit is complete and read-only. One file was created — this plan — and no existing artifact was
  modified. No build, no deployment, no retrieval and no admission occurred.
- The governed corpus holds **0 admitted legal rules, 0 governed jurisdictions with legal coverage and 0
  permitted legal findings**, as stated independently in the governed-corpus contract §7, the catalogue §5,
  the legacy admission contract §4, the normalization contract §6, the direct-report contract §8 and the
  register §1, §7.3, §8.5 and §12.8.
- The jurisdiction surface is closed and complete at 82 regions, and it is uncovered: coverage is 0 for
  every country. `US-*` and `AU-*` are permanently non-operative, the bare `UK` token is unresolved and
  non-operative, and no country-wide descriptor attaches to any region without a later governed-rule record.
- The report-presentation surface does not exist yet: no supported format, no bureau layout, no field list,
  no locator and no mapping register. **Gate 5.3 has not been reached**; Phase 5.2 is not evidenced in this
  workspace; Phases 5.4 to 5.6 have not started; Gate 5.7 has not been reached. Every Phase 5 gate is
  reported here as it stands and **no gate is waived**.
- The one exact-region candidate is `US` / `US-NY`, N.Y. Gen. Bus. Law § 380-j(a)(3) with § 380-a(v), via
  `CRP-DISC-002C-NY-0194`, status `PROBABLE_CANDIDATE`, ceiling `PROBABLE_VIOLATION`.
- The `consumer-wizard/` bundle is a demonstration with fictional data and a `Sample Credit Bureau`
  recipient; its self-check passes. It is not evidence of production capability.

### 9.2 Blockers

| ID | Blocker | Owner action, if any, is needed |
| --- | --- | --- |
| B-1 | The digest-bound New York snapshot `rules.ny.ts` is absent from this workspace, so its text and digest cannot be re-verified here | Restore the snapshot, or authorize a fresh source pin for § 380-j(a)(3) and § 380-a(v) |
| B-2 | No report-representation and field-mapping register, so Gate 5.3 cannot be assessed | Issue the work order in §8 |
| B-3 | The first bureau is `UNVERIFIED` | Name the bureau whose consumer disclosure is to be supported first, with the format artifact that evidences it |
| B-4 | `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` under 15 U.S.C. § 1681t(b)(1)(E) caps the record at probable-only | Accept the probable-only ceiling, or authorize a specific legal determination that this audit cannot make |
| B-5 | `CURRENT_SOURCE_DATE_ONLY`; effective period and formal edition unresolved | Accept the timing qualification, or authorize effective-period research |
| B-6 | The § 380-a(v) credit-card carve-out is an unresolved express exception | Accept recording it as non-suppressing when unknown |
| B-7 | No rule unit, evaluator or validation suite | Issue the follow-on orders after Gate 5.3 passes |
| B-8 | No owner-approved rule-corpus amendment | Owner approval at Gate 5.7 |
| B-9 | Release readiness is unevidenced and is a separate decision | Decide after Gate 5.7 |
| B-10 | Ten outstanding owner decisions remain in the legal-source track (register §12.8 items 1–10) | Owner direction; none of them blocks R-1 directly |

### 9.3 Recommended combination

**One recommendation at the time of this audit: R-1.** `US` / `US-NY` × bureau `BUREAU_PRESENTATION_UNVERIFIED`
(to be fixed by Phase 5.3 evidence) × report presentation "an explicit bureau label or description identifying
the item as medical debt, at an exact recorded location" × admitted rule set "to be created as exactly one rule
unit from `CRP-LSRC-0194` (N.Y. Gen. Bus. Law § 380-j(a)(3) with § 380-a(v)), capped at `PROBABLE_VIOLATION`".

Stated plainly at the time of this audit: **no combination was ready then**, because the admitted rule set was
empty and the presentation was unmapped. R-1 was the closest evidenced candidate, it was the only candidate with
a complete source-discovery record in this workspace, and it was fully blocked until §9.2 items B-1 to B-8 clear.
No second combination was recommended, and none could properly have been started in parallel on the evidence
then available.

**OWNER DECISION PROD-003 (2026-09-30).** The owner broadened the first-unit selection: any jurisdiction and relevant statute already accepted under PHASE5-001O may be selected, on evidence, and the unresolved `US-NY` medical-debt candidate is preserved with every qualification unchanged while ceasing to be the exclusive first implementation target. No report-evidence requirement, ceiling, gate or exclusion is waived.

Under that decision PROD-003 selected the first unit on evidence and recorded the selection, its representation,
its crosswalk, its ceiling and its dependencies: `CA` / `CA-NS` × the Equifax Canada consumer-channel credit
report × `ca-ns.cra.s10_3_c.debt_retention_6y` (first limb). The `US-NY` candidate keeps its
`CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1` blocker, its `PROBABLE_CANDIDATE` ceiling and its unresolved
preemption and timing qualifications. Evidence requirements are unchanged: a unit may be selected only with a
supported presentation, an established jurisdiction association, located report facts and a deterministic
evaluation.

### 9.4 Next milestone

**Milestone M-1 — Gate 5.3 passes for the single selected unit** (owner decision PROD-003: the unit is no longer required to be `US-NY`). It is reached when the report-representation
and field-mapping register records, for one named bureau and its consumer disclosure, the exact printed label,
statement or field the selected unit's rule reads, its exact page/section/block and text span, its extraction status, and the locator
definition that survives extraction — with any unresolved mapping recorded as unresolved rather than
assumed. On M-1, Phase 5.4 may begin for that one unit only, and only then do Gates 5.4 to 5.7 become the
next sequence.

The immediate next action is therefore: **owner accepts R-1 and issues the §8 work order**, or directs a
different first bureau. Nothing else in this audit should be actioned before that.

## Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-30 | `CRP_PROD_001` | Created this production-readiness audit and implementation plan. Read-only: no rule, coverage, finding, catalogue entry, register section, source capture or legacy behavior was created or modified; all Phase 5 gates are reported as they stand and none is waived. Recommends one first target (R-1, `US-NY` medical-debt label presentation, one rule unit from `CRP-LSRC-0194`) and records that no combination is ready today. |
| 2026-09-30 | PROD-003 | Valid owner amendment: document the owner scope decision that broadened the first-unit selection beyond the single `US-NY` candidate. Section 6.2 the Admitted rule set row, section 7.2 proposal P-1, section 9.3 and section 9.4 now record that any jurisdiction and relevant statute already accepted under PHASE5-001O may be selected on evidence, that the `US-NY` medical-debt candidate is preserved with every qualification unchanged but is no longer the exclusive first implementation target, and that no report-evidence requirement, ceiling, gate or exclusion is waived. Both replaced text and replacement text are quoted in the amending narrative `CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md`. This amendment admits no rule, creates no coverage, produces no finding and changes no gate state. |

