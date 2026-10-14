# Email password recovery — staging deployment

Subsequent production milestone: the owner authorized “deploy”. The unchanged combined 391d candidate passed strict current-build 30/123/46 acceptance and is now deployed and verified on production. Read `CRP_EMAIL_PASSWORD_RESET_PRODUCTION_2026_10_14.md` for exact provenance, retained original full proof, account/owner/MFA preservation and backup custody. Earlier local-only, affected-flow-only and NOT_RUN statements below retain their original milestone scope.

October 14, 2026. Status: **DEPLOYED_AND_AFFECTED_FLOW_VERIFIED_ON_STAGING**. The owner's subsequent instruction, “deploy”, authorized the next staging milestone after local implementation. The coordinator stated the separate production boundary before activation. Production promotion is not included in this milestone.

## Immutable deployment identity

- Staging: `https://staging.creditregulatorpro.com`, build **`crp-v1-391d75bc3ef29f27`**, 177 shipped files.
- Frozen executable/test source: `c43a164a91aa573e3dee8ce956b28cb2f0066532`.
- Manifest: `391D75BC3EF29F273C71FE0084615061F295A133A7BEFC50E1F6CE37F912C33E`.
- Package receipt: `D23CACD2A43DD4EFA0B9E821F81AE687FB24A0B21767DD4BF558ABCBEEEA549F`.
- Candidate archive: `029DF52BA08CED4810CD8007CC4A0CA0B505F73E0C8846628C2627775211D5F7`.
- Source-proof archive: `92C805A8DF11E80E37391C898D7E736A5FF014DFBFD63DE4ECC169B68120F2BA`.
- Activated at `2026-10-14T18:35:03.294Z`, expected previous build `crp-v1-e1882ec0a7bf63e7`.

The governed `release-workflow.cjs activate staging` reused the unchanged committed package and original combined full proof, preserving administration enablement with the explicit `admin-enabled` profile. Artifact integrity was checked before activation; all 177 installed file hashes match. No executable source, test, manifest or candidate archive was rebuilt during deployment. The original combined full remains **16,406/0/0**, 177 completed sections and 371 matching source hashes, without drift or unrun current sections. Its raw receipt is `50A1B0131F689F181CDFF229374C51D8F77AAD15F8B34A794162B27E3EBACF74`; verification is `86DCE4A1C5F98AE7872030D1F0905252C42A60308D37409170DBA5D61EDB73E3`. No second full was run for deployment or documentation.

## Fresh affected hosted behavior

Actual Chrome against the staging hostname passed **122 checks** in three separately retained phases: request/discovery 34, completion 54, owner routing 34. Public source hashes and health bind each phase to this build. Desktop and mobile recovery guidance, real reset-link completion, fragment removal before requests, existing-session handling, password confirmation, single-use rejection and retry guidance passed. The reset does not sign in automatically; subsequent normal sign-in requires the enrolled authenticator.

Actual application SMTP delivered confirmation messages, the requested reset link and the completion notice to two owner-controlled fictional plus-address aliases. The reset and completion inbox message identifiers are 441 and 442. The completion notice includes the MFA and saved-key guidance. Messages and private tokens remain outside Git; no real consumer or production-owner account was recovered.

Exact before/after hashes confirm the consumer's enrolled MFA ciphertext, saved recovery-key digest and acknowledgment, email verification and completed signup state were preserved by email reset. The revoked prior session is rejected. A separate hosted saved-key control verifies successful key recovery, key rotation, rejection of the used key, rejection of the old password/session, new-key acknowledgment and preservation of another account's session.

The existing fictional staging owner signs in through the main page and reaches the separate administration MFA unlock. A fresh authenticator unlock reaches the owner workspace, and the explicit consumer-workspace link remains usable. No account was elevated or bootstrapped. The original full-access staging account still signs in with its existing credentials and sees its 15 cases without a purchase.

The post-backup governed public smoke passed **31 checks**, with test billing and administration enabled/available. This is affected-flow verification; it does not certify unrelated journeys.

## Preservation and recovery custody

