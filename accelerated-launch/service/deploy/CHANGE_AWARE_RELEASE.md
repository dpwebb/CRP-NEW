# Change-aware release workflow

Authority: `CRP_OWNER_CHANGE_AWARE_RELEASE_PROCESS_001.md`. This workflow reduces repeated local execution while retaining source custody, consumer consent, exact-build acceptance and separate staging/production authorization. The bounded local admin build is separately authorized by `CRP_OWNER_ADMIN_MANAGEMENT_WORK_ORDER_001.md`; release tooling does not authorize additional enhancements or deployment.

## Prepare one frozen candidate

Work in an isolated checkout based on the verified accepted source. Preserve unrelated dirty work. Identify that release's complete passing **raw** full-regression receipt; do not substitute a focused receipt, sanitized review export or inherited composite. The accepted commit, committed manifest, section inventory and dependency hashes must agree with its baseline descriptor.

Finish the bounded implementation and focused development checks first. Restore required ignored fixture builders, generated consumer assets and other declared prerequisites before an expensive regression. Generate the final manifest and commit the reviewed shipped source, including that manifest, before `prepare`. Stage only the intended files. Executable or verification-input changes after planning require a new plan and appropriate verification; bookkeeping-only documentation does not trigger product regression.

Full product preparation also verifies `tests/required-full-fixtures.json`: 55 accepted ignored source/measurement fixtures and generated consumer assets are explicitly hash-bound. Missing or changed fixture bytes stop `prepare` before tooling or the long product run. Restore the accepted local fixture bundle; do not fabricate a missing register or rewrite historical hashes. The inventory is a test prerequisite list, not shipped product content or new hosted acceptance.

Replace the two baseline placeholders below with identities from the verified release record; there is no standing hardcoded baseline commit.

```powershell
$releaseCli = 'accelerated-launch/service/deploy/release-workflow.cjs'
$acceptedCommit = '<verified accepted source commit>'
$acceptedFullReceipt = '<path to its complete raw full-regression receipt>'
$releaseOut = 'accelerated-launch/service/out/release-' + [guid]::NewGuid().ToString('N')

node $releaseCli prepare $acceptedCommit $acceptedFullReceipt "$releaseOut/plan.json"
```

`prepare` copies the baseline bytes to an immutable hash-named anchor before product execution can replace the mutable canonical regression file. It plans tracked changes, relevant untracked files, deletions and dependency drift, then checks prerequisites and committed shipped bytes. A mismatched baseline or missing prerequisite stops preparation. `plan` captures the same anchor and plan without the preparation preflight.

Verification selection remains conservative:

| Change | Required local proof |
|---|---|
| Documentation or release tooling | Changed tooling checks and unchanged product dependencies |
| Static presentation | Consumer, security and browser lanes plus the named UI/auth/flow/packet-review sections |
| Shared UI JavaScript, executable HTML/SVG, runtime, rules, readers, test contracts or unknown dependencies | Complete current product regression |
| Billing, entitlement or purchase presentation | Complete current product regression plus affected genuine Sandbox provider acceptance |

Documentation/tooling-only work does not require replacing an accepted consumer runtime. A focused pass is never reported as a new full regression. Baseline mismatches are resolved using the correct source/evidence, never by rewriting historical hashes.

The current planner uses full regression for changed purchase presentation because the inherited composite route excludes changed payment surfaces.

## Preflight, check and resume

`prepare` already performs a preflight. Use the separate command after repairing prerequisites or before resuming a held attempt:

```powershell
node $releaseCli preflight "$releaseOut/plan.json"
$checkResult = node $releaseCli check "$releaseOut/plan.json" "$releaseOut/checks" | ConvertFrom-Json
$verificationReceipt = $checkResult.verification_file
node $releaseCli record "$releaseOut/checks"
```

Check each command's exit status before proceeding. `verification_file` identifies the immutable verification receipt. `checks/verification.json` is a convenience pointer whose receipt hash is verified when read; it is not a replacement for the underlying evidence.

Local tooling steps can resume only when their source, test, fixture/dependency, toolchain and environment identities match and every retained output still matches its hash. Failed, interrupted, skipped, missing or modified proof is not reusable. Syntax and independent tooling checks may run concurrently; product sections remain serial while their evidence writers are shared.

