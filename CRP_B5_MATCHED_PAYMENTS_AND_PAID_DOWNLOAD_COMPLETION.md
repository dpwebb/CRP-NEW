# B5 matched sandbox payments and paid report delivery — completed

The owner authorized Chrome completion of the prepared Stripe test Checkouts and continued the associated verification. No live transaction, deployment, provider provisioning or legal finding authorization occurred.

## Measured results

- Five intended service-owned Checkout Sessions were completed in Stripe sandbox mode. Independent API retrieval verified each exact session: complete, paid, CAD, livemode false. Three were CAD 5.95 purchases; monthly was CAD 2.00 and annual CAD 73.55. Their exact invoices were paid, with pre-discount subtotals CAD 7.95 and CAD 79.50 and no tax entries. The application runner observed the matching webhook entitlement transitions.
- A separate sandbox CAD 5.95 purchase verified actual report delivery. The captured public PUB-009 historical fictional training sample was uploaded through the local HTTP service and assessed under explicit GB/GB-ENG selection. Three checks ran. The paid report endpoint returned HTTP 200, an attachment header and 3,275 bytes. A repeat returned identical content; a separate unpurchased case returned HTTP 402. This does not establish current GB format support.
- Evidence: `accelerated-launch/service/out/b5-chrome-payment-verification.json` and `b5-paid-download-verification.json`. The latter records content SHA-256 `0ca00e1b6353bc50952f1059509c1787c073c02a9379afd26e5bc8be38df98cd`. No private report or complete event payload was exported.

## Corrections and limits

An earlier test runner collided with an existing listener on port 8787. Its sandbox checkout was completed but excluded from matched proof; its session is identified separately in the exact-session record. Existing service processes were left alone. The intended and supplemental runs used isolated port 8790, their own temporary stores and their own listener processes, which were stopped by their runners. No listener remains on 8790 after completion.

The older `b5-matched-payment-evidence.json` is not the release authority: it was subsequently observed containing an earlier timeout record. It is preserved. The runner's original HTTP 409 claim was a missing-result gate, not a download. The original account-wide invoice list also included unrelated older invoices. Neither is used to pass the corrected release check.

`release-check.cjs` now evaluates the exact five-session payment record plus the separate successful download record. It rejects non-test/unpaid/wrong-currency/duplicate sessions, wrong invoice amounts, a 409 download refusal, a missing digest, zero performed checks, or access to an unpurchased case. The historical/mock refusal tests remain separate from the real sandbox completion evidence.

The preparation runner now accepts a test port via `CRP_MATCHED_PORT`, refuses an already occupied HTTP port, supports supplemental public-sample download verification with `CRP_MATCHED_DOWNLOAD_ONLY=1`, and reports failed runs with a nonzero exit. The supplemental run does not overwrite the original matched-payment record.

## Validation and remaining release conditions

- Full regression suite: 4,718 assertions passed, zero failed or skipped.
- Upgrade credit, Stripe adapter and read-only storage diagnostic focused tests passed.
- New matched-evidence check: valid evidence passes; 12 invalid variants are refused without mutating evidence files.
- Release check: matched test payment/download condition PASSES; runtime path portability PASSES. Overall NOT_LAUNCH_READY, with three blockers: live billing configuration, current GB format evidence, and deployment provenance/release authorization.

The release check was run in the ordinary local environment without production billing configuration; its payment status is therefore NOT_CONFIGURED locally. Existing sandbox verification remains valid and is not a claim of live readiness. No Linux execution was performed here.
