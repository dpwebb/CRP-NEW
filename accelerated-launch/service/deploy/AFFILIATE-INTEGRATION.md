# Coordinated CRP and Affiliate deployment

CRP and Affiliate Operations remain separate repositories, processes, identities and stores. The integration carries consented referral handles and opaque account references; it grants no affiliate access to credit reports, consumer credentials or the consumer database. Outgoing payments remain external and human-controlled. No push or deployment activates attribution automatically.

| Environment | CRP origin | Affiliate origin | Affiliate billing reader |
| --- | --- | --- | --- |
| Staging | https://staging.creditregulatorpro.com | https://affiliates-staging.creditregulatorpro.com | Existing sandbox; restricted test reader |
| Production | https://creditregulatorpro.com | https://affiliates.creditregulatorpro.com | Restricted live reader; independently verified account |

## Configuration

Use `affiliate.staging.env.example` and `affiliate.production.env.example` as integration overlays. The Affiliate companion templates are `C:/CRP-AFFILIATE-OPS/deploy/integration.{staging,production}.env.example`. Both tracking switches start disabled. Preserve each full protected runtime environment, database, security, provider, AI and email settings when applying an overlay; these templates are not full replacement runtime files. Do not copy consumer credentials into Affiliate Operations or wholesale-copy environment files between apps.

Provision a dedicated random integration key of at least 32 characters through existing protected host secret files. Within one environment only, CRP `CRP_AFFILIATE_BINDING_KEY` equals Affiliate `BINDING_SECRET`. Use a different integration key for the other environment. These keys must also differ from Affiliate `REFERRAL_SECRET`; staging and production referral, billing-reader and webhook secrets must not be reused. No secrets or actual runtime environment files belong in Git, command arguments, screenshots or logs. Existing provider verification must confirm restricted read permissions; an `rk_` prefix alone does not prove permissions.

The CRP front server must forward the existing exact GET `/affiliate/referral` to its sole store worker. Keep the existing HTTPS reverse proxies and independent services. Do not route the entire affiliate application through CRP, share sessions, broaden CORS or share a database. The signed first-party referral cookie is host-only, HttpOnly, SameSite=Lax and Secure on both hosted environments. The redirect removes the referral query. Proxy/access-log configuration must not retain the referral token query.

## Paired release record and preflight

Copy `affiliate-release.example.json` to a new private release record. Fill both environments' exact CRP commit/build ID and Affiliate commit/image digest, plus their independently observed predecessor identities. The template intentionally contains UNSET and fails validation. Never replace predecessor values simply to make a guard pass. Preserve a dated record for each deployment and its rollback; do not overwrite prior records.

Run the read-only preflight on the trusted operator host that already has approved access to both integration overlays. The command must not be used to export full runtime environments to a workstation. It checks both environment pairs, switch agreement, dedicated matching keys, cross-environment secret isolation and declared immutable release identities. It emits only the allowlisted nonsecret release fields, booleans and fixed error codes. It makes no HTTP, provider, deployment or activation calls.

```powershell
node accelerated-launch/service/deploy/affiliate-release-preflight.cjs --environment staging --mode dormant --staging-crp C:/protected/staging-crp.env --staging-affiliate C:/protected/staging-affiliate.env --production-crp C:/protected/production-crp.env --production-affiliate C:/protected/production-affiliate.env --record C:/protected/paired-release.json
```

`dormant` requires the selected pair to be disabled; uninstalled blank integration keys are reported as not installed. Partially installed or mismatched keys fail. `activation` requires installed keys, both switches on and billing reader/account/signer settings present in the selected proposed configuration. The other environment may remain disabled without installed keys; any installed secrets must be isolated. It validates proposed settings only: `configurationOnly:true`, `hostedAcceptanceVerified:false` and `productionReady:false` always remain explicit. Existing governed full/package, host, provider, data-preservation, backup and release guards remain required. The record declares identities; this checker does not prove those commits or images are currently served.

## Release order

1. Freeze and validate each application in its own repository. Push only its intended commits when authorized. Record both exact source revisions and immutable artifacts together; never deploy a floating branch or `latest` image.
2. Capture fresh custody, independent backups and the actual predecessor for each app. Deploy Affiliate receiver code first with tracking off, retaining its previous image and data-preserving rollback. Verify its actual image digest and protected service health using the existing operator path.
3. Deploy the exact CRP candidate with tracking off using its existing guarded deployment, whole stopped snapshot, expected-predecessor and rollback controls. Verify actual served build/source bytes. Reuse an already deployed counterpart only after confirming its exact compatibility; do not redeploy it merely because the other app changed.
4. In staging, verify the two apps together with a new bounded fictional campaign: explicit consent and untracked continuation, signed redirect, normal signup, durable binding receipt and receiver deduplication. Test tampering, expiry, wrong environment, receiver outage/restart and identical-event retries. Then use the existing sandbox acceptance to verify paid eligibility, duplicate webhooks, refunds/disputes and commission reversal. A referral or binding alone must create no commission. Preserve original data and clean only the new owned campaign normally.
5. After exact-build production gates pass, deploy the same accepted sources/artifacts to production using both existing release procedures and fresh predecessors. Review proposed activation overlays with `--environment production --mode activation`. Apply the accepted protected configuration on each app through its normal controlled restart; no automated preflight grants permission to activate.
6. Enable the CRP receiver/sender before Affiliate begins issuing tracked handoffs. While the brief transition occurs, Affiliate remains off. Then enable Affiliate and verify actual consenting binding plus independently verified eligible billing. Until that evidence exists, report connectivity as configured, not proven live attribution. Do not invent or replay a live sale for acceptance.

## Failure handling and monitoring

For a pause or rollback, disable new Affiliate capture first, then disable CRP binding delivery through its existing switch as needed. Keep pending outbox/inbox entries and deduplication history; do not delete/recreate them or restore old business data to revert code. After repair, re-enable CRP and let its existing durable queue retry the same event IDs. Receiver 4xx errors and exhausted retries become DEAD and require scoped reconciliation, not an automatic blind replay.

CRP's existing sanitized logger now emits `AFFILIATE_BINDING_DELIVERY` with only READY/SENT/DEAD outcome, attempt count and HTTP status. Monitor DEAD, repeated READY and missing expected SENT through the existing log/alert facility; if logging is configured silent, these events are suppressed, so confirm the selected protected sink before claiming monitoring is operational. No new public diagnostic endpoint exposes consumers. On Affiliate, use the existing authenticated operations readiness and job/inbox failure views for binding and billing reconciliation. Health alone is insufficient. Configure alert delivery separately through the existing authorized operator channel; no new notification recipient is authorized by this implementation.

Local configuration implementation does not install host keys, reconnect a provider, change a webhook, send mail, release money or deploy either app. New runtime source requires its own governed freeze/full/package and staging/production acceptance; earlier receipts retain their original build identities.

## Local contract verification

`node accelerated-launch/service/deploy/check-affiliate-contract.cjs --affiliate-repo C:/CRP-AFFILIATE-OPS` runs the actual two applications' signing/receiver modules against a new temporary PostgreSQL database and consumer store. It uses explicit fictional configuration, no runtime `.env`, and only a loopback HTTP listener. Fault-injected transport tests a receiver outage, then sends the same real signed body twice to the real receiver. It verifies one durable binding and no invented commission. This is local interoperability proof; it does not create a hosted consumer, call a provider or establish a live sale. The companion checkout and its existing development dependencies must be present; no runtime coupling or new package dependency is introduced.
