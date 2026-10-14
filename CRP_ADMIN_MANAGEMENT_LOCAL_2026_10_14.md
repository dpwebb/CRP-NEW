# CRP administration — local implementation and integration

October 14, 2026. Authority: `CRP_OWNER_ADMIN_MANAGEMENT_WORK_ORDER_001.md` and the owner's instruction to continue autonomously. The agreed administration scope is implemented, tested, packaged and fast-forwarded into `C:\CRP-NEW`. Administration remains disabled by default. No deployment or runtime activation occurred; other unspecified enhancements remain held.

## Delivered behavior

- Owner dashboard and account/case/billing metadata, explicit staff capabilities, team and organization management, audit activity, search, filters and bounded pagination.
- Separate partner permissions for referrals and fulfillment, scoped to one organization. Referral permission never grants report access. Responsive desktop/mobile navigation and keyboard-accessible controls use the existing account sign-in and fresh MFA.
- Three-level affiliate enrollment, upline/network views, verified rewards, reserves, schedules and review holds. Existing 15%/10%/5% calculations, 14-day hold and 10%/180-day reserve policy are preserved. Explicit reconciliation uses persisted verified first retail purchases and applied refunds, excluding tax, renewals and recruitment; repeated reconciliation is idempotent. No payout or provider action is introduced.
- Consumer-controlled organization access to an exact already-approved packet, with revocation. Permissioned staff queue granted work; assigned partners can download that PDF and record review/cancellation. Each access rechecks ownership, approval/version/hash, entitlement, grant, role and organization. No printing, dispatch, mailing or delivery claim is introduced.
- Separate private administrative metadata, signed append-only audit history, writer exclusion and fail-closed authority. Optional admin-store failure refuses administration while normal consumer service remains available. Ordinary signup never grants administration. Offline first-owner registration and exceptional orphan-owner recovery require an eligible existing account, fresh MFA and exclusive private-store access; neither was performed on a real account.

The existing consumer wizard, assessment rules/readers, billing/entitlement logic, packet preparation/approval and consumer private-store schema remain unchanged. Of the preceding 167 shipped files, 165 are byte-identical, two integration surfaces (`app.cjs` and `server.cjs`) changed, nine administration files were added and none were removed. The transport and security integration received the full product regression.

## Frozen source and local integration

| Item | Verified identity |
| --- | --- |
| Reconciled starting source | `95617bad7a476641b7e083e63413f25b15495afa` |
| Tested and packaged executable source | `c9a1e2ccd1beb01e334407998695062e9164d256` |
| Candidate build | `crp-v1-e1882ec0a7bf63e7` |
| Shipped manifest | 176 files; `E1882EC0A7BF63E7B6773EA535956FE8E323CDBADE18DA98A2ADD837BA7A4F16` |
| Candidate archive SHA-256 | `07C80EB31E8694249CBB73DAFF3137633032F7FA16BC0A529C5498631D71B3A2` |
| Source archive SHA-256 | `ABE375B1427CE43C2F54641B435600B9D464627685FF7BB732E2A25E33F0C76C` |
| Verification receipt SHA-256 | `95944A3E5351D84CD64E28A71A8476B9FD9BD4FFBE7FFE1A0B88C1F5611081E9` |
| Raw full receipt SHA-256 | `C5ADECCEF9D4D1DFC55C957CF5E2C0CCE68E69AEB2C10A521D792AC65C030068` |

Coordinator branch: `codex/admin-management-20261014`, worktree `C:\Users\webbd\.codex\worktrees\admin-integration\CRP-NEW`. Three writers used separate bounded worktrees; the coordinator reviewed and integrated commits serially. Main was clean at the starting source and fast-forwarded to the tested source. All 176 shipped hashes and 368 raw-regression source hashes match main. The later closure commit contains documentation only; it does not replace or relabel the frozen source/package proof.

The existing operational service remains in `C:\Users\webbd\.codex\worktrees\synthetic-corpus-fixes\CRP-NEW`. Before/after checks confirmed PID `20396`, start time `2026-10-14T09:09:28.2487297Z`, build `crp-local-operational-52ee45aade7aee92` and healthy response unchanged. Its checkout, accounts and private data were not modified by this batch. Existing hosted release receipts retain their original source, date and scope; they are not administration acceptance.

## Verification and streamlined release use

The standing `prepare` → `check` → `record` → `package` process produced this candidate. A fresh full product run was required because shared dispatch and security changed. Final results:

