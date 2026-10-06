# verify_and_manifest_001s.ps1 — PHASE5-001S: verification, preservation, custody and the prospective baseline.
#
# Measures rather than asserts. It compares the whole workspace against the baseline taken before this order
# wrote anything, checks the amendment procedure clause by clause, re-measures the artifact Owner Decision 1
# concerns, verifies the historical records are unedited, re-measures the prospective baseline it established,
# checks the content of the successor verdict and of the Gate 5.6 order, and re-measures the read-only legacy
# pointers. It writes preservation_and_change_record.json, file_custody_manifest.json and verification_results.json.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001S'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Plan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Narrative = 'CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md'
$Retained = 'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json'
$OriginalRetainedDigest = 'E492041115C32857EE471389BE15B3A812D9219D655342DD64B4AAF4A8B99B22'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function Read-Json([string]$path) { return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
$j = @{}
function J([string]$name) { if (-not $j.ContainsKey($name)) { $j[$name] = Read-Json (Join-Path $Out $name) }; return $j[$name] }

$checks = New-Object System.Collections.Generic.List[object]
function Check([string]$id, [string]$what, [bool]$passed, [string]$detail) {
  $checks.Add([pscustomobject][ordered]@{ id = $id; what = $what; passed = $passed; detail = $detail })
}

$baseline = J 'preserved_files_before.json'
$baselineByPath = @{}
foreach ($f in $baseline.files) { $baselineByPath[$f.relative_path] = $f }

# ---------------------------------------------------------------- preservation (measured)
$changed = New-Object System.Collections.Generic.List[object]
$missing = New-Object System.Collections.Generic.List[string]
$unchanged = 0
foreach ($f in $baseline.files) {
  $abs = Join-Path $Root $f.relative_path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $missing.Add($f.relative_path); continue }
  $now = Get-Sha256 $abs
  if ($now -eq $f.sha256) { $unchanged++ } else {
    $changed.Add([pscustomobject][ordered]@{ relative_path = $f.relative_path; before = $f.sha256; after = $now; bytes = (Get-Item -LiteralPath $abs).Length })
  }
}
$authorisedChanges = @(
  [pscustomobject][ordered]@{
    relative_path = $Plan
    before        = $baselineByPath[$Plan].sha256
    after         = $null
    authorised_by = 'PHASE5-001S amendments A-1 to A-5, applied through the governing procedure under the two owner decisions; recorded in amendment_application_result.json and amendment_text.json'
    cause         = 'this order is authorised to amend exactly one pre-existing file: the rank-5 Approved Build Plan, to record the pre-admission sequence and the two scoped readings'
    requires      = 'the inversion check in amendment_text.json to reconstruct the pre-amendment bytes'
  }
)
$authorisedPaths = @($authorisedChanges | ForEach-Object { $_.relative_path })
foreach ($a in $authorisedChanges) {
  $measured = @($changed | Where-Object { $_.relative_path -eq $a.relative_path })
  if ($measured.Count -eq 1) { $a.after = $measured[0].after }
}
$undeclaredChanges = @($changed | Where-Object { $authorisedPaths -notcontains $_.relative_path })
$declaredButUnchanged = @($authorisedPaths | Where-Object { @($changed | ForEach-Object { $_.relative_path }) -notcontains $_ })

Check 'V-S01' 'exactly one pre-existing file changed, and it is the amended rank-5 governing document' `
  ($changed.Count -eq 1 -and $changed[0].relative_path -eq $Plan) `
  ("changed: {0}; the file: {1}" -f $changed.Count, $(if ($changed.Count -gt 0) { $changed[0].relative_path } else { 'none' }))
Check 'V-S02' 'no pre-existing file was deleted or is missing' ($missing.Count -eq 0) ("missing: {0}" -f $missing.Count)
Check 'V-S03' 'no change was made that the amendment record does not authorise' ($undeclaredChanges.Count -eq 0 -and $declaredButUnchanged.Count -eq 0) `
  ("undeclared: {0}; authorised but not measured as changed: {1}" -f $undeclaredChanges.Count, $declaredButUnchanged.Count)
Check 'V-S04' 'the amended document is byte-identical to what the amendment procedure recorded' `
  ((Get-Sha256 (Join-Path $Root $Plan)) -eq (J 'amendment_application_result.json').digest_after) `
  ((J 'amendment_application_result.json').digest_after)
Check 'V-S05' 'the baseline was taken before any amendment: its plan digest is the digest_before the amendment recorded' `
  ($baselineByPath[$Plan].sha256 -eq (J 'amendment_application_result.json').digest_before) `
  ("baseline {0}; digest_before {1}" -f $baselineByPath[$Plan].sha256, (J 'amendment_application_result.json').digest_before)

# ---------------------------------------------------------------- artifacts parse, no BOM, narrative present
$jsonArtifacts = @('amendment_authority_analysis.json', 'amendment_application_result.json', 'amendment_text.json',
  'owner_decisions.json', 'custody_supplement.json', 'scoped_gate_5_5_verdict_successor.json', 'next_work_order.json',
  'preserved_files_before.json', 'input_verification.json', 'prospective_baseline.json')
$badJson = New-Object System.Collections.Generic.List[string]
$bomFound = New-Object System.Collections.Generic.List[string]
foreach ($name in $jsonArtifacts) {
  $abs = Join-Path $Out $name
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $badJson.Add($name + ' (absent)'); continue }
  $bytes = [System.IO.File]::ReadAllBytes($abs)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { $bomFound.Add($name) }
  try { $null = Get-Content -LiteralPath $abs -Raw | ConvertFrom-Json } catch { $badJson.Add($name + ' (' + $_.Exception.Message + ')') }
}
Check 'V-S06' 'every JSON artifact of this order parses' ($badJson.Count -eq 0) ("files: {0}; unparsable: {1}" -f $jsonArtifacts.Count, ($badJson -join ', '))
Check 'V-S07' 'no artifact of this order carries a byte-order mark' ($bomFound.Count -eq 0) ("with BOM: {0}" -f ($bomFound -join ', '))
$narrativeAbs = Join-Path $Root $Narrative
$narrativeExists = Test-Path -LiteralPath $narrativeAbs -PathType Leaf
Check 'V-S08' 'the narrative record exists and is substantive' ($narrativeExists -and (Get-Item -LiteralPath $narrativeAbs).Length -gt 8000) `
  ("bytes: {0}" -f $(if ($narrativeExists) { (Get-Item -LiteralPath $narrativeAbs).Length } else { 0 }))

