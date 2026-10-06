# Canadian credit-reporting provisions — bounded retrieval record 001

Date: October 5, 2026 (America/Halifax). Authority: the owner's seven-day procedure, task 1 — *"Begin bounded retrieval of official credit-reporting provisions for the 11 unresolved Canadian regions. Public-source retrieval is within this build instruction … Record actual text and applicability; do not substitute general limitation periods."*

**Scope discipline.** This is ONE bounded retrieval record for the 11 rows that have no admitted substantive rule (CA-AB, CA-BC, CA-MB, CA-NB, CA-NL, CA-NT, CA-NU, CA-PE, CA-QC, CA-SK, CA-YT). It is not a corpus inventory and it does not reopen any completed branch. Retrieval authorizes **nothing else**: no provider integration, no private-report transmission, no deployment. Only public, official sources were requested; no consumer data was transmitted anywhere.

## 1. RETRIEVED — Newfoundland and Labrador (CA-NL)

**Instrument:** *Consumer Protection and Business Practices Act*, S.N.L. 2009, c. C-31.1 (as amended to 2022 c28).
**Locator:** `https://www.assembly.nl.ca/legislation/sr/statutes/c31-1.htm` — the official Queen's Printer version on the House of Assembly site.
**Retrieved:** October 5, 2026. **Reachable?** Yes (HTTP 200).
**Structure retrieved:** the Act's own analysis lists **PART VI — CREDIT REPORTS**: 36 Definitions · 37 Application of Part · 38 Disclosure of consumer report · 39 Contents of consumer report · 40 Credit report · 41 Personal information · 42 Disclosure of file to consumer · 43 Alteration of consumer information · 44 Sale of files.

**s.39 — "Contents of consumer report", verbatim as retrieved** (the fetched window begins inside paragraph (d); the opening words of (d) and all of (a)–(c) fall in a part of the page the fetcher did not return — see §3):

> … period runs from the date of the most recent acknowledgment of the debt;
> (e) information as to the non-payment of taxes or lawfully imposed fines 7 years after they have become due;
> (f) information as to convictions for crimes 7 years from the date of conviction or, where the conviction resulted in imprisonment, 7 years from the date of release or parole, but convictions for crimes shall not be reported after a full pardon has been granted;
> (g) information as to criminal charges where those charges have been dismissed or not proceeded with;
> (h) information as to race, religion, sex, political opinion, colour, or ethnic, national or social origin;
> (i) information as to writs that are more than 7 years old;
> (j) information as to writs that have been issued more than one year before the making of the credit report, unless the credit reporting agency has ascertained the current status of the writ and has a record of its current status in the credit report; or
> (k) other information as prohibited by the regulations.
> (2) A credit reporting agency shall not collect, store, retain or report credit information unless it is capable of corroboration from another source, and a reference to that source appears in the records of that agency.
> (3) A credit reporting agency shall not collect, store, retain, or report personal information unless it has made reasonable efforts to corroborate the evidence on which the personal information is based and a lack of corroboration is noted with the personal information and accompanies a consumer report including the personal information.
> (4) A credit reporting agency shall not include in a credit report information other than the information stored in a form producible under section 42.

