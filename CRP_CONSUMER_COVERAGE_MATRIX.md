# CRP Consumer Coverage Matrix

Compact consumer-coverage matrix derived from existing evidence (`finding-coverage.cjs`, the B2
vertical-slice suite, and the admission/upload/packet tests). "Delivered" means a named test produced the
recorded result; "configured" is never counted as delivered.

## 0. How a row was exercised (execution class)

| Class | What it means | Where |
|---|---|---|
| **all-82 (scripted service journey)** | one fictional general report uploaded through every one of the 82 canonical selections, evaluated, then select -> approve -> entitled download over the real endpoints. No browser. | bx-all82-factual-verification |
| **representative real-browser** | the actual Wizzard driven in Playwright + local Chrome (potential, probable, partial selection, edit-after-approval, benign, history + comparison) including the real `#packet-download` control writing a file. Representative only; not repeated 82 times. | bw-browser-wizzard |
| **focused service section** | the real endpoints or the real classifier for one rule/format/issue. | bm/bp/bs/bt/bu/bv/bl/bh/by/bz |

So the 82-jurisdiction claim rests on the **scripted** service journey; the **browser** evidence is
representative (US-CA + US-NY + a benign case), and the actual downloaded file was verified once per class.

## 1. Intake / format surface

| Intake / format | Admitted by | Reaches a consumer issue | Field gaps (retained) |
|---|---|---|---|
| GENERAL-BUREAU-REPORT (general intake) | any plausible bureau report | the 6 factual-verification issues, all 82 regions (bx) | none of the 6 |
| FAM-AU-EQX-CONSUMER (Equifax AU) | structural contract + fictional faithful PDF | account-dates (actual upload) | balance/past-due, status-closure, duplicate, responsibility, payment-history |
| FAM-GB-EXP-CONSUMER (Experian GB) | structural contract + fictional faithful PDF | account-dates (actual upload) | balance/past-due, status-closure, duplicate, responsibility, payment-history; 2007 specimen (present-day GB not claimed) |
| FAM-TU-CA (TransUnion CA) | structural contract + producer safeguard | account-dates (downstream only; the contract refuses the synthetic factory producer) | balance/past-due, status-closure, duplicate, responsibility, payment-history |
| US-CONSUMER-DISCLOSURE (Experian US) | real specimen (OCR) | balance/past-due (downstream) | account-dates, status-closure, duplicate, responsibility, payment-history |
| CA Equifax specimen | pinned specimen only | definite/probable statutory | n/a (real specimen, not a fictional fixture) |

A family field gap does NOT erase the general-intake path: a US/AU/GB/CA consumer can still upload a general
report and receive the 6 factual-verification issues.

## 2. Shared factual-verification support (jurisdiction-agnostic)

The six common-error potential issues run on the general intake regardless of region. Each renders as a
POTENTIAL REPORTING ISSUE with readable evidence, an affirmative concern and explicit uncertainty; all are
packet-eligible; the full journey (select -> approve -> entitled download) is exercised for all 82 (bx).

| Issue category | Selector | Delivery class |
|---|---|---|
| COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY | opened-after-closed | all-82 (bx) + real browser (bw) |
| COMMON-ERROR-STATUS-DATE-CONTRADICTION | open status + closure date | focused (bp) |
| COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY | conflicting cells | focused (an) |
| COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY | past-due exceeds balance | focused (bp/bv) |
| COMMON-ERROR-DUPLICATE-REPORTING | corroborated duplicate | focused (bp) |
| COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY | conflicting responsibility labels | focused (bp) |

## 3. Statutory findings: permission vs tested packet delivery

A finding existing is NOT the same as a packet being available. This table separates the two. Every currently
emitted definite/probable finding is reconciled with the unified Issue + packet path (by); no emitted finding is
silently dropped.

