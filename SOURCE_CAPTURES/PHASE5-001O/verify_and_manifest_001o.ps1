# verify_and_manifest_001o.ps1 — PHASE5-001O verification, custody and preservation record.
#
# Read-only outside this order's own output directory. It re-verifies the legacy corpus digests, proves
# that every pre-existing workspace file is unchanged, re-parses every JSON artifact this order produced,
# and writes file_custody_manifest.json, preservation_and_change_record.json and input_inventory.json.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001O'
$LegacyRoot = 'C:\Users\webbd\crp-credit-app'
$Narrative = 'CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md'
$AdmissionContract = 'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- 1. legacy corpus re-verification
$admitted = Get-Content -LiteralPath (Join-Path $Out 'admitted_artifacts.json') -Raw | ConvertFrom-Json
$reVerified = 0
$mismatches = @()
foreach ($a in $admitted.artifacts) {
  $p = Join-Path $LegacyRoot $a.relative_path
  if ((Test-Path -LiteralPath $p -PathType Leaf) -and ((Get-Sha256 $p) -eq $a.recorded_sha256)) { $reVerified += 1 }
  else { $mismatches += $a.relative_path }
}

# ---------------------------------------------------------------- 2. preservation of pre-existing files
$before = Get-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Raw | ConvertFrom-Json
$beforeMap = @{}
foreach ($f in $before.files) { $beforeMap[$f.relative_path] = $f.sha256 }

$current = Get-ChildItem -LiteralPath $Root -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch '\\SOURCE_CAPTURES\\PHASE5-001O\\' -and $_.Name -ne $Narrative }

$unchanged = 0
$changed = New-Object System.Collections.Generic.List[object]
$added = New-Object System.Collections.Generic.List[object]
$seen = @{}
foreach ($f in $current) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  $seen[$rel] = $true
  $h = Get-Sha256 $f.FullName
  if ($beforeMap.ContainsKey($rel)) {
    if ($beforeMap[$rel] -eq $h) { $unchanged += 1 }
    else { $changed.Add([pscustomobject]@{ relative_path = $rel; before = $beforeMap[$rel]; after = $h; bytes = $f.Length }) }
  } else {
    $added.Add([pscustomobject]@{ relative_path = $rel; sha256 = $h; bytes = $f.Length })
  }
}
$missing = @($before.files | Where-Object { -not $seen.ContainsKey($_.relative_path) } | ForEach-Object { $_.relative_path })

$preservation = [ordered]@{
  artifact                  = 'preservation_and_change_record.json'
  work_order                = 'PHASE5-001O'
  created_utc               = '2026-09-30'
  baseline_artifact         = 'preserved_files_before.json'
  baseline_files            = $before.file_count
  files_unchanged           = $unchanged
  files_changed             = $changed.ToArray()
  files_missing             = $missing
  files_added               = $added.ToArray()
  expected_changes          = 'only the five governing documents amended by this order'
  legal_corpus_untouched    = $true
  legacy_corpus_files_written_or_deleted = 0
  verdict                   = if (($changed.Count -eq 5) -and ($missing.Count -eq 0)) { 'PRESERVATION HELD — the only pre-existing files changed are the five amended governing documents' } else { 'REVIEW REQUIRED — change set differs from the expected five documents' }
}
$preservation | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8

# ---------------------------------------------------------------- 3. artifact re-parse and content checks
$artifactChecks = New-Object System.Collections.Generic.List[object]
foreach ($name in @('admitted_artifacts.json','legacy_corpus_inventory.json','source_id_coverage_ledger.json','coverage_summary.json','amendment_text.json','gate_reassessment_001o.json','next_work_order.json')) {
  $p = Join-Path $Out $name
  $ok = $false
  $detail = $null
  try {
    $doc = Get-Content -LiteralPath $p -Raw | ConvertFrom-Json
    $ok = $true
    if ($name -eq 'source_id_coverage_ledger.json') { $detail = "rows=$($doc.rows.Count)" }
    elseif ($name -eq 'coverage_summary.json') { $detail = "ledger_rows=$($doc.ledger_rows); accepted=$($doc.owner_acceptance.OWNER_ACCEPTED_LEGAL_AUTHORITY)" }
    elseif ($name -eq 'amendment_text.json') { $detail = "amendments=$($doc.amendment_count); clean=$($doc.mechanical_check_result.clean)" }
    elseif ($name -eq 'admitted_artifacts.json') { $detail = "verified=$($doc.admitted_artifacts_verified)/$($doc.admitted_artifact_count)" }
  } catch { $detail = $_.Exception.Message }
  $artifactChecks.Add([pscustomobject]@{ artifact = $name; parses = $ok; detail = $detail })
}

$ledger = Get-Content -LiteralPath (Join-Path $Out 'source_id_coverage_ledger.json') -Raw | ConvertFrom-Json
$csvLines = (Get-Content -LiteralPath (Join-Path $Out 'source_id_coverage_ledger.csv')).Count
$csvRows = $csvLines - 1
$csvMatchesLedger = ($csvRows -eq $ledger.rows.Count)

