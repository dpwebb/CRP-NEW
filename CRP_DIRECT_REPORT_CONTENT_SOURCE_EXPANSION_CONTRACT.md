# CRP Direct Report-Content Source Expansion Contract

**Status:** Approved Corpus Contract — Rank 4  
**Contract version:** `CRP-DIRECT-REPORT-CONTENT-SOURCE-1`  
**Effective date:** 2026-09-29  
**Authority:** owner-issued PHASE4-001A

This contract authorizes a controlled expansion of CRP legal-source research beyond the digest-bound
legacy legal-corpus snapshot. It is subordinate to `CRP_CORE_CONSTITUTION.md`,
`CRP_LEGAL_INVARIANT.md`, `JURISDICTION_CONTRACT.md`, and
`CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md`.

The legacy legal corpus remains admitted source authority within its recorded boundary. Its prior
limitation-focused detector is not the boundary of the legal corpus and supplies no evaluator,
finding, scoring, confidence, extraction, or implementation authority.

## 1. Purpose

The sole purpose of this contract is to identify official primary legal sources that directly regulate
what a consumer reporting agency, credit reporting body, credit reference agency, or equivalent
regulated actor may include, omit, state, label, or display in a consumer report or consumer disclosure.

The expansion exists to support the product promise of surfacing only source-backed `VIOLATION` and
`PROBABLE_VIOLATION` findings from the consumer-uploaded credit report. It creates no rule, legal
coverage, finding, consumer workflow, report field, evidence channel, implementation, or test.

**Owner ruling PHASE5-001A:** the owner confirms that the current statute work has been rigorously
tested and authorizes the recorded source, jurisdiction, effective-period, and legal-test determinations
as truth for this build. Do not repeat that certification work absent a concrete source conflict,
amendment/repeal/supersession indicator, or identified record inconsistency. The owner authorizes Codex
to record and validate the exact report representation for each in-scope rule candidate. This ruling
does not convert catalogue gaps, refusals, or excluded provisions into candidates, and it does not by
itself admit an executable governed rule or authorize a finding; report representation, rule admission,
and the finding gates remain required.

## 2. Consumer-Evidence Boundary

The consumer-uploaded credit report remains the sole consumer-evidence input.

No research, source record, or later governed rule authorized by this contract may request, assume,
accept, or rely on consumer correspondence, dispute requests, bureau responses, furnisher responses,
court records, account records, payment records, identity documents, police reports, affidavits,
external confirmations, consumer statements, or any other off-report evidence.

Official legal-source retrieval is permitted solely to establish legal-source evidence. It never creates
an additional consumer-evidence channel.

## 3. Eligible Source Scope

An eligible source must satisfy every condition below:

1. It is official primary legal material, an expressly owner-approved official source published by a
   legislature, court, regulator, government legal publisher, or official government repository, or a
   digest-bound certified legal-content baseline record admitted by
   `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`.

   A certified-baseline record may supply the legal content, source metadata, citation, source pin,
   effective information, jurisdiction scope, and recorded legal proposition that it contains. It must be
   used without independently repeating legal research. A live official-source access failure does not
   invalidate or suspend the certified baseline. Fresh official retrieval is required only to augment a
   recorded gap or missing detail, or where a specific amendment, repeal, supersession, source-pin issue,
   or other concrete change indicates that the certified baseline may no longer represent applicable law.
   No excluded legacy behavior becomes admitted through this paragraph.
2. It applies to an exact `COUNTRY_CODE` plus `REGION_CODE` in `CRP-JURISDICTION-ENUM-1`, or it is a
   federal or country-wide source whose relationship to an exact selected pair can later be stated
   explicitly in a governed rule.
3. It directly regulates content that is furnished in, appears in, is omitted from, is labelled in,
   or is otherwise represented by a consumer report or consumer disclosure.
4. Its potential breach test can be based on an explicit, resolved representation or omission in the
   uploaded report itself.
