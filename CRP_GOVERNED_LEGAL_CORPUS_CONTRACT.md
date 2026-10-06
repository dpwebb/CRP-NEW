# CRP Governed Legal Corpus Contract

**Status:** Approved Corpus Contract — Rank 4  
**Effective date:** 2026-09-29

This contract defines the required form, evidence, and admission conditions for a governed legal-rule
corpus. It is subordinate to `CRP_CORE_CONSTITUTION.md`, `CRP_LEGAL_INVARIANT.md`, and
`JURISDICTION_CONTRACT.md`.

No legal rule exists in this contract. No jurisdiction receives legal coverage merely because it is
enumerated in `CRP_JURISDICTION_ENUMERATION.md`.

**Owner ruling PHASE5-001A:** the owner confirms that the current statute work has been rigorously
tested and authorizes its recorded source, jurisdiction, effective-period, and legal-test determinations
as truth for this build. Codex is authorized to record and validate the exact report representation for
each in-scope rule candidate. Do not repeat the authorized legal/source certification absent a concrete
source conflict, amendment/repeal/supersession indicator, or identified record inconsistency. This owner
ruling does not itself admit a governed rule or legal coverage: each rule still requires a complete
record under this contract, and findings remain unavailable until rule admission and the applicable
report-only evaluation gates pass.

**Owner directive PHASE5-001O:** the relevant statutes currently in the legacy system have survived
rigorous legal review and are accepted as legal truth; their recorded legal content is
`OWNER_ACCEPTED_LEGAL_AUTHORITY`. Acceptance is owner-directed and is not independent verification
performed by any work order. Missing provenance, a missing historical version and the absence of a
prior-review record are not prerequisites for accepting a statute, for re-expressing it, or for coverage
planning, and are recorded as administrative limitations. Broadly relevant statutory provisions are
included, and one accepted provision may support more than one rule, jurisdiction or report condition
where the legacy corpus establishes that relationship as recorded. Guidance, policy summaries, industry
codes, notices and extracted propositions are not converted into statutes by that acceptance. Duplicate
bookkeeping and an exact corpus-wide unique-provision count are administrative limitations that do not
block re-expression, admission work or coverage planning. This directive does not admit a governed rule,
create legal coverage, or authorise a finding.



## 1. Purpose and Boundary

A governed legal rule is eligible for analysis only when it is admitted in a later approved legal-rule
corpus that conforms to this contract. The corpus, not a model, analyst, implementation, test,
comment, legacy artifact, or general legal intuition, determines rule existence and applicability.

This contract defines no legal proposition, legal coverage, violation, probable violation, report-fact
extraction, evaluation implementation, consumer-facing output, or legal advice.

## 2. Required Rule Identity

Every admitted rule must have one immutable `RULE_ID`. A `RULE_ID` must be unique across the governed
legal corpus and must never be reassigned to a different rule after retirement.

Every rule entry must identify exactly:

| Required field | Requirement |
| --- | --- |
| `RULE_ID` | Immutable, unique corpus identifier. |
| `RULE_VERSION` | Immutable version identifier for the admitted rule text and metadata. |
| `JURISDICTION_VERSION` | `CRP-JURISDICTION-ENUM-1`, unless a later approved enumeration explicitly supersedes it. |
| `COUNTRY_CODE` | Exact canonical country code from the governing jurisdiction enumeration. |
| `REGION_CODE` | Exact canonical region code from the governing jurisdiction enumeration. |
| `SOURCE_ID` | Immutable identifier for the recorded legal source evidence. |
| `SOURCE_PIN` | Immutable official source-version pin or exact digest-bound certified-baseline snapshot pin sufficient to identify the relied-on text. A baseline digest identifies the snapshot, not the formal statutory edition; record a formal edition as `NOT RECORDED` when unavailable. |
| `EFFECTIVE_FROM` | Date from which the rule may apply. |
| `EFFECTIVE_TO` | Date on which the rule ceases to apply, or explicit `OPEN_ENDED` when the source establishes that no end is set. |
| `RULE_TEXT` | Exact admitted legal proposition, traceable to the recorded source evidence. |
| `APPLICABILITY_STATUS` | `DETERMINED`, `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION`, `NOT_APPLICABLE`, or `UNRESOLVED`. |
| `APPLICABILITY` | Explicit statement of why the rule applies, may apply subject to the identified unresolved preemption/savings question, or does not apply to the exact selected `COUNTRY_CODE` + `REGION_CODE` pair. |
| `APPLICABILITY_QUALIFICATION` | Required consumer-facing plain-English caveat for `POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION`; otherwise `NOT APPLICABLE`. |
| `REQUIRED_FACTS` | Closed list of report-determinable facts required to evaluate the rule. |
| `DECISIVE_FACTS` | Closed list of facts whose genuine report-level unavailability would be decisive for a possible `PROBABLE_VIOLATION`. |
| `BREACH_TEST` | Deterministic condition that establishes breach from applicable resolved facts. |
| `CONSUMER_CITATION` | Citation capable of being shown to the consumer. |

