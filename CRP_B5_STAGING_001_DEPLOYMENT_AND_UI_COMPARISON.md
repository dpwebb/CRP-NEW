# B5-STAGING-001 — staging deployment completed

Owner authorization: staging deployment was explicitly approved; subsequent owner instruction authorized overwriting `staging.creditregulatorpro.com` and `creditregulatorpro.com`. This execution deployed only staging in Stripe sandbox mode. Production replacement remains authorized but has not been executed; the production launch prerequisites remain open.

## Deployed identity

- URL: https://staging.creditregulatorpro.com/
- Host: Hostinger VPS `srv1616603`, `187.127.252.51`, verified through the existing root SSH identity.
- Build: `crp-wizard-ef04486655ae2e2f`; composite runtime digest `ef04486655ae2e2fc98081152d6c59b48114d0a778358c3b68a956a403328786`.
- Source: `C:\CRP-NEW`; no Git repository, so provenance uses a sorted per-file SHA-256 manifest. 49 require-traced runtime/data/UI files transferred and re-hashed on Linux with no mismatch.
- Release directory: `/opt/crp-wizard-staging/releases/crp-wizard-ef04486655ae2e2f`; `current` points to this release.
- Process: separate `crp-wizard-staging.service`, dynamic service user, durable state `/var/lib/crp-wizard-staging`, backend loopback `127.0.0.1:8792`.
- HTTPS: separate read-only `crp-wizard-staging-router` container, loopback `127.0.0.1:8793`, existing Traefik routing, verified certificate validation and public health response.
- Node `v22.23.3`, existing local PDF/OCR executables; no global package upgrade. No private specimen was copied to the server.

The proposed `/opt/crp-node-staging` directory was already another checkout. It and its existing disabled unit were preserved; this release uses a new directory and unit. DNS already resolved to the intended VPS and did not require modification. Existing root production container `be4b9b92022b` and Traefik container `d1a04030fbad` retained their identities; no other application was restarted or overwritten.

## Measured acceptance

- Local regression: 4,718 assertions passed, zero failures or skips after the staging messaging change.
- Public HTTPS health equals the loopback build identity; reports `deployment=staging`, `billing_mode=test`, `launch_ready=false`.
- A service-owned sandbox Checkout completed through Chrome; the registered public HTTPS Stripe webhook granted access without a forwarded local listener.
- Public PUB-009 historical fictional training sample uploaded and read on Linux; explicit GB/GB-ENG selection produced three checks. This is historical test evidence, not current GB support.
- Assessment download HTTP 200, 3,275 bytes; repeat byte-identical; unpurchased case HTTP 402; second-account case access HTTP 403.
- Secure/HttpOnly session cookie verified; test account deletion revoked its session (HTTP 401); disposable test accounts and their uploaded sample data deleted.
- Staging service restart passed. Stopped-service snapshot and isolated restore-copy hashes matched, state version 3, three files. The first snapshot attempt copied the DynamicUser data-directory symlink; this was detected and corrected by copying the actual directory contents before verification. No claim is made that a full live restore or prior-release cutover was rehearsed.
- Rollback commands are saved in `SOURCE_CAPTURES/B5-STAGING-001/rollback-staging.sh`; stopping only the new router/service restores the prior hostname routing state while preserving data and backups.

## UI comparison and changes

The service and saved reference wizard share the green/cream/lime palette and guided steps. They are not visual equivalents: `consumer-wizard/dist` uses a left sidebar, hero text, progress bar and support panels; the deployed service has horizontal step buttons and a simpler main card. The live reference reached ChatGPT sign-in, but its interior comparison was interrupted by Chrome's open-extension UI block. The comparison of interior layouts is therefore based on the saved local reference, not a claim that its current hosted interior was inspected.

Before staging, stale claims that no provider was connected, no outbound request occurred, and the service was local-only were removed from consumer messaging. The public surface now reports the configured provider status and test mode. The staging warning instructs testers to use test cards/public samples and avoid real cards/private reports. An additive `/api/health` endpoint exposes build/mode metadata only, never credentials or consumer state. The original fictional demo was not deployed in place of the service.

## Remaining boundaries

This is a working staging preview, not public consumer launch. Live Stripe configuration and current GB layout support remain unresolved. Production deployment has not occurred. The release check's production-provenance condition remains distinct from this staging record; no legal finding class or bureau-response packet permission was expanded.

Artifacts: `build-manifest.json`, `test-billing-configuration.json`, `https-journey-verification.json`, service/proxy/activation/rollback files and `staging-ui.png` under `SOURCE_CAPTURES/B5-STAGING-001`. Secrets were sent directly over SSH into the mode-600 host environment file, never placed in the bundle or local evidence records.