5. Its legal effect and temporal applicability can be pinned to an identifiable source version. A
   digest-bound certified-baseline record admitted under
   `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md` satisfies this condition as the source pin even when
   the formal statutory publication or historical version is not recorded: an unrecorded formal edition
   is recorded as an administrative limitation and is not, by itself, a ground to exclude the source.

Eligible research countries are limited to the canonical countries already governed by the jurisdiction
enumeration:

```text
US
CA
GB
AU
```

## 4. Permanent Exclusions

The following are outside this contract and may not be admitted through it:

- limitation, accrual, debt-enforcement, or retention rules whose legal clock requires proving a true
  external event, unless the only unresolved fact is that underlying historical event and the rule
  satisfies the report-assertion probable-finding gate in Sections 6 and 7;
- rules whose affirmative breach element requires a consumer request, notice, dispute, identity-theft
  report, police report, identity document, external confirmation, court record, account record, payment
  record, recipient or report-use condition, fee, response, procedure, or actor conduct; this exclusion
  does not apply to an express statutory exception that is handled as an `UNRESOLVED_EXCEPTION` under
  Sections 6 and 7;
- duties defined by bureau, furnisher, creditor, court, government, user, or other actor conduct not
  established by explicit report content;
- permissible-purpose, marketing, fee, website, request-channel, privacy-process, dispute-process,
  security-freeze, fraud-alert, identity-theft, or procedural rules;
- industry notices, bureau policies, informal summaries, commentary, secondary databases, model output,
  prior implementation, legacy behavior, and unverified mirrors;
- rules that would treat a prohibited prerequisite as a `DECISIVE_FACT`.

A report representation never establishes that an underlying external historical event is true. Subject
only to Sections 6 and 7, it may establish strong deterministic evidence for a later
`PROBABLE_VIOLATION` rule.

## 5. Required Source-Discovery Record

Every discovered candidate must record all of the following before it may be considered for later
governed-rule design:

| Field | Requirement |
| --- | --- |
| `DISCOVERY_ID` | Immutable unique discovery identifier. |
| `COUNTRY_CODE` | Exact canonical country code. |
| `REGION_CODE` | Exact canonical region code, or explicit country-wide/federal relation pending later rule design. |
| `OFFICIAL_PUBLISHER` | Identified issuing body or official source holder. |
| `INSTRUMENT_TITLE` | Exact legal instrument title. |
| `CITATION` | Stable consumer-displayable legal citation. |
| `OFFICIAL_LOCATION` | Exact official canonical source location. |
| `APPLICABILITY_STATUS` | `DETERMINED`, `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION`, `NOT_APPLICABLE`, or `UNRESOLVED`. This describes legal applicability, not whether a statutory exception applies. |
| `APPLICABILITY_BASIS` | Exact recorded basis for the applicability status, distinguishing jurisdiction, preemption/savings analysis, and statutory exceptions. |
| `APPLICABILITY_QUALIFICATION` | Required plain-English caveat for `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION`; otherwise `NOT APPLICABLE`. |
| `SOURCE_VERSION` | The exact official publication, consolidation, or amendment version when recorded; otherwise the exact digest-bound certified-baseline snapshot (artifact path, SHA-256, and source-recorded verification date) as the source pin, while stating that the formal statutory version is `NOT RECORDED`. A digest identifies the snapshot/provenance; it is not itself a statutory edition. |
| `RETRIEVED_AT_UTC` | Retrieval timestamp. |
| `EFFECTIVE_FROM` | Determined effective or operative start, or explicit unresolved status. |
| `EFFECTIVE_TO` | Determined end, `OPEN_ENDED`, or explicit unresolved status. |
| `TEMPORAL_STATUS` | `DETERMINED`, `CURRENT_SOURCE_DATE_ONLY`, or `REPORT_DATE_UNAVAILABLE`. The latter two may support only `PROBABLE_CANDIDATE` and require a plain-English timing qualification. |
| `EVIDENCE_TEXT` | Exact quoted source text sufficient to verify the bounded proposition. |
| `REPORT_REPRESENTATION` | Exact report field, statement, label, or omission that corresponds to the source rule. |
| `DECISIVE_HISTORICAL_FACTS` | Closed list of historical facts represented explicitly in the report but whose truth cannot be established from the report; empty for a confirmed-violation candidate. |
| `OFF_REPORT_PREREQUISITES` | Closed list of prohibited conditions that are affirmative breach elements: request, document, external-confirmation, recipient/use, fee, response, procedure, or actor conduct. A non-empty list excludes the candidate. |
| `UNRESOLVED_EXCEPTIONS` | Closed list of express statutory exceptions not affirmatively established by the uploaded report. An exception belongs here only when it is not an affirmative breach element and every affirmative legal element remains report-resolved. |
| `SOURCE_STATUS` | `CONFIRMED_CANDIDATE`, `PROBABLE_CANDIDATE`, `EXCLUDED`, or `UNRESOLVED`. |
| `EXCLUSION_REASON` | Required unless `SOURCE_STATUS` is `CONFIRMED_CANDIDATE` or `PROBABLE_CANDIDATE`. |

