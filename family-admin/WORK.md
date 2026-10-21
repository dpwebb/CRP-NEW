# Family administration build

Owner-authorized local build for CRP, Affiliate Operations and Mail Operations. Separate from all packet/mailing release source, manifests, packages and hosted actions. Work only in family-admin/ on codex/family-admin-build. No app provisioning, hosted configuration, deployment, payments or mailing.

Implement a standalone gateway/UI using native administration APIs, primary CRP MFA, explicit per-person external memberships, bounded server-held credentials, named operations, per-request native authorization, durable intent/audit records and confirmation of changes. Never expose a blanket proxy or use a shared administrator credential. Affiliate payout execution remains external. All data belongs to the originating application.

Validation: native-contract loopback integration tests, refusal/revocation/CSRF/idempotency/unknown-outcome tests, real CRP isolated harness acceptance when available, desktop/mobile browser review on uniquely fictional local services. No real accounts or stored credentials.


## Local outcome

Implemented standalone server/gateway, per-person native application links, fifteen responsive navigation views, shared activity journal and named management operations across all three applications. Affiliate membership controls retain its native operator/analyst and last-operator rules. Provider dispatch/route evidence and external payout release stay in native approved workflows. No hosted deployment, credential provisioning, existing application source/manifest edit, payment or mailing was performed.

Validation: 18 local test scenarios passed with zero failures/skips, including genuine isolated CRP MFA/session HTTP acceptance and loopback Affiliate/Mail native-contract fixtures; syntax checks passed. Browser review covered all fifteen desktop views, linked application cards, confirmed fictional Mail note and audit entry, mobile dashboard and all-three team panels at390px, accessible menu open/close, and no document horizontal overflow. Raw development failures, later passing logs and screenshots are retained locally; no local result is called hosted acceptance.

The owner-facing preview is a fictional loopback deployment at127.0.0.1:4396. Runtime sessions/credentials are memory-only, with the demo's unique temporary journal directory. Build notes document explicit production/staging configuration and remaining membership/identity integration requirements. This remains separate from Mail's PostGrid+packet source freeze and release ownership.
