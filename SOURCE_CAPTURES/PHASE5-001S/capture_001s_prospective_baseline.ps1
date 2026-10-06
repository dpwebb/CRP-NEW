# capture_001s_prospective_baseline.ps1 — PHASE5-001S step 4: establish the prospective baseline.
#
# Read-only with respect to every file. Writes only C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001S\prospective_baseline.json.
#
# What it is for: Owner Decision 1 authorises prospective use of the retained PHASE5-001I-A test-results artifact
# at its full measured hash, and step 4 of the order requires the unaffected artifacts to be verified and a
# prospective baseline to be established WITHOUT overwriting an earlier baseline. So this record measures the
# workspace as it stands after the amendment, records the pins a later order should compare against, and names
# the earlier baselines it succeeds rather than replacing any of them.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001S'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Plan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Narrative = 'CRP_PHASE5_001S_GATE_5_5_BLOCKER_RESOLUTION.md'
$Retained = 'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# These four records are written by this same step or by the verification harness that follows it, so a digest
# recorded inside one of them for itself would be stale by construction. They are excluded from the row set and
# listed separately with the reason.
$writtenLast = @(
  'SOURCE_CAPTURES\PHASE5-001S\prospective_baseline.json',
  'SOURCE_CAPTURES\PHASE5-001S\preservation_and_change_record.json',
  'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json',
  'SOURCE_CAPTURES\PHASE5-001S\verification_results.json'
)

$files = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if ($writtenLast -contains $rel) { continue }
  $files.Add([pscustomobject][ordered]@{
    relative_path = $rel
    bytes         = $f.Length
    sha256        = Get-Sha256 $f.FullName
  })
}