| Verification | Result |
| --- | --- |
| Full product regression | **16,249 passed / 0 failed / 0 skipped**, 175 completed sections |
| Source custody | 368 source hashes, zero drift, zero unrun current product sections |
| Registered administration sections | Access 35, business 95, actual HTTP/Chrome 39 assertions; included in the full total |
| Release tooling and syntax | 10 suites PASS; 37 syntax checks PASS |
| Additional actual server/worker proof | 28/28; final executable source `c9a1e2c` |
| Additional actual Chrome affiliate proof | 55/55; source `3ae9d209`, whose shipped 176 files match the final candidate |
| Local source integration | 176/176 shipped files and 368/368 tested sources match |

The full product run took 1,084,381 ms; the guarded verification receipt records 1,141,609 ms. These are measured durations for this candidate, not a future timing guarantee. Historical source-audit mode was not run and remains a separate lane. Additional focused/browser proofs are not added to the full assertion total.

The original full attempt failed because this isolated worktree lacked ignored accepted-baseline fixtures, and was stopped before wasting the remaining long run. Its failed receipt/log remain intact. Exact accepted fixture bytes were restored: 52 copied files, 55 verified required inputs. The subsequent preflight now checks the tracked SHA-bound inventory before starting a long full run and binds those inputs before/after execution. Missing or altered inputs fail early. A 277-assertion focused fixture check passed before the fresh final full run. No failing product assertions were removed or converted to skips.

The local injected-command review profile binds module hashes for deliberately injected system-command dependencies. It is incomplete for product reuse and explicitly forces fresh product execution; it does not waive explicit required commands or enable cached product proof. No product invocation was reused for final acceptance. Both original failed and final successful records are preserved.

Packaging passed with `verification_mode: FRESH_FULL` and `production_ready: false`. The conservative billing journey requirement remains pending, as do fresh hosted configuration/provider checks where selected. All 30-gate/123-criterion release safeguards remain. No duplicate full regression is required merely for this documentation closure or byte-identical local integration.

## Evidence custody

Stable private evidence: `C:\Users\webbd\.codex\private\crp-admin-implementation-20261014`.

- `evidence-custody.json`: original path, byte count and SHA-256 for the copied final raw full/log, verification, plan/profile, package/manifest/source archive, original failed log/record, final record, fixture restoration and source continuity. Originals remain in place.
- `primary-integration-verification.json`, `operational-runtime-before.json`, `operational-runtime-after.json`: main source byte checks and unchanged operational process identity.
- `worker-proof.json`: 28 actual-worker assertions, SHA-256 `704F9A7FFB8B0D07325FC604A029C2055D102B16C20735FCBE8612F900032783`. All five owned child processes exited and fictional private stores were removed.
- Affiliate proof remains at `C:\Users\webbd\.codex\private\crp-admin-affiliate-browser-20261014\output\playwright\attempt-ca2d925f-64c6-4b70-b193-7cb1ff0208fc\affiliate-browser-proof.json`, SHA-256 `DA3945A9226E35911B94153873D48EB4B0D1C0A0BE997D2134E4C5BACECC1B13`, with eight desktop/mobile screenshots. The original helper expectation failure remains separate; the corrected browser proof passed. A later cosmetic recapture stopped at the changed-source guard and did not replace the proof.
- Registered browser screenshots remain in coordinator `accelerated-launch/service/out/admin-browser/`, using fictional accounts and packets. No original customer report was used for administration browser proof.
- `screenshot-custody.json` records 12 byte-identical private screenshot copies under `screenshots/registered/` and `screenshots/affiliate/` for durable review.

The package receipt retains its original coordinator paths. The stable private copies preserve the same bytes and do not relabel source provenance. Writer-worktree cleanup was refused by the app because the tasks/workspaces are pinned; the worktrees remain intact.

## Operational boundaries and remaining gates

| Status | Outcome |
| --- | --- |
| Local implementation and technical tests | COMPLETE |
| Local main source integration and package | COMPLETE |
| Existing operational service/admin enablement | UNCHANGED / NOT_ENABLED |
| Real owner bootstrap/recovery | NOT_PERFORMED |
| Administration hosted acceptance | NOT_RUN |
| Staging/production activation, provider actions, payouts, mailing, push | NOT_AUTHORIZED / NOT_PERFORMED |
| Other unspecified enhancements | ON_HOLD |

Operator guidance is in `accelerated-launch/service/ADMINISTRATION.md`. Enabling the feature and registering a real owner require a separately authorized operational window. No current service was stopped to obtain the exclusive store lock. Hosted smoke binds the explicit expected admin state; passing a verification argument does not enable a server.

Known limits remain explicit: journal snapshots accumulate with history; the local 100-update/100-read probe is not a production capacity certificate. Node on Windows cannot fsync directory handles, matching the existing private-store limitation. Interrupted initial bootstrap may need operator repair. Previously downloaded partner copies cannot be recalled. Hosted backup/restore, rollback, scale and environment acceptance for this candidate remain separate. These boundaries do not change the completed local scope or close unrelated product/release obligations.
