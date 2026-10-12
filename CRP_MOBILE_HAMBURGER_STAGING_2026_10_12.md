# Mobile hamburger staging verification — October 12, 2026

Later October 12 provenance clarification: the following result is historical for the named mobile candidate. That tablet-corrected mobile source was subsequently included in the report-concern release now hosted on both environments. The main checkout's preserved CSS matches the earlier `bf44398` local variant, not these hosted bytes. Current provenance and this distinction are recorded in `CRP_WORKSPACE_RECONCILIATION_2026_10_12.md`. No historical proof is expanded by this clarification.

## Current result

Staging VERIFIED for the bounded mobile-navigation change at https://staging.creditregulatorpro.com: `crp-v1-d9a2bfd3f5d73564`, source `c5c5a58b3b1eaeaff19bd8007f9162515d9f8edc`, 147 shipped files, manifest `D9A2BFD3F5D735641D939A45ADE75D244467FC87E3E8CF093162E1CA8CEB5E19`. Source committed and pushed to origin/main. Implementation verified; staging verified; production unchanged at `crp-v1-9799fd768cb7cdfa`. Production acceptance/activation for this menu batch remains separately pending.

## Actual verification and retained scope

The first candidate, source bf443984939c018a9c1fc77537f524f95cc17dda / build crp-v1-bc75dc38c60ec1e9, passed fresh FULL regression: **14,967 passed, 0 failed, 0 skipped**. Guarded staging activation and public-byte smoke passed. Hosted interaction checks passed, but visual inspection found the inherited 230px sidebar width crowding the brand at tablet/landscape widths. That receipt remains historical for its exact source; visual acceptance was not complete.

The one-line CSS correction sets the mobile header width to auto. The change-aware planner selected PRESENTATION mode against the complete passing full regression above. The final source passed fresh affected consumer/security/browser regression: **2,511 passed, 0 failed, 0 skipped**. Its separate hash-bound unchanged-source continuity retains the full regression's original identity. The final candidate was packaged from committed source and activated with the previous-build guard against bc75dc38c60ec1e9. Exact served-byte smoke passed.

Fresh hosted browser checks on d9a2bfd3f5d73564 passed at 320x900, 390x900, 768x900, 1000x900, 844x390 and 1440x900. They verified full-width mobile header, no brand/menu overlap or horizontal overflow, all seven steps/four tools, keyboard opening, Escape focus return, outside dismissal, Upload/Plans navigation and the landing hamburger. Actual fresh fictional signup was verified; the owned fixture was deleted and session revocation checked. Screenshots were visually inspected, including corrected tablet and landscape. The menu scrolls within the landscape viewport.

No assessment, billing or session source changed. No new provider purchase was required or claimed. This is affected staging verification, not new all-30-gate production acceptance. Pending policy/address work and the other two active tasks were excluded and preserved. Production's current symlink was independently checked after final hosted verification and remains 9799fd768cb7cdfa.

## Reproducible commands and evidence

Commands: `release-workflow.cjs plan`, `check`, `package`, `activate staging` and Playwright CLI `run-code --filename`.

Actual receipts in the isolated release checkout under `accelerated-launch/service/out/mobile-staging-2026-10-12/`: `checks/full-regression.json`, `tablet-plan.json`, `tablet-checks/verification.json`, `tablet-checks/focused-regression.json`, `tablet-candidate/package-receipt.json`, `tablet-activation/`, and `tablet-browser.log`. Raw regression receipts remain private ignored artifacts. The initial browser-launch attempt found a closed session; opening the dedicated session resolved it before any fixture creation.

Screenshots: `output/playwright/mobile-staging-2026-10-12/tablet-menu-*.png` and `landing-menu-390.png`. These are fictional, deleted fixture journeys. No remaining material menu defect was found in the verified layouts.
