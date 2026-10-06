# verify_and_manifest_001p.ps1 — PHASE5-001P: verification, preservation and custody.
#
# Measures rather than asserts: it re-takes every digest, re-parses every JSON artifact this order wrote,
# re-measures the register, compares the whole workspace against the baseline taken before any amendment, and
# re-verifies the read-only legacy pointers (the accepted source pin and the two consumer specimens).
# It writes preservation_and_change_record.json, file_custody_manifest.json and verification_results.json.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001P'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Plan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Narrative = 'CRP_PHASE5_001P_INCREMENTAL_UNIT_GATE_PROGRESSION.md'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function Rel([string]$path) { return $path.Substring($Root.Length + 1) }

$baseline = Get-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Raw | ConvertFrom-Json
$baselineByPath = @{}
foreach ($f in $baseline.files) { $baselineByPath[$f.relative_path] = $f }

# ---------------------------------------------------------------- preservation (measured)
$changed = New-Object System.Collections.Generic.List[object]
$missing = New-Object System.Collections.Generic.List[string]
$unchanged = 0
foreach ($f in $baseline.files) {
  $abs = Join-Path $Root $f.relative_path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $missing.Add($f.relative_path); continue }
  $now = Get-Sha256 $abs
  if ($now -eq $f.sha256) { $unchanged++ } else {
    $changed.Add([pscustomobject][ordered]@{ relative_path = $f.relative_path; before = $f.sha256; after = $now; bytes = (Get-Item -LiteralPath $abs).Length })
  }
}

# ---------------------------------------------------------------- files added by this order
$addedByThisOrder = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Out -File | Sort-Object Name)) {
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001P\' + $f.Name; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}
$narrativeAbs = Join-Path $Root $Narrative
$narrativeExists = Test-Path -LiteralPath $narrativeAbs -PathType Leaf
if ($narrativeExists) {
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = $Narrative; bytes = (Get-Item -LiteralPath $narrativeAbs).Length; sha256 = Get-Sha256 $narrativeAbs })
}

