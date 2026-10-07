> **October 7 common-error scope retirement.** The statute-certification and legal-finding authorization workflow is historical only. It does not authorize version 1 violations outside the active common-error checklist or block listed report-data checks pending statute certification. Governing authority: `CRP_OWNER_IMMUTABLE_VIOLATION_STANDARD_001.md`. Historical text below is retained for provenance.

# CRP Phase 5 — Statute Certification and Finding Authorization Build Plan

**Status:** Approved Build Plan — Rank 5  
**Plan version:** `CRP-PHASE5-STATUTE-CERTIFICATION-1`  
**Owner authorization:** user authorization to act as owner/architect; this plan records the remaining work to reach statute certification and report-only finding authorization.  
**Scope:** this plan governs legal-rule certification, scoped admission and finding authorization. Product implementation proceeds under CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md (CRP-ALL82-WIZARD-1, rank 5), activated by OWNER-ALL82-001. Unfinished corpus-wide certification does not block accounts, private intake, shared adapters, qualified-result interfaces or other authorized application development. Legal findings and production rule use remain subject to their recorded admission and output permissions; no jurisdiction or rule is deemed supported by this sequencing amendment.

## 1. Outcome

This plan reaches a state where a statute can be certified as a governed rule for a precise jurisdiction and where an uploaded credit report can support a narrowly defined `VIOLATION` or `PROBABLE_VIOLATION` under that rule.

“Certified statute” means CRP has approved a source-pinned, jurisdiction-specific, time-bounded, independently testable legal rule with its report representation, elements, exception treatment, and deterministic breach test fully recorded. It does not mean a court has adjudicated a consumer's case. A source-catalogue entry or source-discovery candidate alone is not certified and cannot emit a finding.

**Owner ruling PHASE5-001A:** the owner confirms the current statute work has been rigorously tested and authorizes its recorded source, jurisdiction, effective-period, and legal-test determinations as truth. Codex is authorized to record and validate report representation. These legal/source determinations are accepted inputs, not work that must be repeated; reopen one only for a concrete source change/conflict or a specific record inconsistency. This approval does not turn gaps, refusals, or excluded provisions into candidates, nor does it alone admit governed rules or authorize findings. The remaining work is to durably reconcile the accepted statute decisions, validate report representations, create complete rule records for eligible provisions, implement deterministic evaluation, test it, and formally admit the rules.

The consumer-uploaded credit report remains the only consumer-evidence input. Legal sources may establish what the law says; they are not consumer evidence. The process must never request or assume additional consumer evidence.

## 2. Certification and finding model

### 2.1 `VIOLATION`

Authorize a `VIOLATION` only where all of the following are true:

1. The exact legal text is pinned to an official source or an admitted digest-bound certified legacy baseline; citation, jurisdiction, and source provenance are recorded where the accepted corpus records them. Under owner directive PHASE5-001O a source whose formal edition, historical version or prior-review record is not recorded is not rejected for that reason: the digest-bound accepted source is the pin, and the missing record is an administrative limitation stated with the finding. The report-side requirements of this section are unchanged.
2. The exact jurisdiction relationship and the rule's effective period for the relevant event are determined.
3. The rule's exact statutory limb, affirmative elements, and deterministic breach test are recorded without paraphrase-based inference or an invented legal proposition.
4. The uploaded report explicitly represents every fact needed for the test, with exact report page/section/field/statement and event-date mapping.
5. No required fact is unresolved, no report fact contradicts the proposed breach, and no exception or applicability issue prevents a violation-level conclusion. An exception affirmatively shown by the report defeats the finding; an unknown exception cannot be silently treated as absent for `VIOLATION`.
6. A deterministic rule evaluation and an independent validation pass both reproduce the result from the recorded report facts and source pin.

### 2.2 `PROBABLE_VIOLATION`

Authorize a `PROBABLE_VIOLATION` only where the applicable governed rule expressly allows it and:

1. A strong, explicit report representation supports likely breach; the rule identifies exactly what the report states and where it appears.
2. Every affirmative legal element other than a permitted report-stated historical fact is resolved from the report. Do not turn missing parser fields into report-level absence or turn a request, notice, recipient/use condition, actor conduct, or other affirmative legal element into a decisive historical fact.
3. The only unresolved issues are those allowed by the governing contract, such as the truth of a historical event expressly represented by the report, an express exception not established by the report, permitted unresolved historical timing, or a specifically admitted unresolved preemption/applicability question.
4. Every unresolved issue is named and explained in plain language. Unknown does not mean the exception applied, did not apply, or that the underlying event was true.
5. The output does not state or imply that breach is established. No additional consumer evidence is requested.

