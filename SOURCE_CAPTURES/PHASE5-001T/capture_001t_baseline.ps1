# capture_001t_baseline.ps1 — PHASE5-001T step 0, and the input-custody half of deliverable 5.
#
# Read-only with respect to every pre-existing file. Writes only inside C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001T.
# (a) Takes a byte-level baseline of every pre-existing file BEFORE this order writes any artifact, so that
#     preservation is proved by measurement rather than asserted.
# (b) Re-measures every pinned input this order relies on and compares it with the digest an earlier record
#     already holds for the same file, so input custody is verified rather than assumed.
#
# This order is NOT authorised to change any pre-existing file. It amends no governing document, edits no
# register, ledger, crosswalk, catalogue, queue, manifest or baseline, and writes nothing into any prior
# evidence package. Every difference outside this order's own package is therefore a defect, and the
# preservation reading below is a measurement, not a claim.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001T'
if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- (a) baseline
$ownPackage = 'SOURCE_CAPTURES\PHASE5-001T'
$ownNarrative = 'CRP_PHASE5_001T_GATE_5_6_VALIDATION.md'

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
  work_order  = 'PHASE5-001T'
  created_utc = '2026-09-30'
  purpose     = 'byte-level baseline of every pre-existing file, taken before this order wrote any artifact, so that preservation is proved by measurement rather than asserted'
  method      = 'Get-ChildItem -Recurse -File -Force over the whole workspace, SHA-256 per file, taken before this order wrote anything except this package directory'
  excludes    = @(
    "$ownPackage\** (this order''s own output, which is measured separately as files added by this order)",
    "$ownNarrative (this order''s narrative)"
  )
  authorised_change_this_order_may_make = 'NONE. This order carries no amendment authority: it amends no governing document and edits no earlier artifact. The PHASE5-001S amendments A-1 to A-5 are the last recorded change to the plan, and the plan is read here at 1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50.'
  file_count  = $baseline.Count
  total_bytes = ($baseline | Measure-Object bytes -Sum).Sum
  files       = $baseline.ToArray()
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Encoding utf8

"baseline files: {0}" -f $baseline.Count