$apply = Get-Content -LiteralPath (Join-Path $Out 'amendment_application_result.json') -Raw | ConvertFrom-Json
$record = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json') -Raw | ConvertFrom-Json
$register = Get-Content -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PROD-003\report_representation_register.json') -Raw | ConvertFrom-Json
$pr01 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-01' }
$pr02 = $register.presentations | Where-Object { $_.presentation_id -eq 'PR-02' }
$ruleRecordDigest = Get-Sha256 (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json')
$originalRetainedDigest = 'E492041115C32857EE471389BE15B3A812D9219D655342DD64B4AAF4A8B99B22'

$external = New-Object System.Collections.Generic.List[object]
foreach ($p in @(
  [pscustomobject]@{ label = 'the admitted source pin (accepted legal authority)'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = $record.legal_proposition.source_pin.sha256; recorded_bytes = $record.legal_proposition.source_pin.bytes },
  [pscustomobject]@{ label = 'consumer specimen PR-01 (the scope''s byte-pinned presentation)'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = $pr01.sha256; recorded_bytes = $pr01.bytes },
  [pscustomobject]@{ label = 'consumer specimen PR-02 (secondary; admitted for no rule unit)'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = $pr02.sha256; recorded_bytes = $pr02.bytes }
)) {
  $abs = Join-Path $Legacy $p.rel
  $exists = Test-Path -LiteralPath $abs -PathType Leaf
  $sha = $null; $bytes = $null; $state = 'MISSING'
  if ($exists) {
    $sha = Get-Sha256 $abs
    $bytes = (Get-Item -LiteralPath $abs).Length
    if ($sha -eq $p.recorded.ToUpperInvariant() -and $bytes -eq $p.recorded_bytes) { $state = 'MATCHES_THE_RECORDED_PIN' } else { $state = 'DIFFERS_FROM_THE_RECORDED_PIN' }
  }
  $external.Add([pscustomobject][ordered]@{ label = $p.label; path = $abs; bytes = $bytes; sha256 = $sha; recorded_sha256 = $p.recorded.ToUpperInvariant(); state = $state })
}

$pins = @(
  [pscustomobject][ordered]@{
    what       = 'the retained PHASE5-001I-A test-results artifact (Owner Decision 1)'
    path       = $Retained
    sha256     = Get-Sha256 (Join-Path $Root $Retained)
    bytes      = (Get-Item -LiteralPath (Join-Path $Root $Retained)).Length
    provenance = 'PHASE5-001R re-ran that package''s suite and caused the change; PHASE5-001S Owner Decision 1 accepts the regenerated artifact as the retained artifact and authorises prospective use at this hash. The original digest ' + $originalRetainedDigest + ' stays recorded in SOURCE_CAPTURES\PHASE5-001I-A\file_custody_manifest.json, which is preserved unedited.'
    status     = 'PROSPECTIVE_BASELINE_PIN'
  },
  [pscustomobject][ordered]@{
    what       = 'the amended rank-5 Approved Build Plan'
    path       = $Plan
    sha256     = Get-Sha256 (Join-Path $Root $Plan)
    bytes      = (Get-Item -LiteralPath (Join-Path $Root $Plan)).Length
    provenance = 'amended by PHASE5-001S amendments A-1 to A-5, ' + $apply.digest_before + ' -> ' + $apply.digest_after + ', invertible to the pre-amendment digest through the inversion check in amendment_text.json'
    status     = 'PROSPECTIVE_BASELINE_PIN'
  },
  [pscustomobject][ordered]@{
    what       = 'the governed rule record for this scope (NOT_ADMITTED, pre-admission version identity)'
    path       = 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json'
    sha256     = $ruleRecordDigest
    bytes      = (Get-Item -LiteralPath (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json')).Length
    provenance = 'pre-admission version identity ' + $record.rule_identity.rule_id + '@PRE-ADMISSION-' + $ruleRecordDigest.Substring(0, 12) + '; the production admission identity and version stay RESERVED_TO_GATE_5_7'
    status     = 'PROSPECTIVE_BASELINE_PIN'
  },
  [pscustomobject][ordered]@{
    what       = 'the scoped Gate 5.5 successor verdict this order issued'
    path       = 'SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json'
    sha256     = Get-Sha256 (Join-Path $Out 'scoped_gate_5_5_verdict_successor.json')
    bytes      = (Get-Item -LiteralPath (Join-Path $Out 'scoped_gate_5_5_verdict_successor.json')).Length
    provenance = 'the previous withheld verdict is preserved unedited at SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json'
    status     = 'PROSPECTIVE_BASELINE_PIN'
  }
)


[ordered]@{
  artifact    = 'prospective_baseline.json'
  work_order  = 'PHASE5-001S'
  created_utc = '2026-09-30'
  purpose     = 'establish the baseline a later order should measure against, after this order''s amendment, without overwriting any earlier baseline'
  method      = 'Get-ChildItem -Recurse -File -Force over the whole workspace, SHA-256 per file, taken after the amendment and after every artifact of this order was written and before the verification harness that follows it'
  succeeds_these_earlier_baselines_without_overwriting_any_of_them = @(
    'SOURCE_CAPTURES\PHASE5-001S\preserved_files_before.json (this order''s own pre-write baseline, which is the record of what changed)',
    'SOURCE_CAPTURES\PHASE5-001R\preserved_files_before.json',
    'SOURCE_CAPTURES\PHASE5-001Q\preserved_files_before.json',
    'SOURCE_CAPTURES\PHASE5-001P\preserved_files_before.json',
    'SOURCE_CAPTURES\PHASE5-001I-C\preserved_files_before.json',
    'SOURCE_CAPTURES\PHASE5-001I-B\preserved_files_before.json',
    'SOURCE_CAPTURES\PHASE5-001I-A\preserved_files_before.json'
  )
  earlier_baselines_edited_by_this_order = 0
  earlier_manifests_edited_by_this_order = 0
  excludes = @(
    [pscustomobject][ordered]@{
      records = $writtenLast
      why     = 'these four records are written by this step or by the verification harness that follows it, so a digest recorded inside one of them for itself or for another would be stale by construction. Their final digests are recorded in file_custody_manifest.json and verification_results.json.'
    }
  )
  file_count  = $files.Count
  total_bytes = ($files | Measure-Object bytes -Sum).Sum
  files       = $files.ToArray()
  prospective_pins = $pins
  read_only_outside_the_workspace = [pscustomobject][ordered]@{
    pointer_count        = $external.Count
    mismatching_pointers = @($external | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' }).Count
    pointers             = $external.ToArray()
    boundary             = 'a digest match proves the file is byte-identical to the file the inherited record measured; it is not a re-review of any legal content'
  }
  what_this_record_does_not_do = @(
    'it certifies no legal content, admits no rule, passes no gate and authorises no emission',
    'it does not repair the preservation failure of PHASE5-001R and does not restate the unauthorised write as authorised: it records the retained artifact at its full measured hash under Owner Decision 1, prospectively only',
    'it does not overwrite, rewrite or supersede any earlier baseline or manifest'
  )
  preservation_reading_by_this_order = [pscustomobject][ordered]@{
    pre_write_baseline        = 'SOURCE_CAPTURES\PHASE5-001S\preserved_files_before.json'
    pre_existing_files_changed = 1
    which                     = $Plan
    authorised_by             = 'PHASE5-001S amendments A-1 to A-5 under the two owner decisions'
    pre_existing_files_missing = 0
  }
  created_by = 'PHASE5-001S'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'prospective_baseline.json') -Encoding utf8

"prospective baseline files: {0} | pins: {1} | external pointers: {2} | pointer mismatches: {3}" -f $files.Count, $pins.Count, $external.Count, @($external | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' }).Count

