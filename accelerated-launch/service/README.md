# Local consumer-journey service (OWNER-ALL82-001 / B2, B3 and B4)

This subtree implements the B2 vertical slice, the B3 country/format expansion and the B4 paid-entitlement and
release-hardening batch of `CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md`: **one complete local consumer journey
over shared interfaces**, then **real supported coverage in more than one country**, then **server-side
entitlement enforcement, service hardening and a local release check**. It is not a launch and it does not make
any of the 82 jurisdictions launch-ready. Nothing is transmitted anywhere and nothing has been deployed.

## Start it

```
node accelerated-launch/service/server.cjs
```

Then open `http://127.0.0.1:8787/`. The port is overridable with `CRP_LOCAL_SERVICE_PORT`.

## Service stack decision (recorded once, plan section 6)

**Node.js built-ins only, CommonJS, one local HTTP service started with `node`.**

| Option | Why it was not chosen |
| --- | --- |
| Express/Nest + a build step | B1's verified components (`rule-adapters.cjs`, `evaluation-primitives.cjs`, the CA-NS unit) are dependency-free CommonJS. A framework or transpile step would add infrastructure without reusing anything, which plan section 9 forbids. |
| Prisma + SQLite/Postgres | The legacy backend already owns that stack and is **read-only** here. Standing up a second database to hold one case would be speculative infrastructure. |
| A dependency in `package.json` | This working tree has no root `package.json` and no `node_modules`; introducing a dependency tree changes the environment, not the product. |

Storage is a private on-disk JSON state file plus opaque blob files, written atomically. Passwords are
scrypt-hashed; session tokens are random opaque secrets of which only the SHA-256 is stored.

### The repository-privacy invariant

Report bytes and case blobs are **never** written inside this repository. The private data directory
defaults to `~/.crp-local-service` and `private-store.cjs` **refuses to start** if the resolved data
directory is inside `C:\CRP-NEW`. That is the mechanical form of the CA-NS unit's boundary: *no report
content, identifier or specimen is copied into this repository.*

## Reuse ledger (verified before adoption)

| Reused | From | How it is verified |
| --- | --- | --- |
| `extractFacts`, `admitDocument`, `buildPdfDocumentModel`, `readPinnedPresentationPointer`, `sha256File` | `internal-validation/ca-ns-last-payment-six-year/*.cjs` | Required directly, not copied. Already the module `evaluation-primitives.cjs` (B1) re-exports its calendar arithmetic from. |
| `runAdapter`, `adaptersForRegion`, `listAdapters`, `describeResult`, `emitFinding` | `accelerated-launch/adapters/rule-adapters.cjs` (B1) | Required directly. |
| `selectJurisdiction` | `accelerated-launch/jurisdiction-router.cjs` (B1) | Required directly; the 82-route test still passes. |
| `writeFixture`, `markerLines` (the labelled synthetic PDF writer) | `internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs` | Required directly. B3 writes its lookalike fixtures with it, outside the repository. |
| Upload validation rules (`MAX_FILE_BYTES`, `ALLOWED_MIME_PREFIXES`, extension allowlist, empty-file refusal) | legacy `packages/backend/src/services/reportStore.ts` | Re-implemented as a port and pinned by `tests/sections/h-legacy-parity.cjs`, which reads the legacy source read-only and fails if those values drift. |
| Ownership semantics: 404 for an unknown resource, 403 for another user's resource, jurisdiction from the account/case and never from the file or its name | legacy `middleware/auth.ts` `ownership()`, `scripts/consumer-path-e2e-selftest.js` | Same semantics, pinned by `tests/sections/a-isolation.cjs`. |

The legacy checkout is **not** modified, imported at runtime or built. Nothing under it is executed.

## Run the tests

```
node accelerated-launch/service/tests/run-tests.cjs
```

Nineteen B2/B3 sections plus three B4 sections run against a real loopback listener and a private data directory
outside the repository. The suite writes **three** artifacts, and none rewrites another:
`service/out/b2-evidence.json`, `service/out/b3-evidence.json` and `service/out/b4-evidence.json`.
`build_launch_matrix.py` reads all three.

Full validation order (the first step runs before the catalog, which reads its output):

```
python accelerated-launch/build_rule_catalog.py
python accelerated-launch/build_applicability_records.py
node   accelerated-launch/service/tests/run-tests.cjs
python accelerated-launch/build_launch_matrix.py
node   accelerated-launch/service/tests/run-tests.cjs
node   accelerated-launch/test-router.cjs
node   accelerated-launch/adapters/test-adapters.cjs
node   wizard-check.cjs
```

The B4 release check is a separate, local command that writes one file and makes no network call:

```
node accelerated-launch/service/release-check.cjs   # writes service/out/b4-release-check.json
```