If a statute's affirmative breach element depends on an off-report request, notice, recipient, use, fee, procedure, or actor action, that statute cannot support either finding from the report alone. Do not broaden the probable path to bypass that boundary.

## 3. Work sequence and gates

Work proceeds in the following order. A later phase cannot begin before its stated gate passes. Record completed and blocked items in durable artifacts; do not rely on conversation-only decisions as certification records.

**Owner authority PHASE5-001P — scoped gate verdicts and incremental rule-unit progression.** This
paragraph adds a scope to the sequencing sentence above. It weakens no gate's own conditions.

- **Corpus-wide gates stay corpus-wide.** Gate 5.1 to Gate 5.7 keep their text exactly as recorded and
  remain unfinished while any record they quantify is unresolved. They are recorded separately from any
  scoped verdict. A scoped verdict is never a corpus-wide pass and never clears a row outside its scope.
- **For progression purposes only, a gate may also be recorded as passed for one explicitly named
  scope.** A scope names, at minimum, the jurisdiction (country and region), the rule unit, the statutory
  limb, the report presentation, the evidence references it relies on, and its exclusions.
- **A scoped verdict states, criterion by criterion,** the gate's own text, the state of each criterion
  within that scope, the evidence for each state, and every item the scope excludes or leaves unresolved.
- **A later phase may begin for a named scope only when every preceding gate carries a passing verdict
  for that same scope.** A verdict does not transfer to another scope, and one passing verdict implies no
  other.
- **The corpus-wide unfinished queue is preserved as recorded.** A scoped verdict resolves, promotes,
  re-classifies and closes no row. Missing work may not be converted into `GAP` or `REFUSAL` in order to
  satisfy a criterion; where a criterion cannot be met within a scope, that scope's verdict names the
  unmet criterion instead of being issued.
- **No scoped verdict admits a rule,** creates coverage or a candidate, authorizes a finding class, or
  changes the recorded state of the application, which still reports report checking as not yet
  available.

**Owner authority PHASE5-001S — pre-admission specification and validation sequence.** This paragraph
names the sequence in which a rule record is finalised, specified, validated and admitted, and it
weakens no gate's own conditions.

- **The gates are separated by what each one reads.** Gate 5.4 finalises the governed rule record for a
  named scope. Gates 5.5 and 5.6 read that finalised record whether or not Gate 5.7 has admitted it.
  Gate 5.7 remains the only step that admits a governed rule, and it remains the step that follows a
  successful Gate 5.6. Admission is not a precondition of specifying or validating an evaluator; it is
  the precondition of emitting a result.
- **A pre-admission rule record is a pinned, scoped record.** It carries its immutable rule ID, its
  source pin, its exact jurisdiction and statutory limb, its determined test, and a recorded
  pre-admission version identity derived from the record's own content. Its production admission
  identity and its production version string remain reserved to Gate 5.7.
- **An unadmitted rule can never emit a consumer result.** Until Gate 5.7 admits it, the evaluator must
  refuse to emit on it: a named refusal and no result. No gate may produce a finding class, coverage or
  consumer-visible output from a pre-admission record.
- **No rule may be admitted early to satisfy a gate.** Admission is not a Gate 5.5 or Gate 5.6
  deliverable, and a rule may not be admitted in order to make a gate criterion pass.
- **Nothing is removed by this paragraph.** Each gate's own conditions, each stop condition, the finding
  boundary, the permanent exclusions and the authority order are unchanged; this paragraph only records
  which rule record the specification and validation gates may read while Gate 5.7 has not yet admitted
  it. It admits no rule by itself and it creates no coverage, no candidate and no finding class.

**Owner-authorized internal-validation carve-out (PHASE5-001I-A).** A bounded, owner-issued work order may
build and run an *internal validation* of one candidate extractor and its deterministic comparison before
that candidate’s gates pass, and only where every one of the following holds. This carve-out passes no gate,
admits no rule, creates no coverage, produces no finding and changes no gate state:

- the work order names one jurisdiction, one bureau presentation, one rule unit and one statutory limb, and it
  names its own permitted files, its exclusions and its tests;
- the artifacts are internal only: not admitted, not advertised, not reachable from any consumer surface, and
  producing no consumer-visible output of any class;