## 6. Candidate Gate

A discovery record may be marked `CONFIRMED_CANDIDATE` only when:

1. `DECISIVE_HISTORICAL_FACTS` and `OFF_REPORT_PREREQUISITES` are both empty;
2. the source directly supports the proposed report representation;
3. the representation and every legal element can be resolved from the uploaded report without inference;
4. the source establishes a prohibition capable of a deterministic later breach test;
5. the source pin identifies the exact relied-on text and the effective period is determined; and
6. `APPLICABILITY_STATUS = DETERMINED` for the exact jurisdiction relationship.

A discovery record may be marked `PROBABLE_CANDIDATE` only when:

1. `OFF_REPORT_PREREQUISITES` is empty;
2. each `UNRESOLVED_EXCEPTION` is an express statutory exception rather than an affirmative breach
   element, and the uploaded report does not affirmatively establish that the exception applies;
3. `DECISIVE_HISTORICAL_FACTS` contains only the underlying historical fact or facts explicitly
   represented in the uploaded report;
4. the source makes each listed historical fact material to the legal threshold;
5. every affirmative legal element other than a permitted report-stated historical fact is resolved from
   the uploaded report without inference;
6. the report contains no resolved contradiction of the representation;
7. the source establishes a prohibition capable of a deterministic later breach test;
8. the source pin identifies the exact relied-on text and the source is recorded as current or in force,
   and either:
   - the effective period is determined (`TEMPORAL_STATUS = DETERMINED`), or
   - exact historical timing remains unresolved (`TEMPORAL_STATUS = CURRENT_SOURCE_DATE_ONLY`), or
   - the report contains no usable date for comparison (`TEMPORAL_STATUS = REPORT_DATE_UNAVAILABLE`);
9. when `TEMPORAL_STATUS` is not `DETERMINED`, the later governed rule can support only
   `PROBABLE_VIOLATION` and must give the consumer a plain-English timing qualification; and
10. `APPLICABILITY_STATUS` is either `DETERMINED` or
    `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` for the exact jurisdiction relationship.

The latter status is permitted only when the admitted certified source identifies a specific,
outcome-relevant federal preemption or savings-clause question, expressly retains the state provision
as recorded rather than suppressing it, and does not determine that the provision is preempted or
inapplicable. `APPLICABILITY_BASIS` must quote or precisely identify that recorded legal question.
`APPLICABILITY_QUALIFICATION` must tell the consumer in plain English that the state rule may apply,
but its interaction with the identified federal provision remains unresolved. Such a record may support
only a `PROBABLE_CANDIDATE`, never a `CONFIRMED_CANDIDATE` or `VIOLATION`. Do not enter this
legal-applicability uncertainty as an `UNRESOLVED_EXCEPTION` or an `OFF_REPORT_PREREQUISITE`.

