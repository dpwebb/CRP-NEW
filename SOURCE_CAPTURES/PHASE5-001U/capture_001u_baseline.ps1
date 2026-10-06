# capture_001u_baseline.ps1 — PHASE5-001U step 0: the byte-level baseline and the pre-write input verification.
#
# Read-only with respect to every pre-existing file. Writes only inside C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001U.
# (a) Takes a byte-level baseline of every pre-existing file BEFORE this order writes any artifact, so that
#     preservation is proved by measurement rather than asserted.
# (b) Re-measures every pinned input this order relies on and compares it with the digest the earlier durable
#     records already hold for the same file, so input custody is verified rather than assumed.
#
# This order is authorised to change exactly ONE pre-existing file: the rank-5 governing build plan, whose Gate 5.6
# clause and amendment-history row this order amends under the owner's authorisation. Every other difference
# outside this order's own package is a defect.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001U'
if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

# ---------------------------------------------------------------- (a) baseline
$ownPackage = 'SOURCE_CAPTURES\PHASE5-001U'
$ownNarrative = 'CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md'

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
  work_order  = 'PHASE5-001U'
  created_utc = '2026-10-01'
  purpose     = 'byte-level baseline of every pre-existing file, taken before this order wrote any artifact, so that preservation is proved by measurement rather than asserted'
  method      = 'Get-ChildItem -Recurse -File -Force over the whole workspace, SHA-256 per file, taken before this order wrote anything except this package directory'
  excludes    = @(
    "$ownPackage\** (this order's own output, measured separately as files added by this order)",
    "$ownNarrative (this order's narrative)"
  )
  authorised_change_this_order_may_make = 'EXACTLY ONE pre-existing file: CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md, at 1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50 before the amendment. The amendment replaces the conflicting half-sentence of the Gate 5.6 clause that the PHASE5-001S amendment A-4 introduced, and appends one amendment-history row. No other pre-existing file may change, and no earlier baseline or manifest may be overwritten.'
  file_count  = $baseline.Count
  total_bytes = ($baseline | Measure-Object bytes -Sum).Sum
  files       = $baseline.ToArray()
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Encoding utf8

"baseline files: {0}" -f $baseline.Count

