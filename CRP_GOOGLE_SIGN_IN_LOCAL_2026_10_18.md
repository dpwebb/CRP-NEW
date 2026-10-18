# Google sign-in through Auth0 — local integration

Owner request: “Integrate Google Sign in protocols for CRP the Auth0 site is loged in”. The owner chose “Use an existing CRP Google OAuth client”. This authorizes this bounded integration and inspection of the existing provider setup. Root alone writes source, runs tests and operates browser/provider surfaces. Unrelated dirty AGENTS/release documents, output and previous release evidence are preserved. Staging/production activation and another source push are separate actions.

Checkpoint: IMPLEMENTED_AND_FOCUSED_VERIFIED; GOVERNED_FULL_PENDING; PROVIDER_CONFIGURATION_AND_REAL_GOOGLE_ACCEPTANCE_PENDING. This is a local successor to accepted source 1851bcdd360d009cf228e9f4f6e4db6930ccb7fa/build crp-v1-193edebfa9c24bf1. No existing operational store, hosted service or provider configuration has been changed.

## Implemented behavior

An optional “Continue with Google” button appears beside existing password entry only when all Auth0 configuration is enabled and valid. Authorization uses the existing public/SPA Auth0 client, server-held authorization-code PKCE with S256, independent 256-bit state/nonce/browser proof, five-minute one-use handoffs and a fixed callback/return path. Only `openid email` is requested. The issuer is explicitly configured, and RS256 signatures, configured JWKS, issuer/audience/authorized-party, expiry/issued-at/not-before, nonce, Google subject and boolean verified email are checked before an account or session can be opened. Provider tokens are discarded and never stored in browser storage, account records or logs. The callback removes the authorization query via a fixed redirect before the application is loaded.

An existing email does not automatically link accounts. The consumer explicitly proves the current CRP password and enrolled CRP authenticator before linking. Later Google sign-ins resolve the immutable issuer/subject binding and still require the existing CRP factor. New Google accounts choose a backup password for existing CRP recovery/security functions, retain mandatory recovery-key confirmation and can opt into CRP MFA through the existing setup. No role, grant, report ownership, billing or mailing authority is derived from provider claims. Existing native sign-in and privileged step-up remain in place.

Account security also allows the owner to disconnect Google using the current CRP password and enrolled authenticator. It removes that account's binding and expires its existing CRP sessions; the password and saved recovery key remain usable. It does not revoke unrelated accounts or alter Auth0 tenant configuration. Existing account deletion removes the binding with its account row.

Configuration is disabled by default: `CRP_AUTH0_GOOGLE_ENABLED=0`, with explicit `CRP_AUTH0_DOMAIN`, `CRP_AUTH0_CLIENT_ID` and `CRP_AUTH0_PUBLIC_ORIGIN`. Production/staging origins must match their exact known HTTPS hosts. Only loopback local development may use HTTP. No Auth0 client secret is needed for the existing public client. Exact callback suffix: `/api/auth/google/callback`. Ephemeral handoffs deliberately expire across service restarts; there is no persistent token migration.

## Current provider inspection — no writes

The logged-in Canadian Auth0 tenant is `dev-gptogs44fcgwy3ws.ca.auth0.com`. The existing `CRP` SPA client is `qhlb8UbJtQHnrbyhFmGavd1XNO5MSif6`; Google (`google-oauth2`) is already enabled for it. Its current callback list contains only `http://localhost:5173/`. A separate `CRP AUTH0` SPA uses `YYdKTD43WmcjI8QvYtYkwGwMAcNbJ5jT` and only `http://localhost:5173`; neither application was altered, deleted, converted or recreated.

The Google connection visibly says it uses Auth0 development keys. Offline access and additional Google service permissions are unchecked. Production Google acceptance requires the owner's existing Google OAuth client credentials, retaining only identity/profile permissions and the Auth0 callback `https://dev-gptogs44fcgwy3ws.ca.auth0.com/login/callback` in that Google client. The existing Google Cloud project `credit-rergulator-pro` is labelled “Credit Regulator Pro” and lists a web OAuth client with that name, public client ID `825522012899-s80nahiru8n3v74ipsv4c4l09itq0pt3.apps.googleusercontent.com`. Detail-page verification remains pending. No client secret was revealed, copied, rotated or entered.

Prepared Auth0 application callback additions, preserving the existing localhost entry:

- Local: `http://127.0.0.1:8891/api/auth/google/callback`.
- Staging, upon separately authorized testing: `https://staging.creditregulatorpro.com/api/auth/google/callback`.
- Production, upon separately authorized release: `https://creditregulatorpro.com/api/auth/google/callback`.

Browser security policy requires action-time confirmation before saving expanded authentication access. The owner must enter/submit an authentication credential change themselves. No application callback or Google credential change has yet been saved. Do not request secrets in chat, use Auth0 management tokens, add broad API scopes or provision a replacement identity service to bypass this handoff. Review production proxy logging so authorization-code query parameters on this callback are not recorded before any hosted activation.

## Local evidence

Evidence directory: `accelerated-launch/service/out/google-signin-local-20261018/`. Prior focused receipts remain immutable. R1 passed395/0/0. R2 passed759/0/0 across Google security, password-reset, privileged access, legacy-password continuity, hardening and deletion. R3 passed1412/0/0 across then-current Google checks and existing actual-browser homepage/MFA/signup/reset/admin/UI checks. These are separate development runs, not a full-regression aggregate.

R4 and R5 each retain432 passes/1 browser timeout/0 skips. Diagnosis identified a test attempting hidden mobile navigation without opening its actual menu. The corrected real interaction opens “Navigation menu” before Account/sign-out; no product behavior was bypassed. R6 passes449/0/0, including actual headless Chrome signup/recovery confirmation/repeat sign-in/Cancel against the production application code with an explicitly simulated, locally signed provider transport. No provider request leaves loopback in this test; it does not prove real Google consent, Auth0 configuration or hosted operation.

A separate isolated loopback preview uses a new empty temporary store and disabled outbound mail. Actual connected Chrome shows the Google button plus password entry, and measured390px has no horizontal overflow. Screenshots are in `output/playwright/google-signin-local-20261018/`. No Google sign-in button was submitted against the real provider, real consumer account or owner MFA. Preserve any later failed full or provider attempt separately; do not replay an uncertain authentication/consent intent.

Official implementation references: [Auth0 Code with PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce/call-your-api-using-the-authorization-code-flow-with-pkce), [ID-token validation](https://auth0.com/docs/secure/tokens/id-tokens/validate-id-tokens), [secure account linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts), and [Google connection setup](https://developer.auth0.com/resources/labs/authentication/google-social-connection-to-login). The existing provider was resolved through the Stripe Directory skill; no provisioning or payment was performed.
