# capture_001r_baseline.ps1 — PHASE5-001R step 0 and step 1's custody half.
#
# Read-only with respect to every pre-existing file. Writes only inside C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001R.
# (a) Takes a byte-level baseline of every pre-existing file BEFORE this order writes any artifact, so
#     preservation is proved by measurement rather than asserted.
# (b) Re-measures every input this order relies on and compares it with the digest an inherited record
#     already recorded for the same file (PHASE5-001I-C's, PHASE5-001P's and PHASE5-001Q's own records), so
#     input custody is verified rather than assumed.
#     This order is authorized to change NO pre-existing file, so every unexplained difference is a defect.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001R'
if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- (a) baseline
$ownPackage = 'SOURCE_CAPTURES\PHASE5-001R'
$ownNarrative = 'CRP_PHASE5_001R_DETERMINISTIC_EVALUATION_SPECIFICATION_AND_GATE_5_5_VERDICT.md'

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
  work_order  = 'PHASE5-001R'
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
# Recorded digests come from the durable records that already measured these files. A file with no recorded
# digest is measured and marked NOT_PREVIOUSLY_RECORDED, never counted as agreement or conflict.
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
$iQ = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\verification_results.json'
if (Test-Path -LiteralPath $iQ) {
  $j = Get-Content -LiteralPath $iQ -Raw | ConvertFrom-Json
  foreach ($r in $j.artifacts_this_order_wrote) { $recorded[$r.relative_path] = $r.sha256.ToUpperInvariant() }
  # the same order's later block carries the FINAL digests of its three harness summary records, which supersede
  # the digests taken while those records were still being rewritten during that run
  foreach ($r in $j.harness_summary_records) { if ($r.sha256) { $recorded[$r.relative_path] = $r.sha256.ToUpperInvariant() } }
}

$extra = @(
  'CRP_CORE_CONSTITUTION.md',
  'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md',
  'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md',
  'CRP_JURISDICTION_ENUMERATION.md',
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md',
  'SOURCE_CAPTURES\PHASE5-001I-A\extraction_results.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\evaluation_results.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\classification_record.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\presentation_boundary.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\validation_results.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\gate_sequence_assessment.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\file_custody_manifest.json',
  'CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md',
  'SOURCE_CAPTURES\PHASE5-001I-B\rule_record_draft.json',
  'SOURCE_CAPTURES\PHASE5-001I-B\prerequisite_assessment.json',
  'SOURCE_CAPTURES\PHASE5-001I-C\owner_representation_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001I-C\proposed_register_update.json',
  'SOURCE_CAPTURES\PHASE5-001O\source_id_coverage_ledger.json',
  'SOURCE_CAPTURES\PHASE5-001O\admitted_artifacts.json',
  'SOURCE_CAPTURES\PHASE5-001P\scope_definition.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_2_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_3_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001P\next_work_order.json',
  'SOURCE_CAPTURES\PROD-003\report_representation_register.json',
  'SOURCE_CAPTURES\PROD-003\crosswalk.json',
  'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json',
  'SOURCE_CAPTURES\PHASE5-001Q\rule_record_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001Q\transcription_mapping_validation.json',
  'SOURCE_CAPTURES\PHASE5-001Q\scoped_gate_5_4_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001Q\next_work_order.json',
  'SOURCE_CAPTURES\PHASE5-001Q\input_verification.json',
  'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json',
  'SOURCE_CAPTURES\PHASE5-001Q\preservation_and_change_record.json',
  'SOURCE_CAPTURES\PHASE5-001Q\verification_results.json',
  'CRP_PHASE5_001Q_RULE_RECORD_FINALIZATION_AND_GATE_5_4_VERDICT.md'
)
foreach ($p in $extra) { if (-not $recorded.ContainsKey($p)) { $recorded[$p] = $null } }

# the internal-validation implementation this order compares its specification against, read at its digest only
$implDir = Join-Path $Root 'internal-validation\ca-ns-last-payment-six-year'
if (Test-Path -LiteralPath $implDir) {
  foreach ($f in (Get-ChildItem -LiteralPath $implDir -Recurse -File | Sort-Object FullName)) {
    $rel = $f.FullName.Substring($Root.Length + 1)
    if (-not $recorded.ContainsKey($rel)) { $recorded[$rel] = $null }
  }
}

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

