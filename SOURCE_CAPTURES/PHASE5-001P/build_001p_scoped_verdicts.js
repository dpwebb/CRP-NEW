/**
 * build_001p_scoped_verdicts.js — writes scoped_gate_5_2_verdict.json and scoped_gate_5_3_verdict.json.
 *
 * Each verdict quotes the gate's own text, states every criterion within the named scope, gives the evidence
 * for each state, names the corpus-wide state separately, and lists what the scope excludes. Neither verdict
 * claims a corpus-wide pass, and neither manufactures a disposition for the whole CRP-LSRC-0354 source from
 * its first limb.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001P");
const PLAN = "CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md";
const SCOPE = "SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT";
const read = (p) => fs.readFileSync(p, "utf8");
const lineOf = (doc, needle) => {
  const t = read(path.join(ROOT, doc));
  const i = t.indexOf(needle);
  return i < 0 ? null : t.slice(0, i).split("\n").length;
};

const gate52 = {
  artifact: "scoped_gate_5_2_verdict.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  scope_id: SCOPE,
  gate: "Gate 5.2 — Reconcile accepted legal decisions and finish report-only dispositions",
  gate_text_quoted_verbatim: [
    "**Gate 5.2:** all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable; every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal. Legal/source fields are accepted under PHASE5-001A, not re-litigated. No batch is accepted based solely on an unverified completion summary.",
    PLAN + ", section 3, Gate 5.2, now at line " + lineOf(PLAN, "**Gate 5.2:**") + " of the amended document (line 87 before amendment A-2)",
    "The amendment A-2 sentence now recorded in that paragraph: \"This condition is corpus-wide: it stays unpassed while any of the 437 entries lacks a reconciled report-only disposition or a documented reason it is not assessable, and a scoped verdict recorded under the PHASE5-001P paragraph above is read against the records inside its named scope only. Such a verdict neither states nor implies that this corpus-wide condition is satisfied.\"",
  ],
  authority_for_this_scoped_verdict:
    "amendment A-1 (build plan section 3, the scoped-gate-verdict paragraph) read with amendment A-2. Amendment A-1 is the owner's PHASE5-001P authority; a scoped verdict is read against the records inside its named scope only.",
  verdict: "PASSED_FOR_THIS_SCOPE",
  corpus_wide_verdict:
    "NOT PASSED — the corpus-wide Gate 5.2 condition is unchanged and unfinished: 409 rows carry NO_DURABLE_RESCREEN_RECORD, six more depend on a report mapping (five of them other than this unit) and CRP-LSRC-0194 is closed by owner direction. This verdict neither states nor implies otherwise. It is recorded separately in corpus_queue_preservation.json.",
};


gate52.criteria = [
  {
    criterion_verbatim: "all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable",
    scoped_reading: "read for this scope as: the in-scope source record bears a reconciled report-only disposition, or a documented reason it is not assessable",
    state: "MET within the scope",
    evidence: [
      "SOURCE_CAPTURES\\PHASE5-001K\\rescreen_register.csv, row CRP-LSRC-0354: disposition UNRESOLVED, disposition_state BLOCKED_MISSING_EVIDENCE, blocker_type REPORT_EVENT_DATE_MAPPING_UNVERIFIED, with a disposition_basis naming the expansion contract section 6 owner-decision block and the build plan's Phase 5.1 carry-forward line",
      "the row is one of the 416 UNRESOLVED rows and one of the seven rows the register's section 10.1 itemises as needing an evidence route; it is not claimed to be durably dispositioned, and its disposition is not promoted by this order",
    ],
  },
  {
    criterion_verbatim: "every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal",
    scoped_reading: "read for this scope as: the unresolved item that bears on this unit carries a concrete report-mapping task, or is a recorded irreducible gap or refusal",
    state: "MET within the scope",
    evidence: [
      "the unresolved item bearing on this unit is the residual no-payment/default-date alternative of s. 10(3)(c): the exact presentation field, on an evidenced consumer presentation, that the admitted text reads as the date the default in payment occurred, or a recorded determination for that presentation that it prints none",
      "it is a report-mapping task on the record: SOURCE_CAPTURES\\PROD-003\\report_representation_register.json field_records FACT-05 records the field as EXTRACTION_UNRESOLVED for PR-01 with its basis ('the record prints Date Assigned, First Delinquency, Date Paid/Settled, Date Verified and Last Payment Date, and none of them is the date the default in payment occurred as the admitted rule text reads that limb') and FACT-02's second_limb_note records that the limb stays UNSEATED",
      "the other half of the original blocker — the last-payment-date alternative — is demonstrated on this specimen and cleared for it by owner decision D-4 (printed Last Payment Date row inside a Collections contract debt record, page 16 line 32 and page 17 line 5, read as the collection-scoped fact collection.lastPaymentDate per D-2)",
      "NOT converted: the residual is recorded as a report-mapping task and is not re-classified as a GAP or a REFUSAL. The owner forbade converting missing work into GAP or REFUSAL merely to satisfy a gate, and the register's disposition vocabulary and this row's UNRESOLVED status are unchanged",
    ],
  },
  {
    criterion_verbatim: "Legal/source fields are accepted under PHASE5-001A, not re-litigated",
    state: "MET",
    evidence: [
      "nothing in this order reopens a source, jurisdiction, effective-period or legal-test determination",
      "the accepted source pin is unchanged: packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts, SHA-256 90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF, re-measured by this order in input_verification.json",
    ],
  },
  {
    criterion_verbatim: "No batch is accepted based solely on an unverified completion summary",
    state: "MET",
    evidence: [
      "every input this verdict rests on was re-measured by this order before it wrote anything: input_verification.json records each file with its digest and the digest the inherited record recorded for it",
      "the verdict rests on records that each carry their own verification: PROD-003's representation register and crosswalk, PHASE5-001I-A's independent re-measurement, PHASE5-001I-B's hash verification and reconciliation, PHASE5-001I-C's 32 checks with 0 failures, and PHASE5-001K's register re-derived from the register file alone",
      "no new external evidence, consumer-report retrieval or network call was used; the contract states that no additional consumer evidence may be requested",
    ],
  },
];


gate52.in_scope_records = [
  "the rule unit CA-NS-CRA-S10-3-C-LIMB-1 and its source record CRP-LSRC-0354, read for this unit's last-payment limb only",
];
gate52.what_remains = [
  "the residual report-mapping task on CRP-LSRC-0354: the no-payment/default-date alternative of s. 10(3)(c), which this verdict leaves unmapped and unevaluated",
  "the other five report-mapping IDs: CRP-LSRC-0422, 0423, 0424, 0425, 0427",
  "CRP-LSRC-0194: closed by owner direction until a concrete new consumer-format source appears",
  "the 409 NO_DURABLE_RESCREEN_RECORD rows: documentation work in an authorised batch, unchanged",
];
gate52.what_this_verdict_does_not_do = [
  "it does not manufacture a disposition for the whole CRP-LSRC-0354 source from its first limb: the row keeps UNRESOLVED / BLOCKED_MISSING_EVIDENCE / REPORT_EVENT_DATE_MAPPING_UNVERIFIED, the second limb stays unseated, and no class is inferred for the row or any other ID",
  "it does not promote, clear, close or re-classify any register row, and it edits no register, ledger, crosswalk or manifest: the field-level supplement is recorded, not applied",
  "it does not satisfy, weaken or advance the corpus-wide Gate 5.2 condition, and it gives no corpus-wide gate-completion credit",
  "it admits no rule, creates no coverage or candidate and authorizes no finding class",
  "it is not independent validation and is not Gate 5.4 or Gate 5.6 evidence",
];

const gate53 = {
  artifact: "scoped_gate_5_3_verdict.json",
  work_order: "PHASE5-001P",
  created_utc: "2026-09-30",
  scope_id: SCOPE,
  gate: "Gate 5.3 — Resolve report-schema and representation questions",
  gate_text_quoted_verbatim: [
    "**Gate 5.3:** each proposed candidate has a verifiable report representation and exact location, or remains explicitly unresolved/excluded with a source-grounded reason. No rule enters certification merely because a field seems likely to exist.",
    PLAN + ", section 3, Gate 5.3, now at line " + lineOf(PLAN, "**Gate 5.3:**") + " (line 96 before the amendments; the gate's own text is unchanged and is per-candidate, so no amendment was needed to read it for a scope)",
  ],
  authority_for_this_scoped_verdict: "amendment A-1 read with amendment A-3, which gives Phase 5.3 bullet 1 its scoped reading.",
  verdict: "PASSED_FOR_THIS_SCOPE",
  corpus_wide_verdict:
    "NOT PASSED — no corpus-wide intended-format inventory exists, no other candidate has a verifiable representation or an evidenced unresolved status, and the gate stays reached for one candidate on one presentation and passed for none corpus-wide. This verdict does not convert the one-candidate state into a whole-gate pass.",
  intended_format_inventory: {
    for_this_scope: "PR-01 only — the exact byte-pinned Equifax Canada consumer specimen, artifact LEG-CONSUMER-EQ-CA, SHA-256 E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F, 96,393 bytes, 22 pages, A4, native text on every page",
    recorded_by: "amendment A-3 (build plan section 3, Phase 5.3 bullet 1) plus scope_definition.json presentation block",
    every_other_format: "recorded as UNSUPPORTED and not inventoried; a different print date, product, bureau, scan, photograph, mobile view, subscriber or screening document, generated fixture and encrypted or text-less document are all outside the inventory",
    corpus_wide_inventory: "ABSENT, and not created or implied by this verdict. PHASE5-001I-C recorded this criterion as UNMET; that corpus-wide statement stands, and the amendment does not read it away for anything outside this scope",
  },
};


gate53.criteria = [
  {
    criterion_verbatim: "Inventory the actual consumer-report formats/fields that the future application is intended to support. Do not use the old detector's field limitations as the new product boundary.",
    state: "MET within the scope",
    evidence: [
      "the intended format for this scope is inventoried explicitly as PR-01 and nothing else; the record is scope_definition.json (presentation block) with the amended bullet as its authority",
      "the old detector's field limitations were not used as the boundary: the demonstrated fields are read from the printed report text through a stated extraction command, not from a legacy parser schema",
      "corpus-wide: UNMET, unchanged. No record in this workspace enumerates the formats the application is intended to support, and this verdict does not claim one",
    ],
  },
  {
    criterion_verbatim: "For each candidate, inspect representative report layouts or authoritative report-format documentation already within scope and map the exact displayed statement/date to the exact legal event. The legal source stays authoritative for law; report examples/documentation establish only representation and field mapping.",
    state: "MET for the first limb of this candidate; the second limb remains explicitly unresolved with a source-grounded reason",
    evidence: [
      "the printed Last Payment Date row inside a Collections contract debt record maps to the report-stated last-payment event on the debt, read as the collection-scoped fact collection.lastPaymentDate (owner decision D-2), located at PDF page 16 line 32 inside the record that begins at page 16 line 8 and ends at page 16 line 38, and at PDF page 17 line 5 inside the record that begins at page 16 line 39",
      "the printed value is 2021/02/01 in the report's own DDDD/DD/DD form, normalized to 2021-02-01, identical on both collection records; the raw value is preserved beside the normalized value",
      "the printed Request Date page header (line 1 of all 22 pages, value 2026/05/05) is accepted as the specimen's reference date (owner decision D-3)",
      "the default-in-payment date has no located field on this presentation: PROD-003 field_records FACT-05 records EXTRACTION_UNRESOLVED with its basis, and FACT-02's second_limb_note records the limb as UNSEATED rather than defaulted from First Delinquency. The gate's own text permits exactly this: 'or remains explicitly unresolved/excluded with a source-grounded reason'",
      "the legal source was not used to establish the representation and the report example was not used to establish the law",
    ],
  },
  {
    criterion_verbatim: "Establish whether the uploaded report can expose inquiry/request dates, bureau collection dates, last-payment dates, default dates, medical-debt labels, source/court labels, and other decisive report facts. A canonical parser field is not required if explicit report text can be deterministically mapped; unresolved OCR or ambiguous labels remain unresolved rather than inferred.",
    state: "MET within what the gate allows for this scope",
    evidence: [
      "established for this specimen: the last-payment date and the reference date are exposed as printed text and are deterministically mapped",
      "established as not exposed on this specimen: the date the default in payment occurred; the alerts/disclosures table on page 21 pairs no value with its labels, so no field from that table is claimed",
      "not claimed here: every other decisive fact belongs to other candidates and to other jurisdictions; no OCR was run and no page image was inspected",
    ],
  },
  {
    criterion_verbatim: "Define a report-location locator that survives extraction (page, section, tradeline/inquiry block, source span or bounding box, and exact text/value). Preserve the raw extracted value and normalized value with a traceable normalization record.",
    state: "MET for this candidate on this specimen",
    evidence: [
      "the locator records page, printed section path (Collections), the individual record block by its own printed row labels, the line within the block, and the exact printed value",
      "the extraction method is recorded as reproducible: pdftotext -f <page> -l <page> -layout <file> - with native text on all 22 pages",
      "raw and normalized values are preserved side by side in two independent records (PROD-003's register and PHASE5-001I-A's re-measurement), and the normalization rule (ISO 8601 derived from the printed DDDD/DD/DD form) is stated",
    ],
  },
];


gate53.excluded_and_unresolved_items = [
  "the no-payment/default-date alternative and the second limb of s. 10(3)(c): EXCLUDED from this scope and recorded unresolved, with the source-grounded reason that this presentation prints no field the admitted text reads as that date",
  "the reusable-locator question: the locator is demonstrated once and is not called reusable; PROD-003's unresolved_mappings item 'a second independently authorized Equifax Canada specimen is required before the locator is called reusable' stands, and owner decision D-6 keeps the single-specimen boundary",
  "PR-02: corroborates only the existence and the label of the Last Payment Date field across two Canadian consumer disclosures; not admitted as the format for any rule unit and not evaluable with PR-01's locator",
  "the effective-period and applicability-in-time question, the mandatory timing qualification, the direct-report section 4 retention exception and the ceiling: recorded limitations carried to Gate 5.4, none of them representation questions this gate decides",
];
gate53.what_this_verdict_does_not_do = [
  "it does not create or imply a corpus-wide intended-format inventory, and it does not pass Gate 5.3 corpus-wide",
  "it does not admit a report family or any availability for consumer upload; the application still reports report checking as not yet available",
  "it does not manufacture a mapping for the second limb or default the field from another date",
  "it does not admit a rule, certify legal content, create coverage or a candidate, or authorize a finding class",
  "it is not Gate 5.4, Gate 5.5 or Gate 5.6 evidence and it produces no result for any person",
];

fs.writeFileSync(path.join(OUT, "scoped_gate_5_2_verdict.json"), JSON.stringify(gate52, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "scoped_gate_5_3_verdict.json"), JSON.stringify(gate53, null, 2), "utf8");
console.log(
  "verdicts written:",
  gate52.verdict,
  "|",
  gate53.verdict,
  "| gate 5.2 criteria:",
  gate52.criteria.length,
  "| gate 5.3 criteria:",
  gate53.criteria.length
);
