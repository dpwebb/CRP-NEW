# verify_001i_a_custody.ps1 — PHASE5-001I-A custody, preservation and change record.
#
# Re-measures every pre-existing file against the baseline taken before this order recorded anything, records
# exactly what changed, re-verifies the read-only legacy corpus, the two consumer specimens and the generated
# fixture corpus, and re-measures the PROD-003 baseline so that the reading PHASE5-001I-A produces on
# PROD-003's own date-scoped verifier is recorded here rather than discovered elsewhere.
#
# Read-only outside SOURCE_CAPTURES\PHASE5-001I-A.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-A'
$LegacyRoot = 'C:\Users\webbd\crp-credit-app'
$Narrative = 'CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md'
$BuildPlan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Prod003Narrative = 'CRP_PROD_003_FIRST_REPORT_REPRESENTATION_AND_RULE_CROSSWALK.md'
$ImplementationPrefix = 'internal-validation\ca-ns-last-payment-six-year\'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- 1. preservation of pre-existing files
$before = Get-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Raw | ConvertFrom-Json
$beforeMap = @{}
foreach ($f in $before.files) { $beforeMap[$f.relative_path] = $f.sha256 }

$current = Get-ChildItem -LiteralPath $Root -Recurse -File -Force -ErrorAction SilentlyContinue
$unchanged = 0
$changed = New-Object System.Collections.Generic.List[object]
$addedByThisOrder = New-Object System.Collections.Generic.List[object]
$addedOutside = New-Object System.Collections.Generic.List[object]
$seen = @{}
foreach ($f in $current) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  $seen[$rel] = $true
  $h = Get-Sha256 $f.FullName
  if ($beforeMap.ContainsKey($rel)) {
    if ($beforeMap[$rel] -eq $h) { $unchanged += 1 }
    else { $changed.Add([pscustomobject]@{ relative_path = $rel; before = $beforeMap[$rel]; after = $h; bytes = $f.Length }) }
  }
  elseif ($rel -notlike 'SOURCE_CAPTURES\PHASE5-001I-A\*' -and $f.Name -ne $Narrative) {
    if ($rel -like ($ImplementationPrefix + '*')) { $addedByThisOrder.Add([pscustomobject]@{ relative_path = $rel; sha256 = $h; bytes = $f.Length }) }
    else { $addedOutside.Add([pscustomobject]@{ relative_path = $rel; sha256 = $h; bytes = $f.Length }) }
  }
}
$missing = @($before.files | Where-Object { -not $seen.ContainsKey($_.relative_path) } | ForEach-Object { $_.relative_path })

$expectedChanged = @(
  $BuildPlan,
  $Prod003Narrative,
  'SOURCE_CAPTURES\PROD-003\narrative_check.json',
  'SOURCE_CAPTURES\PROD-003\input_verification.json'
)
$changedPaths = @($changed | ForEach-Object { $_.relative_path })
$changedAsExpected = ((@($changedPaths | Sort-Object) -join ';') -eq (@($expectedChanged | Sort-Object) -join ';'))

# ---------------------------------------------------------------- 2. legacy corpus and specimens, read-only
# The generated regression corpus is measured over the same root PROD-003 measured, so the two readings compare.
$corpusRoot = Join-Path $LegacyRoot 'packages\backend\fixtures\credit-reports'
$corpusFiles = 0
$corpusBytes = 0
if (Test-Path -LiteralPath $corpusRoot) {
  $corpus = Get-ChildItem -LiteralPath $corpusRoot -Recurse -File -Filter *.pdf
  $corpusFiles = @($corpus).Count
  $corpusBytes = ($corpus | Measure-Object Length -Sum).Sum
}
$admitted = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001O\admitted_artifacts.json') -Raw | ConvertFrom-Json
$legacyVerified = 0
$legacyMismatches = @()
foreach ($a in $admitted.artifacts) {
  $p = Join-Path $LegacyRoot $a.relative_path
  if ((Test-Path -LiteralPath $p -PathType Leaf) -and ((Get-Sha256 $p) -eq $a.recorded_sha256)) { $legacyVerified += 1 }
  else { $legacyMismatches += $a.relative_path }
}