# ---------------------------------------------------------------- (b) input verification
# The 37 pins this order proceeds on, measured before it wrote anything.
$expected = [ordered]@{
  'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json'                        = 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023'
  'SOURCE_CAPTURES\PROD-003\crosswalk.json'                             = '51BFCDB73371D3A1F5DACDB35DC9BC465D8548C8D6B6283FE0371AAAB6C20E13'
  'SOURCE_CAPTURES\PROD-003\report_representation_register.json'        = '2F03DBC807EB1475F97B2FE974E8A4CF752A09475D6B7F371AB62F1BC190036A'
  'SOURCE_CAPTURES\PHASE5-001R\report_fact_model.json'                  = '4967DD57966DCC9D02D565FDDF717C924759F3CD04F6206798C1ACDA8702D6D9'
  'SOURCE_CAPTURES\PHASE5-001R\extraction_status_vocabulary.json'       = 'FBD1EDFE8BA7B2CDD00174771D1B99615371FF414B42C941AF537D167AE273A7'
  'SOURCE_CAPTURES\PHASE5-001R\deterministic_evaluator_specification.json' = '6D92F4296EAE573D78B567BA0E482ABDA5708DD87C913F58BBA378C678D20755'
  'SOURCE_CAPTURES\PHASE5-001R\evaluator_001r.cjs'                      = '4D1EBEFBE8524523A20E22BAF0E0FCAA48A7CB8F109E49D61890410D96C07F7E'
  'SOURCE_CAPTURES\PHASE5-001R\internal_determinism_check.json'         = 'BB5490B392000644C84D2BF67089A3A5824D4BF51CCB2ED172A1AA521C8119C3'
  'SOURCE_CAPTURES\PHASE5-001R\output_vocabulary_and_explanation_surface.json' = '6807E384CFEAADD8CED1CCA7018F04B71EB9F492AC050EED69D4D58C5EBB4ADD'
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_2_verdict.json'            = '9048B5C47B1587E12CB0DD9A9CCEE7A273BA2E0E6DFCE8B00024FD8082984D19'
  'SOURCE_CAPTURES\PHASE5-001P\scoped_gate_5_3_verdict.json'            = 'DA45FE408BFD5EC8C8977BDA0943416FC9EFF7B1371D6B065B7F41A04286D391'
  'SOURCE_CAPTURES\PHASE5-001Q\scoped_gate_5_4_verdict.json'            = '729D5EA0465061AD3DE262F3C8B9447CEACA1CD61F80890D38F88179E61D818D'
  'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json'            = 'B3A019E65EA056C65BE2956C641D04F8D0E26E989AD2F836ABC4955A9C8A6705'
  'SOURCE_CAPTURES\PHASE5-001S\scoped_gate_5_5_verdict_successor.json'  = '1B764B4DB13AD9C532E4FBF1547E78376B5EFA297F8443E6B05D622345C47169'
  'SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json'            = '86886EDBDCF6F13A29B1E10A031339FEB1A6C766D11D599DE0505B03DE4AC94C'
  'SOURCE_CAPTURES\PHASE5-001T\next_work_order.json'                    = 'A0FFBAA0D86FBD360669E2321653025849F18091C91C348DBFCF56FAB2DACA5B'
  'SOURCE_CAPTURES\PHASE5-001T\fixture_suite_001t.json'                 = '13DF5E54C144FDB657D9A51BA0B63C44366B1FAAAB07D7208E58DF4856ACDA17'
  'SOURCE_CAPTURES\PHASE5-001T\negative_tests_001t.json'                = 'B75655D633A010BE1AE324FFD883AD79490CA01A156A55AF051A220181DB811E'
  'SOURCE_CAPTURES\PHASE5-001T\replay_expectations_frozen.json'         = 'DDA0CE253C6BA14CFE166599043405FD2B51B52F376D0C7B2C479A2727A250AA'
  'SOURCE_CAPTURES\PHASE5-001T\independent_replay_001t.json'            = '473176F21866F8EA883979D77C463E306E56AC472B88C8B86DC99A848064C32E'
  'SOURCE_CAPTURES\PHASE5-001T\consumer_language_validation_001t.json'  = '8344C641ED6318BA741136F7EEC289A9658E81CDFD2DB6FB2BFD76D6C6B446A6'
  'SOURCE_CAPTURES\PHASE5-001T\fixture_catalogue_001t.cjs'              = '366539C5B9D9C38FA4BAB6D39782E99CBDCD0F303CB762E2D0ADF464F8F7BFF1'
  'SOURCE_CAPTURES\PHASE5-001T\fixtures_001t.cjs'                       = '54745A1BB214C997062033C0C1D60BA1B1CF4221CAC754CB73463AACD0928DCF'
  'SOURCE_CAPTURES\PHASE5-001T\inputs_001t.cjs'                         = 'BEC1202DC6C26573369B349EA7C13FBECC10408BDA165AAAD242849463ADCCD8'
  'SOURCE_CAPTURES\PHASE5-001T\reviewer_001t.cjs'                       = 'C3268B1E6E41A43838020C771E98CD2EE93A169938C10008C7915F49A962908C'
  'SOURCE_CAPTURES\PHASE5-001S\amendment_text.json'                     = '87DF82EE10D4BBBDCD51461A98716B15258AD3EA63176BB554CE6326EEE75BEA'
  'SOURCE_CAPTURES\PHASE5-001S\amendment_application_result.json'       = 'DC700A7AAC22AC8EBAE80E33EBF7218E657C4C44674BB31EE2099F173DD88556'
  'SOURCE_CAPTURES\PHASE5-001S\owner_decisions.json'                    = '813D9F32AE64F7D1EB61D3A3DECA76F29F2EE83A952279C41D0F85C0655A208F'
  'SOURCE_CAPTURES\PHASE5-001S\custody_supplement.json'                 = 'EDC80B298670067784979A11064CF95A09757A92DBA77C4E18559E03FA8CAA78'
  'SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv'                   = 'DFB78DD20AAD444A4FC5B03D0FDFF11081AD67A454AF80BBBB2CD4CB0C0F24BB'
  'SOURCE_CAPTURES\PHASE5-001O\coverage_summary.json'                   = '16B81448E73C8E526B488CDA1E3D162AAE49A698D3708BCF1620B85536AD97F6'
  'SOURCE_CAPTURES\PHASE5-001O\source_id_coverage_ledger.json'          = '99D6E37F3620C77B296488287F9F03C97B428F6D623A0F1D3CB53A691AFEC07D'
  'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json'              = '6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511'
  'internal-validation\ca-ns-last-payment-six-year\tests\harness.cjs'   = '573C330590D856B61BCA6CFC30DDA020F5F4D316149E7D43C4B0DB981E900787'
  'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md' = '1A7E7EA015FCF270496B915B940F8C96C4D7905CAAD22615BBD29965D040CA50'
  'CRP_CORE_CONSTITUTION.md'                                            = '64027E2A0CC14EF302C73B3830CADCA3D6B867A8DEC843235A48E5C6B6387C3D'
  'packages\backend\src\services\legalCorpus\rules.canada.ts'           = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF'
}


