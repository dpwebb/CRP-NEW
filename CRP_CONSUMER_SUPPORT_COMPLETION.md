# BLOCKER-SUPPORT-001 — privacy-safe diagnostic reference and consumer interface (implementation completion)

October 3, 2026. Local implementation only; no deployment performed. The previously reported staging identity crp-wizard-77c1605b03e2aa8d is an evidence-comparison target, not proof that these local changes are served.

## Measured outcome

5,582 regression assertions passed, 0 failed, 0 skipped (was 5,524; +35 ay-consumer-support HTTP, +23 az-consumer-support-ui browser/secret).

Implementation closed: 13; implementation open: 12; staging verified: 4; staging pending: 21; production launch failures: 24; launch_ready: false.

## What was implemented (application behavior, locally testable)

BLOCKER-SUPPORT-001 (privacy-safe diagnostic reference), criteria `reference`, `redaction`, `access`, `usefulness`:

- **Backend** (`support.cjs` + `app.cjs`): an opaque, account-owned `crp-ref-…` HMAC reference; a redacted operational-only diagnostic view (build id, lifecycle category, jurisdiction, counts); authenticated, ownership-scoped lookup; no external transmission.
- **Consumer interface** (`ui/app.js`, new "Support" step): reachable without an open case or upload; retrieves the owned reference via `GET /api/support`; shows the reference, plain-English guidance and a copy-reference action; copies the redacted summary; explains that copying does not send a message and does not submit a support request; no provider, no contact details, no "submitted" claim.
- **Truthful failure handling**: retrieval failure shows an error with a retry; clipboard failure falls back to a selected-text manual copy. Stale support information is cleared on sign-out/account deletion, and a delayed response is rejected so it can never render a previous account's information.

### Reference secret lifecycle

- Supplied by configuration: `CRP_SUPPORT_REFERENCE_SECRET` (server-side only).
- No hardcoded fallback secret in source: when unconfigured, a random secret is generated once per service process (stable within that process, not across restarts).
- Rotation: changing `CRP_SUPPORT_REFERENCE_SECRET` changes every derived reference (old references no longer resolve to the same token).
- Configuration requirement: production must set `CRP_SUPPORT_REFERENCE_SECRET` to a stable value for reference stability across restarts. The secret is never returned to any caller and is not printed.

## Verification and evidence

- `ay-consumer-support`: 35 assertions — reference stability, redaction, authenticated + cross-account + unknown-reference refusal, lifecycle usefulness (HTTP security).
- `az-consumer-support-ui`: 23 assertions — secret lifecycle (stability across reconstruction, account isolation, rotation, no hardcoded fallback), Support reachable without a case, owned-reference load, correct reference/summary copy, clipboard failure, retrieval failure + retry, stale-information clearing after sign-out.
- `consumer-support-evidence.json` written by `SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-consumer-support.cjs` (hash-pinned source files and behavioral evidence refs, `staging_verification.status=PENDING`).

## Status boundary

- Implementation: `IMPLEMENTED_AND_TESTED` — all four functional criteria are implemented and covered by passing behavioral tests.
- Staging verification: `PENDING_VERIFICATION` — the consumer interface and endpoints have not been exercised on a deployed build. This is a verification gap, not missing functionality.
- Production: unresolved — the release checker still records this blocker as a production launch failure.

## Remaining boundaries

- No deployment performed; no staging/production readiness is claimed.
- The build id exposed is the local-development default unless `CRP_BUILD_ID` is set.
- Consumer-language and question-materiality imperatives are followed: no legal-advice disclaimers, no finding/incomplete-check explanations, no context-only questions.

Next: architect review. Do not start another blocker.