# ---------------------------------------------------------------- (b) inputs
# Recorded digests come from the durable records that already measured these files. A file with no recorded
# digest is measured and marked NOT_PREVIOUSLY_RECORDED, never counted as agreement or as conflict.
$recorded = @{}
$recordedWhere = @{}
function Add-Recorded([string]$p, [string]$h, [string]$where) {
  if ([string]::IsNullOrWhiteSpace($h)) { return }
  if (-not $recorded.ContainsKey($p)) { $recorded[$p] = $h.ToUpperInvariant(); $recordedWhere[$p] = $where }
}
$sManifest = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json'
if (Test-Path -LiteralPath $sManifest) {
  $j = Get-Content -LiteralPath $sManifest -Raw | ConvertFrom-Json
  foreach ($r in $j.files) { Add-Recorded $r.relative_path_from_workspace $r.sha256 'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json' }
}
$sInputs = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001S\input_verification.json'
if (Test-Path -LiteralPath $sInputs) {
  $j = Get-Content -LiteralPath $sInputs -Raw | ConvertFrom-Json
  foreach ($r in $j.rows) { Add-Recorded $r.path $r.sha256 'SOURCE_CAPTURES\PHASE5-001S\input_verification.json' }
}
foreach ($pair in @(
  @{ p = 'SOURCE_CAPTURES\PHASE5-001R\file_custody_manifest.json'; w = 'SOURCE_CAPTURES\PHASE5-001R\file_custody_manifest.json' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json'; w = 'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json' },
  @{ p = 'SOURCE_CAPTURES\PHASE5-001P\file_custody_manifest.json'; w = 'SOURCE_CAPTURES\PHASE5-001P\file_custody_manifest.json' })) {
  $abs = Join-Path $Root $pair.p
  if (Test-Path -LiteralPath $abs) {
    $j = Get-Content -LiteralPath $abs -Raw | ConvertFrom-Json
    foreach ($r in $j.files) { Add-Recorded $r.relative_path_from_workspace $r.sha256 $pair.w }
  }
}
$iC = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json'
if (Test-Path -LiteralPath $iC) {
  $j = Get-Content -LiteralPath $iC -Raw | ConvertFrom-Json
  foreach ($r in $j.inputs_measured_before_writing.rows) { Add-Recorded $r.path $r.sha256 'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json' }
}


# The pins this order proceeds on, each with the digest the order itself records. A row whose measured digest
# differs from the order's own pin is an INPUT_CONFLICT.
$expected = [ordered]@{
  'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json'                                      = 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023'
  'SOURCE_CAPTURES\PROD-003\crosswalk.json'                                           = '51BFCDB73371D3A1F5DACDB35DC9BC465D8548C8D6B6283FE0371AAAB6C20E13'
  'SOURCE_CAPTURES\PROD-003\report_representation_register.json'                      = '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A'
  'SOURCE_CAPTURES\PHASE5-001R\report_fact_model.json'                                = '4967DD57966DCC9D02D565FDDF717C924759F3CD04F6206798C1ACDA8702D6D9'
  'SOURCE_CAPTURES\PHASE5-001R\extraction_status_vocabulary.json'                      = 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7'
  'SOURCE_CAPTURES\PHASE5-001R\deterministic_evaluator_specification.json'             = '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755'
  'SOURCE_CAPTURES\PHASE5-001R\evaluator_001r.cjs'                                     = '4D1EBEFBE8524523A20E22BAF0E0FCAA48A7CB8F109E49D61890410D96C07F7E'
  'SOURCE_CAPTURES\PHASE5-001R\internal_determinism_check.json'                        = 'BB5490B392000644C84D2BF67089A3A5824D4BF51CCB2ED172A1AA521C8119C3'
  'SOURCE_CAPTURES\PHASE5-001R\output_vocabulary_and_explanation_surface.json'         = '6807E384CFEAADD8CED1CCA7018F04B71EB9F492AC050EED69D4D58C5EBB4ADD'
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'           = '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50'
  'SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json'                = '1B764B4DB13AD9C532E4FBF1547E78376B5EFA297F8443E6B05D622345C47169'
}

# The other records this order reads, and the historical artifacts it must not disturb.
$alsoRead = @(
  'SOURCE_CAPTURES\PHASE5-001S\next_work_order.json',
  'SOURCE_CAPTURES\PHASE5-001S\owner_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001S\custody_supplement.json',
  'SOURCE_CAPTURES\PHASE5-001S\amendment_application_result.json',
  'SOURCE_CAPTURES\PHASE5-001S\preserved_files_before.json',
  'SOURCE_CAPTURES\PHASE5-001S\prospective_baseline.json',
  'SOURCE_CAPTURES\PHASE5-001S\verification_results.json',
  'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json',
  'SOURCE_CAPTURES\PHASE5-001S\preservation_and_change_record.json',
  'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001R\implementation_comparison.json',
  'SOURCE_CAPTURES\PHASE5-001R\next_work_order.json',
  'SOURCE_CAPTURES\PHASE5-001R\preserved_files_before.json',
  'SOURCE_CAPTURES\PHASE5-001R\file_custody_manifest.json',
  'SOURCE_CAPTURES\PHASE5-001R\preservation_and_change_record.json',
  'SOURCE_CAPTURES\PHASE5-001Q\scoped_gate_5_4_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001Q\rule_record_decisions.json',
  'SOURCE_CAPTURES\PHASE5-001Q\preserved_files_before.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_2_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_3_verdict.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json',
  'SOURCE_CAPTURES\PHASE5-001I-A\file_custody_manifest.json',
  'CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md'
)

# The inherited internal-validation tree. This order inspects these files' write destinations and does NOT run
# them; recording their digests is what lets a later order prove they were not touched.
$inheritedSuite = @(Get-ChildItem -LiteralPath (Join-Path $Root 'internal-validation') -Recurse -File |
  Sort-Object FullName | ForEach-Object { $_.FullName.Substring($Root.Length + 1) })

$rows = New-Object System.Collections.Generic.List[object]
$paths = @()
$paths += $expected.Keys
$paths += $alsoRead
$paths += $inheritedSuite
foreach ($rel in $paths) {
  $abs = Join-Path $Root $rel
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) {
    $rows.Add([pscustomobject][ordered]@{ path = $rel; exists = $false; bytes = $null; sha256 = $null; recorded_sha256 = $recorded[$rel]; recorded_in = $recordedWhere[$rel]; matches_the_orders_own_pin = $null; state = 'MISSING' })
    continue
  }
  $h = Get-Sha256 $abs
  $pin = $expected[$rel]
  $matchesPin = if ($pin) { ($h -eq $pin) } else { $null }
  $state = 'MEASURED'
  if ($pin) {
    if ($matchesPin) { $state = 'MATCHES_THE_ORDERS_OWN_PIN' } else { $state = 'INPUT_CONFLICT_WITH_THE_ORDERS_OWN_PIN' }
  } elseif ($recorded.ContainsKey($rel)) {
    if ($recorded[$rel] -eq $h) { $state = 'MATCHES_RECORDED_DIGEST' } else { $state = 'DIFFERS_FROM_THE_RECORDED_DIGEST' }
  } else { $state = 'NOT_PREVIOUSLY_RECORDED' }
  $rows.Add([pscustomobject][ordered]@{
    path = $rel; exists = $true; bytes = (Get-Item -LiteralPath $abs).Length; sha256 = $h
    recorded_sha256 = $recorded[$rel]; recorded_in = $recordedWhere[$rel]
    matches_the_orders_own_pin = $matchesPin; state = $state
  })
}