Activation used the verified stopped snapshot `/opt/crp-wizard-staging/backups/before-crp-v1-391d75bc3ef29f27-1792002898`. All **30 original accounts**, **507 original business rows** and **100 original blob hashes** are preserved. Twenty-nine account rows are byte-identical; one original fictional owner's authenticator replay bookkeeping changed through its normal sign-in. Every account's remaining security/business projection is unchanged. All 31 original immutable admin journal/key/marker file hashes match. No rejected billing diagnostic was removed. Configuration is unchanged except `CRP_BUILD_ID`.

Both disposable aliases were removed through their authenticated account-delete endpoints; final account count is again 30. Ordinary sessions and new signed admin authentication audit entries reflect the bounded tests. Original data and signed journal entries were retained.

The existing encrypted offsite job passed before and after deployment, including upload/download byte verification. The final ciphertext is `crp-v1-staging-20261014T184317Z.tar.gz.age`, SHA-256 `6A30B6648D48FCC17CDF1168CD60C08E8B90C896884A62238C18401E030B834E`. A local ciphertext copy has the same hash. Authenticated in-memory age/gzip validation passed all **146 files** in its complete manifest: 145 private data files and staging.env. Admin journal/head/audit HMAC validation passed all 31 entries. No plaintext was extracted; the existing recovery identity stayed on the owner's computer. Accepted validation receipt SHA-256 is `8986A815A3CC7B8E06B3FA2990BF05E27BF1D2686E1962CE30688E07FAE8D840`.

The installed backup script remains the original data/config-only version, SHA-256 `F4D33CA558A2CC429ABE5ED28C6247877FECBC3FE07CC91ECE6E73250AC16E47`. An initial helper expected the newer tracked script's release metadata and correctly failed `RUNTIME_METADATA_REQUIRED`; that failed attempt is retained. A separate reviewed helper validated the actual installed scope without weakening manifest equality or authentication. Runtime source is retained separately in the immutable candidate/source archives. This backup receipt does not establish runtime-source backup, the wider host configuration bundle or a running restore.

Final staging PID is **1221630** following the controlled backup restart. Production remains **`crp-v1-e1882ec0a7bf63e7`**, PID **825837**, unchanged start `2026-10-14 16:01:15 UTC`, healthy with live billing and administration available. The original local operational service remains PID **20396**, `crp-local-operational-52ee45aade7aee92`.

Operator evidence: `accelerated-launch/service/out/email-reset-staging-release/`. Its immutable `staging-summary.json` binds the before/after security inputs, continuity result, preservation, hosted mail, cleanup and browser receipts to the package/build and fresh public health. Actual browser receipts/screenshots: the isolated admin-portal checkout's `accelerated-launch/service/out/email-reset-staging-browser-20261014/`. Private custody: `C:/Users/webbd/.codex/private/crp-email-password-reset-20261014/staging-release/`. Custody retains complete original outputs and helper hashes, including private fixture material outside Git.

The documentation closeout followed governed `prepare` / `check` / `record` / `continuity`: all ten tooling suites passed and unchanged product dependencies were verified against the original combined full. Verification SHA-256 is `313C5294DF945B4D8FA4A9DD0045713088A6379B7E7A066CE5E7D00461E07B00`. Its continuity proof is bookkeeping-only; it neither replaces the deployed package's FRESH_FULL identity nor establishes new hosted or global acceptance. No product execution or repackage was needed for these four documentation files.

## Remaining release boundary

Strict exact-build **30-gate / 123-criterion / 46-predicate acceptance is NOT_RUN** for 391d. The activation receipt retains `journey_acceptance:PENDING`; these new bounded receipts do not rewrite that receipt or inherit e188's acceptance. Original e188 provider and global acceptance proof retains its original build, date, hostname and scope. The generic provider-attestation path refuses reuse after shared authentication/UI changes; no verifier was weakened and no fresh provider purchase is claimed.

Before production promotion, complete the unchanged exact-build acceptance requirements and obtain separate explicit production authorization. No production configuration, runtime, real-owner recovery, live purchase, payout, fulfillment mailing, code push or real-customer outreach occurred. Consumer guidance is deployed on staging; production consumers will receive it with a separately authorized production promotion.
