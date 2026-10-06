# Next narrow implementation task — BLOCKER-SUPPORT-001

Continue Credit Regulator Pro in C:\CRP-NEW. Read AGENTS.md, CRP_OWNER_BLOCKER_CLOSURE_POLICY_001.md, CRP_OWNER_CONSUMER_LANGUAGE_IMPERATIVE_001.md and CRP_OWNER_CONSUMER_INCONSISTENCY_RELEASE_BLOCKERS_001.md. Use the latest measured status in CRP_CONSUMER_IMPERATIVES_AND_PRIVACY_COMPLETION.md; older Cline counts are historical.

Advance BLOCKER-SUPPORT-001 independently. Trace existing support surfaces before editing. Required functional criteria: reference, redaction, access and usefulness. The hosted journey remains a separate pending staging criterion.

Implement an account-owned support reference and a useful support-information view that includes only the operational details necessary to identify the problem. Exclude report text, original document names, credentials, private storage paths, internal legal-source identifiers and other-account information. Authenticate support information and enforce ownership on every case/reference access. Do not send messages or upload data to an external support provider.

Add meaningful behavioral tests for an owned reference, consistent useful diagnostics, redaction, unauthenticated refusal and cross-account refusal. Consumer support copy follows the owner imperatives: no legal-advice disclaimers, incomplete-finding explanations or context-only responsibility prompts. Ordinary actionable service errors are permitted.

Write reproducible consumer-support-evidence.json using the shared implementation validator: named passing tests with exact functional criterion coverage, expected/measured results, relevant source hashes and actual behavioral evidence references. Keep staging_verification PENDING; do not claim hosted verification from local tests.

Run the full suite. Refresh existing implementation evidence only after the relevant tests pass; preserve historical captures and failed payment results. Re-run the release checker with the previously reported staging identity only as its evidence comparison target, not as a claim that local changes were deployed. Derive counts from the checker. Update the acceptance register, completion record and next narrow prompt.

Preserve the workspace and the read-only legacy corpus. Keep production, live billing and secrets unchanged. No deployment is required to establish implementation closure under OWNER-CLOSURE-001.
