# OWNER-CONSUMER-EXPERIENCE-001 — Owner amendment

Issued October 2, 2026. Direct owner instruction: "add the Results area , Explanations area, Billing area, Privacy area, and Suooirt area as production blockers or gaps until implemented. Add the rest to the optional enhancements list"

Target: CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md. Additive replacement at the section 9 seam; existing governing requirements remain intact.

Replaced text (exact):

```text
## 9. Stop drift and overcoding
```

Replacement text (exact content, source line endings retained):

```text
### 8.3 Required consumer experience capabilities

Owner amendment OWNER-CONSUMER-EXPERIENCE-001, October 2, 2026. The following five capabilities are **OPEN production blockers** until implemented and verified on the served release. They supplement existing requirements; no legal or evidence safeguard is relaxed.

| Blocker ID | Required capability | Acceptance criteria keys and required behavior |
| --- | --- | --- |
| BLOCKER-RESULTS-001 | Prioritized action list | `prioritization`: deterministic evidence-backed ordering; `reasons`: plain-English reasons and evidence strength, distinguishing observations from findings; `uncertainty`: unresolved issues are qualified and not presented as proven; `journey`: deployed consumer results show the list; `isolation`: account isolation verified. No arbitrary ranking claims or automatic bureau contact. |
| BLOCKER-EXPLANATIONS-001 | Why-this-was-flagged cards | `report_fact`: original relevant fact and source location; `rule_basis`: applicable rule/version or explicitly factual basis; `uncertainty`: material unknowns and exceptions explained; `journey`: cards visible and usable in the deployed wizard; `consistency`: explanation agrees with result classification and downloaded assessment. |
| BLOCKER-BILLING-001 | Subscription and upgrade-credit dashboard | `plan`: actual plan/status and CAD charges; `renewal`: correct next billing date/amount or explicit unavailable state; `cancellation`: working cancellation controls with clear effective date and no unauthorized charge; `upgrade_credit`: CAD 5.95 once-only credit, 90-day eligibility/expiry and redeemed/revoked states agree with server; `isolation`: other accounts cannot access billing data; `journey`: deployed sandbox consumer journey including state transitions. Live billing remains separately gated. |
| BLOCKER-PRIVACY-001 | Privacy dashboard | `inventory`: actual account-owned stored documents and cases; `retention`: implemented retention settings/defaults with accurate effect and limits; `deletion`: functional controlled deletion and truthful backup/legal-retention limitations; `isolation`: no cross-account inventory or deletion; `journey`: deployed consumer dashboard and server behavior agree. Do not claim immediate erasure of backups unless demonstrated. |
| BLOCKER-SUPPORT-001 | Privacy-safe diagnostic reference | `reference`: consumer receives a usable diagnostic reference; `redaction`: no report contents, names/addresses, credentials, tokens or payment details exposed in reference/support output; `access`: protected diagnostic lookup, scoped authorization and retention; `journey`: consumer can report a problem with this reference without attaching a report; `usefulness`: authorized support can identify a reproducible failure category/build without private report content. No automatic external transmission is authorized. |

Each blocker requires deployed behavioral evidence, expected/measured outcomes for every named criterion, passing focused tests and current release identity. Missing, failed or mismatched evidence keeps production blocked. Register these five checks in release-check.cjs and record results in CRP_FINAL_ACCEPTANCE_REGISTER_PLAIN_ENGLISH.md. Existing implementations may satisfy criteria after verification; registration itself is not implementation.

Case reminders, a case progress timeline and an accessible PDF assessment are optional enhancements recorded in CRP_OPTIONAL_ENHANCEMENTS.md, not production blockers or gaps.

## 9. Stop drift and overcoding
```

Change record appended to the plan Amendment history:

| 2026-10-02 | 1.0 OWNER-CONSUMER-EXPERIENCE-001 | Owner explicitly requires Results, Explanations, Billing, Privacy and Support as five OPEN production blockers in section 8.3. Adds deployed behavioral acceptance and release enforcement. Reminders, case timeline and accessible PDF remain optional. Exact amendment recorded in CRP_OWNER_CONSUMER_EXPERIENCE_001_AMENDMENT.md. |

Implementation of the five product capabilities is not claimed. Five release checks are registered and remain OPEN absent deployed, criterion-specific current-release evidence. No deployment or provider mutation was performed. Optional backlog gains only reminders, timeline and accessible PDF.
