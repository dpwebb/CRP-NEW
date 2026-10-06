/**
 * build_001s_decisions_and_custody.js — PHASE5-001S step 3b: record the two owner decisions this order carries,
 * and the supplemental custody decision that Owner Decision 1 requires.
 *
 * It writes owner_decisions.json and custody_supplement.json. It edits nothing, and it re-measures the artifact
 * Owner Decision 1 concerns rather than trusting the digest PHASE5-001R recorded for it.
 */
const fs = require("fs");
const path = require("path");

const ROOT = "C:\\\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001S");
const sha256Of = (buf) => require("crypto").createHash("sha256").update(buf).digest("hex").toUpperCase();
const sha256 = (p) => sha256Of(fs.readFileSync(p));

const ORIGINAL_HASH = "E492041115C32857EE471389BE15B3A812D9219D655342DD64B4AAF4A8B99B22";
const RETENTION_PATH = "SOURCE_CAPTURES\\\\PHASE5-001I-A\\\\test_results_001i_a.json";

const targetAbs = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001I-A", "test_results_001i_a.json");
const currentHash = sha256(targetAbs);
const currentBytes = fs.statSync(targetAbs).size;
const currentContent = JSON.parse(fs.readFileSync(targetAbs, "utf8"));

const r001r = JSON.parse(
  fs.readFileSync(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "scoped_gate_5_5_verdict.json"), "utf8"),
);
const r001rPreservation = JSON.parse(
  fs.readFileSync(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "preservation_and_change_record.json"), "utf8"),
);
const r001rVerification = JSON.parse(
  fs.readFileSync(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "verification_results.json"), "utf8"),
);
const iaManifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001I-A", "file_custody_manifest.json"), "utf8"),
);
const iaRow = iaManifest.files.find((f) => f.relative_path_from_workspace === "SOURCE_CAPTURES\\PHASE5-001I-A\\test_results_001i_a.json");

const criterion7 = r001r.acceptance_criteria.find((c) => c.where_it_sits === "acceptance criterion 7");

const decisions = [
  {
    id: "OWNER-DECISION-1",
    title: "CUSTODY EXCEPTION",
    decision_verbatim: [
      "OWNER DECISION 1 — CUSTODY EXCEPTION",
      "",
      "Accept the regenerated PHASE5-001I-A test_results_001i_a.json as the current retained artifact, with its unauthorized regeneration explicitly recorded.",
      "",
      "This decision:",
      "- Does not retroactively authorize the original write.",
      "- Does not establish that the old bytes were recovered.",
      "- Does not erase the preservation failure.",
      "- Does authorize prospective use of the current artifact at its full measured hash.",
      "- Does not treat its 41 passing tests as Gate 5.6 evidence.",
      "",
      "Create a supplemental custody decision linking the original recorded hash, current hash, cause, affected order and prospective baseline. Preserve historical manifests and failure records.",
    ].join("\n"),
    what_it_authorises: [
      "prospective use of the current retained artifact at its full measured hash",
      "recording that hash as part of the prospective baseline this order establishes",
    ],
    what_it_expressly_does_not_do: [
      "it does not retroactively authorise the original write",
      "it does not establish that the old bytes were recovered",
      "it does not erase the preservation failure, which stays recorded as a failure",
      "it does not treat the artifact's 41 passing tests as Gate 5.6 evidence",
    ],
    what_this_order_did_under_it: [
      "created the supplemental custody decision (custody_supplement.json) linking the original recorded hash, the current measured hash, the cause, the affected order and the prospective baseline",
      "kept the original preservation criterion marked failed in the historical record, and recorded the progression assessment separately under the exception",
      "preserved the historical manifests and failure records untouched, each measured at its recorded digest",
      "did not re-run, re-read or regenerate the artifact's suite, and did not write to the artifact",
    ],
  },
  {
    id: "OWNER-DECISION-2",
    title: "PRE-ADMISSION SEQUENCE",
    decision_verbatim: [
      "OWNER DECISION 2 — PRE-ADMISSION SEQUENCE",
      "",
      "Gate 5.5 specification and Gate 5.6 validation may use a finalized, scoped Gate 5.4 rule record that is NOT_ADMITTED. Gate 5.7 remains the admission step after successful preceding gates.",
      "",
      "An unadmitted rule must remain unable to emit consumer results. Do not admit the rule early to satisfy the circular requirement.",
    ].join("\n"),
    what_it_authorises: [
      "Gate 5.5 specification and Gate 5.6 validation to read the finalised, scoped Gate 5.4 rule record while it is NOT_ADMITTED",
      "the pre-admission sequence to be recorded in the governing document by quoted-replacement amendment",
    ],
    what_it_expressly_does_not_do: [
      "it does not admit the rule: Gate 5.7 remains the admission step, after successful preceding gates",
      "it does not permit an unadmitted rule to emit a consumer result, and it does not weaken the prohibition in the Gate 5.5 sentence",
      "it does not permit the rule to be admitted early in order to satisfy the circular requirement",
      "it does not change any gate's own conditions, the finding model, the stop conditions or the permanent exclusions",
    ],
    what_this_order_did_under_it: [
      "identified the exact governing clauses that create the circular prerequisite (amendment_authority_analysis.json: CIR-1, CIR-2, CIR-3, with the sequencing and admission clauses quoted)",
      "applied the minimum quoted-replacement amendment through the governing procedure (amendments_001s.js, amendment_application_result.json, amendment_text.json), preserving every other gate requirement and recording the amendment history",
      "recorded the amendment in the amended document itself, as Core Constitution section 6.5 requires",
    ],
  },
];

