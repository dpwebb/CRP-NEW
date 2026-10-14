# Operational audit corrections — local implementation, October 14, 2026

Status: IMPLEMENTED_AND_TESTED_LOCALLY. The final governed checks, immutable package and local source-freeze assembly passed. The owner authorized the recommended local correction order and then said "resume". This authority covers implementation, verification, packaging and guarded source integration. Activation remains separate.

## Corrections

| Priority | Gap corrected | Result and verification boundary |
| --- | --- | --- |
| 1 | Account/report deletion could leave unfinished payments or renewable subscriptions | Public deletion awaits owned provider-confirmed cleanup. Failure or changed billing bindings preserve data. Whole-account deletion immediately stops subscriptions without a final invoice or proration; report deletion stops only its unfinished one-report payments. Fictional HTTP provider tests cover failure, retry, concurrent changes and unpaid-upgrade invoice voiding. |
| 1 | Expired/refunded access hid renewal cancellation and allowed duplicate recurring purchases | Renewal is tracked independently from paid access, including earlier subscriptions. New and resumed recurring checkout paths enforce cancellation safety; one-report purchases and valid annual upgrades remain. Confirmed terminal events retain normalized provider status/date. |
| 1 | Failed-payment grace was recorded but not effective | A bounded 72-hour grace interval determines access. Repeated failure does not extend it. The consumer sees its actual deadline. |
| 1 | Consumer deletion could orphan signed administration authority | Active owner/staff/partner membership is checked before provider calls and again inside the purge transaction. Preserved but unavailable administration custody fails closed. Signed removal/handoff remains necessary. Fictional MFA owners and membership races are tested. |
| 2 | An unfinished checkout could become a dead end after another subscription activated | Consumers can cancel the exact unfinished payment. Provider confirmation precedes cancellation and credit release; current plans, completed receipts and other intents remain. Obsolete ordinary checkout cannot continue beside an active subscription. |
| 2 | Historical results could download a different assessment | The PDF route binds the explicit owned result ID. Empty, duplicate, missing and foreign selections are refused. Exact older PDF bytes remain stable after a newer assessment; packet entry clearly returns to the latest assessment. |
| 2 | Late asynchronous responses could replace a different account/case/view | Result selection, history/status actions and clarification POST/GET paths retain their initiating account, epoch, case, result and screen context. Cancellation success and errors are guarded. Deferred tests cover logout, case/account switches and rejected responses. A retained private assessment is hidden when signed out. |
| 3 | Deletion, signup, saved reports, uploads and support required unnecessary effort | Destructive actions require confirmation. Optional signup details start collapsed; saved-report resume/filter, shared remaining-storage guidance, batch quota refusal and keyboard step focus simplify the flow. Established public support contact works before sign-in; technical details stay collapsed and manual-copy fallback opens/focuses the summary. Desktop/mobile Chrome checks retain the seven-step Wizzard. |
| 3 | Administration report totals included support/orphan/wrong-owner documents | Counts now include only appropriately owned case reports. Mixed inventory tests preserve support documents while excluding them from report totals. |
| 3 | Obsolete capability/package entries and conflicting current-state notes | The permanently refused response-draft action is removed from advertised paid actions. Eight unused or verification-only entries are excluded from the runtime package, with source/history retained and runtime/operator dependency closure checked. The current-state index selects current provenance without rewriting old receipts. |
| 3 | Verification fixtures assumed old labels, missing authenticated context and wall-clock MFA timing | Fixtures now exercise actual protected results, selected-result review/download routes and current labels. Fictional enrollment/bootstrap/unlock use distinct deterministic counters through real validators. No product/privacy/MFA guard was weakened. |
| 3 | Random test listeners could land on Fetch-blocked ports; causes were obscured | The harness rejects blocked allocations before publishing a URL or sending requests, closes each rejected listener and stops after 32. Actual bind/close errors propagate. Successful rebinding and exhaustion are tested; account/billing POSTs are never retried. Runner listener cleanup and bounded nested transport causes are retained. |

