# Creative Studio withdrawn from staging unified admin

Completed under the owner's explicit staging-only instruction. All four Studio sections (Creative Studio, review queue, usage limits and AI design drafts) are absent from desktop/mobile navigation. The authenticated unified-admin catalog omits every Studio read/action; all16 retained read/export/action routes refuse with404 before native Studio dispatch. Other administration and primary MFA/unlock/SSO remain active.

## Frozen staging identity

- Operation: `family-studio-withdraw-db7ab4a9-fa84-4eb9-90f0-b388fc844bdf`.
- Family release: `crp-family-21c069c3f9f8a3531b8a`, source `5fe6f54814385130928f1611e59b049f4cade645`,63 files.
- Manifest: `34e911ae68ef9095c05257c54126ee06c59627392232fa9b4ecf32c1c0e4f8f5`.
- Staging Family configuration SHA: `8632fbd8077391212ced359cf85f0422c7f7d963b06d524d4e02ced134982c64`. Only the logical `creativeStudio:false` setting was added; permissions, bindings, SSO, clients and all other settings are unchanged.
- Retained source/config rollback: previous Family release `crp-family-27db617ea1529cfd0c71` and authenticated pre-release configuration. Rollback never restores native databases.

Studio source, catalog definitions, imagery, drafts and history remain preserved. The native Affiliate service was not deployed or reconfigured; this withdrawal concerns its unified-admin access. Reopening remains subject to the owner's three-month production operating hold and fresh approval. Existing production defaults and runtime were not changed.

## Verification

Syntax passed; Windows55 tests passed with5 Linux-only skips. All60 Linux tests passed with zero skips, including kernel-lock recovery and new exhaustive disabled-feature dispatch/catalog tests. Genuine hosted controlled-QA primary password/MFA sign-in and a separate fresh administration unlock passed. All three apps reported Access verified without another Affiliate/Mail login.33 non-Studio authenticated reads passed, as did all16 Studio refusals. Desktop Consumer accounts, Affiliate partners and Mail orders loaded;390px navigation has no Studio sections or horizontal overflow. Normal logout was confirmed.62 public asset/anonymous-refusal/retired-admin redirect/partner-staff entry checks passed; post-backup health and exact JS/CSS hashes passed.

Before activation and after acceptance, the complete Family store, protected configuration, unit, router and release manifest were captured while only Family staging was stopped. Both eight-file whole snapshots were encrypted/authenticated, recovered on the VPS, transferred to the protected desktop, independently authenticated and inventory-checked there. Both four-file SSO/HMAC backups recovered independently. Final native Consumer journal259 entries/audit199 events passed read-only HMAC verification. Recovery keys remain outside Git.

Final custody proves unchanged Consumer/Mail PIDs and source, Affiliate container/image/environment, native configurations, all Affiliate tables/sequences (including all Studio drafts and artwork), and Mail business rows. Native worker heartbeat advancement is ordinary runtime activity, not raw SQLite byte equality. Consumer business rows/other accounts/blobs remain exact; its controlled QA factor counter, six appended signed journal records and exactly five native auth audit events are separately bounded. Those events are unlock, lock, denied unlock, unlock and lock, all for the same fictional QA account. No real-owner credential/security change, new creative/job, partner activation, provider/grant change, payment or mailing occurred. Family store changes are append-only authentication/read audit plus the verified PID text in the persistent kernel lock after its own restarts; the lock inode was never unlinked.

Production sources, configurations, service identities/PIDs, complete Consumer/Family private inventories, Affiliate table/sequence fingerprints and normalized Mail business-state fingerprints remain exact to this release's fresh baseline. No production service was restarted or deployed. No source push was performed.

## Evidence and retained refusals

Evidence: `family-admin/.local/evidence/family-studio-withdraw-db7ab4a9-fa84-4eb9-90f0-b388fc844bdf/`, including Linux/preflight, pre/post whole and desktop recovery, installed provenance, authenticated acceptance,62 public checks, desktop/mobile screenshots, final service checks, native HMAC and `final-preservation-r3.json`.

Retain the inaccessible first Linux candidate, first backup's root-versus-copied-lock-owner refusal, pre-activation diagnostic-PID equality refusal, and initial preservation comparators that omitted the controlled QA denied-unlock event. Corrected independently named operators verify the actual ownership, persistent-lock PID lifecycle and exact own-QA audit sequence. None cleared a lock, restored a database, replayed a consumed operation or broadened authorization. Preserve every package, backup and predecessor; do not regenerate this frozen release for documentation closure.
