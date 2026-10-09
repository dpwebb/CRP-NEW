# Final paid packet journey — staging acceptance

**Status: VERIFIED on October 9, 2026. Production release remains OPEN.**

## Exact release

| Item | Measured identity |
|---|---|
| Host | `https://staging.creditregulatorpro.com` |
| Build | `crp-v1-133f36eb9b5dc1eb` |
| Source | `53d31469acb2608834de4a82547933819a43e6e0` |
| Manifest | `133F36EB9B5DC1EB7E5D43E53458A23AC9A45A0563A7965E93234A583353DA43` |
| Package | 125 committed, hash-verified shipped files; archive `46B5F0CCEF26859A07F0CF530F1B3D2E2EB1B68F025B8AFD02464373A7F1C84D` |
| Activated | `2026-10-09T09:31:51.169Z` |
| Billing | Stripe test mode; genuine Sandbox monthly payment, 795 CAD cents |
| Hosted receipt | `accelerated-launch/service/out/staging-paid-packet-2026-10-09/hosted-subscriber-acceptance.json` |
| Receipt SHA-256 | `8741602d6fdfba4712d22f2f3858fbe6e31b4a2e8380ea57460bdad62fcc8e3f` |

The public health and served JavaScript, HTML, CSS and favicon match this release. The previous staging release and a verified restricted 76-file preactivation snapshot are retained. The frozen source-matched local product run remains **13,815 passed / 0 failed / 0 skipped**, 147/147 sections and 17/17 re-derived closure records. This acceptance required no runtime change.

## Actual subscriber journey

Fictional consumer/report inputs, CA-NS, Equifax Canada. Report and support-document preparation used the ordinary authenticated upload/evaluation APIs. No findings, extraction or paid entitlement were injected. Chrome's local-file upload permission was unavailable; browser upload is not claimed by this acceptance.

1. Signed in to the disposable account and paid through actual hosted Stripe Sandbox Checkout. The owned session was complete/paid. Subscriber access came from matching signed `invoice.paid` event **evt_1UOaGhKCM3e4JIjWfjxaxWEi** for invoice **in_1UOaGcKCM3e4JIjWXvzdwlfq**, verified against provider and local owned checkout/entitlement records. No live charge.
2. Chose **FICTIONAL CEDAR BANK** and **FICTIONAL MAPLE CARD**, leaving **FICTIONAL UNSELECTED BANK** unchecked. Saved explicit name parts/contact details through Account and returned to the saved packet. Selected passport, driving licence and dated utility-bill copies, plus the original report copy.
3. Saved the packet and opened the filled Equifax original-form link. Retrieved the actual owned preview PDFs at the same reviewed version and rendered all pages locally. Chrome PDF-viewer automation was unavailable; local rendering, rather than a claimed browser-viewer inspection, supplies the visual review.
4. The letter uses an ordinary business-letter layout and plain first-person requests. The retained Equifax original has filled identity/contact/account fields and selected original checkbox controls. Overflow values/reasons continue on a readable attachment. Both selected account references appear in the same letter/form order; the third account is absent from dispute requests. The whole source report correctly still contains all original entries. Signatures remain blank.
5. Checked the browser review acknowledgement, approved that exact version, and clicked **Download correction packet**. The browser wrote the ZIP to Downloads. Its actual entries and CRCs were checked. Letter and filled-form bytes are identical to the reviewed PDFs. Report and three support-document bytes match their uploaded originals.
6. **Print letter and evidence** opened the owned printable endpoint. Its bytes match the reviewed letter/evidence PDF. The complete ZIP separately contains the forms and selected copies, with instructions to print and sign them.

## Download and print checks

| Downloaded PDF | Pages | Result |
|---|---:|---|
| `01-correspondence.pdf` | 3 | Letter, report evidence and mail instructions; Letter size |
| `ca-equifax-account.pdf` | 6 | Original five-page form plus additional information; Letter size |
| `report-01-current.pdf` | 1 | Unchanged fictional source report; A4 |
| Three selected documents | 3 | Unchanged fictional identity/address copies; A4 |

**Six PDFs, 13 pages.** All PDFs are readable and unencrypted; rendered inspection found no clipping or overlap. Physical printing and bureau submission were not performed. The reviewed/approved version is **ff44363fc6b30470a93b954c0b9dc0a16579c24daa1a9e87220da857c99849b6**. The browser ZIP SHA-256 is **0a03b156424a163b0e5513e89f3c4ab1267d819381cb720c109c714c14ca1b8f**.

## Ownership and cleanup

Unsigned preview access returned **401**. Approval and download controls were disabled before saved review/approval. After acceptance, the disposable Stripe subscription was cancelled, the authenticated account deletion removed four uploaded blobs, and its revoked token returned **401** for packet download. The temporary token file was removed. Only fictional acceptance data was used. The unrelated dirty pricing note and score-simulator prototype were preserved.

Retained local evidence includes release/package/activation receipts, provider payment and cleanup receipts, reviewed PDF hashes/template provenance, actual browser ZIP and extracted files, all rendered pages, account cleanup receipt and `approved-packet-browser.png`. These are in the ignored `service/out/staging-paid-packet-2026-10-09` directory; credentials are excluded.

## Release boundary

This closes the requested **representative newest-staging paid packet journey**. It complements supported all-82 local coverage; it does not claim every bureau layout or 82 hosted browser journeys. Current generated local coverage evidence is not manually changed into an aggregate hosted release capability. Live billing/configuration, production capacity, restore/rollback rehearsal, cutover and owner production release authorization remain separate gates. `launch_ready` remains false; production was not changed.