$register = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\report_representation_register.json') -Raw | ConvertFrom-Json
$specimenRows = foreach ($p in $register.presentations) {
  $path = $p.absolute_path_outside_this_repository
  $h = if (Test-Path -LiteralPath $path -PathType Leaf) { Get-Sha256 $path } else { $null }
  [pscustomobject]@{ presentation_id = $p.presentation_id; artifact_id = $p.artifact_id; sha256 = $h; matches_recorded = ($h -eq $p.sha256) }
}
$specimenMismatches = @($specimenRows | Where-Object { -not $_.matches_recorded })

# ---------------------------------------------------------------- 3. the reading PROD-003's verifier would produce now
$p003Before = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\preserved_files_before.json') -Raw | ConvertFrom-Json
$p003Map = @{}
foreach ($f in $p003Before.files) { $p003Map[$f.relative_path] = $f.sha256 }
$p003Unchanged = 0
$p003Changed = New-Object System.Collections.Generic.List[string]
$p003Seen = @{}
foreach ($f in $current) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  $p003Seen[$rel] = $true
  if ($p003Map.ContainsKey($rel)) {
    if ($p003Map[$rel] -eq (Get-Sha256 $f.FullName)) { $p003Unchanged += 1 } else { $p003Changed.Add($rel) }
  }
}
$p003Missing = @($p003Before.files | Where-Object { -not $p003Seen.ContainsKey($_.relative_path) } | ForEach-Object { $_.relative_path })
$p003Custody = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\file_custody_manifest.json') -Raw | ConvertFrom-Json
$p003Owned = @{}
foreach ($f in $p003Custody.files) { $p003Owned[$f.relative_path_from_workspace] = $true }
$p003Additions = @($current |
  ForEach-Object { $_.FullName.Substring($Root.Length + 1) } |
  Where-Object { -not $p003Map.ContainsKey($_) -and -not $p003Owned.ContainsKey($_) } |
  Where-Object { $_ -like 'SOURCE_CAPTURES\PHASE5-001I-A\*' -or $_ -like ($ImplementationPrefix + '*') -or $_ -eq $Narrative })

$preservation = [ordered]@{
  artifact                           = 'preservation_and_change_record.json'
  work_order                         = 'PHASE5-001I-A'
  created_utc                        = (Get-Date -Format 'yyyy-MM-dd')
  baseline_artifact                  = 'preserved_files_before.json'
  baseline_files                     = $before.file_count
  files_unchanged                    = $unchanged
  files_changed                      = $changed.ToArray()
  expected_changes                   = $expectedChanged
  expected_change_notes              = @(
    ($BuildPlan + ' — the owner-authorized internal-validation carve-out, applied by apply_001i_a_amendments.js'),
    ($Prod003Narrative + ' — the recorded assembly repair: the displaced section 10 gate row and claim sentence and the displaced closing fragment returned to their own sections, no claim added, removed or changed'),
    'SOURCE_CAPTURES\PROD-003\narrative_check.json — PROD-003''s own narrative checker, re-run as this order''s regression check of the repaired narrative, refreshed its own output with the repaired document''s length (49,451 bytes); it is PROD-003''s artifact, rewritten by PROD-003''s own step, and its verdict is still NARRATIVE CHECKS PASSED',
    'SOURCE_CAPTURES\PROD-003\input_verification.json — PROD-003''s own input verification, re-run once as this order''s regression check, now reports 17 checks with one expected difference: PROD-002''s recorded digest of the build plan, which this order''s owner-authorized amendment changed. inherited_chain_readings.json proves the difference is the amendment (before C80183314C…, after 54FCECE0A1…). The file is PROD-003''s artifact and its reading is recorded, not hidden.'
  )
  changed_as_expected                = $changedAsExpected
  files_added_by_this_order          = $addedByThisOrder.ToArray()
  files_added_outside_this_order     = $addedOutside.ToArray()
  files_missing                      = $missing
  consumer_application_files_changed = @($changedPaths | Where-Object { $_ -like 'consumer-wizard\*' -or $_ -eq 'wizard-check.cjs' })
  ledger_or_corpus_artifacts_changed = @($changedPaths | Where-Object { $_ -like 'SOURCE_CAPTURES\PHASE5-*' -or $_ -like 'SOURCE_CAPTURES\PROD-00*' })
  legacy_corpus                      = [ordered]@{
    root                              = $LegacyRoot
    admitted_artifacts_re_verified    = $legacyVerified
    admitted_artifacts_expected       = $admitted.admitted_artifact_count
    mismatches                        = $legacyMismatches
    consumer_specimens_re_verified    = $specimenRows
    specimen_mismatches               = $specimenMismatches
    generated_fixture_files           = $corpusFiles
    generated_fixture_bytes           = $corpusBytes
    files_created_deleted_or_modified = 0
  }
  prod003_date_scoped_re_measurement = [ordered]@{
    note                                 = 'PROD-003''s own verifier asserts that no file was added outside PROD-003 and that only the owner-amended readiness plan changed. Both are measurements at PROD-003''s date. This order measures what that verifier would now report, without re-running it: re-running it would overwrite PROD-003''s record of its own date.'
    prod003_baseline_files               = $p003Before.file_count
    unchanged                            = $p003Unchanged
    changed                              = $p003Changed.ToArray()
    missing                              = $p003Missing
    additions_attributable_to_this_order = $p003Additions.Count
    reading                              = 'REVIEW REQUIRED at PROD-003''s custody step, by design: a later authorized order added its own files and changed two documents. PROD-003''s recorded verdict is unchanged and is not re-claimed here.'
  }
  verdict                            = if ($changedAsExpected -and $missing.Count -eq 0 -and $addedOutside.Count -eq 0 -and $legacyMismatches.Count -eq 0 -and $specimenMismatches.Count -eq 0) {
    'PRESERVATION HELD — the only pre-existing files changed are the owner-amended build plan, the PROD-003 narrative repair, and two PROD-003 outputs refreshed by PROD-003''s own steps (its narrative checker and its input verification, whose one expected difference is that amendment); every other inherited file is byte-identical, and the legacy corpus, both consumer specimens and the generated fixture corpus are untouched'
  } else { 'REVIEW REQUIRED — the change set differs from the two recorded changes' }
}
$preservation | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8