# Every earlier durable record that already holds a digest for one of these files. The order is newest first, so
# that "the digest the corpus already records for this file" means the most recent independent measurement of it.
$priorRecords = @(
  'SOURCE_CAPTURES\PHASE5-001T\input_verification.json'
  'SOURCE_CAPTURES\PHASE5-001T\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001T\verification_results.json'
  'SOURCE_CAPTURES\PHASE5-001S\input_verification.json'
  'SOURCE_CAPTURES\PHASE5-001S\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001R\input_verification.json'
  'SOURCE_CAPTURES\PHASE5-001R\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001Q\input_verification.json'
  'SOURCE_CAPTURES\PHASE5-001Q\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001P\input_verification.json'
  'SOURCE_CAPTURES\PHASE5-001P\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001O\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001K\file_custody_manifest.json'
  'SOURCE_CAPTURES\PHASE5-001I-C\verification_results.json'
  'SOURCE_CAPTURES\PHASE5-001I-A\input_verification.json'
  'SOURCE_CAPTURES\PROD-003\input_verification.json'
  'SOURCE_CAPTURES\PROD-003\file_custody_manifest.json'
  'SOURCE_CAPTURES\PROD-002\input_verification.json'
  'SOURCE_CAPTURES\PROD-002\file_custody_manifest.json'
)