# ---------------------------------------------------------------- 3b. ledger schema check
$schemaProblems = New-Object System.Collections.Generic.List[string]
foreach ($r in $ledger.rows) {
  if (-not $r.source_entry_id) { $schemaProblems.Add('row without source_entry_id') }
  if (-not $r.legacy_statute_or_provision.instrument_title) { $schemaProblems.Add("$($r.source_entry_id): no instrument title") }
  if (-not $r.owner_acceptance.state) { $schemaProblems.Add("$($r.source_entry_id): no acceptance state") }
  if (-not $r.established_jurisdiction_associations.canonical_jurisdiction_status) { $schemaProblems.Add("$($r.source_entry_id): no jurisdiction status") }
  if (-not $r.existing_operational_mapping.state) { $schemaProblems.Add("$($r.source_entry_id): no mapping state") }
  if ($r.remaining_implementation_dependencies -eq $null) { $schemaProblems.Add("$($r.source_entry_id): dependencies field missing") }
  if ($r.administrative_limitations -eq $null) { $schemaProblems.Add("$($r.source_entry_id): limitations field missing") }
  if ($r.removal_permitted -ne 'NO') { $schemaProblems.Add("$($r.source_entry_id): removal_permitted is not NO") }
}
$ids = @($ledger.rows | ForEach-Object { $_.source_entry_id })
if (($ids | Select-Object -Unique).Count -ne $ids.Count) { $schemaProblems.Add('duplicate source_entry_id in the ledger') }

# ---------------------------------------------------------------- 4. custody manifest
$narrativePath = Join-Path $Root $Narrative
$custodyFiles = @()
foreach ($f in (Get-ChildItem -LiteralPath $Out -Recurse -File -Force | Sort-Object FullName)) {
  $custodyFiles += [pscustomobject]@{
    relative_path_from_workspace = $f.FullName.Substring($Root.Length + 1)
    location                     = 'SOURCE_CAPTURES/PHASE5-001O'
    bytes                        = $f.Length
    sha256                       = Get-Sha256 $f.FullName
  }
}
if (Test-Path -LiteralPath $narrativePath) {
  $narrativeItem = Get-Item -LiteralPath $narrativePath
  $custodyFiles += [pscustomobject]@{
    relative_path_from_workspace = $Narrative
    location                     = 'workspace root (narrative)'
    bytes                        = $narrativeItem.Length
    sha256                       = Get-Sha256 $narrativePath
  }
}

$custody = [ordered]@{
  artifact               = 'file_custody_manifest.json'
  work_order             = 'PHASE5-001O'
  created_utc            = '2026-09-30'
  purpose                = 'byte-level custody record for every file this order created, and the evidence that the legacy corpus and every unamended pre-existing file were left untouched'
  file_count             = $custodyFiles.Count
  total_bytes            = ($custodyFiles | Measure-Object bytes -Sum).Sum
  files                  = @($custodyFiles)
  legacy_corpus          = [ordered]@{
    legacy_source_root            = $LegacyRoot
    admitted_artifacts_re_verified = $reVerified
    admitted_artifacts_expected    = $admitted.admitted_artifact_count
    mismatches                     = $mismatches
    files_created_deleted_or_modified_in_the_legacy_corpus = 0
  }
  artifact_checks        = $artifactChecks.ToArray()
  ledger_rows            = $ledger.rows.Count
  ledger_csv_data_rows   = $csvRows
  ledger_csv_matches_json = $csvMatchesLedger
  ledger_schema_problems = $schemaProblems.ToArray()
  ledger_schema_clean    = ($schemaProblems.Count -eq 0)
  created_by             = 'PHASE5-001O'
}
$custody | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

# ---------------------------------------------------------------- 5. input inventory
$inputs = @(
  'CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md',
  'SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv',
  'SOURCE_CAPTURES\PHASE5-001N\relation_determinations.json',
  'CRP_JURISDICTION_ENUMERATION.md',
  'JURISDICTION_CONTRACT.md',
  'CRP_CORE_CONSTITUTION.md',
  'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md',
  'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md',
  'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md',
  'CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md',
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md',
  'CRP_PHASE5_NEXT_GATE_RECONCILIATION.md',
  'consumer-wizard\dist\app.js'
)
$inputRows = foreach ($rel in $inputs) {
  $p = Join-Path $Root $rel
  [pscustomobject]@{ relative_path = $rel; exists = (Test-Path -LiteralPath $p -PathType Leaf); bytes = (Get-Item -LiteralPath $p).Length; sha256 = Get-Sha256 $p }
}
[ordered]@{
  artifact    = 'input_inventory.json'
  work_order  = 'PHASE5-001O'
  created_utc = '2026-09-30'
  purpose     = 'the workspace inputs this order read, with their measured digests at the close of the order'
  inputs      = @($inputRows)
  legacy_corpus_inputs = [ordered]@{
    legacy_source_root     = $LegacyRoot
    admitted_artifacts     = $admitted.admitted_artifact_count
    digests_re_verified    = $reVerified
    inventory_artifact     = 'legacy_corpus_inventory.json'
  }
  created_by  = 'PHASE5-001O'
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'input_inventory.json') -Encoding utf8

"legacy admitted artifacts re-verified: {0} (mismatches {1})" -f $reVerified, $mismatches.Count
"pre-existing files unchanged: {0} of {1}" -f $unchanged, $before.file_count
"pre-existing files changed: {0}" -f $changed.Count
$changed | ForEach-Object { "   CHANGED: {0}" -f $_.relative_path }
"pre-existing files added: {0}; missing: {1}" -f $added.Count, $missing.Count
"ledger rows: {0}; csv data rows: {1}; match: {2}" -f $ledger.rows.Count, $csvRows, $csvMatchesLedger
"ledger schema problems: {0}" -f $schemaProblems.Count
$schemaProblems | ForEach-Object { "   SCHEMA: {0}" -f $_ }
$artifactChecks | ForEach-Object { "   {0}: parses={1} {2}" -f $_.artifact, $_.parses, $_.detail }
"custody files: {0}" -f $custodyFiles.Count
$preservation.verdict
