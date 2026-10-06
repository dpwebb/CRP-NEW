# GAP-INGEST-010 — upload limits and supported containers: completion record

**Current verdict: CLOSED after independent revalidation on `crp-wizard-acca8b714f2f08ae`, October 3, 2026.** The earlier measurements below are historical. Current evidence is in `SOURCE_CAPTURES/INGEST-010-REVALIDATION/`; the original completion record is preserved there as `prior-completion-record.md`.

Revalidation found two real defects: Poppler zero-pads page filenames for longer PDFs, causing a readable 12-page scan to be refused; and jurisdiction redraw cleared the selected region, preventing browser case creation. Both are corrected. The existing 40-page scanned-PDF OCR budget is now disclosed with splitting guidance.

Final full regression: **5,370 passed, zero failed/skipped**. **23 final-release deployed/browser checks passed**, including a 100-page native PDF, readable 12-page scan, eight readable PNG screenshot pages, JPEG, ninth-file refusal, exact 40 MiB account quota followed by refusal, oversized file/image refusal, HEIC/TIFF/ZIP conversion guidance, idempotent retry, and a fresh 100-page upload through assessment, visible results and purchased download. A 41-page scan remains unread under the disclosed OCR budget rather than being reported as complete.

Real Chrome created a case through country/region controls and tested partial upload recovery: one saved/one pending after deliberately aborting the second POST; two saved/zero pending after retry; three requests total; first-file identity preserved. The API lost-receipt test deliberately ignored a successful receipt before repeating the same key. These are controlled simulations, not claims of a physical network outage.

Final staging provenance: **61 files, zero local/remote hash mismatches**, service active, Stripe test mode, `launch_ready:false`. Actual preceding rollback is `crp-wizard-0e828cdb0b3d46fc`; private-data snapshot is `/opt/crp-wizard-staging/backups/pre-accept010-gap-ingest-010-20261003-181515`. See `final-activation.txt`, `representative-staging-evidence.json`, `browser-upload-evidence.json`, `acceptance-verdict.json`, `final-local-regression.json`, and `release-check-final.json` in the revalidation folder. Strict active evidence retains exactly `upload_limits`, `container_handling`, `end_to_end_journey`.

Disposable cases were deleted; the legitimately purchased case was preserved. Its final free slot was used by the fresh paid journey, so future fresh purchased journeys need a newly purchased case. No entitlement was manually granted. Production is unchanged.

These fictional development examples prove container/limits/recovery behavior, not bureau authenticity or universal extraction accuracy. Long-report admission does not establish correct extraction of every account. OCR uncertainty and finding completeness remain separate blockers. Final release check: **20 checks passed, 24 launch-blocking checks failed**, including stale evidence and unfinished requirements. Only GAP-INGEST-010 is closed by this delivery.

---

## Historical completion record (preceding build)

**Verdict: CLOSED.** `GAP-INGEST-010_UPLOAD_LIMITS_AND_CONTAINERS` passes the strict release check with
`evidence is complete, current-release and identity-bound` against the served build
`crp-wizard-5537e00f842eab2b`.

## What the criterion required

> Review and implement realistic upload/image-set limits and supported container policy; provide usable recovery
> for oversized or unsupported legitimate inputs.

Acceptance: representative long/scanned reports and screenshot sets; safe resource/quota enforcement;
supported-type list and clear conversion/splitting guidance; HEIC/TIFF explicitly bounded (never advertised as
supported without tests).

## What changed

The upload experience now matches the backend's existing multi-container support, which the UI previously hid
behind PDF-only copy and a single-file input.

- **UI (`service/ui/app.js`)** — `renderReport` now accepts multiple PDF/PNG/JPEG files in page order, uploads
  each individually with per-file success/failure accounting, offers "Retry pending files" (saved files are never
  silently repeated), clears the pending list, and states the limits and HEIC/TIFF/ZIP conversion guidance before
  upload. The obsolete "only a supported presentation is read" copy was removed.