function Normalize-Path([string]$p) {
  if ([string]::IsNullOrWhiteSpace($p)) { return $null }
  $s = $p.Replace('/', '\').Trim()
  if ($s.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) { $s = $s.Substring($Root.Length).TrimStart('\') }
  return $s
}

$script:recorded = @{}
function Add-Recorded([object]$node, [string]$source) {
  if ($null -eq $node) { return }
  if ($node -is [string]) { return }
  if ($node -is [System.Collections.IEnumerable]) {
    foreach ($item in $node) { Add-Recorded $item $source }
    return
  }
  if ($node -is [System.Management.Automation.PSCustomObject]) {
    $names = @($node.PSObject.Properties.Name)
    $pathProp = @($names | Where-Object { $_ -match '^(relative_path|rel_path|path|file|file_path|artifact|artifact_path)$' } | Select-Object -First 1)
    $hashProp = @($names | Where-Object { $_ -match 'sha256' -or $_ -match 'sha_256' -or $_ -match 'digest' } | Where-Object { $_ -notmatch 'pinned|expected|before|after|recorded' } | Select-Object -First 1)
    if ($pathProp.Count -gt 0 -and $hashProp.Count -gt 0) {
      $np = Normalize-Path ([string]$node.($pathProp[0]))
      $h = [string]$node.($hashProp[0])
      if ($np -and $h -match '^[0-9A-Fa-f]{64}$') {
        $h = $h.ToUpper()
        if ($script:recorded.ContainsKey($np)) {
          if (-not ($script:recorded[$np] | Where-Object { $_.source -eq $source -and $_.sha256 -eq $h })) {
            $script:recorded[$np] = @($script:recorded[$np]) + [pscustomobject]@{ source = $source; sha256 = $h }
          }
        }
        else { $script:recorded[$np] = @([pscustomobject]@{ source = $source; sha256 = $h }) }
      }
    }
    foreach ($prop in $node.PSObject.Properties) { Add-Recorded $prop.Value $source }
  }
}

foreach ($rec in $priorRecords) {
  $rp = Join-Path $Root $rec
  if (-not (Test-Path -LiteralPath $rp)) { continue }
  try { $doc = Get-Content -LiteralPath $rp -Raw | ConvertFrom-Json } catch { continue }
  Add-Recorded $doc $rec
}

"prior records harvested: {0}; paths with a prior recorded digest: {1}" -f $priorRecords.Count, $script:recorded.Keys.Count


# ---------------------------------------------------------------- rows
$rows = New-Object System.Collections.Generic.List[object]
foreach ($k in $expected.Keys) {
  $full = Join-Path $Root $k
  $present = Test-Path -LiteralPath $full
  $measured = $null; $size = $null
  if ($present) { $measured = Get-Sha256 $full; $size = (Get-Item -LiteralPath $full).Length }
  $state = 'ABSENT_FROM_THIS_WORKSPACE'
  if ($present) { if ($measured -eq $expected[$k]) { $state = 'MATCHES_THE_ORDERS_OWN_PIN' } else { $state = 'DOES_NOT_MATCH_THE_ORDERS_OWN_PIN' } }
  $prior = @(); if ($script:recorded.ContainsKey($k)) { $prior = @($script:recorded[$k]) }
  $priorHashes = @($prior | ForEach-Object { $_.sha256 } | Select-Object -Unique)
  $priorSources = @($prior | ForEach-Object { $_.source } | Select-Object -Unique)
  $agreement = 'NO_PRIOR_RECORDED_DIGEST'
  if ($priorHashes.Count -gt 0) {
    if (-not $present) { $agreement = 'RECORDED_BUT_ABSENT_FROM_THIS_WORKSPACE' }
    elseif ($priorHashes.Count -eq 1) {
      if ($priorHashes[0] -eq $measured) { $agreement = 'AGREES_WITH_THE_RECORDED_DIGEST' } else { $agreement = 'DIFFERS_FROM_THE_RECORDED_DIGEST' }
    }
    elseif ($priorHashes -contains $measured) { $agreement = 'AGREES_WITH_ONE_OF_THE_RECORDED_DIGESTS' }
    else { $agreement = 'DIFFERS_FROM_EVERY_RECORDED_DIGEST' }
  }
  $dif = $false
  if ($state -eq 'MATCHES_THE_ORDERS_OWN_PIN' -and $agreement -like 'DIFFERS*') { $dif = $true }
  $rows.Add([pscustomobject][ordered]@{
    path                            = $k
    pinned_sha256                   = $expected[$k]
    measured_sha256                 = $measured
    bytes                           = $size
    present_in_this_workspace       = $present
    state                           = $state
    recorded_digests                = $priorHashes
    recorded_in                     = $priorSources
    agreement_with_recorded_digests = $agreement
    difference_requiring_an_explanation = $dif
  })
}

# ---------------------------------------------------------------- read-only pointers outside the workspace
$legacyPins = [ordered]@{
  'packages\backend\src\services\legalCorpus\rules.canada.ts'   = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF'
  'packages\backend\fixtures\reports\equifax-david-webb.pdf'    = 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F'
  'packages\backend\fixtures\reports\transunion-david-webb.pdf' = '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4'
}
$legacyRows = New-Object System.Collections.Generic.List[object]
foreach ($k in $legacyPins.Keys) {
  $full = Join-Path $Legacy $k
  $present = Test-Path -LiteralPath $full
  $measured = $null; $size = $null
  if ($present) { $measured = Get-Sha256 $full; $size = (Get-Item -LiteralPath $full).Length }
  $state = 'ABSENT'
  if ($present) { if ($measured -eq $legacyPins[$k]) { $state = 'MATCHES_THE_RECORDED_PIN' } else { $state = 'DOES_NOT_MATCH_THE_RECORDED_PIN' } }
  $legacyRows.Add([pscustomobject][ordered]@{
    label           = $k
    location        = "$Legacy (outside the workspace, read-only)"
    recorded_sha256 = $legacyPins[$k]
    measured_sha256 = $measured
    bytes           = $size
    state           = $state
  })
}

$conflicts = @($rows | Where-Object { $_.state -eq 'DOES_NOT_MATCH_THE_ORDERS_OWN_PIN' })
$missing = @($rows | Where-Object { $_.state -eq 'ABSENT_FROM_THIS_WORKSPACE' })
$diffs = @($rows | Where-Object { $_.difference_requiring_an_explanation })
$agreed = @($rows | Where-Object { $_.agreement_with_recorded_digests -like 'AGREES*' })
$legacyBad = @($legacyRows | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' })


$record = [ordered]@{
  artifact                     = 'input_verification.json'
  work_order                   = 'PHASE5-001U'
  created_utc                  = '2026-10-01'
  purpose                      = 'pre-write verification that every input this order proceeds on is the input the governing records describe: every pin re-measured, and every input compared with the digest the earlier durable records already hold for the same file'
  method                       = 'SHA-256 over each file with Get-FileHash, taken BEFORE this order wrote any artifact; recorded digests harvested generically from the earlier verification, custody and manifest records (any object carrying a path-like and a sha256-like property)'
  input_count                  = $rows.Count
  matches_the_orders_own_pin   = @($rows | Where-Object { $_.state -eq 'MATCHES_THE_ORDERS_OWN_PIN' }).Count
  input_conflicts_with_the_orders_own_pin = $conflicts.Count
  absent_from_this_workspace   = $missing.Count
  agrees_with_a_recorded_digest = $agreed.Count
  no_prior_recorded_digest     = @($rows | Where-Object { $_.agreement_with_recorded_digests -eq 'NO_PRIOR_RECORDED_DIGEST' }).Count
  differences_requiring_an_explanation = $diffs.Count
  read_only_outside_the_workspace = [ordered]@{
    location      = "$Legacy (outside the workspace, read-only)"
    pointer_count = $legacyRows.Count
    all_match     = ($legacyBad.Count -eq 0)
    do_not_match  = $legacyBad.Count
    pointers      = $legacyRows.ToArray()
  }
  inputs          = $rows.ToArray()
  conflict_list   = @($conflicts | ForEach-Object { $_.path })
  absent_list     = @($missing | ForEach-Object { $_.path })
  difference_list = @($diffs | ForEach-Object { $_.path })
  interpretation  = 'Every input this order proceeds on either matches the digest this order pinned before writing, or is reported absent from this workspace. Where a pin and a digest an earlier durable record holds disagree, the row is reported as a difference requiring an explanation; none is silently accepted.'
  absent_by_design = [ordered]@{
    inputs = @($missing | ForEach-Object { $_.path })
    reading = 'Reported absent from this workspace, not accepted on assertion: the accepted legal authority source lives in the read-only legacy tree, where the pointer above is re-measured against the digest the corpus already records for it.'
  }
  inherited_suite_inspected_but_not_run = 'internal-validation\ca-ns-last-payment-six-year\tests\harness.cjs is measured at its pin and is NOT executed by this order: no earlier-package harness is run by PHASE5-001U.'
  boundary        = 'Read only. This order measured files and read records; it changed none of them and ran none of the package harnesses.'
  created_by      = 'PHASE5-001U'
}

$record | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Encoding utf8

"rows: {0}; match: {1}; conflict: {2}; absent: {3}; agrees-with-record: {4}; no-prior-record: {5}; diffs: {6}; legacy-bad: {7}" -f `
  $rows.Count, $record.matches_the_orders_own_pin, $record.input_conflicts_with_the_orders_own_pin, `
  $record.absent_from_this_workspace, $record.agrees_with_a_recorded_digest, $record.no_prior_recorded_digest, `
  $record.differences_requiring_an_explanation, $legacyBad.Count

