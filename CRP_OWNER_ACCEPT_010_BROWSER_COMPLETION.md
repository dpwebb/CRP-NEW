# OWNER-ACCEPT-010 browser completion — October 3, 2026

## Delivered

Staging serves `crp-wizard-628b2904cffb48fe` (61 runtime files; zero remote digest mismatches). Stripe remains test mode, public health reports `launch_ready: false`, and production was not changed.

1. `SOURCE_CAPTURES/ACCEPT-010/open-fdt-checkout-handoff.cjs` now sends `case_id` when preparing the one-off checkout. The omitted binding caused a successful sandbox payment to permit uploads but leave the report download unpurchased. The previous failed attempt and the correctly case-bound sandbox checkout/download are preserved under ACCEPT-010. No manual entitlement was granted.
2. Clarification save reloads the explicitly selected result-specific view, preserving the assessment being shown.
3. The result selector displays that result's actual ID and timestamp; it no longer labels an older selected result “Latest.”

## Measured acceptance

Chrome selected a non-latest result, saved `I_DONT_KNOW` for CREDITOR A and `SKIP` for CREDITOR B, and stayed on `res_1886441bac6634e8eb52`. Both stored answers are separate `CONSUMER_STATEMENT` entries. The rendered assessment SHA-256 before and after is identical: `1d730bef00d705b161d054fc4b2b4ba3a119f85913fd41ab48576bd89b2f0f14`.

On the final served release, the legitimately purchased case download returned 200 and contained: `RECOVERY: 1 fact(s) were recovered by a bounded local OCR pass (never substituted).`

Evidence lives under `SOURCE_CAPTURES/ACCEPT-010-COMPLETION/`: `browser-final-selection.json`, `browser-final-save-passed.png`, `browser-retest-before-final.json`, and `browser-retest-after-final.json`. The earlier pre-key historical-result browser acceptance and unchanged result digest remain in `SOURCE_CAPTURES/ACCEPT-010/independent-browser-completion-20261003.md`.

## Validation and deployment

The full regression suite passed 5,340 assertions with zero failures/skips after the save-path correction. The final selector correction passed the focused consistency section (79 assertions); it was then verified in actual Chrome and via the owned result/download endpoints. Full-suite results and focused scripts are retained in the completion package. No claim is made that the final selector change received a second full-suite run.

Two earlier suite attempts encountered ECONNRESET in concurrent evaluations. The unchanged hardening section passed all 102 assertions with fresh request connections. The test harness now requests `Connection: close` by default, preserving concurrency and every assertion while avoiding reuse of an idle loopback socket during synchronous extraction. Production transport was not changed; no retry was introduced.

Final deployment snapshot: `/opt/crp-wizard-staging/backups/pre-accept010-completion-20261003-164441`. Immediate prior release: `crp-wizard-78a7a3caeefc03bb`; initial release before this continuation: `crp-wizard-b117b12b76a68bc0`. Both remain available. The first activation attempt through a PowerShell text pipe introduced carriage returns and briefly left the staging service inactive; executing the transferred LF script restored the service. Final activation used a transferred LF script, all hashes matched, and the service is active.

## Boundaries

The two browser handoffs and the defects discovered during them are resolved. This does not certify all C1–C6 requirements, close every release blocker, or authorize public launch. Historical blocker evidence was not relabeled to the new build; release-bound criteria still require their actual evidence. No governing legal text, finding permission, private report, production deployment, or live billing configuration was changed.