- the comparison outcomes are internal arithmetic results and are never `VIOLATION` or `PROBABLE_VIOLATION`,
  and no `VIOLATION` or `PROBABLE_VIOLATION` class is created, emitted or implied;
- unresolved states keep their recorded meaning: `EXTRACTION_UNRESOLVED` is never `ABSENT_FROM_REPORT`, and a
  parser failure is never evidence;
- a classification recorded for the candidate is preserved and is never overridden by this carve-out;
- Gates 5.3 to 5.7, their acceptance evidence and every admission condition are untouched: the artefact is not
  an admitted evaluator, it is not gate evidence for any gate, and it must be re-created and re-validated under
  Gates 5.5 and 5.6 before any admission.

Nothing in this carve-out authorizes a second rule unit, jurisdiction, bureau or presentation, a consumer
surface, a deployment, or a finding.

### Phase 5.1 — Freeze and reconcile the inventory

- Preserve the 437-entry source catalogue as the authoritative baseline; do not rewrite its legal content in this step.
- Reconcile every catalogue ID to exactly one current corrected-logic disposition: `CONFIRMED_CANDIDATE`, `PROBABLE_CANDIDATE`, `EXCLUDED`, `UNRESOLVED`, `GAP`, or `REFUSAL`, as applicable to the actual record schema.
- Record the unique legal-provision key and explicit canonical/duplicate links. Count source records separately from unique legal provisions; do not infer duplication from adjacent IDs. Under owner directive PHASE5-001O these counts and links are administrative bookkeeping: an unresolved duplicate identity or an uncertified unique-legal-provision count is recorded as an administrative limitation and does not block acceptance of the accepted legacy statutes or coverage planning.
- Carry forward the B20 ruling as a preserved, unattributed historical record (owner disposition PHASE5-001M): 39 probable candidates, 380 excluded, and 18 unresolved source records (39 + 380 + 18 = 437), including `CRP-LSRC-0354`, `0422`–`0425`, and `0427` pending exact report-field/event mapping. The per-ID inventory behind that tally is absent from this workspace (per-ID basis `MISSING_EVIDENCE`), so the tally is retained without assigning any catalogue ID to any of its classes: it is not a certified operational count and is not the register's certified starting count. The requirement to reconcile these totals against the persisted source-discovery records is replaced by a reproducible reconciliation of the complete source-ID register: every catalogue ID accounted for exactly once, every count built from the register's own per-ID record dispositions, and every current count stated with the evidence it rests on, the meaning it carries and the limitations that remain unresolved. Duplicate identity remains a separate, unfinished requirement of this phase (bullet 3 above): the duplicate links are now explicit per relation and per row, but the identity of the six clusters `0315/0316/0317/0318/0320`, `0149/0150`, `0165/0166`, `0409/0411`, `0336/0349` and `0337/0351` could not be determined from the recorded descriptors, so those clusters remain open and queued, neither collapsed, merged nor re-classed. Under owner directive PHASE5-001O the uncertified unique-legal-provision count and the open duplicate bookkeeping are administrative limitations that are recorded rather than treated as blocking: they do not prevent the remaining phases of this plan, coverage planning, or the next implementation work order, and no count is published as certified.
- Keep `CRP-LSRC-0435` and all other wildcard/unspecified-jurisdiction gaps visible; they do not suppress exact-jurisdiction entries. Keep unknown family identifiers opaque unless an approved mapping is found.

**Gate 5.1:** every source ID is accounted for once, all counts reconcile to the extent the recorded evidence permits, duplicate links are explicit, and no unresolved item was silently excluded. Under owner directive PHASE5-001O a count or duplicate identity that cannot be reconciled is recorded as an explicit administrative limitation with the evidence it rests on, and that recording satisfies this condition: the limitation does not block the remaining phases, coverage planning, or the next implementation work order.
If reports are only present in chat, first create the durable, schema-conforming rescreen register from the accepted reports, with provenance to each batch and correction.

### Phase 5.2 — Reconcile accepted legal decisions and finish report-only dispositions