Five sections run the real journey on real public evidence and report `SKIPPED` with an exact reason when the
artifact is not on the machine, rather than substituting a synthetic report: `j-specimen-journey` (the pinned
Canadian specimen), `m-au-journey` (the captured Australian sample), `p-us-consumer-format` (the captured
United States consumer sample), `r-ca-factual-assessment` (the same Canadian specimen, evaluated for all
thirteen Canadian selections) and `s-gb-consumer-format` (the captured United Kingdom consumer report
example). None copies the artifact anywhere.

The United States section needs the authorized **local** OCR engine. It reports `SKIPPED` with the exact reason
— `NO_LOCAL_OCR_ENGINE_IS_PRESENT_ON_THIS_MACHINE` — when Tesseract is absent, and it never falls back to a
network service. Point the build at a differently provisioned host with `CRP_TESSERACT_EXE` and
`CRP_TESSDATA_DIR`; nothing is downloaded or installed by this build.

## What B3 added

### 1. Explicit per-region applicability, and no patterns

`accelerated-launch/adapters/applicability-records.json`, built by `build_applicability_records.py`, replaces
the mechanical `US-*` relation with **one named row per canonical region**. The builder fails loudly on a
wildcard, on a region that is not canonical, on a relation whose region set does not equal its country's
canonical set, and on a bound adapter that does not exist. `rule-adapters.cjs` now resolves a country-wide
relation by *looking the region up*; a region the relation does not name is a mismatch, not a default.

| Relation | Instrument | Instrument class | Regions | Execution |
| --- | --- | --- | --- | --- |
| `AU-PRIVACY-ACT-1988-CTH-CREDIT-REPORTING` | Privacy Act 1988 (Cth), Part IIIA (the recorded s. 20W/20X tables) | Commonwealth statute | 8 | **executable** for two limbs |
| `US-FCRA-15-USC-1681C-COUNTRY-WIDE` | FCRA, 15 U.S.C. § 1681c | Federal statute | 57 | **not executed** |
| `GB-UNITED-KINGDOM-NAMING-AND-REGION-RELATION` | CRAIN retention table | **guidance, not a statute** | 4 | **not executed** |
| `CA-PIPEDA-FEDERAL-RECORDED-COUNTRY-WIDE` | PIPEDA, as the recorded row names it | unresolved | 13 | **not executed** |

Applicability and execution are separate fields, and the record says so: **65 regions carry a confirmed
relation and 8 of them execute a check.** The United States rows are explicit per region, including all six
territories; the one with no recorded source row (`US-UM`) says exactly that, and no instrument is invented
for it or propagated to it from anywhere.

### 2. A second admission path: structure rather than digest

`service/format-families/au-equifax-consumer.cjs` admits the Equifax Australia consumer credit file by a
**structural contract evidenced from the captured public sample `PUB-012`** (its SHA-256 is recorded in the
contract and re-checked in the test). PR-01's digest gate is untouched and still governs the Canadian
specimen: B3 adds an admissions path, it does not relax that one. The family prints two record kinds this
build reads — `Consumer Credit Enquiries` and `Overdue Accounts` — and two it deliberately does not. The
repayment-history grid is graphical, so no cell is read and no rule is bound to it. The
`Consumer Credit Liability Information` records are also **not** read as records: the section and the
account's own `Closed Date` label are printed, but on the captured sample every liability record prints that
label with no value (the sample reports no closed credit provider), so no comparison can be computed from it.
The recorded s. 20W item 1 rule is owner-accepted and available; `applicability-records.json` records why it
is held rather than bound, and the reason names the exact work that would close it.

### 3. Two more observation-only checks, in eight more regions

| Adapter | Recorded rule | Start | Ceiling |
| --- | --- | --- | --- |
| `AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y` | Privacy Act 1988 (Cth), s. 20W item 3 | the printed `Enquiry Date` on the enquiry's own record | observation |
| `AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y` | Privacy Act 1988 (Cth), s. 20W item 4 | the printed `Original Listing > Date` on the overdue account's own record | observation |

Each adapter declares the record kind it is written for, so an enquiry check never runs on an overdue account
or the reverse. The report's own `Date will be Deleted` is extracted and reported **beside** the comparison as
the report's statement; it is never substituted for the rule's arithmetic.


### 4. Shared infrastructure exercised across all 82 selections, recorded separately

`o-all82-infrastructure.cjs` opens a case for every canonical region and puts it through the same account,
ownership, upload-gate, evaluation-boundary, status and deletion path, then records what each region produced.
Sixty-one regions refuse an upload before anything is stored because no presentation is registered for their
market; twenty-one store the file, measure it and refuse it at the format gate. Every region reports its own
outcome. **This is infrastructure validation and nothing else** — it says nothing about report support and it
makes no region launch ready.

### 5. What the consumer sees before uploading

`GET /api/jurisdictions` carries, per region, the supported format family, how many checks would run and a
plain-language availability sentence, because plan section 2 requires a regional check's limitations to be
visible before purchase and upload. The service refuses to report a check count it has not earned: a check the
runner refuses is reported as a check that did not run, and `checks_performed` counts only checks that ran.