const ownerDecisionsOut = {
  artifact: "owner_decisions.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document_type: "OWNER DECISION RECORD — the two decisions this order carries, quoted, with what each does and does not do",
  purpose:
    "record the two owner decisions verbatim, so that the authority this order acts under is durable and its limits cannot be read past",
  decisions,
  decision_count: decisions.length,
  what_neither_decision_does: [
    "neither decision admits a governed rule, creates coverage or a candidate, or creates a finding class",
    "neither decision authorises consumer-visible output, an application change, a deployment or an external transmission",
    "neither decision changes the observation-only classification or the packet-ineligible status of this work",
    "neither decision clears any register row, promotes any record or changes the corpus-wide gate states",
  ],
  verdict: "TWO OWNER DECISIONS RECORDED — one custody exception and one pre-admission sequence, each with its limits stated",
  created_by: "PHASE5-001S",
};
fs.writeFileSync(path.join(OUT, "owner_decisions.json"), JSON.stringify(ownerDecisionsOut, null, 2), "utf8");

const disclosed = r001rPreservation.disclosed_changes_by_this_order[0];

// ---- the supplemental custody decision (Owner Decision 1) -----------------------------------------------
const supplement = {
  artifact: "custody_supplement.json",
  work_order: "PHASE5-001S",
  created_utc: "2026-09-30",
  document_type: "SUPPLEMENTAL CUSTODY DECISION — Owner Decision 1, recorded",
  purpose:
    "link the original recorded hash, the current measured hash, the cause, the affected order and the prospective baseline of one artifact, and record exactly what the exception does and does not do",
  issued_under: "OWNER DECISION 1 — CUSTODY EXCEPTION (owner_decisions.json)",
  the_artifact: {
    relative_path_from_workspace: RETENTION_PATH,
    owning_package: "SOURCE_CAPTURES\\PHASE5-001I-A (the internal-validation package of PHASE5-001I-A)",
    artifact: "test_results_001i_a.json",
    status_under_this_decision:
      "CURRENT RETAINED ARTIFACT — accepted for prospective use at its full measured hash",
  },
  the_chain: {
    original_recorded_hash: ORIGINAL_HASH,
    original_recorded_bytes: iaRow ? iaRow.bytes : null,
    original_hash_recorded_by:
      "SOURCE_CAPTURES\\PHASE5-001I-A\\file_custody_manifest.json (the manifest of the order that owns the artifact)",
    current_measured_hash: currentHash,
    current_measured_bytes: currentBytes,
    current_hash_measured_by: "PHASE5-001S, read-only, immediately before this record was written",
    current_hash_matches_what_PHASE5_001R_recorded_as_the_after_state: currentHash === (disclosed ? disclosed.after : null),
    cause:
      'PHASE5-001R re-ran the PHASE5-001I-A internal test suite to measure its implementation comparison\'s "its tests pass" point. That suite\'s harness (tests/harness.cjs, in its finish() step) writes its results into its own package, so running the suite rewrites the package\'s own results file.',
    affected_order: "PHASE5-001R — the order that ran the suite and caused the change",
    owning_order_of_the_artifact: "PHASE5-001I-A",
    disclosure_record:
      "SOURCE_CAPTURES\\PHASE5-001R\\preservation_and_change_record.json (disclosed_changes_by_this_order) and SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json (acceptance criterion 7, NAMED — NOT MET IN THIS SCOPE)",
    unauthorised_at_the_time: disclosed ? disclosed.unauthorised : true,
    authorised_by_at_the_time: disclosed ? disclosed.authorised_by : "nothing",
    recurrence_removed: disclosed ? disclosed.recurring : null,
  },
  what_the_artifact_holds_now: {
    measured_by_this_order: "the file was parsed read-only at its measured digest; its suite was not run",
    work_order_recorded_inside_it: currentContent.work_order,
    test_count: currentContent.test_count,
    failures: currentContent.failures,
    verdict_recorded_inside_it: currentContent.verdict,
    reading:
      "the artifact is the same suite's results, regenerated: the same tests, 0 failures. No evidence is lost; the byte-level identity of the file is.",
    and_this_is_not_evidence:
      "Owner Decision 1 records that these passing tests are NOT Gate 5.6 evidence, and this order treats them as no evidence for any gate. The comparison that reads them is not gate evidence either.",
  },
  what_this_exception_does: [
    "accepts the regenerated artifact as the CURRENT retained artifact",
    "authorises prospective use of it at its full measured hash, which the prospective baseline now records",
  ],
  what_this_exception_does_not_do: [
    "it does not retroactively authorise the original write: that write remains unauthorised in the historical record",
    "it does not establish that the old bytes were recovered: they were not, and they cannot be reconstructed from a digest",
    "it does not erase the preservation failure: PHASE5-001R's criterion 7 stays NAMED — NOT MET IN THIS SCOPE in its own record, which is preserved unchanged",
    "it does not retroactively authorise any earlier custody discrepancy, including the ones earlier orders recorded and did not authorise",
    "it does not authorise any reuse of the writing harness: re-running any harness that writes into a prior evidence package remains forbidden",
    "it does not convert the historical failure into a pass, a gap or a refusal, and it changes no count",
  ],
};


