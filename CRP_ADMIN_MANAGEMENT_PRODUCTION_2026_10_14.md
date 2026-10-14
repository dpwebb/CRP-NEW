# CRP administration — production deployment and owner activation

October 14, 2026. The owner explicitly authorized promoting the accepted administration build and activating `admin@creditregulatorpro.com`. Status: **DEPLOYED_AND_OWNER_ACCESS_VERIFIED** at <https://creditregulatorpro.com/admin>. This is the administration rollout milestone; unrelated platform readiness and unspecified enhancements retain their existing status.

## Artifact and runtime

| Item | Verified identity |
| --- | --- |
| Executable and packaged source | `c9a1e2ccd1beb01e334407998695062e9164d256` |
| Production and staging build | `crp-v1-e1882ec0a7bf63e7`, 176 shipped files |
| Manifest | `E1882EC0A7BF63E7B6773EA535956FE8E323CDBADE18DA98A2ADD837BA7A4F16` |
| Unchanged candidate archive SHA-256 | `07C80EB31E8694249CBB73DAFF3137633032F7FA16BC0A529C5498631D71B3A2` |
| Source-proof archive SHA-256 | `ABE375B1427CE43C2F54641B435600B9D464627685FF7BB732E2A25E33F0C76C` |
| Production release directory | `/opt/crp-wizard-production/releases/crp-v1-e1882ec0a7bf63e7` |
| Production after controlled backup restart | PID `825837`, start `2026-10-14 16:01:15 UTC`, zero automatic restarts |
| Staging, unchanged by this promotion | PID `663141`, start `2026-10-14 14:55:48 UTC` |
| Existing local runtime, unchanged | `crp-local-operational-52ee45aade7aee92`; PID `20396`, original start `2026-10-14T09:09:28.2487297Z`, port 8890 |

The committed archive was promoted through the governed `release-workflow.cjs activate production` entry, with expected predecessor `crp-v1-a926c178ef0dfc5c`. Default-off activation and public smoke passed at 15:58:42 UTC. Controlled first-owner registration and configuration enablement passed at 16:00:32 UTC. All 176 actual production runtime bytes and provenance subsequently matched. Closure changes are documentation only; no product source was modified during production activation.

## Proof reuse and fresh production observations

The original full regression remains **16,249 passed / 0 failed / 0 skipped**, 175 completed sections and 368 tested sources. It was not rerun. The original raw-full SHA-256 remains `C5ADECCEF9D4D1DFC55C957CF5E2C0CCE68E69AEB2C10A521D792AC65C030068`.

The unchanged strict verifier accepted the staging evidence in Linux production preflight with **30 gates / 123 criteria / 46 required predicates** before cutover. These are the accepted staging executions, with their original build, host, date and scope. The 282 administration browser assertions and twelve-cell Sandbox purchase evidence also retain their staging identity. They are not represented as new production journeys or purchases.

A concrete frozen-bundler portability defect rejected the Windows-relative external full-receipt reference before any cutover. A separate hash-bound metadata assembly relocated references and recomputed only derived measurement/acceptance bindings. It preserved all original staging gate bytes, raw-full bytes, measured metrics and actual hosted response hashes. All 429 frozen source files and one explicitly bound unchanged historical closure script were included. Both failed pure assembly attempts and the passing reference-custody map remain preserved. No validator, product source, raw receipt or required gate was weakened. Final promotion-proof archive SHA-256: `8EFF0CE49917E9C272FC9B02508B8D118405E1AF348EBC0A7F4E5903FEEF665C`.

Fresh production checks passed:

- Enabled exact-build public smoke: 31 checks; actual public asset and route-alias hashes also matched after the backup restart. Held preview routes remained unavailable.
- All 176 private runtime files, release pointer, deployment provenance and administrative head/journal hash continuity.
- Existing full-access production account `acc_04ec4bdb680850b9c8ae1bc8` signed in through the normal HTTP API with its existing credentials, retained paid access and saw its 104 cases. The check logged out normally; no purchase occurred.
- Fourteen read-only live Stripe GET requests verified the existing account, all 12 fixed native plan/currency price cells, and the enabled production webhook with all eight required events. Two existing source-bound support/billing configuration checks passed, reporting `LIVE_READY`; all 429 operator-source hashes were verified. This proves current configuration, not a fresh live charge. Stripe's existing merchant payout capability does not enable CRP affiliate payouts.
- Final production health remained healthy with administration enabled/available and live billing. Staging and the original local process/build stayed unchanged.

## Real owner and entry flow

The selected real production owner is `admin@creditregulatorpro.com`, account `acc_c64c6b8804a301810ac486d4`. Email verification, completed signup, saved recovery acknowledgment and confirmed authenticator enrollment were verified before bootstrap. The reviewed, hash-bound offline procedure used the unchanged frozen bootstrap, the existing backup lock, a verified stopped whole-tree snapshot, and the owner's fresh authenticator code supplied only on stdin. It verified the signed owner authority before startup. The operator did not derive, export or print the real MFA seed, fabricate an authenticated session, or record the submitted code in release receipts.

