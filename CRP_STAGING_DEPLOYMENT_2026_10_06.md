# Hostinger staging deployment — October 6, 2026

URL: https://staging.creditregulatorpro.com
Host: configured SSH alias hostinger-vps, IP 187.127.252.51.
Owner authorized staging deployment and test-mode billing in this conversation.

## Served candidate

- Build: crp-v1-4a88438669cba533.
- Frozen manifest digest: 4A88438669CBA53349B99591C84B51F36FE1BE96B1E1E67BF7159A2737273572.
- All 80 manifest-listed files were hash-verified locally before transfer and on the VPS before activation.
- Release directory: /opt/crp-wizard-staging/releases/crp-v1-4a88438669cba533.
- Existing crp-wizard-staging.service and domain routing reused; no other service modified.
- Public HTTPS /api/health confirms the build, deployment=staging, billing_mode=test, launch_ready=false.
- Existing host-side Stripe configuration was reused only after verifying test secret-key and publishable-key modes without printing their values. No checkout/payment was performed by this deployment.
- Stable support-reference secret generated on the VPS; never transferred, printed or committed.

## Packaging omission corrected during deployment

The first startup failed because the frozen manifest omits consumer-wizard/dist/jurisdiction-data.js, which app.cjs requires. Automatic rollback restored the previous release. The unchanged local dependency was then added to the deployed release and verified against SHA-256 C6A6CBCCA2E0DB81E189F9FE5D7E7BBB2DE0DDAD4C5C1616A53AC0A024A49906. The deployed package contains 80 manifest-listed files plus this dependency and provenance metadata. Its hash is recorded in deployment-supplement.json on the host; it is not silently represented as part of the original manifest.

Cline follow-up: include this required file in the maintained manifest generator and repository/deployment packaging before the next freeze. Do not lose it through the parent repository's consumer-wizard exclusion; that directory is independently versioned and this dependency was not yet tracked there at setup.

## Verification and remaining testing

Real browser loaded the HTTPS Wizzard, account controls and journey navigation. The main-page footer disclaimer appeared once. Expected unauthenticated /api/session returned 401. This deployment did not repeat the complete upload-to-packet or Stripe checkout journey; those hosted checks remain for staging acceptance. No private report was uploaded. No live charge, remote Git push or production deployment occurred.

## Rollback

Previous release: /opt/crp-wizard-staging/releases/crp-wizard-77c1605b03e2aa8d.
Before activation, the existing service was stopped and private data and environment were backed up beneath /opt/crp-wizard-staging/backups/before-crp-v1-4a88438669cba533-<timestamp>, with restricted permissions. Exact activation provenance is /opt/crp-wizard-staging/candidate-activation.json. Stop only crp-wizard-staging.service before restoring the previous release symlink/configuration. Preserve data; do not delete or restore private data blindly.

## October 6 Canada-first served correction — current status

Current build: crp-v1-75755118a71c9399. Manifest SHA-256: 75755118A71C93994F85EB3E9185DAD80220BD8E17FCA19E1007BD165502166A (81 files, including the required jurisdiction-data runtime dependency). Full local regression: 5397 passed, zero failed or skipped.

Deployed to the authorized Hostinger VPS at https://staging.creditregulatorpro.com. Public health confirmed this build, staging environment and test billing mode. A real-browser fictional account selected Alberta and confirmed the active requirements/upload-to-issue-to-selected-packet wording; the obsolete no-statutory/no-check/no-TransUnion-rule statements are absent. No private report or payment was sent to staging. Complete hosted upload/checkout/packet acceptance and production readiness remain separate and pending.

The prior build and private environment/data were backed up before the service switch; activation provenance and rollback location are recorded on the host in /opt/crp-wizard-staging/candidate-activation.json. Only the staging wizard service was changed. No live charge, Git push or production deployment occurred. This current entry supersedes earlier destination-pending and candidate-identity statements.
## Purchase-flow deployment — October 6, 2026