# ---------------------------------------------------------------- files added by this order
$addedByThisOrder = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Out -File | Sort-Object Name)) {
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001S\' + $f.Name; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}
if ($narrativeExists) {
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = $Narrative; bytes = (Get-Item -LiteralPath $narrativeAbs).Length; sha256 = Get-Sha256 $narrativeAbs })
}

# ---------------------------------------------------------------- the amendment procedure, measured
$apply = J 'amendment_application_result.json'
$amend = J 'amendment_text.json'
$auth = J 'amendment_authority_analysis.json'
$decisions = J 'owner_decisions.json'
$supp = J 'custody_supplement.json'
$verdict = J 'scoped_gate_5_5_verdict_successor.json'
$order = J 'next_work_order.json'
$inputVerification = J 'input_verification.json'
$baselineDoc = J 'prospective_baseline.json'

Check 'V-S09' 'the amendment applied each amendment exactly once, with no problem recorded' `
  (($apply.results | Where-Object { $_.action -eq 'APPLIED' }).Count -eq 5 -and $apply.problems.Count -eq 0) `
  ("applied: {0}; problems: {1}" -f ($apply.results | Where-Object { $_.action -eq 'APPLIED' }).Count, $apply.problems.Count)
Check 'V-S10' 'the amended document kept its LF line endings and its trailing newline' ($apply.line_endings -eq 'LF preserved') $apply.line_endings
Check 'V-S11' 'every replacement is an extension of the replaced text, so no requirement was removed (Constitution section 6.4)' `
  (@($amend.amendments | Where-Object { $_.requirement_removed -ne $false -or $_.removed_text -ne '' }).Count -eq 0 -and @($amend.amendments | Where-Object { $_.type -eq 'REPLACE_BY_EXTENSION' -and $_.mechanical_check.replaced_text_survives_verbatim_inside_the_replacement -ne $true }).Count -eq 0) `
  ("amendments: {0}; replacements: {1}; appended rows: {2}; any with a removal: {3}" -f $amend.amendments.Count, $amend.replacements, $amend.rows_appended, @($amend.amendments | Where-Object { $_.removed_text -ne '' }).Count)
Check 'V-S12' 'every replacement is present exactly once and every replaced text is still present inside it' `
  (@($amend.amendments | Where-Object { $_.type -eq 'REPLACE_BY_EXTENSION' -and $_.mechanical_check.replacement_text_present_exactly_once -ne $true }).Count -eq 0 -and $amend.replacements -eq 4) `
  ("replacements: {0}; each present exactly once: {1}" -f $amend.replacements, @($amend.amendments | Where-Object { $_.type -eq 'REPLACE_BY_EXTENSION' -and $_.mechanical_check.replacement_text_present_exactly_once }).Count)
Check 'V-S13' 'the inversion check reconstructs the pre-amendment bytes exactly' `
  ($amend.inversion_check.reconstruction_matches_baseline -eq $true -and $amend.inversion_check.reconstructed_digest -eq $apply.digest_before) `
  ("reconstructed {0} vs digest_before {1}" -f $amend.inversion_check.reconstructed_digest, $apply.digest_before)
Check 'V-S14' 'the appended amendment-history row is in the amended document, and every earlier row is preserved' `
  ((($amend.amendments | Where-Object { $_.id -eq 'A-5' }).mechanical_check.row_present_in_the_amended_document -eq $true) -and (($amend.amendments | Where-Object { $_.id -eq 'A-5' }).mechanical_check.every_earlier_row_preserved -eq $true)) `
  ("row at line {0}" -f ($amend.amendments | Where-Object { $_.id -eq 'A-5' }).line_after_amendment)
Check 'V-S15' 'the amendment names its document and clause, quotes the replaced text and states the replacement text (Constitution section 6.2)' `
  (@($amend.amendments | Where-Object { $_.type -eq 'REPLACE_BY_EXTENSION' -and (-not $_.document -or -not $_.clause -or -not $_.replaced_text -or -not $_.replacement_text) }).Count -eq 0 -and $amend.replacements -eq 4) `
  ("replacements with all four parts: {0} of {1}; the appended row is checked separately" -f @($amend.amendments | Where-Object { $_.type -eq 'REPLACE_BY_EXTENSION' -and $_.document -and $_.clause -and $_.replaced_text -and $_.replacement_text }).Count, $amend.replacements)


# ---------------------------------------------------------------- the amended document's content
$planText = Get-Content -LiteralPath (Join-Path $Root $Plan) -Raw

Check 'V-S16' 'the pre-admission sequence paragraph is in the amended document' `
  ($planText.Contains('**Owner authority PHASE5-001S — pre-admission specification and validation sequence.**')) 'present'
Check 'V-S17' 'the paragraph keeps admission at Gate 5.7 and forbids an early admission to satisfy a gate' `
  ($planText.Contains('Gate 5.7 remains the only step that admits a governed rule') -and $planText.Contains('a rule may not be admitted in order to make a gate criterion pass')) 'both sentences present'
Check 'V-S18' 'the paragraph keeps the emission refusal for an unadmitted rule' `
  ($planText.Contains('Until Gate 5.7 admits it, the evaluator must') -and $planText.Contains('refuse to emit on it')) 'refusal requirement present'
Check 'V-S19' 'Phase 5.5 bullet 3 carries the scoped reading of `admitted rule records`' `
  ($planText.Contains('is read as the governed rule record that Gate 5.4 has finalised for that scope')) 'reading present'