`APPLICABILITY_STATUS = NOT_APPLICABLE` is not a candidate. `APPLICABILITY_STATUS = UNRESOLVED`
for any reason other than the specifically permitted unresolved-preemption status above is not a
candidate; identify the unresolved basis in `EXCLUSION_REASON`.

### Owner decision: report-event dates, partial limbs, and discovery accounting

For this contract, the uploaded report is the sole consumer-evidence source. A date may be treated as
a legally relevant event date only when the report explicitly identifies that date as the particular
event named by the statute (for example, an inquiry/request date or a bureau collection date). A generic
account date, update date, report date, or nearby date is not a substitute. A missing canonical parser
field does not establish that the uploaded report lacks the information: inspect the actual report
representation. If the event/date mapping is not explicit or cannot be verified, keep the source record
`UNRESOLVED` pending report-field mapping; do not infer the event and do not exclude it solely because a
legacy engine or parser schema lacks a field. No additional consumer evidence may be requested.

For Australia Privacy Act 1988 (Cth) s 20W and its inquiry-retention limb (catalogue entry
`CRP-LSRC-0422`), the new build does not inherit the legacy application's counts-only exclusion. An
inquiry may be a candidate only if the uploaded report explicitly identifies the inquiry and gives the
exact date the information request was made. If that exact representation is absent or its mapping is
unverified, record `UNRESOLVED`, not `EXCLUDED` solely on the legacy counts-only rule. The inquiry
exception remains separately recorded and non-suppressing unless the report affirmatively establishes
it; this decision creates no finding and does not modify the legacy application.

For Australia Privacy Act 1988 (Cth) s 20W items 4, 5, 6, 7, and 9 (`CRP-LSRC-0423`–`0425` and
`CRP-LSRC-0427`), the relevant date must be explicitly represented as the bureau's collection of the
information. A generic account, default, payment, update, or report date is insufficient. Until an
exact report representation and field mapping are verified, the applicable source-discovery record is
`UNRESOLVED`, not excluded because the existing parser lacks a collection-date field.

A source record may be a candidate for a separately operable statutory limb or alternative only when
the admitted source text supports that limb as an independently testable legal proposition. Record the
exact subsection/limb and its own report representation; do not split conjunctive requirements or treat
one part of a combined test as independently sufficient. This permits the previously identified narrow
limb paths for `CRP-LSRC-0288` (the omitted source/court-information limb only) and `CRP-LSRC-0319`
(PIPEDA Schedule 1, clause 4.6 completeness/omission only, not clause 4.9 request handling). For
`CRP-LSRC-0354` (Nova Scotia Credit Reporting Act s 10(3)(c)), preserve the distinct last-payment-date
and no-payment/default-date alternatives; until the report's exact presentation is verified to map to
the last-payment event, its status is `UNRESOLVED`, not excluded due to an unverified canonical field.

Each catalogue ID receives one source-record disposition. Duplicate IDs do not create multiple legal
provisions: retain an explicit canonical/duplicate cross-reference and count the underlying legal
provision once in legal-rule totals, while counting each catalogue ID once in source-record totals.
Do not infer duplicate relationships from adjacency or array order. An unresolved wildcard/gap entry
remains a gap and does not suppress a separate exact-jurisdiction source. Unmapped family codes remain
opaque identifiers; do not infer or invent their legend.

For the completed PHASE4-002I-B20 inventory, apply the above mapping gate to `CRP-LSRC-0422`,
`CRP-LSRC-0423`, `CRP-LSRC-0424`, `CRP-LSRC-0425`, `CRP-LSRC-0427`, and `CRP-LSRC-0354`:
classify each as `UNRESOLVED` until its exact report-event/date mapping is verified. This replaces an
`EXCLUDED` disposition based solely on a legacy/parser field limitation; it does not make any of these
records a candidate yet. The resulting B20 source-record tally was recorded as 39 `PROBABLE_CANDIDATE`, 380
`EXCLUDED`, and 18 `UNRESOLVED` (39 + 380 + 18 = 437). Under owner disposition PHASE5-001M that tally is
preserved as an unattributed historical record: its per-ID inventory is absent from this workspace,
no catalogue ID is assigned to any of its classes, and it is not a certified operational count or a
starting count for any downstream step. Every current count must state the evidence it rests on, the
meaning it carries and the limitations that remain unresolved. The distinct underlying legal-provision candidate count
must be reported separately after duplicate cross-references are reconciled.