### 6. The United States consumer disclosure, read by authorized local OCR

The captured official consumer-channel artifact `PUB-001` is one page, 954 x 5669 points, carrying **one
embedded image and no text layer at all**. It is not a permanent blocker and it is not a paid service:

* `service/ocr/local-ocr.cjs` drives two programs already installed on the host — poppler `pdftoppm` to
  rasterise one page, and `tesseract` to read it — and returns every line with its **page coordinates in
  points** and its mean confidence. On `PUB-001` that is 264 lines at mean confidence 92.9, and the reading
  reproduces the artifact's own "Important messages" paragraph verbatim.
* The **raster is written to the operating system's temporary directory and deleted in a `finally` block**.
  No report content is retained, and nothing inside the repository is written.
* **UNAVAILABILITY IS NOT ABSENCE.** With no engine, or no language data, or no rasteriser, the reader returns
  `available: false` with the exact command it tried and the exact failure text. The family then refuses the
  document and reports **zero records** — a refusal can never be read as an empty report.
* **A LOW-CONFIDENCE READING IS UNRESOLVED, NOT GUESSED.** The recorded floor is 70. In the captured artifact
  the account's `Date of status` reads `06/2015` at a confidence below it, and `First reported` reads
  `42/2013`, which is not a possible month. Both are preserved with their raw reading beside an
  `EXTRACTION_UNRESOLVED` status. Neither is repaired from a neighbouring field.
* **AN UNREAD CELL IS NOT EVIDENCE.** The account-history payment grid is graphical. The reader takes no cell
  from it. It reads only the report's own printed annotation beside the grid.

`service/format-families/us-experian-consumer.cjs` is the adapter. It admits by an evidenced structural
contract — five named consumer sections, a printed account header row carrying the presentation's own five
column labels, and the consumer-document header chrome — and it extracts three record kinds by **column
anchor**: the header row's own label positions decide which column a word sits in, so a value is never taken
from another column or from the row above its own label. A printed control (`+ Dispute`) is recorded as a
control and never becomes a value; a printed line that belongs to no field is recorded as an unlabelled line
rather than forced into the field above it.

Subscriber and screening artifacts are refused by their own markers — each marker evidenced by its presence in
a captured subscriber artifact and its absence from every line of the consumer artifact.

### 7. A per-record applicability state, shared by every family

`service/applicability.cjs` owns `APPLICABLE` / `NOT_APPLICABLE` / `APPLICABILITY_UNRESOLVED` as four named
rules an adapter declares:

| Rule | Answers |
| --- | --- |
| `PUBLIC_RECORD_ITEM_PRESENT_OR_EXPLICITLY_ABSENT` | does a public-record limb reach this report at all? |
| `ADVERSE_PAYMENT_RATING_ITEM_PRESENT` | does the record print an adverse payment rating and its date? |
| `COLLECTION_OR_CHARGE_OFF_PRESENT` | is an account placed for collection or charged off presented? |
| `LIABILITY_CLOSED_DATE_OR_EXPLICITLY_STATED_STATUS` | does the record print its own closure date, or print a status instead? |

A rule the build does not implement is `APPLICABILITY_UNRESOLVED`, never silently skipped, so a typo cannot
quietly turn a limb off. Each determination carries the printed evidence it decided from, so the consumer
surface can quote the report's own words back.

## The three check classes, and why they are never merged

The owner asked that factual assessment support, policy checks and statutory checks be distinguished. They are
now three classes with three different authorities, three different vocabularies and three different surfaces.

| Class | What it is | What authorizes it | Where it lives | Ceiling |
| --- | --- | --- | --- | --- |
| **Statutory rule comparison** | a recorded legal limb, measured from a recorded start over a recorded period | a recorded source entry, its jurisdiction and its explicit per-region relation | `adapters/rule-adapters.cjs` + `applicability.cjs` | `observation` |
| **Report fact consistency** | two things the report PRINTS, set against each other | nothing but the report itself | `service/factual-checks.cjs` | `observation`, and a difference is never a conclusion |
| **Printed policy observation** | a retention statement the report PRINTS about its own class of entry, set against the date that entry prints | the report's own statement | `service/factual-checks.cjs` | `observation`, labelled `PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING` |

A factual check names no statute, no provision and no legal event, and it measures no legal clock. It cannot:
it is handed a *factual view* — labels, printed tokens and page/line locations — and nothing else. The consumer
surface reports the three classes in separate groups (`observations`, `report_consistency_checks`), the result
set carries `assessment.kinds` and `assessment.performed_by_kind`, and `assessment.plain` says in words what
kind of assessment this is. Sixteen of the eighty-two regions have **no** statutory evaluation recorded, and
their sentence says so rather than reporting a check count they never earned.

### 8. Canada: a factual assessment for all thirteen selections