- Resume at the first unreviewed ID after the last verified batch; establish the exact last completed ID from durable records, not recollection.
- Do not repeat the owner-approved source, jurisdiction, effective-period, or legal-test certification. Review in fixed, non-overlapping batches only to reconcile the recorded dispositions and complete the report-only work. For each source record capture the accepted source pin, jurisdiction, statutory provision/limb, direct report-content duty, event/date semantics, report representation, decisive historical facts, off-report prerequisites, unresolved exceptions, timing, applicability/preemption, status, consumer explanation, and reason.
- Apply the established exception logic consistently: do not assume unknown exceptions apply or do not apply. Apply the exact-event-date rule: generic dates and parser-schema absence are not evidence of the statutory event or its absence.
- Preserve partial-limb candidates only where the legal text independently supports the limb. Keep conjunctive tests together.
- Reconcile duplicate sources and shared legal provisions as each batch closes. Keep scope-limited candidates distinct from full-statute certification.

**Gate 5.2:** all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable; every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal. Legal/source fields are accepted under PHASE5-001A, not re-litigated. No batch is accepted based solely on an unverified completion summary. This condition is corpus-wide: it stays unpassed while any of the 437 entries lacks a reconciled report-only disposition or a documented reason it is not assessable, and a scoped verdict recorded under the PHASE5-001P paragraph above is read against the records inside its named scope only. Such a verdict neither states nor implies that this corpus-wide condition is satisfied.

### Phase 5.3 — Resolve report-schema and representation questions

- Inventory the actual consumer-report formats/fields that the future application is intended to support. Do not use the old detector's field limitations as the new product boundary. For a scope named under the PHASE5-001P paragraph above, the intended format is the presentation that scope names: recording that one presentation explicitly satisfies this bullet for that scope, and every other format is recorded as unsupported and not inventoried. No corpus-wide intended-format inventory is created or implied by that record.
- For each candidate, inspect representative report layouts or authoritative report-format documentation already within scope and map the exact displayed statement/date to the exact legal event. The legal source stays authoritative for law; report examples/documentation establish only representation and field mapping.
- Establish whether the uploaded report can expose inquiry/request dates, bureau collection dates, last-payment dates, default dates, medical-debt labels, source/court labels, and other decisive report facts. A canonical parser field is not required if explicit report text can be deterministically mapped; unresolved OCR or ambiguous labels remain unresolved rather than inferred.
- Define a report-location locator that survives extraction (page, section, tradeline/inquiry block, source span or bounding box, and exact text/value). Preserve the raw extracted value and normalized value with a traceable normalization record.

**Gate 5.3:** each proposed candidate has a verifiable report representation and exact location, or remains explicitly unresolved/excluded with a source-grounded reason. No rule enters certification merely because a field seems likely to exist.

### Phase 5.4 — Select and certify rule units

- Build a candidate-to-rule-unit crosswalk. A rule unit is one independently testable legal proposition for one exact jurisdiction and statutory limb.
- Reuse the certified legacy legal corpus for its admitted legal content. Retrieve fresh official sources only for identified gaps, missing details, or concrete amendment/repeal/supersession/change indicators.
- For every selected unit record the required governed fields: immutable rule ID/version, exact jurisdiction, source ID and pin, formal edition status, effective dates/status, exact legal text/proposition, applicability, report-required facts, decisive facts, exceptions, deterministic breach test, consumer citation, and consumer-facing qualifications.
- Ensure the rule unit does not smuggle in omitted actor conduct, requests, notices, permissible-purpose/use, or other prohibited off-report elements. If one is an affirmative element, classify the provision as non-emittable from a report alone.
- Do not create a rule from a source-discovery status alone. A `PROBABLE_CANDIDATE` can feed only a rule that keeps the uncertainty within the allowed probable-only path.

**Gate 5.4:** each proposed rule has a complete field-by-field trace to the owner-approved source, exact jurisdiction/limb, no unresolved affirmative element, and a deterministic test. Independent validation verifies faithful transcription and mapping to the accepted legal record; it does not repeat the owner's legal/source certification. A concrete contradiction or change indicator is held for owner/legal direction rather than guessed.

### Phase 5.5 — Specify deterministic report evaluation

