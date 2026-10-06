# Ingestion field comparison — real report pages vs persisted extraction (Batch 22)

Owner-requested check. Method: each **real specimen** was read through the **production extraction path** (`formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(<specimen>))`) and its persisted facts compared with the **printed page text**; prior inspection evidence (the format baseline derivatives and the existing field sections) was reused rather than re-derived. **No structural-model or synthetic input is used as proof here**; those sections remain separate downstream tests.

Specimens: **TU-CA** TransUnion Canada consumer disclosure; **GB** Experian consumer disclosure (`PUB-009.pdf`); **AU** Equifax consumer disclosure (`PUB-012.pdf`); **US** the examined US file (`EXP-006.pdf`).

| Priority field | TU-CA — printed → extracted | GB — printed → extracted | AU — printed → extracted |
| --- | --- | --- | --- |
| **Account identity / reference** | *Creditor name* printed ("Creditor Name / BANK OF NOVA SCOTIA") → `account.reported_identity` ✔. **Reference genuinely not printed** in the block (the "Account #:" labels on the sample carry "Account Not Reporting" in a separate instructions area) → **printed-absent, coverage boundary** | *Lender heading* printed ("LENDU MONEY LIMITED CURRENT ACCOUNT") → **was dropped; NOW MAPPED** ✔ as `account.reported_identity` (+ raw) for all five accounts. **Reference not printed in the block** → printed-absent | *Credit provider* printed ("EXPRESS BANK") → `account.reported_identity` ✔. **Account number PRINTED** ("Account Number EPB0075" in the Overdue Accounts block; the liability label set also carries "Account Number") **but NOT mapped** → **printed-but-missed** |
| **Responsibility** | printed "INSTALLMENT / INDIVIDUAL" → `account.type` + `account.responsibility = INDIVIDUAL` ✔ | printed "JOINT ACCOUNT" → `account.responsibility = JOINT` where printed; absence never read as INDIVIDUAL ✔ | not printed on this specimen → absent |
| **Balances / past-due** | "Balance / Past Due / Amount" → `account.balance`, `account.pastDueAmount`, `account.amount` with raw readings ✔; **usable balance/payment check ✔** | "Balance / Credit Limit / Default" → `account.balance`, `account.creditLimit`, `account.defaultAmount` + raws ✔; past-due **not printed** by this presentation (recorded, not claimed) | "Credit Limit $10,000" ✔; **the Overdue Accounts block prints an Amount label that is not mapped** → printed-but-missed with the reference above |
| **Lifecycle status / dates** | "Opened / Closed / Reported / Last Payment" → `liability.openedDate`, `liability.closedDate`, `tradeline.lastPaymentDate` ✔; **usable dates check ✔** | "Started / Settled" → `liability.openedDate`, `liability.closedDate` ✔; **usable dates check ✔** | liability opened date ✔; "Original Listing Date" on overdue records ✔; **usable dates check ✔** |
| **Payment history** | the printed 30/60/90/#M grid → `account.paymentHistoryCells` ✔ with periods → **usable payment-history check ✔** | status-history characters → `account.paymentHistoryCells`, every cell `uncertain` (no printed legend, no printed period) → **retained-but-not-usable: unsupported, not missed**, and the capability layer says so rather than claiming the check ✔ | cells retained but undecoded for the same reason → retained-but-not-usable ✔ |
| **Public records** | none printed in this specimen | **5 public records read** (Information type / Date / Amount / Court / Case / Source) ✔ | default/overdue regimes → `OVERDUE_ACCOUNT` records read ✔ |

**Reading of the "not all absent, not all sufficient" question.** Creditor identity is **present** for TU-CA and AU and **was absent for GB until this batch** — three different states, not one. An account **reference** is printed for AU and dropped (a defect), absent on TU-CA and GB (a boundary). A **creditor name is not sufficient** matching evidence on its own, which is why the confident duplicate/responsibility path requires the masked reference **and** the identity, while report-history comparison deliberately settles at **QUALIFIED** on an identity match.

**US specimen.** The examined file routed to the **GENERAL-BUREAU-REPORT** intake and produced **one record with no facts**, so it yields no issue; the capability layer nonetheless lists six checks for that generic presentation, which **overstates what this artifact produced**. Whether the file is itself a consumer disclosure is **not established here**, so the US slice is recorded as **not demonstrated on this specimen** — the dedicated US reader (`us-experian-consumer.cjs`) exists but is not exercised by it. Recorded as a concrete limitation, not as absent information.

## What a consumer's uploaded report actually enables today

* **TU-CA** — creditor identity, responsibility, balances/past-due, lifecycle dates and the payment-history grid; usable **date**, **payment-history** and **balance/payment** checks. No account reference, so duplicate/responsibility matching stays unavailable and comparison runs at QUALIFIED on the creditor identity.
* **GB** — **now also** the printed lender identity, alongside balances, limits, default amounts, lifecycle dates, the printed JOINT marker and five public records; usable **dates** check; **no** usable payment-history check (no printed legend/period) and no reference, so the confident duplicate path stays closed. **Identity-based comparison is now possible for GB for the first time.**
* **AU** — creditor identity, credit limit, liability and overdue dates; a printed account reference and a printed overdue amount exist but are **not yet mapped**.
* **US** — **not demonstrated** on the examined specimen.

## Fixed in this batch

The GB reader dropped the printed account heading it already used to open each block; it now maps that heading as `account.reported_identity` with the raw reading preserved, so GB reports can take part in identity-based comparison and in the identity-keyed checks — **without weakening matching**: the confident duplicate/responsibility path still requires a masked reference, no masked reference is invented, and **no new potential issue is forced on the real example** (all asserted in the GB section). Regression **PASS 5260/0**; shipped files changed, so the candidate identity was refreshed to **`crp-v1-48a7d467f59a8bae`** (digest `48A7D467F59A8BAEF7365D260CC0C73B68D902650CEADC8ACCCBE59F86832DB2`).

## Remaining concrete limitations

1. **AU** — the printed `Account Number` (Overdue Accounts block, and the liability label set) is still unmapped, together with the printed overdue `Amount`; this is the next printed-but-missed fix and its capability consequences must be verified on the real specimen before it is enabled.
2. **TU-CA** — no account reference is printed, so the confident duplicate path cannot open for that presentation (a **boundary, not a defect**).
3. **US** — the examined file is not demonstrated as readable; a US disclosure specimen still has to be read.
4. **GB** — the payment-history cells remain undecodable because the artifact prints neither a legend nor a period (**unsupported, and recorded as such** rather than decoded by guesswork).

**Ingestion readiness therefore stays UNRESOLVED** until these are settled, and the earlier statement that production is blocked only by staging is corrected to: **production is blocked by staging verification *and* the ingestion items above.**

