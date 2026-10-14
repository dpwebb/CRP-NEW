# Verification structure

## Standing change-aware entry

For finished work and release preparation, use `deploy/release-workflow.cjs prepare` → `check` → `record`, followed by `package` when preparing a release artifact. Follow [CHANGE_AWARE_RELEASE.md](../deploy/CHANGE_AWARE_RELEASE.md) for `continuity`, `assemble`, evidence-specific `attest` and the unchanged staging/production gates. Run from an isolated checkout of current reconciled source and its matching raw baseline receipt. The October 14 branch reconciliation supersedes older primary-checkpoint notes.

The plan determines required coverage. Documentation/tooling-only changes use changed-tool verification and product continuity; eligible static presentation uses affected consumer/security/browser coverage; shared runtime, test contracts, product scripts and unknown dependencies retain full regression. Reuse passing local steps only with exact bound inputs and output hashes. Product-step reuse remains disabled without a complete reviewed profile covering dynamic fixtures, external modules/binaries and environment-resolved inputs. Proof assembly does not rerun product/browser tests. Historical full proof, fresh focused proof and fresh hosted/provider observations stay distinct, and one verified archive is promoted unchanged.

Direct focused checks below support development; the default full runner supports an explicitly selected full validation or diagnostic. Do not run it once directly and again through `check` merely because a historical recipe lists both. No product assertion, registry/region journey, adapter/router check or acceptance criterion is removed by this documentation adoption. Admin and other enhancements remain on hold; deployment authorization stays separate.

October 11 process amendment: `CRP_OWNER_CHANGE_AWARE_RELEASE_PROCESS_001.md` controls verification frequency. Use `deploy/release-workflow.cjs plan` and `check` for change-aware selection and separate continuity records. The older blanket finished-batch full-regression instruction below applies to shared/broad changes; bounded presentation or operations changes follow the amendment. Focused invocations may use `--receipt=ABSOLUTE_OR_RELATIVE_NEW_PATH` to preserve distinct attempt receipts. This option requires an explicit selection and refuses to overwrite an existing receipt.

The default `node accelerated-launch/service/tests/run-tests.cjs` runs every current product section. It preserves all-82 applicability, infrastructure and actual upload-to-packet delivery, representative real-browser acceptance, source provenance, definite/probable/potential semantics, approval, ownership, privacy and billing controls.

During development, pass affected section IDs or explicit lanes:

```
node accelerated-launch/service/tests/run-tests.cjs bz-report-history
node accelerated-launch/service/tests/run-tests.cjs --lane=consumer
node accelerated-launch/service/tests/run-tests.cjs --lane=regional
node accelerated-launch/service/tests/run-tests.cjs --lane=formats
node accelerated-launch/service/tests/run-tests.cjs --lane=security
node accelerated-launch/service/tests/run-tests.cjs --lane=browser
node accelerated-launch/service/tests/run-tests.cjs --lane=source-audit
```

Lanes select useful groups, not complete dependency analysis. Select additional dependents of shared extraction, classification, UI, ownership or entitlement changes. Unlisted sections still run in the default full regression. Repeated selections are deduplicated. Unknown sections/lanes exit 2 before execution or evidence writes.

Historical legacy-code parity and captured GB retrieval/marketing-text reproduction run in `source-audit`. Their 23 assertions and original source captures remain available. Run this lane when inherited contracts, catalog/source identity or currency evidence changes. It is separate from the default current product regression, not an implicit pass or production waiver.

Focused runs write `out/focused-evidence.json` and never overwrite full evidence. Full runs write `out/current-regression-evidence.json` with selected/unrun sections, durations, start-of-run source hashes, source drift, completion and section exceptions. A changed source during execution makes the run fail. Previous B2/B3/B4 compatibility evidence is copied into `out/historical` before replacement. Current capability is recorded separately from tested fixture scope and consumer delivery; historical proof is not current launch readiness.

The all-82 infrastructure section retains every behavioral predicate and records per-region failures and predicate counts, while emitting one compound assertion per region. All-82 packet delivery uses distinct printed account dates, own-case download filenames and approval versions, with wrong-owner/wrong-case controls. Every region still runs real upload, extraction, evaluation, selection, approval and entitled download. Completed test cases are removed between iterations to avoid accumulating state; production parsing and approval are never bypassed.

Assertion totals are reporting units, not coverage totals or targets. Nested adapter/router suites report structured child results separately. A section exception means subsequent checks did not execute; zero explicit skips does not establish complete execution.

Run focused checks while building, then let the standing change-aware plan select the final verification. Run full regression for shared runtime/test/unknown changes or an explicitly broad milestone; bounded presentation or operations work follows the owner amendment. Repeat broader execution only after affected input changes, failure repair or a concrete unresolved concern. `build-subscription-value-evidence.cjs --reuse-current` can reuse the completed full run only if its source hashes still match and its required sections completed successfully; it does not rerun the browser or presume a timed-out process passed.

Local implementation, local browser, staging and production are distinct statuses. No verification lane authorizes external transmission, billing changes or deployment.
## October 14 admin verification

The separately authorized admin batch adds `gb-admin-access`, `gc-admin-service` and `gd-admin-http-browser` to the default full product suite and relevant security/browser lanes. These exercise actual access/storage assertions, fictional business flows and real Chrome owner/staff/partner/consumer interactions. No payout, mailing, real account alteration or deployment is performed. See `../ADMINISTRATION.md`. Earlier admin holds below are superseded only for this bounded work order.