supplement.historical_records_preserved_unchanged = [
  {
    path: "SOURCE_CAPTURES\\PHASE5-001I-A\\file_custody_manifest.json",
    sha256: sha256(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001I-A", "file_custody_manifest.json")),
    still_holds:
      "the original digest " + ORIGINAL_HASH + " for the artifact, which is deliberately NOT updated: the manifest records what the artifact was when that order closed.",
    edited_by_this_order: false,
  },
  {
    path: RETENTION_PATH,
    sha256: currentHash,
    still_holds: "the regenerated results",
    edited_by_this_order: false,
    note: "read-only: this order measured it and parsed it, and wrote nothing to it.",
  },
  {
    path: "SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json",
    sha256: sha256(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "scoped_gate_5_5_verdict.json")),
    still_holds:
      "the WITHHELD verdict and criterion 7 as " + (criterion7 ? criterion7.state : "NAMED — NOT MET IN THIS SCOPE"),
    edited_by_this_order: false,
  },
  {
    path: "SOURCE_CAPTURES\\PHASE5-001R\\preservation_and_change_record.json",
    sha256: sha256(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "preservation_and_change_record.json")),
    still_holds: "the disclosed change with unauthorised: true and the verdict PRESERVATION NOT FULLY HELD",
    edited_by_this_order: false,
  },
  {
    path: "SOURCE_CAPTURES\\PHASE5-001R\\verification_results.json",
    sha256: sha256(path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001R", "verification_results.json")),
    still_holds:
      "that order's " + r001rVerification.check_count + " checks with " + r001rVerification.failure_count + " failures",
    edited_by_this_order: false,
  },
];