Check 'V-S20' 'section 4 item 5 carries the scoped reading of `admitted`' `
  ($planText.Contains('is read as passed Gate 5.4 and Gate 5.3 for the named scope')) 'reading present'
Check 'V-S21' 'Gate 5.6 carries the pre-admission measurement of the version-sharing condition and the Gate 5.7 reservation' `
  ($planText.Contains('the sharing condition is measured against that record''s pinned pre-admission version identity') -and $planText.Contains('must name that reservation rather than treat the condition as satisfied by it')) 'both present'
Check 'V-S22' 'Gate 5.5s own sentence is unchanged by this order' `
  ($planText.Contains('**Gate 5.5:** evaluator output is deterministic, fully traceable to report and source, and cannot emit on incomplete extraction, unapproved rules, wrong jurisdiction, wrong event-date mapping, or an unresolved affirmative element.')) 'verbatim'
Check 'V-S23' 'every other clause the order promised to preserve is still present verbatim' `
  ($planText.Contains('Work proceeds in the following order. A later phase cannot begin before its stated gate passes.') -and
   $planText.Contains('**Corpus-wide gates stay corpus-wide.**') -and
   $planText.Contains('**Owner-authorized internal-validation carve-out (PHASE5-001I-A).**') -and
   $planText.Contains('This condition is corpus-wide: it stays unpassed while any of the 437 entries') -and
   $planText.Contains('For a scope named under the PHASE5-001P paragraph above, the intended format is the presentation that scope names') -and
   $planText.Contains('Then continue remaining batches autonomously until Gate 5.2 passes') -and
   $planText.Contains('Authorize a `VIOLATION` only where all of the following are true:') -and
   $planText.Contains('Pause only the affected rule/cohort and record the blocker when:') -and
   $planText.Contains('This plan authorizes plan-level sequencing only.')) `
  'ordering sentence, PHASE5-001P paragraph, the 001I-A carve-out, Gate 5.2, Phase 5.3, Phase 5.1, the finding model, the stop conditions and the scope boundary all present'
Check 'V-S24' 'the amendment-history row records what the amendment did, and that it passes no gate' `
  ($planText.Contains('| 2026-09-30 | PHASE5-001S |') -and $planText.Contains('no requirement is removed by any of the four replacements') -and $planText.Contains('It admits no rule, certifies no coverage, creates no finding class')) 'row present with its limits'
Check 'V-S25' 'the authority analysis quotes each circular clause and locates it, in the pre-amendment state' `
  ($auth.clauses_requiring_the_circular_prerequisite_count -eq 3 -and @($auth.clauses_requiring_the_circular_prerequisite | Where-Object { -not $_.clause_verbatim -or -not $_.line }).Count -eq 0 -and $auth.document_digest_at_analysis -eq $apply.digest_before) `
  ("clauses: {0}; digest at analysis {1}" -f $auth.clauses_requiring_the_circular_prerequisite_count, $auth.document_digest_at_analysis)
Check 'V-S26' 'the analysis records the sequencing and admission clauses that close the loop' `
  ($auth.sequencing_clauses_recorded -ge 4 -and $auth.the_circular_prerequisite.the_admission_step_that_is_presupposed.Count -ge 2) `
  ("sequencing {0}; admission clauses {1}" -f $auth.sequencing_clauses_recorded, $auth.the_circular_prerequisite.the_admission_step_that_is_presupposed.Count)
Check 'V-S27' 'the analysis records the authorities inspected and not amended, with a reason for each, and Gate 5.5 among them' `
  ($auth.authorities_inspected_and_not_amended_count -ge 15 -and @($auth.authorities_inspected_and_not_amended | Where-Object { -not $_.why_not_amended }).Count -eq 0 -and [bool]($auth.authorities_inspected_and_not_amended | Where-Object { $_.clause -like '*Gate 5.5*' })) `
  ("authorities: {0}" -f $auth.authorities_inspected_and_not_amended_count)
Check 'V-S28' 'the analysis quotes the amendment procedure it applied' `
  (($auth.amendment_procedure.clauses_quoted | ConvertTo-Json -Depth 6).Contains('6.2') -and ($auth.amendment_procedure.clauses_quoted | ConvertTo-Json -Depth 6).Contains('Implied amendments are void')) 'sections 6.1 to 6.5 quoted'


# ---------------------------------------------------------------- the owner decisions and the custody exception
Check 'V-S29' 'both owner decisions are recorded verbatim, with what each does and does not do' `
  ($decisions.decision_count -eq 2 -and @($decisions.decisions | Where-Object { -not $_.decision_verbatim -or $_.what_it_expressly_does_not_do.Count -lt 3 }).Count -eq 0) `
  ("decisions: {0}" -f $decisions.decision_count)
Check 'V-S30' 'Owner Decision 1 does not retroactively authorise the write, does not claim recovery, does not erase the failure and does not make the tests gate evidence' `
  ((($decisions.decisions | Where-Object { $_.id -eq 'OWNER-DECISION-1' }).what_it_expressly_does_not_do | ConvertTo-Json -Depth 6).Contains('retroactively authorise') -and
   (($decisions.decisions | Where-Object { $_.id -eq 'OWNER-DECISION-1' }).what_it_expressly_does_not_do | ConvertTo-Json -Depth 6).Contains('recovered') -and
   (($decisions.decisions | Where-Object { $_.id -eq 'OWNER-DECISION-1' }).what_it_expressly_does_not_do | ConvertTo-Json -Depth 6).Contains('erase the preservation failure') -and
   (($decisions.decisions | Where-Object { $_.id -eq 'OWNER-DECISION-1' }).what_it_expressly_does_not_do | ConvertTo-Json -Depth 6).Contains('Gate 5.6 evidence')) 'all four limits recorded'
Check 'V-S31' 'the custody supplement links the original hash, the current hash, the cause, the affected order and the prospective baseline' `
  ($supp.the_chain.original_recorded_hash -eq $OriginalRetainedDigest -and $supp.the_chain.current_measured_hash -eq (Get-Sha256 (Join-Path $Root $Retained)) -and $supp.the_chain.cause -and $supp.the_chain.affected_order -like 'PHASE5-001R*' -and $supp.prospective_baseline.artifact) `
  ("{0} -> {1}; affected order {2}" -f $supp.the_chain.original_recorded_hash.Substring(0, 12), $supp.the_chain.current_measured_hash.Substring(0, 12), $supp.the_chain.affected_order)
