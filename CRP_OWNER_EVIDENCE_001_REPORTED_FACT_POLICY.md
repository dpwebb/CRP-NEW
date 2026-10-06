# OWNER-EVIDENCE-001 — Immutable Reported-Fact Policy (version 1.0)

Owner authorization: issued within the acceptance work, 2026-10-01. This batch stores and **enforces** the
reported-fact policy, accepts a clearly labelled bankruptcy discharge date, and keeps factual acceptance
separate from legal classification.

## 1. The policy (exact text)

> A clearly labelled fact printed on an admitted credit report is accepted as the bureau's reported fact for
> assessment, unless its reading, record association or meaning is materially ambiguous or contradictory.
> External corroboration is not required merely because the fact describes a legal event.

- **Stable identifier:** `OWNER-EVIDENCE-001`; **version:** `1.0`.
- **Stored at:** `accelerated-launch/reported-fact-policy.json` (the canonical text) and
  `accelerated-launch/reported-fact-policy.cjs` (the enforced interface).
- **Integrity digest:** a SHA-256 over the canonicalised policy fields (`policy_id|version|title|text|issued|authority|amendment_rule|released_versions`). Any alteration to the stored text changes the digest and is detected by the test suite.
- **Amendment rule:** changes require an explicit owner-authorized amendment and a new version; released versions are preserved and never overwritten.
- **Release binding:** both files are traced into the release package and re-hashed on Linux with the rest of the build.

## 2. Enforcement (not documentation, not an AI prompt)

The policy is enforced through a shared assessment interface, `acceptFact(reading)` in
`reported-fact-policy.cjs`. A fact is accepted only when it is:

1. clearly labelled,
2. readable (raw + normalized value present),
3. unambiguous (a partial value such as a month-only date is refused),
4. associated with the correct record, and
5. free of material contradiction.

The fact that a value describes a legal event (for example a bankruptcy discharge date) is **not** a reason to
reject it. The general intake routes every reported-fact acceptance decision through `acceptFact`, so an
adapter cannot silently reject a clearly established fact solely because it describes a legal event.

## 3. The bankruptcy discharge date

For `bankruptcy.dischargeDate` the general intake establishes, per the policy:

- an **explicit label** identifying the consumer's bankruptcy discharge (`DISCHARGED`, `DISCHARGE DATE`,
  `DATE OF DISCHARGE`, `DATE DISCHARGED`), on a line that identifies the bankruptcy itself;
- an **unambiguous date** (day precision; a month-only date is withheld as ambiguous);
- the **raw label/value and page/line location** (preserved in the record's `printed` reading);
- **material contradictions** (two bankruptcy records printing two different discharge dates) are withheld by
  a cross-record pass.

The fact is used for the applicable calculation **without a court document**. It is never substituted with a
filing date, an update date, an ambiguous bankruptcy date, or a trustee's discharge
(`TRUSTEE'S DISCHARGE` / `DISCHARGE OF TRUSTEE` is refused).

## 4. Factual acceptance stays separate from legal classification

- The `CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y` check now anchors on `bankruptcy.dischargeDate`
  (`anchor_mode: SINGLE_FIELD`) instead of withholding it as a legal event.
- Its **jurisdiction applicability** (`CA` / `CA-NS`, exact) is unchanged.
- Its **exact-specimen presentation restriction** (`PR-01`) is preserved: a general report does not broaden
  the CA-NS statutory surface.
- Its **finding permission** is unchanged: `finding_allowed: false`, `packet_eligible: false`, ceiling
  `observation`. Accepting the fact does not authorize a violation finding.
- Absence of a second bankruptcy on a report does not prove that none ever occurred; no such inference is made.

## 5. Reconciliation of the conflicting governing requirements (recorded, exact replacement)

- **B4 instruction** ("Keep the original CA-NS statutory admission exact-specimen and observation-only") and
  **OWNER-EVIDENCE-001** ("external corroboration is not required merely because the fact describes a legal
  event") conflicted on the reason the bankruptcy limb was withheld.
- The reconciliation is recorded in `adapter-configs.json` (exact before/after on `anchor_mode`,
  `anchor_field`, `record_kinds`, `start_record`, `presentation_required_added_by` and
  `output_permission.max_conclusion`): the limb is now `SINGLE_FIELD` on the reported discharge date, and the
  exact-specimen PR-01 restriction is preserved. No precedence-by-recency was used.

## 6. Tests (section `ac-evidence-policy`)

- explicit discharge dates are **accepted**;
- ambiguous (month-only), contradictory (two discharge dates), mis-associated (collection "discharged"),
  trustee, and filing/update dates are **withheld**;
- equivalent facts work **across layouts**;
- accepting the fact does **not** authorize a violation finding (`emitFinding` still refuses);
- policy **alteration is detected** (the digest changes; it cannot silently enter a release);
- the policy version is **recorded** in each assessment's factual view.

Local regression: `node accelerated-launch/service/tests/run-tests.cjs` → **4,851 assertions passed, 0 failed,
0 skipped**.

## 7. Deployed build

Recorded in `SOURCE_CAPTURES/OWNER-EVIDENCE-001/staging-deployment-provenance.json`. Production unchanged;
Stripe in test mode.

## Boundaries

No legal finding class was authorized, no jurisdiction was inferred, and no bureau-response packet was made
eligible. The policy accepts a printed fact as the bureau's **reported fact**; it does not convert that fact
into a legal conclusion.
