# October 13 P3 staging release

Owner authorized staging first; production remains unmodified and requires separate authorization.

Staging https://staging.creditregulatorpro.com runs crp-v1-331f32a35d213383, manifest 331F32A35D213383398F8542F440601D780937B9E4B9F04E5FC488BCD7B81F8C, 165 shipped files. Packaged source is 450fc36fa1c7b55b33354f5ed0b1ea0ab8ef9a1c; runtime implementation is bf45192. Activation passed the expected previous-build guard, committed-source/archive checks, all file hashes, stopped-service snapshot verification (95 files), startup checks and exact served assets. The previous release and restricted snapshot are retained for rollback.

The release workflow measured fresh FULL_CURRENT_PRODUCT: 15,986 passed, zero failures/skips, 170 sections, no source drift/unrun sections, plus 36 syntax checks and passing release-workflow rejection controls. No billing dependency changed; no new provider purchase was claimed.

Seven fresh authenticated original-report journeys through staging's real processing worker passed using the existing full-access staging account: AU-001, UK-027, US-001, CA-001, CRT-039, synthetic CA positive and clean control. Six positive reports reached issue selection, review/approval and actual PDF download. The clean control refused empty approval and unapproved download. Retired defaults did not reappear. This is representative six-corpus hosted evidence, not universal dedicated-layout certification or a 30-gate acceptance receipt.

Snapshot comparison preserved all original 25 accounts, 59 cases, 92 files/blobs, 143 results, seven packets, 17 entitlements, 63 billing events, 16 checkout sessions, 47 upgrade credits, 13 purchased downloads and one referral snapshot. The existing credentials, entitlement and profile values are retained. Normal session changes and the packet-test account's profile_updated_at refresh are explicitly excluded. Initial verification-helper attempts used an ambiguous billing-event account ID, then encountered normal profile timestamp and legacy file-schema differences; corrected matching compares exact row multisets and snapshot blob hashes. Those attempts establish no product failure or data loss.

Staging PID 2873566 is active, NRestarts 0, storage_ready true and storage_recovered false. Production remains crp-v1-9f2657b12661c219 with PID 2103501 and unchanged release pointer. Local localhost:8890 remains available with the same original full-access account/data. The unrelated main checkout remains preserved.

Private receipts: C:/Users/webbd/.codex/private/crp-ai-comparison/implementation-2026-10-13/p3-staging-release/.

Production promotion remains pending exact-build 30-gate / 123-criterion acceptance and separate owner authorization. launch_ready remains false. Shared-VPS reboot/hosted rollback rehearsal, genuine modern-layout acquisition and bounded capacity/lock limitations retain the scope recorded in CRP_OPERATIONAL_REVIEW_2026_10_13.md. Shared monitor/configuration was not replaced by application deployment; its current operational check is recorded separately.

The staging encrypted offsite backup completed and verified its uploaded roundtrip: crp-v1-staging-20261014T012650Z.tar.gz.age in the existing staging GCS bucket. This planned backup took a stopped-service snapshot and restarted staging; final PID is 2873566, NRestarts 0. The shared operational monitor completed successfully after activation at 01:26:43 UTC. Production remained unchanged.