`service/ca-consumer-file-facts.cjs` reads the admitted Canadian presentation's own printed facts, and
`service/factual-checks.cjs` holds four named Canadian checks over them:

| Check | Compares |
| --- | --- |
| `CA-FACT-SUMMARY-COUNT-VS-ITEMS` | each printed `<Category> (n)` caption against the entries the report prints under that category, or against its own affirmative statement that nothing appears |
| `CA-FACT-ITEM-DATE-AFTER-REPORT-DATE` | every date printed on a collection entry against the date the report gives for itself |
| `CA-FACT-DATE-ORDER-WITHIN-RECORD` | pairs of dates on ONE entry whose printed labels fix their order — `First Delinquency` before `Date Assigned`, `Date Assigned` before `Date Paid/Settled` and `Date Verified` |
| `CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT` | the values one debt carries, on entries that print the SAME member number and account number |

Boundaries, each one tested:

* **A DIFFERENCE IS NOT A CONCLUSION.** A check reports that two printed facts do not agree, and nothing more.
* **A NAME IS NEVER A MATCH.** Two similar creditor names are not the same account. Two entries are the same
  debt only when both print the same member number *and* the same account number, and the identifiers are
  hashed inside the reader and never returned: the view reports the record indexes it matched and no value.
* **TWO VALUES ARE COMPARED ONLY WHEN THEIR MEANINGS MATCH.** `Date Assigned`, the collector and the amount are
  per-placement facts and are never compared across two placements of one debt.
* **AN UNCERTAIN FIELD RESTRICTS ONLY ITS OWN CHECK.** A label printed with no value, a label not printed at
  all, a malformed token and an unread page are four distinct readings, and each is recorded inside the check
  that needed it.
* **IT READS ONLY WHAT IT CAN BIND.** The account sections print a two-column block in which a label and its
  value can fall on different lines, so no label/value binding is attempted there. Those sections contribute
  their own printed item boundary and nothing else.
* **NO PIPEDA PROVISION AND NO NATIONAL RELATION IS INVENTED.** The unresolved country-wide PIPEDA row stays
  unresolved and does not block any of this.

On the real specimen the four checks report **four genuine no-difference results**: nine printed category
counts compared with the entries printed under them, twenty printed dates compared with the report's own date,
the readable date pairs on both collection entries in the order their labels establish, and the one pair of
entries that print the same identifiers agreeing on their first-delinquency date. `CA-NS` keeps its recorded
statutory limb and its withheld bankruptcy limb **unchanged and separate**, and its own sentence says both
classes ran.

### 9. The United Kingdom: what the evidence is, and what it is not

Targeted retrieval was attempted first, and it is recorded exactly: the TransUnion GB consumer route and the
TransUnion GB collateral both answer **HTTP 403**, and the Equifax GB glossary URL answers **HTTP 404**. The
Equifax GB statutory page is served but links to no sample. What remains captured is `PUB-009.pdf` — the
official Experian United Kingdom consumer report example, 9 pages, A4, native text on every page.

**What that artifact is.** An addressed letter headed `Your Credit Report`, from Experian's Consumer Help
Service, with the consumer channel's own section skeleton (`Application details`, `Electoral roll information`,
`Aliases`, `Financial associations`, `Public record information`, `Credit account information`, `Previous
searches`, `Notice of Correction`) and its own item numbering (E/S/L/J/C/P/U/B/F/T). It is the document a
consumer received. It is **not** subscriber material, not a business report and not a bureau-to-lender layout:
all three are refused by their own printed markers, and the predicate that refuses them is a test.

**What that artifact is not.** Its own face states that its information is fictitious and that it is issued
for training and educational purposes, and it is dated 1 June 2007. It therefore evidences the **structure**
of one bureau's GB consumer presentation, and nothing else. It establishes no presentation evidence about any
consumer, it evidences no TransUnion or Equifax GB layout, and **its currency for present-day GB consumer
files is not established**. That vintage is recorded as a named remaining blocker on every GB row rather than
hidden.

**What this build does with it.** `service/format-families/gb-experian-consumer.cjs` admits it, or any
document with the same measured structure, by an evidenced structural contract, and extracts three record
kinds — credit entries, public records and previous searches — under a recorded two-digit-year convention. The
GB checks are:

| Check | Class | Compares |
| --- | --- | --- |
| `GB-FACT-ITEM-DATE-AFTER-REPORT-DATE` | report fact consistency | every printed item date against `Date of report:` |
| `GB-FACT-DATE-ORDER-WITHIN-ITEM` | report fact consistency | `Started` before `Defaulted`/`Settled`, and `Date` before `Discharged`/`End date` |
| `GB-PRINTED-RETENTION-POLICY-ON-ITEM` | printed policy observation | a retention statement the report prints about a class of entry, against the date that entry prints for the event the statement names |

