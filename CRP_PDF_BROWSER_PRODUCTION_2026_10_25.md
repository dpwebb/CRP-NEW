# E208 production release — final report

**GO for the completed owner-authorized production release.** The tested build `crp-v1-e2084558545d401e`, source `21cea4fd091a22d34600b7ad4993c14ab45179a8`, went live on October 25, 2026 at 10:31:38.134 UTC. Its 193 shipped files, original package and accepted regression results remain unchanged.

## Verification

- Original full regression: **20,324 passed, 0 failed, 0 skipped**, across 200 sections and 420 tested source files. It was not repeated for publication.
- Strict staging acceptance: **30 gates, 123 criteria and all 46 required predicates passed**. Twelve genuine Sandbox plan/currency cells, upgrade credit and cancellation passed; all 13 new fictional accounts were cleaned up.
- The seven-page fictional packet was edited, reviewed, approved and downloaded through the browser. Preview, download and print-endpoint bytes matched. The unchanged verifier also passed independently on Linux.
- Production passed **42 public checks** and anonymous desktop/mobile homepage and sign-in checks. No production credentials were submitted.
- The whole stopped snapshot covered **227 entries, 222 files and 5 directories**, with bytes, permissions and ownership verified. Snapshot metadata was independently retrieved. Installed pre/post encrypted backups passed authenticated decryption, complete manifest and owner/security HMAC checks.
- Independent review returned **GO**, with no production-release blocker.

## Customer data and configuration

All original production **7 accounts, 340 business rows and 109 blobs**, raw primary state, security records and signed owner authority are preserved. Existing configuration is unchanged except the required build line. The only private filesystem lifecycle differences are `store.lock` and three verified restricted writer records.

Cleaned staging retains its original **66 accounts, 930 business rows and 198 blobs**. Exactly 31 oldest-prefix unowned diagnostic replacements are separately accounted for; original raw staging state equality is not claimed. Mail business tables/configuration and the current Affiliate images and four environment files are preserved. No real mail, live charge, real-consumer login/MFA, provider switch or shared reboot was performed.

## Evidence and limits

The [machine-readable summary](docs/go-nogo/2026-10-25-production/results-summary.json) records the outcome. The [sanitized evidence references](docs/go-nogo/2026-10-25-production/evidence-references.json) bind 42 retained records by SHA-256; all were rehashed locally with zero mismatches before publication. Raw evidence remains local and is not included in this commit.

Credentials, private QA artifacts, raw snapshots, backup archives/identities and original autofilled sign-in screenshots are excluded. Cleared replacement sign-in views were checked without submitting credentials. Removed staging Mail nonces are consistent with native expiry, but their original deadlines were not independently captured.

Physical printing/native print-dialog success and original private-report capture fidelity remain unclaimed. Owner-authorized fictional substitutes remain explicitly scoped. This GO concerns the completed exact production release; the existing `launch_ready:false` flag is unchanged.

This publication changes documentation only. It does not regenerate a manifest/package, repeat tests, invoke an old operation, deploy, or change production.