$external = New-Object System.Collections.Generic.List[object]
foreach ($p in @(
  [pscustomobject]@{ label = 'the accepted source pin (the admitted legal authority, read by the independent reviewer)'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF' },
  [pscustomobject]@{ label = 'consumer specimen PR-01 (the scope''s byte-pinned presentation; not opened by this order)'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F' },
  [pscustomobject]@{ label = 'consumer specimen PR-02 (secondary; admitted for no rule unit; not opened by this order)'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4' }
)) {
  $abs = Join-Path $Legacy $p.rel
  $h = if (Test-Path -LiteralPath $abs -PathType Leaf) { Get-Sha256 $abs } else { $null }
  $external.Add([pscustomobject][ordered]@{
    label = $p.label; location = 'C:\Users\webbd\crp-credit-app (outside the workspace, read-only)'; relative_path = $p.rel
    measured_sha256 = $h; recorded_sha256 = $p.recorded
    state = if ($h -eq $p.recorded) { 'MATCHES_THE_RECORDED_PIN' } else { 'DOES_NOT_MATCH' }
  })
}

$conflicts = @($rows | Where-Object { $_.state -eq 'INPUT_CONFLICT_WITH_THE_ORDERS_OWN_PIN' -or $_.state -eq 'MISSING' })

[ordered]@{
  artifact    = 'input_verification.json'
  work_order  = 'PHASE5-001T'
  created_utc = '2026-09-30'
  purpose     = 'verify, by re-measurement before any artifact of this order was written, the exact inputs this order relies on: the eleven pins the order names, the other records it reads, the historical artifacts it must not disturb, and the inherited internal-validation tree it inspects but does not run'
  method      = 'SHA-256 re-measured read-only before this order wrote any artifact. The digest each file already carries in an inherited record is recorded beside it, and the order''s own pin table is checked separately.'
  recorded_digest_sources = @(
    'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json',
    'SOURCE_CAPTURES\PHASE5-001S\input_verification.json',
    'SOURCE_CAPTURES\PHASE5-001R\file_custody_manifest.json',
    'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json',
    'SOURCE_CAPTURES\PHASE5-001P\file_custody_manifest.json',
    'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json'
  )
  the_orders_own_pins = $expected.Count
  input_count = $rows.Count
  matches_the_orders_own_pin = @($rows | Where-Object { $_.state -eq 'MATCHES_THE_ORDERS_OWN_PIN' }).Count
  input_conflicts_with_the_orders_own_pin = @($rows | Where-Object { $_.state -eq 'INPUT_CONFLICT_WITH_THE_ORDERS_OWN_PIN' }).Count
  missing = @($rows | Where-Object { $_.state -eq 'MISSING' }).Count
  matches_recorded_digest = @($rows | Where-Object { $_.state -eq 'MATCHES_RECORDED_DIGEST' }).Count
  differs_from_recorded_digest = @($rows | Where-Object { $_.state -eq 'DIFFERS_FROM_THE_RECORDED_DIGEST' }).Count
  measured_without_a_prior_recorded_digest = @($rows | Where-Object { $_.state -eq 'NOT_PREVIOUSLY_RECORDED' }).Count
  differences_requiring_an_explanation = @($rows | Where-Object { $_.state -eq 'DIFFERS_FROM_THE_RECORDED_DIGEST' } | ForEach-Object { $_.path })
  rows = $rows.ToArray()
  inherited_suite_inspected_but_not_run = [pscustomobject][ordered]@{
    tree = 'internal-validation\ca-ns-last-payment-six-year'
    files_recorded = $inheritedSuite.Count
    why_recorded = 'the PHASE5-001I-A internal suite writes its own results into its own package. This order must not run, re-run or invoke it; it inspects those scripts read-only, records their digests, and records where each writes.'
    run_by_this_order = $false
  }
  read_only_outside_the_workspace = [pscustomobject][ordered]@{
    pointer_count = $external.Count
    mismatching_pointers = @($external | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' }).Count
    pointers = $external.ToArray()
    boundary = 'a digest match proves the file is byte-identical to the file the inherited record measured. It is not a re-review of any legal content, and this order opens neither specimen.'
  }
  boundary = 'This record measures custody and identity only. It certifies no legal content, admits no rule, passes no gate, authorises no emission and produces no consumer-visible output.'
  created_by = 'PHASE5-001T'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Encoding utf8

"inputs: {0} | own-pin matches: {1} | own-pin conflicts: {2} | recorded-digest matches: {3} | recorded-digest differences: {4} | missing: {5} | external pointers mismatching: {6}" -f $rows.Count, @($rows | Where-Object { $_.state -eq 'MATCHES_THE_ORDERS_OWN_PIN' }).Count, @($rows | Where-Object { $_.state -eq 'INPUT_CONFLICT_WITH_THE_ORDERS_OWN_PIN' }).Count, @($rows | Where-Object { $_.state -eq 'MATCHES_RECORDED_DIGEST' }).Count, @($rows | Where-Object { $_.state -eq 'DIFFERS_FROM_THE_RECORDED_DIGEST' }).Count, @($rows | Where-Object { $_.state -eq 'MISSING' }).Count, @($external | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' }).Count
if ($conflicts.Count -gt 0) { Write-Output ('INPUT CONFLICTS: ' + (($conflicts | ForEach-Object { $_.path }) -join '; ')) }