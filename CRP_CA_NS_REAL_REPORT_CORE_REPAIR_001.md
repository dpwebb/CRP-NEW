# Canada / Nova Scotia real-report missed-issue repair — October 6, 2026

Owner authority: real TransUnion report returns zero despite owner-identified SOL, missing-DOFD and other concerns; this is the highest-priority core failure. Reopens BLOCKER-REPORT-DATA-TO-ISSUE-001 for demonstrated useful-assessment gaps. Cline remains sole implementation writer. No competing runtime edits were made by this diagnostic.

## Measured reproduction

Authorized input: owner's CA Transunion 001.pdf, local only; never copy it into Git or upload it to staging without separate authorization. Region CA-NS. Production model + extraction recognizes FAM-TU-CA-CONSUMER, report date 2026-01-10, four TU_CA_TRADELINE accounts. Real local HTTP upload returns 201; free assessment returns 201; distinct issue total 0. Initial owner format-refusal is not reproduced by this current local build: investigate exact deployed upload/rejection separately; do not weaken structural admission blind.

## Demonstrated engine/reader gaps

1. NS CA-NS-CRA-S10-3-C-LIMB-1 is rejected for every TU account by PRESENTATION_NOT_SUPPORTED (PR-01 only). Reuse the reader's source-linked last-payment facts with correct record kind, admitted authority and qualified issue semantics; inspect the full timing condition and adverse-content scope. Do not assert aged satisfactory/zero-balance accounts are unlawful merely because old.
2. All four account narrative_legend objects are empty despite printed legends. Exact production lines end in carriage return (\\r). narrativeLegend anchors /^\\s*Legend:\\s*(.+)$/ without trimming the returned native line. Demonstrate the defect and smallest normalization fix with real-file and CRLF controls; preserve source locations. Codes AC, CG, WO, TC, CZ are captured, their printed meanings are lost.
3. First Delinquency Date is kept in printed only. Capital One prints 2023-12-16; FIDO prints that caption without a value while its same account reports MOP 9 and TC/CG collection/cancellation narratives. Map the explicit date to the shared decisive fact and preserve explicit blank separately. Build a supported POTENTIAL verification for adverse/collection entry with no usable delinquency anchor where the affirmative context makes the omission material; do not label all blanks statutory omissions.
4. Charge Off Date is blank on Capital One while the same account's 2024-07 row prints WO (Bad debt write-off). Evaluate a qualified verification request for the event/anchor, not a proven mandatory omission without authority.
5. Closed Date is blank on FIDO (CG), Rogers (CZ), and Bank of Nova Scotia (AC), whose own legends indicate cancellation/closure. Evaluate each as qualified factual completeness concern; do not equate OPEN product type with lifecycle status. Do not invent closure dates or force three findings if the evidence contract does not support them.
6. Payment-history detector only compares conflicting codes for the SAME month; it does not validate printed delinquency dates versus history, chronological progression or summary counts. Inspect the actual history before admitting useful additional verification signals; cumulative counts are not assumed to cover the visible grid and unknown X is not delinquency.

These are concrete candidates and failed mappings, NOT a claim six confirmed legal violations have been established. No target issue count is allowed.

## SOL / reporting-period distinction

Investigate both clocks against accepted official NS authority and printed adverse-account facts. Court limitation expiry is not itself a credit-report deletion requirement. Do not substitute last payment for claim discovery, exclude acknowledgments or assume litigation/collection conduct not shown. A supported limitation-related concern may be a qualified verification/next-step item; label it according to what is actually shown. Relevant current leads: official NS Limitation of Actions Act (2014 c35), Consumer Reporting Act s10(3)(c), FCAC credit-report retention guidance. Retain relevant existing source captures; no repeated whole-corpus inventory.

## Required connected completion

Repair accepted real-format upload behavior if a actual production defect is reproduced. Connect material native-text facts -> useful jurisdiction-appropriate actual/probable/potential issue -> accurate free counts/teaser -> one-time full assessment/download -> subscriber selected packet/review/approval/download. Keep all purchase boundaries and sandbox billing. Add real-file local upload assertions for this exact supplied report plus privacy-safe fictional positive/benign/refusal controls. Never assert zero as success merely because a mapped check failed to execute.