Deployed crp-v1-4e2acf545c282d14, manifest 4E2ACF545C282D145CD2BF36C12C16A4DF2CECEA2616C52E495E1105E4DB2B41, all 81 hashes verified. Public health confirms staging/test mode. Previous release crp-v1-7ac42970c633a742 and restricted environment/data backups are recorded in host candidate-activation.json. STRIPE_APP_ORIGINS now includes https://staging.creditregulatorpro.com while preserving prior entries. No live charge or production change.

Real hosted browser: fictional Nova Scotia PDF uploaded and assessed with no purchase; one potential issue, counts, teaser and three purchase choices displayed. Checkout refused CHECKOUT_OPEN_FAILED / RETURN_URL_OUTSIDE_CONFIGURED_ORIGINS: the browser request has no return_url. This is a remaining client request defect, not an absent host origin. No payment completed; hosted paid unlock/packet verification remains pending. Also found stale upload-screen wording: 'Choose a plan to check this report and create your dispute packet.' Free assessment actually succeeds. These two defects need a bounded follow-up; they are not reported as passing acceptance.

## Checkout return correction — October 6, 2026

Current served build: crp-v1-1133cf76c411450f. Manifest: 1133CF76C411450F29F892BCACAA71CE681999DD7D3EDA70FE5864E5EF4EC1E3, 81 verified files. Full final regression PASS 5610 / 0 / 0 (including browser return-origin and selected-case assertions). An earlier full run caught one obsolete access-copy expectation; corrected and rerun successfully.

Both results and billing buttons now use the shared checkout handler, sending return_url from the application's own origin and preserving the selected case. A successful Stripe response navigates to the returned checkout.stripe.com URL. Free-assessment access wording corrected. No prices, Stripe keys, classification or entitlement rules changed.

Activated on authorized staging with environment/private-data backup and previous release retained; public health confirms this build and test mode. Real hosted browser reopened the fictional assessed case and clicked its one-time unlock; Stripe sandbox checkout loaded successfully. No payment submitted, no live charge, no private report sent, no Git push. Completed payment/webhook/unlock acceptance remains pending. Previous missing-return-url defect is closed. Activation provenance and rollback: /opt/crp-wizard-staging/candidate-activation.json.

## Owner-requested Batch 39 staging deployment — October 6, 2026

Source commit `56417e8` was pushed to `origin/main` after confirming the tree was clean and the tracked report probes contained only structural/date tokens rather than the private report bytes or identifiers. Candidate `crp-v1-28154327fb6db999`, manifest `28154327FB6DB99947BDDE07A0034A2DB84B5B85EB437A7C345D8D92BAC10636` (84 shipped files), was packaged from exactly the manifest-listed files; each SHA-256 matched locally and again on the host before activation. The required `consumer-wizard/dist/jurisdiction-data.js` is included in those 84 files. Local full regression before deployment: **6037 passed, 0 failed, 0 skipped**.

The existing `/opt/crp-wizard-staging` service and `https://staging.creditregulatorpro.com` routing were reused. Before the switch, the active service was stopped and its environment and private data directory were backed up with restricted backup-directory permissions at `/opt/crp-wizard-staging/backups/before-crp-v1-28154327fb6db999-1791331574`. Previous release `/opt/crp-wizard-staging/releases/crp-v1-1133cf76c411450f` remains intact. The staging environment retained its Stripe **test** key modes and other configuration; only `CRP_BUILD_ID` was changed to the new candidate. Activation provenance and rollback pointers are in `/opt/crp-wizard-staging/candidate-activation.json`.

Post-activation checks from the public HTTPS endpoint: `/api/health` returns `build_id=crp-v1-28154327fb6db999`, `deployment=staging`, `billing_mode=test`, `launch_ready=false`; `/api/jurisdictions` lists **82** regions and four countries; the main page returns HTTP 200; the staging service is active and `current` resolves to the new release. One transient 502 during startup resolved before activation was marked successful. No production service or live billing configuration was changed. No private report was transmitted to staging. A complete new hosted fictional upload, checkout/payment, review and entitled packet journey remains **PENDING**; these health and page checks do not count as that acceptance.