- Define the report fact model from the certified rule units. Each fact records raw value/text, normalized value, source location, extraction status, event semantics, and transformation provenance.
- Define exact statuses for `PRESENT`, `ABSENT_FROM_REPORT` (only after the relevant report section is reliably inspected), `CONTRADICTED`, and `EXTRACTION_UNRESOLVED`. Never conflate `ABSENT_FROM_REPORT` with missing parser fields or failed extraction.
- Implement deterministic rule evaluators that take only the uploaded report's resolved facts plus admitted rule records. Keep legal research, parsing, candidate classification, and finding evaluation as separately auditable steps. For a scope named under the PHASE5-001S paragraph above, `admitted rule records` in this bullet is read as the governed rule record that Gate 5.4 has finalised for that scope, read at its pinned pre-admission version: a record Gate 5.7 has not yet admitted is a valid input to this specification and to Gate 5.6, and the evaluator must still refuse to emit on it until Gate 5.7 admits it, so the emission condition Gate 5.5 itself sets is unchanged by this reading.
- Implement explicit outputs for `VIOLATION`, `PROBABLE_VIOLATION`, and no finding. The product surfaces only violations and probable violations to the consumer; internal unresolved/excluded states remain audit data, not consumer finding labels.
- Explain each finding with the applicable statute/citation, report quotation/location, what requirement appears unmet, why the confidence class is limited, unresolved exception/timing/applicability qualifications, and the distinction between the report's assertion and independently verified truth.

**Gate 5.5:** evaluator output is deterministic, fully traceable to report and source, and cannot emit on incomplete extraction, unapproved rules, wrong jurisdiction, wrong event-date mapping, or an unresolved affirmative element.

### Phase 5.6 — Validate before authorizing findings

- Create synthetic and legally reviewed fixtures for each rule unit: clear breach, compliant/within-limit, exact boundary, wrong event date, date unavailable, report contradiction, exception shown, exception unknown, effective-period uncertainty, preemption uncertainty, duplicate catalogue source, wrong jurisdiction, parser failure, OCR ambiguity, and report-section not inspected.
- Add negative tests proving prohibited off-report facts are never requested, inferred, or used as decisive facts; parser failure never becomes absence; unknown exceptions never suppress a report-supported probable path; and probable-only uncertainty never emits `VIOLATION`.
- Use an independent reviewer to reproduce a sample of each result from the source pin and report excerpt without seeing the evaluator output first. Reconcile any disagreement before rule approval.
- Validate consumer language with realistic examples so the explanation is useful and does not overstate a legal conclusion.

**Gate 5.6:** every test passes; independent replay reproduces each sampled result; no known false positive/negative category remains unexplained; rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions. Under the PHASE5-001S paragraph above, for a scope whose governed rule record Gate 5.7 has not yet admitted, the sharing condition is measured against that record's pinned pre-admission version identity together with the immutable digests of the crosswalk, the tests and the explanation templates the scope reads and writes; the production admission identity and version remain reserved to Gate 5.7, and a scoped Gate 5.6 verdict must name that reservation rather than treat the condition as satisfied by it. The reservation is a Gate 5.7 assignment, not a Gate 5.6 measurement. Under owner authority PHASE5-001U, the sharing condition for such a scope is the condition that the governed rule record the scope reads, the source crosswalk, the tests and the explanation templates it reads and writes are each pinned to one shared, verified, immutable pre-admission version identity, each at an immutable digest; that condition is measurable, and is met or not met, before Gate 5.7 has assigned any production identity. A scoped Gate 5.6 verdict therefore records the sharing condition against that shared pre-admission version identity and names the production reservation beside it, and it may not treat the reservation, the existence of this clause, or the prospect of a later assignment as evidence that sharing holds. Gate 5.7 remains the only step that assigns a production identity and a production version string, the requirement to name the reservation is unchanged, and no gate is passed by this clause alone.

### Phase 5.7 — Formal owner admission and finding authorization

- Prepare a rule-corpus amendment containing only rules that passed Gates 5.1–5.6, with immutable IDs/versions and full provenance.
- Record excluded, unresolved, gap, and refusal counts separately; do not represent unresolved jurisdictions or provisions as certified.
- Update coverage and finding counts only from admitted rule records and validated evaluator capability. The current contracts' zero governed rules/coverage/findings remain until formal admission.
- Owner approves the corpus amendment and the exact finding classes authorized. This approval admits governed rules; it does not change statutory text or turn a probable result into a violation.
- Only after approval may implementation emit the specifically authorized finding classes. Release remains a separate product/deployment decision.

**Gate 5.7 / segment exit:** at least one complete rule unit has been formally admitted and its evaluator passes the validation suite, or the segment reports a clear blocker that requires an owner/legal decision. Once all in-scope rules are admitted or explicitly dispositioned, this legal-corpus segment is complete. Application development may proceed concurrently under CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md; unfinished segment completion is not a product-development prerequisite. This permission does not authorize unsupported evaluation, finding classes, release or deployment.

## 4. Durable artifacts to create

