# B4 storage diagnostic correction

Date: 2026-10-01. Owner instruction: proceed with the diagnostic verification and remaining launch dependencies.

## Change

The release diagnostic previously constructed PrivateStore with allowMultiWriter and called integrity. Construction creates directories and changes modes; integrity calls state, which may restore a backup. It was not read-only.

The new store-diagnostic.cjs reads the primary JSON directly and validates its shape/version. It never constructs a store, creates directories, acquires/removes a lock, changes modes, restores a backup or writes state. Error messages contain fixed codes rather than private JSON excerpts. An unreadable index is now launch-blocking. A first-start directory containing only a lock and empty blobs directory remains valid; existing backup/blob content without its index does not.

Focused verification: missing directory, empty directory, initialized scaffolding, valid state with live lock, corrupt primary with valid backup, newer version, malformed collection, primitive state and missing index. File digests, modification times and modes remain unchanged during inspection. Test temporary data is isolated and contains no consumer content.

Changed implementation: release-check.cjs. New implementation: store-diagnostic.cjs. New focused test: tests/test-store-diagnostic.cjs. The release checker still writes its documented diagnostic output only; the storage inspection writes nothing.

## Remaining launch dependencies

The release check continues to report three categories: payment, deployment and current GB format support. No provider or host was provisioned and nothing deployed. Existing rule/finding permissions remain unchanged.

## GB source follow-up

Official sources inspected:

- https://www.transunion.co.uk/consumer/blog/understand-your-credit-report-and-credit-score
- https://www.transunion.co.uk/content/dam/transunion/gb/consumer/collateral/transunion-credit-report-scores-guide.pdf
- https://www.equifax.co.uk/downloads/understanding-your-credit-information-equifax-v2.pdf
- https://www.equifax.co.uk/products/credit/statutory-report

The TransUnion downloadable guide is branded 2026, but explains credit reports and scores rather than furnishing a consumer-report layout specimen. The Equifax guide explains credit information; the statutory product page describes access, including PDF downloads. These observations were obtained through the web tool, not a new byte-pinned capture. None is admitted as current report-format evidence. No account login, identity verification or private report retrieval occurred.

Launch price/currency, payment cadence and existing host/domain were requested from the owner. Secrets must not be pasted into chat.

## Final validation

Full service regression: 4,698 assertions passed, 0 failed, 0 skipped. The new read-only diagnostic suite passed separately. Release check: NOT_LAUNCH_READY, with the same three blocking categories (payment, deployment, current GB format support); no storage failure. No deployment or provisioning occurred.