The policy observation is computed **only** for a class whose statement the report itself prints — a policy an
artifact does not state is not a policy this build may read into it. It names no statute, it is labelled
`PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING` in the result, on the consumer surface and in the evidence
record, and the recorded GB relation still binds no adapter and still executes nothing.

On the real artifact: thirteen entries are read, four retention statements are matched verbatim, the policy
observation examines the five entries its own statements apply to and finds all of them inside the period the
report states, the date-order check compares six printed pairs with no difference — and the item-date check
finds **one real difference**: the report is dated `1 June 2007` and it prints `03/12/07` beside `Discharged`
on its first public record. That is reported as a difference between two things the report prints, for the
consumer to check, with no conclusion drawn from it.

## Counting units (why the catalog says 27, 7, 17 and 3)

The three candidate figures come from different units and are reconciled in `launch-matrix.json`
(`executable_rule_candidate_reconciliation`):

| Figure | Unit |
| --- | --- |
| **27** | ledger **row occurrences** classified `EXECUTABLE_RULE_CANDIDATE` — one `source_entry_id` each |
| **7** | candidate **rows** carrying an exact canonical region (CA-NS 2, US-CA 1, US-NY 4) — these sit in **3 distinct regions** |
| **17** | candidate **rows** whose status is `COUNTRY_WIDE_SOURCE` |
| **3** | the remainder: rows recorded as `UK_TO_GB_RECONCILIATION_REQUIRED` |

`7 + 17 + 3 = 27`, and the identity is asserted by the builder. B3 adds a separate, differently-shaped count:
**82 applicability rows** (one per canonical region) across 4 relations, of which **65 are confirmed** and
**65 are executable** — the eight Australian regions (three bound limbs) and the fifty-seven United States
regions (five federal limbs, one of which executes and four of which report an applicability state). Those are
region counts and are never mixed with the row counts above.

The matrix also carries, per region, the limbs **bound to a printed anchor** (`bound_limbs`) and, where any
remain, the limbs **held for an unprinted anchor** (`held_limbs`). Both are derived and asserted against
`region_applicability_index`, so a bound capability or a remaining hold can never be silently dropped: the
matches are checked at build time rather than trusted.

**Working jurisdictions, before and after this batch:** 9 of 82 → **82 of 82**. Every canonical region now
runs a genuine assessment on real evidence, and the matrix names which classes each one ran:

| Class of assessment | Regions |
| --- | --- |
| recorded rule comparison | 66 — the eight Australian, the fifty-seven United States and CA-NS |
| report fact consistency | 17 — the thirteen Canadian and the four British |
| printed policy observation | 4 — the four British |
| **no** statutory evaluation recorded, and the row says so | 16 — twelve Canadian and four British |

Those figures are derived from the B3 evidence, asserted against it at build time, and reported separately.
They are never added into a single "checks" number, because a factual observation is not a statutory
comparison. `launch_ready` is still `0` for all 82: the entitlement path is enforced and the service is hardened,
but **no payment provider is provisioned**, nothing has been deployed, and a working assessment is not a launch.

## What B4 added

### 1. Entitlement is enforced by the SERVICE, and deletion is never gated

`service/entitlement.cjs` owns one question — may this account start paid work? — and answers it from persisted
state on every request. The paid actions are uploading a report, running an assessment, reviewing, requesting a
draft, downloading and the demonstration. Everything else stays open **always**, including **deletion**: a
consumer whose purchase has lapsed can still read what they already have and remove it. That split is the legacy
rule (`canUsePaidProduct` vs `canReadHistorical`), kept deliberately.

There is exactly ONE way an entitlement becomes active: a provider event whose signature verified against a
configured signing secret. The suite drives every shape the owner named at the service and asserts each is
refused: a client flag in the body, a `?paid=true&checkout=success` query, an invented header, the decoy
redirect's own success flag (followed, then retried), and the client's own "confirm" call. A refusal is
`402 ENTITLEMENT_REQUIRED`; a direct request is refused exactly like a page click, because the page has no say.

### 2. The payment provider: an interface, a test adapter, and the exact external dependency

**No provider is integrated, because provider selection and access are not authorized, and a mock payment is not
working billing.** `service/payment-provider.cjs` therefore ships: the interface a provider must satisfy; ONE
complete implementation of it that is explicitly **not a payment** (the test adapter, usable only with two
explicit environment flags, declaring `is_a_working_payment: false` everywhere); and a declared-but-unimplemented
shape for the provider the read-only legacy checkout used — **Stripe**, one USD Price per plan and one webhook
signing secret. The service makes zero outbound calls and holds zero credentials.

The legacy checkout holds Stripe test keys on this machine. **This batch did not open that file**, copied no key
and named none. `release-check.cjs` asserts the production template names the required variables and fills none.

With no provider connected, `POST /api/billing/checkout` is refused with `PAYMENT_PROVIDER_NOT_CONFIGURED` and
the exact external dependency in the body, so the position is visible to an operator rather than buried in a
comment. The plan catalog (595 / 800 / 7499 USD cents, one currency) is read back from the legacy `pricing.ts`
read-only by the suite, so the amounts cannot drift silently.

