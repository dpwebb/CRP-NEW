# B5-STAGING-UI-001 — reference wizard layout deployed

Owner instruction: bring the staging UI closer to the reference wizard. Executed directly in `C:\CRP-NEW` and deployed only to `https://staging.creditregulatorpro.com/`.

## Result

The service now uses the saved reference wizard's dark green sidebar, branded lime mark, hero heading, current-step progress, white primary card and right-side evidence panel. Mobile uses a compact six-step navigation grid and one content column. No external font or asset requests were added.

The large warning paragraph is replaced by a short staging/test-payment notice. All five presentation boundaries remain in an expandable disclosure, with the current GB limitation stated in its summary. Jurisdiction-specific support information and existing pricing/access checks remain in the working journey. Progress describes the selected step, not a completed case.

Exactly three runtime files changed: `accelerated-launch/service/ui/index.html`, `ui/style.css`, and `ui/app.js`. Account, billing, assessment, report, authorization and storage code is unchanged. Existing element IDs and event handlers remain; steps now have numbered sidebar styling and breadcrumb/progress updates.

## Release and validation

- Prior staging build: `crp-wizard-ef04486655ae2e2f`, retained for rollback.
- Current build: `crp-wizard-f22bc79f775264dc`.
- Composite digest: `f22bc79f775264dcc7a817bce16d8e39662257b4a68e93456509cdff932d2a60`.
- All 49 transferred files re-hashed on the VPS; only the three UI files differ from the previous release.
- Full regression: 4,718 assertions passed, zero failed/skipped.
- Chrome local verification: disposable account creation reached jurisdiction selection; sidebar, breadcrumb and progress reflected real state.
- Chrome public staging: new layout rendered; step 4 navigation set `aria-valuenow=4`; signed-out result access stayed blocked; keyboard activation revealed supported-format limits.
- Mobile staging at 390 by 844: content width 375 pixels, no horizontal overflow, six steps visible. Viewport reset after verification.
- Public HTTPS health reports the current build, staging deployment, test billing and launch readiness false.
- Staging stopped for a data snapshot, then release symlink/build ID updated and service restarted. Router, billing configuration and data directory preserved. No new payment or webhook resource created in this update.

Evidence: `SOURCE_CAPTURES/B5-STAGING-UI-001/{build-manifest.json,desktop.png,mobile.png}` and the new runtime bundle. The first deployment's root manifest was restored from its prior bundle after using the existing builder; new manifest/bundle reside in this UI order's directory.

The local preview server was stopped through its execution session. Automatic approval review rejected the combined temporary preview cleanup command with `blocked by policy`; the disposable local account store remains intact at `C:\Users\webbd\AppData\Local\Temp\crp-ui-preview-fdb7ef615017410f85f3e35f06588ef5`. This is not staging data.

## Rollback and boundaries

Stop the staging service, repoint `/opt/crp-wizard-staging/current` to its retained prior release, restore the corresponding `CRP_BUILD_ID` in the host-only environment and restart. No state schema changed. Pre-update snapshot: `/opt/crp-wizard-staging/backups/pre-ui-20261002`.

Production was not changed. Staging remains test-only. Live billing, current GB format evidence and validated production cutover remain separate. Interior design comparison used the saved local reference; its live authenticated interior was not fully inspected.
