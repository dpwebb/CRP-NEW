# CRP-FINDING-CANDIDATE-001 — bounded admission recommendation (finding-coverage priority)

> **WITHDRAWN (October 4, 2026).** The architect did not approve this bankruptcy finding-class proposal. The
> unresolved second-bankruptcy exception means enabling `finding_allowed` adds no demonstrated finding
> jurisdiction, and the claim below that it "converts 1 of the 13 CA regions to demonstrated coverage" is
> unsupported. See §8 correction and the replacement record
> `CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md`.

Prepared October 4, 2026 (America/Halifax). This is a **reviewable candidate record**, not an implementation.
No rule is enabled, no finding/packet permission is expanded, and no classification changes until the
architect reviews the disposition in §8.

## 1. Purpose and the corpus constraint (read first)

The directive asked for "one concrete, material **non-retention** finding candidate", preferring a Canadian or
GB gap. The honest finding is that **the owner-accepted report-only corpus contains no report-determinable
non-retention rule**:

- Every one of the 14 admitted rule adapters is a retention-period comparison ("shall not include in a consumer
  report … information antedating by more than N years"). All 9/82 demonstrated findings are therefore retention
  findings (bankruptcy 10y; AU enquiry/default 5y; AU closed-liability 2y).
- The non-retention provisions in the corpus — accuracy, disclosure, correction, permissible-purpose — are
  recorded in the PHASE5-001C owner amendment as **bureau-side duties that "cannot be established from report
  content", and were "read and deliberately not entered"** as rules. That includes GB (UK DPA 2018 / UK GDPR
  Art 5(1)(d) accuracy; CCA 1974 ss.157–159 disclosure/correction) and the Canadian equivalents (Ontario CRA
  ss.8/13, Québec Civil Code arts.35–40, BC BPCPA Part 6 ss.107–112).

A literal non-retention finding would require admitting a **new** report-content rule, which is a new legal
admission and out of scope for this batch. The strongest *implementable* candidate that expands substantive
coverage today is therefore a Canadian retention rule that is already admitted and already has decisive report
evidence but is held at `observation` by two precise, separable gaps. That candidate is recorded below, with the
"non-retention" mismatch stated plainly rather than papered over.

## 2. Selected candidate

**`CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y`** — Consumer Reporting Act (Nova Scotia), bankruptcy retention, six years
after discharge. It is the only Canadian rule whose admission is complete and whose decisive fact is now
accepted by the evidence policy; the sole remaining work is finding-class authorisation plus one exception
decision.

## 3. Exact source / provision and accepted-authority status

- **Source entry:** `CRP-LSRC-0353` (ledger row `CRP-LSRC-0353`), in `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md`.
- **Provision:** Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(e) — "six years after the
  discharge of the consumer; a second bankruptcy is excepted by the section".
- **Legacy artifact:** `packages\backend\src\services\legalCorpus\rules.canada.ts` / `legalRules.ts`; adapter
  `source_version` digest `FE5C1BA63AE85923E378D4278C3D6E85461E8DF648847F43FE02FB4185BD41F6`.
- **Authority status:** the *source* entry is `ADMITTED_SOURCE_ONLY`; the *rule unit* is admitted into the
  adapter config and bound to the exact CA-NS specimen (`PR-01`). Its `output_permission` is
  `{ max_conclusion: "observation", finding_allowed: false, packet_eligible: false }`. The CA-NS `C`-limb reached
  Gate 5.7 via PHASE5-001U; this `E`-limb is admitted as a configured adapter with the OWNER-EVIDENCE-001
  reconciliation described next.

## 4. Rule identity/version, addressee, jurisdiction

- **Rule identity:** `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` (legacy id `ns.bankruptcy.6y`).
- **Addressee:** "a consumer reporting agency shall not include in a consumer report …" — a CRA (furnisher-side
  content obligation), **not** a bureau-conduct duty, so it *is* determinable from report content.
- **Jurisdiction:** exact `CA-NS` (Nova Scotia) only; no country-wide relation. Adds **1 of the 13 CA regions**.

## 5. Trigger, required report facts, omission vs extraction failure, exceptions, precision

- **Trigger / required fact:** a bankruptcy public record on the admitted CA-NS specimen carrying a **clearly
  labelled discharge date** (`bankruptcy.dischargeDate`), unambiguous and free of material contradiction.
  OWNER-EVIDENCE-001 (reported-fact policy v1.0) already accepts this label as the reported fact; a filing,
  update, trustee or ambiguous bankruptcy date is never substituted. This was the prior extraction-withholding
  objection, and it is **resolved**.
- **Precision:** like the other public-record legal-event rules, the anchor requires **DAY** precision;
  a month-only discharge date never anchors (GAP-INGEST-006). This is a precision restriction, distinct from the
  exception gate below.