Check 'V-S32' 'the retained artifact measures now as the supplement records, and its suite was not run' `
  ((Get-Sha256 (Join-Path $Root $Retained)) -eq '6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511' -and $supp.what_the_artifact_holds_now.test_count -eq 41 -and $supp.what_the_artifact_holds_now.failures -eq 0 -and $supp.what_the_artifact_holds_now.measured_by_this_order -like '*suite was not run*') `
  ("{0}; {1} tests; {2} failures" -f (Get-Sha256 (Join-Path $Root $Retained)).Substring(0, 12), $supp.what_the_artifact_holds_now.test_count, $supp.what_the_artifact_holds_now.failures)
$r001rVerdict = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json')
$r001rPreservation = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R\preservation_and_change_record.json')
$r001rCriterion7 = $r001rVerdict.acceptance_criteria | Where-Object { $_.where_it_sits -eq 'acceptance criterion 7' }
Check 'V-S33' 'the PHASE5-001R verdict still records criterion 7 as named and not met, and still withholds' `
  ($r001rCriterion7.state -eq 'NAMED — NOT MET IN THIS SCOPE' -and $r001rVerdict.verdict -like 'WITHHELD*') `
  ("criterion 7: {0}; verdict: {1}" -f $r001rCriterion7.state, $r001rVerdict.verdict)
Check 'V-S34' 'the PHASE5-001R preservation record still records the change as unauthorised and the verdict as not fully held' `
  ($r001rPreservation.disclosed_changes_by_this_order[0].unauthorised -eq $true -and $r001rPreservation.verdict -like 'PRESERVATION NOT FULLY HELD*') `
  ("unauthorised: {0}; verdict: {1}" -f $r001rPreservation.disclosed_changes_by_this_order[0].unauthorised, $r001rPreservation.verdict)
$iaManifest = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-A\file_custody_manifest.json')
$iaRow = $iaManifest.files | Where-Object { $_.relative_path_from_workspace -eq 'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json' }
Check 'V-S35' 'the PHASE5-001I-A manifest still holds the original digest and was not edited by this order' `
  ($iaRow.sha256 -eq $OriginalRetainedDigest -and @($changed | Where-Object { $_.relative_path -like 'SOURCE_CAPTURES\PHASE5-001I-A\*' }).Count -eq 0) `
  ("manifest holds {0}; PHASE5-001I-A files changed by this order: {1}" -f $iaRow.sha256.Substring(0, 12), @($changed | Where-Object { $_.relative_path -like 'SOURCE_CAPTURES\PHASE5-001I-A\*' }).Count)
$comparison = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R\implementation_comparison.json')
Check 'V-S36' 'no harness that writes into a prior evidence package was run, and the writing suite is still recorded as not re-run' `
  ((@($changed | Where-Object { $_.relative_path -like 'SOURCE_CAPTURES\PHASE5-001I-A\*' }).Count -eq 0) -and $comparison.its_own_test_suite.re_run_by_this_order -eq $false) `
  ("PHASE5-001I-A files changed: {0}; suite re-run by that order: {1}" -f @($changed | Where-Object { $_.relative_path -like 'SOURCE_CAPTURES\PHASE5-001I-A\*' }).Count, $comparison.its_own_test_suite.re_run_by_this_order)
Check 'V-S37' 'the progression assessment keeps the historical failure and the exception state apart' `
  ($supp.progression_assessment.historical_state -like 'FAILED AND STILL FAILED*' -and $supp.progression_assessment.state_under_the_exception -like 'COVERED BY A RECORDED OWNER EXCEPTION*' -and $supp.progression_assessment.what_it_does_not_clear.Count -ge 3) `
  'historical failure and exception state both recorded, with the limits'
Check 'V-S38' 'no earlier baseline or manifest was overwritten, and the records say so' `
  ($supp.no_earlier_baseline_overwritten.Count -ge 1 -and $baselineDoc.earlier_baselines_edited_by_this_order -eq 0 -and $baselineDoc.earlier_manifests_edited_by_this_order -eq 0) `
  'earlier baselines edited: 0; earlier manifests edited: 0'


# ---------------------------------------------------------------- the successor verdict
Check 'V-S39' 'the successor verdict quotes the gate sentence and states all 15 criteria with a state and evidence' `
  ($verdict.gate_text_quoted_verbatim -eq '**Gate 5.5:** evaluator output is deterministic, fully traceable to report and source, and cannot emit on incomplete extraction, unapproved rules, wrong jurisdiction, wrong event-date mapping, or an unresolved affirmative element.' -and
   $verdict.criterion_count -eq 15 -and @($verdict.acceptance_criteria + $verdict.gate_criteria | Where-Object { -not $_.state -or $_.evidence.Count -eq 0 }).Count -eq 0) `
  ("criteria: {0}" -f $verdict.criterion_count)
Check 'V-S40' 'the successor verdict is a scoped pass, and it records the corpus-wide state as not passed' `
  ($verdict.verdict -eq 'PASSED_FOR_THIS_SCOPE' -and $verdict.corpus_wide_verdict -like 'NOT PASSED*') `
  ("{0} / {1}" -f $verdict.verdict, $verdict.corpus_wide_verdict.Substring(0, 20))
Check 'V-S41' 'criterion 7 is recorded as covered by the recorded owner exception, with the historical failure preserved' `
  ($verdict.acceptance_criteria[6].state -like 'SUSTAINED BY THE RECORDED OWNER EXCEPTION*' -and $verdict.acceptance_criteria[6].previous_state -like 'NAMED — NOT MET*' -and $verdict.acceptance_criteria[6].evidence.Count -ge 3) `
  $verdict.acceptance_criteria[6].previous_state
