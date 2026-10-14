# CRP consumer-journey service

Current local operational work uses the isolated codex/remaining-operational-gaps-20261013 branch. Read the root CRP_OPERATIONAL_REVIEW_2026_10_13.md for the exact local build, account preservation, verification and remaining gaps. Main C:\CRP-NEW is a preserved older checkpoint, not the running local source.

The existing enhanced local service is at http://127.0.0.1:8890/. It uses the established private account store outside the repository. Preserve its data directory, account credentials and full-access entitlement when restarting or testing; connection metadata is recorded privately under the operational-hardening remaining-verification directory. Secrets and report bytes never belong in Git.

For a new isolated development store, the normal entry point is:

    node accelerated-launch/service/server.cjs

Its default listener is http://127.0.0.1:8787/. Configure CRP_LOCAL_SERVICE_PORT and CRP_LOCAL_SERVICE_DATA explicitly for a different private store. The current full-access account runtime uses its existing private launcher and data directory, rather than these fresh-store defaults.

## Current architecture and controls

One Node HTTP process owns one processing worker and one private-store writer. The parent serves liveness independently; a bounded queue and total response deadline protect processing. Persisted state and opaque blobs are private, flushed and atomically replaced, with backup recovery and continuing storage readiness. Process identity protects writer locks. Existing account and session boundaries, request Origin/JSON enforcement, secure hosted cookies and entitlement checks remain enforced.

The consumer path is upload, supported issue assessment, consumer selection, review/approval and packet download. The packet contains the consumer letter and selected evidence/supporting copies. Bureau-specific forms and their generation are retired. Saved results and prior approvals retain their history; obsolete eligibility flags cannot restore retired findings or authorize changed packet bytes.

The active common-error checklist is derived from its current registry; retired review defaults are excluded. Every issue still needs material source-linked evidence. Supported general intake and representative corpus proofs do not certify every modern dedicated bureau layout or arbitrary reporting requirements.

Stripe integration supports configured test/live environments and continuing server-side entitlements. The named local test runtime deliberately has no connected payment provider and preserves its existing full-access grant. Hosted billing status, prices and purchases require exact-build/configuration evidence; a local synthetic receipt does not establish a live provider result.

## Verification

    node accelerated-launch/service/tests/run-tests.cjs

The full runner executes all current product sections, including real local browser and regional controls. It writes current-regression-evidence.json and B2/B3/B4 evidence under out/. Full receipts identify tested source hashes, completed/unrun sections, source drift, failures and skips. Focused selections use a separate, new receipt path:

    node accelerated-launch/service/tests/run-tests.cjs fx-consumer-issue-precision --receipt=/absolute/private/new-receipt.json

Implementation closure, staging acceptance and production readiness are separate statuses. Follow the root CRP_OWNER_CHANGE_AWARE_RELEASE_PROCESS_001.md and deploy/CHANGE_AWARE_RELEASE.md for affected checks, unchanged-proof continuity, committed-byte packaging and guarded release operations. Every staging or production deployment needs its own owner authorization. This cleanup authorizes neither.

## Operations and history

/api/health reports liveness and build identity; /api/ready reports current storage/processing readiness. Neither establishes release acceptance. The existing VPS operational monitor checks local operations; independent Google Cloud uptime checks continue outside that VPS and send outage/recovery alerts to the confirmed admin mailbox. Monitor credentials remain private and are validated before probing/delivery.

HISTORICAL_DEVELOPMENT_LEDGER.md preserves the former README's B2–B6 development statements and receipts in their original scope. Historical no-host, no-provider and earlier pricing statements are not current operating instructions. Retired form sources/templates remain recoverable from Git commit 0e61c5a and the existing retirement proof archives; they are no longer runtime modules. Shared PDF/font libraries and legacy saved-state compatibility remain where live packet/account paths use them.