**Product execution reuse is disabled by default.** A repeated `check` without a complete reviewed input profile executes the required product checks again, even if local tooling can resume. This avoids treating an incomplete scan of computed fixture paths, installed packages or browser/OCR tools as a complete input identity.

To allow product reuse, provide a JSON profile with these fields:

| Field | Required content |
|---|---|
| `schema` | `1` |
| `reviewed_by` | Nonempty identity of the person or coordinator who reviewed the input coverage |
| `complete` | `true` only after that review |
| `selected_sections` | Exact full or focused section IDs selected by this plan |
| `files` | Repository-relative computed fixture, builder and dependency file paths omitted by literal scanning |
| `commands` | Additional required executable names or paths |
| `external_files` | Absolute paths to relevant installed package, browser, OCR or external fixture files |

Review `dynamic_dependencies` in preflight output and account for each selected section's computed inputs. Empty lists are appropriate only when the review establishes that no additional inputs exist. The profile is a review declaration; the tool does not prove automatic closure of every dynamic dependency graph. Do not mark an incomplete profile complete to enable reuse.

For a fresh run with reviewed dependency injection, a partial profile may instead set `complete:false` and `reuse_product:false`. It still requires the reviewer, exact selected sections and file/command/external-file lists. Optional `injected_commands` rows name `command`, repository-relative `file`, its exact `sha256`, and a review `reason`. This records that the selected tests supply a dependency instead of executing that module's default command. It never exempts an explicitly required command, claims that a host command passed, or permits product reuse. A changed module invalidates the review. This supports Windows tests of Linux monitoring with injected probes, without requiring unused Linux executables or skipping the behavioral tests. Both `prepare BASE RECEIPT PLAN PROFILE_JSON` and `check PLAN OUTPUT PROFILE_JSON` accept the same reviewed profile.

```powershell
$reviewedInputProfile = '<path to the reviewed complete profile JSON>'
node $releaseCli preflight "$releaseOut/plan.json" $reviewedInputProfile
$checkResult = node $releaseCli check "$releaseOut/plan.json" "$releaseOut/checks" $reviewedInputProfile | ConvertFrom-Json
$verificationReceipt = $checkResult.verification_file
node $releaseCli record "$releaseOut/checks"
```

The profile, discovered and declared dependency files, external files, executable bytes and environment are hash-bound and rechecked after execution and before packaging. Changed inputs or invalid retained outputs cause fresh execution or refusal. Reuse the same check directory to resume the same plan; use a new plan/directory after product changes. Keep failed/interrupted attempts. `record` reports actual attempts, reuse, failures and elapsed time; it does not claim a projected speedup or hosted acceptance.

## Package once and bind continuity separately

Package a reviewed candidate intended for release from its committed, frozen shipped bytes:

```powershell
$packageResult = node $releaseCli package "$releaseOut/plan.json" $verificationReceipt "$releaseOut/candidate" | ConvertFrom-Json
$candidateReceipt = "$releaseOut/candidate/package-receipt.json"
$candidateBuild = $packageResult.build_id
```

Retain that package receipt, manifest, source-proof snapshot and archive unchanged. The same candidate archive is promoted through staging and production; advancing the working checkout does not select different release bytes. Reusing an existing package requires the same candidate and verification identity and fresh archive/source integrity checks. Packaging alone leaves `production_ready:false`.

For eligible presentation or operations changes, create the explicit inherited proof:

```powershell
node $releaseCli continuity "$releaseOut/plan.json" $verificationReceipt $candidateReceipt "$releaseOut/continuity"
```

This writes `product-proof.json` with mode `ACCEPTED_FULL_WITH_CONTINUITY`, immutable original full/focused/tool receipts, baseline snapshots and current source hashes. Historical full assertions and fresh focused assertions remain separate. Shared/test/script/unknown or payment dependency changes refuse this route. A complete new full-regression receipt supplies the full-source proof for a full-regression release; it does not need a composite.

Assemble its source-freeze predicate without rerunning tests:

```powershell
node $releaseCli assemble $candidateReceipt "$releaseOut/continuity/product-proof.json" $releaseOut "$releaseOut/assembly"
```