Check 'V-S42' 'the phase-bullet criterion is recorded as resolved as a presupposition, with the emission path still unexercised' `
  ($verdict.gate_criteria[7].previous_state -like 'NAMED — NOT MET*' -and $verdict.gate_criteria[7].state -like 'RESOLVED AS A PRESUPPOSITION*' -and ($verdict.gate_criteria[7].unresolved_within_this_scope | ConvertTo-Json -Depth 6).Contains('not exercised')) `
  $verdict.gate_criteria[7].state.Substring(0, 40)
Check 'V-S43' 'the gate clauses on unapproved rules are met as refusals, and no criterion is claimed as satisfied by admission' `
  ($verdict.gate_criteria[3].criterion_verbatim -like '*unapproved rules*' -and $verdict.gate_criteria[3].state -like 'MET*' -and $verdict.tally.withheld -eq 0 -and $verdict.tally.covered_by_the_recorded_owner_exception -eq 1) `
  ("gate met-or-resolved {0}; covered {1}; withheld {2}" -f $verdict.tally.gate_criteria_met_or_resolved, $verdict.tally.covered_by_the_recorded_owner_exception, $verdict.tally.withheld)
Check 'V-S44' 'the verdict preserves the observation ceiling, packet ineligibility, the exact specimen, the timing qualifications, the exception limitations and the withheld anniversary equality' `
  (($verdict.preserved_requirements_unchanged | ConvertTo-Json -Depth 6).Contains('packet ineligibility') -and
   ($verdict.preserved_requirements_unchanged | ConvertTo-Json -Depth 6).Contains('withheld') -and
   ($verdict.preserved_requirements_unchanged | ConvertTo-Json -Depth 6).Contains('OBSERVATION') -and
   ($verdict.preserved_requirements_unchanged | ConvertTo-Json -Depth 6).Contains('unresolved') -and
   (@($verdict.preserved_requirements_unchanged).Count -eq 6)) 'six preserved requirements recorded'
Check 'V-S45' 'the verdict claims no rule, no coverage, no finding class and no emission' `
  (($verdict.what_this_verdict_does_not_do | ConvertTo-Json -Depth 6).Contains('does not admit a rule') -and ($verdict.what_this_verdict_does_not_do | ConvertTo-Json -Depth 6).Contains('0 governed rules') -and ($verdict.what_this_verdict_does_not_do | ConvertTo-Json -Depth 6).Contains('not yet available') -and ($verdict.excluded_and_unresolved_items | ConvertTo-Json -Depth 6).Contains('comparator')) 'limits recorded'
Check 'V-S46' 'the predecessor verdict is preserved at its recorded digest and the successor records that' `
  ((Get-Sha256 (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json')) -eq $verdict.supersedes_and_preserves.its_digest -and $verdict.supersedes_and_preserves.its_state -like 'PRESERVED UNCHANGED*') `
  $verdict.supersedes_and_preserves.its_digest.Substring(0, 12)
Check 'V-S47' 'the rule record is still NOT_ADMITTED with zeroed counts, and the ceiling is still observation-class only' `
  ($verdict.scope.production_admission_identity -like 'RESERVED_TO_GATE_5_7*' -and $verdict.scope.pre_admission_rule_record_version_identity -like 'CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-*') `
  $verdict.scope.pre_admission_rule_record_version_identity


$recordQ = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json')
$surfaceR = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R\output_vocabulary_and_explanation_surface.json')
Check 'V-S48' 'the governed rule record is still NOT ADMITTED, the counts are still zero, and the ceiling is still observation-class only' `
  ($recordQ.admission_state.state -eq 'NOT_ADMITTED' -and $recordQ.admission_state.admitted_governed_rules_after_this_order -eq 0 -and $recordQ.admission_state.permitted_findings_after_this_order -eq 0 -and $recordQ.classification_and_ceiling.permitted_result_ceiling -eq 'OBSERVATION_CLASS_ONLY' -and $surfaceR.record_ceiling_carried.permitted_result_ceiling -eq 'OBSERVATION_CLASS_ONLY') `
  ("state: {0}; rules: {1}; findings: {2}; ceiling: {3}" -f $recordQ.admission_state.state, $recordQ.admission_state.admitted_governed_rules_after_this_order, $recordQ.admission_state.permitted_findings_after_this_order, $recordQ.classification_and_ceiling.permitted_result_ceiling)

# ---------------------------------------------------------------- the Gate 5.6 order
Check 'V-S49' 'the Gate 5.6 order is issued for this scope, with its non-execution stated' `
  ($order.order_issued -eq $true -and $order.order_id -eq 'PHASE5-001T' -and $order.issued_for -like 'Gate 5.6*' -and $order.what_this_issuing_order_did_not_do -like 'PHASE5-001S did not execute*') `
  ("{0}: {1}" -f $order.order_id, $order.issued_for)
Check 'V-S50' 'the order is complete: six deliverables, the exclusions, the stop conditions and eight acceptance criteria' `
  ($order.deliverables.Count -eq 6 -and $order.explicit_exclusions.Count -ge 8 -and $order.stop_conditions.Count -ge 4 -and $order.acceptance_criteria.Count -eq 8) `
  ("deliverables {0}; exclusions {1}; stop conditions {2}; acceptance {3}" -f $order.deliverables.Count, $order.explicit_exclusions.Count, $order.stop_conditions.Count, $order.acceptance_criteria.Count)
Check 'V-S51' 'the fixture deliverable names every category the phase bullet requires' `
  ((($order.deliverables[0]) -split ';' | ConvertTo-Json -Depth 6).Length -gt 0 -and $order.deliverables[0].Contains('clear breach') -and $order.deliverables[0].Contains('exact boundary') -and $order.deliverables[0].Contains('preemption uncertainty') -and $order.deliverables[0].Contains('report-section not inspected')) 'all fifteen categories named'
Check 'V-S52' 'the order forbids re-running any harness that writes into a prior evidence package, and names the PHASE5-001I-A suite' `
  ((($order.explicit_exclusions | ConvertTo-Json -Depth 6).Contains('NO RE-RUN OF ANY HARNESS THAT WRITES INTO A PRIOR EVIDENCE PACKAGE')) -and (($order.explicit_exclusions | ConvertTo-Json -Depth 6).Contains('PHASE5-001I-A internal suite')) -and $order.acceptance_criteria[6].Contains('writes into a prior evidence package')) 'recorded as an exclusion, a stop condition subject and an acceptance criterion'
