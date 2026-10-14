# Local P3 cleanup and verification — October 13

Implementation commits 2b89124 and bf45192 on codex/remaining-operational-gaps-20261013 remove inactive CRP source paths while preserving earlier operational, AU, UK, US, CA, Creator, synthetic and consumer-precision fixes. Main C:\CRP-NEW and its unrelated pending documentation remain preserved.

## Source and documentation corrections

Ten unused form renderer/mapping/catalog/template files were removed from the current service tree. They had no live callers and were already excluded from shipped runtime manifests. Historical originals remain recoverable from 0e61c5a and existing form-retirement proof archives. Shared PDF/font libraries and old approval/saved-state safeguards remain in use and were preserved.

Eight already-retired concern factories/labels were removed from generation and active registry paths. The active checklist now contains 69 entries; historical 77-entry receipts retain their original scope. The stored-finding materiality filter remains. Newly produced JSON, text and paid PDF views also exclude retired saved descriptors and retired nested bases, preserving the original stored history. A previously active paid-PDF fixture that expected a retired concern was replaced with a supported ownership concern and explicit retirement controls. A tautological registry assertion was removed; positive/benign/currency and materiality controls remain.

The former service README is retained as HISTORICAL_DEVELOPMENT_LEDGER.md with a historical-scope banner. README.md now describes current entry points, private storage, one-worker processing, entitlement, form-free packets and separate release gates. Deployment guidance labels October 9 pricing/authorization as historical, and the change-aware directive references the governing active checklist rather than an obsolete fixed count. No owner legal/finding standard or consumer pricing was changed.

## Operational cleanup

The failed transient crp-recovery-20261009-b74-previous.service had MainPID 0 and no restart policy; its stale failed-manager record was cleared. The two historical Stage-2 backup/monitor timers were already disabled/inactive, with no scheduled trigger. Their failed-service flags were cleared without enabling timers, changing scripts, deleting definitions/logs or asserting that a Stage-2 functional backup review passed.

Three enabled legacy GitHub runners repeatedly failed broker-session creation with provider NotFound responses and no received job in current diagnostic logs. An active-worker guard passed. Their services were stopped/disabled; directories, credentials, registration and logs were retained. Their linked repositories were also unavailable through the available CLI, SSH and connector access. Future reactivation requires verifying the intended repository/registration first.

The legacy creditregulatorpro-app and creditregulatorpro-ingest-worker containers, created September 26, had over 24,000 restart cycles. Their compose source was /opt/creditregulatorpro/app. The app advertised an older duplicate production-domain route at port 3333; the accepted production router has priority 1000 and uses 8795 -> 8794. Both broken containers were stopped by pinned container ID; images, configuration and stored container/data state were retained. Existing unless-stopped behavior preserves a deliberate stop. The separate loopback-only v22 router and healthy beta/other-project containers were retained.

After cleanup there were no failed systemd units. Production PID 2103501 and staging PID 1999286 stayed active and unchanged; public health still identified crp-v1-9f2657b12661c219 on both sites. No app source, release pointer, public asset, deployment or new image was activated.

## Verification and remaining scope

Focused consumer/materiality/packet/PDF checks passed 566 assertions, zero failed/skipped. Corrected coverage-contract checks passed 59. The initial currency-encoding failure and stopped full attempt containing a stale coverage contract remain preserved honestly in the private p3 evidence directory. Final full product, all-82 producer and fresh seven-report worker receipts are recorded below when complete. The same full-access account/credentials, 393 original cases, 432 files/blobs, 455 results, one packet and one entitlement were retained and verified.

Private evidence: C:/Users/webbd/.codex/private/crp-ai-comparison/implementation-2026-10-13/operational-hardening/remaining-verification/p3/.

Remaining boundaries retain their scope: new-build hosted acceptance and separate deployment authorization; actual shared-VPS reboot/hosted rollback rehearsal; nine genuine modern-layout acquisition cells; capacity beyond the qualified supplied store/workload; conservative legacy-lock/interrupted-reclamation recovery. Historical source/proof and necessary compatibility are retained deliberately, not treated as active deprecated runtime. Other projects' functional certification is outside this cleanup.

Final verification: FULL_CURRENT_PRODUCT passed 15,986 / 0 / 0 across 170 completed sections, 332 tested source hashes, no source drift/unrun sections; all four evidence restorations passed. The direct all-82 producer passed 5,218 assertions with 69 active checklist entries. Seven fresh actual-worker original-file controls passed on the final build crp-local-operational-331f32a35d213383; the same primary account and all 432 blob hashes remain preserved. Implementation source is bf45192; hosted applications remain on 9f2657b12661c219. No new deployment or hosted acceptance occurred.