A digest-bound certified-baseline snapshot, identified by artifact path, SHA-256, and its recorded
verification date, is a sufficient source pin for the exact legal text represented by that snapshot.
It does not establish the formal statutory publication or consolidation edition. State that formal
edition as `NOT RECORDED` when unavailable. A certified snapshot whose source record states the
rule is current or in force may satisfy the source-pin condition for `PROBABLE_CANDIDATE`; it does
not satisfy the effective-period condition for `CONFIRMED_CANDIDATE`.

**Report-only medical-debt content classification (PHASE4-002H).** For an item presented as medical
debt under New York Gen. Bus. Law § 380-j(a)(3), a discovery record is classified as follows:

1. The explicit report label or description by which the bureau identifies an item as medical debt
   establishes the report-content representation — that is, what the bureau represented in the report.
2. The consumer may not be required to prove the underlying transaction, provider, service, product,
   device, debt validity, or actual medical origin before the item may be surfaced as a
   `PROBABLE_CANDIDATE`.
3. Medical debt may not be inferred solely from a furnisher or provider name, a statistical proxy, or
   an absent report field.
4. The credit-card carve-out recorded in § 380-a(v) remains an `UNRESOLVED_EXCEPTION` when the uploaded
   report does not establish whether it applies. Unknown status is neither proof that the exception
   applies nor proof that it does not apply, and it does not suppress the probable candidate.
5. When the uploaded report itself affirmatively establishes that the credit-card carve-out applies,
   the item is not a candidate under this rule.
6. This rule is a report-only product classification decision. It is not a judicial resolution of the
   scope of the statute and not a statement that the underlying debt legally qualifies as medical debt.
7. The timing and applicability constraints of this section are retained: an unresolved effective
   period or an unresolved preemption means no `CONFIRMED_CANDIDATE`, so the result is no higher than
   `PROBABLE_CANDIDATE` under the gates above.
8. The underlying medical-origin question may not be placed in `OFF_REPORT_PREREQUISITES`, and the
   truth of that origin may not be listed in `DECISIVE_HISTORICAL_FACTS` for the report-only candidate
   when the explicit label or description itself establishes the representation.

This rule classifies a source-discovery candidate only. It adds no consumer-evidence channel, decides
no preemption question, and changes no other clause of this contract.
**Washington report-only medical-debt content classification (PHASE4-002I-B12-R2).** For an item presented as medical debt under Washington RCW 19.182.040(1)(g), a discovery record is classified as follows:

1. An explicit report label or description by which the bureau identifies an item as medical debt establishes the report-content representation for candidate classification, even if the report has no dedicated canonical field.
2. The consumer may not be required to prove the underlying transaction, provider, service, product, device, debt validity, or actual medical origin before the item may be surfaced as a `PROBABLE_CANDIDATE`.
3. Medical debt may not be inferred solely from a furnisher or provider name, statistical proxy, code, or absent report field.
4. The unresolved scope of the definition incorporated from RCW 19.16.100 is recorded as an undecided statutory-scope qualification. It is not an express exception, not an off-report prerequisite, and not proof that the item is or is not covered. Its unresolved status does not suppress the probable candidate.
5. Any express statutory exception remains separately recorded. An exception not affirmatively established by the uploaded report does not suppress an otherwise report-supported candidate; if the report affirmatively establishes the exception, the item is not a candidate.
6. This is a report-only product classification decision for RCW 19.182.040(1)(g) alone. It is not a judicial resolution of RCW 19.16.100, a statement that the underlying debt legally qualifies as medical debt, or a decision about another provision or jurisdiction.
7. The timing and applicability constraints of this contract remain in force. An unresolved effective period or preemption question caps the record at `PROBABLE_CANDIDATE`; it does not create a governed rule or finding.