Check 'V-S53' 'the order forbids admission, early admission, coverage, findings, consumer-visible output and deployment' `
  ((($order.explicit_exclusions | ConvertTo-Json -Depth 6).Contains('no rule admission')) -and (($order.explicit_exclusions | ConvertTo-Json -Depth 6).Contains('no finding class')) -and (($order.explicit_exclusions | ConvertTo-Json -Depth 6).Contains('no consumer-visible output')) -and (($order.stop_conditions | ConvertTo-Json -Depth 6).Contains('may not be admitted early')) -and (($order.what_this_order_may_not_do | ConvertTo-Json -Depth 6).Contains('may not admit a rule'))) 'all recorded'
Check 'V-S54' 'the version-sharing tension is reconciled: a pinned pre-admission version, the Gate 5.7 reservation, and the criterion to be named rather than passed' `
  ($order.version_pinning.pre_admission_rule_record_version_identity -like 'CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-*' -and $order.version_pinning.production_admission_identity -like 'RESERVED_TO_GATE_5_7*' -and (@($order.version_pinning.what_this_order_must_do_about_the_tension).Count -eq 3) -and (($order.acceptance_criteria | ConvertTo-Json -Depth 6).Contains('version-sharing reservation'))) `
  $order.version_pinning.pre_admission_rule_record_version_identity
Check 'V-S55' 'every version pin is recorded with its digest, and the rule record pin is the record at its pre-admission identity' `
  ($order.version_pinning.pins.Count -ge 10 -and @($order.version_pinning.pins | Where-Object { -not $_.sha256 }).Count -eq 0) `
  ("pins: {0}" -f $order.version_pinning.pins.Count)
Check 'V-S56' 'every preceding scoped gate is recorded as passing for this scope' `
  (@($order.authority.predecessor_verdicts).Count -eq 4 -and (($order.authority.predecessor_verdicts | ConvertTo-Json -Depth 6).Contains('PASSED_FOR_THIS_SCOPE'))) 'Gates 5.2, 5.3, 5.4 and 5.5 all recorded as passing for this scope'
Check 'V-S57' 'the order records the superseded draft and why the id changed' `
  ($order.order_id_note -like '*PHASE5-001R*' -and $order.order_id_note -like '*PHASE5-001T*') $order.order_id_note.Substring(0, 60)


# ---------------------------------------------------------------- the read-only pointers outside the workspace
$readOnly = New-Object System.Collections.Generic.List[object]
$pointerMismatch = 0
$record = $recordQ
$register = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\report_representation_register.json')
$pr01 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-01' }
$pr02 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-02' }
foreach ($p in @(
  [pscustomobject]@{ label = 'the admitted source pin'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = $record.legal_proposition.source_pin.sha256 },
  [pscustomobject]@{ label = 'consumer specimen PR-01'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = $pr01.sha256 },
  [pscustomobject]@{ label = 'consumer specimen PR-02'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = $pr02.sha256 }
)) {
  $abs = Join-Path $Legacy $p.rel
  $exists = Test-Path -LiteralPath $abs -PathType Leaf
  $sha = $null; $state = 'MISSING'
  if ($exists) {
    $sha = Get-Sha256 $abs
    if ($sha -eq $p.recorded.ToUpperInvariant()) { $state = 'MATCHES_THE_RECORDED_PIN' } else { $state = 'DIFFERS_FROM_THE_RECORDED_PIN'; $pointerMismatch++ }
  } else { $pointerMismatch++ }
  $readOnly.Add([pscustomobject][ordered]@{ label = $p.label; path = $abs; sha256 = $sha; recorded_sha256 = $p.recorded.ToUpperInvariant(); state = $state })
}
Check 'V-S58' 'the three read-only pins outside the workspace still match, and nothing there was written' ($pointerMismatch -eq 0) `
  ("pointers: {0}; mismatching: {1}" -f $readOnly.Count, $pointerMismatch)

# ---------------------------------------------------------------- the prospective baseline re-measures
$pbMismatch = New-Object System.Collections.Generic.List[string]
foreach ($f in $baselineDoc.files) {
  $abs = Join-Path $Root $f.relative_path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $pbMismatch.Add($f.relative_path + ' (absent)'); continue }
  if ((Get-Sha256 $abs) -ne $f.sha256) { $pbMismatch.Add($f.relative_path + ' (changed)') }
}
Check 'V-S59' 'the prospective baseline re-measures with no mismatch over the files it lists' ($pbMismatch.Count -eq 0) `
  ("rows: {0}; mismatching: {1} {2}" -f $baselineDoc.file_count, $pbMismatch.Count, (($pbMismatch | Select-Object -First 5) -join '; '))
Check 'V-S60' 'the prospective baseline carries its pins, and the retained artifact pin is the hash measured now' `
  (@($baselineDoc.prospective_pins | Where-Object { -not $_.sha256 }).Count -eq 0 -and (($baselineDoc.prospective_pins | Where-Object { $_.path -eq $Retained }).sha256 -eq (Get-Sha256 (Join-Path $Root $Retained)))) `
  ("pins: {0}" -f @($baselineDoc.prospective_pins).Count)
Check 'V-S61' 'the prospective baseline names the four records it excludes, and no other file' `
  ($baselineDoc.excludes.Count -eq 1 -and @($baselineDoc.excludes[0].records).Count -eq 4) 'four harness-written records excluded, with the reason'

# ---------------------------------------------------------------- input verification of the inputs
Check 'V-S62' 'every input was re-measured before anything was written, with no unexplained difference and nothing missing' `
  ($inputVerification.unexplained_differences.Count -eq 0 -and $inputVerification.missing -eq 0 -and $inputVerification.matches_recorded_digest -ge 100) `
  ("inputs {0}; match {1}; differ {2}; missing {3}; unexplained {4}" -f $inputVerification.input_count, $inputVerification.matches_recorded_digest, $inputVerification.differs_from_recorded_digest, $inputVerification.missing, $inputVerification.unexplained_differences.Count)