### 3. Hardening: sessions, storage, concurrency, quotas, restart, one writer

| Area | What is now enforced | Where |
| --- | --- | --- |
| Sessions | absolute lifetime (24h) **and** idle timeout (2h); destroyed on presentation when lapsed; capped per account; a lockout is a WINDOW that ends | `accounts.cjs` |
| Storage | state file written atomically with a kept backup; a corrupt state file is RECOVERED from it, and refused if neither parses; one writer per directory by lock file, with a dead writer's lock taken over | `private-store.cjs` |
| Uploads | per-file limit (10MB, legacy parity), per-case file cap, and a per-account storage cap, all checked BEFORE the first byte is written | `uploads.cjs` |
| Concurrency | 12 concurrent case creations, 6 concurrent uploads to one case and 4 concurrent evaluations, all asserted to lose nothing; blobs written under a temporary name and renamed | suite |
| Interrupted work | a blob no row references, or a `.part` left by a crash, is cleared past a 5-minute grace period; a REFERENCED blob is never swept however old it is | `retention.cjs` |
| Restart | lapsed sessions, lapsed purchases and debris are reconciled before the first request; the recovery is reported, and a state file that cannot be read stops the service instead of answering empty | `app.cjs`, `server.cjs` |

**A real defect was found and fixed by this batch**: failed sign-in counting was thrown away because the refusal
was raised INSIDE the store transaction, so the increment was never written and a lockout could never fire. The
decision is now taken inside the transaction and the refusal thrown after the write. `u-hardening.cjs` asserts
both halves.

### 4. Retention and deletion, published

`GET /api/policy` publishes the policy the code enforces, clause by clause: a report is kept until the consumer
deletes it and nothing expires it on a timer; sessions are destroyed on sign-out, on expiry and on replacement;
purchase rows are kept for the account's life so a refund and a re-sent event can each be settled; no log record
can carry report text, a file name, an email address, an id, a token or a path; nothing of the consumer's
appears in a public asset. The same endpoint publishes the three check classes and what **"no issue found"**
means: only that the checks that ran found none of the things they look for.

Account deletion now takes the purchase records with it. A deletion that left the consumer's own entitlement and
billing rows behind while claiming to have deleted the account would be a lie the state file could be read to
disprove.

### 5. The two presentation gaps: one closed as far as evidence allows, one honestly bounded

**Canada — no family is admissible, and the restriction is shown still biting.** The register that admits the
Canadian presentation records exactly two Canadian consumer artifacts and admits ONE. The second is a real
TransUnion Canada consumer disclosure that the register itself labels
`SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT`. Two specimens from two bureaus with
different sections are two specimens, not a family, so `ca-consumer-format-scope.cjs` records that no Canadian
FORMAT FAMILY is admitted, together with the exact condition that would change it. The suite then presents that
real second Canadian report to the service and asserts it is **refused, not read** — which is what "the hash
restriction was preserved" has to mean if it is to mean anything.

**GB — no present-day support is advertised from a 2007 example.** B4's targeted retrieval of current material
refused at the source (Experian's own resources index 403, a current consumer route 404, TransUnion's 2024
collateral 403). Those attempts are RECORDED as results, not omitted. The one current official GB artifact on
hand is Equifax's statutory-report route page, and it was MEASURED against this contract's own vocabulary: none
of the eight section headings and none of the 22 printed field labels appears as a report label — the handful of
substring hits are all in marketing prose. The family therefore records `present_day_support_claimed: false` and
`currency_validated: false`, and the suite RE-RUNS that measurement against the captured file so the claim stays
reproducible.

### 6. The release check, and the state it reports

`node accelerated-launch/service/release-check.cjs` reads this tree and runs its whole check list, one entry of
which BLOCKS a launch: **`PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING` fails**, because no working payment
provider is connected. On a machine whose `CRP_LOCAL_SERVICE_DATA` points inside the operating system's temporary
area, **`PRIVATE_DATA_DIRECTORY_IS_DURABLE` fails too** — report bytes kept there could be removed by the system.
It exits `NOT_LAUNCH_READY`, names the next release action, records `deployment_performed: false` and
`network_calls_made: 0`, and writes exactly one file. Deployment configuration is prepared in `service/deploy/`
(the complete set of environment NAMES with every secret left empty, and a README stating what a release would
still need) — and **nothing has been deployed**.

## What this build does and does not support

**Supported.**

* **CA-NS** — the pinned Equifax Canada consumer specimen, admitted by digest, with the s. 10(3)(c) six-year
  comparison. The s. 10(3)(e) bankruptcy limb stays **withheld**: its start is a legal event no canonical
  field carries.