| Jurisdiction(s) | Finding | Confidence | Packet permission | Tested packet delivery |
|---|---|---|---|---|
| US-CA | CCRAA 1785.13(a) bankruptcy-10y / tax-lien-paid-7y / collection-7y | DEFINITE | enabled (per-finding) | bl (select/approve/download) |
| CA-NS | CRA s.10(3)(f) dismissed-charge (report CONTENT) | DEFINITE | enabled (per-finding) | by (content packet, no retention period) |
| AU (all 8) | Privacy Act 1988 s20W enquiry-5y / default-5y / liability-2y | DEFINITE | enabled (per-finding) | by + bx-style (select/approve/download) |
| US national (all 56) | FCRA 1681c(a)(1)/(3)/(4)/(5) | PROBABLE | eligible (verification) | bm / bs / br |
| US-NY | GBL 380-j(f)(1) bankruptcy-14y / judgment-5y / tax-lien-7y | PROBABLE | eligible (verification) | bm / bs / br |
| US-CA | historical-verification qualifier | PROBABLE | eligible (verification) | bm |
| US-CA | CCRAA 1785.13(a)(8) adverse-information | fail-closed (no finding) | none | none (observation only) |
| CA (12 other prov./territories), GB (4 nations) | no admitted finding adapter | none | none | none |

**Qualified probable issues surface WITHOUT the consumer answering a report-use question.** The US national and
US-NY rules record off-report use exceptions that cannot be resolved from the report, so they emit a PROBABLE
verification request proactively. The single admitted report-use question can only NEGATE (an at-threshold
exempted use removes the probable issue) or stay unresolved; it never unlocks a violation and is never required
to surface the probable issue.

## 4. Gaps retained (not just missing statutes)

- **Format field gaps** (section 1): AU/GB/TU-CA/US families still lack balance/past-due, status-closure,
duplicate, responsibility and payment-history on the family readers; the general intake covers them.
- **Category gaps**: on the family readers, only account-dates (AU/GB/TU-CA) and balance/payment (US) are
reachable; the other categories need the general intake.
- **Statutory coverage gap**: 15 of 82 regions (11 Canadian provinces/territories + the 4 GB nations) have no
admitted finding adapter (BLOCKER-FINDING-COVERAGE-001).
- **Subscriber history/comparison**: implemented and behaviorally tested (bz + a real-browser step in bw); the evidence file records the implementation scope (IMPLEMENTED_AND_TESTED) while staging verification stays PENDING (BLOCKER-SUBSCRIPTION-VALUE-001). A status, not a behaviour gap.

- **Packet readiness / all-82 facilitation evidence**: produced this batch (`out/dispute-packet-evidence.json`,
  `out/all82-facilitation-evidence.json`). Both map every required criterion to its actual test and source identity; each
  leaves exactly one criterion open (`jurisdiction_content` / `applicable_assessment`) for the same 16 rows above.
## 5. Subscriber value: owned report history + subsequent-report comparison

Implemented and behaviorally tested (BLOCKER-SUBSCRIPTION-VALUE-001). A subscriber uploads a subsequent
report, compares it with an earlier owned report, sees supported changes in previously identified issues, and
can still select current issues for a reviewed packet. The comparison reuses the persisted extractions, results
and unified issue descriptor; it is read-only and changes no earlier fact, result or packet.

| Aspect | Behavior | Evidence |
|---|---|---|
| History | every persisted assessment the account owns, newest report first, with bureau and report date | bz + real browser (bw) |
| Comparison | consumer-chosen pair; order taken from the two report dates (no claim when it is uncertain) | bz |
| Matching | supported identity evidence only (report-masked identifier AND printed creditor identity); a partial match stays qualified | bz |
| Outcomes | still observed / changed / no longer observed in the later report / not comparable | bz |
| Delivery | rendered in the Wizzard, with before/after facts, report identities and explicit uncertainty | real browser (bw) |
| Preservation | an approved historical packet is unchanged and still downloads after a comparison | bz |

Absence in a later report alone never proves a correction, deletion, a bureau action or compliance, and a
cross-bureau difference is preserved rather than read as improvement or deterioration.

## 6. Implementation status and the four outcomes (reconciled with the released build)

Derived by running `release-check.cjs` from `accelerated-launch/service` (see
`CRP_IMPLEMENTATION_EVIDENCE_RECONCILIATION_001.md`, `CRP_NEXT_BATCH_COVERAGE_PROPOSAL_001.md` and
`CRP_PACKET_CORRESPONDENCE_AND_CANDIDATE_001.md`). Implementation closure is independent of a hosted journey.

| Status | Count |
|---|---|
| capability blockers | 29 (every blocker still FAILS the release check) |
| implementation closed | **26** |
| implementation open | **3** |
| non-capability gates | 4 (configuration/deployment, not capability) |

The four outcomes are measured separately, so the blockers are not attributed to one cause:

| Outcome | Measured |
|---|---|
| jurisdiction-specific statutory assessment | 71/82 rows (absent for the 11 remaining Canadian provinces/territories) |
| supported potential/probable issue delivery | **82/82 rows** - the six shared factual-verification issues are jurisdiction-agnostic |
| consumer-selected verification/correction packet delivery | **82/82 rows** - a factual verification request needs no citation |
| jurisdiction-specific correspondence requirements | **required output** - see the correction below |

| Implementation-open gate | Class and precise remaining behavior |
|---|---|
| BLOCKER-FINDING-COVERAGE-001 | missing functionality: a supported substantive rule for the 11 remaining Canadian rows (Ontario closed by OWNER-CA-ORDINARY-REPORT-001; the four GB nations closed by CRP_VERSION_1_FINISH_ORDER_001 on UK GDPR Articles 5(1)(d) and 16, CRP-LSRC-0407). Each Canadian row is recorded once with its exact missing prerequisite in `SOURCE_CAPTURES/CA-REMAINING-COVERAGE/crp-remaining-canadian-coverage-blocked-candidates.json` |
| BLOCKER-ALL82-FACILITATION-001 | `applicable_assessment`: the 11 remaining Canadian rows need the same rule path; the four GB rows now carry a demonstrated recorded limb on the general bureau-report intake, and the GB consumer-disclosure **family's** current-format currency (`CURRENT_GB_SUPPORT_IS_ESTABLISHED`) remains its own separate intake gap, untouched by that rule |
| BLOCKER-FDT-001 | staging/benchmark-gated: two required criteria are served (`on_deployed`) demonstrations. The frozen fictional inputs, the local benchmark/acceptance and the criterion record with those two criteria left FALSE are prepared (`SOURCE_CAPTURES/FDT-ACCEPTANCE-001/`); the served run still needs a target release identity |

`BLOCKER-DISPUTE-PACKET-001` is no longer in this table: **OWNER-PACKET-CORRESPONDENCE-001** implemented the packet's
recipient type, the consumer-supplied correspondence details (kept separate from the report facts and bound into the
approval), a correspondence covering only the selected issues, and the organized evidence-reference section, and
`cb-packet-correspondence` measures them on the ACTUAL downloaded document (84 assertions). Its `packet_scope`,
`consumer_review` and `usable_download` criteria are closed; what remains for that blocker is the hosted review and a
purchased download (`end_to_end_journey`), which stays PENDING.

An earlier record stated that no correspondence is required because this service sends nothing. **Corrected:** CRP does
not transmit, but the consumer sends the packet, so the packet must carry the applicable correspondence and
organized evidence references. That unsupported packet closure was withdrawn, and the gap it named is now closed on
measured behavioral evidence rather than re-asserted.

`CURRENT_GB_SUPPORT_IS_ESTABLISHED` is a current-format **intake-evidence** gap - a missing required artifact for
the GB family reader, distinct from a configuration, deployment, implementation or staging requirement.

## 7. Ranked remaining core gaps (consumer benefit, demonstrated evidence, readiness)

Ranked so the Prime Directive leads. No obscure statute is proposed to raise a count and no certainty-only gate is
restored.

1. **A Canadian compliance rule on already-extracted report facts** - the Prime Directive core. **Ontario is now
   implemented** (OWNER-CA-ORDINARY-REPORT-001): Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a),
   source entry `CRP-LSRC-0362`, delivered as a PROBABLE verification on the report's own contradicting values for
   one ordinary account. The remaining 11 Canadian rows still need a supported substantive rule path. The
   country-wide PIPEDA candidate `CRP-LSRC-0319` stays recorded and unimplemented because its region relation,
   instrument class and register disposition are unresolved; the remaining Ontario IDs `CRP-LSRC-0363` to
   `CRP-LSRC-0372` stay unimplemented because their instrument-class screen is INCONCLUSIVE.
2. **Ordinary-account field coverage on the existing family readers** - one concrete improvement is now
   implemented (the AU readers leading printed date); the remaining family gaps stay measured and open.
3. **Current GB report intake** - named source `CRP-LSRC-0407` (UK GDPR Articles 5(1)(d)/16), gated on a
   current-format artifact this build cannot currently obtain.
4. **Served/staging verification and the four config/deployment gates** - a deployment and configuration outcome.

~~The packet correspondence itself~~ is **done** (ranked first before this batch): the packet now carries a recipient
type, the consumer-supplied correspondence details and an organized correspondence/evidence section, built from the
issues and facts it already carried, and is measured on the actual download.