This rule classifies a source-discovery candidate only. It adds no consumer-evidence channel, decides no preemption question, and creates no finding.

**California report-only medical-debt content classification (PHASE4-002I-B14-R1).** For an item presented as medical debt under Cal. Civ. Code § 1785.13(a)(7), a discovery record is classified as follows:

1. An explicit report label or description by which the bureau identifies an item as medical debt establishes the report-content representation for candidate classification, even if the report has no dedicated canonical field.
2. The consumer may not be required to prove the underlying transaction, provider, service, product, device, debt validity, or actual medical origin before the item may be surfaced as a `PROBABLE_CANDIDATE`.
3. Medical debt may not be inferred solely from a creditor or furnisher name, statistical proxy, code, or absent report field.
4. The unresolved scope of the definition incorporated from Cal. Civ. Code § 1785.3(j) is an undecided statutory-scope qualification. It is not an express exception, not an off-report prerequisite, and not proof that the item is or is not covered. Its unresolved status does not suppress the probable candidate.
5. Any express statutory exception remains separately recorded. An exception not affirmatively established by the uploaded report does not suppress an otherwise report-supported candidate; if the report affirmatively establishes the exception, the item is not a candidate.
6. This is a report-only product classification decision for Cal. Civ. Code § 1785.13(a)(7) alone. It is not a judicial resolution of § 1785.3(j), a statement that the underlying debt legally qualifies as medical debt, or a decision about another provision or jurisdiction. It does not extend to Cal. Civ. Code § 1785.27.
7. The timing and applicability constraints of this contract remain in force. An unresolved effective period or preemption question caps the record at `PROBABLE_CANDIDATE`; it does not create a governed rule or finding.

This rule classifies a source-discovery candidate only. It adds no consumer-evidence channel, decides no preemption question, and creates no finding.

### Owner direction: acceptance, duplicate bookkeeping and coverage planning (PHASE5-001O)

Under the owner directive recorded by PHASE5-001O:

1. The relevant statutes currently in the legacy system have survived rigorous legal review and are
   accepted as legal truth. The recorded legal content of a digest-bound certified-baseline record is
   `OWNER_ACCEPTED_LEGAL_AUTHORITY`.
2. Missing provenance, a missing historical version and the absence of a prior-review record are not
   prerequisites for accepting a statute, for including it as section 3 eligible source scope, or for
   coverage planning. They are recorded as administrative limitations.
3. Broadly relevant statutory provisions are included. Where the legacy corpus establishes that one
   provision supports more than one rule, jurisdiction or report condition, that recorded relationship
   is used; no relationship the corpus does not record may be inferred or broadened.
4. Guidance, policy summaries, industry notices and extracted propositions are not converted into
   statutes by the owner's acceptance of statutes. They remain recorded material and need their own
   classification before they are treated as statutory sources.
5. Duplicate bookkeeping and an exact corpus-wide unique-provision count are administrative. An
   unresolved duplicate identity or an uncertified count is recorded as an administrative limitation
   and must not block acceptance, `SOURCE_STATUS` planning or coverage planning.
6. Acceptance is owner-directed and is recorded as such. It is not independent verification performed
   by this or any other work order.
7. Nothing in this subsection changes section 2, the permanent exclusions of section 4, the required
   fields of section 5, the candidate conditions of section 6, or the finding boundary: no rule,
   candidate, coverage or finding is created by it.

A discovery record is source research only. It is not a governed legal rule, does not create coverage,
and cannot emit a finding.

## 7. Relation to PROBABLE_VIOLATION

The report-assertion route in `CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md` Section 5 applies only after a
later governed rule is admitted with complete required fields and official source evidence.