- **Exception gate (the open decision):** the admitted text records "a second bankruptcy is excepted by the
  section". `GAP-FINDING-002` recorded that a *second* bankruptcy requires establishing a **distinct bankruptcy
  event identity** (a separate case/court); the extraction produces only discharge dates, and distinct dates
  alone cannot distinguish a second bankruptcy from a duplicate listing or a cross-bureau copy. The exception is
  therefore `report_observable: false` and stays `resolved: false`, so no finding is emitted. This is the
  finding-coverage gate, not an extraction failure.

## 6. Proposed finding ceiling and exact permission change

- **Proposed ceiling:** `VIOLATION` when `PERIOD_EXCEEDED` holds (discharge date older than six years before the
  report reference date) **and** the second-bankruptcy exception is affirmatively resolved absent; otherwise no
  finding. No `PROBABLE_VIOLATION` is proposed for this limb in the first authorisation.
- **Exact permission change (requested, not performed):** flip `output_permission.finding_allowed` from `false`
  to `true` and `max_conclusion` from `observation` to `violation` for `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` only.
  This is the **PHASE5-001V** finding-class authorisation the corpus already names as the "single outstanding
  owner decision" for the admitted CA-NS unit, extended to the `E`-limb. It does not touch the `C`-limb, any
  other rule, any exception text, the classifier, or packet eligibility (`packet_eligible` stays `false` here).

## 7. Extraction / evaluation entry points and fixtures

- **Extraction:** `bankruptcy.dischargeDate` is already produced by the general/public-record intake; the
  adapter's anchor is `SINGLE_FIELD` on that field, `record_kinds: ["GENERAL_PUBLIC_RECORD"]`.
- **Evaluation:** `rule-adapters.cjs` `buildEvaluationRecord`/`buildExceptionEvaluation` (period comparison via
  `evaluation-primitives.cjs`, the same six-year evaluator the admitted CA-NS unit uses). No new evaluator and no
  new extraction code is needed.
- **Positive fixture (VIOLATION):** CA-NS specimen, reference date `2026-10-04`, bankruptcy record labelled
  "Date of Discharge: 2019-03-01" (DAY precision) → `PERIOD_EXCEEDED` (7.6y) → finding, **provided** the
  second-bankruptcy exception is resolved absent.
- **Negative fixture 1 (below threshold):** same specimen, discharge `2023-01-01` → period not exceeded → no
  finding.
- **Negative fixture 2 (month-only):** discharge `2019-03` (no day) → never anchors (precision) → no finding.
- **Negative fixture 3 (second bankruptcy):** two discharge dates present but no distinct case/court identity →
  exception unresolved → no finding (this is the decision in §5 that must be settled).

## 8. Precise missing admission / policy decision, and recommended disposition

Three decisions, in the order they must be taken:

1. **Finding-class authorisation (PHASE5-001V, extended to the `E`-limb).** Owner decision to grant
   `finding_allowed` / `max_conclusion: "violation"` for the already-admitted CA-NS bankruptcy rule.
   **CORRECTION:** this is NOT "the single highest-leverage move" and does NOT by itself convert any CA region to
   demonstrated coverage — the unresolved second-bankruptcy exception (`s.10(3)(e)`, "unless he has been bankrupt
   more than once") prevents a demonstrated finding regardless of the flag. See the withdrawal note and the
   replacement record `CRP_FINDING_CANDIDATE_002_NS_JUDGMENT_CONTENT.md`.
2. **Second-bankruptcy exception disposition.** Owner decision on whether a consumer-assisted (question) route
   may establish a *distinct* second-bankruptcy event identity, or whether the exception stays report-unobservable
   (in which case the finding is capped at "unresolved when any second-bankruptcy signal exists"). The existing
   conservative position — unknown never becomes false, and a single discharge date cannot establish a second
   event — is the recommended disposition; a consumer statement about a *separate* bankruptcy would remain a
   separately-sourced consumer assertion and would not, by itself, establish the distinct event identity.
3. **Citation currency question (verify before any admission).** The admitted adapter cites
   **R.S.N.S. 1989, c. 93, s. 10(3)** (debt `(c)`, bankruptcy `(e)`), while the PHASE5-001C owner amendment's
   supplied statutory basis for Nova Scotia reads **c. 89, s. 11(3)**. The two citations disagree on both the
   chapter and the section. This is a concrete currency/conflict question; the official consolidated text could
   not be retrieved in this environment (CanLII 403, nslegislature.ca 404). **Recommended disposition:** do not
   rely on either figure until the current Nova Scotia consolidated statute is verified; the discrepancy must be
   recorded on the candidate record and resolved before the finding class is authorised. (This is a
   verification task, not a code task, and it does not block the record's return.)

## 9. Status (kept separate, per the closure policy)

- **Implementation:** this batch made **no** rule/permission change for this candidate; it is a returned admission
  proposal. FINDING-COVERAGE, ALL82-FACILITATION, DISPUTE-PACKET and SUBSCRIPTION blockers remain **OPEN**.
- **Staging / production:** unchanged and pending; not launch ready.
- **Non-retention note:** the "non-retention" qualifier is not satisfiable from the current report-only corpus
  (see §1). If a true non-retention report-content finding is required, that is a **new** legal admission, to be
  proposed separately; it is not enabled here.