## 8. This batch

One executable change: the Equifax Australia family reader reads the leading printed date of its own `Opened
Date`/`Closed Date` value when the value carries the report's trailing classification (the admitted PUB-012 sample
prints `15 Nov 2013 Secured or Partially Secured`, which previously yielded no date at all). Verified by the new
`ca-au-ordinary-field` section (19 assertions): the real sample, a benign control, the positive case through the
real Issue -> Wizzard -> selected-packet path, the provenance and the downloaded content.

## 9. OWNER-PACKET-CORRESPONDENCE-001 (the batch after §8)

**The packet is now the consumer's own correspondence, not just a statement of findings.** It carries the recipient
TYPE ("the consumer reporting agency that issued this report" - no address is invented, because this service supplies
none), the consumer-entered correspondence details (name, reply contact, optional reference) held on the packet row
SEPARATELY from the report facts and hashed into the approved version, one request per SELECTED issue and nothing else,
and an organized evidence-reference section giving the report and record identity, the raw printed readings, the
normalized values, the available source locations and the recorded rule where a statutory duty applies. The consumer
reviews all of it in the Wizzard before approving.

**Refusals stay typed and honest.** A missing necessary detail refuses approval AND download
(`409 PACKET_CORRESPONDENCE_REQUIRED`) rather than producing an unusable document; editing a detail after approval
leaves the packet unapproved so the download is refused until reapproval; a re-evaluation marks the approval stale
(`409 PACKET_APPROVAL_STALE`); another account is refused 403 and an unpaid account 402. Nothing is invented: no
address, remedy, deadline, signature or submitted status, and no legal-advice disclaimer anywhere.

**Evidence generation is self-restoring.** A successful full regression re-derives every closure record and the
subscription-value evidence builder from that same run (16 records), so valid implementation evidence survives a
regression with no manual step; a FAILED run restores nothing; and every record still re-hashes its cited sources.

**Measured result**: implementation closed **26** of 29 capability blockers, implementation open **3** (FDT-001,
FINDING-COVERAGE-001, ALL82-FACILITATION-001), staging verification pending 29, all 33 release checks still failing.
New `cb-packet-correspondence` section: 84 assertions. Final full regression: **4499 assertions, 0 failed, 0 skipped**.


## 10. OWNER-CA-ORDINARY-REPORT-001 - the Ontario ordinary-report compliance issue (the batch after §9)

**The candidate, chosen once from the recorded set.** Of the admitted Canadian entries, only `CRP-LSRC-0362`
(Consumer Reporting Act (Ontario), R.S.O. 1990, c. C.33, s. 9(3)(a), the legacy atomic rule
`ca-on.cra.s9_3_a.best_evidence_basis`, family `REPORT_ACCURACY_OR_COMPLETENESS`) has an EXACT regional
association, an owner-accepted instrument screened as a statute or regulation with no confirmation outstanding,
and an ESTABLISHED legacy operational mapping. The country-wide PIPEDA candidates (`CRP-LSRC-0319`) still require a
recorded region relation and an instrument-class confirmation, and the remaining Ontario IDs `CRP-LSRC-0363` to
`CRP-LSRC-0372` carry a `SCREEN_INCONCLUSIVE` instrument class. Those stay recorded and unimplemented; no broad
inventory was repeated and no disabled adapter was built to raise a count.

**The one outstanding item, recorded rather than assumed away.** The ledger names exactly one implementation
dependency for `CRP-LSRC-0362`: `REGISTER_DISPOSITION_UNRESOLVED` / `NO_DURABLE_RESCREEN_RECORD`, whose recorded
clearing authority is WORK in an authorised batch, with an additional AUTHORISED_EVIDENCE_ROUTE only "where the
disposition turns on report-field or event-date mapping". That disposition is now recorded durably in
`SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-report-evidence-reliability-rescreen-disposition.json`: the
rule turns on the ordinary-account opened/closed readings, which the admitted general bureau-report intake already
extracts, normalizes and source-locates, so no new field, event date or evidence route is introduced. **(Corrected
2026-10-04, OWNER-CA-ORDINARY-REPORT-002.)** The provision was then retrieved or located and its wording is recorded
in `SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json` — Consumer Reporting Act (Ontario),
R.S.O. 1990, c. C.33, s. 9(3)(a), "any credit information based on evidence that is not the best evidence reasonably
available", section 9 "Procedures of agencies" — with the publisher (Government of Ontario, e-Laws), the applicable
edition (consolidation from July 1, 2026 to the e-Laws currency date; last amendment 2025, c. 24, Sched. 6, which
amends s. 12(3) and not s. 9) and the retrieval limitation (no authoritative full-page render of paragraph (a) in
this environment). The rule's recorded subject previously carried an unrecorded gloss on another instrument's
phrase; that gloss is replaced by the provision's own words. Commencement is NOT treated as irrelevant: temporal
applicability conditions attribution for a content rule just as much as for a retention rule, and it is distinct
from retention arithmetic, which this rule does not perform.

