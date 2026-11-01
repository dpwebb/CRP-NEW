# Current-generation four-app recovery review — October 31, 2026

Ruling: accepted production scheduled backup, encryption/readback and native verification evidence is reconciled for all four restored application versions. Full recovery readiness remains open. This review supersedes the earlier worksheet's blanket missing-binding status at the stated scopes; it does not rewrite historical receipts or declare all restore gates passed.

Owner authorized receipt review only, with existing data preserved, no deployment and no real mail. CRP Group Tools performed local receipt reconciliation and small read-only Hostinger metadata/source inspections. No export, cloud download, restore, service restart, timer/job invocation, key access/transfer, role change or mail occurred. Existing backups/security/monitoring remain running. Hostinger VPS1616603 is authoritative; Whelastic is not a recovery target.

## Accepted current restored-generation point

Production point: `20261031T200826Z-bb7db48a`. The persistent timer triggered October 31 at 20:08:26 UTC and its service finished successfully at 20:10:39 UTC. `latest.json` still references the accepted point; fresh reads confirm these exact receipt hashes:

- `receipt.json`: `6dc17f01045877174d3b0d68774fcfca6c920e5f9ea8e21502fde3ca7822271a`
- `offsite-receipt.json`: `c04ac5e2bced1e2f8276ad8da223065a3aa2a475f2ab5a53376e610162744c6c`

The accepted offsite receipt records exact private GCS and owner-private Drive readbacks with anonymous GCS access denied. No key was uploaded and no IAM/sharing change was claimed. Whole archive authenticated encryption roundtrip passed; plaintext whole-archive extraction was not performed. Existing readback evidence was reused without repeating downloads.

| App | Bound version | Accepted native scope | Remaining scope |
| --- | --- | --- | --- |
| Consumer | `crp-v1-ddaa1119be5f49b4` | Copied private snapshot; 78 signed administration journal records, 47 audit events and acknowledged head/cache checks | Not a whole-app startup/report/blob functional restore; capture predates October 31 admin repair; new independent post-repair recovery point not yet evidenced |
| Family/Admin | `crp-family-16733200822b3ad031b5` | Native pack/recover to isolated directory; journal integrity verified, signing/configuration material captured | Independent company-custody retrieval and isolated recovered-host authentication/configuration acceptance remain open |
| Partner | Image `sha256:cf594f9b5b58087bab5788cfb305a0cf0a6f89801e08100c5757e51a05814ffa`, revision `7ff1a950f506934122ce0712af160c17151f70ac` | Consistent native PostgreSQL dump; restore of 26 tables to fresh network-none fixture; actual runtime/image/compose bindings captured | Not a new full-host or all-business-workflows recovery rehearsal; company custody remains open |
| Mail | `mail-internal-b677502523e3bd4e` | Native encrypted backup restored into a fresh isolated directory; accepted receipt verifies counts for 26 tables, schema migration count 12; active runtime not replaced | Not genuine dispatch/delivery or fresh recovered-host staff MFA; company custody remains open |

The accepted point explicitly does **not** claim cross-application atomicity. Recovery must reconcile cross-app references and in-flight/unknown work; do not replay payment, grant, provider or mail operations to make systems appear aligned. A successful timer catch-up is one genuine scheduled witness, not proof of all historical days or a guaranteed recovery-point objective.

## Consumer repaired-state gap

The October 31 repair occurred after this point. Read-only inspection of the accepted private verification manifest confirms that both its whole-file manifest and Consumer snapshot contain the exact obsolete writer claim later quarantined (`1003-86b19ad2-6cfb-4a49-94b8-612b25621d2b.json`). Signed journal integrity alone does not establish that a restored service will admit an administration writer.

The repaired current state has verified same-host stopped/recovery-proof copies and retained quarantine under `/opt/crp-admin-repair-20261031`; those are not independent off-host backup proof. Preserve this accepted earlier backup and its evidence. For future recovery use the read-only writer/journal preflight and the reviewed maintenance procedure. Do not automatically delete claims, weaken MFA, replay repair scripts, restore current customer data or classify this earlier point as post-repair.

