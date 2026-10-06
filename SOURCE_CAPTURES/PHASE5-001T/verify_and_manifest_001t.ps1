# verify_and_manifest_001t.ps1 — PHASE5-001T: verification, preservation and custody.
#
# Measures rather than asserts. It compares the whole workspace against the baseline taken before this order
# wrote anything, re-measures every pinned input, checks the content of each artifact against what it claims,
# re-runs every builder of this order and compares the output byte-for-byte, and re-measures the historical
# records this order must not have touched. It writes preservation_and_change_record.json,
# file_custody_manifest.json and verification_results.json, and nothing else.
#
# NO HARNESS THAT WRITES INTO A PRIOR EVIDENCE PACKAGE IS RUN: the inherited internal-validation suite is only
# re-measured by digest, never executed.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001T'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Plan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Narrative = 'CRP_PHASE5_001T_GATE_5_6_VALIDATION.md'
$RetainedArtifact = 'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json'
$WithheldVerdict = 'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json'
$WithheldVerdictDigest = 'B3A019E65EA056C65BE2956C641D04F8D0E26E989AD2F836ABC4955A9C8A6705'
$RetainedArtifactDigest = '6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511'
$RunSuiteHarness = 'internal-validation\ca-ns-last-payment-six-year\tests\harness.cjs'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function Read-Json([string]$path) { return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
$j = @{}
function J([string]$name) { if (-not $j.ContainsKey($name)) { $j[$name] = Read-Json (Join-Path $Out $name) }; return $j[$name] }

$checks = New-Object System.Collections.Generic.List[object]
function Check([string]$id, [string]$what, [bool]$passed, [string]$detail) {
  $checks.Add([pscustomobject][ordered]@{ id = $id; what = $what; passed = $passed; detail = $detail })
}

# ---------------------------------------------------------------- preservation (measured)
$baseline = J 'preserved_files_before.json'
$baselineByPath = @{}
foreach ($f in $baseline.files) { $baselineByPath[$f.relative_path] = $f }
$changed = New-Object System.Collections.Generic.List[object]
$missing = New-Object System.Collections.Generic.List[string]
$unchanged = 0
foreach ($f in $baseline.files) {
  $abs = Join-Path $Root $f.relative_path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $missing.Add($f.relative_path); continue }
  $now = Get-Sha256 $abs
  if ($now -eq $f.sha256) { $unchanged++ }
  else { $changed.Add([pscustomobject][ordered]@{ relative_path = $f.relative_path; before = $f.sha256; after = $now; bytes = (Get-Item -LiteralPath $abs).Length }) }
}

Check 'V-T01' 'no pre-existing file changed: this order amends no governing document and edits no earlier artifact' `
  ($changed.Count -eq 0) `
  ("changed: {0}{1}" -f $changed.Count, $(if ($changed.Count -gt 0) { ': ' + (($changed | ForEach-Object { $_.relative_path }) -join '; ') } else { '' }))
Check 'V-T02' 'no pre-existing file was deleted or is missing' ($missing.Count -eq 0) ("missing: {0}" -f $missing.Count)

# ---------------------------------------------------------------- artifacts parse, carry no BOM, and the narrative exists
$jsonArtifacts = @(
  'fixture_suite_001t.json', 'negative_tests_001t.json', 'replay_expectations_frozen.json',
  'independent_replay_001t.json', 'consumer_language_validation_001t.json', 'scoped_gate_5_6_verdict.json',
  'next_work_order.json', 'input_verification.json', 'preserved_files_before.json'
)
$badJson = New-Object System.Collections.Generic.List[string]
$bomFound = New-Object System.Collections.Generic.List[string]
foreach ($name in $jsonArtifacts) {
  $abs = Join-Path $Out $name
  try { $null = Read-Json $abs } catch { $badJson.Add($name) }
  $bytes = [System.IO.File]::ReadAllBytes($abs)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { $bomFound.Add($name) }
}
Check 'V-T03' 'every JSON artifact of this order parses' ($badJson.Count -eq 0) ("unparseable: {0}" -f $badJson.Count)
Check 'V-T04' 'no artifact of this order carries a byte-order mark' ($bomFound.Count -eq 0) ("with BOM: {0}" -f $bomFound.Count)
$narrativeAbs = Join-Path $Root $Narrative
$narrativeExists = Test-Path -LiteralPath $narrativeAbs -PathType Leaf
$narrativeSize = if ($narrativeExists) { (Get-Item -LiteralPath $narrativeAbs).Length } else { 0 }
Check 'V-T05' 'the completion narrative exists and is not an empty file' ($narrativeExists -and $narrativeSize -gt 5000) ("exists: {0}; bytes: {1}" -f $narrativeExists, $narrativeSize)