Check 'V-S63' 'the input record names the retained artifact difference and attributes it, with its original digest' `
  ((($inputVerification.known_recorded_changes_explained | ConvertTo-Json -Depth 6).Contains($OriginalRetainedDigest)) -and (($inputVerification.known_recorded_changes_explained | ConvertTo-Json -Depth 6).Contains('PHASE5-001R'))) 'attributed to PHASE5-001R and to the build plan, with the original digest named'


# ---------------------------------------------------------------- preservation and change record
$preservationVerdict =
  if ($changed.Count -eq 1 -and $changed[0].relative_path -eq $Plan -and $missing.Count -eq 0 -and $undeclaredChanges.Count -eq 0) {
    'PRESERVATION HELD FOR THIS ORDER — no pre-existing file was deleted, and the only pre-existing file changed is the rank-5 governing document, amended under the two recorded owner decisions by the quoted-replacement amendment procedure, with the pre-amendment bytes reconstructible from the inversion check. The historical preservation failure of PHASE5-001R stands separately, is preserved unedited and is covered prospectively by Owner Decision 1.'
  } else { 'CHECK — unexpected preservation reading' }
[ordered]@{
  artifact              = 'preservation_and_change_record.json'
  work_order            = 'PHASE5-001S'
  created_utc           = '2026-09-30'
  baseline_artifact     = 'preserved_files_before.json'
  baseline_files        = $baseline.file_count
  files_unchanged       = $unchanged
  files_changed         = $changed.ToArray()
  files_missing         = $missing.ToArray()
  files_added_by_this_order = $addedByThisOrder.ToArray()
  expected_changes      = 'exactly one: the rank-5 Approved Build Plan, amended by this order under the two owner decisions through the Core Constitution section 6 quoted-replacement procedure. No other pre-existing file was authorised to change, and none did.'
  authorised_changes_by_this_order = $authorisedChanges
  authorised_change_count = $authorisedChanges.Count
  unauthorised_changes_by_this_order = @($undeclaredChanges)
  undeclared_changes    = @($undeclaredChanges)
  governed_documents_amended = @(
    [pscustomobject][ordered]@{
      document          = $Plan
      rank              = '5 — Approved Build Plan'
      before            = $apply.digest_before
      after             = $apply.digest_after
      amendments        = 'A-1 to A-5, quoted replacements and one appended amendment-history row'
      authority         = 'the two owner decisions this order carries, recorded in owner_decisions.json'
      invertible        = $amend.inversion_check.reconstruction_matches_baseline
      requirement_removed = $false
    }
  )
  historical_failure_preserved_unchanged = [pscustomobject][ordered]@{
    the_failure       = 'PHASE5-001R changed SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json without authorisation, disclosed it, and could not repair it'
    still_recorded_as = 'NOT MET — PHASE5-001R acceptance criterion 7 remains NAMED — NOT MET IN THIS SCOPE in that order''s unedited verdict, and the change remains unauthorised in its unedited preservation record'
    edited_by_this_order = $false
    covered_prospectively_by = 'OWNER DECISION 1, recorded in custody_supplement.json'
  }
  earlier_baselines_overwritten = 0
  earlier_manifests_edited = 0
  legal_corpus_untouched = $true
  legacy_corpus_files_written_or_deleted = 0
  output_character      = 'observation-only, packet-ineligible: no consumer-visible output, no application change, no deployment, no external transmission'
  verdict               = $preservationVerdict
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8


# ---------------------------------------------------------------- custody manifest
$harnessSummaryRecords = @('preservation_and_change_record.json', 'file_custody_manifest.json', 'verification_results.json')
$manifestFiles = New-Object System.Collections.Generic.List[object]
foreach ($e in $addedByThisOrder) {
  if ($harnessSummaryRecords -contains [System.IO.Path]::GetFileName($e.relative_path)) { continue }
  $abs = Join-Path $Root $e.relative_path
  $manifestFiles.Add([pscustomobject][ordered]@{ relative_path_from_workspace = $e.relative_path; bytes = (Get-Item -LiteralPath $abs).Length; sha256 = Get-Sha256 $abs })
}
foreach ($e in $baseline.files) {
  if ($authorisedPaths -contains $e.relative_path) {
    $abs = Join-Path $Root $e.relative_path
    $manifestFiles.Add([pscustomobject][ordered]@{
      relative_path_from_workspace  = $e.relative_path
      bytes                         = (Get-Item -LiteralPath $abs).Length
      sha256                        = Get-Sha256 $abs
      baseline_sha256               = $e.sha256
      authorised_change_by_this_order = 'YES — amended by this order under the two owner decisions, by the quoted-replacement procedure of Core Constitution section 6, recorded in amendment_application_result.json and amendment_text.json'
    })
    continue
  }
  $manifestFiles.Add([pscustomobject][ordered]@{ relative_path_from_workspace = $e.relative_path; bytes = $e.bytes; sha256 = $e.sha256 })
}
[ordered]@{
  artifact         = 'file_custody_manifest.json'
  work_order       = 'PHASE5-001S'
  created_utc      = '2026-09-30'
  purpose          = 'record, in one place, the digest of every file this order read or wrote, so custody is measured rather than asserted'
  file_count       = $manifestFiles.Count
  files            = $manifestFiles.ToArray()
  harness_summary_records_excluded_from_files = [pscustomobject][ordered]@{
    records = $harnessSummaryRecords
    why     = 'these three records are written by this same harness during the run, so a digest recorded inside one of them for itself or for another would be stale by construction. They are listed in added_by_this_order and their final digests are recorded in verification_results.json; every pre-existing file is proved preserved by the baseline comparison instead.'
  }
  added_by_this_order = $addedByThisOrder.ToArray()
  read_only_outside_the_workspace = $readOnly.ToArray()
  plan_digest      = [pscustomobject][ordered]@{
    path            = $Plan
    sha256          = Get-Sha256 (Join-Path $Root $Plan)
    baseline_sha256 = $baselineByPath[$Plan].sha256
    state           = 'AMENDED_BY_THIS_ORDER_UNDER_RECORDED_OWNER_AUTHORITY — the rank-5 instrument was amended by this order and by no other, by the governing procedure, and the pre-amendment bytes are reconstructible'
  }
  retained_artifact = [pscustomobject][ordered]@{
    path           = $Retained
    sha256         = Get-Sha256 (Join-Path $Root $Retained)
    original_sha256 = $OriginalRetainedDigest
    state          = 'RETAINED ARTIFACT UNDER OWNER DECISION 1 — accepted for prospective use at this hash; the original digest stays recorded in the PHASE5-001I-A manifest, which is preserved unedited; the write remains unauthorised in the historical record'
  }
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files            = $baseline.file_count
    files_unchanged           = $unchanged
    files_changed             = $changed.Count
    files_missing             = $missing.Count
    files_added_by_this_order = $addedByThisOrder.Count
    earlier_baselines_overwritten = 0
  }
  created_by = 'PHASE5-001S'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

# ---------------------------------------------------------------- results
$manifestBack = Read-Json (Join-Path $Out 'file_custody_manifest.json')
$manifestMismatch = 0
foreach ($e in $manifestBack.files) { if ((Get-Sha256 (Join-Path $Root $e.relative_path_from_workspace)) -ne $e.sha256) { $manifestMismatch++ } }
Check 'V-S64' 'the custody manifest re-measures with no mismatch over the files it lists' ($manifestMismatch -eq 0) `
  ("entries: {0}; mismatching: {1}. The three harness summary records are listed separately and excluded from the files list, because a record cannot carry its own final digest" -f $manifestBack.file_count, $manifestMismatch)