The port-selection defect was reproduced locally: this machine allocates dynamic TCP ports from 1024, and Node rejects port 6000 with `fetch failed` / `bad port` before connection. The [Fetch port-blocking rule](https://fetch.spec.whatwg.org/#port-blocking) supplies the exclusion list. The original two failed ports were not recorded, so attributing those historical failures to blocked allocation remains an inference; subsequent complete HTTP journeys passed on compatible ports.

## Verification and custody

- Final executable/test source: f60d6db587ec81ae1f8a5b5e58b62166b134e828.
- Candidate: crp-v1-76dd4c2022831cae, 169 shipped files; manifest 76DD4C2022831CAEB74E476771480DC047A3B201D3BC35D49B5ACAC84BD44249.
- Final full: 16,782 passes / zero failures / zero skipped across 181 completed sections; f60d6db587ec81ae1f8a5b5e58b62166b134e828_COUNT matching tested sources, no drift or unrun sections.
- Governed checks: 32 syntax checks and ten release-tooling suites. Product reuse is disabled; the partial input review does not claim a complete dynamic dependency graph.
- Required ignored prerequisites: all 55 original pins match. Historical hashes were not rewritten. The primary checkout's stale ignored behavioral-summary input was restored from those exact pins after preserving its previous bytes in private custody; tracked files and customer stores were not overwritten.
- Package/archive and verification receipt: Immutable package receipt at C:/Users/webbd/.codex/private/crp-operational-audit-fixes-20261014/audit-release-final/candidate/package-receipt.json; archive SHA-256 5A3E94A93DF84C1F5C8C1D2ED6ABE697A91FE73E177D5A99BDEE798EB0ECA3C4; verification SHA-256 6B8668A46670FECA9EBC76EDD8F4A109A84FB6532069DA3237BCAD27DB4BDDEB; raw full SHA-256 B6ED8BAB98232BEDE19D5F7840FC5AA6D5003697E37FEC138F8E52A7DFCF1871. Production readiness remains false.
- Raw full, plans, input reviews, execution records, package/source proof and development evidence are retained under `C:/Users/webbd/.codex/private/crp-operational-audit-fixes-20261014/`.

The first governed attempt is preserved: 16,502 passes / 25 failures / zero skipped or unrun sections, zero source drift, raw SHA-256 `0E0947FA6D86A4B84A81B2C12679D961C89A24D9ABB2409B27636871A565DF7D`. It exposed eight obsolete/timing-sensitive fixtures and two transport exceptions. Corrections retained all findings, uncertainty, special-answer, ownership, approval and real MFA assertions; the real clarification race was corrected with additional context tests. The failed receipt was not relabeled or used as an accepted baseline. The accepted predecessor's original 16,406/0/0 receipt remains unchanged.

A prerequisite-restoration path mismatch earlier in development overwrote seven pending coordinator files in the isolated checkout. It was detected, restored and corrected before candidate freeze; the primary checkout and running services were unaffected. Failed development receipts and the original tool evidence remain preserved.

## Source integration and operational boundaries

The source handoff uses a guarded fast-forward from clean primary main 0b5cf0bc3cbbb1dc779223f40d4924aeba563429. All 169 shipped and 375 tested sources must match this candidate at handoff; closure changes are documentation only. The clean primary guard must pass before fast-forwarding `C:/CRP-NEW`. Documentation closure does not change packaged bytes or rerun product regression.

Hosted production/staging remain accepted `crp-v1-391d75bc3ef29f27` / `c43a164a91aa573e3dee8ce956b28cb2f0066532`, 177 files; production PID 1323688 and staging PID 1221630. The original local service remains `crp-local-operational-52ee45aade7aee92`, PID 20396. This batch replaces no service, account, provider configuration, private data or signed journal. There was no deployment, push, real-account recovery/deletion, live charge, payout, mailing or external outreach.

Remaining work, in order:

1. Separately authorized staging activation and genuine affected Sandbox/payment acceptance, then all current-build hosted 30-gate/123-criterion/46-predicate checks. Local doubles are implementation evidence. Production needs separate authorization.
2. Shared-VPS kernel reboot, controlled hosted rollback and running restore rehearsal. Current authenticated encrypted backup validation is custody evidence; it does not prove a running restore. Actual services use Node 22.23.3; an unused default Node 20 was not substituted for their executable identity.
3. Contemporary dedicated-layout specimen acquisition. All 82 selections and the 69-entry active registry are preserved; five dedicated admission rows/general intake do not certify every current bureau export. This batch adds no layout, specimen, rule or statutory finding.
4. Sustained larger workload and multi-writer capacity qualification. Existing measurements remain bounded to their stores/workloads and one writer.
5. Owner-reviewed policy publication and held enhancements retain separate authority.

See `CRP_CURRENT_STATE_2026_10_14.md` and the single work register for current source/runtime scope. Local completion does not certify hosted release readiness or close the remaining operational boundaries.