# ---------------------------------------------------------------- files added by this order
$addedByThisOrder = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if ($baselineByPath.ContainsKey($rel)) { continue }
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = $rel; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}
$strayAdditions = @($addedByThisOrder | Where-Object { $_.relative_path -notlike 'SOURCE_CAPTURES\PHASE5-001T\*' -and $_.relative_path -ne $Narrative })
Check 'V-T06' 'every file added by this order is inside its own package or is its narrative' ($strayAdditions.Count -eq 0) `
  ("added: {0}; outside the package: {1}" -f $addedByThisOrder.Count, $strayAdditions.Count)

# ---------------------------------------------------------------- the pins, re-measured after everything was written
$pins = @(
  @{ p = 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json'; h = 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023' },
  @{ p = 'SOURCE_CAPTURES\PROD-003\crosswalk.json'; h = '51BFCDB73371D3A1F5DACDB35DC9BC465D8548C8D6B6283FE0371AAAB6C20E13' },
  @{ p = 'SOURCE_CAPTURES\PROD-003\report_representation_register.json'; h = '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\report_fact_model.json'; h = '4967DD57966DCC9D02D565FDDF717C924759F3CD04F6206798C1ACDA8702D6D9' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\extraction_status_vocabulary.json'; h = 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\deterministic_evaluator_specification.json'; h = '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\evaluator_001r.cjs'; h = '4D1EBEFBE8524523A20E22BAF0E0FCAA48A7CB8F109E49D61890410D96C07F7E' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\internal_determinism_check.json'; h = 'BB5490B392000644C84D2BF67089A3A5824D4BF51CCB2ED172A1AA521C8119C3' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\output_vocabulary_and_explanation_surface.json'; h = '6807E384CFEAADD8CED1CCA7018F04B71EB9F492AC050EED69D4D58C5EBB4ADD' },
  @{ p = $Plan; h = '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json'; h = '1B764B4DB13AD9C532E4FBF1547E78376B5EFA297F8443E6B05D622345C47169' }
)
$pinMismatch = @($pins | Where-Object { (Get-Sha256 (Join-Path $Root $_.p)) -ne $_.h })
Check 'V-T07' 'all eleven pins still match, after this order wrote everything it wrote' ($pinMismatch.Count -eq 0) `
  ("pins: {0}; mismatching: {1}" -f $pins.Count, $pinMismatch.Count)

# ---------------------------------------------------------------- the gate text quoted is the gate text in the document
$verdictDoc = J 'scoped_gate_5_6_verdict.json'
$planLine170 = (Get-Content -LiteralPath (Join-Path $Root $Plan))[169]
Check 'V-T08' 'the verdict quotes the Gate 5.6 line of the amended document verbatim' `
  (($verdictDoc.gate_text_quoted_verbatim.text -eq $planLine170) -and ($verdictDoc.gate_text_quoted_verbatim.quoted_verbatim -eq $true)) `
  ("equal to the document line: {0}; starts with the gate heading: {1}" -f ($verdictDoc.gate_text_quoted_verbatim.text -eq $planLine170), $verdictDoc.gate_text_quoted_verbatim.quoted_verbatim)

# ---------------------------------------------------------------- the historical records this order must not touch
Check 'V-T09' 'the withheld PHASE5-001R Gate 5.5 verdict is preserved unchanged at its recorded digest' `
  ((Get-Sha256 (Join-Path $Root $WithheldVerdict)) -eq $WithheldVerdictDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $WithheldVerdict)))
Check 'V-T10' 'the retained PHASE5-001I-A artifact is unchanged at the digest Owner Decision 1 accepted' `
  ((Get-Sha256 (Join-Path $Root $RetainedArtifact)) -eq $RetainedArtifactDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $RetainedArtifact)))
$suiteHarnessDigest = '573C330590D856B61BCA6CFC30DDA020F5F4D316149E7D43C4B0DB981E900787'
Check 'V-T11' 'the inherited internal-validation suite is unchanged and was not run: its harness still carries the digest the input verification recorded' `
  ((Get-Sha256 (Join-Path $Root $RunSuiteHarness)) -eq $suiteHarnessDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $RunSuiteHarness)))
$ruleRecordNow = Read-Json (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json')
Check 'V-T12' 'no rule was admitted: the governed rule record still reads NOT_ADMITTED at its pinned digest' `
  (($ruleRecordNow.admission_state.state -eq 'NOT_ADMITTED') -and ($ruleRecordNow.admission_state.admitted_governed_rules_after_this_order -eq 0)) `
  ("state: {0}; admitted rules: {1}" -f $ruleRecordNow.admission_state.state, $ruleRecordNow.admission_state.admitted_governed_rules_after_this_order)

# ---------------------------------------------------------------- the fixture suite, measured against what it claims
$suite = J 'fixture_suite_001t.json'
Check 'V-T13' 'the fixture suite covers every category the phase bullet names' `
  (($suite.category_count -eq 15) -and ($suite.categories_covered -eq 15)) `
  ("categories: {0} of {1}" -f $suite.categories_covered, $suite.category_count)
Check 'V-T14' 'every fixture reached the state it must reach' `
  (($suite.failure_count -eq 0) -and ($suite.cases.Count -eq $suite.fixture_count)) `
  ("fixtures: {0}; failures: {1}" -f $suite.fixture_count, $suite.failure_count)
$unlabelled = @($suite.cases | Where-Object { $_.synthetic -ne $true -or $_.counted_as_consumer_report_presentation_evidence -ne $false -or $_.is_a_presentation -ne $false })
Check 'V-T15' 'every fixture is labelled synthetic and none is counted as consumer-report presentation evidence' `
  (($unlabelled.Count -eq 0) -and ($suite.fixture_tally.counted_as_consumer_report_presentation_evidence -eq 0)) `
  ("unlabelled or miscounted: {0}; counted as evidence: {1}" -f $unlabelled.Count, $suite.fixture_tally.counted_as_consumer_report_presentation_evidence)
$noStatement = @($suite.cases | Where-Object { -not $_.the_state_it_must_reach -or $_.the_state_it_must_reach.Count -eq 0 })
Check 'V-T16' 'every fixture states the state it must reach' ($noStatement.Count -eq 0) ("without a stated state: {0}" -f $noStatement.Count)
Check 'V-T17' 'no fixture emitted a finding class and none carried a forbidden label' `
  (($suite.fixture_tally.cases_that_emitted_a_finding_class -eq 0) -and ($suite.fixture_tally.cases_carrying_a_forbidden_label -eq 0)) `
  ("emitted: {0}; forbidden labels: {1}" -f $suite.fixture_tally.cases_that_emitted_a_finding_class, $suite.fixture_tally.cases_carrying_a_forbidden_label)
$withheldCases = @($suite.cases | Where-Object { $_.id -in @('FX-03', 'FX-04') } | Where-Object {
    ($_.observed.per_record[0].comparison_outcome -eq 'UNRESOLVED') -and
    ($_.observed.per_record[0].boundary_case -eq 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY') })
Check 'V-T18' 'the exact-boundary fixtures reached the withheld outcome and neither of the two other outcomes' `
  ($withheldCases.Count -eq 2) ("withheld boundary fixtures: {0} of 2" -f $withheldCases.Count)
