# run_001i_a_all.ps1 — PHASE5-001I-A end-to-end validation.
#
# Runs every check this order defines, in order, and writes SOURCE_CAPTURES\PHASE5-001I-A\validation_results.json.
# Nothing here deploys, uploads, transmits consumer data or changes the application. The only pre-existing files
# any step may change are the amended build plan and the repaired PROD-003 narrative, both recorded in
# verify_001i_a_custody.ps1.
#
# PROD-003's own chain is run here as steps 1 to 7 of this order's regression check, except its custody step:
# that step asserts "no file was added outside PROD-003", which is a measurement at PROD-003's date and cannot
# remain true once a later authorized order exists (PROD-002's record is stale in exactly the same way).
# Re-running it would overwrite PROD-003's record of its own date, so this order re-measures that baseline
# inside verify_001i_a_custody.ps1 instead.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-A'
Set-Location $Root

$steps = @(
  [pscustomobject]@{ name = '1_input_and_prerequisite_verification';   command = 'node SOURCE_CAPTURES\PHASE5-001I-A\verify_001i_a_inputs.cjs' }
  [pscustomobject]@{ name = '2_pinned_run_extraction_record';          command = 'node SOURCE_CAPTURES\PHASE5-001I-A\build_001i_a_extraction_record.cjs' }
  [pscustomobject]@{ name = '3_pinned_run_evaluation_record';          command = 'node SOURCE_CAPTURES\PHASE5-001I-A\build_001i_a_evaluation_record.cjs' }
  [pscustomobject]@{ name = '4_governance_records';                    command = 'node SOURCE_CAPTURES\PHASE5-001I-A\build_001i_a_governance_records.cjs' }
  [pscustomobject]@{ name = '5_unit_test_suite';                       command = 'node internal-validation\ca-ns-last-payment-six-year\tests\run-tests.cjs' }
  [pscustomobject]@{ name = '6_identifier_scan';                       command = 'node SOURCE_CAPTURES\PHASE5-001I-A\scan_001i_a_identifiers.cjs' }
  [pscustomobject]@{ name = '7_custody_and_preservation';              command = 'pwsh -NoProfile -File SOURCE_CAPTURES\PHASE5-001I-A\verify_001i_a_custody.ps1' }
  [pscustomobject]@{ name = '8_narrative_checks';                      command = 'node SOURCE_CAPTURES\PHASE5-001I-A\check_001i_a_narrative.cjs' }
  [pscustomobject]@{ name = '9_prod003_regression_narrative_checks';   command = 'node SOURCE_CAPTURES\PROD-003\check_prod003_narrative.cjs' }
  [pscustomobject]@{ name = '10_prod003_regression_amendment_step';    command = 'node SOURCE_CAPTURES\PROD-003\apply_prod003_amendments.js' }
  [pscustomobject]@{ name = '11_prod003_regression_structural_tests';  command = 'node SOURCE_CAPTURES\PROD-003\test_prod003_crosswalk.cjs' }
  [pscustomobject]@{ name = '12_demo_flow_self_check';                 command = 'node wizard-check.cjs' }
  [pscustomobject]@{ name = '13_prod002_build_check';                  command = 'node SOURCE_CAPTURES\PROD-002\check_prod002_jurisdiction_data.cjs' }
  [pscustomobject]@{ name = '14_inherited_chain_readings';             command = 'node SOURCE_CAPTURES\PHASE5-001I-A\verify_001i_a_inherited_chain.cjs' }
  [pscustomobject]@{ name = '15_custody_manifest_completion';          command = 'pwsh -NoProfile -File SOURCE_CAPTURES\PHASE5-001I-A\verify_001i_a_custody.ps1' }
)

$results = New-Object System.Collections.Generic.List[object]
foreach ($step in $steps) {
  Write-Host ("=== {0} ===" -f $step.name)
  $output = Invoke-Expression $step.command 2>&1 | Out-String
  $code = $LASTEXITCODE
  Write-Host $output.TrimEnd()
  $results.Add([pscustomobject]@{
    step      = $step.name
    command   = $step.command
    exit_code = $code
    passed    = ($code -eq 0)
    output    = $output.Trim()
  })
}

$failed = @($results | Where-Object { -not $_.passed })
$doc = [ordered]@{
  artifact    = 'validation_results.json'
  work_order  = 'PHASE5-001I-A'
  created_utc = (Get-Date -Format 'yyyy-MM-dd')
  purpose     = 'the end-to-end validation record for the bounded internal validation of one candidate extractor and its deterministic comparison'
  note        = 'No gate is passed by any step. Steps 1 to 8 are this order''s own checks. Step 7 runs the custody verifier first so the narrative checks read a current preservation reading; step 15 runs it again as the manifest-completing run, because the last evidence files are written after step 7. Steps 9 to 13 are regression checks that the inherited PROD-003 and PROD-002 chains still pass; step 14 records, read-only, that the only difference those chains see is this order''s recorded owner amendment.'
  steps       = @($results | ForEach-Object { [pscustomobject]@{ step = $_.step; command = $_.command; exit_code = $_.exit_code; passed = $_.passed; output = $_.output } })
  failures    = @($failed | ForEach-Object { $_.step })
  verdict     = if ($failed.Count -eq 0) { 'ALL PHASE5-001I-A VALIDATION PASSED' } else { 'VALIDATION FAILED — see failures' }
}
$doc | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'validation_results.json') -Encoding utf8

''
'steps: {0}; failed: {1}' -f $results.Count, $failed.Count
$doc.verdict
if ($failed.Count -gt 0) { exit 1 } else { exit 0 }