* **AU-ACT, AU-NSW, AU-NT, AU-QLD, AU-SA, AU-TAS, AU-VIC, AU-WA** — the Equifax Australia consumer credit
  file, admitted by the evidenced structural contract. On the captured sample that is six executed
  comparisons: one per enquiry and one per overdue account.
  The recorded s. 20W item 1 consumer-credit-liability limb (2 years from the account's termination) is now
  **bound and resolved per record**, not held. The captured sample prints a blank `Closed Date` on every
  liability record, and it prints no status on two of them, so on real evidence that limb reports one record
  **NOT_APPLICABLE** (the record prints its own explicit repayment status, which does not state termination)
  and two **APPLICABILITY_UNRESOLVED** (a blank label alone proves neither state). It reports **no**
  APPLICABLE record on the real sample, and the matrix and the limits say so. The APPLICABLE branch is
  exercised only by synthetic structural tests, which establish no real closed-account presentation evidence.
* **US, all 57 regions** — the Experian United States consumer disclosure, admitted by an evidenced structural
  contract from the captured official consumer-channel artifact `PUB-001`, whose raster text is recovered by
  the authorized **local** OCR reader. Against that artifact: one executed comparison, `FCRA § 605(a)(5)`
  measured seven years from the adverse payment rating the account itself prints, and it is
  `PERIOD_NOT_EXCEEDED`. Four limbs (the three federal public-record limbs and the California bankruptcy limb)
  report **NOT_APPLICABLE** from the report's own printed statement that no public records appear. One limb —
  accounts placed for collection or charged to profit or loss — reports **APPLICABILITY_UNRESOLVED**, because
  this build evidences no presentation of such an account and therefore never asserts that one is or is not
  present. The record carries the case's own counts: 1 executed comparison, 4 not-applicable, 3 unresolved,
  and those three figures never borrow from one another.
* **GB-ENG, GB-NIR, GB-SCT, GB-WLS** — the Experian United Kingdom consumer credit report, admitted by an
  evidenced structural contract from the captured official consumer report example `PUB-009`. Against that
  artifact: thirteen entries read, two report-fact checks and one printed policy observation performed, one
  **real difference** reported (a printed item date later than the report's own date) and two no-difference
  results. **No statutory comparison runs for any GB region**, because the recorded GB relation binds no
  adapter; the national retention relation stays recorded as *guidance, not a statute* and executes nothing.
  The family's currency is not established — the artifact is dated 1 June 2007 — and that vintage is a named
  remaining blocker on every GB row.
* **All 13 Canadian regions** — the same admitted Equifax Canada consumer presentation, with the four factual
  checks of section 8. Twelve of them (everything but `CA-NS`) have **no** recorded statutory limb, so their
  assessment is factual only; their sentences and their matrix rows say so, and nothing is inferred from the
  unresolved country-wide PIPEDA row. **No Canadian consumer-format FAMILY is admitted**, so a different Canadian
  file is refused: the suite presents a real TransUnion Canada consumer report and asserts the refusal.
* **The application boundary, for every one of the 82 selections** — an account per consumer with session
  expiry, case and file ownership, a private store outside the repository, per-file / per-case / per-account
  limits, a single-writer rule, restart recovery and a published retention policy. **The paid steps are refused
  by the SERVICE without a recorded purchase**, and deletion is never gated. No payment provider is connected, so
  nothing can be purchased here at all.

**Not supported, with the exact reason.**

* **GB statutory applicability, all 4 regions** — the recorded instrument is an industry retention notice that
  the ledger itself records as *material, not a statute*. A code conversion from `UK` to `GB` is not proof of
  statutory applicability, so no adapter is bound and the blocker is named rather than papered over. This
  batch did not convert that notice into a statute and did not substitute a limitation period for a retention
  rule. The consumer-format gap is **closed** as far as the captured evidence allows and **bounded** where it
  is not: see section 9 for exactly what `PUB-009` supports and what it does not.
* **CA statutory applicability, the other 12 provinces and territories** — the recorded country-wide row's
  instrument class is inconclusive and its provision is not recorded, so the relation is not established and
  no regional instrument is invented. Their factual assessment does not depend on it and is not blocked by it.
* **Every other United States limb this build cannot anchor** — the four federal limbs without a printed
  anchor and the four exact-region New York limbs are recorded and bound to the presentation; they report an
  APPLICABILITY state instead of a comparison, and none of them is counted as a check performed.
* **Demonstration (synthetic) mode** — labelled `DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT`, stamped as carrying
  no report evidence, and counted as **nothing**.

### Reporting the three states apart

A record carries **extraction status**; a limb carries **applicability**; a comparison carries an **outcome**.
`service/applicability.cjs` owns the second of those, as a registry of named rules an adapter declares. A limb
can be reported `NOT_APPLICABLE`, or `APPLICABILITY_UNRESOLVED`, and in neither case is it a check that ran or
a check that passed. Both appear in their own groups on the consumer surface
(`checks_not_applicable`, `checks_applicability_unresolved`) and in their own buckets in the evaluation, so no
advertised count can absorb them.

The rules are conservative by construction: `NOT_APPLICABLE` comes only from a statement the report prints
about itself, never from a failed read, a missing field or an unread grid; `APPLICABLE` comes only when the
limb's own recorded start is a value the record actually prints; and every other case is
`APPLICABILITY_UNRESOLVED`.

No finding class exists. Every adapter records `finding_allowed: false` and `packet_eligible: false`, so no
response draft is ever produced for a real result and the download interface serves clearly fictional content
instead. Nothing is transmitted anywhere: no bureau contact, no mailing, no payment provider, no model
provider, no telemetry.

## Next batch

**B5 — launch.** B4 closed the application-side work and left a set of evidence and authorization dependencies
rather than an architecture gap. Nothing below is a code task that can be finished by writing more code in this
batch, and none of it is hidden behind a passing test.

* **Billing is implemented but not yet live (the one launch-blocking payment check).** B4-PAY-001 wired the real
  Stripe adapter (`stripe.cjs` on node built-ins), Stripe Checkout Sessions for one-time and recurring CAD
  purchases, the once-only CAD 5.95 upgrade credit (reserve/redeem/release/revoke) and the paid assessment-report
  download. Test-mode prices, a once-duration coupon and a test checkout were created and verified against the
  owner's Stripe account. What remains is owner authorization to run **live** billing: a live key mode, live CAD
  prices and a live webhook secret — plus the deployment step below. `release-check.cjs` still refuses to call
  this working billing until both configuration and recorded test evidence exist.
* **No host.** Deployment configuration is prepared in `service/deploy/` and **nothing has been deployed**. B5
  requires exact build/host provenance and an owner-authorized deployment step.
* **GB currency and GB statutory basis.** `PUB-009` is dated 1 June 2007 and its own face declares its data
  fictitious, so the GB family's currency is unestablished and no GB region may be called supported for
  present-day files. Retrieval of current material refused at the source in B4 and the one current artifact on
  hand validates no heading and no field label. An owner decision on whether the recorded industry retention
  notice may serve as a statutory basis would separately be needed before any GB adapter could be bound.
* **Equifax Canada format family still not admitted.** The TransUnion Canada consumer disclosure is now admitted
  as its own measured structural contract (`FAM-TU-CA-CONSUMER`, B4 continuation), but the Equifax Canada
  presentation remains digest-only (`PR-01`): one specimen is still one specimen. A second same-bureau
  same-product Equifax specimen, or an official Equifax layout specification, would close it.
* **CA country-wide row.** The recorded PIPEDA row's instrument class is inconclusive and its provision is not
  recorded. It is not needed by the factual assessment and it is not invented.
* **`CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y`.** OWNER-EVIDENCE-001 v1.0: the discharge date is now accepted as the bureau's
  reported fact when it is clearly labelled on a bankruptcy public record, unambiguous and free of material
  contradiction (never a filing, update or trustee date). The check anchors on `bankruptcy.dischargeDate`
  (SINGLE_FIELD); it still runs only on the exact-specimen PR-01 presentation, so a general report does not
  broaden the CA-NS statutory surface.
* **`AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y`.** The APPLICABLE branch is not exercised on real evidence: the
  captured sample prints no closed liability record. Only a real file with one would close it.
* **`FCRA-605A-4-US-NATIONAL-7Y`.** Still withheld: the recorded start is the delinquency preceding collection,
  moved by the FCRA § 605(c)(1) 180-day rule, a separate legal computation this build does not implement. The
  limb is never aged from a collection date.
* **Reassessed public-record limbs (ACCEPT-002).** `FCRA-605A-1` (order for relief / adjudication),
  `FCRA-605A-2` (judgment entry), `FCRA-605A-3` (tax lien paid), `US-NY` bankruptcy, `US-NY` tax lien and
  `US-CA` bankruptcy now anchor on a clearly labelled legal-event date accepted under OWNER-EVIDENCE-001. A
  filing date is never substituted, and `US-NY-GBL-380J-F1-II-JUDGMENT-5Y` stays withheld because its
  "satisfied within five years" condition is a separate fact.
* **No finding class.** Every adapter still records `finding_allowed: false` and `packet_eligible: false`, so no
  response draft is produced. The paid assessment-report download serves the supported results, evidence basis and
  limitations, keeps observation/policy/statutory-comparison classes distinct, and is explicitly not a
  bureau-response packet. No VIOLATION or PROBABLE_VIOLATION class is authorized, and payment does not change that.

The matrix now carries the measured position rather than a placeholder: 82 rows, `launch_ready` **0**, a billing
column reading `ENTITLEMENT_ENFORCED_SERVER_SIDE_PROVIDER_NOT_CONFIGURED` on every row, and the B4 blockers in
place of the old `MULTI_USER_SERVICE` / `PRIVATE_UPLOADS` / `BILLING_AND_RELEASE` words.

