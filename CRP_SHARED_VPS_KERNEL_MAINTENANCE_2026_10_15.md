# October 15 shared VPS kernel maintenance completed

Status: **COMPLETED_AND_VERIFIED_FOR_BOUNDED_MAINTENANCE**. The single owner-approved orderly reboot loaded **6.8.0-146-generic**, replacing the running142 kernel. SSH returned, both CRP sites passed their public checks, protected data and configuration remained exact, and the previously running cohosted services returned. The reboot-required flag is clear. Production remains31b; staging remains550c. This maintenance does not promote a release or establish global readiness.

## Authority and actual sequence

The owner answered **“Approve the single VPS reboot”** to the prepared plan for Hostinger VPS1616603 /187.127.252.51. Authorization804F40475CE966560334F8A2404DB5E1B80073FE173641DA69B4690B624676FC permits one reboot and bounded verification. The exact approved plan bytes are preserved as `approved-plan.original.md`, SHA97A1262CE6DAF59E60E19D3FD3806DBC9555289308E1010A3AA431F9E9A31397. The plan's historical primary-checkout path in the authorization remains unchanged; subsequent documentation updates do not replace these approved bytes.

All times below are UTC on October15,2026; subtract three hours for Halifax/ADT.

| Time | Observed result |
| --- | --- |
| 03:45:45.924 | Fresh current-site before receipt passed with production31b and staging550c. Separate prewindow comparison found no protected data/configuration drift from the earlier1D57C233 baseline. |
| 03:54:40.794 | Dispatch receipt recorded one accepted `systemctl reboot` request after unchanged-data/runtime/boot/unit guards. A durable exclusive intent prevents another dispatch. This receipt alone explicitly does not assert recovery. |
| 03:55:15.498 | First read-only recovery probe found SSH unavailable. |
| 03:55:28.251 | Second probe found SSH available, a changed boot ID and running146 kernel. The five-minute recovery boundary was not reached. |
| 03:55:46.149 | Complete after custody passed exact protected before/after comparison for both sites. |
| 03:56:15–17 | Fresh public health plus30 asset/alias checks passed on each CRP site:31 checks each. |
| 03:56:35–03:57:21 | Container/public comparisons and legacy/unit review passed. |
| 03:58:58 | The existing scheduled local monitor ran successfully after boot. |
| 04:01:05 | Read-only system/timer inspection confirmed system state `running`, clear reboot flag and enabled/waiting backup and monitor timers. |
| By04:04:47 | Actual existing Chrome Google Cloud inspection recorded both external monitors Available, enabled linked alert policies and current displayed failure aggregates0. |

Old boot ID: `953ee453-bbba-4bec-a849-713da3c68086`. New boot ID: `ea0f8fb0-2c3b-4b2a-9433-8eebc0f4fd7e`. Sparse SSH probes do not establish the exact application outage duration.

## Exact preservation and recovery

| Surface | Postboot identity and retained data |
| --- | --- |
| Production | `crp-v1-31b54e126354ac04`, executablea1dde64364dddfc15c1afc3d2bab7528a7e26cb8;169 runtime files exact; PID729. All five accounts,338 complete non-session rows,109 blob hashes, seven immutable signed owner-prefix files and protected private/environment/activation metadata exact. |
| Staging | `crp-v1-550c6459cf346446`, executableed302f51618efefbff84b58767be5b8bcf7e9c53;169 runtime files exact; PID730. All30 accounts,555 complete non-session rows,100 blob hashes,34 immutable signed owner-prefix files and protected private/environment/activation metadata exact. |
| Cohosted containers | All49 full container identities, image IDs, restart policies, projected route metadata and state/health values match both original and fresh before observations. All31 previously running returned:24 healthy and seven without a configured health check. The18 stopped remained16 exited/two created. Only the31 running containers' start times changed. |
| Services and public entry points | All61 previously active services remain active; all three named legacy CRP units are enabled/active/running. Both inventories contain326 unit entries and no observed failed units. All20 domains retain DNS/TLS/HTTP outcomes:19 HTTP200 and one expected308 redirect. |

There is **no authentication or rejected-diagnostic exception across this reboot**. The earlier550c staging cleanup's three bounded diagnostic rotations remain a separate historical event; the entire555-row postcleanup baseline is exact across maintenance. Sessions and volatile administration caches are observed separately rather than represented as immutable business data. Credentials, prices, signed authority and required service definitions were preserved.

The existing backup timers resumed enabled/waiting. Their persisted last triggers are03:47:45 production and03:30:07 staging, before this boot; the new boot's backup service execution timestamps are empty. **No fresh postboot backup execution is claimed.** Previously authenticated encrypted offsite backup receipts retain their original scope. No backup or monitoring job was manually invoked or reconfigured for this maintenance. The existing local monitor's actual03:58:58 success is separately verified after boot.

The Windows local52ee service is outside the VPS action. No claim of a new local availability check is made here.

## External monitoring observation and limits

