# GAP-FINDING-003 — rule identity/version binding: completion record

## Verdict — October 3, 2026

**CLOSED on `crp-wizard-f4585e4efa0b75f9`.** Evaluations and findings now bind to the actual
governed/admitted rule identity and version — the SHA-256 digest of the admitted source artifact — not just a
citation or a legacy id. The correct version is retained with the consumer result and the purchased report
download; an absent or inconsistent version blocks the finding; the version is deterministic; and the historical
assessment identity (source_entry_id + version) is preserved.

## What changed

- `accelerated-launch/adapters/adapter-configs.json`: every one of the 14 adapters now records
  `source_version` (the 64-hex SHA-256 digest of its admitted source artifact) and `source_artifact` (the
  admitted artifact path), each pulled from `CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md` (the digest-bound legal-source
  catalogue). Two distinct artifact digests appear: `90A05625…F174CF` (`rules.canada.ts`, CA-NS s. 10(3)(c)) and
  `FE5C1BA…BD41F6` (`legalRules.ts`, the 13 remaining adapters).
- `accelerated-launch/adapters/rule-adapters.cjs`:
  - `REQUIRED_ADAPTER_FIELDS` now includes `source_version`, so a missing version fails the structural
    self-check loudly rather than running a half-specified adapter.
  - `buildEvaluationRecord` carries `source_version`, `source_artifact` and `ledger_row_ids` in `rule_identity`.
  - `classifyEvaluation` rejects a finding when `rule_identity.source_version` is absent (null/empty) — a
    citation or legacy id is no longer enough.
  - `classify` additionally rejects a finding when the evaluation's `source_version` does not match the adapter's
    recorded version (inconsistent version), and the emitted finding retains `source_entry_id`, `source_version`
    and `source_artifact`.
- `accelerated-launch/service/evaluation.cjs`: `checkDescriptor` now carries `source_entry_id` and
  `source_version` for audit.
- `accelerated-launch/service/results.cjs`: each consumer observation carries `rule_source_version` (the 64-hex
  digest) beside the finding. The internal `source_entry_id` (a `CRP-LSRC-…` identifier) is deliberately **not**
  rendered — it stays in `machine` for audit, so the privacy invariant (no internal identifier reaches the UI) is
  preserved.
- `accelerated-launch/service/journey.cjs`: the purchased report renders `Rule version: <digest>` for every
  comparison that has an admitted version.
- `accelerated-launch/service/tests/sections/ar-gap-finding-003.cjs` (new, 11 assertions): correct version
  retained, absent version blocks, inconsistent version blocks, deterministic 64-hex digest, distinct source-entry
  identities, historical identity preserved.

## Measured behavior

- `runAdapter('US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y', …)` → `EVALUATED`/`PERIOD_EXCEEDED`/`VIOLATION`, with
  `rule_identity.source_version` and `finding.source_version` both `FE5C1BA…BD41F6` and
  `finding.source_entry_id` `CRP-LSRC-0171`.
- Absent version: `classifyEvaluation` with `source_version: null` returns `null` (no finding).
- Inconsistent version: `classify` with a tampered `source_version` (`0`×64) returns `null` (no finding).
- Paid HTTP journey (signed test-payment entitlement, real webhook, `statutory-control.png` upload):
  upload `201` → evaluate `201` → consumer view `200` → purchased download `200`; the consumer view carries
  `rule_source_version: FE5C1BA…BD41F6` and the report carries `Rule version: FE5C1BA…BD41F6`.

## Release state

- Served build: `crp-wizard-f4585e4efa0b75f9` (61 files, 0 hash mismatches, active, test billing,
  `launch_ready: false`).
- Rollback predecessor: `crp-wizard-2f5a0492e85ed098`; snapshot
  `/opt/crp-wizard-staging/backups/pre-gap-finding-003-20261003-213843`.
- Regression: **5,406 assertions, 0 failed, 0 skipped** (baseline 5,395; +11 `ar-gap-finding-003`).
- Strict release check: GAP-FINDING-001, GAP-FINDING-003 and GAP-INGEST-003 PASS current-release; GAP-FINDING-002
  FAIL (honest, still blocked on the owner decision); GAP-FINDING-004 FAIL (not started). **22 launch-blocking
  checks remain** (was 23).

## Boundaries

- The version is **never invented**: `source_version` is copied verbatim from the digest-bound legal-source
  catalogue (`source_artifact_sha256`), which is itself the admitted source digest. No version field was
  synthesized for any rule.
- The classifier and finding gates were **not weakened**: `classifyEvaluation` and `classify` only added
  requirements (version present and consistent), never removed any. Unknown still never becomes false, and an
  unresolved exception still yields no finding.
- GAP-FINDING-002 and GAP-FINDING-004 are **not closed by implication**: GAP-FINDING-002 remains OPEN pending the
  owner's decisive-fact decision, and GAP-FINDING-004 (source-linked finding facts) is a separate, still-open
  criterion.

## Next substantive blocker

GAP-FINDING-002 (owner decision) and GAP-FINDING-004 (source-linked finding facts).