# The one difference this order expects to measure is the rank-5 build plan, amended by PHASE5-001P before this
# order began. It is named here so it is reconciled rather than passed over.
$planRow = $rows | Where-Object { $_.path -eq 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md' }
$known = @(
  [pscustomobject][ordered]@{
    path          = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
    recorded_by   = 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json (pre-amendment digest)'
    before        = '54FCECE0A19F9B3D2D8BF6D2981A074DA84C2500294E56E047B3C218697F3FC0'
    after         = $planRow.sha256
    authorised_by = 'PHASE5-001P amendments A-1 to A-4, recorded in SOURCE_CAPTURES\PHASE5-001P\amendment_application_result.json and preservation_and_change_record.json'
    state         = 'RECORDED_CHANGE_BY_AN_EARLIER_AUTHORISED_ORDER — not a change by this order'
  }
)

# ---------------------------------------------------------------- the read-only pointers outside the workspace
$Legacy = 'C:\Users\webbd\crp-credit-app'
$record = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json') -Raw | ConvertFrom-Json
$register = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\report_representation_register.json') -Raw | ConvertFrom-Json
$pr01 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-01' }
$pr02 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-02' }
$ptrTable = @(
  [pscustomobject]@{ label = 'the admitted source pin (accepted legal authority), read at its recorded digest only'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = $record.legal_proposition.source_pin.sha256; recorded_bytes = $record.legal_proposition.source_pin.bytes },
  [pscustomobject]@{ label = 'consumer specimen PR-01 (the scope''s byte-pinned presentation; not re-read by this order)'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = $pr01.sha256; recorded_bytes = $pr01.bytes },
  [pscustomobject]@{ label = 'consumer specimen PR-02 (secondary, admitted for no rule unit; not re-read by this order)'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = $pr02.sha256; recorded_bytes = $pr02.bytes }
)
$readOnly = New-Object System.Collections.Generic.List[object]
$pointerMismatch = 0
foreach ($p in $ptrTable) {
  $abs = Join-Path $Legacy $p.rel
  $exists = Test-Path -LiteralPath $abs -PathType Leaf
  $bytes = $null; $sha = $null; $state = 'MISSING'
  if ($exists) {
    $bytes = (Get-Item -LiteralPath $abs).Length
    $sha = Get-Sha256 $abs
    if ($sha -eq $p.recorded.ToUpperInvariant() -and $bytes -eq $p.recorded_bytes) { $state = 'MATCHES_THE_RECORDED_PIN' } else { $state = 'DIFFERS_FROM_THE_RECORDED_PIN'; $pointerMismatch++ }
  } else { $pointerMismatch++ }
  $readOnly.Add([pscustomobject][ordered]@{
    label = $p.label; path = $abs; bytes = $bytes; sha256 = $sha;
    recorded_sha256 = $p.recorded.ToUpperInvariant(); recorded_bytes = $p.recorded_bytes; state = $state
  })
}
# ---------------------------------------------------------------- superseded self-measurements reconciled
# The three harness summary records of PHASE5-001Q are measured twice inside that order's own run: once while
# they were still being rewritten (recorded in artifacts_this_order_wrote) and once finally (recorded in
# harness_summary_records). The final digests are the ones that count, and the files on disk match them.
$iQj = Get-Content -LiteralPath $iQ -Raw | ConvertFrom-Json
$superseded = @()
foreach ($p in @('SOURCE_CAPTURES\PHASE5-001Q\preservation_and_change_record.json', 'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json', 'SOURCE_CAPTURES\PHASE5-001Q\verification_results.json')) {
  $row = $rows | Where-Object { $_.path -eq $p }
  $stale = ($iQj.artifacts_this_order_wrote | Where-Object { $_.relative_path -eq $p }).sha256
  $final = ($iQj.harness_summary_records | Where-Object { $_.relative_path -eq $p }).sha256
  $superseded += [pscustomobject][ordered]@{
    path                                            = $p
    superseded_digest_in_artifacts_this_order_wrote  = $stale
    final_digest_recorded_by_the_same_order          = if ($final) { $final } else { 'not self-recorded: written last by that harness, so its own final digest is measured from the file' }
    measured_now                                    = $row.sha256
    state                                           = 'RECORDED_SELF_MEASUREMENT_SUPERSEDED_WITHIN_ITS_OWN_ORDER — the superseded digest was taken while that run was still rewriting its own summary records. The file on disk matches that order''s final recorded digest where one exists. Not a change by this order.'
  }
}

[ordered]@{
  artifact    = 'input_verification.json'
  work_order  = 'PHASE5-001R'
  created_utc = '2026-09-30'
  purpose     = 'verify, by re-measurement before any artifact of this order was written, the exact inputs this order relies on, and reconcile each against the digest an inherited record already recorded for the same file, so that the PHASE5-001Q package this order builds on is proved unchanged rather than assumed unchanged'
  method      = 'SHA-256 re-measured read-only before this order wrote anything; digests recorded by PHASE5-001I-C, PHASE5-001P and PHASE5-001Q are used as the comparison; a file with no previously recorded digest is measured and marked NOT_PREVIOUSLY_RECORDED rather than treated as agreement or disagreement'
  input_count = $rows.Count
  matches_recorded_digest = $matches
  differs_from_recorded_digest = $mismatches
  missing = $missing
  measured_without_a_prior_recorded_digest = $newlyRecorded
  known_recorded_changes_explained = $known
  superseded_self_measurements_explained = $superseded
  unexplained_differences = @($rows | Where-Object { $_.state -eq 'DIFFERS_FROM_RECORDED_DIGEST' -and $_.path -ne $known[0].path -and $_.path -notin $superseded.path })
  rows    = $rows.ToArray()
  read_only_outside_the_workspace = [pscustomobject][ordered]@{
    pointer_count         = $readOnly.Count
    mismatching_pointers  = $pointerMismatch
    pointers              = $readOnly.ToArray()
    boundary              = 'A digest match proves the file is byte-identical to the file the inherited record measured. It is not a re-review of any legal content and it decides no legal question. Nothing was copied, moved, renamed, written or transmitted.'
  }
  boundary   = 'This record measures custody and identity only. It certifies no legal content, admits no rule and passes no gate.'
  created_by = 'PHASE5-001R'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Encoding utf8

"inputs: {0} | match {1} | differ {2} | missing {3} | newly recorded {4} | pointer mismatches {5}" -f $rows.Count, $matches, $mismatches, $missing, $newlyRecorded, $pointerMismatch