Next bounded acceptance: inspect the next genuinely completed authorized native production recovery receipt for repaired-state capture, exact sources and independent readbacks. No job was started by this review. An immediately requested export would need separate scoped authorization rather than being inferred from this receipt review.

## Staging scheduled witness

Accepted staging checkpoint `20261031T200643Z` remains retained, finished at 20:07:54.902658 UTC. The original post-restore calendar invocation failed. The repaired service was manually started at 23:02:18 UTC and finished successfully at 23:02:19 UTC; its republished existing snapshot and five-file GCS readback are recorded in JOBS-ACCEPTANCE. Republication did not create a new snapshot or successful calendar witness.

Both production and staging combined recovery timers are still active/enabled. The accepted report identifies the next staging calendar trigger as November 1 at 08:15:13 UTC; this review did not wait for, install a monitor for, invoke or certify that future run. Inspect actual timer invocation, job result, new point and cloud receipts when available.

## Remaining gaps in priority order

1. **Post-repair independent Consumer capture.** Accepted current-build production point predates the repaired writer state. Require a later genuine accepted recovery point and source/data-generation bindings; preserve the original point.
2. **Company-controlled independent recovery custody.** Identify the exact existing company-accessible vault and prove the designated `admin@compnd.systems` identity can retrieve backups and keys without this Windows account or the production key filesystem. This is distinct from the verified application owner `admin@creditregulatorpro.com`. Owner-private cloud permissions and personal key possession do not establish company-admin independent retrieval. No secrets may be emailed or shared with an inferred identity.
3. **Fresh isolated host recovery.** The actual provider restore action 122961937/backup 57714599 is accepted historical host-restore proof, not a separate current isolated rehearsal. An existing authorized isolated Linux target is still unidentified; prior Hyper-V authorization refusal and unavailable Whelastic target are retained limitations. No VM creation, purchase, elevation, destructive restore or networking/provider activation is authorized here.
4. **Staging genuine calendar witness.** Inspect the next actual post-repair scheduled job and resulting cloud acceptance. Manual success remains separate.
5. **Recovered operation and cross-app consistency.** On a later authorized isolated target, bind runtimes/configuration/data, enforce provider-inert networking, verify source/blob/approval/financial references and stopped-writer safety, then perform native read/access checks with owner-held factors as required. Never replay uncertain transactions. Existing native checks above are reused rather than repeated wholesale.
6. **Recovery objectives and operational ownership.** Retain evidence of primary/backup custodians, vault/key accessibility and measured elapsed recovery stages against owner-approved RPO/RTO. This review found no accepted end-to-end current-generation RTO/RPO measurement; it invents no expiry, data-loss allowance or uptime guarantee. Same-build version equality alone is not current-data equality.

## Evidence references

- Partner accepted review: `C:/Compnd.Systems/worktrees/international-affiliate-local/CRP-AFFILIATE-OPS/docs/readiness/2026-10-31/READINESS.md`; its `output/readiness-20261031/{readiness-result.json,host-observation.json,public-release-bindings.json}`.
- Shared remediation: `C:/Compnd.Systems/governance/migrations/hostinger-whelastic-20261030/hostinger-return-20261031/remediation-20261031/{JOBS-ACCEPTANCE.json,JOBS-REPAIR-RESULT.json}`.
- Production retained receipt directory: `/opt/crp-readiness-production/exports/20261031T200826Z-bb7db48a`; only metadata and private-manifest summary facts inspected, no private payload copied into this report.
- Host return: `HOSTINGER-RETURN-COMPLETION-20261031.json` under the same hostinger-return directory; original provider/MFA/mail limitations retained.
- Consumer repair: `CONSUMER-ADMIN-REPAIR-2026-10-31.md` and `/opt/crp-admin-repair-20261031/{result.json,final-verification.json}`.
- Machine-readable scope summary: `current-generation-recovery-review-2026-10-31.json` beside this report.

Review checks: accepted local evidence hashes and remote receipt hashes, latest-pointer bindings, timer/service results, source-defined native verification scope, and restored-claim membership in retained manifests. No runtime, customer or backup artifacts were modified. This report is operational self-review, not an independent human acceptance.