Use the returned `source_freeze` and `final_full_freeze` in the existing actual measurement reconciliation. This assembly establishes only local product proof. Every remaining hosted predicate and all 30 gates / 123 criteria remain required. The optional final argument is a current candidate's FDT gate template with supplied hosted recovery observations; the adapter preserves those observations and pending status, retains raw full metrics and validates any supplied hosted pass. It cannot create a hosted result. A full-regression release may supply its immutable raw full receipt instead of the composite.

An additional historical provider, packet or product receipt may be linked with a separate dependency attestation:

```powershell
$originalReceipt = '<successful original receipt from the accepted baseline build>'
node $releaseCli attest "$releaseOut/plan.json" $originalReceipt "$releaseOut/provider-continuity.json" provider
```

The optional kind is `provider`, `packet` or `product` and defaults to `provider`. The command checks the corresponding unchanged dependency set and preserves the original build/date/hostname/scope. Attestation and composite proof establish dependency continuity only. Neither establishes a new provider transaction, fresh hosted journey, current configuration, packet consent or visual review.

## Hosted verification and guarded promotion

Staging activation and production activation each require their separate authorization. Do not activate a documentation/tooling-only change when the product build is unchanged. Health alone never establishes release acceptance.

After an authorized activation, use the packaged manifest for fresh public byte checks:

For artifacts containing the optional admin portal, smoke defaults to an explicit disabled expectation: health must report `administration_enabled:false` and all gated assets/aliases must return 404. This does not waive private manifest/source verification. A separately authorized enabled rollout supplies final `admin-enabled` to `smoke` after the package receipt, and to `activate` after its output directory; it requires enabled/available health and exact asset bytes. These are verification expectations and do not change server configuration. Missing/mismatched feature state or unexpected exposure fails acceptance.

```powershell
node $releaseCli smoke https://staging.creditregulatorpro.com $candidateBuild "$releaseOut/staging-smoke.json" $candidateReceipt
node $releaseCli smoke https://creditregulatorpro.com $candidateBuild "$releaseOut/production-smoke.json" $candidateReceipt
```

Run each smoke against its applicable activated environment, using a new receipt path for a fresh observation. These commands verify the served build, deployment/billing mode and exact public assets; they do not replace hosted packet/payment journeys, private runtime-source proof or the acceptance gates.

Retain **all 30 gates / 123 criteria**, the matching measured predicates and actual referenced evidence files. Production promotion requires the exact candidate's accepted staging summary, `measurements.json`, raw full/composite proof, current source snapshot and all referenced gate/phase files. The verifier checks build/commit/manifest identities, actual staging hostname/source hashes and FDT metrics plus fresh hosted useful/bounded-unsuccessful recovery. Keep raw evidence private and historical receipts immutable; review exports do not replace canonical validation files.

Current environment/provider configuration checks always run freshly. Required genuine Sandbox purchases, signed-event application, affected entitlements, upgrade/cancellation outcomes and changed packet visual/approval/download journeys must be performed under their existing release authority. Unchanged historical provider matrices may be linked with continuity, but never silently relabelled as new purchases or used to assert current live configuration.

After the required authorizations and exact-build evidence are available, the existing activation signatures are:

```powershell
$expectedStagingBuild = '<freshly verified current staging build>'
$expectedProductionBuild = '<freshly verified current production build>'
$stagingAcceptance = '<path to the exact candidate staging gate summary>'
node $releaseCli activate staging $candidateReceipt $expectedStagingBuild - "$releaseOut/staging-activation"
node $releaseCli activate production $candidateReceipt $expectedProductionBuild $stagingAcceptance "$releaseOut/production-activation"
```

An activation retry first reloads and verifies the exact candidate archive, source-proof archive, manifest and receipt. An already-completed matching activation performs a **fresh** served-build/public-byte smoke; it does not repeat transfer or infer current acceptance from the old activation record. A failed or mismatched activation is not a reusable pass. Resolve the actual host/previous-build state before retrying; do not overwrite a failed attempt or rebuild the candidate merely to retry transfer/configuration work.

Expected-previous-build guards, staging-before-production order, a verified stopped-service snapshot, immutable release files and failure rollback remain mandatory. Explicit rollback restores the previous code/environment while preserving current consumer data, using `rollback TARGET EXPECTED_CURRENT OUTPUT`. It does not restore an older snapshot over subsequent consumer activity.