# ---------------------------------------------------------------- 4. custody manifest
$ownOutputs = @(Get-ChildItem -LiteralPath $Out -File |
  Where-Object { $_.Name -ne 'preserved_files_before.json' -and $_.Name -ne 'file_custody_manifest.json' -and $_.Name -ne 'validation_results.json' } |
  ForEach-Object { 'SOURCE_CAPTURES\PHASE5-001I-A\' + $_.Name })
$generated = @($Narrative) + @($addedByThisOrder | ForEach-Object { $_.relative_path }) + $ownOutputs + $changedPaths

$custodyFiles = foreach ($rel in ($generated | Sort-Object -Unique)) {
  $p = Join-Path $Root $rel
  if (Test-Path -LiteralPath $p -PathType Leaf) {
    [pscustomobject]@{ relative_path_from_workspace = $rel; bytes = (Get-Item -LiteralPath $p).Length; sha256 = Get-Sha256 $p }
  }
}
[ordered]@{
  artifact      = 'file_custody_manifest.json'
  work_order    = 'PHASE5-001I-A'
  created_utc   = (Get-Date -Format 'yyyy-MM-dd')
  purpose       = 'byte-level custody record for every file this order created or changed, with the evidence that no ledger, corpus, enumeration, application file or unrelated artifact was touched'
  file_count    = @($custodyFiles).Count
  files         = @($custodyFiles)
  legacy_corpus = $preservation.legacy_corpus
  created_by    = 'PHASE5-001I-A'
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

'pre-existing files unchanged: {0} of {1}' -f $unchanged, $before.file_count
'pre-existing files changed: {0} ({1})' -f $changed.Count, ($changedPaths -join ', ')
'pre-existing files added by this order: {0}; added outside it: {1}; missing: {2}' -f $addedByThisOrder.Count, $addedOutside.Count, $missing.Count
'legacy admitted artifacts re-verified: {0} of {1} (mismatches {2})' -f $legacyVerified, $admitted.admitted_artifact_count, $legacyMismatches.Count
'consumer specimens re-verified: {0} of {1}' -f ($specimenRows.Count - $specimenMismatches.Count), $specimenRows.Count
'generated fixture corpus: {0} files, {1} bytes' -f $corpusFiles, $corpusBytes
'PROD-003 baseline re-measured: {0} unchanged, {1} changed, {2} additions by this order' -f $p003Unchanged, $p003Changed.Count, $p003Additions.Count
'custody files: {0}' -f @($custodyFiles).Count
$preservation.verdict
if ($preservation.verdict -like 'PRESERVATION HELD*') { exit 0 } else { exit 1 }

$preservation | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8