1. Corrected-logic rescreen register: one record per catalogue ID, full batch provenance, versioned corrections, and explicit duplicate crosswalk.
2. Report-representation and field-mapping register: supported report format, exact displayed field/event mapping, locations, extraction limitations, and unresolved mappings.
3. Candidate-to-rule-unit crosswalk: source IDs to unique provision/limb, jurisdiction, status, and disposition.
4. Governed legal-rule corpus: only formally admitted complete rules; immutable versions and source pins.
5. Deterministic fact/evaluator specification and implementation, only after rule units and report mappings are admitted; the section 3 internal-validation carve-out is not that specification or implementation, is not gate evidence, and admits nothing. Under the PHASE5-001S paragraph, `admitted` in this item is read as passed Gate 5.4 and Gate 5.3 for the named scope: the artifact may be built and validated on the finalised rule record at its pinned pre-admission version, and it must refuse to emit on that record until Gate 5.7 admits it. Formal admission at Gate 5.7 remains the step that makes a rule production-authoritative, and it is not a precondition of this artifact.
6. Validation suite and independent replay report.
7. Consumer explanation templates tied to rule versions and finding class.

Do not create a permanent discovery registry yet. It remains postponed until all applicable statute certifications and source-discovery cohorts are complete, consistent with the existing monitor instruction.

## 5. Stop conditions requiring direction

Pause only the affected rule/cohort and record the blocker when:

- an owner/legal interpretation is necessary to choose between materially different readings of the official source;
- the source pin conflicts with an identified amendment, repeal, or superseding text and the controlling version cannot be resolved from admitted evidence;
- jurisdiction coverage or preemption cannot be determined or placed within the already authorized probable-only path;
- a proposed candidate depends on an affirmative off-report element;
- report layouts do not permit reliable event/date mapping after reasonable inspection;
- a count, a duplicate identity, or a source-provenance question cannot be reconciled after a genuine attempt: under owner directive PHASE5-001O it is recorded as an explicit administrative limitation with the evidence it rests on and the work does not stop for it. Only a concrete source conflict, an amendment/repeal/supersession indicator, or an identified record inconsistency that changes legal content is a stop condition.

Do not stop unrelated batches while a localized blocker is open. Defer only decisions that truly block certification; otherwise continue the remaining in-scope catalogue.

## 6. Current baseline and first action

The current catalogue has 437 source entries and explicitly reports zero governed rules, zero governed-jurisdiction coverage, and zero permitted findings. Under owner ruling PHASE5-001A, source, jurisdiction, effective-period, and legal-test determinations in the current statute work are accepted as owner-authorized truth and do not need to be retested. The corrected-logic B20 report recorded a provisional source-record tally of 39 probable candidates, 380 excluded, and 18 unresolved (39 + 380 + 18 = 437). Under owner disposition PHASE5-001M that tally is preserved as an unattributed historical record whose per-ID inventory is absent from this workspace (per-ID basis `MISSING_EVIDENCE`): no catalogue ID may be assigned to any of its classes, it is not a certified operational count, and it is not the register's certified starting count. The count requirement it carried is replaced by the reproducible reconciliation of the complete source-ID register, with every current count stating its evidence, its meaning and its unresolved limitations. The six B20 unresolved mappings are `CRP-LSRC-0354`, `0422`, `0423`, `0424`, `0425`, and `0427`; these are report-representation mappings, not reopened legal/source determinations.

Therefore the next work order is **PHASE5-001B — Build the durable corrected-logic rescreen register and reconcile all completed batches through B20**, read-only with respect to the legal-source catalogue and no runtime implementation. It must verify each prior batch/correction against the catalogue, preserve exact source IDs and decisions, establish the next unreviewed ID, and produce the reconciled register and open-blocker queue. Then continue remaining batches autonomously until Gate 5.2 passes, pausing only for a material owner/legal decision.

**Owner directive PHASE5-001O — gate-sequence reassessment.** The sequence in §3 is reassessed under the
amended authority by separating four layers that were previously interleaved:

