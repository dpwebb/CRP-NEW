# OWNER-GAP-FINDING-002-RESOURCE-001 — source and scoped classification decision

Issued 2026-10-03 under the user's explicit delegation: "you are authoriristed as owner". This records a project-owner classification decision and bounded implementation work order. It does not state that a court has accepted CRP's classification or that any consumer has a legal claim. No production deployment or live billing is authorized. GAP-FINDING-002 remains OPEN until measured served-release acceptance passes.

## Accepted resources and scope

Use the existing governed adapter `US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y`, source `CRP-LSRC-0171`, selected jurisdiction US/US-CA, and its existing admitted source version `FE5C1BA63AE85923E378D4278C3D6E85461E8DF648847F43FE02FB4185BD41F6`. Preserve the rule's admission and permission checks. Its current permission allows findings and caps them at violation; a cap never selects a class.

Official statutory cross-check: [California Civil Code 1785.13](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1785.13.). Subsection (a)(1) measures bankruptcy reporting from the order-for-relief date and uses a ten-year period. This research cross-check is not a replacement of the admitted artifact version.

Existing owner-approved classification authority: `CRP_LEGAL_INVARIANT.md` section 2.5 and `CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md` section 2.2. The latter permits the truth of a historical event expressly represented by the report to remain unresolved under a specifically permitted probable path. It forbids off-report actor conduct, procedures, requests, notices or uses from being supplied as missing historical facts.

## Decision

Authorize implementation and validation of this narrowly scoped probable candidate: a reliably read bankruptcy record expressly prints an Order for Relief date more than ten years before its own report date, while that same record expressly states that the correspondence of the printed date to the actual court order is unverified or unavailable within the disclosure. Treat the printed assertion and the truth of the asserted historical date as separate evidence propositions. The exact assertion is a resolved report fact; the actual historical date must not be silently promoted to a verified court fact.

The individually named decisive issue is `publicRecord.bankruptcyOrderForReliefDate.historical_correspondence`: whether the asserted date corresponds to the actual order-for-relief event for that identified bankruptcy. Why decisive: if the actual event date differs enough, the ten-year comparison can change. The source for the date's legal significance is the existing statute; the source permitting this limited classification is the existing project invariant/build plan. The PROBABLE_VIOLATION label is CRP's qualified product classification, not wording supplied by the statute.

An expired printed assertion provides the deterministic support. An explicit, record-owned historical-verification statement supplies the evidence of report-level uncertainty. This is not permission to attach an unavailable-fact flag to every ordinary bankruptcy entry. Lack of a court attachment, absence of a case number, a generic disclaimer, or silence about verification does not establish this trigger. A consumer's unsupported denial does not establish it either.

This decision supplies the requested owner classification policy. Implementation must still verify that the exact report representation meets the existing stronger-evidence requirements; if it does not, withhold the candidate rather than force the fixture to pass. No governing contract is amended by this work order. No missing affirmative off-report action is reclassified as a historical fact, no exception is deemed absent, and no parser failure is treated as report-level unavailability.

## Implementation requirements

1. Establish a resolved assertion with the explicit legal-event label, report date, bankruptcy identity, bureau/segment ownership and source locations. A filing/discharge/update date cannot substitute for the order-for-relief date.
2. Extract the explicit historical-verification statement as its own record-owned report fact, retaining exact raw text, source document/image/page/line, normalization and uncertainty. Require a resolved reading of that statement. Do not infer the statement from report format, filename or owner-supplied runtime flags.
3. Keep the asserted date, its historical-verification state and the legal comparison distinct. Compute the comparison only on the reliably read asserted date. A claimed date is not external verification that the event occurred then.
4. Thread a structured, source-linked `decisive_facts_unavailable` entry only for this admitted scope. Retain identity, decisiveness, report-reading basis and evidence references through evaluation, finding, consumer result and purchased download. No generic arbitrary-list admission.
5. Preserve all current gates: applicable jurisdiction, admitted rule/version, permitted finding ceiling, resolved report predicates, source association, evidence-policy digest and exception resolution. Unresolved exceptions continue to yield no finding. Historical uncertainty cannot resolve an exception.
6. Output PROBABLE_VIOLATION only if the complete scoped test establishes strong support plus the explicitly permitted historical uncertainty. Do not output VIOLATION for the same unverified event/date. Explain both the arithmetic and the missing historical corroboration. Do not request additional consumer evidence.
7. A clearly reported historical date without this explicit trigger continues through existing policy. Do not silently change every existing finding to probable.

Suggested consumer explanation: "Your report states an order-for-relief date more than ten years before its report date. It also says that date has not been verified against the court event. This supports a possible reporting-period issue, but the actual court-event date cannot be established from this report. CRP classifies this as a probable issue, not an established breach."

## Required acceptance

The companion fictional fixture is a prospective test specification, not observed evidence and not a claim that a real bureau uses these words. Create genuine native PDF and OCR image fixtures from it; run the real extractor and full HTTP consumer path. Do not populate missing metadata after extraction to obtain the expected result.

Test the qualified positive candidate; an in-period asserted date; absence of an explicit verification statement; an unrelated/generic disclaimer; a verification statement belonging to another account/bureau/segment; conflicting event identities/dates; low-confidence decisive date or qualifier; filing-date substitution; unresolved exceptions; invalid rule version; and arbitrary manually supplied unavailable-fact lists. Positive acceptance must demonstrate that the extractor actually reads and associates the qualifier, rather than asserting it directly in runAdapter.

Use actual same-case/same-assessment paid upload → evaluation → results → purchased download, genuine signed sandbox-payment entitlement and plan limits. Do not borrow another case's download, manually grant entitlement, simulate webhooks or bypass quotas. Preserve provenance and policy/version in all outputs. Revalidate affected closed finding and OCR evidence on the final build.

Keep exact release evidence keys `probable_violation_path` and `end_to_end_journey`. Close only when both pass with expected/measured outcomes and current served identity-bound references. If this scoped candidate cannot satisfy the invariant, record its actual blocking layer; do not broaden the approval or change the invariant to obtain a pass.

## Excluded resource route

Research also found FCRA 1681e(b) accuracy duties and the CFPB's facially-false-data advisory opinion, which remains listed on its guidance index. These are useful accuracy resources, but a candidate resting on unknown internal bureau procedures conflicts with the current plan's off-report-procedure boundary. This work order does not admit that route or amend the boundary.

## Next Cline instruction

Read this work order and `SOURCE_CAPTURES/GAP-FINDING-002-OWNER-RESOURCE/prospective-fixture.json`, then implement and test the scoped candidate under the existing staging authorization. Inspect current health/build and source/admission identity first. Preserve preceding evidence, run appropriate regressions, package and hash runtime, snapshot staging data, deploy staging test mode only, and verify the full same-case paid path and strict release check. Report CLOSED or OPEN with measured behavior, actual release/rollback/snapshot and limitations. Owner selection of a source/policy candidate is now supplied; do not repeat the former unspecified-owner-action loop.