A rule entry must not use a country code, region code, display name, alias, free-text selector, or
conversion rule outside the governing jurisdiction enumeration.

## 3. Source-Evidence Requirements

Each `SOURCE_ID` must have a recorded source-evidence record containing all of the following:

| Required field | Requirement |
| --- | --- |
| Publisher | Identified issuing body or official source holder. |
| Instrument title | Exact title of the legal instrument or official publication. |
| Citation | Stable legal or official citation capable of consumer display. |
| Canonical location | Exact source URL or other stable official location. |
| Retrieved at | UTC retrieval timestamp. |
| Source version | Publication, consolidation, amendment, decision, or other version information available from the source. |
| Evidence text | Exact quoted source text or a permitted immutable evidence reference sufficient to verify `RULE_TEXT`. |
| Licence or access status | Recorded reuse, access, or citation status. |
| Integrity evidence | Hash or other immutable evidence identifier when technically and legally available. |

A source must be official primary legal material, another expressly owner-approved official source, or
a digest-bound record from the certified legacy legal-content baseline admitted by
`CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`. A certified-baseline record is source evidence only
for the legal content, source metadata, citation, source pin, effective information, and jurisdiction
scope it records; it is not executable authority and does not admit any excluded legacy behavior.

A later approved legal-rule corpus may re-express a certified-baseline record without independently
redoing its legal research. A targeted official-source freshness check is required only where a
specific source pin, effective period, amendment, repeal, supersession, or other concrete change
indicates that the recorded baseline source may no longer represent applicable law.

For a certified-baseline record, acceptance is governed by `CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md`
§3.1 (owner directive PHASE5-001O): the recorded legal content is `OWNER_ACCEPTED_LEGAL_AUTHORITY`, and
missing provenance, a missing historical version or the absence of a prior-review record is recorded as
an administrative limitation rather than treated as a source-evidence failure. The remaining source
fields are recorded as the baseline records them; a field the baseline does not carry is recorded
`NOT RECORDED`, not invented.



Commentary, summaries, model output, informal practice, unofficial databases, prior implementation
outside the certified baseline, and excluded legacy material are not source evidence.

## 4. Applicability and Time

A rule applies only to the exact consumer-selected `COUNTRY_CODE` + `REGION_CODE` pair identified in
the rule entry. A country-level, federal, national, devolved, provincial, state, territorial, or
other rule must explicitly state its relationship to that exact pair and record `APPLICABILITY_STATUS`.

`APPLICABILITY_STATUS = DETERMINED` means the exact jurisdictional relationship and any recorded
legal displacement question are resolved. `NOT_APPLICABLE` means the rule is determined not to apply,
including where the certified legal source records that it is preempted. `UNRESOLVED` means the
applicability question is not resolved and does not meet the limited probable-candidate condition below.

`POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` is allowed only where the certified source expressly
records a specific federal preemption or savings-clause question as undecided, retains the state
provision as recorded rather than suppressing it, and does not determine that the provision is
preempted or inapplicable. The exact question must be recorded in `APPLICABILITY`, and
`APPLICABILITY_QUALIFICATION` must state the uncertainty in plain English. This status is not a
finding that the state rule is enforceable or that federal law does not preempt it.

A rule may support a `VIOLATION` only when `APPLICABILITY_STATUS = DETERMINED` and its effective
period can be determined for the relevant report fact or event.

A rule may support only a `PROBABLE_VIOLATION` when its source pin identifies the exact official
text or digest-bound certified-baseline snapshot, the certified baseline or official source records
the rule as current or in force, and the exact historical effective period cannot be fully determined.
A digest-bound baseline snapshot identifies the relied-on text even if the formal statutory edition is
not recorded; the formal edition must remain explicitly marked `NOT RECORDED` when unavailable. The
later governed rule must identify `TEMPORAL_UNCERTAINTY`, must not state or imply that the rule
definitely applied on the report date, and must explain the timing qualification to the consumer in
plain language.

A rule with `APPLICABILITY_STATUS = POTENTIALLY_APPLICABLE_UNRESOLVED_PREEMPTION` may support only
a `PROBABLE_VIOLATION`, and only if every other applicable gate in this contract is satisfied. The
later governed rule must state that applicability remains unresolved because of the specifically
identified federal preemption/savings question. It must not call the result a `VIOLATION` or imply
that the question has been legally resolved.