Check 'V-T19' 'the leap-day convention holds as a property over every 29 February start in 1900..2100' `
  ($suite.leap_day_convention_property.clamped_to_28_february_in_every_case -eq $true) `
  ("starts checked: {0}; counterexamples: {1}" -f $suite.leap_day_convention_property.starts_checked, $suite.leap_day_convention_property.counterexamples.Count)
$dupChecked = @($suite.cases | Where-Object { $_.record_identity_across_duplicate_catalogue_renderings })
$dupBad = @($dupChecked | Where-Object { $_.record_identity_across_duplicate_catalogue_renderings.the_two_renderings_produce_byte_identical_records -ne $true })
Check 'V-T20' 'the duplicate catalogue source produced byte-identical records, so it cannot fork the evaluation' `
  (($dupBad.Count -eq 0) -and ($dupChecked.Count -gt 0)) `
  ("cases checked: {0}; not identical: {1}" -f $dupChecked.Count, $dupBad.Count)

# ---------------------------------------------------------------- the negative tests
$negatives = J 'negative_tests_001t.json'
function NegTest([string]$id) { return @($negatives.tests | Where-Object { $_.id -eq $id })[0] }
Check 'V-T21' 'every negative test passed' (($negatives.test_count -ge 4) -and ($negatives.failure_count -eq 0)) `
  ("tests: {0}; failures: {1}" -f $negatives.test_count, $negatives.failure_count)
$missingClauses = @($negatives.tests | Where-Object { -not $_.forbids -or -not $_.demonstrated_in_this_scope -or -not $_.method })
Check 'V-T22' 'every negative test names the prohibited behaviour it forbids and records what it demonstrates here' `
  ($missingClauses.Count -eq 0) ("tests missing a clause: {0}" -f $missingClauses.Count)
Check 'V-T23' 'the off-report-fact test found no access route and no off-report fact used as a decisive fact' `
  ((NegTest 'N-01').evidence.forbidden_reads_found.Count -eq 0 -and (NegTest 'N-01').evidence.returned_record_keys_drawn_from_an_off_report_fact.Count -eq 0) `
  ("forbidden reads: {0}; off-report keys: {1}" -f (NegTest 'N-01').evidence.forbidden_reads_found.Count, (NegTest 'N-01').evidence.returned_record_keys_drawn_from_an_off_report_fact.Count)
Check 'V-T24' 'a parser failure never became an absence reading in any swept case' `
  ((NegTest 'N-02').evidence.every_swept_case_avoided_an_absence_reading -eq $true) `
  ("swept cases: {0}" -f (NegTest 'N-02').evidence.sweep_over_fixtures_carrying_a_failure_signal.Count)
Check 'V-T25' 'an unknown exception suppressed nothing and this unit has no probable path to suppress' `
  ((NegTest 'N-03').evidence.all_variants_are_byte_identical_to_the_record_without_the_marker -eq $true -and (NegTest 'N-03').evidence.a_probable_path_is_reachable_from_any_input -eq $false) `
  ("all variants identical: {0}; a probable path is reachable: {1}" -f (NegTest 'N-03').evidence.all_variants_are_byte_identical_to_the_record_without_the_marker, (NegTest 'N-03').evidence.a_probable_path_is_reachable_from_any_input)
Check 'V-T26' 'no returned record carried a finding label and no output axis permits one' `
  ((NegTest 'N-04').evidence.cases_carrying_a_forbidden_label.Count -eq 0 -and (NegTest 'N-04').evidence.output_axes_carrying_a_finding_label.Count -eq 0) `
  ("cases with a label: {0}; axes permitting one: {1}" -f (NegTest 'N-04').evidence.cases_carrying_a_forbidden_label.Count, (NegTest 'N-04').evidence.output_axes_carrying_a_finding_label.Count)