A `PROBABLE_CANDIDATE` identifies only a possible future rule-design path. It does not decide that a
`PROBABLE_VIOLATION` exists. A later governed rule must identify the exact report representation, the
exact listed `DECISIVE_HISTORICAL_FACTS`, every resolved legal element, the no-contradiction condition,
and the consumer-displayable source citation.

This contract never permits a request, notice, dispute, identity-theft report, police report, identity
document, external confirmation, court record, account record, payment record, bureau action, furnisher
action, creditor action, recipient or report-use condition, fee, response, procedure, or actor-conduct
condition to be moved into `DECISIVE_HISTORICAL_FACTS`.

## 8. Current State

```text
EXPANDED-SCOPE SOURCE DISCOVERIES: 0
EXPANDED-SCOPE GOVERNED LEGAL RULES: 0
EXPANDED-SCOPE GOVERNED JURISDICTIONS: 0
EXPANDED-SCOPE PERMITTED FINDINGS: 0
```

## 9. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-29 | PHASE4-001A | Created the controlled official-primary-source expansion boundary for direct report-content research. No source discovery, legal rule, legal coverage, finding, consumer-evidence channel, or implementation was created. |
| 2026-09-29 | PHASE4-001D | Valid owner amendment: allowed a report-stated historical fact to support later PROBABLE_VIOLATION rule design only when every other legal element is report-resolved. Requests, documents, recipient/use conditions, fees, procedures, and actor conduct remain permanently excluded. No rule, coverage, source discovery, or finding was created. |
| 2026-09-29 | PHASE4-001D-A | Valid owner amendment: aligned the source-discovery exclusion-reason field with the CONFIRMED_CANDIDATE and PROBABLE_CANDIDATE statuses. No rule, coverage, source discovery, or finding was created. |
| 2026-09-29 | PHASE4-001O | Valid owner amendment: an unresolved statutory exception no longer suppresses an otherwise report-resolvable issue. An exception shown by the report defeats the issue; an unshown exception is disclosed as an `UNRESOLVED_EXCEPTION` and may support only a `PROBABLE_VIOLATION`. No additional consumer evidence may be requested. |
| 2026-09-29 | PHASE4-001S | Valid owner amendment: permits the certified digest-bound legacy legal corpus to supply direct-content source-discovery evidence within its recorded scope. A live official-source access failure does not suppress that certified truth; fresh retrieval is limited to concrete gaps or change indicators. Excluded legacy detector behavior remains excluded. |
| 2026-09-29 | PHASE4-001T | Valid owner amendment: unresolved legal timing no longer silently suppresses an otherwise report-supported issue. Exact timing remains required for `VIOLATION`; a current or in-force certified source with unresolved historical timing may support only `PROBABLE_VIOLATION` with a plain-English temporal qualification. No additional consumer evidence may be requested. |
| 2026-09-29 | PHASE4-002D | Valid owner amendment: distinguishes a digest-bound certified-baseline source pin from a formal statutory edition and permits a report-resolvable probable candidate to preserve a specifically recorded, unresolved federal preemption/savings question as a separate applicability qualification. Such a candidate can never support a confirmed candidate or violation. No legal preemption question was decided; no rule, coverage, or finding was created. |
| 2026-09-29 | PHASE4-002H | Valid owner amendment: report-only product classification rule. An explicit bureau report label or description that an item is medical debt establishes the report-content representation for candidate classification, so proof of the underlying transaction, provider, service, product, device, debt validity, or actual medical origin may not be required before a `PROBABLE_CANDIDATE`; medical debt may not be inferred solely from a furnisher or provider name, statistical proxy, or absent field; the § 380-a(v) credit-card carve-out remains an `UNRESOLVED_EXCEPTION` whose unknown status neither proves nor disproves it and does not suppress the candidate, and it defeats candidacy when the report itself establishes it; the origin question stays out of `OFF_REPORT_PREREQUISITES` and is not a `DECISIVE_HISTORICAL_FACT` for a candidate whose representation is established by the explicit label or description; unresolved effective period or preemption still caps the record at `PROBABLE_CANDIDATE`. This is a report-only product decision, not a judicial resolution of the scope of the statute. No rule, coverage, source discovery, or finding was created. |
| 2026-09-29 | PHASE4-002I-B12-R2 | Valid owner amendment: records the report-only classification decision for Washington RCW 19.182.040(1)(g): an explicit bureau label or description identifying an item as medical debt may support a `PROBABLE_CANDIDATE` without proof of underlying origin; the RCW 19.16.100 scope question remains visible and unresolved; the decision is limited to this provision and creates no governed rule or finding. |
| 2026-09-29 | PHASE4-002I-B14-R1 | Valid owner amendment: extends report-only candidate classification to an explicit bureau label or description of medical debt under Cal. Civ. Code § 1785.13(a)(7), without requiring proof of underlying origin; the Cal. Civ. Code § 1785.3(j) scope question remains visible and unresolved; the decision is limited to § 1785.13(a)(7), does not extend to § 1785.27, and creates no governed rule or finding. |
| 2026-09-29 | PHASE4-002I-B20-OWNER-DECISIONS | Valid owner amendment: establishes exact report-event/date mapping, rejects parser-schema absence as proof of report-level absence, permits narrowly scoped independently operable statutory limbs, separates source-record counts from unique legal-provision counts, preserves wildcard gaps and opaque family identifiers, and reclassifies six B20 records to `UNRESOLVED` pending report-field mapping (39 probable candidates, 380 excluded, 18 unresolved). It does not create governed rules, findings, or additional consumer-evidence channels and does not amend the legacy application. |
| 2026-09-29 | PHASE5-001A | Valid owner ruling: accepts the current statute work's tested source, jurisdiction, effective-period, and legal-test determinations as authorized truth; authorizes Codex to record and validate report representations. Concrete change indicators and record inconsistencies remain reviewable. This does not convert gaps, refusals, or excluded provisions into candidates, admit governed rules, or independently authorize findings. |
| 2026-09-30 | PHASE5-001M | Valid owner amendment: section 6 owner-decision block. The PHASE4-002I-B20 aggregate is recorded as a preserved, unattributed historical record with per-ID basis MISSING_EVIDENCE; no catalogue ID is assigned to any of its classes, and it is not a certified operational count or a starting count for any downstream step. Every current count must state the evidence it rests on, the meaning it carries and the limitations that remain unresolved. The mapping gate for CRP-LSRC-0422, 0423, 0424, 0425, 0427 and CRP-LSRC-0354, the separate duplicate-identity requirement, the six identity-unresolved clusters (0315/0316/0317/0318/0320, 0149/0150, 0165/0166, 0409/0411, 0336/0349, 0337/0351), the separate unique-legal-provision count and every other condition of this contract are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001M_B20_DISPOSITION_AND_GATE_5_1_AMENDMENT.md. No rule, coverage, source discovery, finding, candidate or count was created or certified, and Gate 5.1 is not passed by this amendment. |
| 2026-09-30 | PHASE5-001O | Valid owner amendment: section 3 condition 5 now records that a digest-bound certified-baseline record satisfies the source-pin condition and that an unrecorded formal edition is an administrative limitation, and section 6 gains the owner direction that the relevant legacy statutes are `OWNER_ACCEPTED_LEGAL_AUTHORITY`, that missing provenance, historical versions and prior-review records are not acceptance prerequisites, that a recorded provision may support more than one rule, jurisdiction or report condition where the legacy corpus establishes it, that guidance, policy summaries and extracted propositions are not thereby converted into statutes, and that duplicate bookkeeping and an uncertified unique-provision count are administrative limitations that do not block acceptance or coverage planning. Acceptance is recorded as owner-directed, not as independent verification. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md. No rule, coverage, source discovery, finding, candidate or count was created or certified, and no gate is passed by this amendment. |

