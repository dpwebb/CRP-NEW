# B5-PREFLIGHT-002 — Deployment package verification

This records what the proposed Linux package contains, and the precise portability blockers. No Linux
environment is available here, so portability is NOT declared from require-tracing alone; the blockers below
are recorded as untested prerequisites.

## 1. Runtime file set (require-traced, 44 files + data + UI)

A require-trace from `server.cjs` resolves 44 local modules across `accelerated-launch/service`,
`accelerated-launch/adapters`, `accelerated-launch/jurisdiction-router.cjs`, and
`internal-validation/ca-ns-last-payment-six-year`, plus two data files read at runtime
(`launch-matrix.json`, `consumer-wizard/dist/jurisdiction-data.js`) and the served `service/ui/*`. No Node
built-in is missing and no external npm dependency exists. See `CRP_B5_PREFLIGHT_RELEASE_PREPARATION.md` §2.

## 2. Portability blockers (must be corrected or re-pinned before a Linux deploy)

| # | Blocker | File / line | Effect on Linux | Correction |
| --- | --- | --- | --- | --- |
| 1 | Hardcoded Windows root `const ROOT = 'C:\CRP-NEW'` | `internal-validation/ca-ns-last-payment-six-year/document-model.cjs:23`, `accelerated-launch/service/format-families/tu-ca-consumer.cjs:819` | the PROD-003 register is read through this path; on Linux it does not resolve, so the CA Equifax (`PR-01`) exact-specimen admission and the TransUnion (`FAM-TU-CA-CONSUMER`) evidence pointer cannot be read | make ROOT configurable (`CRP_SOURCE_CAPTURES_DIR`) or resolve relative to the package; bundle `SOURCE_CAPTURES/PROD-003/report_representation_register.json` |
| 2 | Machine-specific specimen paths | PROD-003 register `absolute_path_outside_this_repository` | the pinned Equifax/TransUnion specimens live at Windows absolute paths; they must be re-pinned on the host | re-record the specimen absolute path + digest on the Linux host, keep the same digests |
| 3 | External PDF/OCR binaries not bundled | `document-model.cjs` (`pdfinfo`/`pdftotext`), `ocr/local-ocr.cjs` (`tesseract`, `pdftoppm`, `pdfinfo`) | the US consumer format needs OCR; PDF reading needs poppler | install `poppler-utils` + `tesseract-ocr` + `eng.traineddata` on the host, or set `CRP_TESSERACT_EXE` / `CRP_TESSDATA_DIR` |
| 4 | Windows-only OCR fallback paths | `ocr/local-ocr.cjs:55-60` | benign: the resolver falls back to the bare binary name via PATH | no change required if binaries are on PATH; the Windows candidates are simply skipped |

## 3. Items verified correct (no change required)

- **Secret-name config only** — `deploy/production.env.example` names every variable and supplies no value;
  `release-check.cjs` asserts no secret-shaped value and no test-adapter name.
- **Private storage outside public assets/bundles** — `private-store.cjs` refuses any data directory inside the
  repository; `CRP_LOCAL_SERVICE_DATA` is a separate durable path; blobs are keyed by internal id.
- **Single-writer, permissions, restart** — one writer per data directory (lock file, stale-lock takeover),
  atomic writes (temp + rename), mode 0600 blobs, `state.json.bak`, version check, lapsed-session sweep on start.
- **Backup/restore compatible with state v3 + blobs** — the data directory is the unit of backup; `store-diagnostic.cjs`
  validates state version ≤ 3 and refuses a non-empty directory missing its index.
- **Health check that does not expose consumer data** — the release check and `store-diagnostic.cjs` report only
  counts, version and fixed reason codes; no report text, identifier or path reaches the log sink.

## 4. Conclusion

The proposed package is **nearly portable** but has **two real blockers** for the Canadian presentations
(hardcoded Windows root + machine-specific specimen paths) and **one system dependency** (poppler + tesseract)
that must be installed on the Linux host. The AU/GB/US structural families embed their digests as constants and
do not read Windows paths at runtime. Portability is **not** validated in an isolated Linux environment here;
that remains an untested prerequisite.
