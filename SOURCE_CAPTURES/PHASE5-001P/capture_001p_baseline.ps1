# capture_001p_baseline.ps1 — PHASE5-001P step 0 and step 1's custody half.
#
# Read-only with respect to every pre-existing file. Writes only inside C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001P.
# (a) Takes a byte-level baseline of every pre-existing file BEFORE this order amends any governing document,
#     so preservation is proved by measurement rather than asserted.
# (b) Re-measures every input this order relies on and compares it with the digest the inherited record
#     (PHASE5-001I-C) recorded for the same file, so input custody is verified rather than assumed.
#     This runs BEFORE the amendments, so the comparison is against the unamended governing text.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001P'
if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- (a) baseline
$ownPackage = 'SOURCE_CAPTURES\PHASE5-001P'
$ownNarrative = 'CRP_PHASE5_001P_INCREMENTAL_UNIT_GATE_PROGRESSION.md'

$baseline = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if ($rel -like "$ownPackage*") { continue }
  if ($rel -eq $ownNarrative) { continue }
  $baseline.Add([pscustomobject][ordered]@{
    relative_path = $rel
    bytes         = $f.Length
    sha256        = Get-Sha256 $f.FullName
  })
}

[ordered]@{
  artifact    = 'preserved_files_before.json'
  work_order  = 'PHASE5-001P'
  created_utc = '2026-09-30'
  purpose     = 'byte-level baseline of every pre-existing file, taken before this order amended any governing document, so preservation is proved by measurement rather than asserted'
  method      = 'Get-ChildItem -Recurse -File -Force over the whole workspace, SHA-256 per file, taken before this order wrote anything except this package directory'
  excludes    = @(
    "$ownPackage\** (this order''s own output)",
    "$ownNarrative (this order''s narrative)"
  )
  file_count  = $baseline.Count
  total_bytes = ($baseline | Measure-Object bytes -Sum).Sum
  files       = $baseline.ToArray()
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Encoding utf8

"baseline files: {0}" -f $baseline.Count


# ---------------------------------------------------------------- (b) inputs
# The recorded digests this order re-verifies come from the durable input list PHASE5-001I-C recorded,
# plus the additional inputs this order reads. A file with no recorded digest is measured and marked
# NOT_PREVIOUSLY_RECORDED rather than treated as a mismatch.
$recorded = @{}
$iC = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json'
if (Test-Path -LiteralPath $iC) {
  $j = Get-Content -LiteralPath $iC -Raw | ConvertFrom-Json
  foreach ($r in $j.inputs_measured_before_writing.rows) { $recorded[$r.path] = $r.sha256.ToUpperInvariant() }
}

$extra = @(
  'CRP_CORE_CONSTITUTION.md',
  'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md',
  'CRP_PHASE5_NEXT_GATE_RECONCILIATION.md',
  'CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md',
  'CRP_PHASE5_001I_C_OWNER_REPRESENTATION_DECISIONS.md',
  'SOURCE_CAPTURES\PHASE5-001I-C\owner_representation_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001I-C\proposed_register_update.json',
  'SOURCE_CAPTURES\PHASE5-001K\file_custody_manifest.json',
  'SOURCE_CAPTURES\PROD-003\gate_prerequisites.json',
  'SOURCE_CAPTURES\PROD-003\report_representation_register.json',
  'SOURCE_CAPTURES\PROD-003\candidate_rule_units.json',
  'SOURCE_CAPTURES\PROD-003\crosswalk.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\classification_record.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\rule_record_draft.json',
  'consumer-wizard\dist\jurisdiction-data.js'
)
foreach ($p in $extra) { if (-not $recorded.ContainsKey($p)) { $recorded[$p] = $null } }

$rows = New-Object System.Collections.Generic.List[object]
$matches = 0; $mismatches = 0; $missing = 0; $newlyRecorded = 0
foreach ($p in ($recorded.Keys | Sort-Object)) {
  $abs = Join-Path $Root $p
  $exists = Test-Path -LiteralPath $abs -PathType Leaf
  $measuredBytes = $null; $measuredSha = $null
  if ($exists) { $measuredBytes = (Get-Item -LiteralPath $abs).Length; $measuredSha = Get-Sha256 $abs }
  $rec = $recorded[$p]
  $state = 'NOT_PREVIOUSLY_RECORDED'
  if (-not $exists) { $state = 'MISSING'; $missing++ }
  elseif ($null -eq $rec) { $newlyRecorded++ }
  elseif ($measuredSha -eq $rec) { $state = 'MATCHES_RECORDED_DIGEST'; $matches++ }
  else { $state = 'DIFFERS_FROM_RECORDED_DIGEST'; $mismatches++ }
  $rows.Add([pscustomobject][ordered]@{
    path            = $p
    exists          = $exists
    bytes           = $measuredBytes
    sha256          = $measuredSha
    recorded_sha256 = $rec
    state           = $state
  })
}

[ordered]@{
  artifact    = 'input_verification.json'
  work_order  = 'PHASE5-001P'
  created_utc = '2026-09-30'
  purpose     = 'verify, by re-measurement before any amendment, the exact inputs this order relies on, and reconcile each against the digest the inherited record (PHASE5-001I-C) recorded for the same file'
  method      = 'SHA-256 re-measured read-only immediately before the amendments; a file with no previously recorded digest is measured and marked NOT_PREVIOUSLY_RECORDED rather than treated as agreement or disagreement'
  input_count = $rows.Count
  matches_recorded_digest = $matches
  differs_from_recorded_digest = $mismatches
  missing = $missing
  measured_without_a_prior_recorded_digest = $newlyRecorded
  rows    = $rows.ToArray()
  boundary = 'A digest match proves the file is byte-identical to the file the inherited record measured. It is not a re-review of any legal content, and it decides no legal question.'
  created_by = 'PHASE5-001P'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Encoding utf8

"inputs: {0} | match {1} | differ {2} | missing {3} | newly recorded {4}" -f $rows.Count, $matches, $mismatches, $missing, $newlyRecorded