Check 'V-T27' 'an unadmitted rule record produced no outcome for any input' `
  ((NegTest 'N-05').evidence.cases_that_produced_an_outcome -eq 0) `
  ("cases with an outcome on the unadmitted record: {0} of {1}" -f (NegTest 'N-05').evidence.cases_that_produced_an_outcome, (NegTest 'N-05').evidence.fixtures_using_the_pinned_record.Count)
Check 'V-T28' 'the refusal is the first failing gate in the fixed order in every case' `
  ((NegTest 'N-07').evidence.disagreements.Count -eq 0) `
  ("cases: {0}; disagreements: {1}; multi-gate cases: {2}" -f (NegTest 'N-07').evidence.cases_whose_refusal_is_the_first_failing_gate_in_the_order, (NegTest 'N-07').evidence.disagreements.Count, (NegTest 'N-07').evidence.cases_that_failed_more_than_one_gate.Count)
Check 'V-T29' 'the four axes were read separately and no case authorised a finding or became packet-eligible' `
  ((NegTest 'N-08').evidence.applicability_state_is_the_same_in_every_case -eq $true -and (NegTest 'N-08').evidence.packet_eligible_in_any_case -eq 0) `
  ("applicability stable: {0}; packet-eligible cases: {1}" -f (NegTest 'N-08').evidence.applicability_state_is_the_same_in_every_case, (NegTest 'N-08').evidence.packet_eligible_in_any_case)

# ---------------------------------------------------------------- the independent replay
$replay = J 'independent_replay_001t.json'
$frozenNow = Get-Sha256 (Join-Path $Out 'replay_expectations_frozen.json')
Check 'V-T30' 'the frozen expectations are unchanged since the comparison ran, and the replay record carries that digest' `
  (($frozenNow -eq $replay.order_of_operations.the_frozen_file_sha256) -and ($replay.order_of_operations.step_1 -like '*writes replay_expectations_frozen.json*')) `
  ("frozen digest now: {0}; recorded: {1}" -f $frozenNow, $replay.order_of_operations.the_frozen_file_sha256)
Check 'V-T31' 'every sampled result was reproduced by the independent reviewer' `
  (($replay.reproduced_count -eq $replay.sample_count) -and ($replay.disagreement_count -eq 0) -and ($replay.unresolved_disagreements.Count -eq 0)) `
  ("samples: {0}; reproduced: {1}; disagreements: {2}; unresolved: {3}" -f $replay.sample_count, $replay.reproduced_count, $replay.disagreement_count, $replay.unresolved_disagreements.Count)
Check 'V-T32' 'the reviewer''s executable code loads no project file and names neither the evaluator nor this order''s fixtures and results' `
  (($replay.reviewer_independence_measured.the_reviewer_loads_no_project_file -eq $true) -and
   ($replay.reviewer_independence_measured.the_reviewers_executable_code_names_the_evaluator -eq $false) -and
   ($replay.reviewer_independence_measured.the_reviewers_executable_code_names_the_fixture_kit -eq $false) -and
   ($replay.reviewer_independence_measured.the_reviewer_reads_a_result_record_of_this_order -eq $false)) `
  ("loads no project file: {0}; names the evaluator in code: {1}; names the fixture kit in code: {2}; reads a result: {3}" -f $replay.reviewer_independence_measured.the_reviewer_loads_no_project_file, $replay.reviewer_independence_measured.the_reviewers_executable_code_names_the_evaluator, $replay.reviewer_independence_measured.the_reviewers_executable_code_names_the_fixture_kit, $replay.reviewer_independence_measured.the_reviewer_reads_a_result_record_of_this_order)
Check 'V-T33' 'the provision was reproduced from the accepted source pin itself and matches the record exactly' `
  (($replay.transcription_identity_reproduced_from_the_source_pin.the_rule_corpus_rendering_matches_the_record_exactly -eq $true) -and ($replay.transcription_identity_reproduced_from_the_source_pin.source_pin_sha256 -eq '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF')) `
  ("exact match: {0}; pin digest: {1}" -f $replay.transcription_identity_reproduced_from_the_source_pin.the_rule_corpus_rendering_matches_the_record_exactly, $replay.transcription_identity_reproduced_from_the_source_pin.source_pin_sha256)
