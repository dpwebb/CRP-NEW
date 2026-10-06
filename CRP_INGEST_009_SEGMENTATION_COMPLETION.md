# Combined-bureau ingestion — October 3, 2026

## Delivered on staging

Build `crp-wizard-ee6158243e6f51a1` keeps each general-report segment's bureau, reference date and date convention with its own records. Account assembly starts anew at a genuine bureau-report boundary. Statutory comparisons and general factual checks use each record's own segment date; assembly preserves that association across files rather than replacing it with the file-wide date.

Rights/contact notices do not become report boundaries. Ambiguous multi-bureau headings withhold the reference-date association. Conflicting genuine report dates within one segment remain unresolved. Repeated same-bureau headers with the same printed date can remain one report; a dateless continuation additionally requires a printed continuation marker and adjacent pages. Cross-file continuation requires adjacent files, the same known bureau and compatible report dates.

## Measured results

The same adverse event printed in two bureau sections with reference dates June 12, 2020 and June 12, 2026 produced respectively `PERIOD_NOT_EXCEEDED` and `PERIOD_EXCEEDED`. Conflicting dates and ambiguous headings produced no arithmetic conclusion and no legal finding.

On the final served build, three newly uploaded native-text synthetic PDFs passed upload (201), assessment (201), result viewing and legitimately purchased download (200). The actual download contained each observed result's explanation, including the withheld-comparison explanations. A fresh case-bound Stripe sandbox Checkout was completed in Chrome; no manual entitlement or live charge was used. Chrome also displayed the two distinct date comparisons on the mixed report. These are measured synthetic examples, not universal parsing or bureau-authenticity proof.

Evidence: `SOURCE_CAPTURES/INGEST-009-COMPLETION/deployed-evidence-final.json`, `frozen-expected-final.json`, `local-acceptance-evidence-final.json`, `accepted-gate-evidence-final.json`, and `mixed-report-browser.png`.

The full regression pass recorded 5,350 assertions, zero failures/skips. Final safeguards received focused verification: 29 segmentation/related ingestion assertions and 66 multi-file assertions. The last dateless-continuation safeguard was added after the full run and was then covered by focused tests and final deployment acceptance; it is not represented as having a second full-suite run.

## Deployment and gate

61 runtime files were transferred and re-hashed remotely with zero mismatches. The service is active; final build identity was checked through public HTTPS health. Final data snapshot: `/opt/crp-wizard-staging/backups/pre-accept010-completion-20261003-171415`. Immediate rollback release: `crp-wizard-90a88209c9a5e3fb`; the pre-batch release `crp-wizard-628b2904cffb48fe` is also retained.

The strict release evidence validator passes both required GAP-INGEST-009 criteria, `bureau_segmentation` and `end_to_end_journey`, against the final build. Previous evidence was preserved before updating the active gate record. GAP-INGEST-009 passes; 24 other current-target launch checks still fail. This includes obsolete or missing acceptance evidence as well as unfinished capabilities; the count is not a count of missing features. Public launch remains blocked.

## Boundaries and follow-ups

Production, test-only billing configuration, the admitted legal corpus and finding permissions were not changed. The feature conservatively identifies explicit headings; unfamiliar or ambiguous layouts can remain unresolved.

During browser inspection, switching accounts left the prior account's case list on screen until “Reload my cases” was clicked. Access was correctly refused. This UI refresh issue remains for the existing consumer-experience work; no isolation bypass occurred. The results also show incomplete evidence labels for general records, already within the finding-provenance/results blockers. Neither issue is certified complete here.