The user completed Google verification directly in the existing Chrome session. The agent did not read or enter a password or OTP. Project `crp-beta-storage` showed both existing independent `/api/health` checks **Available** in Asia Pacific, Europe, North America and South America. Actual targets are the production and staging hosts on HTTPS443, SSL validation enabled, response matching `"ok":true`,60-second interval and10-second timeout. Both linked outage policies were **Enabled**, with current displayed failure aggregate0 and no alert rows. Their chart windows ended04:03:03 production and04:02:02 staging, after the verified boot.

The existing Email channel's display name and open/closure notification setting were observed. No new checks, policies, forced tests, configuration changes or external messages were made. Individual regional sample timestamps were not extracted from the accessible chart. These are root-attested visible UI observations and current UI aggregates, not raw per-sample exports or a new email delivery/destination verification. The agent-created Google inspection tab was closed after reading; the user's Hostinger tab remains open.

## Evidence custody

Canonical local evidence root: `C:/Users/webbd/.codex/worktrees/operational-audit-fixes/CRP-NEW/accelerated-launch/service/out/kernel-maintenance-20261015/`. Every original observation, failed/preparation record and helper remains preserved. The completion ledger binds the authority, original plan, dispatch, recovery, custody, public checks and independent reviews without rewriting their original identities.

| Evidence | SHA256 |
| --- | --- |
| Completed19-reference ledger, `completion.json` | 77E438D2E4A96101DF511639A063E4A93DC97E8AA1388D1BE6F33117047A2E96 |
| Fresh before, `before-current.json` | 5D3A4A5AC092DE6D5F72624035711C033CCA7694B345FDE952A1574C84646EC9 |
| Prewindow comparison | 8A689E433E41AA637129A15AD1005944601FF981D1D45E9F60455F9EB9E9EC1C |
| Private dispatch observation | 13330FE8DF17201874DAE18DE44D4338B9F5FD2C4C8A18A5C9BFD547F7620185 |
| Exact after, `after-current.json` | DA0D39D64492C3877A91CEC52ACE8F5AC76CF37AE8C14473A5B939463C2ECFE5 |
| Container after comparison | 53C1422F1D62583CDAD1FC0C47785238558E21D38286B8C420F064405C348DE6 |
|20-domain after comparison | 78FF544307A174B6460EB3A7C56F2808F1FE040A9AC578581061AC814BEEA756 |
| Legacy/unit comparison | 4E838DCEAF783010E4DB4812C6D12DE6DDF3E548850B13C7328CF60EF49E5B5C |
| Production public31 | 1AF5C278E2FB57455A044ADE0D33710CCF36297E0FCE3176979D5D067DF78F92 |
| Staging public31 | C3F293BA752387170C3635A6F4D3B2A66665EE6F2E7056A6B2426059A2B34C48 |
| System/timer/local-monitor observation | 6ED7881919146EDE5141769F70B779BBEDF4B495DC7E524AAAA4A28D58405965 |
| External-monitor visible UI observation | 424208190A1ED13422938F95F51F160F0BE24E2D1F7A7C7796313A030163AF1E |
| Independent security postboot review | 314B8F394BEDCB2DAC2D6EDAFC9DC84248F3E40EAFEFB2430B1ACFD17A0CD10E |
| Independent cohost/public/legacy review | 1B4F6BFBB9BEFBD125142DA0FE58CE0199491EAC450442E475944BC3817FF1B3 |
| Independent subsequent monitor closeout addendum | 3748A15C76D71058ACF7952E13314A901B5D27EAA471FE0CFF8C32223CD8A272 |
| Independent external-monitor wording review | C248BDD005B58D90EE6883CBB5DC77E01932142991C3A987840304E5B10D9A53 |

The earlier independent security review correctly retained external-monitor observation as pending at its creation. A separate subsequent addendum reviews the later UI receipt with the limits above; the earlier review is not rewritten. Governed documentation closure uses tooling checks and exact source continuity, followed by guarded local source integration and a new private hash-manifest custody copy. Original full16,944/0/0 and16,798/0/0, immutable packages and all release acceptance records remain unchanged. No product full, provider purchase or product browser journey is repeated for documentation.

## Remaining boundaries

No second reboot, upgrade, boot edit, Emergency Mode, restore, application deployment, configuration change, real-owner CRP sign-in/recovery, payment, payout, mailing, outreach or source push occurred. Infrastructure metadata and public headers do not certify every cohosted application's signed-in functions or complete effective proxy configuration. Failed-boot recovery, Linux full-host restoration, paired public rollback, measured RTO/RPO and broader alert-delivery/SLA certification remain unexercised.

Current550c staging strict30 gates/123 criteria/46 predicates remain **NOT_RUN/pending**; its affected-flow pass retains its narrower scope. Production550c promotion remains separate. Genuine coverage specimens, measured large-store latency, broader backup work, staging webhook version migration, mobile-native complete inline PDF rendering and held policy publication retain their recorded open/qualified status. This completed kernel maintenance closes the pending reboot item only.
