# Change-aware release commands

Run from the repository root. Use a fresh output directory for each attempt; receipts refuse overwrite. The accepted release-record baseline is `7df4325` (runtime source `1859962`); its raw full receipt is `accelerated-launch/service/out/reporting-period-current-2026-10-11/full-regression.json`.

```powershell
$releaseOut = 'accelerated-launch/service/out/change-aware-2026-10-11'
node accelerated-launch/service/deploy/release-workflow.cjs plan 7df4325 accelerated-launch/service/out/reporting-period-current-2026-10-11/full-regression.json "$releaseOut/plan.json"
node accelerated-launch/service/deploy/release-workflow.cjs check "$releaseOut/plan.json" "$releaseOut/checks"
node accelerated-launch/service/deploy/release-workflow.cjs attest "$releaseOut/plan.json" SOURCE_CAPTURES/REPORTING-PERIOD-RELEASE-2026-10-11/provider-paid.json "$releaseOut/unchanged-provider-dependencies.json"
node accelerated-launch/service/deploy/release-workflow.cjs package "$releaseOut/plan.json" "$releaseOut/checks/verification.json" "$releaseOut/candidate"
```

Use the last accepted source commit for the next release. Plans freeze source hashes; source edits invalidate the plan. Generate the release manifest after a product change and before planning. Commit shipped source before packaging. Packaging verifies all committed shipped bytes; unrelated branding/legal drafts are preserved.

```powershell
node accelerated-launch/service/deploy/release-workflow.cjs smoke https://staging.creditregulatorpro.com crp-v1-930d965f09ad49a1 "$releaseOut/staging-smoke.json"
node accelerated-launch/service/deploy/release-workflow.cjs smoke https://creditregulatorpro.com crp-v1-930d965f09ad49a1 "$releaseOut/production-smoke.json"
```

For a NEW runtime release, activation uses the configured `hostinger-vps` SSH alias and `/opt/crp-node/bin/node`. Replace build values with the intended candidate and actual expected previous build. `activate staging` leaves hosted journey acceptance pending. Complete the affected hosted journeys and gate reconciliation before promoting. Provide the resulting exact-build staging gate summary to production activation.

```powershell
node accelerated-launch/service/deploy/release-workflow.cjs activate staging "$releaseOut/candidate/package-receipt.json" crp-v1-930d965f09ad49a1 - "$releaseOut/staging-activation"
node accelerated-launch/service/deploy/release-workflow.cjs activate production "$releaseOut/candidate/package-receipt.json" crp-v1-930d965f09ad49a1 path/to/current-staging-gate-summary.json "$releaseOut/production-activation"
node accelerated-launch/service/deploy/release-workflow.cjs rollback production crp-v1-REPLACE_WITH_CURRENT "$releaseOut/rollback"
```

Activation refuses an unexpected current build, existing release directory, archive/hash mismatch, wrong billing mode or incomplete/wrong-build staging acceptance. It snapshots private data with the service stopped, verifies the copy, and restores the previous symlink/environment if activation health fails. Rollback preserves current consumer records; it does not overwrite them with an older snapshot.

## Evidence boundaries

`check` records fresh full, fresh focused or unchanged product dependencies distinctly. `attest` records original receipt identity and unchanged runtime/test dependencies separately; it never claims a fresh provider transaction or current configuration. Fresh hosted source checks remain required for runtime releases. Provider purchases remain required when billing, entitlement or checkout changes. Visual review remains required when packet appearance or selected-copy fidelity changes.

Syntax checks and public asset retrieval run concurrently. Product tests remain serial because existing sections can write shared compatibility evidence. A new parallel product runner is not enabled by this workflow.