**What it measures and what it can never claim.** The report's OWN two printed values for one ordinary account.
When the printed opened date is later than the printed closed date, those values cannot both be right, and that is
the affirmative report evidence the recorded provision concerns. The ceiling is `PROBABLE_VIOLATION`: the
report never shows which of the two values is unreliable, nor whether a benign explanation applies, so the request
is a **verification**, never a correction demand and never an established breach. A reading that could not be made
is never treated as an absent date, and an absent date is never treated as compliance.

**The consumer path, measured on the actual download.** `cc-ca-on-ordinary-report` (120 assertions) drives the
fictional upload through the general bureau-report intake to the Issue, the Wizzard, the consumer-selected
correspondence, approval and an entitled download carrying the recorded citation, the source version, both
printed readings with their normalizations and locations, and the second base the issue rests on. Controls: a
consistent account raises nothing; the same printed conflict outside Ontario and a United States selection raise no
Ontario issue (outside Ontario the factual observation is still offered on its own); a single printed date and an
unresolvable date convention raise nothing and claim no compliance. Ownership (403 for a stranger) and entitlement
(402 unpaid) are enforced on the packet path.

**Served surface kept truthful.** Ontario's availability row now names one recorded rule comparison alongside its
four factual observations, and the aggregate moved with it: 67 of 82 rows carry a recorded statutory rule
comparison and 15 state that none is recorded. The fictional-fixture journey is NOT counted as real-evidence
performance, so no real-evidence figure was inflated.

## Court-limitation assessment and payment-history analysis (Batch 31, October 6 2026)

Two mechanisms now run wherever the printed fields support them. Both are executed through the SAME pipeline that
produces the free summary, the complete assessment and the subscriber packet, so a row here is "delivered" only
where a named test produced the item.

| Mechanism | Reader / surface where DELIVERED | Where it is capability-gated | Evidence |
|---|---|---|---|
| Court-enforcement limitation (`limitation-assessment.cjs`) | TransUnion Canada family (`FAM-TU-CA-CONSUMER`): the supplied real Nova Scotia report and the synthetic controls; and the **general intake** (a fictional Nova Scotia collection entry). | Every jurisdiction whose limitation statute has **not** been read: the mechanism produces nothing and records the exact element it lacks (the only recorded parameter set is Nova Scotia: S.N.S. 2014, c. 35, s. 8(1), 2 years from discovery, 15-year ultimate, ss. 20-21 acknowledgment, s. 11(3) transitional). The other families supply the shared facts the accessors read, so they execute where a reader prints an adverse indicator and a usable start date. | `cr-ca-ns-tu-real-report` 62/62 (two real items), `cs-limitation-and-payment-history` 56/56 (boundaries, withholding, isolation, the report-date flip), `bw-browser-wizzard` 67/67 (free summary, teaser, locked packet, subscriber selection, approved packet download) |
| Payment-history analysis (`payment-history-analysis.cjs`) | Every reader whose records carry dated monthly rows with printed rating and narrative meanings (TransUnion Canada on the supplied real report: 112 records, three analyses each). | A record with no dated monthly rows, no printed rating meanings or no printed narrative legend yields no analysis for that record; seven candidates are refused with their exact reason and prerequisite. | `cs-limitation-and-payment-history` 56/56 (three positives, benign twin of each, unknown rating, blank cell, absent anchor), `cr-ca-ns-tu-real-report` 62/62 (three analyses over the real report, no false positive) |

**Not claimed.** No jurisdiction outside Nova Scotia has a limitation parameter set, so no limitation item is
produced for the other 81 selections — that is a recorded gap, not a delivered behaviour. The payment-history
mechanisms were verified on one real report and on synthetic controls only; no second bureau's real consumer
disclosure has been used.

