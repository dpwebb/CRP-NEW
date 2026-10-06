# GAP-FINDING-004 — source-linked finding facts: completion record

## Verdict — October 3, 2026

**CLOSED on `crp-wizard-fba918c4e8b47bdc`.** Every finding's evaluation evidence now carries the exact raw
printed fact, its source document/page location, its normalization, its uncertainty and the enforced
evidence-policy version/digest. An absent or misassociated source blocks the finding; each finding binds to its
own record source, never another account; and the consumer result and purchased report trace the comparison back
to the correct source.

## What changed

- `accelerated-launch/service/formats.cjs`: new `factSourcesForRecord(record)` builds, for every fact a record
  carries, its source-linked provenance — `raw_value` (exact printed text), `location` (page/line), `normalization`
  (raw → normalized), `uncertainty` (status/reason/precision), `source_field`, `section_path`, `record_index` —
  taken only from the record's own `printed`/`location`/`status`; nothing is invented.
- `accelerated-launch/service/evaluation.cjs`: `runOne` now passes `fact_sources` (from `factSourcesForRecord`)
  into `runAdapter`.
- `accelerated-launch/adapters/rule-adapters.cjs`:
  - `runAdapter` attaches `anchor.source` (and `anchor.condition_source`) from `req.fact_sources`.
  - `buildEvaluationRecord` carries `source` on every resolved `required_fact` and `condition`, and adds a
    `policy` identity (`policy_id`, `version`, `digest`) to the evaluation record.
  - `classifyEvaluation` now requires, for every resolved fact, a `source` with a `location`, a `raw_value` and a
    `normalized_value` that corresponds to the evaluated `iso`/`value_as_supplied` (absent or misassociated →
    no finding), plus a present `policy.digest`.
- `accelerated-launch/service/results.cjs`: the consumer result carries `rule_source` (raw value, location,
  normalization, uncertainty) beside each finding and a top-level `policy` identity.
- `accelerated-launch/service/journey.cjs`: the purchased report renders `Source fact: printed "…" (page X, line Y)
  → normalized …`, `Rule version: …`, and `Evidence policy: OWNER-EVIDENCE-001 v1.0 (digest)`.
- New test `as-gap-finding-004.cjs` (15 assertions): source links retained, absent/misassociated source blocks,
  policy identity/digest retained, two records do not cross-associate.
- Synthetic declared-fact harnesses (`af-accept-004`, `aq-gap-finding-001`, `ar-gap-finding-003`, and the
  GAP-FINDING-003 focused-evidence script) now declare a synthetic `fact_sources` so the source-linked gate does
  not silently change their assertions.

## Measured behavior

- A real CA breach (`Date of Order for Relief 01/01/2010`, report 12 June 2026) derives VIOLATION with
  `required_facts[0].source` = `{ raw_value: "01/01/2010", normalized_value: "2010-01-01", location: { page: 1, line: 3 },
  normalization: { from: "01/01/2010", to: "2010-01-01" }, uncertainty: { status: "RESOLVED", precision: "DAY" } }`
  and `policy` = `{ policy_id: OWNER-EVIDENCE-001, version: "1.0", digest: d48e4633… }`.
- Absent source (`source: null`) → `classifyEvaluation` returns `null`; misassociated source (wrong
  `normalized_value`) → `null`.
- Two bankruptcy records → two findings, each with its own `source.record_index` (no cross-account association).
- Paid HTTP journey (real signed test-payment entitlement): US-CA case created `201` → upload `201` → evaluate
  `201` → consumer view `200` (finding `VIOLATION`, `rule_source.raw_value: "01/01/2011"`, `policy.digest:
  d48e4633…`); the entitled existing case's purchased download `200` renders `Evidence policy: OWNER-EVIDENCE-001
  v1.0 (d48e4633…)`, `Rule version: FE5C1BA…`, and `Source: … page …`.

## Release state

- Served build: `crp-wizard-fba918c4e8b47bdc` (61 files, 0 hash mismatches, active, test billing,
  `launch_ready: false`).
- Rollback predecessor: `crp-wizard-f4585e4efa0b75f9`; snapshot
  `/opt/crp-wizard-staging/backups/pre-gap-finding-004-20261003-220745`.
- Regression: **5,421 assertions, 0 failed, 0 skipped** (baseline 5,406; +15 `as-gap-finding-004`).
- Strict release check: GAP-FINDING-001, GAP-FINDING-003, GAP-FINDING-004 and GAP-INGEST-003 PASS current-release;
  GAP-FINDING-002 FAIL (honest, still blocked on the owner decision). **21 launch-blocking checks remain**
  (was 22).

## Boundaries

- No page/image coordinate or normalization is invented: the source provenance is taken verbatim from the record's
  own `printed`/`location`/`status`; the synthetic test harnesses mark their locations `synthetic: true`.
- The classifier/finding gates were only strengthened (source present, consistent and policy-bound), never
  weakened; unknown still never becomes false, and an unresolved exception still yields no finding.
- No private evidence leaks across accounts: each fact's source is derived from its own record
  (`factSourcesForRecord`), and the two-record test proves distinct `record_index` bindings.
- GAP-FINDING-002 remains OPEN pending the owner's decisive-fact decision and is not closed by implication.

## Next substantive blocker

GAP-FINDING-002 (owner decision on a genuine decisive-fact-unavailable source).