Measure each candidate: printed evidence, extraction result, check applied or missing, issue decision/reason, consumer/packet outcome. Distinguish proven negative from unexamined. Preserve no-issue controls, own-account association, raw readings/locations, no forced severity or breach, approval binding and paid access. Use focused checks during fixes and one final full regression. Return exact issue inventory on this report, including any withheld candidate and concrete reason; do not stop at another adapter-count or arithmetic-only completion. Refresh manifests/records and commit locally. Do not deploy private input, alter live billing or silently reduce version1 promise.

---

## Completion record — October 6, 2026 (Cline; not deployed)

**Blocker status: BLOCKER-REPORT-DATA-TO-ISSUE-001 is IMPLEMENTED_AND_TESTED for this report; staging verification remains PENDING.** The supplied report is `transunion-david-webb.pdf`, byte-pinned by the repository's own register (`PR-02`, sha256 `244D58080254D987…`, 362,891 bytes; the owner's local copies are byte-identical). It is read read-only; nothing was copied into source control and nothing was uploaded anywhere.

### The exact issue inventory this repair produces (real report, CA-NS, reference date 2026-01-10)

Five supported POTENTIAL issues, each a verification request, none naming a rule and none asserting a violation:

| # | Account the report prints | What the report shows | Missing detail | Item |
|---|---|---|---|---|
| 1 | FIDO | the report's own MOP legend resolves thirteen months of rating 9 ("Bad debt, placed for collection; skip") and the rows print TC / CG | the `First Delinquency Date` caption is printed with **no value** | adverse/collection entry with no delinquency anchor |
| 2 | CAPITAL ONE BANK | the 2024-07 row prints WO, which the report's own legend defines as "Bad debt write-off" | the `Charge Off Date` caption prints with **no value** | write-off with no charge-off date |
| 3 | BANK OF NOVA SCOTIA | the row prints AC, defined by the report's own legend as "Account closed/rating non derogatory" | the `Closed Date` caption prints with **no value** | closure stated without a closed date |
| 4 | FIDO | the rows print CG, "Account cancelled by credit grantor with derogatory rating" | the `Closed Date` caption prints with **no value** | closure stated without a closed date |
| 5 | ROGERS COMMUNICATIONS CANADA INC | the row prints CZ, "Closed at consumer's request" | the `Closed Date` caption prints with **no value** | closure stated without a closed date |

Withheld, with concrete reasons:

- **Nova Scotia s.10(3)(c) reporting period — no expiry on this report.** The limb now RUNS on all four TransUnion accounts (it was refused for every one of them before) and measures from the **printed Last Payment Date**: BANK OF NOVA SCOTIA `Oct 03, 2013` and ROGERS `Aug 21, 2012` are more than six years before the report date; CAPITAL ONE BANK `Oct 27, 2023` and FIDO `Aug 09, 2020` are not. The two aged entries are a closed, zero-balance, non-derogatory account and a closed, zero-balance, cancelled account, so no consumer issue is emitted from them: this limb's recorded output ceiling is unchanged (`max_conclusion: observation`, `finding_allowed: false`, `packet_eligible: false`) and the owner's instruction not to assert aged satisfactory entries to be unlawful is preserved. The default-date limb stays unseated.
- **No court-limitation (SOL) item.** This report prints no court proceeding, judgment, claim or litigation conduct for a limitation period to run against. The collection narrative it does print (TC at FIDO) shows a placement; the owner's instruction forbids substituting the last payment for claim discovery, excluding acknowledgments, or assuming litigation not shown. Recorded as unsupported by this report's own facts.
- **Payment-history cross-checks beyond the same-month conflict** (candidate 6) are **not** implemented: the printed 30/60/90/#M figures are cumulative lifetime counts while the visible grid is a short window, and the owner's instruction says cumulative counts are not to be assumed to cover the visible grid and an unknown `X` cell is not a delinquency. A comparison without an evidenced basis would invent one.