```text
1. LEGAL AUTHORITY ACCEPTED BY THE OWNER
   The relevant legacy statutes are accepted as legal truth (OWNER_ACCEPTED_LEGAL_AUTHORITY).
   No provenance, historical-version or prior-review proof is required, and their legal validity is not
   independently reopened.
2. ADMINISTRATIVE RECONCILIATION
   Register dispositions, duplicate bookkeeping, citation/section verification flags and the
   unique-legal-provision count. These are administrative: they are recorded with their limitations and
   do not block layers 1, 3 or 4.
3. REPORT-FORMAT AND APPLICATION DEPENDENCIES
   Report representation and exact field/event/location mapping, the consumer-selection jurisdiction
   surface, the consumer-application data path, and the mapping of accepted provisions to report
   conditions. These need product work, not further legal research.
4. READINESS FOR DETERMINISTIC EVALUATION
   Rule-record construction for accepted provisions, deterministic evaluators, the validation suite, and
   formal admission. This remains gated on layer 3 evidence for any rule that depends on a report
   representation, and is not gated on layer 2.

GATE 5.1 is recorded as met with the administrative limitations stated in this plan; Gate 5.2's
report-only dispositions proceed from the accepted corpus. Gate 5.3 and later remain evidence-gated on
report representation, exactly as before. Legal-provenance research and further duplicate-count
investigation are not the default next step.
```

**Next work order (PHASE5-001O recommendation).** The next work order is the smallest concrete
implementation order that advances the consumer application on the accepted corpus, not another research
order: drive the consumer application's selectable jurisdiction list from `CRP-JURISDICTION-ENUM-1` and
publish, per selectable region, the coverage the accepted corpus records. Nothing in this plan authorises
application changes, deployment, consumer-data transmission or a finding; that order must carry its own
authorisation and its own scope.


## 7. Scope boundary

This plan authorizes plan-level sequencing only. It does not itself admit a statute, change a finding, add consumer evidence, certify the whole catalogue, approve a runtime implementation, or deploy the application. Those outcomes require passing the gates and their explicit corpus amendment. It does not amend the old application or its detector.

---

## 8. Amendment History