If the uploaded report affirmatively establishes that its relevant date predates the known effective or
operative start, or follows the known effective end, the rule may not emit a finding. CRP must not request
additional consumer evidence to resolve temporal or applicability uncertainty.

A rule for one jurisdiction never supplies authority for another jurisdiction. No geographic,
linguistic, legal-system, similarity, or model-based analogy is permitted.

## 5. Deterministic Evaluation Requirements

`REQUIRED_FACTS`, `DECISIVE_FACTS`, and `BREACH_TEST` must be sufficiently specific to support a
deterministic later evaluation.

A `VIOLATION` is unavailable unless every required report-determinable fact is reliably resolved and
the deterministic breach test establishes breach.

A `PROBABLE_VIOLATION` is unavailable unless the rule’s decisive facts are individually identified,
strong deterministic evidence supports likely breach, and each decisive fact is genuinely unavailable
from the report. `EXTRACTION_UNRESOLVED`, parser failure, and extraction limitation are never evidence
that a decisive fact is genuinely unavailable.

For a `PROBABLE_VIOLATION` only, a resolved and explicit report representation may supply strong
deterministic evidence when a later governed rule identifies the exact represented field or statement,
its report location, the corresponding legal fact, and the precise legal proposition supported by
official source evidence. The representation establishes only what the report states. It never
establishes that an underlying historical event, court record, payment, account event, consumer request,
identity document, bureau record, furnisher action, response, procedure, or other off-report fact is true.

A later governed rule may designate an unavailable underlying historical fact as a `DECISIVE_FACT` for
`PROBABLE_VIOLATION` when all of the following are true: the official source makes that fact material to
the legal threshold; the uploaded report explicitly represents that same fact; every legal element other
than the truth of that represented historical fact is reliably resolved from the report; the report
contains no resolved contradiction of that representation; and the rule identifies the fact and why its
truth cannot be established from the report alone. The resulting determination is never a `VIOLATION`.

A consumer request, notice, dispute, identity-theft report, police report, identity document, external
confirmation, court record, account record, payment record, bureau action, furnisher action, creditor
action, recipient or report-use condition, fee, response, procedure, or other actor-conduct condition
may not be a `DECISIVE_FACT`.

If one of those conditions is an affirmative legal element required to establish breach, the rule remains
permanently non-emittable from a report alone. It may not be moved from `REQUIRED_FACTS` to
`DECISIVE_FACTS` to evade this requirement.

A different rule applies where such a condition is an express statutory exception to an otherwise
report-resolvable prohibition. A later governed rule may identify it as an `UNRESOLVED_EXCEPTION` when
all of the following are true: the rule establishes a report-resolvable prima facie breach; the exception
is not affirmatively established by the uploaded report; every affirmative legal element other than any
permitted report-stated historical fact is resolved from the report; and the rule gives the consumer the
exact exception and its practical effect in plain language. The absence of exception evidence is neither
proof that the exception applies nor proof that it does not apply. It supports only a
`PROBABLE_VIOLATION`, never a `VIOLATION`, and CRP must not request additional consumer evidence to
resolve it. If the uploaded report affirmatively establishes that the exception applies, the rule may not
emit a finding.

A rule entry may not rely on confidence scores, anomaly aggregation, inference, paraphrase at analysis
time, or a synthesized legal proposition.

Every date used in a rule's `REQUIRED_FACTS`, `DECISIVE_FACTS`, or `BREACH_TEST` must be bound to the
specific legal event it represents. A report date, account date, update date, or other nearby date may
not be substituted for a statutory event date. The report must explicitly represent the relevant event
and date, and the rule must identify the exact report location and field/statement mapping. A missing
canonical extraction field, parser limitation, or unresolved mapping is not proof that the report lacks
the event/date; it cannot support an exclusion or a `PROBABLE_VIOLATION`. Keep that case unresolved
until the actual uploaded-report representation is inspected. Never request additional consumer evidence.

One admitted `RULE_ID` must represent one independently testable legal proposition. Separate statutory
limbs or alternatives may be represented as distinct rules only when the source text makes each limb
independently operable; preserve the exact subsection and source citation for each. Do not split
conjunctive elements, count duplicate catalogue records as separate legal provisions, or infer legal
independence from catalogue order. Source-record counts and unique legal-rule counts must be reported
separately, with explicit canonical/duplicate cross-references.

