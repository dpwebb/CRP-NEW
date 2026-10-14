# Signup security and consumer feedback — local implementation

Authority: October 13 owner request for initial-signup email confirmation, mandatory recovery-key saving, optional 2FA, hidden consumer checklist, delayed-operation feedback, contact-location dropdowns and document-completion guidance.

This candidate preserves the AU, UK, US, CA, Creator, synthetic and operational fixes. Staging and production remain outside this work order. Their historical acceptance does not certify these new changes.

## Consumer behavior

- New public registrations receive a six-digit confirmation email from support@creditregulatorpro.com. The email must be confirmed and the issued recovery key acknowledged before reports, billing or Contact Details are accessible. Optional authenticator setup is offered during signup. Reloading or signing in to an unfinished registration resumes that security step.
- Codes expire after 30 minutes, allow five incorrect attempts and have a 60-second resend cooldown, including failed deliveries. Codes are stored as keyed digests; authenticator secrets are encrypted. Password and authenticator attempt limits persist. Recovery keys remain hashed and one-use; password recovery revokes sessions and removes a lost authenticator.
- Existing accounts keep their credentials and access. Their email is not falsely labeled verified. Later security changes are available on a separate Security settings screen, rather than inside Contact Details.
- The internal Common error checklist is absent from consumer result rendering. Assessment rules and source-linked findings are preserved.
- Accepted operations disable their initiating button immediately. Work exceeding 600 ms displays a filling-document vector and an acknowledgement to wait. Downloads and document opening retain feedback until the file is received; repeated activations are suppressed. Reduced-motion preferences are supported.
- Country and region/state/province dropdowns appear first in Contact Details. Saved details take precedence; sign-in email fills a blank contact email. An IP country suggestion fills a blank country, and an available supported region may fill a blank region. Unknown locations use manual selection. Contact location does not change report-assessment jurisdiction.
- Documents may be added later, with explicit notice that the documents needed for a dispute are required before completing and approving its packet. Existing packet requirements and approval safeguards remain enforced.

## Private integration and preservation

A separate Hostinger app password named `CRP signup confirmations v2` was created for the existing mailbox. Existing mailbox passwords, app credentials and operational-alert credentials were preserved. A received confirmation message verified support@creditregulatorpro.com as the sender. No additional mailbox or email provider was purchased.

Local mail configuration is supplied through `CRP_SIGNUP_MAIL_ENV`; credentials are outside Git. The original full-access test account and its private local data remain in use. The new authenticator encryption key is stored as `.account-security-key` in the private data directory. Existing complete-directory backup scripts include that key. It must accompany any restoration of authenticator-enabled accounts.

Private integration evidence is under `C:\Users\webbd\.codex\private\crp-ai-comparison\implementation-2026-10-13\signup-security-feedback`. Browser screenshots and focused receipts are under `accelerated-launch/service/out`. Test mail is fictional and isolated by default; a separate real-mail signup test exercised provider acceptance and all required signup endpoints without changing the original account.

## Verification completed October 14

Full current-product regression: **16,041 passed, 0 failed, 0 skipped**, all **171** sections completed, no unrun sections and no source drift. The receipt is `accelerated-launch/service/out/current-regression-evidence.json`; a private immutable copy is retained in the integration evidence directory. The prior full run with four obsolete presentation expectations is retained separately; corrected tests verify the hidden checklist, protected binary downloads and exact approved PDF bytes.

Local runtime: `http://127.0.0.1:8890`, build `crp-local-operational-a926c178ef0dfc5c`, manifest `A926C178EF0DFC5C66E275E18B5D468D91F6EBDB2FBB0A70474C93B582ADA828`, 167 shipped files. All 13 enabled public assets match the manifest; nine optional previews remain disabled. Actual browser signup, mandatory confirmation/key acknowledgement, optional authenticator setup, contact dropdowns, 600-ms progress, duplicate activation, document guidance, and approved PDF download/print behavior pass. Delayed downloads and failed document opening preserve unsaved letter edits and do not restore invalid approval controls.

The same full-access account successfully signs in through the local browser. Original records remain byte-for-byte unchanged apart from normal session lifecycle: 1 account, 393 cases, 432 files, 455 results, 1 packet and 1 entitlement; all 432 original blob hashes verified. Of the previous 165 shipped files, 159 are unchanged, six changed for auth/UI/release-display requirements, and two security/mail modules were added. No reader, rule or packet module was removed or changed.

The initial, newly created mail app password appeared in a saved screenshot. It was revoked and replaced; SMTP rejects the exposed credential (535), accepts the replacement, and the real-mail signup test passes. The received replacement confirmation identifies support@creditregulatorpro.com as sender. The screenshot now shows only the credential names; the clipboard was cleared. The four pre-existing app passwords and mailbox password were preserved.

Staging and production remain `crp-v1-331f32a35d213383`. No CRP deployment, hosted configuration change, account migration or original report reassessment occurred. New hosted signup/mail acceptance and any affected purchase/release proof remain separate requirements before a future deployment. Local mail credentials are not part of the Git package.

Focused development failures and interrupted full attempts remain development evidence, not passing release evidence.

October 14 follow-up: owner-authorized exact-build staging acceptance and production deployment completed on crp-v1-a926c178ef0dfc5c. The preceding no-deployment statements describe this original local checkpoint. See `CRP_SIGNUP_CONSUMER_UPDATES_PRODUCTION_2026_10_14.md` for fresh 30-gate/123-criterion acceptance, real hosted signup/email verification, preservation and backup proof.
