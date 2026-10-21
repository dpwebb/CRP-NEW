# Optional mailing — local simulation integration

Owner: "Connect this to CRP so users can choose to have us mail their packets, keeping payments and mailing simulated for now."

This authorizes the bounded local consumer integration and fictional verification. It does not authorize deployment, real provider/payment configuration, charges, postal submission, or changes to the Affiliate application.

## Consumer behavior

An explicitly configured local CRP instance offers an optional mailing section on Review and approve packet. Download, print and self-mail stay available. After reviewing and approving the current packet, the consumer can request an invented sample price, review its bureau/destination and price, explicitly authorize simulated mailing and simulated payment, see the order reference/status, and cancel before submission may have occurred. A staff cancellation is reflected by refresh.

Each request binds the actual approved PDF-byte SHA-256, packet version, page count, recipient-address hash, bureau, country, exact quote/currency and explicit mailing approval. Quote confirmation rechecks the current packet and destination. Pending order/payment work is durably recorded on the owned packet and retried using fixed business IDs and fresh signed transport nonces. No report, PDF, supporting document, email, consumer name or address is transmitted to Mail Operations; its owner reference is keyed and opaque. Deleting a case removes its local packet pointer as before; remote simulation records contain only these minimal metadata references.

This phase uses the currently approved download unchanged, including its customer-only instruction sheet. It explicitly does not establish a sendable signed postal artifact, real postal-route availability or provider pricing. The consumer UI states these limits. Real fulfillment must resolve instruction pages, signatures, mail-ready bytes, retrieval and fresh dispatch authorization in a separately verified phase.

## Configuration

Disabled by default. All conditions must hold: `CRP_DEPLOYMENT_ENV=local`, test-adapter-not-a-payment with `CRP_ALLOW_TEST_PAYMENT_ADAPTER=1`, `CRP_MAIL_OPS_MODE=local-simulation`, literal `http://127.0.0.1:<port>` service origin, separate 64-hex `CRP_MAIL_OPS_KEY` and `CRP_MAIL_OPS_PAYMENT_KEY`. The keys match only the dedicated linked local Mail Operations integration/payment principals. Hosted staging/production, live billing and external/nonliteral-loopback endpoints cannot enable this flow. Never copy an existing CRP or Affiliate private environment into the mailing project.

`C:\CRP-MAIL-OPS` supplies `npm run local:linked`, a fictional rehearsal stack using an isolated CRP test store, actual CRP APIs and signed test-adapter subscription, captured local confirmation messages, and the local mailing database/dashboard. It reads only Mail Operations' own generated configuration. Stop the standalone mailing process first if it holds the same port. The printed fictional account and consumer URL open the prepared packet journey; the staff URL shows its resulting mailing order. This does not connect an existing or deployed consumer account.

## API and source

Owned subscriber routes: GET `/api/cases/:caseId/mailing`, POST `.../mailing/quote`, POST `.../mailing/confirm`, POST `.../mailing/cancel`. Signup/security, ownership, subscriber gates and same-origin policy remain in force. Server-side transport uses exact-body HMAC, separate principals, clock limits, no redirects, a fixed loopback origin, timeout and bounded responses. The browser receives no service key.

Changes: `app.cjs`, `errors.cjs`, new `mail-ops-link.cjs`, consumer `app.js`/`index.html` and new `packet-mailing.js`; a default-disabled boundary section is registered in the existing test runner. Existing PDF construction and approval modules are unchanged.

Focused development verification is recorded in `out/mail-link-config-focused-r1.json` (11 assertions) and Mail Operations' actual cross-service HTTP tests. Shared runtime/UI verification follows the standing governed full workflow in this isolated checkout. Local source, focused/full proof, user rehearsal and any later hosted release remain separate. No hosted release or production-readiness claim is made here.