- **Server (`service/uploads.cjs`)** — upload limits are exposed in one place (`uploadLimits()`): 10 MB/file,
  8 files/case, 40 MB/account, 25 M-pixel / 12,000-px image caps, with `unsupported_containers`
  `HEIC/HEIF/TIFF/ZIP` and `recovery` guidance. An `uploadKey` makes a retry after a lost response idempotent
  (same file id, no duplicate blob, no second quota draw). `validateImageDimensions` enforces the image caps
  before storage. A `receiptFor` helper rebuilds the receipt on retry without re-extraction.
- **Errors (`service/errors.cjs`)** — `FILE_TOO_LARGE` names the 10 MB limit and gives splitting/re-export
  guidance; `UNSUPPORTED_FILE_TYPE`/`UNSUPPORTED_FILE_EXTENSION`/`NOT_A_PDF_CONTAINER` name HEIC/TIFF conversion;
  `IMAGE_DIMENSIONS_TOO_LARGE` is new.

### Reconciliation note
A concurrent process had partially implemented this blocker and left it inconsistent: `FILE_TOO_LARGE` no longer
contained the legacy-parity "10MB limit" string (one failing test), `receiptFor` was referenced but undefined
(latent retry crash), an advertised "40 scanned pages" limit was never enforced, and `NOT_A_PDF_CONTAINER` still
said "not a PDF" while images are supported. Those were corrected here so the whole suite is green.

## Tests

- Full suite: **5,370 assertions passed, 0 failed, 0 skipped** (`node accelerated-launch/service/tests/run-tests.cjs`).
- `h-legacy-parity` green again (25 passed). `k-ui-smoke` exercises the multi-file upload (29 passed).
  `u-hardening` includes a retry-idempotency case: same uploadKey + same bytes returns the same file id with no
  second blob, and a different payload under the same key is refused (108 passed).
- Focused unit script `SOURCE_CAPTURES/INGEST-010-COMPLETION/focused-upload-limits.cjs` → **PASS 25**.

## Deployed staging evidence

Build `crp-wizard-5537e00f842eab2b` deployed to `https://staging.creditregulatorpro.com/` (test mode,
`launch_ready:false`, 61 files verified 0 mismatches, private-data snapshot taken at
`pre-accept010-gap-ingest-010-20261003-175212`, service active). Real HTTP behavior measured on the served
release (recorded in `SOURCE_CAPTURES/INGEST-010-COMPLETION/deployed-evidence.json`):

| Behavior | Measured |
| --- | --- |
| Oversized file | 400 `FILE_TOO_LARGE`, message gives split/re-export recovery |
| HEIC / TIFF / ZIP | 400 `UNSUPPORTED_FILE_TYPE`, message names HEIC/TIFF conversion |
| Long multi-page PDF | 201, container PDF, supported/read |
| Retry same uploadKey+bytes | 201, same file id reused (no duplicate) |
| PNG screenshot set | 201 each, container IMAGE |
| Upload → evaluate → view → purchased download | 201 / 200 / 200, `checks_performed: 7` |

Evidence written to `accelerated-launch/service/out/gap-ingest-010-evidence.json` with the exact required keys
`upload_limits`, `container_handling`, `end_to_end_journey`, validated strict against the target build.

## Remaining limitations

- The per-case 8-file cap and per-account 40 MB quota are proven behaviorally in the local suite and the cap is
  enforced by the same pre-write path the deployed uploads exercise; the deployed run intentionally did not fill
  the shared disposable case to its 8-file cap.
- The screenshot set uses synthetic minimal PNGs: it demonstrates image-container acceptance, not OCR text
  accuracy, which remains GAP-INGEST-003/008 scope.
- Deploying this build re-opens the other blockers' evidence (e.g. GAP-INGEST-001…009) because the strict
  validator binds every blocker to the currently served build; the overall launch-blocking count is therefore
  24 (stale evidence), not 24 new unimplemented features.
