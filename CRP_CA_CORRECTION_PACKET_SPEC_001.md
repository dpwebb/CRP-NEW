# CRP_CA_CORRECTION_PACKET_SPEC_001 — Bounded California correction packet

Recorded BEFORE implementation, 2026-10-04. This is the packet specification for the bounded California
correction-packet batch. It does NOT close BLOCKER-DISPUTE-PACKET-001 (all-82 packet readiness), nor
BLOCKER-FINDING-COVERAGE-001, nor launch readiness.

## 1. Scope

Only the three demonstrated California VIOLATION rules, and only when the emitted classification is `VIOLATION`
(never `PROBABLE_VIOLATION`, never observation-only, never unresolved):

| rule id | citation | anchor |
| --- | --- | --- |
| `US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y` | Civ. Code § 1785.13(a)(1) | order for relief, 10 years |
| `US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y` | Civ. Code § 1785.13(a)(4) | paid-tax-lien date, 7 years |
| `US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y` | Civ. Code § 1785.13(a)(5), (b) | delinquency + 180 days, 7 years |

Every other rule stays `packet_eligible: false` (observation-only, probable, other jurisdictions, and the
fail-closed § 1785.13(a)(8) rule).

## 2. Narrow authorization

Packet eligibility is a permission on the rule, evaluated per emitted finding. A finding is packet-eligible only
when ALL of the following hold:

1. the rule id is one of the three above (the permission `packet_eligible: true`), AND
2. the machine emits a finding whose `classification === 'VIOLATION'`, AND
3. the finding carries its complete associations — rule identity (adapter id, citation, source version),
   selected jurisdiction, resolved decisive facts with source-linked provenance (raw printed value, page/line
   location, normalization, uncertainty, record index), resolved reference date, PERIOD_EXCEEDED timing, resolved
   exceptions, and the enforced evidence-policy digest.

Condition (3) is already what the classifier requires to emit a VIOLATION at all, so a VIOLATION finding is, by
construction, fully associated. The gate re-checks the rule-id permission and the VIOLATION class and never
upgrades a lesser state.

Direct API calls enforce the same boundary: the packet modules compute eligibility from the persisted evaluation
(the same data the server-side endpoints read); no request body can name an ineligible finding.

## 3. Consumer path

1. **Select** — the consumer selects a non-empty subset of the eligible VIOLATION findings.
2. **Review** — each selected finding shows its factual basis: the rule citation, the printed raw value and its
   page/line location, the normalized value, and the measured period.
3. **Edit** — the consumer may add/edit permitted request wording. This wording is stored separately from the
   report facts and is never merged into them.
4. **Approve** — the consumer explicitly approves the current version. Approval records a content hash over the
   result identity, the selected findings, the consumer wording and the report identity.
5. **Download** — an entitlement-gated download of a coherent, readable packet bound to the approved version.

Changing the selection, the wording, or the underlying result (re-evaluation) changes the content hash and
invalidates the prior approval; the download then requires a fresh approval.

## 4. Packet content (factual only)

Per selected finding, the packet states, from the report's own printed facts and the recorded rule:

- the rule citation and its recorded source version,
- the record the finding came from (kind + record index),
- the printed raw value and its page/line location (and normalization),
- the measured retention period and the reference date it runs from,
- a factual correction request in the reporting-issue language already used by the consumer surface.

The packet does NOT invent remedies, recipient addresses, procedural deadlines, or legal conclusions. It contains
no legal-advice disclaimer (per CRP_OWNER_CONSUMER_LANGUAGE_IMPERATIVE_001.md) and explains reporting issues
directly. The consumer's own wording appears in a clearly separated section and is never presented as a report
fact.

## 5. Entitlement

The packet download reuses the approved offering's entitlement rules: `downloadEntitled` (an active subscription
or a one-time purchase bound to the case). Account/case ownership is enforced by `requireOwnedCase` on every
request. No new paid tier, no live-billing change, no manual entitlement grant, no bureau submission, no mailing,
and no external transmission.

## 6. Out of scope / not closed

This specification covers the bounded California packet only. It does not establish packet readiness for any other
jurisdiction, does not close all-82 facilitation, and does not change launch readiness. Real-browser, staging and
production verification are separate statuses and are not prerequisites for implementation closure.
