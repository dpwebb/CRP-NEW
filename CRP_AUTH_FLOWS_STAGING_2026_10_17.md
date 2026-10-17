# Staging account-flow browser acceptance

Owner: “Test the updated sign-in, sign-up and 2FA flows on staging on desktop and mobile, including enable-or-bypass and 2FA-enabled sign-in. Use fresh fictional QA data, clean up afterward, and keep production and existing consumer data unchanged.”

Status: PASSED_REQUESTED_AUTH_FLOWS; TWO_NEW_QA_ACCOUNTS_REMOVED; SIGNED_OUT. Root alone operated. No product code, deployment, provider configuration, access grant, payment, existing-consumer authentication or source push occurred. Candidate remains staging1d80/source2d19177/PID3593087; production45ba/source3941/PID3489454.

Campaign55c66c71-5431-4fb0-8ac5-a9d2e20c5ac3 used exactly two fresh fictional aliases through the actual staging UI in the in-app browser at1440x1000 and390x844. Both used newly generated passwords, real received confirmation emails and privately saved recovery keys. No report, ID, address document, profile or purchase was added.

| Observed journey | Desktop | Mobile |
| --- | --- | --- |
| Actual signup, email confirmation, recovery-key acknowledgement and Finish signup to Upload | Pass | Pass |
| Password-first login has no authenticator-code input | Pass | Pass |
| Separate optional protection prompt, Not now to Upload, normal sign-out | Pass | Pass |
| Enable protection, password reauthentication, setup key and current-code confirmation | Pass | Pass |
| Enabled-MFA sign-in displays Step2 and code field | Pass | Pass |
| Invalid code refused while retaining Step2 | Pass | Pass |
| Fresh unused current code completes sign-in to Upload | Pass | Pass |
| Normal sign-out | Pass | Pass |

Mobile additionally selected the compact optional checkbox at signup, verified that Finish signup remained disabled after email/key confirmation while the chosen authenticator was unproved, then explicitly deferred that optional choice and finished signup. Later prompt enrollment established MFA. Mobile Step2 Back returned to the password-first screen without the factor field, followed by a successful new two-step attempt. No completed signup with the authenticator opt-in still selected is claimed by that defer-choice test.

All recorded authentication views have no horizontal overflow. Console error entries0. Screenshots, per-actor action receipts and sanitized view records are under accelerated-launch/service/out/auth-flow-qa-20261017-r1. Setup seeds and recovery keys were kept privately rather than included in the screenshots after confirmation. A full-page capture exhibited a hidden fixed skip-link compositing artifact; a settled390px viewport capture and DOM measurement verified the unfocused skip link remained above the viewport and final signed-out rendering was clear. No code change was made for a screenshot artifact.

Cleanup limitation observed: Privacy and deletion displays “Open a case first” for an account with no reports and exposes no account-deletion action there. This is outside the requested authentication changes and remains unfixed. Both new accounts were instead removed using the normal authenticated DELETE /api/account endpoint after a fresh valid MFA login and exact new actor ID/email verification; both had zero reports/files, returned deleted:true and immediately refused the former session with401. No subscription or payment cleanup was needed.

The first desktop cleanup helper stopped after a successful sign-in because it incorrectly expected201 rather than the application's documented200. Its failed intent remains preserved; no DELETE had been dispatched. A corrected separately named helper used a fresh unused TOTP counter and a new intent; normal deletion removed that actor and its sessions. This is a test-helper expectation failure, not an application authentication failure or a replay of the original deletion. The initial finalizer also refused an overbroad raw-state equality assumption; the later exact before-mutation binding below records the measured boundary instead.

Preservation proof: earliest whole observationF28650CF754E0BE66FDACDCCBE8C9FC4F5E49AE162B2AF058A40DDE826B53C2C and final0AB940D03F5E8BFF3C211314B44293CDB4CFDD124B7433FD81B7C2DD4F1BCE97 retain the entire production site/process/boot/unit definitions exactly. All43 original staging accounts and every original non-billing table,148 blobs, private/security/signed files, environment, runtime and process are exact. Exactly one oldest unowned REJECTED billing diagnostic rotated under the unchanged50-entry cap during local preparation before the first browser signup. Removed/added records are explicitly null for account_id, entitlement_id and effect; all15 business billing rows remain exact. The removed diagnostic's semantics are hash-bound to retained prior metadata. Producer is unattributed; no earliest-baseline raw-state byte equality is claimed across that rotation.

Crucially, the new ordered read00263DE3A3ADFEB2C1F4B84100691E4C774D9FB6DEF20C4D20C3AA488C3F3195 completed before the first signup intent and after that diagnostic rotation. Its entire staging raw-state SHA AD133A27DCC1EDCFB6F9C5437239B71E8D7FF471B5A378E2292F7B325BAE765F equals the final state after both QA accounts were deleted. Thus this campaign leaves zero owned application-state delta. Final staging inventory is43 accounts/718 non-session rows/148 blobs; production5/338/109. Both owned IDs are independently absent. No browser sessions remain for the new actors; viewport reset and owned tab closure completed.

CompletionAA11A5BFF34AA2DC7F5E9E65EB8846A518219AD4EBE4A10C47D98F9F817CB3E3, preservation-bindings.json, both cleanup-r2 receipts and credential-cleanup.json retain separate evidence. Revoked passwords, seeds, recovery keys and email codes were removed from the new local private QA capsule after verified deletion; audit metadata/screenshots remain, as do the transactional test confirmation messages in the owned mailbox. No mailbox mutation or backup-erasure claim is made. Existing dirty files and earlier release/QA evidence remain preserved.