Production configuration changes were bounded to explicit canonical private-data location and `CRP_ADMIN_ENABLED=1`; live billing and existing credentials/security keys were preserved. The source default remains disabled. Private ownership and modes were restored to service UID/GID `62737` before startup.

**Owner UI verification is manual.** The owner's initial report was corrected: the ordinary consumer dashboard had opened. That initial confirmation remains preserved with an explicit superseding correction and is not relied upon. After opening the dedicated `/admin.html` entry, the owner reported: "It prompted me for another authentication and I entered it and I am in." This confirms the separate administrator MFA unlock and workspace access after the backup restart. A separate operator browser observation verified the real administration sign-in page; no real-owner password or browser cookie was obtained. Automated production role-matrix or cookie inspection is not claimed.

**Navigation gap:** the main consumer sign-in still opens the consumer workspace for an owner. It does not automatically redirect to administration. The same account's owner permissions are available through `/admin` or `/admin.html`, followed by the separate fresh-MFA unlock. No source change or permission reset was needed to resolve this access handoff. Role-aware navigation remains an explicit follow-up, not an implemented feature of this frozen release.

Owner/staff administration, separately permissioned referral/fulfillment partner workspaces and three-level affiliate management are available. No additional real staff or partner principal was created or elevated during this promotion. Payout execution and mailing remain disabled.

## Preservation and rollback

Final comparison against the stopped activation snapshot preserved all original 5 accounts, 108 cases, 108 files/blobs, 110 results, 1 packet and 2 entitlements, with no missing or changed original business records. All 108 original blob hashes and 111 original non-state private files matched. Normal session lifecycle is excluded. The owner's successful authentication may advance only the existing MFA counter/failure/lock bookkeeping; password, profile, recovery information and security ciphertext remain unchanged. The new signed administration directory and authorized configuration are separately recorded. No consumer schema migration occurred.

Stopped snapshots remain preserved:

- `/opt/crp-wizard-production/backups/before-crp-v1-e1882ec0a7bf63e7-1791993518`
- `/opt/crp-wizard-production/backups/before-admin-enable-20261014T160025Z-823367`

The earlier release and immutable artifacts remain available for expected-current guarded rollback. For an administration incident, disable the feature through the controlled configuration/restart path while preserving current consumer data and the complete admin journal. Do not overwrite newer consumer records with an old snapshot or delete/rebootstrap an existing owner journal. Controlled activation, owner enablement and backup restarts occurred; zero automatic restarts does not mean the service was never restarted.

## Encrypted custody

The existing production offsite-backup unit completed a fresh pre-release backup and a second backup after owner activation. The latter ran at 16:01:15–16:01:31 UTC, uploaded encrypted ciphertext and its checksum, downloaded both, and compared exact bytes. The timer remains active.

Post-owner archive: `crp-v1-production-20261014T160115Z-gLWlpHsv.tar.gz.age`, 12,726,907 bytes, SHA-256 `9F5967E3012D17D952D4CB13A5F995588A4C8C299CD526FDB861E8D7836C8BF4`.

Authenticated local decryption with the separate owner-held production recovery identity passed through EOF. Streaming validation in memory checked the complete **132-file** manifest: 120 data files, one production configuration file, three release metadata files, seven legacy-custody files and the snapshot metadata. It verified the admin integrity key, initialization marker, signed head, contiguous journal and audit HMAC chains, including the authorized active owner in the authenticated first journal entry. Backup manifest SHA-256: `3242184EC982552729A8EABBB0DA9CA5A6AC44F8472DCD1B7BAE50CBA4FBDD1F`. Validation receipt SHA-256: `214802AB1C8D2D1A66BF0C34C61F0DCF32505E4570AC026876BF66BA09555A7F`.

The identity stayed local and was not printed/copied; plaintext was not extracted to disk. The backup contains data/configuration/release metadata and legacy custody, not all executable runtime files or systemd units. The unchanged immutable candidate/source archives retain separate custody. A running application restore was not performed. The owner subsequently confirmed admin entry and MFA unlock after the backup restart.

## Durable evidence and boundaries

Private root: `C:\Users\webbd\.codex\private\crp-admin-implementation-20261014\production-release`. It retains the explicit production authorization, strict Linux preflight, original and portable proof custody, governed activation attempt/log/smoke, owner helper binding and enablement receipt, actual live provider/configuration observations, final private/public/preservation/runtime proofs, superseded and corrected owner observations, encrypted archive and authenticated recovery receipt. `production-summary.json` and `production-custody-manifest.json` index final proof without changing historical receipts. Phase helpers' generic pending labels are resolved by these separately bound final receipts; they are not edited to relabel earlier observations.

No live purchase, affiliate payout, mailing, push, real-customer outreach or other enhancement was performed. No code push occurred. Health's `launch_ready:false` is the existing static declaration, not an administration availability calculation. This release does not close unrelated coverage/readiness obligations. The consumer sign-in navigation gap above remains explicit.