### Defects repaired

1. **`narrativeLegend` dropped every printed legend.** The production lines end in a carriage return; `.` never matches `\r` and, without the multiline flag, `$` matches only at the very end of the string, so the anchored match could not succeed and all four accounts carried an empty `narrative_legend` while the codes themselves (AC, CG, WO, TC, CZ) were still captured. The line's own native ending is now removed before matching, nothing else about the line changes, the entry's page/line location is preserved, and no code is ever decoded by guessing.
2. **First Delinquency Date and Charge Off Date never reached the shared facts.** Both now map from the printed reading only (`tradeline.firstDelinquencyDate`, `tradeline.chargeOffDate`); an explicit blank maps nothing, so a caption printed without a value stays distinguishable from a label the report never prints.
3. **The Nova Scotia last-payment limb was refused on every TransUnion account** (`PRESENTATION_NOT_SUPPORTED … evaluates only PR-01`). The limb's recorded anchor is a **tradeline** field — the config itself recorded that divergence — and the TransUnion reader maps exactly that field with its printed page/line location, so the limb is admitted to `FAM-TU-CA-CONSUMER` as well. The ceiling, the packet permission and the single admitted limb are unchanged.
4. **A comparison was attributed to a field it did not measure.** The observation named the record's own `source_field` ("Reported Date") with that field's printed value while the arithmetic used the anchor. It now names the anchor's own printed label and value ("Last Payment Date", `Oct 03, 2013`), so a consumer is never told a rule measures from a date it does not measure from.
5. **Internal labels reached consumer text.** "tradeline 3" is replaced by the reader's own plain kind ("an account on your report") in observations, and each completeness issue identifies the account by the printed creditor name the report itself prints.
6. **Teaser severity for a missing detail.** The three completeness items rank as `ADD_CONTENT` with the title "An entry shows an event without the date for it" — the kind of concern, without claiming that any rule requires the detail.

### Verification

- `cr-ca-ns-tu-real-report` (new, **48 assertions**): the real report through the live HTTP upload path (201, admitted `FAM-TU-CA-CONSUMER`, no refusal), the reader's readings, the five-issue inventory on the correct accounts, every item a VERIFICATION and none citing a rule, the Nova Scotia limb's four completed comparisons from the last payment date with the two aged entries as observations only, the one-time-unlock boundary (packet `402 SUBSCRIPTION_REQUIRED`), the subscriber packet end to end (select → correspondence → approve → download 200), and six synthetic controls: CRLF and LF legend endings read identically, no legend yields no meaning and no inferred issue, a complete block forces nothing, an anchored adverse entry is never given a missing-anchor item, an aged satisfactory entry forces nothing, and a foreign record kind is never lent to these checks.
- `ce-tu-ca-account-material` 34/34 (its genuine-report assertion re-scoped to the contradiction class it protects, with the three completeness items named); `w-ca-second-bureau-format` 235/235 (its PR-01-only and "no statutory comparison on TransUnion" assertions updated to the repaired behaviour); `r-ca-factual-assessment` 236/236 and `j-specimen-journey` 42/42 (the limb's record selection is unchanged, so nothing was narrowed); `al-common-errors` 62/62; `k-ui-smoke` 67/67; the adapter unit suite 34/34; `verifyConfigs()` clean; the derived adapter catalog regenerated so its recorded configuration digest matches the configuration.
- Full regression: **PASS 5663, 0 failed, 0 skipped**.

### Remaining gap, stated plainly

The owner's earlier **hosted** upload was refused as a format problem, and that refusal is **not reproduced locally**: the same bytes upload to the local service as 201 and are admitted. The concrete dependency the reader needs for its text layer is poppler (`pdfinfo`, `pdftotext`), which this machine provides and which the service README records as a host-provided program; a host without it produces exactly a "the file was not read" refusal. That is the leading explanation to verify on the host. No deployment, no billing change and no correspondence were performed in this repair.
