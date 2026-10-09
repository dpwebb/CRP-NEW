# Deployment configuration

## Current production authority — October 9, 2026

The owner authorizes deployment to `https://creditregulatorpro.com` and required release repairs. The historical preparation notes below describe the original B4 batch, not current billing or deployment status. Current Stripe integration is implemented and verified in test mode; production must separately verify live CAD 595 one-time, 795/month and 7950/year prices and the dedicated `/api/billing/events` endpoint. Current upgrade credit uses every verified unused lower-plan cash payment and dynamic once-only coupons; a fixed 595-cent coupon is not required.

Use a dedicated loopback production service, durable private storage, secure cookies and a stable support-reference secret. On the shared VPS, change only the exact apex/www CRP route and its own service/configuration. Preserve legacy accounts and authentic documents before cutover. Keep the manifest, frozen regression, actual provider reads, exact deployed source, restore/rollback, and other-domain preservation in the production acceptance receipt. Never commit consumer data or secret values.

Rollback must retain current purchases, accounts and report blobs. Switch compatible code/configuration while the CRP writer is stopped; do not overwrite current state with an older snapshot. The old app does not automatically read new wizard data.

## Historical B4 preparation notes

OWNER-ALL82-001 / B4: *"Prepare deployment configuration and release checks locally; do not deploy."*

**Nothing in this directory has been run against any host.** No DNS record was created, no TLS certificate was
issued, no service unit was installed, no payment provider was provisioned and no container was built. What is
here is the configuration a release *would* need, plus the check that decides whether a release may happen.

| File | What it is |
| --- | --- |
| `production.env.example` | The complete set of environment NAMES and fixed values, with every secret left empty. Committed on purpose: it carries no value, and a value placed in it would be published. |
| `../release-check.cjs` | The local pre-release check. Reads the tree, writes one evidence file, makes no outbound call. |
| `../server.cjs` | The single process this deployment runs. Loopback by default; no framework, no build step, no dependency tree. |

## What a release would still need

1. **A host with a loopback bind and a TLS terminator in front of it.** The service defaults to
   `127.0.0.1`; it does not open a public socket, and `production.env.example` says so.
2. **A private data directory outside any checkout**, supplied as `CRP_LOCAL_SERVICE_DATA`. The service
   refuses to start if that path resolves inside the repository — this is not a warning, it is a refusal.
3. **One writer per data directory.** The service takes a lock file and refuses a second writer; a stale lock
   from a dead process is taken over rather than needing manual cleanup.
4. **A payment provider, authorized and provisioned.** This is the one blocker that is a decision rather than
   an implementation: see the next section.
5. **An owner-authorized deployment step (B5).** The plan requires exact build/host provenance and explicit
   owner authorization for the deployment itself.

## The payment dependency, exactly

`payment-provider.cjs` implements the interface, ships one complete implementation of it that is explicitly
**not a payment** (the test adapter), and declares the provider the read-only legacy checkout used:

* **Provider:** Stripe.
* **What is required:** one account; one **CAD** Price per plan — `report_once` 595 (one-time), `monthly` 795 (per month),
  `annual` 7950 (per year), as the shipped `plan-catalog.cjs` defines them (it is authoritative; the amounts are CAD
  cents and must be mirrored exactly in the provider catalogue); one webhook endpoint whose signing secret is supplied
  as `STRIPE_WEBHOOK_SECRET`; the once-duration CAD 595 upgrade coupon that applies to the first subscription invoice
  only; and the two API key names.
* **What was NOT done and why:** provider selection and access are not authorized. The legacy checkout holds
  Stripe TEST keys on this machine (`Stripe API Test Keys.txt`, which this batch did not open), and a test-mode
  key is still a real key. So no key was read, copied or referenced, no outbound call is made by this build and
  `release-check.cjs` asserts the production template names the variables and fills none of them.

Until a provider is authorized and provisioned, **every checkout is refused** with
`PAYMENT_PROVIDER_NOT_CONFIGURED`, **no entitlement can be activated**, and no region can be launch-ready.
A mock payment is not working billing, and this build does not pretend otherwise.

## Reader runtime prerequisites

The deployed runtime must provide the existing local Poppler tools (`pdfinfo`, `pdftotext`, `pdftoppm`) and
`pdftohtml` on PATH, plus the configured local OCR engine. The AU reader uses `pdftohtml -xml -hidden -zoom 1`
to match positioned embedded repayment glyphs to the same report's printed legend. Temporary exports stay
local and are removed after reading. Missing or unreadable glyph/legend evidence remains unresolved; it is
not a code mapping or a compliance result. Verify this prerequisite on the staging host before claiming the
graphical reader journey there. Local passing tests do not verify a deployed host's tools.

## Rolling back

The service writes only inside `CRP_LOCAL_SERVICE_DATA`: `state.json`, `state.json.bak`, `store.lock` and
`blobs/`. Rolling back means stopping the process and pointing it at the previous directory. Nothing outside it
is written — not the repository, not a system directory, and no external service.
