# Consumer precision staging deployment — October 13, 2026

Owner authorized staging deployment after local verification. Staging https://staging.creditregulatorpro.com now runs crp-v1-9f2657b12661c219, committed source 0d4374f1f4f18c30201ca789b0399124537f685f, manifest 9F2657B12661C219AA8D0A4BCD8C5061255178513EC251D6DDB745589C23F5FF, 160 release files. Guarded activation required previous staging build crp-v1-b823b8b92d3b7559 and verified the package archive, manifest files and committed provenance. Staging billing keys remain test-mode.

A stopped-service snapshot of all 76 staging data files was hash-verified before activation. Previous release, environment backup and restricted snapshot were retained. No local account data, quota override or credentials were packaged or copied into staging. Existing staging accounts and entitlements were preserved.

Public exact-build smoke passed, including health and served assets; hosted release provenance agrees. Existing local full regression remains 15,943/0/0 with no source drift or unrun sections; all six supplied corpora remain locally verified. This is separate from hosted authenticated journey acceptance. The local full-access comparison credentials were rejected by staging with INVALID_CREDENTIALS. Therefore fresh authenticated upload-to-approved-packet verification and exact-build 30-gate/123-criterion acceptance are PENDING. No entitlement was fabricated or existing account replaced to bypass this boundary.

Production was freshly checked and remains crp-v1-b823b8b92d3b7559. No production activation, source push, mailing or provider purchase occurred. This staging deployment does not establish production readiness or authorize production promotion.

Private receipts: C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-13\consumer-issue-precision\staging-activation. Local implementation receipt: CRP_CONSUMER_ISSUE_PRECISION_LOCAL_2026_10_13.md.

## Owner-authorized staging test account — October 13 follow-up
Created dedicated staging account acc_9e15a0af17ecb4c79b0bf91f using the same privately stored comparison credentials. Owner-authorized annual COMPLIMENTARY subscription access expires October 13, 2027; no provider payment is asserted and no billing events were fabricated. Verified authenticated login and can_use_paid_product=true. This account is separate from the preserved local account and no production account was changed.
A stopped-service, hash-verified data backup preceded the single entitlement addition. All prior collections and entitlement rows were verified unchanged. The administrative state write initially changed file ownership, causing temporary staging startup refusal; original service ownership was restored and startup/login/full access verified. Evidence: staging-account-grant.log, staging-account-access.json and staging-test-account.json in the private precision evidence directory. Credentials remain solely in the existing private credentials file.


Representative hosted follow-up PASSED: AU-001, UK-027, US-001, CA-001, CRT-039 and synthetic CA_EFX_ON-V1 uploaded/assessed/selected/approved/downloaded through authenticated staging HTTP endpoints; synthetic CA_EFX_ON-V3 no-issue control refused empty approval and unapproved download. Seven cases across all six corpora, six approved packets. Earlier credential rejection is resolved by the new owner-authorized staging account. This is a bounded HTTP journey receipt, not full 30-gate/123-criterion acceptance, browser review or a genuine provider purchase. Full exact-build release acceptance remains outstanding; production has not been activated. Evidence: staging-journey/receipt.json and retained approved packet PDFs.


Final follow-up: full exact-build 30-gate/123-criterion acceptance is now complete and production deployed/accepted. See CRP_CONSUMER_ISSUE_PRECISION_PRODUCTION_2026_10_13.md; earlier pending/failed records above retain their chronological scope.