supplement.no_earlier_baseline_overwritten = [
  "SOURCE_CAPTURES\\PHASE5-001I-A\\preserved_files_before.json, SOURCE_CAPTURES\\PHASE5-001I-B\\preserved_files_before.json, SOURCE_CAPTURES\\PHASE5-001I-C\\preserved_files_before.json, SOURCE_CAPTURES\\PHASE5-001P\\preserved_files_before.json, SOURCE_CAPTURES\\PHASE5-001Q\\preserved_files_before.json and SOURCE_CAPTURES\\PHASE5-001R\\preserved_files_before.json are all untouched: this order wrote its own baseline under its own package and did not rewrite any earlier one",
  "the historical failure records and manifests stay where they were written, each measured at its recorded digest above",
];

supplement.progression_assessment = {
  the_question:
    "does the preservation criterion that withheld the PHASE5-001R verdict now permit progression for this scope?",
  historical_state:
    "FAILED AND STILL FAILED — PHASE5-001R acceptance criterion 7 remains NAMED — NOT MET IN THIS SCOPE in that order's verdict, and the change remains unauthorised in its preservation record. This order edits neither record and restates the failure as nothing else.",
  state_under_the_exception:
    "COVERED BY A RECORDED OWNER EXCEPTION — the owner has accepted the current artifact as the retained artifact and authorised prospective use of it at its full measured hash, so the obstacle to progression that the failure created is cleared without the failure being denied or repaired.",
  what_progression_this_clears: [
    "the scoped Gate 5.5 verdict for this scope may now be issued on a preservation reading covered by a recorded owner instrument",
    "the Gate 5.6 order may issue for this scope once every preceding scoped gate holds a passing verdict",
  ],
  what_it_does_not_clear: [
    "it does not restore the previous bytes, and the artifact's byte-level identity remains different from the one its own manifest holds",
    "it does not validate the artifact's content, and its tests remain non-evidence for Gate 5.6",
    "it clears nothing for any other scope, and it leaves Gate 5.5 unpassed corpus-wide",
  ],
};

supplement.prospective_baseline = {
  artifact: "SOURCE_CAPTURES\\PHASE5-001S\\prospective_baseline.json",
  what_it_records:
    "the workspace as it stands after this order's amendment, with the retained artifact at its full measured hash",
  hash_recorded_there: currentHash,
};

supplement.limitations = [
  "this is a custody record about byte identity and prospective use. It certifies no legal content, validates no test result and passes no gate",
  "it does not repair the preservation failure and does not present the original write as authorised",
  "it authorises nothing outside the artifact named above",
  "observation-only, packet-ineligible: it produces no consumer-visible output and changes no application behaviour",
];

supplement.verdict =
  currentHash === "6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511" &&
  currentContent.test_count === 41 &&
  currentContent.failures === 0
    ? "SUPPLEMENTAL CUSTODY DECISION RECORDED — the chain (original hash, current measured hash, cause, affected order, prospective baseline) is linked, the historical failure is preserved as a failure, and prospective use of the current artifact at its full measured hash is covered by the recorded owner exception"
    : "CHECK — the artifact does not measure as the chain records";
supplement.created_by = "PHASE5-001S";

fs.writeFileSync(path.join(OUT, "custody_supplement.json"), JSON.stringify(supplement, null, 2), "utf8");
console.log(ownerDecisionsOut.verdict);
console.log(supplement.verdict);
console.log("  original: " + ORIGINAL_HASH);
console.log(
  "  current : " + currentHash + " (" + currentBytes + " bytes, " + currentContent.test_count + " tests, " + currentContent.failures + " failures)",
);