| Date | Work order | Change |
| --- | --- | --- |
| 2026-09-30 | PHASE5-001M | Valid owner amendment under Core Constitution section 6: section 3 Phase 5.1 bullet 4 and section 6 amended, and this amendment history section created under section 6.5. The PHASE4-002I-B20 tally is recorded as a preserved, unattributed historical record whose per-ID inventory is absent from this workspace (per-ID basis MISSING_EVIDENCE); no catalogue ID is assigned to any of its classes. The requirement to reconcile those totals against the persisted source-discovery records is replaced by a reproducible reconciliation of the complete source-ID register: all 437 catalogue IDs accounted for exactly once, every count built from recorded evidence, and every current count stating its evidence, its meaning and its unresolved limitations. The separate duplicate-identity requirement and the six identity-unresolved clusters (0315/0316/0317/0318/0320, 0149/0150, 0165/0166, 0409/0411, 0336/0349, 0337/0351) are preserved and remain open. The gate sequence, all gates and every unrelated acceptance condition are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001M_B20_DISPOSITION_AND_GATE_5_1_AMENDMENT.md. Admits no rule, certifies no count or coverage, establishes no consumer-format support and passes no gate. |
| 2026-09-30 | PHASE5-001O | Valid owner amendment under Core Constitution section 6: section 2.1 item 1 now records that the digest-bound accepted source is the pin and that an unrecorded formal edition, historical version or prior-review record is an administrative limitation rather than a ground to reject the source; section 3 Phase 5.1 bullets 3 and 5 and Gate 5.1 now record that duplicate bookkeeping and an uncertified unique-legal-provision count are administrative limitations that are recorded and do not block the remaining phases, coverage planning or the next implementation work order; section 5's stop condition for unreconcilable counts, duplicate identity and source provenance is replaced by a record-and-continue rule; section 6 gains the four-layer gate reassessment and the next-work-order recommendation. The report-side requirements, the permanent exclusions, the finding boundary and every other gate are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md. No rule, coverage, finding or certified count was created, and no gate is passed by this amendment alone. |
| 2026-09-30 | PHASE5-001I-A | Valid owner amendment under Core Constitution section 6: section 3 gains the owner-authorized internal-validation carve-out and section 4 item 5 records that the carve-out is not the admitted specification or implementation. A bounded internal validation of one candidate extractor and its deterministic comparison — one jurisdiction, one presentation, one rule unit, one limb — may be built and run before its gates pass, with no admission, no coverage, no finding, no consumer-visible output, no gate credit and no override of a recorded classification, and it must be re-created and re-validated under Gates 5.5 and 5.6 before any admission. The gate sequence, all gates, the permanent exclusions, the finding boundary and every other acceptance condition are unchanged. Both replaced text and replacement text are quoted in the amending narrative CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md. Admits no rule, passes no gate, creates no coverage and authorizes no finding. |
| 2026-09-30 | PHASE5-001P | Valid owner amendment under Core Constitution section 6: section 3's ordering sentence gains the scoped-gate-verdict and incremental rule-unit progression paragraph (owner authority PHASE5-001P) — corpus-wide gate conditions stay unchanged and are recorded separately, a gate may also be recorded as passed for one explicitly named scope, a later phase may begin for a named scope only when every preceding gate holds a passing verdict for that same scope, the corpus-wide unfinished queue is preserved as recorded, no row is promoted or re-classified, and no missing work may be converted into GAP or REFUSAL to satisfy a criterion; Gate 5.2 records that its condition is corpus-wide and is not satisfied by a scoped verdict; Phase 5.3 bullet 1 records that a named scope's intended format is the presentation that scope names. Gate 5.3's own text is per-candidate and needed no change. It admits no rule, certifies no coverage, passes no corpus-wide gate, creates no finding class and changes no application behaviour. Both replaced text and replacement text are quoted in CRP_PHASE5_001P_INCREMENTAL_UNIT_GATE_PROGRESSION.md and SOURCE_CAPTURES\PHASE5-001P\amendment_text.json. |
| 2026-09-30 | PHASE5-001S | Valid owner amendment under Core Constitution section 6: section 3's scoped-progression paragraph gains the pre-admission specification and validation sequence paragraph (owner authority PHASE5-001S) — Gate 5.4 finalises a rule record and Gates 5.5 and 5.6 read that finalised record whether or not Gate 5.7 has admitted it, a pre-admission record is pinned by its immutable rule ID and a content-derived pre-admission version identity while its production admission identity and version stay reserved to Gate 5.7, an unadmitted rule must still refuse to emit and can never produce a finding class, coverage or consumer-visible output, and no rule may be admitted early to satisfy a gate; section 3 Phase 5.5 bullet 3 records how the phrase `admitted rule records` is read for a named scope; section 4 item 5 records that its admission precondition is the Gate 5.4 and Gate 5.3 pass for the named scope rather than Gate 5.7 admission; Gate 5.6 records how its immutable-version sharing condition is measured against a pinned pre-admission rule-record version, with the production admission identity reserved to Gate 5.7 and that reservation to be named rather than passed. Gate 5.5's own sentence, Gate 5.4, the finding model, the stop conditions, the permanent exclusions and every other clause are unchanged, no requirement is removed by any of the four replacements, and no gate is passed by this amendment alone. It admits no rule, certifies no coverage, creates no finding class, changes no application behaviour and authorises no consumer-visible output. Both replaced text and replacement text are quoted in CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md and SOURCE_CAPTURES\PHASE5-001S\amendment_text.json. |
| 2026-10-01 | PHASE5-001U | Valid owner amendment under Core Constitution section 6: Gate 5.6’s pre-admission sharing sentence gains the owner’s reading of how its reservation and its measurement relate (owner authority PHASE5-001U) — the sharing condition for a scope whose rule record Gate 5.7 has not admitted is the condition that the governed rule record the scope reads, the source crosswalk, the tests and the explanation templates it reads and writes are each pinned to one shared, verified, immutable pre-admission version identity at an immutable digest; that condition is measurable and is met or not met before Gate 5.7 assigns any production identity; a scoped Gate 5.6 verdict records the sharing condition against that shared pre-admission version identity and names the production reservation beside it, and may not treat the reservation, this clause, or the prospect of a later assignment as evidence that sharing holds. The requirement to name the reservation, Gate 5.7’s sole authority to assign the production identity and the production version string, every other Gate 5.6 clause, Gate 5.7 itself, the finding model, the stop conditions and the permanent exclusions are unchanged, no requirement is removed, and no gate is passed by this amendment alone. It admits no rule by itself, certifies no coverage, creates no finding class, changes no application behaviour and authorises no consumer-visible output. Both replaced text and replacement text are quoted in CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md and SOURCE_CAPTURES\PHASE5-001U\amendment_text.json |

| 2026-10-01 | OWNER-ALL82-001 | Opening Scope and Gate 5.7 segment-completion sentence amended in quoted-replacement form in CRP_OWNER_ALL82_001_PLAN_ACTIVATION.md. CRP-ALL82-WIZARD-1 activated at rank 5 for product implementation; corpus completion no longer blocks independent product work. Rule admission and output permissions remain unchanged. |
