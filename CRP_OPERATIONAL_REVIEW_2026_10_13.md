# October 13 operational and technical review — P2 follow-up

Read-only review follows local implementation at 305f9f7. Previous AU, UK, US, CA, Creator, synthetic and consumer-precision fixes remain in ancestry; main checkout db2b2e4 and its 14 pending documentation files were preserved. Staging and production application bytes, release pointers and process IDs remain unchanged.

| Surface | Current evidence |
| --- | --- |
| Isolated branch | codex/remaining-operational-gaps-20261013; runtime source 305f9f7 |
| Local application | http://127.0.0.1:8890/; crp-local-operational-4598b886e2ad015d; 165 shipped files |
| Hosted applications | Both crp-v1-9f2657b12661c219; production PID 2103501 and staging PID 1999286 preserved |
| Account custody | Same full-access account/password; all original collections and all 432 blob hashes verified |
| Independent monitoring | Owner authorized setup in existing Google Cloud project crp-beta-storage; production/staging one-minute HTTPS checks and email policies created without a VM, new credentials or CRP deployment |

Full regression passed **15,989 assertions, zero failed/skipped**, all 170 sections complete, no source drift or unrun sections. All four implementation-evidence restorations passed. The direct all-82 producer passed 5,218 relevant assertions, 77 active checklist items and 82 supported regional journeys. All 336 full-tested source hashes still match. Technical closure does not establish hosted acceptance or universal layout certification.

The combined operational, storage/security and legacy-account focused verification passed 244 assertions. Process locks now bind to Linux boot/start identity or Windows process-start identity. Exclusive lock creation and a reclamation guard protect simultaneous starters. A matching live writer is refused; an explicitly different identity recovers even with a live numeric PID. Legacy live PID locks and inaccessible identities remain fail-closed. Current local startup upgraded its old dead-writer lock and retained the same account. Windows controls and a read-only Linux identity probe passed; no Linux code was installed.

Monitor validation rejects empty/duplicate/invalid targets, insecure origins, malformed service/path settings and missing required alert configuration. Credentials are read eagerly on quiet healthy cycles; malformed API resource/token or SMTP host/port settings are rejected before delivery. Three actual CLI rejection controls passed with generic, secret-free errors. External mode uses public probes without depending on the monitored VPS. Hosted monitor installation remains unchanged under the no-deployment instruction.

Storage writes preserve the same values with compact JSON. Three isolated durable transactions on the original 449,364,745-byte state took 4,825 / 4,503 / 4,482 ms and wrote 205,357,377 bytes. Eight simultaneous requests across two additional fixture accounts through one real 4 GiB-bounded worker passed in 34,481 ms, measured peak process RSS 2,088,222,720 bytes. The original account data was untouched by these load fixtures. A further 24-request, three-batch load run passed in 103,836 ms with peak RSS 2,428,952,576 bytes; both fixture counters reached 12 and every original state value matched afterward. One-writer JSON serialization remains an explicit capacity boundary; these tests do not certify arbitrary store growth or horizontal writers.

Seven representative original files were freshly run through the new actual processing worker on an isolated copy of the same full-access account. AU, UK, US, CA, Creator and synthetic issue reports reached approval/download; the synthetic clean control refused empty approval/unapproved download. Original primary collections remain 393 cases, 432 files, 455 results, one packet and one entitlement. No original row or blob was removed to improve storage performance.

Independent Google Cloud checks validate HTTPS/certificates, /api/health, successful HTTP responses and the literal health marker. Both scheduled checks reported Available across Asia Pacific, Europe, North America and South America; their open/closure email policies route to admin@creditregulatorpro.com. This monitoring configuration is separate from the local application candidate and from the existing VPS monitor. A reversible content-mismatch control exercises the staging checker only; final restoration/delivery evidence is recorded below. No actual application outage is induced.

| Priority | Remaining gap or operational boundary |
| --- | --- |
| P1 | New application build staging acceptance, affected hosted worker/payment journeys and separate production authorization remain pending; no deployment performed. |
| P1 | Actual shared-VPS reboot and hosted rollback rehearsal remain unperformed; prior isolated restoration proof retains its original scope. |
| P2 | Dedicated modern-layout evidence remains insufficient in nine acquisition cells: US Equifax/TransUnion; AU Experian/illion; current GB Experian/Equifax/TransUnion; broader CA Equifax/TransUnion. GENERAL and synthetic proofs remain usable within their measured scope; they do not establish genuine dedicated-layout certification. |
| Capacity boundary | Bounded burst/mutation qualification passed; unlimited account growth, substantially larger state and continuous high throughput remain uncertified. Retain one writer, bounded queue, memory limits and total response deadline. |
| Lock boundary | Legacy live-PID locks with no trustworthy identity stay protected. A kill during the brief reclamation section can retain the fail-closed .reclaim guard; verify writer absence before manual cleanup. No unsafe automatic guess is introduced. |
| P3 | Retired factories/labels, bureau-form compatibility sources and stale README/release wording remain; other-project failed legacy units/runners require ownership review. |

Private evidence: C:/Users/webbd/.codex/private/crp-ai-comparison/implementation-2026-10-13/operational-hardening/remaining-verification/ (p2-* files and p2-full/). Historical receipts and the initial private load-fixture message-shape failure remain preserved separately. Release acceptance is never inferred from health, focused receipts or historical proof continuity.


Independent-monitor final verification: both scheduled checks are Available across all four displayed regions. A staging-checker-only content mismatch opened a Google alert; admin received its email as INBOX UID 406 (2026-10-14 00:20:56 UTC). The normal health marker was restored; admin received the RESOLVED email as UID 407 (00:25:47 UTC). Final normal configuration and healthy dashboard were captured. Neither hosted application was stopped, modified or deployed during the control. Provider propagation/evaluation latency remains part of alert timing; a one-minute probe interval is not a guaranteed one-minute notification.

The final source/full-regression proof bundle contains 383 indexed files, excludes its private encryption key, and passed local authenticated decryption plus an offsite GCS upload/download byte comparison. Ciphertext SHA-256: d834d31c0b1476d59f17c6546001cc5570fa939bddd40cf51be2c1043f677b1f. Custody uses the existing encrypted backup destination under operational-proof-20261013-305f9f7. No CRP deployment or new backup credential grant occurred.