Source-record counts and unique legal-rule counts are administrative bookkeeping. Under owner directive
PHASE5-001O an unresolved duplicate identity or an uncertified unique-legal-provision count is recorded
as an administrative limitation; it does not block re-expression of an accepted provision, rule-record
construction, admission work, or coverage planning, and it is not a reason to reject an accepted statute.



## 6. Admission and Change Control

No rule or source evidence is admitted by this contract’s existence. A rule becomes governed only when
a later explicit owner work order creates or amends an approved legal-rule corpus using the complete
required fields in this contract.

A change to any admitted rule’s identity, jurisdiction applicability, source evidence, effective
period, required facts, decisive facts, breach test, or consumer citation requires a new immutable
`RULE_VERSION` and an explicit owner-approved corpus amendment.

A retired rule remains historically traceable but cannot be reused, silently rewritten, or treated as
applicable outside its recorded effective period.

## 7. Current Coverage State

```text
ADMITTED LEGAL RULES: 0
GOVERNED JURISDICTIONS WITH LEGAL COVERAGE: 0
PERMITTED LEGAL FINDINGS: 0
```

Until a conforming legal-rule corpus is explicitly approved, every candidate issue has no applicable
governed legal rule and therefore cannot emit `VIOLATION` or `PROBABLE_VIOLATION`.

## 8. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-29 | PHASE2-001A | Created the governed legal-corpus contract and defined future source, applicability, deterministic-evaluation, and rule-admission requirements. No legal source or rule was admitted. |
| 2026-09-29 | PHASE3-001F | Valid owner amendment: defined the narrow, source-backed report-representation route for a future PROBABLE_VIOLATION. It adds no consumer-evidence channel, governed legal rule, legal coverage, or finding authority. |
| 2026-09-29 | PHASE4-001D | Valid owner amendment: allowed a report-stated historical fact to support later PROBABLE_VIOLATION rule design only when every other legal element is report-resolved. Requests, documents, recipient/use conditions, fees, procedures, and actor conduct remain permanently excluded. No rule, coverage, source discovery, or finding was created. |
| 2026-09-29 | PHASE4-001F | Valid owner amendment: established the digest-bound legacy legal corpus as CRP's certified legal-content baseline for its recorded scope. Re-expression must reuse that work; fresh research is limited to gaps and concrete freshness issues. Excluded legacy detector behavior remains excluded. |
| 2026-09-29 | PHASE4-001O | Valid owner amendment: an unresolved statutory exception no longer suppresses an otherwise report-resolvable issue. An exception shown by the report defeats the issue; an unshown exception is disclosed as an `UNRESOLVED_EXCEPTION` and may support only a `PROBABLE_VIOLATION`. No additional consumer evidence may be requested. |
| 2026-09-29 | PHASE4-001T | Valid owner amendment: unresolved legal timing no longer silently suppresses an otherwise report-supported issue. Exact timing remains required for `VIOLATION`; a current or in-force certified source with unresolved historical timing may support only `PROBABLE_VIOLATION` with a plain-English temporal qualification. No additional consumer evidence may be requested. |
| 2026-09-29 | PHASE4-002D | Valid owner amendment: defines digest-bound certified-baseline snapshots as source pins without calling them statutory editions, and adds explicit applicability states so a specifically recorded unresolved federal preemption/savings question may be disclosed on a probable-only rule path. No preemption question was decided; no rule, coverage, or finding was created. |
| 2026-09-29 | PHASE4-002I-B20-OWNER-DECISIONS | Valid owner amendment: requires exact report-event/date mapping, bars parser-schema absence from being treated as report-level absence, permits separate rule identities only for independently operable statutory limbs, and requires duplicate source records to be cross-referenced and counted separately from unique legal provisions. No rule, coverage, or finding was created. |
| 2026-09-29 | PHASE5-001A | Valid owner ruling: accepts the current statute work's tested source, jurisdiction, effective-period, and legal-test determinations as authorized truth and authorizes Codex to record and validate report representations. Complete rule admission and report-only finding gates remain required; no legal rule, coverage, or finding is created by this ruling alone. |
| 2026-09-30 | PHASE5-001O | Valid owner amendment: added the owner directive paragraph recording `OWNER_ACCEPTED_LEGAL_AUTHORITY` for the relevant legacy statutes, the non-prerequisite status of missing provenance/historical versions/prior-review records, broad inclusion of statutory provisions with recorded multi-rule/multi-jurisdiction use, the non-conversion of guidance and policy material into statutes, and the administrative (non-blocking) status of duplicate bookkeeping and the unique-provision count; added the corresponding sentence in §5 and the acceptance clause in §3. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md. No legal rule, coverage, or finding was created. |