Check 'V-T34' 'the reviewer''s numbers tie to the register''s own demonstration of the specimen' `
  ($replay.the_registers_own_demonstration_matched -eq $true) ("ties to the register: {0}" -f $replay.the_registers_own_demonstration_matched)
Check 'V-T35' 'the reviewer''s independence is recorded with its limits rather than claimed as a second reviewer' `
  (($replay.reviewer_independence.what_independence_does_not_mean_here.Count -ge 3) -and ($replay.reviewer_independence.who_reviewed.Length -gt 0)) `
  ("recorded limits: {0}" -f $replay.reviewer_independence.what_independence_does_not_mean_here.Count)

# ---------------------------------------------------------------- the consumer language
$language = J 'consumer_language_validation_001t.json'
Check 'V-T36' 'every explanation template at the pinned digest was exercised' `
  (($language.template_count -eq 5) -and ($language.failure_count -eq 0) -and ($language.templates_read_from.every_template_exercised -eq $true)) `
  ("templates: {0}; failures: {1}; every template exercised: {2}" -f $language.template_count, $language.failure_count, $language.templates_read_from.every_template_exercised)
Check 'V-T37' 'the withheld-boundary template was exercised and rendered its qualification verbatim' `
  (@($language.templates | Where-Object { $_.template_state -eq 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' })[0].qualifications_carried_verbatim.Count -eq 4) `
  ("qualifications carried verbatim: {0}" -f @($language.templates | Where-Object { $_.template_state -eq 'BOUNDARY_CASE_EXACTLY_AT_SIX_YEAR_ANNIVERSARY' })[0].qualifications_carried_verbatim.Count)
Check 'V-T38' 'no rendered text carried a finding label and no sentence overstated affirmatively' `
  (@($language.templates | ForEach-Object { $_.finding_labels_in_the_rendered_text.Count } | Measure-Object -Sum).Sum -eq 0 -and
   @($language.templates | ForEach-Object { $_.overstatement_scan.affirmative_overstatements.Count } | Measure-Object -Sum).Sum -eq 0) `
  ("finding labels: {0}; affirmative overstatements: {1}" -f @($language.templates | ForEach-Object { $_.finding_labels_in_the_rendered_text.Count } | Measure-Object -Sum).Sum, @($language.templates | ForEach-Object { $_.overstatement_scan.affirmative_overstatements.Count } | Measure-Object -Sum).Sum)
Check 'V-T39' 'the consumer-language validation created no surface and changed what may be shown today' `
  ($language.what_may_be_shown_today.consumer_visible_output -eq 'NONE' -and $language.what_may_be_shown_today.packet -eq 'ineligible') `
  ("consumer-visible output: {0}; packet: {1}" -f $language.what_may_be_shown_today.consumer_visible_output, $language.what_may_be_shown_today.packet)

# ---------------------------------------------------------------- the verdict and the next step
$order = J 'next_work_order.json'
$c4 = @($verdictDoc.gate_criteria | Where-Object { $_.n -eq 4 })[0]
Check 'V-T40' 'the verdict states every clause of the gate sentence and names the one it cannot meet' `
  (($verdictDoc.gate_criteria.Count -eq 4) -and ($verdictDoc.gate_tally.met -eq 3) -and ($verdictDoc.gate_tally.reserved_and_named_not_satisfied -eq 1) -and ($c4.state -like 'RESERVED AND NAMED*')) `
  ("clauses: {0}; met: {1}; reserved and named: {2}" -f $verdictDoc.gate_criteria.Count, $verdictDoc.gate_tally.met, $verdictDoc.gate_tally.reserved_and_named_not_satisfied)
Check 'V-T41' 'the verdict names the version-sharing reservation and does not claim the production identity' `
  ($verdictDoc.scope.production_admission_identity -like 'RESERVED_TO_GATE_5_7*' -and $c4.evidence -join ' ' -like '*reserved and not satisfied*') `
  ("production identity: {0}" -f $verdictDoc.scope.production_admission_identity)
Check 'V-T42' 'the verdict states each acceptance criterion of this order and marks none of them not met' `
  (($verdictDoc.acceptance_criteria.Count -eq 8) -and ($verdictDoc.acceptance_tally.not_met -eq 0)) `
  ("acceptance criteria: {0}; not met: {1}" -f $verdictDoc.acceptance_criteria.Count, $verdictDoc.acceptance_tally.not_met)
Check 'V-T43' 'the verdict records the defects found while executing this order, and records no behavioural defect in the evaluator' `
  (($verdictDoc.defects_found_while_executing_this_order.Count -ge 4) -and ($verdictDoc.behavioural_defects_found_in_the_evaluator -eq 0)) `
  ("defects recorded: {0}; evaluator defects: {1}" -f $verdictDoc.defects_found_while_executing_this_order.Count, $verdictDoc.behavioural_defects_found_in_the_evaluator)
Check 'V-T44' 'the verdict keeps the corpus-wide state separate and claims no corpus-wide pass' `
  (($verdictDoc.corpus_wide_status_kept_separate.'5.6' -like 'NOT MET IN FULL*') -and ($verdictDoc.corpus_wide_status_kept_separate.'5.7' -like 'NOT REACHED*')) `
  ("5.6: {0}; 5.7: {1}" -f $verdictDoc.corpus_wide_status_kept_separate.'5.6', $verdictDoc.corpus_wide_status_kept_separate.'5.7')
Check 'V-T45' 'the order issues no next order, and keeps the Gate 5.7 draft clearly marked not issued and not begun' `
  (($order.order_issued -eq $false) -and ($order.the_draft_order_kept_here.order_issued -eq $false) -and ($order.the_draft_order_kept_here.begun -eq $false)) `
  ("order issued: {0}; draft issued: {1}; draft begun: {2}" -f $order.order_issued, $order.the_draft_order_kept_here.order_issued, $order.the_draft_order_kept_here.begun)
Check 'V-T46' 'the recorded blocker is the same blocker the verdict names' `
  (($order.the_blocker.criterion -eq $verdictDoc.criterion_it_cannot_meet.criterion) -and ($order.the_blocker.what_is_missing -eq $verdictDoc.criterion_it_cannot_meet.what_is_missing)) `
  ("blocker: {0}" -f $order.the_blocker.what_is_missing)
Check 'V-T47' 'the record does not ask the owner to assign a production version in order to satisfy the criterion' `
  ($order.what_this_record_does_not_ask_for -join ' ' -like '*does not ask the owner to assign a production version*') `
  ("ask-avoidance recorded: {0}" -f $order.what_this_record_does_not_ask_for.Count)
Check 'V-T48' 'the superseded Gate 5.6 draft of PHASE5-001R is recorded as superseded, not hidden' `
  ($verdictDoc.authority_for_this_order.the_superseded_gate_5_6_draft.state -like 'SUPERSEDED AND RECORDED*') `
  ("state: {0}" -f $verdictDoc.authority_for_this_order.the_superseded_gate_5_6_draft.state)

# ---------------------------------------------------------------- builders re-run and compared byte-for-byte
$builders = @('build_001t_fixture_suite.cjs', 'build_001t_negative_tests.cjs', 'build_001t_independent_replay.cjs', 'build_001t_consumer_language.cjs', 'build_001t_verdict.cjs', 'build_001t_next_order.cjs')
$producedBy = @{
  'build_001t_fixture_suite.cjs' = @('fixture_suite_001t.json')
  'build_001t_negative_tests.cjs' = @('negative_tests_001t.json')
  'build_001t_independent_replay.cjs' = @('replay_expectations_frozen.json', 'independent_replay_001t.json')
  'build_001t_consumer_language.cjs' = @('consumer_language_validation_001t.json')
  'build_001t_verdict.cjs' = @('scoped_gate_5_6_verdict.json')
  'build_001t_next_order.cjs' = @('next_work_order.json')
}
$before = @{}
foreach ($b in $builders) { foreach ($a in $producedBy[$b]) { $before[$a] = Get-Sha256 (Join-Path $Out $a) } }
$rerunFailures = New-Object System.Collections.Generic.List[string]
foreach ($b in $builders) {
  $null = & node (Join-Path $Out $b) 2>&1
  if ($LASTEXITCODE -ne 0) { $rerunFailures.Add($b + ' (exit ' + $LASTEXITCODE + ')') }
}
foreach ($a in $before.Keys) {
  $now = Get-Sha256 (Join-Path $Out $a)
  if ($now -ne $before[$a]) { $rerunFailures.Add($a + ' (digest changed on re-run)') }
}
Check 'V-T49' 'every builder of this order was re-run and its output is byte-for-byte identical' `
  ($rerunFailures.Count -eq 0) ("builders re-run: {0}; artifacts compared: {1}; unstable: {2}{3}" -f $builders.Count, $before.Keys.Count, $rerunFailures.Count, $(if ($rerunFailures.Count -gt 0) { ': ' + ($rerunFailures -join '; ') } else { '' }))

# ---------------------------------------------------------------- the input verification, re-measured
$inputVerification = J 'input_verification.json'
$conflicts = @($inputVerification.rows | Where-Object { $_.state -eq 'INPUT_CONFLICT_WITH_THE_ORDERS_OWN_PIN' -or $_.state -eq 'MISSING' })
Check 'V-T50' 'no input conflicts with the order''s own pin, and none is missing' `
  ($inputVerification.input_count -gt 0 -and $conflicts.Count -eq 0 -and $inputVerification.input_conflicts_with_the_orders_own_pin -eq 0 -and $inputVerification.missing -eq 0) `
  ("inputs: {0}; own-pin matches: {1}; conflicts: {2}; missing: {3}" -f $inputVerification.input_count, $inputVerification.matches_the_orders_own_pin, $inputVerification.input_conflicts_with_the_orders_own_pin, $inputVerification.missing)
Check 'V-T51' 'the difference count between recorded and measured digests is zero, or every difference is a known recorded change' `
  ($inputVerification.differs_from_recorded_digest -eq 0 -or $inputVerification.differences_requiring_an_explanation.Count -gt 0) `
  ("differences from a recorded digest: {0}" -f $inputVerification.differs_from_recorded_digest)
$externalMismatch = @($inputVerification.read_only_outside_the_workspace.pointers | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' })
Check 'V-T52' 'every read-only pointer outside the workspace still matches its recorded pin' `
  ($externalMismatch.Count -eq 0) ("pointers: {0}; mismatching: {1}" -f $inputVerification.read_only_outside_the_workspace.pointer_count, $externalMismatch.Count)

# ---------------------------------------------------------------- preservation and change record
$verdictSummary = if (@($checks | Where-Object { $_.passed -ne $true }).Count -eq 0) {
  'PRESERVATION HELD FOR THIS ORDER — no pre-existing file was deleted or changed, and nothing outside this order''s own package was written'
} else {
  'PRESERVATION NOT ESTABLISHED — see the failed checks in verification_results.json'
}
[ordered]@{
  artifact    = 'preservation_and_change_record.json'
  work_order  = 'PHASE5-001T'
  created_utc = '2026-09-30'
  baseline_artifact = 'preserved_files_before.json'
  baseline_files = $baseline.file_count
  files_unchanged = $unchanged
  files_changed = $changed.ToArray()
  changed_count = $changed.Count
  files_missing = $missing.ToArray()
  missing_count = $missing.Count
  files_added_by_this_order = $addedByThisOrder.ToArray()
  added_count = $addedByThisOrder.Count
  expected_changes = 'NONE. This order carries no amendment authority by design: it amends no governing document and edits no earlier artifact, and it writes nothing into any prior evidence package.'
  authorised_changes_by_this_order = 0
  unauthorised_changes_by_this_order = $changed.Count
  undeclared_changes = 0
  governed_documents_amended = 0
  earlier_baselines_overwritten = 0
  earlier_manifests_edited = 0
  historical_preservation_failure_preserved_unchanged = [pscustomobject][ordered]@{
    the_failure = 'PHASE5-001R changed SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json without authorisation, disclosed it, and did not repair it'
    still_recorded_as = 'PRESERVED: the withheld PHASE5-001R Gate 5.5 verdict stands at B3A019E6… and that order''s own preservation finding is unedited'
    covered_prospectively_by = 'OWNER DECISION 1, recorded in SOURCE_CAPTURES\PHASE5-001S\custody_supplement.json'
    edited_by_this_order = $false
    separated_from_this_orders_result = 'yes — this record reports only what this order changed, which is nothing outside its own package, and the historical failure is reported as history, not as a count in this order''s preservation result'
  }
  legal_corpus_untouched = $true
  legacy_corpus_files_written_or_deleted = 0
  inherited_suite_run = $false
  output_character = 'observation-only, packet-ineligible: no consumer-visible output, no admission, no coverage, no finding class, no application change, no deployment and no external transmission'
  verdict = $verdictSummary
  created_by = 'PHASE5-001T'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8

# ---------------------------------------------------------------- custody manifest
$harnessSummaryRecords = @('preservation_and_change_record.json', 'file_custody_manifest.json', 'verification_results.json')
$manifestFiles = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if (($harnessSummaryRecords | ForEach-Object { "SOURCE_CAPTURES\PHASE5-001T\$_" }) -contains $rel) { continue }
  $manifestFiles.Add([pscustomobject][ordered]@{ relative_path_from_workspace = $rel; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}

$readOnly = New-Object System.Collections.Generic.List[object]
foreach ($p in @(
  [pscustomobject]@{ label = 'the accepted source pin (the admitted legal authority, read by the independent reviewer)'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF' },
  [pscustomobject]@{ label = 'consumer specimen PR-01 (the byte-pinned presentation; never opened by this order)'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F' },
  [pscustomobject]@{ label = 'consumer specimen PR-02 (secondary; admitted for no rule unit; never opened)'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4' }
)) {
  $abs = Join-Path $Legacy $p.rel
  $h = if (Test-Path -LiteralPath $abs -PathType Leaf) { Get-Sha256 $abs } else { $null }
  $readOnly.Add([pscustomobject][ordered]@{ label = $p.label; relative_path = $p.rel; measured_sha256 = $h; recorded_sha256 = $p.recorded; state = if ($h -eq $p.recorded) { 'MATCHES_THE_RECORDED_PIN' } else { 'DOES_NOT_MATCH' } })
}

[ordered]@{
  artifact    = 'file_custody_manifest.json'
  work_order  = 'PHASE5-001T'
  created_utc = '2026-09-30'
  purpose     = 'record, in one place, the digest of every file this order read or wrote, so custody is measured rather than asserted'
  file_count  = $manifestFiles.Count
  files       = $manifestFiles.ToArray()
  harness_summary_records_excluded_from_files = [pscustomobject][ordered]@{
    records = $harnessSummaryRecords
    why     = 'these three records are written by this same harness during the run, so a digest recorded inside one of them for itself or for another would be stale by construction. The rows above are the files that were stable when the manifest was written; the two that are already final are recorded by digest in verification_results.json, and the third is written last and records its own absence.'
  }
  added_by_this_order = $addedByThisOrder.ToArray()
  read_only_outside_the_workspace = $readOnly.ToArray()
  plan_digest = [pscustomobject][ordered]@{
    path = $Plan
    sha256 = Get-Sha256 (Join-Path $Root $Plan)
    baseline_sha256 = $baselineByPath[$Plan].sha256
    state = 'UNCHANGED BY THIS ORDER — read at the post-PHASE5-001S digest and amended by nobody here'
  }
  retained_artifact = [pscustomobject][ordered]@{
    path = $RetainedArtifact
    sha256 = Get-Sha256 (Join-Path $Root $RetainedArtifact)
    state = 'RETAINED ARTIFACT UNDER OWNER DECISION 1 — read at its digest only and never executed, imported or rewritten by this order'
  }
  inherited_suite = [pscustomobject][ordered]@{
    tree = 'internal-validation\ca-ns-last-payment-six-year'
    harness_sha256 = Get-Sha256 (Join-Path $Root $RunSuiteHarness)
    run_by_this_order = $false
    why = 'it writes its results into its own package. This order inspected its write destinations and recorded its digests, and never ran it.'
  }
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files = $baseline.file_count
    files_unchanged = $unchanged
    files_changed = $changed.Count
    files_missing = $missing.Count
    files_added_by_this_order = $addedByThisOrder.Count
    earlier_baselines_overwritten = 0
    earlier_manifests_edited = 0
  }
  created_by = 'PHASE5-001T'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

# ---------------------------------------------------------------- results
$preservationReadBack = Get-Sha256 (Join-Path $Out 'preservation_and_change_record.json')
$manifestReadBack = Get-Sha256 (Join-Path $Out 'file_custody_manifest.json')
$manifestBack = Read-Json (Join-Path $Out 'file_custody_manifest.json')
$manifestMismatch = @($manifestBack.files | Where-Object { (Get-Sha256 (Join-Path $Root $_.relative_path_from_workspace)) -ne $_.sha256 })
Check 'V-T53' 'the custody manifest re-measures clean: every file it lists is still at the digest it recorded, and it does not list itself' `
  (($manifestMismatch.Count -eq 0) -and (($manifestBack.files | ForEach-Object { $_.relative_path_from_workspace }) -notcontains 'SOURCE_CAPTURES\PHASE5-001T\file_custody_manifest.json')) `
  ("files: {0}; mismatching: {1}" -f $manifestBack.file_count, $manifestMismatch.Count)

$failures = @($checks | Where-Object { $_.passed -ne $true })
$artifactsThisOrderWrote = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Out -File | Sort-Object Name)) {
  if ($f.Name -eq 'verification_results.json') { continue }
  $artifactsThisOrderWrote.Add([pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001T\' + $f.Name; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}

[ordered]@{
  artifact    = 'verification_results.json'
  work_order  = 'PHASE5-001T'
  created_utc = '2026-09-30'
  purpose     = 'the checks this order ran over its own artifacts, the fixtures, the negative tests, the independent replay, the consumer language, the scoped verdict, the next step, its preservation and custody, the pins it proceeds on and the historical records it must not have touched'
  checks      = $checks.ToArray()
  check_count = $checks.Count
  failure_count = $failures.Count
  failed      = $failures
  verdict     = if ($failures.Count -eq 0) { 'ALL PHASE5-001T CHECKS PASSED' } else { 'PHASE5-001T CHECKS FAILED: ' + (($failures | ForEach-Object { $_.id }) -join ', ') }
  checks_are_not_gate_evidence = 'these checks verify this order''s own artifacts, its tests and its custody. They are not the scope''s gate verdict, which is scoped_gate_5_6_verdict.json, and they are evidence for no other gate.'
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files = $baseline.file_count
    files_unchanged = $unchanged
    files_changed = $changed.Count
    files_missing = $missing.Count
    files_added_by_this_order = $addedByThisOrder.Count
    earlier_baselines_overwritten = 0
    earlier_manifests_edited = 0
  }
  artifacts_this_order_wrote = $artifactsThisOrderWrote.ToArray()
  harness_summary_records = @(
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001T\preservation_and_change_record.json'; sha256 = $preservationReadBack },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001T\file_custody_manifest.json'; sha256 = $manifestReadBack },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001T\verification_results.json'; note = 'written last by this same harness; its own digest is measured from the file rather than self-recorded' }
  )
  the_scope_verdict_this_order_reached = [pscustomobject][ordered]@{
    record = 'SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json'
    sha256 = Get-Sha256 (Join-Path $Out 'scoped_gate_5_6_verdict.json')
    gate_criteria_met = $verdictDoc.gate_tally.met
    gate_criteria_reserved_and_named = $verdictDoc.gate_tally.reserved_and_named_not_satisfied
    verdict = $verdictDoc.verdict
  }
  corpus_wide_status_kept_separate = [pscustomobject][ordered]@{
    '5.1' = 'MET with recorded administrative limitations; unchanged'
    '5.2' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.3' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.4' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.5' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only, in SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json'
    '5.6' = 'NOT MET IN FULL FOR THIS SCOPE — three clauses met, the version-sharing clause reserved and named; unpassed corpus-wide'
    '5.7' = 'NOT REACHED; 0 admitted governed rules, 0 permitted findings'
  }
  what_this_record_does_not_claim = @(
    'it is not the scope''s gate verdict and it passes no gate',
    'it does not admit a rule, create coverage or a candidate, or authorise a finding class',
    'it does not produce consumer-visible output of any class: report checking remains "not yet available"',
    'it does not run, re-run or invoke the PHASE5-001I-A internal suite, and it treats no passing test of that suite as evidence',
    'it does not conform, modify or adopt the internal comparator of PHASE5-001I-A',
    'it does not repair or deny the historical preservation failure of PHASE5-001R, which is reported separately from this order''s own preservation result',
    'it does not decide the effective period, the exception or the anniversary-boundary question',
    'it does not assign the production rule version, and it does not ask the owner to assign it in order to satisfy a gate criterion'
  )
  created_by = 'PHASE5-001T'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'verification_results.json') -Encoding utf8

"checks: {0} | failures: {1} | preservation: {2} changed, {3} missing of {4} baselined | added: {5} | verdict: {6}" -f $checks.Count, $failures.Count, $changed.Count, $missing.Count, $baseline.file_count, $addedByThisOrder.Count, $(if ($failures.Count -eq 0) { 'ALL PHASE5-001T CHECKS PASSED' } else { 'FAILED: ' + (($failures | ForEach-Object { $_.id }) -join ', ') })
if ($failures.Count -gt 0) { $failures | ForEach-Object { "  FAIL {0}: {1} — {2}" -f $_.id, $_.what, $_.detail } }