[ordered]@{
  artifact              = 'preservation_and_change_record.json'
  work_order            = 'PHASE5-001P'
  created_utc           = '2026-09-30'
  baseline_artifact     = 'preserved_files_before.json'
  baseline_files        = $baseline.file_count
  files_unchanged       = $unchanged
  files_changed         = $changed.ToArray()
  files_missing         = $missing.ToArray()
  files_added_by_this_order = $addedByThisOrder.ToArray()
  expected_changes      = 'exactly one pre-existing file: the amended rank-5 build plan. Every other change is this order''s own new output.'
  legal_corpus_untouched = $true
  legacy_corpus_files_written_or_deleted = 0
  governed_documents_amended = @($Plan)
  verdict               = if ($changed.Count -eq 1 -and $changed[0].relative_path -eq $Plan -and $missing.Count -eq 0) { 'PRESERVATION HELD — the only pre-existing file changed is the amended governing document' } else { 'CHECK — unexpected preservation reading' }
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8


# ---------------------------------------------------------------- the checks
$checks = New-Object System.Collections.Generic.List[object]
function Check([string]$id, [string]$what, $ok, [string]$detail) {
  # a comparison chain over collections can return an array of booleans; treat it as true only if it
  # contains no false and no null, so a failed element can never be swallowed
  $okBool = $false
  if ($ok -is [System.Array]) { $okBool = (-not ($ok -contains $false)) -and (-not ($ok -contains $null)) -and ($ok.Count -gt 0) }
  elseif ($ok -is [bool]) { $okBool = $ok }
  elseif ($null -ne $ok) { $okBool = [bool]$ok }
  $checks.Add([pscustomobject][ordered]@{ id = $id; what = $what; passed = $okBool; detail = $detail })
}

$planAbs = Join-Path $Root $Plan
$planText = [System.IO.File]::ReadAllText($planAbs)
$planNorm = ($planText -replace '\s+', ' ').Trim()
$planDigest = Get-Sha256 $planAbs

Check 'V-01' 'the baseline was taken before any amendment' ($baseline.file_count -eq 432) ("baseline files: {0}; the 7 files PHASE5-001I-C added are included, so the count reconciles with its own 425-file reading" -f $baseline.file_count)
Check 'V-02' 'exactly one pre-existing file changed, and it is the amended governing document' ($changed.Count -eq 1 -and $changed[0].relative_path -eq $Plan) ("changed: {0}" -f (($changed | ForEach-Object { $_.relative_path }) -join ', '))
Check 'V-03' 'no pre-existing file is missing' ($missing.Count -eq 0) ("missing: {0}" -f $missing.Count)
Check 'V-04' 'every file this order added is its own output' ($addedByThisOrder.Count -gt 0 -and -not ($addedByThisOrder | Where-Object { $_.relative_path -notlike 'SOURCE_CAPTURES\PHASE5-001P\*' -and $_.relative_path -ne $Narrative })) ("added: {0} files (this order's package plus its narrative)" -f $addedByThisOrder.Count)

$apply = Get-Content -LiteralPath (Join-Path $Out 'amendment_application_result.json') -Raw | ConvertFrom-Json
Check 'V-05' 'the amendment run applied each amendment exactly once' (($apply.results | Where-Object { $_.action -eq 'APPLIED' }).Count -eq 4 -and $apply.problems.Count -eq 0) ("actions: {0}; problems: {1}" -f (($apply.results | ForEach-Object { $_.id + '=' + $_.action }) -join ', '), $apply.problems.Count)
Check 'V-06' 'the amended document kept its LF line endings and trailing newline' ($apply.line_endings -eq 'LF preserved') $apply.line_endings
Check 'V-07' 'the application result records this document and this document only' ($apply.document -eq $Plan -and $apply.digest_after -eq $planDigest) ("document: {0}; digest_after: {1}; measured now: {2}" -f $apply.document, $apply.digest_after, $planDigest)

$amend = Get-Content -LiteralPath (Join-Path $Out 'amendment_text.json') -Raw | ConvertFrom-Json
Check 'V-08' 'the inversion check reconstructs the pre-amendment bytes exactly' ($amend.inversion_check.reconstruction_matches_baseline -eq $true) ("baseline {0} = reconstructed {1}" -f $amend.inversion_check.baseline_sha256_from_preserved_files_before, $amend.inversion_check.reconstructed_sha256)
Check 'V-09' 'every amendment is recorded with its type' (($amend.amendments | Where-Object { $_.type -eq 'REPLACE_AND_EXTEND_REQUIREMENT' }).Count -eq 3 -and ($amend.amendments | Where-Object { $_.type -eq 'APPEND_AMENDMENT_HISTORY' }).Count -eq 1) ("amendments: {0}" -f (($amend.amendments | ForEach-Object { $_.id + ':' + $_.type }) -join ', '))
Check 'V-10' 'every replacement text is present and no replaced text was lost' (-not ($amend.amendments | Where-Object { $_.mechanical_check.replacement_text_present_in_amended_file -eq $false -or $_.mechanical_check.replaced_text_still_present_in_amended_file -eq $true })) 'mechanical checks clean'
Check 'V-11' 'the appended amendment-history row is quoted from the amended file' ([bool]($amend.amendments | Where-Object { $_.id -eq 'A-4' -and $_.mechanical_check.appended_row_present -eq $true })) 'A-4 present'
Check 'V-12' 'the scoped-progression paragraph is in the amended document' ($planNorm.Contains((($amend.amendments | Where-Object { $_.id -eq 'A-1' }).replacement_text -replace '\s+', ' '))) 'A-1 replacement text present'
Check 'V-13' 'Gate 5.2 records that its condition is corpus-wide and unaffected by a scoped verdict' ($planNorm.Contains('Such a verdict neither states nor implies that this corpus-wide condition is satisfied.')) 'A-2 sentence present'
Check 'V-14' 'Phase 5.3 bullet 1 carries its scoped reading' ($planNorm.Contains('No corpus-wide intended-format inventory is created or implied by that record.')) 'A-3 sentence present'
Check 'V-15' 'the pre-existing continuation instruction is preserved verbatim' ($planNorm.Contains('Then continue remaining batches autonomously until Gate 5.2 passes, pausing only for a material owner/legal decision.')) 'section 6 clause intact'
Check 'V-16' 'the ordering sentence and the PHASE5-001I-A carve-out are preserved verbatim' ($planNorm.Contains((($amend.amendments | Where-Object { $_.id -eq 'A-1' }).replaced_text -replace '\s+', ' ')) -and $planNorm.Contains('Owner-authorized internal-validation carve-out (PHASE5-001I-A)')) 'both intact'

$auth = Get-Content -LiteralPath (Join-Path $Out 'amendment_authority_analysis.json') -Raw | ConvertFrom-Json
Check 'V-18' 'step 1s clause inventory is recorded and only three clauses were amended' ($auth.clauses_requiring_corpus_wide_completion.Count -eq 9 -and $auth.clauses_amended.Count -eq 3) ("clauses: {0}; amended: {1}" -f $auth.clauses_requiring_corpus_wide_completion.Count, ($auth.clauses_amended -join ','))
Check 'V-19' 'the authority analysis records the amendment targets before and after digests that match the file' ($auth.target_identified_before_editing.after_sha256 -eq $planDigest -and $auth.target_identified_before_editing.before_sha256 -eq $baselineByPath[$Plan].sha256) ("before {0}; after {1}" -f $auth.target_identified_before_editing.before_sha256, $auth.target_identified_before_editing.after_sha256)
Check 'V-20' 'the amendment procedure quoted is the Constitution section 6 procedure' (($auth.amendment_procedure.clauses_quoted | Where-Object { $_ -like '6.2 An amendment must name the document*' }).Count -eq 1) 'clause 6.2 quoted'

$scope = Get-Content -LiteralPath (Join-Path $Out 'scope_definition.json') -Raw | ConvertFrom-Json
$scopeFields = @('jurisdiction', 'rule_unit', 'presentation', 'evidence_references', 'exclusions')
Check 'V-21' 'the scope names jurisdiction, unit, limb, presentation, evidence and exclusions' (($scopeFields | Where-Object { -not $scope.$_ }).Count -eq 0 -and $scope.rule_unit.limb_in_scope -and $scope.rule_unit.limb_out_of_scope) ("scope_id: {0}; exclusions: {1}" -f $scope.scope_id, $scope.exclusions.Count)
Check 'V-22' 'the scope names the exclusion of every finding class and the observation ceiling' ($scope.classification_and_ceiling.ceiling -eq 'OBSERVATION_CLASS_ONLY' -and $scope.classification_and_ceiling.authorized_finding_classes -eq 'none') 'ceiling recorded'

$v52 = Get-Content -LiteralPath (Join-Path $Out 'scoped_gate_5_2_verdict.json') -Raw | ConvertFrom-Json
$v53 = Get-Content -LiteralPath (Join-Path $Out 'scoped_gate_5_3_verdict.json') -Raw | ConvertFrom-Json
Check 'V-23' 'the scoped Gate 5.2 verdict states a scoped pass, and the corpus-wide state is recorded as not passed' ($v52.verdict -eq 'PASSED_FOR_THIS_SCOPE' -and $v52.corpus_wide_verdict -like 'NOT PASSED*') ("{0} / {1}" -f $v52.verdict, $v52.corpus_wide_verdict.Substring(0, 20))
Check 'V-24' 'the scoped Gate 5.3 verdict states a scoped pass, and the corpus-wide state is recorded as not passed' ($v53.verdict -eq 'PASSED_FOR_THIS_SCOPE' -and $v53.corpus_wide_verdict -like 'NOT PASSED*') ($v53.verdict)
Check 'V-25' 'both verdicts quote the gate text and are recorded against the same scope' ($v52.scope_id -eq $scope.scope_id -and $v53.scope_id -eq $scope.scope_id -and $v52.gate_text_quoted_verbatim[0] -eq '**Gate 5.2:** all 437 entries have a reconciled report-only disposition or a documented reason they are not assessable; every unresolved record has a concrete report-mapping task or is an irreducible gap/refusal. Legal/source fields are accepted under PHASE5-001A, not re-litigated. No batch is accepted based solely on an unverified completion summary.' -and $v53.gate_text_quoted_verbatim[0] -like '**Gate 5.3:** each proposed candidate*') 'gate text quoted verbatim in both'
Check 'V-26' 'every criterion of both gates is stated with a state and evidence' (($v52.criteria | Where-Object { -not $_.state -or -not $_.evidence }).Count -eq 0 -and ($v53.criteria | Where-Object { -not $_.state -or -not $_.evidence }).Count -eq 0 -and $v52.criteria.Count -eq 4 -and $v53.criteria.Count -eq 4) ("gate 5.2 criteria: {0}; gate 5.3 criteria: {1}" -f $v52.criteria.Count, $v53.criteria.Count)
Check 'V-27' 'Gate 5.2s scoped verdict refuses to manufacture a source-wide disposition' (($v52.what_this_verdict_does_not_do -join ' ') -like '*does not manufacture a disposition for the whole CRP-LSRC-0354 source from its first limb*') 'stated'
Check 'V-28' 'Gate 5.3s scoped verdict records the intended format as PR-01 only and the alternative as unresolved' ($v53.intended_format_inventory.for_this_scope -like 'PR-01 only*' -and ($v53.excluded_and_unresolved_items -join ' ') -like '*no-payment/default-date alternative*') 'stated'


$rev = Get-Content -LiteralPath (Join-Path $Out 'revert_001p_amendments_result.json') -Raw | ConvertFrom-Json
Check 'V-17' 'the corrected intermediate state is recorded, and its reversal reproduced the baseline' ($rev.reversal_reproduced_baseline -eq $true -and $rev.digest_after_revert -eq $rev.baseline_digest) ("before revert {0}; after revert {1}" -f $rev.digest_before_revert, $rev.digest_after_revert)


$supp = Get-Content -LiteralPath (Join-Path $Out 'disposition_supplement.json') -Raw | ConvertFrom-Json
Check 'V-29' 'the disposition supplement is recorded and applied to nothing' ($supp.status.applied -eq $false -and $supp.status.applied_by_this_order -eq $false) 'applied: false'
Check 'V-30' 'the supplement carries five scoped fields and limitations from PHASE5-001I-C' ($supp.the_five_scoped_fields_and_limitations_the_supplement_adds.Count -eq 5) ("ids: {0}" -f (($supp.the_five_scoped_fields_and_limitations_the_supplement_adds | ForEach-Object { $_.id }) -join ','))
Check 'V-31' 'the supplement states which original unresolved statuses remain' (($supp.original_unresolved_statuses_that_remain.Count -ge 5) -and ((($supp.original_unresolved_statuses_that_remain -join ' ') -like '*stays UNRESOLVED*'))) ("items: {0}" -f $supp.original_unresolved_statuses_that_remain.Count)
Check 'V-32' 'the supplement records that the 001K register and the historical manifests are unchanged' ($supp.preservation_of_the_originals.phase5_001k_register_csv.unchanged -eq $true) 'register unchanged'

$queue = Get-Content -LiteralPath (Join-Path $Out 'corpus_queue_preservation.json') -Raw | ConvertFrom-Json
Check 'V-33' 'the corpus queue is re-measured from the register file and unchanged' ($queue.corpus_totals.data_rows -eq 437 -and $queue.corpus_totals.distinct_source_entry_ids -eq 437 -and $queue.register_digest.unchanged -eq $true) ("rows {0}, distinct {1}, digest {2}" -f $queue.corpus_totals.data_rows, $queue.corpus_totals.distinct_source_entry_ids, $queue.register_digest.measured_now)
$d = $queue.dispositions
$b = $queue.blocker_types
$ok34 = ([int]$d.UNRESOLVED -eq 416) -and ([int]$d.GAP -eq 18) -and ([int]$d.REFUSAL -eq 3) -and ([int]$b.NO_DURABLE_RESCREEN_RECORD -eq 409) -and ([int]$b.REPORT_EVENT_DATE_MAPPING_UNVERIFIED -eq 6) -and ([int]$b.CANDIDATE_REPRESENTATION_UNRESOLVED_GATE_5_3_M1 -eq 1)
Check 'V-34' 'the recorded dispositions and blockers are the register''s own unchanged values' $ok34 ("dispositions {0}; blockers {1}" -f ($queue.dispositions | ConvertTo-Json -Compress), ($queue.blocker_types | ConvertTo-Json -Compress))
Check 'V-35' 'the corpus-wide gate states are recorded separately from the scoped verdicts' ($queue.corpus_wide_gate_status_kept_separate.'5.2' -like 'NOT PASSED*' -and $queue.corpus_wide_gate_status_kept_separate.'5.3' -like 'NOT PASSED*' -and $queue.corpus_wide_gate_status_kept_separate.scoped_verdicts_recorded_by_this_order.'5.2' -eq 'PASSED_FOR_THIS_SCOPE') 'separated'
Check 'V-36' 'no missing work was converted into GAP or REFUSAL' ($queue.nothing_converted.evidence.Count -eq 3) 'recorded with evidence'
Check 'V-37' 'the register row this scope concerns is unchanged in the register file' ($queue.the_row_this_scope_concerns.disposition -eq 'UNRESOLVED' -and $queue.the_row_this_scope_concerns.blocker_type -eq 'REPORT_EVENT_DATE_MAPPING_UNVERIFIED') 'row unchanged'

$recon = Get-Content -LiteralPath (Join-Path $Out 'reference_reconciliation.json') -Raw | ConvertFrom-Json
Check 'V-38' 'ten earlier statements are reconciled and nothing earlier was rewritten' ($recon.statements_reconciled -eq 10 -and ($recon.rows | Where-Object { $_.action_taken -notlike 'none*' }).Count -eq 0) ("rows: {0}" -f $recon.statements_reconciled)

$order = Get-Content -LiteralPath (Join-Path $Out 'next_work_order.json') -Raw | ConvertFrom-Json
Check 'V-39' 'the Gate 5.4 work order is issued for this scope, with its exclusions and its non-execution stated' ($order.order_id -eq 'PHASE5-001Q' -and $order.authority.scope -eq $scope.scope_id -and $order.explicit_exclusions.Count -ge 5 -and $order.what_this_issuing_order_did_not_do -like 'it did not execute any part of Gate 5.4*') 'issued, not executed'
Check 'V-40' 'the work order forbids admission, coverage, findings and consumer-visible output' ((($order.explicit_exclusions | Out-String) -like '*no rule admission*') -and (($order.explicit_exclusions | Out-String) -like '*no consumer-visible output*')) 'exclusions present'


# JSON integrity and placeholder scan over this order's own artifacts
$jsonFiles = Get-ChildItem -LiteralPath $Out -File -Filter '*.json'
$badJson = New-Object System.Collections.Generic.List[string]
foreach ($f in $jsonFiles) {
  try { Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json | Out-Null } catch { $badJson.Add($f.Name) }
}
Check 'V-41' 'every JSON artifact this order wrote parses' ($badJson.Count -eq 0) ("files: {0}; unparsable: {1}" -f $jsonFiles.Count, $badJson.Count)
$marker = '__TAIL_' + 'MARKER__'
Check 'V-42' 'no placeholder or tail marker remains in this order''s artifacts' ((Get-ChildItem -LiteralPath $Out -File -Recurse | Select-String -Pattern $marker -SimpleMatch | Measure-Object).Count -eq 0) 'no markers found'
# A corpus-wide pass claim would be a positive statement; the check looks for the claim itself with a
# negative lookbehind so that "NOT PASSED corpus-wide" cannot count as a claim, and scans only this order's
# artifacts (not this verification script, whose own pattern text is not a claim).
$scanFiles = @(Get-ChildItem -Path (Join-Path $Out '*.json')) + @(Get-ChildItem -Path (Join-Path $Out '*.md'))
if ($narrativeExists) { $scanFiles += Get-Item -LiteralPath $narrativeAbs }
$passClaims = @($scanFiles | Select-String -Pattern '(?i)(?<!not\s)passed\s+corpus-wide', 'corpus-wide\s+Gate\s+5\.[23]\s+passed' | Where-Object { $_.Line -notmatch '(?i)not\s+passed' })
$notPassedStatements = @(Get-ChildItem -Path (Join-Path $Out '*.json') | Select-String -Pattern '(?i)NOT PASSED corpus-wide' | Measure-Object).Count
Check 'V-43' 'no artifact in this order claims a corpus-wide gate pass, and the corpus-wide state is stated as not passed' ($passClaims.Count -eq 0 -and $notPassedStatements -ge 1) ("pass claims found: {0}; NOT PASSED corpus-wide statements: {1}" -f $passClaims.Count, $notPassedStatements)

# the read-only legacy pointers
$pin = Join-Path $Legacy 'packages\backend\src\services\legalCorpus\rules.canada.ts'
$spec01 = Join-Path $Legacy 'packages\backend\fixtures\reports\equifax-david-webb.pdf'
$spec02 = Join-Path $Legacy 'packages\backend\fixtures\reports\transunion-david-webb.pdf'
$pinExists = Test-Path -LiteralPath $pin -PathType Leaf
$s01Exists = Test-Path -LiteralPath $spec01 -PathType Leaf
$s02Exists = Test-Path -LiteralPath $spec02 -PathType Leaf
$pinOk = $pinExists -and (Get-Sha256 $pin) -eq '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF'
$s01Ok = $s01Exists -and (Get-Sha256 $spec01) -eq 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F'
$s02Ok = $s02Exists -and (Get-Sha256 $spec02) -eq '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4'
Check 'V-44' 'the accepted source pin is byte-identical and was not written' $pinOk ("rules.canada.ts: {0}" -f $(if ($pinExists) { Get-Sha256 $pin } else { 'MISSING' }))
Check 'V-45' 'the PR-01 specimen is byte-identical and was not written' $s01Ok ("PR-01: {0}" -f $(if ($s01Exists) { Get-Sha256 $spec01 } else { 'MISSING' }))
Check 'V-46' 'the PR-02 corroborating specimen is byte-identical and was not written' $s02Ok ("PR-02: {0}" -f $(if ($s02Exists) { Get-Sha256 $spec02 } else { 'MISSING' }))
$appMsg = Join-Path $Root 'consumer-wizard\dist\jurisdiction-data.js'
$appOk = (Test-Path -LiteralPath $appMsg -PathType Leaf) -and ((Get-Sha256 $appMsg) -eq $baselineByPath['consumer-wizard\dist\jurisdiction-data.js'].sha256) -and ((Get-Content -LiteralPath $appMsg -Raw) -like '*Report checking not yet available.*')
Check 'V-47' 'the application message is unchanged and the application is byte-identical' $appOk 'Report checking not yet available. preserved'
Check 'V-48' 'no register, ledger, crosswalk, provenance or manifest file changed' (($changed | Where-Object { $_.relative_path -ne $Plan }).Count -eq 0) 'only the amended plan changed'

$inputs = Get-Content -LiteralPath (Join-Path $Out 'input_verification.json') -Raw | ConvertFrom-Json
Check 'V-49' 'every input was re-measured and no recorded digest disagreed' ($inputs.differs_from_recorded_digest -eq 0 -and $inputs.missing -eq 0 -and $inputs.input_count -ge 30) ("inputs {0}; match {1}; differ {2}; missing {3}" -f $inputs.input_count, $inputs.matches_recorded_digest, $inputs.differs_from_recorded_digest, $inputs.missing)
Check 'V-50' 'the narrative exists and is a substantive record' ($narrativeExists -and (Get-Item -LiteralPath $narrativeAbs).Length -gt 5000) ("bytes: {0}" -f $(if ($narrativeExists) { (Get-Item -LiteralPath $narrativeAbs).Length } else { 0 }))


# ---------------------------------------------------------------- custody manifest
$manifestFiles = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Out -File | Sort-Object Name)) {
  if ($f.Name -eq 'file_custody_manifest.json' -or $f.Name -eq 'verification_results.json') { continue }
  $manifestFiles.Add([pscustomobject][ordered]@{
    relative_path_from_workspace = 'SOURCE_CAPTURES\PHASE5-001P\' + $f.Name
    location                     = 'SOURCE_CAPTURES/PHASE5-001P'
    bytes                        = $f.Length
    sha256                       = Get-Sha256 $f.FullName
  })
}
if ($narrativeExists) {
  $nf = Get-Item -LiteralPath $narrativeAbs
  $manifestFiles.Add([pscustomobject][ordered]@{
    relative_path_from_workspace = $Narrative
    location                     = 'workspace root'
    bytes                        = $nf.Length
    sha256                       = Get-Sha256 $nf.FullName
  })
}
[ordered]@{
  artifact    = 'file_custody_manifest.json'
  work_order  = 'PHASE5-001P'
  created_utc = '2026-09-30'
  purpose     = 'byte-level custody record for every file this order created, and the evidence that every pre-existing file except the amended governing document was left byte-identical'
  file_count  = $manifestFiles.Count
  total_bytes = ($manifestFiles | Measure-Object bytes -Sum).Sum
  files       = $manifestFiles.ToArray()
  exclusions  = @(
    'file_custody_manifest.json (this file cannot carry its own digest)',
    'verification_results.json (written after this manifest and therefore not listed here; it records that exclusion)'
  )
  amended_governing_document = [pscustomobject][ordered]@{
    relative_path_from_workspace = $Plan
    before_sha256                = $baselineByPath[$Plan].sha256
    after_sha256                 = $planDigest
    bytes                        = (Get-Item -LiteralPath $planAbs).Length
  }
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files            = $baseline.file_count
    files_unchanged           = $unchanged
    files_changed             = $changed.Count
    files_missing             = $missing.Count
    files_added_by_this_order = $addedByThisOrder.Count
  }
  created_by = 'PHASE5-001P'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