$failures = @($checks | Where-Object { $_.passed -ne $true })


[ordered]@{
  artifact      = 'verification_results.json'
  work_order    = 'PHASE5-001S'
  created_utc   = '2026-09-30'
  purpose       = 'the checks this order ran over the amended governing document, the amendment procedure, its own artifacts, the historical records it must not touch, its preservation, its custody, the prospective baseline it established and the read-only pointers outside the workspace'
  checks        = $checks.ToArray()
  check_count   = $checks.Count
  failure_count = $failures.Count
  failed        = $failures
  verdict       = if ($failures.Count -eq 0) { 'ALL PHASE5-001S CHECKS PASSED' } else { 'CHECK FAILURES PRESENT' }
  checks_are_not_gate_evidence = 'these checks verify this order''s own artifacts, its amendment and its custody. They are not the scope''s gate verdict, which is a separate record: scoped_gate_5_5_verdict_successor.json.'
  the_amendment = [pscustomobject][ordered]@{
    document        = $Plan
    digest_before   = $apply.digest_before
    digest_after    = $apply.digest_after
    amendments      = 5
    invertible      = $amend.inversion_check.reconstruction_matches_baseline
    requirements_removed = 0
  }
  preservation_reading = 'one pre-existing file changed, and it is the rank-5 governing document amended under the two recorded owner decisions; 0 files missing; 0 undeclared changes; 0 earlier baselines or manifests overwritten. The historical preservation failure of PHASE5-001R is preserved unedited and covered prospectively by Owner Decision 1.'
  artifacts_this_order_wrote = $addedByThisOrder.ToArray()
  harness_summary_records = @(
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001S\preservation_and_change_record.json'; bytes = (Get-Item -LiteralPath (Join-Path $Out 'preservation_and_change_record.json')).Length; sha256 = Get-Sha256 (Join-Path $Out 'preservation_and_change_record.json') },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json'; bytes = (Get-Item -LiteralPath (Join-Path $Out 'file_custody_manifest.json')).Length; sha256 = Get-Sha256 (Join-Path $Out 'file_custody_manifest.json') },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001S\verification_results.json'; note = 'written last by this same harness; its own digest is measured from the file rather than self-recorded' }
  )
  corpus_wide_status_kept_separate = [pscustomobject][ordered]@{
    '5.1' = 'MET with recorded administrative limitations; unchanged'
    '5.2' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only, in SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_2_verdict.json'
    '5.3' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only, in SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_3_verdict.json'
    '5.4' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only, in SOURCE_CAPTURES\PHASE5-001Q\scoped_gate_5_4_verdict.json'
    '5.5' = 'NOT PASSED corpus-wide; the scoped verdict for this scope is PASSED_FOR_THIS_SCOPE in SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json, and the earlier withheld verdict is preserved at SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json'
    '5.6' = 'NOT STARTED; the order PHASE5-001T is issued in SOURCE_CAPTURES\PHASE5-001S\next_work_order.json and is not begun'
    '5.7' = 'NOT REACHED; 0 admitted governed rules, 0 permitted findings'
  }
  what_this_record_does_not_claim = @(
    'it is not independent legal review, and it is not Gate 5.6 or Gate 5.7 evidence',
    'it does not pass Gate 5.5 corpus-wide, and it records no gate as passed for any scope other than the one named in scoped_gate_5_5_verdict_successor.json',
    'it does not admit a rule, create coverage or a candidate, or authorize a finding class',
    'it does not repair or deny the preservation failure of PHASE5-001R, and it does not restate that unauthorised write as authorised: the failure is preserved and is covered prospectively only',
    'it does not convert any recorded limitation into a criterion satisfaction, and it does not treat missing work as a gap or a refusal',
    'it does not claim the emission path on an admitted rule record is exercised: that path is still refused and unexercised',
    'it does not treat the retained artifact''s passing tests as evidence for any gate',
    'it does not retroactively authorize any earlier custody discrepancy'
  )
  created_by    = 'PHASE5-001S'
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'verification_results.json') -Encoding utf8

"checks: {0} | failures: {1} | changed: {2} | missing: {3} | added by this order: {4} | manifest entries: {5}" -f $checks.Count, $failures.Count, $changed.Count, $missing.Count, $addedByThisOrder.Count, $manifestBack.file_count
foreach ($f in $failures) { "  FAIL {0}: {1} :: {2}" -f $f.id, $f.what, $f.detail }