**Also retrieved verbatim:** s.40 (a person assessing credit risk must, on request, tell the consumer whether a credit report was obtained and the agency's name); s.41 (prior written notice before procuring a report containing personal information); s.42(1)(a)–(c) and (2) (free disclosure of the file, one year of recipients, right to copy); s.43(1) opening words (*"The director may direct the alteration, amendment, restriction or prohibition of the use of credit information that in the director's opinion is inaccurate or does not comply with this Part …"* — the sentence is cut off mid-clause in the fetched window).

**Applicability read (what the text does and does not establish):** Part VI binds a **credit reporting agency** and the **contents of a consumer report**. Paragraphs (e)–(j) are printed-content prohibitions with their own periods; (g) and (h) are prohibitions with **no period at all**; (2)–(3) impose a corroboration requirement as a condition of collecting, storing, retaining or reporting.

## 2. NOT YET RETRIEVED — the other ten rows, with the exact locator and blocker

| Region | Official instrument targeted | Locator attempted | Result |
| --- | --- | --- | --- |
| CA-BC | *Business Practices and Consumer Protection Act*, S.B.C. 2004, c. 2 — its **credit-reporting** part, and s.197 (the credit-reporting regulation power) | `bclaws.gov.bc.ca/civix/document/id/complete/statreg/04002_00` (whole Act) and `…/04002_06` | Whole-Act page returned its **table of contents only** (the credit-reporting part falls outside the returned window); `04002_06` returned **Part 5 — Disclosure of the Cost of Consumer Credit**, i.e. **not** the credit-reporting part. The correct part-file id must be identified. |
| CA-AB | *Consumer Protection Act*, R.S.A. 2000, c. C-26.3 | `kings-printer.alberta.ca/1266.cfm?page=C26P3.cfm…` | Returned a **JavaScript shell with no statute text** (7,975 bytes, no sections). A direct consolidated-text locator is needed. |
| CA-NB | New Brunswick's credit-reporting statute (chapter not yet established) | `laws.gnb.ca/en/document/cs/C-20.2` | **"The document does not exist in the database."** The chapter must be established before retrieval. |
| CA-QC | *Consumer Protection Act*, CQLR c. P-40.1 | `legisquebec.gouv.qc.ca/en/document/cs/P-40.1` | **HTTP 403** (automated access refused). |
| CA-PE | *Consumer Reporting Act*, R.S.P.E.I. 1988, c. C-19 | `princeedwardisland.ca/sites/default/files/legislation/c-19-consumer_reporting_act.pdf` | **HTTP 404.** The current locator must be found on the PEI legislation site. |
| CA-MB | The Manitoba statute containing credit-reporting provisions | `web2.gov.mb.ca/laws/statutes/ccsm/c200e.php` | **"You used an outdated link"** — Manitoba re-published its consolidated Acts in a new format on 2023-05-01; the new chapter page must be located. |
| CA-SK | *The Consumer Protection and Business Practices Act*, S.S. 2013, c. C-30.2 (and/or a separate credit-reporting Act) | `canlii.org/en/sk/laws/stat/ss-2013-c-c-30.2/…` | **HTTP 403** (CanLII refuses automated access). A government or King's Printer locator is needed. |
| CA-NT | *Consumer Protection Act* (N.W.T.) | not yet attempted | Pending a locator. |
| CA-NU | *Consumer Protection Act* (Nunavut) | not yet attempted | Pending a locator. |
| CA-YT | *Consumer Protection Act* / credit-reporting provisions (Yukon) | not yet attempted | Pending a locator. |

**What this record does NOT do:** it does not substitute a limitation period for a reporting period. The corpus already holds provincial `LIMITATION_RECORD`s (for example Alberta's *Limitations Act* `years=2; start=NOT RECORDED`, `provision_or_citation: NOT RECORDED`). A limitation period governs when a claim may be brought; it is **not** a credit-reporting period and is not used as one.

## 3. Genuine interpretation decisions — returned as concrete proposals

Each is a real decisional fork the retrieved text exposes. I have recorded my proposed answer and **not** acted on it silently.

1. **What does s.39(1)(d)'s "period runs from the date of the most recent acknowledgment of the debt" attach to, and does it match the existing NS limb?** *Proposal:* treat it as a **last-activity-anchored reporting period** whose anchor is the printed *most recent acknowledgment of the debt* (a payment or an acknowledgment) — not the opening date and not a delinquency date. That is structurally the anchor shape of the accepted CA-NS limb (`CA-NS-CRA-S10-3-C-LIMB-1`, anchored on the printed last-payment date), so **reuse that mechanism** rather than inventing a new one. *Decision needed before wiring.*
2. **Is s.39(1)(g) — "criminal charges where those charges have been dismissed or not proceeded with" — assessable from an ordinary report?** *Proposal:* yes, and it is a **content prohibition with no period**, exactly like the accepted CA-NS dismissed-charge content rule (`CA-NS-CRA-S10-3-F-DISMISSED-CHARGE`); it can reuse `classifyContentOmission` unchanged. *Decision needed:* confirm a printed dismissed / not-proceeded criminal charge is in scope for a consumer upload.
3. **Do s.39(1)(h) (race, religion, sex, political opinion, colour, ethnic/national/social origin) and s.39(1)(k) (regulations) fall inside version 1?** *Proposal:* (h) is a clean prohibited-content category the existing content-omission mechanism can support; (k) **cannot be implemented at all from this source** because the regulations are not retrieved, and must stay observation-only. *Decision needed:* admit (h) now, or defer both.
4. **Does the s.39(2)–(3) corroboration duty become a finding, or only a verification request?** *Proposal:* **verification only**, at the POTENTIAL threshold — the report cannot show whether the agency holds a corroborating source, so a printed absence of any corroboration reference is a supported potential issue and never a violation.
5. **One rule unit per lettered paragraph, or one merged rule?** *Proposal:* **one rule unit per paragraph** — the counting-unit convention the corpus already uses ("a distinct governed provision/limb") — so (e), (f), (g), (h), (i) and (j) are up to six separate units, not one merged rule.

## 4. Ready outcomes, and the exact minimal change set (recorded, not half-applied)

**READY — corrected for this batch's boundaries.** The only NL paragraph whose mechanism and report evidence genuinely match an existing one is **s.39(1)(g)**: *"information as to criminal charges where those charges have been dismissed or not proceeded with"*. It is a **period-less content prohibition**, and the accepted CA-NS dismissed-charge rule (`CA-NS-CRA-S10-3-F-DISMISSED-CHARGE`, `anchor_mode: CONTENT_INCLUSION`, `record_kinds: GENERAL_PUBLIC_RECORD`, `applicability_rule: CRIMINAL_CHARGE_PRESENT`) is the **same structure that already operates on the general bureau-report intake** — so it is reused, not rebuilt, and the provision and the report evidence match. It is **not** being added to raise a jurisdiction count.

**NOT ready, and now recorded as such rather than as a blocker:**
- **s.39(1)(d)** — its anchor is *"the date of the most recent acknowledgment of the debt"*. **A payment date is not automatically that acknowledgment**, so no printed payment date may be used as the anchor. The exact opening words of (d) are still unretrieved.
- **s.39(1)(i) and (j)** — anchored on **writs**. **A judgment date is not automatically a writ-issue date**, so no printed judgment date may be substituted. Both drop out of the ready set.
- **s.39(2)–(3)** — the corroboration duty. **An absent corroboration reference in the consumer report does not establish that the agency lacks corroborating records**, so this cannot be a finding; it is not implemented.
- **s.39(1)(h)/(k)** — a period-less content category with no matching report-evidence mechanism, and (k)'s regulations were not retrieved.

**Minimal change set for (g) — bounded now that §5.2 binds it to an existing row:** (1) set `provision_or_citation` on the existing ledger row **`CRP-LSRC-0344`** to the retrieved citation (no new row; the frozen 437 invariant is untouched); (2) one **`EXACT`-mode** adapter entry for region `CA-NL` in `adapters/adapter-configs.json` carrying the limb quoted in §1, bound to `source_entry_id: CRP-LSRC-0344`; (3) re-run the derived builders; (4) update, in the same change, the counters the acceptance records assert literally — measured deltas: `n-applicability-records.cjs` `STATUTORY_RULE_COMPARISON` regions **71 → 72** (the `regions_with_an_executable_relation` count stays **69**, because the Canadian relation remains `UNRESOLVED_RELATION_NOT_ESTABLISHED` and CA-NS/CA-ON are not in it either); `run-tests.cjs` region-support for `CA-NL`; the `finding-coverage` adapter list; and the ALL82 closure's working-assessment count; (5) an end-to-end test (the pattern `cc-ca-on-ordinary-report.cjs` uses for ON) proving the NL dismissed-charge rule produces a supported outcome through selection and the packet, plus a benign control.


## 5. Round 2 — what round 2 retrieved, and the binding that removes a whole class of work

### 5.1 RETRIEVED — British Columbia (CA-BC), Part 6

**Instrument:** *Business Practices and Consumer Protection Act*, S.B.C. 2004, c. 2, **Part 6 — Credit Reporting**.
**Locator:** `https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/04002_07` — **the correct part file** (my earlier guess `…04002_06` was Part 5; that was a retrieval error, now corrected, not a source blocker).
**Retrieved:** October 5, 2026. **Reachable?** Yes.
**Structure:** s.106 Definitions (`credit information`, `report`, `reporting agency`) · s.107 Consent for report · s.108 To whom reports may be given · **s.109 Contents of reports** · s.110 Notice of denial of benefit · s.111 Explanation (100-word consumer statement) · s.112 False or misleading information.

**s.109(1) verbatim as retrieved** (the fetched window begins mid-list; items (k)–(p) are complete):

> (k) information about the race, belief, colour, sexual orientation, ancestry, ethnic origin or political affiliation of an individual;
> (l) information concerning any member of the individual's family other than the spouse as provided for in this Part;
> (m) information about the payment or non-payment of lawfully imposed fines **6 years after the fine was imposed**;
> (n) information about a legal proceeding **12 months after the date the proceeding began**, unless the current status of the proceeding has been ascertained and is included in the report;
> (o) any other information adverse to the individual's interest **6 years after the event that gave rise to the information**;
> (p) any other prescribed information.
> (2) For the purposes of subsection (1)(a), a person who provides information to a reporting agency for remuneration or other benefit except salary is not a source of information.

**Applicability read, with this batch's boundary applied.** s.109(1)(o) is the general adverse-information period, but its anchor is *"the event that gave rise to the information"* — **not a field the report prints**. Per the boundary (*a judgment date is not automatically a writ-issue date*), a printed date is **not** equated with "the event", so **(o) is NOT ready**. (m) is anchored on the fine's imposition and (n) on the date a proceeding began; whether either date is printed as such by an admitted presentation is a separate, required measurement. (k)/(l) are period-less content prohibitions whose report evidence would need the same classification structure the dismissed-charge mechanism uses.

### 5.2 The binding that makes the NL capture a row UPDATE, not a new row

`SOURCE_CAPTURES/PHASE5-001O/source_id_coverage_ledger.json` (frozen, 437 rows, asserted `== 437` in **three** builders) **already contains an owner-accepted row for exactly this instrument**:

| Field | Recorded value |
| --- | --- |
| `source_entry_id` | **`CRP-LSRC-0344`** |
| `instrument_title` | Consumer Protection and Business Practices Act (Newfoundland and Labrador), S.N.L. 2009, c. C-31.1 — **Part VI, Credit Reports** (the Consumer Reporting Agencies Act, R.S.N.L. 1990, c. C-32, was repealed by 2009, c. C-31.1, s. 112) |
| `provision_or_citation` | **`NOT RECORDED`** ← the only missing piece, and §1 of this record supplies it |
| `owner_acceptance.state` | **`OWNER_ACCEPTED_LEGAL_AUTHORITY`** |
| `established_jurisdiction_associations` | `canonical_region_code: CA-NL`, `canonical_jurisdiction_status: EXACT` |

**Consequence:** the NL rule needs **no new ledger row and no change to the frozen 437 invariant**. The batch is: fill `provision_or_citation` on the existing row · add the adapter bound to `CRP-LSRC-0344` · re-run the three builders · update the counters · add the end-to-end test. This removes the largest risk item previously recorded.
### 5.3 Targeted locators the corpus itself already supplies (from the frozen FCAC row `CRP-LSRC-0322`)

The ledger's FCAC row records the **owner-supplied statutory bases** for the provinces — i.e. the exact provisions to retrieve. Bounded locator resolution should aim at these, not at whole statutes.

| Region | Provision the corpus names | Route status after round 2 |
| --- | --- | --- |
| CA-BC | Business Practices and Consumer Protection Act, S.B.C. 2004, c. 2, **s. 109** | **RETRIEVED** (§5.1); correct part file is `04002_07` |
| CA-NL | Part VI of the 2009 Act (row `CRP-LSRC-0344`) | **RETRIEVED** (§1); s.36–38 and s.39(1)(a)–(c) still outside the fetcher's window |
| CA-MB | **Personal Investigations Act**, C.C.S.M. c. **P34**, **s. 9(3)** — *not* the Consumer Protection Act | old `ccsm/p034e.php` link dead (site re-published 2023-05-01); the new chapter page is the next official route |
| CA-SK | **The Credit Reporting Act**, S.S. 2004, c. **C-43.2**, **s. 18** — a dedicated Act | `qp.gov.sk.ca/…/C43-2.pdf` fetch failed; another official QP route is the next attempt |
| CA-NB | Consumer Reporting Act, S.N.B. 2014, c. 31, **s. 13** | chapter identified; `laws.gnb.ca` route to confirm |
| CA-PE | Consumer Reporting Act, R.S.P.E.I. 1988, **c. C-18, s. 10** | the corpus records the same Act as c. C-18, C-19 **and** C-20 in different rows — **settle the chapter first**; the C-18 and C-19 PDF routes both 404 |
## 6. Round 3 — the retrieved Newfoundland provision is now IMPLEMENTED (this batch)

**Status of §4: APPLIED.** The minimal change set recorded above was executed as one coherent batch, preceded by the builder repair it depends on.

**6.1 The build tooling was repaired first, because regeneration had to be trustworthy.**
`accelerated-launch/build_applicability_records.py` declared `RELATIONS = [AU_RELATION, US_RELATION, GB_RELATION, CA_RELATION]` and therefore could not reproduce the admitted `applicability-records.json`: re-running it silently dropped the admitted `GB-UK-GDPR-ACCURACY-COUNTRY-WIDE` relation, its four region mappings and its source reference. The relation now lives in the maintained model, together with the declared UK-wide row shape that relation uses. **Verification:** regeneration now differs from the admitted artifact **only** by the restored relation's own four `region_applicability_index` entries (8 added paths, zero removals); relations 5 = 5, region rows 86 = 86, confirmed/executable 69 = 69, index regions 82 = 82, key order preserved; identical SHA256 across runs. **One focused regression guard** was added in `n-applicability-records.cjs` — the builder must declare every relation the artifact carries, and that relation must keep its four mappings and its recorded source.

**6.2 A second stale builder was found by the same test.** `build_launch_matrix.py` derived a region's assessment classes from test evidence alone, so regeneration silently dropped `STATUTORY_RULE_COMPARISON` for CA-ON and the four GB regions (71 → 66, no-statutory 11 → 16). It now also reads the region's recorded adapter coverage from the registry, which restores those five and adds CA-NL.

**6.3 The row and the rule.** `CRP-LSRC-0344` now carries the retrieved provision `s. 39(1)(g)` with the pre-retrieval state **preserved on the row** (`provision_or_citation_history`, `provision_retrieval_record`) — the row count stays 437. The rule `CA-NL-CPBPA-S39-1-G-DISMISSED-CHARGE` reuses the accepted dismissed-charge mechanism (`CONTENT_INCLUSION`, `CRIMINAL_CHARGE_PRESENT`, `GENERAL_PUBLIC_RECORD`, EXACT `CA-NL`, ceiling `violation`, packet-eligible) and is enumerated in the authorized packet-eligible findings.

**6.4 What a Newfoundland consumer now gets.** Upload → a supported **violation** issue for a report printing a dismissed / not-proceeded criminal charge → selection in the Wizzard → reviewed correspondence → approval → entitled download. Verified together with a benign control, the charge/disposition association rules, an out-of-region control, and preservation of the New Brunswick-equivalent NS and GB outcomes. **Full regression PASS 4927/0**; counters moved on measurement (`STATUTORY_RULE_COMPARISON` 71 → 72, no-statutory 11 → 10, packet-eligible findings 7 → 8); catalogs, launch matrix and staging manifest rebuilt (digest `446629EE…51AA2`, 80 files, deterministic ×3).

**6.5 Still owed, and recorded rather than inferred.** s.36–38 and s.39(1)(a)–(c) remain outside the returned window (so `s.37`'s application wording is recorded as retrieved, not as read here); s.39(1)(d), (i), (j) and (2)–(3) remain **not ready** for the anchor reasons in §4; the other nine provincial provisions and the three unattempted territories remain as §5.3 records them; **CA-BC is retrieved but NOT ready**, because BPCPA s.109(1)(o) is anchored on “the event that gave rise to the information”, which no admitted presentation prints — a source/application task, not a locator gap.

| CA-QC | Civil Code of Québec, CQLR c. CCQ-1991, **art. 30** (plus the Consumer Protection Act) | légisquébec refuses automated access (403); an alternative official route is needed |
| CA-AB | Consumer Protection Act, R.S.A. 2000, c. C-26.3 **with the Consumer Reporting Regulation, s. 16** | the **regulation** is the operative provision; King's Printer returns a JS shell |
| CA-YT / CA-NT / CA-NU | "Consumers Protection Act or Consumer Protection Act", **no precise provision supplied** | **unattempted** — retrieval tasks, not owner blockers |

**Note.** Round 1's holding reason for the NL rules is partly superseded: the instrument is now bound to an existing owner-accepted row (§5.2), so the remaining work is the adapter + counters + test, not a new source row. Round 1's remaining untruncated text (s.36–38, s.39(1)(a)–(c)) is still owed.

## 7. Round 3 — measured source outcomes for NB, PE, QC, SK, BC and the three territories

**Measured method.** Official-source retrieval attempted with a browser user-agent from this build environment; where a PDF was obtained it was converted with `pdftotext` 25.12.0 and searched as text. Nothing was inferred from a search snippet, and no provision text was reconstructed from memory. Nothing was downloaded into source control (`*.pdf` is ignored by the repository), and no consumer data or private report was transmitted.

### 7.1 CA-NT — no credit-reporting wording found in the examined Consumer Protection Act; the broader authority search remains RESOLVED-OPEN

| Measurement | Value |
| --- | --- |
| Artifact | *Consumer Protection Act* (N.W.T.), official publication, `https://www.justice.gov.nt.ca/en/files/legislation/consumer-protection/consumer-protection.a.pdf` |
| Retrieved | HTTP 200, **701,570 bytes** |
| Text extracted | **233,852 characters** (`pdftotext`) |
| Occurrences of "credit report" / "consumer report" (case-insensitive) | **0** |
| Occurrences of "credit" overall | non-zero, in consumer-transaction senses (credit agreements/cards), i.e. the text is genuine and simply contains no consumer-report provisions |

**Corrected reading (owner-directed).** This is a measurement of ONE examined instrument, not a finding that no territorial authority exists: the text examined contains no credit-reporting wording, so **no rule may be created from the territorial Consumer Protection Act**, and the broader question — which instrument governs consumer reports in CA-NT — **remains unresolved**. It does not, on its own, establish that no other N.W.T. instrument applies, and the federal PIPEDA relation is investigated on its own terms in §8.3 rather than assumed to fill the gap.

### 7.2 NOT REACHABLE — Nunavut (CA-NU) and Yukon (CA-YT)

* **CA-NU** — `https://www.gov.nu.ca/…` returned **404** for both candidate Act paths, and `https://www.gov.nu.ca/en/legislation` returned **HTTP 403**.
* **CA-YT** — `laws.yukon.ca` returned **HTTP 403** for the principal-Act PDF (`2002-0040_1.pdf`, with and without a browser user-agent), an alternative consolidated-path guess returned **404**, and `canlii.org` returned **403**.

**Concrete missing prerequisite (recorded once):** a retrieval route to these two publishers' texts — a browser-rendered session or an accessible official mirror. These are **source-access failures, not exhausted authority routes**: neither publisher was read, so nothing about their instruments is established either way.

### 7.3 British Columbia (CA-BC) — the recorded trigger gap is structural for the WHOLE content list

Round 2 retrieved BC BPCPA s.109(1) verbatim (items (k)–(p)). Round 3 adds the decisive measurement: the reader's printed public-record date facts are `publicRecord.judgmentEntryDate` (labels **ENTRY / ENTERED**), `publicRecord.judgmentSatisfactionDate`, `publicRecord.taxLienPaidDate`, `publicRecord.bankruptcyOrderForReliefDate` and `publicRecord.bankruptcyAdjudicationDate`. **There is no filing, commencement or "event" label.**

| Item | Anchor the provision names | Printed? |
| --- | --- | --- |
| (m) | 6 years after **the fine was imposed** | No — no fine-imposition date is printed |
| (n) | 12 months after **the date the proceeding began** | No — no commencement date is printed, and an entry date is not a commencement date, so no printed date may be substituted for it |
| (o) | 6 years after **the event that gave rise to the information** | No — the recorded gap, kept separate and unchanged |

**Consequence:** BC is blocked for **every** content item, not only (o). **Smallest fix:** a presentation that prints the fine-imposition, commencement or event date; otherwise BC carries factual assessment only by explicit owner decision. No counter moved.

### 7.4 Blocked on official-source access — NB, PE, QC, SK

| Region | Provision the corpus names | What actually happened in round 3 | Concrete missing prerequisite (once) |
| --- | --- | --- | --- |
| CA-NB | Consumer Reporting Act, S.N.B. 2014, c. 31, **s. 13** | `laws.gnb.ca` is a client-rendered Irosoft LIMS shell: `/en/document/cs/2014-c.31` and `/en/document/cs/2014-c31` both return only the shell chrome, the separately attempted `/en/acts-by-title` is a 404 page, `C-20.2` returns "The document does not exist", and no PDF route resolved (0 bytes) | a rendered retrieval, or the chapter confirmed from the official index — **the citation itself (2014, c. 31 vs C-20.2) stays unconfirmed** |
| CA-PE | Consumer Reporting Act, recorded variously as **c. C-18 / C-19 / C-20**, s. 10 | `princeedwardisland.ca` is behind **Radware** bot protection: both the legislation index and the Act page return the "Verifying your browser" interstitial; the `/sites/default/files/legislation/c-1X-consumer_reporting_act*.pdf` routes returned **404** | a rendered retrieval — **the C-18 / C-19 / C-20 question is open**, and it is a citation question, not an implementation question |
| CA-QC | Civil Code of Québec art. 30 (and the Consumer Protection Act) | `legisquebec.gouv.qc.ca` refuses automated access (**403**), unchanged from round 2 | a rendered retrieval |
| CA-SK | The Credit Reporting Act, S.S. 2004, c. **C-43.2**, s. 18 | `qp.gov.sk.ca` **does not resolve** from this environment ("No such host is known", with and without `www`); the publications search API returns **400**; a `publications.saskatchewan.ca` product-download guess returned **404** | a DNS-reachable official Queen's Printer route |

**Recorded once, not restated as a task.** **No adapter was created for any of these regions.** An adapter without the provision's own words would be a disabled record built only to move a count, which this batch's boundary forbids, and would risk asserting a rule the source does not support.

### 7.5 What round 3 hands to the next batch (measured, not assumed)

A printed **judgment entry date** already flows to `publicRecord.judgmentEntryDate`, and an existing admitted rule anchors on a printed public-record date (US-NY-GBL-380J-F1-II-JUDGMENT-5Y). So a provision anchored on a printed public-record date implements without new infrastructure. **Correction (owner-directed):** the delivered provincial limbs that reuse infrastructure are **content** requirements, not retention timing — NS s.10(3)(d) and **MB s.4(e) are judgment-CONTENT requirements** (creditor name, address, amount), which is why the content-omission machinery rather than a period comparison carries them. Retention-timing provisions such as NB's former s.10(3)(g)/the 2024 CPA s.254(3)(h) ("more than six years after the judgment was given") anchor on a legal-event date the report does not print, so they stay unimplemented.

## 8. Round 4 (BATCH-14) — alternate official routes, applicability verified, PEI delivered

**Method.** Official leads with URL-encoded chapter references; located documents read as text (`pdftotext`; HTML stripped for the N.B. consolidations); **applicability verified before implementing** — a located document does not by itself establish commencement or supersession.

### 8.1 DELIVERED — Prince Edward Island, s. 9(3)(d)

* **Citation resolved.** The official consolidation (`/legislation/C-20-Consumer%20Reporting%20Act.pdf`) is the **Consumer Reporting Act**: its own text cites **R.S.P.E.I. 1974, Cap. C-18** (transfer provision, as amended by **2025, c.11**) and the current publication files it under **chapter C-20**. Row `CRP-LSRC-0389` now records `s. 9(3)(d) and s. 9(3)(j)`, the prior value kept in `provision_or_citation_history`; artifact sha256 `A31229854E20E8A217D3D010B1C3EC9E3678E689BEFA52F8E8FA92D3D2B2558F`; 437 rows preserved (a row UPDATE).
* **Applicability:** consolidation **current to 30 March 2026** with 2025 amendments — operating law; no commencement or supersession gap.
* **Verbatim, s. 9(3):** "A consumer reporting agency shall not include in a consumer report ... (d) information as to any judgment against the consumer unless mention is made of the name and where available, the address of the judgment creditor as given at the date of entry of the judgment and the amount".
* **Delivered:** `CA-PE-CRA-S9-3-D-JUDGMENT-CONTENT-OMISSION` reuses the content-omission machinery — a complete entry printing no amount caption and no dollar figure is an omitted amount → **VIOLATION → correction request** → selectable → reviewed correspondence → approval → entitled download, with complete, printed-zero, missing-name, missing-address (recorded and never claimed: the address is required only "where available"), blank-caption, untrusted, out-of-province, unpaid-402, stranger-403 and stale-approval controls (`cj-ca-pe-judgment-content`, 40 assertions). Counters: statutory **74 → 75**, none **8 → 7**, packet-eligible **9 → 10**.
* **Next limb already retrieved:** **s. 9(3)(j)** dismissed / set aside / not proceeded charges — a direct match to the delivered dismissed-charge mechanism. s. 9(3)(c) and (k) anchor on legal-event dates the report does not print.

### 8.2 SUPERSESSION FOUND — New Brunswick

* `laws.gnb.ca/en/document/cs/2017%2C%20c.27` = **Credit Reporting Services Act, S.N.B. 2017, c. 27** (s.10(3)(f) judgment content; s.10(3)(c) dismissed/set aside/withdrawn charges) — **the wrong instrument**: the **Consumer Protection Act, S.N.B. 2024, c. 1** provides at s.366(9) "Despite the repeal of the Credit Reporting Services Act, chapter 27 of the Acts of New Brunswick, 2017 ...". The current instrument carries the equivalents at **s.254(3)(d)** (dismissed, set aside, withdrawn, or absolute/conditional discharge), **s.254(3)(g)** (judgment content: creditor name, address where available, amount) and **s.254(3)(h)** (more than six years after the judgment was given).
* **One prerequisite recorded (not an owner request):** the consolidation gives a currency date only (7 June 2024) and s.366(8)–(9) speak of "the commencement of this section", so **commencement of the 2024 CPA credit-reporting Part must be confirmed**. Nothing is bound to the repealed or to the uncommenced provisions.

### 8.3 PIPEDA — investigated

Measured against the official consolidation (S.C. 2000, c. 5, current to 2026-09-21): PIPEDA contains **no credit-reporting content rule and no credit-information retention period** (no credit-report/credit-bureau division; the only comparable limit is the s.7(3)(h) archival exception). It therefore cannot supply a "shall not report X" rule for any region and is **not** recorded as a substitute for provincial instruments. **One bounded internal question remains:** whether Schedule 1 accuracy clause 4.6 applies to a private-sector bureau in a territory where no substantially similar provincial statute exists — the next applicability step, not a request to establish the relation.

### 8.4 Saskatchewan — access failure, not an exhausted route

The current Publications Centre (`publications.saskatchewan.ca`) was used instead of the retired `qp.gov.sk.ca`: the root returns an application shell (1,215 bytes), the product API times out or returns 400, and no text was obtained. `The Credit Reporting Act, S.S. 2004, c. C-43.2, s. 18` (row `CRP-LSRC-0392`) **remains unread**; the prerequisite is a route to the current Publications Centre product.

### 8.5 Round 5 (BATCH-15) — the two blocking questions, measured

**(a) New Brunswick: commencement is NOT established, and the Act says so itself.** The 2024 Consumer Protection Act is commencement-gated on its face — its application provisions read "on or after the commencement of this section" (ss. 9(2), 22(2), 28(1), 38(1), 48(1), 62(1)) and s.366(8)–(9) condition the repeals and the deemed licences on "the commencement of this section" — while the official consolidation shows a **currency date only** ("Current to 7 June 2024"; assented 7 June 2024) and **no commencement order, date or proclamation**. Applicability is not inferred, so **no NB rule is bound**: not to the repealed 2017 Credit Reporting Services Act, not to the uncommenced 2024 provisions. Prerequisite (one): a **commencement order for the 2024 CPA credit-reporting Part (around s.254)**; s.254(3)(g) (judgment content) and s.254(3)(d) (dismissed / set aside / withdrawn, or absolute or conditional discharge) then map to **already-delivered** mechanisms.

**(b) Territories: the bounded PIPEDA accuracy question stays open on a SOURCE-ACCESS basis, not a legal one.** The governing material is PIPEDA s.4 together with the Commissioner's substantially-similar determinations; the official `priv.gc.ca` routes for that list return **HTTP 404** from this environment (two further privacy-law index routes also 404). Nothing is asserted about territorial applicability: NWT's Consumer Protection Act was examined and contains no credit-reporting wording, NU and YT were not readable. **Recorded for the next attempt:** no fixed retention period and no "shall not report X" prohibition is required for an accuracy-based **probable** issue; the applicable duty is **Schedule 1 clause 4.6** (personal information "as accurate, complete, and up-to-date as is necessary for the purposes for which it is to be used"), which the **existing source-linked factual-consistency mechanism** already carries — with its uncertainty and verification wording preserved. Missing retention rules are therefore **not** treated as missing relevant compliance duties.

**(d) Round 6 (BATCH-16) — NB record corrected, the territorial PIPEDA mapping established, PEI's second limb registered.**

* **NB source record corrected (owner-directed, verified against the Act's own text):** **s.380** — "The Credit Reporting Services Act, chapter 27 of the Acts of New Brunswick, 2017, is repealed"; **s.385** — "This Act or any provision of it comes into force on a day or days to be fixed by proclamation"; **s.366(9)** — the licence-transition (deemed licence) provision, not the repeal. Round 5 wrongly attributed the repeal to s.366(9) and treated s.385's proclamation requirement as evidence of non-commencement: **missing commencement evidence establishes neither repeal nor non-commencement**, and the operative NB credit-reporting legislation therefore stays **unresolved pending a proclamation** rather than resolved either way.
* **Territories — commercial consumer-reporting applicability RESOLVED from official material.** The Office of the Privacy Commissioner of Canada states: *"Organizations in the Northwest Territories, Yukon, and Nunavut are considered federally regulated, and are therefore also covered by PIPEDA"*, on the same page recording that PIPEDA *"applies to private-sector organizations across Canada that collect, use, or disclose personal information in the course of a commercial activity"*, that **Accuracy** is one of the ten Schedule 1 principles, and that personal information *"includes information in any form, such as ... credit records, loan records"* (PIPEDA requirements in brief, retrieved 2026-10-06). The applicable duty is therefore **Schedule 1 clause 4.6**, carried by the **existing source-linked factual-consistency mechanism** (the one the Ontario and GB accuracy findings use): a report whose own two printed values cannot both be accurate is a **probable** accuracy issue with the verification request, and **no retention period and no "shall not report X" prohibition is required**. The three adapters were instantiated and pass the structural/authorization guards, but their end-to-end section is **not yet demonstrated**, so this record makes **no delivery claim** for CA-NT/CA-NU/CA-YT and no counter moved for them (see the register).
* **PEI s. 9(3)(j) registered and authorized:** the limb now exists as `CA-PE-CRA-S9-3-J-DISMISSED-CHARGE` (clone of the delivered dismissed-charge mechanism, exact region CA-PE, bound to row `CRP-LSRC-0389`) and is added to the per-finding packet authorization (`PACKET_ELIGIBLE_RULE_IDS`, 10 → 11). **PEI's own disposition wording governs — dismissed, set aside or not proceeded with** — and a withdrawn or stayed charge is not claimed on this limb. Its end-to-end assertions are the next step in the same section.






### 8.6 Round 7 (BATCH-17) — both ready branches DELIVERED and tested

* **CA-NT, CA-NU, CA-YT — PIPEDA Schedule 1 clause 4.6 accuracy: DELIVERED.** The three adapters are restored on the resolved application mapping (OPC: organizations in the three territories are considered federally regulated and are therefore covered by PIPEDA) and bound to row `CRP-LSRC-0313`. A report whose own two printed values cannot both be accurate reaches the consumer as **one eligible PROBABLE card carrying both supported bases** (the factual conflict and clause 4.6) with the clause 4.6 words, the specific uncertainty (which value is unreliable is not established; a benign explanation is not excluded; not an established violation) and a verification request. **No retention period and no "shall not report X" prohibition is relied on.** Controls asserted: a benign account whose dates agree raises nothing (though the rule still evaluates), a record missing one decisive printed value raises nothing, BC gets no territorial rule and the rule is not offered outside its region, plus unpaid 402, stranger 403, ownership, and the stale-approval refusal; the journey runs select → reviewed correspondence → approval → entitled download (`ck-ca-territories-pipeda-accuracy`, 63 assertions).
* **PEI s. 9(3)(j) — DELIVERED with PEI's OWN categories.** The provision names *dismissed*, *set aside* and *not proceeded with*; the printed disposition **category** is now the decisive, source-linked predicate (`accepted_disposition_categories` declared per adapter), and the reader classifies `NOT_PROCEEDED` — a category it did not previously recognise. Asserted: dismissed, set aside and not proceeded with each produce the finding and cite s.9(3)(j); **withdrawn and stay of proceedings are classified but NOT claimed** (PEI does not name them); a conviction is not claimed; an ambiguous charge/disposition association yields no category and no finding; the cross-record and entry-completeness conditions are inherited from the delivered mechanism (`cj-ca-pe-judgment-content`, 52 assertions).
* **Measured counts moved only on demonstration: statutory regions 75 → 78; regions with none 7 → 4, leaving CA-BC, CA-NB, CA-QC and CA-SK unresolved.** BC keeps its factual service and recorded statutory gap. **Full regression PASS 5173/0.**