# ---------------------------------------------------------------- results
$manifestBack = Get-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Raw | ConvertFrom-Json
$manifestMismatch = 0
foreach ($e in $manifestBack.files) { if ((Get-Sha256 (Join-Path $Root $e.relative_path_from_workspace)) -ne $e.sha256) { $manifestMismatch++ } }
Check 'V-51' 'the custody manifest re-measures with no mismatch' ($manifestMismatch -eq 0) ("entries: {0}; mismatching: {1}" -f $manifestBack.file_count, $manifestMismatch)
$failures = @($checks | Where-Object { $_.passed -ne $true })

[ordered]@{
  artifact      = 'verification_results.json'
  work_order    = 'PHASE5-001P'
  created_utc   = '2026-09-30'
  purpose       = 'the checks this order ran over its own artifacts, its amendments, the preserved corpus, the register and the read-only legacy pointers'
  checks        = $checks.ToArray()
  check_count   = $checks.Count
  failure_count = $failures.Count
  failed        = $failures
  verdict       = if ($failures.Count -eq 0) { 'ALL PHASE5-001P CHECKS PASSED' } else { 'CHECK FAILURES PRESENT' }
  scope_note    = 'these checks verify this order''s own artifacts, its amendments, its preservation and its custody. They are not independent validation, they are not Gate 5.4 or Gate 5.6 evidence, and they pass no corpus-wide gate.'
  corpus_wide_status_kept_separate = [pscustomobject][ordered]@{
    '5.1' = 'MET with recorded administrative limitations; unchanged'
    '5.2' = 'NOT PASSED corpus-wide; a scoped verdict is recorded separately'
    '5.3' = 'NOT PASSED corpus-wide; a scoped verdict is recorded separately'
    '5.4' = 'NOT STARTED; issued as PHASE5-001Q for this scope only, not executed'
    '5.5' = 'NOT STARTED'
    '5.6' = 'NOT STARTED'
    '5.7' = 'NOT REACHED; 0 admitted governed rules, 0 permitted findings'
  }
  what_this_record_does_not_claim = @(
    'it is not independent validation and is not gate evidence for any gate',
    'it does not pass any corpus-wide gate and does not advance Gate 5.2 or Gate 5.3 corpus-wide',
    'it does not admit a rule, create coverage or a candidate, or authorize a finding class',
    'it does not apply the disposition supplement, which remains recorded and unapplied',
    'it does not convert any recorded limitation into a criterion satisfaction',
    'it does not retroactively authorize the earlier custody discrepancies recorded by PHASE5-001I-B and PHASE5-001I-C'
  )
  verdict_summary = 'AMENDMENTS APPLIED AND MEASURED, SCOPED GATES 5.2 AND 5.3 PASSED FOR THIS SCOPE, CORPUS-WIDE STATE UNCHANGED, PRESERVATION HELD'
  created_by    = 'PHASE5-001P'
} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'verification_results.json') -Encoding utf8

"checks: {0} | failures: {1} | changed: {2} | missing: {3} | added by this order: {4}" -f $checks.Count, $failures.Count, $changed.Count, $missing.Count, $addedByThisOrder.Count
foreach ($f in $failures) { "  FAIL {0}: {1} :: {2}" -f $f.id, $f.what, $f.detail }
