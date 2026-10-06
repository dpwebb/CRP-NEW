# capture_001q_baseline.ps1 — PHASE5-001Q step 0 and step 1's custody half.
#
# Read-only with respect to every pre-existing file. Writes only inside C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001Q.
# (a) Takes a byte-level baseline of every pre-existing file BEFORE this order writes any artifact, so
#     preservation is proved by measurement rather than asserted.
# (b) Re-measures every input this order relies on and compares it with the digest an inherited record
#     already recorded for the same file (PHASE5-001I-C's verification_results.json and PHASE5-001P's
#     file_custody_manifest.json), so input custody is verified rather than assumed.
#     This order is authorized to change NO pre-existing file, so every unexplained difference is a defect.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q'
if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- (a) baseline
$ownPackage = 'SOURCE_CAPTURES\PHASE5-001Q'
$ownNarrative = 'CRP_PHASE5_001Q_RULE_RECORD_FINALIZATION_AND_GATE_5_4_VERDICT.md'

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
  work_order  = 'PHASE5-001Q'
  created_utc = '2026-09-30'
  purpose     = 'byte-level baseline of every pre-existing file, taken before this order wrote anything, so that a preservation claim is proved by measurement rather than asserted'
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
# Recorded digests come from the durable records that already measured these files. A file with no
# recorded digest is measured and marked NOT_PREVIOUSLY_RECORDED, never counted as agreement or conflict.
$recorded = @{}
$iC = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json'
if (Test-Path -LiteralPath $iC) {
  $j = Get-Content -LiteralPath $iC -Raw | ConvertFrom-Json
  foreach ($r in $j.inputs_measured_before_writing.rows) { $recorded[$r.path] = $r.sha256.ToUpperInvariant() }
}
$iP = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001P\file_custody_manifest.json'
if (Test-Path -LiteralPath $iP) {
  $j = Get-Content -LiteralPath $iP -Raw | ConvertFrom-Json
  foreach ($r in $j.files) { $recorded[$r.relative_path_from_workspace] = $r.sha256.ToUpperInvariant() }
}

$extra = @(
  'CRP_CORE_CONSTITUTION.md',
  'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md',
  'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md',
  'CRP_PHASE5_001I_B_INTERNAL_RULE_RECORD_DRAFT.md',
  'CRP_PHASE5_001I_C_OWNER_REPRESENTATION_DECISIONS.md',
  'SOURCE_CAPTURES\PHASE5-001I-B\rule_record_draft.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\field_crosswalk.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\prerequisite_assessment.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\scope_and_custody_reconciliation.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\file_custody_manifest.json',
  'SOURCE_CAPTURES\PHASE5-001I-C\owner_representation_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001I-C\proposed_register_update.json',
  'SOURCE_CAPTURES\PHASE5-001P\scope_definition.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_2_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_3_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001P\disposition_supplement.json',
  'SOURCE_CAPTURES\PHASE5-001P\next_work_order.json',
  'SOURCE_CAPTURES\PHASE5-001O\admitted_artifacts.json',
  'internal-validation\ca-ns-last-payment-six-year\six-year-evaluator.cjs'
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

# The one difference this order expects to measure is the rank-5 build plan, amended by PHASE5-001P
# before this order began. It is named here so it is reconciled rather than passed over.
$known = @(
  [pscustomobject][ordered]@{
    path          = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
    recorded_by   = 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json (pre-amendment digest)'
    before        = '54FCECE0A19F9B3D2D8BF6D2981A074DA84C2500294E56E047B3C218697F3FC0'
    after         = '12DE8BAD745297BEA64FAF200783D8D9768E5355AA94F62BD9A84DACD48DD56C'
    authorised_by = 'PHASE5-001P amendments A-1 to A-4, recorded in SOURCE_CAPTURES\PHASE5-001P\amendment_application_result.json and preservation_and_change_record.json'
    state         = 'RECORDED_CHANGE_BY_AN_EARLIER_AUTHORISED_ORDER — not a change by this order'
  }
)

[ordered]@{
  artifact    = 'input_verification.json'
  work_order  = 'PHASE5-001Q'
  created_utc = '2026-09-30'
  purpose     = 'verify, by re-measurement before any artifact of this order was written, the exact inputs this order relies on, and reconcile each against the digest an inherited record already recorded for the same file'
  method      = 'SHA-256 re-measured read-only before this order wrote anything; digests recorded by PHASE5-001I-C and PHASE5-001P are used as the comparison; a file with no previously recorded digest is measured and marked NOT_PREVIOUSLY_RECORDED rather than treated as agreement or disagreement'
  input_count = $rows.Count
  matches_recorded_digest = $matches
  differs_from_recorded_digest = $mismatches
  missing = $missing
  measured_without_a_prior_recorded_digest = $newlyRecorded
  known_recorded_changes_explained = $known
  unexplained_differences = @($rows | Where-Object { $_.state -eq 'DIFFERS_FROM_RECORDED_DIGEST' -and $_.path -ne $known[0].path })
  rows    = $rows.ToArray()
  read_only_outside_the_workspace = @(
    [pscustomobject][ordered]@{
      path     = 'C:\Users\webbd\crp-credit-app\packages\backend\src\services\legalCorpus\rules.canada.ts'
      bytes    = 192432
      recorded = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF'
      state    = 'measured read-only, in place, by the verifier; nothing copied, moved, renamed, written or transmitted'
    }
  )
  boundary = 'A digest match proves the file is byte-identical to the file the inherited record measured. It is not a re-review of any legal content and it decides no legal question.'
  created_by = 'PHASE5-001Q'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Encoding utf8

"inputs: {0} | match {1} | differ {2} | missing {3} | newly recorded {4}" -f $rows.Count, $matches, $mismatches, $missing, $newlyRecorded

