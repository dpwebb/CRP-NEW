# Family Admin startup-lock repair — October 22, 2026

Status: production lock repair installed and stable; final fresh human production sign-in/read verification pending. This is separate from the newer staging gap release.

## Installed source

| Environment | Release | Commit | Manifest | Files |
| --- | --- | --- | --- | --- |
| Staging | crp-family-ba1985d403d0bbea0585 | 9136685d68586f6cca83c9c764bf10118e33dd90 | d193917d5bb056f248c24ce6dfe529413c661bc5b97cba16fa9c118e2a00997d | 49 |
| Production | crp-family-4da6f430ef63abe2262c | 3f60497f65513ed7c983ab5d3adc95440aea3b4f | e9a7523eaf0cc85b31b06e114c0c5367cd8cb40a1c7fd9334562f2906e4ad38c | 47 |

The production candidate starts from accepted 9789097/0632, without ba748 gap features. Its lock module, Journal, backup implementation and new tests are byte-identical to staging. Each immutable artifact retains its full exact-source manifest. Documentation closure does not rebuild either package.

## Cause and change

An empty exclusive-create process.lock survived a prior host reboot and prevented startup. Linux now uses a private persistent kernel-lock inode and util-linux flock through an inherited open file description. The parent retains exclusive ownership after the short helper exits. Process exit/SIGKILL/reboot releases kernel ownership; stale PID text cannot block startup. The inode is never unlinked by normal operation. Unsafe files, unavailable locking and journal/key integrity failures refuse startup. Old and new writers must never run together: upgrade/rollback is stopped and guarded. Legacy locks are quarantined only after proving the instance/process/listener/file descriptors exited, never guessed from PID content. See LOCK_RECOVERY.md.

Offline backups retain Journal ownership until all payload bytes are captured; live writers are refused. All signing/integrity keys and existing audit history remain together.

## Validation and custody

- Windows staging baseline: 42 passing tests; production baseline: 41 passing tests. Five new Linux-only cases intentionally skipped there; genuine isolated native Consumer harness passed locally.
- Both frozen packages independently pass 45 portable Linux checks, including genuine child SIGKILL, repeated restart, concurrent writer exclusion, retained empty/prior-PID files, symlink/hard-link/mode refusals, unresolved-intent preservation, missing key and corrupt/truncated journal refusals. Initial broad Linux attempt lacked the Consumer harness; retained as a failed attempt, not a passing native Linux test.
- Hosted staging: genuine SIGKILL of only Family main recovered automatically; separate cold unit stop/start retained the same lock inode and exact journal plus both keys. No host reboot. A real competing service-user Journal was refused without modifying journal bytes.
- Fresh owner-approved fictional staging MFA/unlock, automatic Affiliate/Mail SSO and all-three overview reads confirmed by authenticated journal. Eight desktop1440 and eight mobile390 views pass without errors/overflow; normal viewport restored. The separate simulation task owns its QA grants, subsequent cleanup and operator corrections; these are not part of this narrow repair.
- 67 public checks pass in each environment: exact assets/health, fixed admin redirects, anonymous JSON refusals, withdrawn assets and preserved Affiliate partner/Mail staff pages.
- Production only Family restarted; native production service PIDs, releases, Affiliate container/image, private configuration and all coherent Mail logical rows remain exact, excluding only the explicitly identified normal worker heartbeat timestamp. No unqualified raw SQLite equality claim.
- Both Family units boot-enabled. Production PID376258, restart count0 at post-install check. No production crash test or shared reboot.

## Recovery and retained operations

Unique operation: family-kernel-lock-8d2477fe-872e-43f6-a15c-310648c9be1c. Protected host evidence /opt/crp-family-admin-operations/<operation>/{staging,production}; ignored local evidence family-admin/.local/evidence/kernel-lock-*. Whole stopped stores, exact configuration/unit, legacy locks, immutable artifacts, ciphertexts and all failures retained. No live data restore occurred.

Staging accepted four-file encrypted backup SHA256 a203f3834281d36f8bfe38d629400793e168b3c0e8b7a3fe6a9e1341188eb938; production pre cef0f47dd6608172289e4923d642196e6651e45aedd0b3804431e4533f80a46d and post 394dac558bfc844331e30ac831a2f7287fc6ed0b38534c25665168e5019ce226. Each independently recovered on VPS and protected desktop, with exact four payload files/HMAC/signing key verification. Recovery keys are not published.

First staging activation verified the wrong health response field and safely rolled source back. Second continuation compared pre-existing kernel metadata incorrectly and rolled only source back again. Both failures retained; the separately guarded third attempt passed. No failed operation replay or journal/database rollback. A later simulation-task config permission error and its narrow correction are separately recorded by that task.

No native provider/role/security change, payment/refund/payout/postal action, source push or production staging-gap promotion by this repair. Affiliate partner and Mail staff paths retain native authorization.
