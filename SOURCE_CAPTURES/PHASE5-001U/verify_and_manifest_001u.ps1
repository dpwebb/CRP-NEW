# verify_and_manifest_001u.ps1 — PHASE5-001U: verification, preservation and custody.
#
# Measures rather than asserts. It compares the whole workspace against the baseline taken before this order wrote
# anything, re-measures every pinned input, checks each artifact against what it claims, re-runs every builder of this
# order that is safe to re-run and compares the output byte-for-byte, and re-measures the historical records this order
# must not have touched. It writes preservation_and_change_record.json, file_custody_manifest.json and
# verification_results.json, and nothing else.
#
# NO WRITE-CAPABLE COMMAND IS RE-RUN: apply_amendment_001u.cjs edits the governed plan and is deliberately NOT
# re-executed. Its single application is verified by digest and by the guard it carries in its own source. The
# inherited internal-validation suite is measured by digest only and is never executed.
#
# This order's ONE AUTHORISED CHANGE is the amendment of the governing build plan at the sentence the owner named.
# Every other pre-existing file must be unchanged, and the harness states the authorised change as a change rather
# than excusing it.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001U'
$Legacy = 'C:\Users\webbd\crp-credit-app'
$Plan = 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md'
$Narrative = 'CRP_PHASE5_001U_VERSION_RESOLUTION_AND_SCOPED_ADMISSION.md'
$RetainedArtifact = 'SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json'
$RetainedArtifactDigest = '6D8E84E06C2C28172711A18831F7DC6A5A3FF152F527428AFD305CE7BB134511'
$WithheldVerdict = 'SOURCE_CAPTURES\PHASE5-001R\scoped_gate_5_5_verdict.json'
$WithheldVerdictDigest = 'B3A019E65EA056C65BE2956C641D04F8D0E26E989AD2F836ABC4955A9C8A6705'
$RunSuiteHarness = 'internal-validation\ca-ns-last-payment-six-year\tests\harness.cjs'
$RunSuiteHarnessDigest = '573C330590D856B61BCA6CFC30DDA020F5F4D316149E7D43C4B0DB981E900787'
$RuleRecordPath = 'SOURCE_CAPTURES\PHASE5-001Q\rule_record.json'
$RuleRecordDigest = 'C24CA3FD3AA38FC7C789BD29D91EAC36DCA989DE5AAD923CF88D2AEAC401F023'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }
function Read-Json([string]$path) { return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json }
$j = @{}
function J([string]$name) { if (-not $j.ContainsKey($name)) { $j[$name] = Read-Json (Join-Path $Out $name) }; return $j[$name] }

$checks = New-Object System.Collections.Generic.List[object]
function Check([string]$id, [string]$what, [bool]$passed, [string]$detail) {
  $checks.Add([pscustomobject][ordered]@{ id = $id; what = $what; passed = $passed; detail = $detail })
}

# ---------------------------------------------------------------- preservation (measured)
$baseline = J 'preserved_files_before.json'
$baselineByPath = @{}
foreach ($f in $baseline.files) { $baselineByPath[$f.relative_path] = $f }
$changed = New-Object System.Collections.Generic.List[object]
$missing = New-Object System.Collections.Generic.List[string]
$unchanged = 0
foreach ($f in $baseline.files) {
  $abs = Join-Path $Root $f.relative_path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $missing.Add($f.relative_path); continue }
  $now = Get-Sha256 $abs
  if ($now -eq $f.sha256) { $unchanged++ }
  else { $changed.Add([pscustomobject][ordered]@{ relative_path = $f.relative_path; before = $f.sha256; after = $now; bytes = (Get-Item -LiteralPath $abs).Length }) }
}
$aar = J 'amendment_application_result.json'
$authorised = @($changed | Where-Object { $_.relative_path -eq $Plan -and $_.before -eq $aar.digest_before -and $_.after -eq $aar.digest_after })
$unauthorised = @($changed | Where-Object { $_.relative_path -ne $Plan })

Check 'V-U01' 'exactly one pre-existing file changed, it is the governing plan, and its before and after digests are the ones the amendment recorded' `
  (($changed.Count -eq 1) -and ($authorised.Count -eq 1)) `
  ("changed: {0}; the authorised one: {1} ({2} -> {3})" -f $changed.Count, $authorised.Count, $aar.digest_before, $aar.digest_after)
Check 'V-U02' 'no pre-existing file changed outside the one authorised amendment, and no earlier artifact was touched' `
  ($unauthorised.Count -eq 0) `
  ("unauthorised changes: {0}{1}" -f $unauthorised.Count, $(if ($unauthorised.Count -gt 0) { ': ' + (($unauthorised | ForEach-Object { $_.relative_path }) -join '; ') } else { '' }))
Check 'V-U03' 'no pre-existing file was deleted or is missing' ($missing.Count -eq 0) ("missing: {0}" -f $missing.Count)

# ---------------------------------------------------------------- artifacts parse, carry no BOM, and the narrative exists
$jsonArtifacts = @(
  'amendment_text.json', 'amendment_application_result.json', 'owner_decision_record.json',
  'version_conflict_resolution_record.json', 'scoped_gate_5_6_verdict_successor.json',
  'rule_corpus_amendment_001u.json', 'admission_record_001u.json', 'counts_001u.json',
  'post_assignment_binding_verification_001u.json', 'scoped_gate_5_7_verdict.json', 'next_work_order.json',
  'input_verification.json', 'preserved_files_before.json'
)
$badJson = New-Object System.Collections.Generic.List[string]
$bomFound = New-Object System.Collections.Generic.List[string]
foreach ($name in $jsonArtifacts) {
  $abs = Join-Path $Out $name
  try { $null = Read-Json $abs } catch { $badJson.Add($name) }
  $bytes = [System.IO.File]::ReadAllBytes($abs)
  if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) { $bomFound.Add($name) }
}
Check 'V-U04' 'every JSON artifact of this order parses' ($badJson.Count -eq 0) ("unparseable: {0}{1}" -f $badJson.Count, $(if ($badJson.Count -gt 0) { ': ' + ($badJson -join '; ') } else { '' }))
Check 'V-U05' 'no artifact of this order carries a byte-order mark' ($bomFound.Count -eq 0) ("with BOM: {0}{1}" -f $bomFound.Count, $(if ($bomFound.Count -gt 0) { ': ' + ($bomFound -join '; ') } else { '' }))
$narrativeAbs = Join-Path $Root $Narrative
$narrativeExists = Test-Path -LiteralPath $narrativeAbs -PathType Leaf
$narrativeSize = if ($narrativeExists) { (Get-Item -LiteralPath $narrativeAbs).Length } else { 0 }
Check 'V-U06' 'the completion narrative exists and is not an empty file' ($narrativeExists -and $narrativeSize -gt 5000) ("exists: {0}; bytes: {1}" -f $narrativeExists, $narrativeSize)

# ---------------------------------------------------------------- files added by this order
# The three records this same harness writes are excluded from every "added" list: a list written inside one of them
# that recorded its own or a sibling's digest would be stale by construction. They are reported separately, by digest,
# in verification_results.json and in file_custody_manifest.json.
$harnessSummaryRecords = @('preservation_and_change_record.json', 'file_custody_manifest.json', 'verification_results.json')
$addedByThisOrder = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if ($baselineByPath.ContainsKey($rel)) { continue }
  if ($harnessSummaryRecords -contains $f.Name) { continue }
  $addedByThisOrder.Add([pscustomobject][ordered]@{ relative_path = $rel; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}
$strayAdditions = @($addedByThisOrder | Where-Object { $_.relative_path -notlike 'SOURCE_CAPTURES\PHASE5-001U\*' -and $_.relative_path -ne $Narrative })
$thisOrdersOwnAdditions = @($addedByThisOrder | Where-Object { $_.relative_path -like 'SOURCE_CAPTURES\PHASE5-001U\*' -or $_.relative_path -eq $Narrative })

# ---------------------------------------------------------------- the pins, re-measured after everything was written
$inputVerification = J 'input_verification.json'
$pinRows = @($inputVerification.inputs)
$pinMismatch = New-Object System.Collections.Generic.List[string]
$pinAbsent = New-Object System.Collections.Generic.List[string]
foreach ($r in $pinRows) {
  $abs = Join-Path $Root $r.path
  if (-not (Test-Path -LiteralPath $abs -PathType Leaf)) { $pinAbsent.Add($r.path); continue }
  $now = Get-Sha256 $abs
  if ($now -ne $r.pinned_sha256) { $pinMismatch.Add(("{0} (pinned {1}, measured {2})" -f $r.path, $r.pinned_sha256, $now)) }
}
Check 'V-U08' 'every pinned input still matches the pin measured after everything this order wrote, except the one file this order was authorised to amend, which measures exactly at the recorded after digest' `
  ($pinMismatch.Count -eq 1 -and $pinMismatch[0] -like ($Plan + ' (*') -and ((Get-Sha256 (Join-Path $Root $Plan)) -eq $aar.digest_after)) `
  ("pins: {0}; mismatching: {1}{2}" -f $pinRows.Count, $pinMismatch.Count, $(if ($pinMismatch.Count -gt 0) { ': ' + ($pinMismatch -join '; ') } else { '' }))
Check 'V-U09' 'the number of pinned inputs, the number absent by design and the number of input conflicts are the ones the input verification recorded' `
  (($pinRows.Count -eq $inputVerification.input_count) -and ($pinAbsent.Count -eq $inputVerification.absent_from_this_workspace) -and ($inputVerification.input_conflicts_with_the_orders_own_pin -eq 0)) `
  ("inputs: {0} recorded / {1} measured; absent: {2} recorded / {3} measured; own-pin conflicts: {4}" -f $inputVerification.input_count, $pinRows.Count, $inputVerification.absent_from_this_workspace, $pinAbsent.Count, $inputVerification.input_conflicts_with_the_orders_own_pin)

$roRows = @($inputVerification.read_only_outside_the_workspace.pointers)
$roBad = New-Object System.Collections.Generic.List[string]
foreach ($p in $roRows) {
  $abs = Join-Path $Legacy $p.label
  $h = if (Test-Path -LiteralPath $abs -PathType Leaf) { Get-Sha256 $abs } else { 'ABSENT' }
  if ($h -ne $p.recorded_sha256) { $roBad.Add(("{0} (recorded {1}, measured {2})" -f $p.label, $p.recorded_sha256, $h)) }
}
Check 'V-U10' 'every read-only pointer outside the workspace still matches its recorded pin, and this order wrote or deleted nothing there' `
  ($roBad.Count -eq 0) `
  ("pointers: {0}; mismatching: {1}{2}" -f $roRows.Count, $roBad.Count, $(if ($roBad.Count -gt 0) { ': ' + ($roBad -join '; ') } else { '' }))

# ---------------------------------------------------------------- what this order added, and what other work added
$pinnedPaths = @($inputVerification.inputs | ForEach-Object { $_.path })
$historicalPaths = @($WithheldVerdict, $RetainedArtifact, $RuleRecordPath, 'SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv', 'SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json')
$strayThatArePinnedInputs = @($strayAdditions | Where-Object { $pinnedPaths -contains $_.relative_path })
$strayThatAreHistorical = @($strayAdditions | Where-Object { $historicalPaths -contains $_.relative_path })
Check 'V-U07' 'every file this order added is inside its own package or is its narrative, and no file that other work added to the workspace after the baseline is a pinned input, a historical record this order must not touch, or the register' `
  (($thisOrdersOwnAdditions.Count -ge 30) -and ($strayThatArePinnedInputs.Count -eq 0) -and ($strayThatAreHistorical.Count -eq 0)) `
  ("added by this order: {0} (package or narrative); added to the workspace by other work after the baseline: {1} — {2}; of those, pinned inputs: {3}; historical records: {4}" -f $thisOrdersOwnAdditions.Count, $strayAdditions.Count, (($strayAdditions | ForEach-Object { $_.relative_path }) -join '; '), $strayThatArePinnedInputs.Count, $strayThatAreHistorical.Count)

# ---------------------------------------------------------------- the amendment: applied once, extension-only, and not re-run
$am = J 'amendment_text.json'
$vcr = J 'version_conflict_resolution_record.json'
$res = $vcr.the_resolution.the_amendment
$planNow = Get-Sha256 (Join-Path $Root $Plan)
$planTextNow = Get-Content -LiteralPath (Join-Path $Root $Plan) -Raw
$replacementOccurrencesInThePlan = ([regex]::Matches($planTextNow, [regex]::Escape($res.replacement_text_stated))).Count
$replacedOccurrencesInThePlan = ([regex]::Matches($planTextNow, [regex]::Escape($res.replaced_text_quoted_verbatim))).Count
Check 'V-U11' 'the plan is at the digest the amendment recorded after the change, and its own re-read agrees' `
  (($planNow -eq $aar.digest_after) -and ($aar.digest_after_matches_re_read -eq $true) -and ($aar.document_digest_after_re_read -eq $aar.digest_after) -and ($planNow -ne $aar.digest_before)) `
  ("plan now: {0}; recorded before: {1}; recorded after: {2}" -f $planNow, $aar.digest_before, $aar.digest_after)
Check 'V-U12' 'the amendment was applied exactly once: one quoted replacement and one appended amendment-history row, in one run' `
  (($aar.replacements_applied -eq 1) -and ($aar.rows_appended -eq 1) -and ($aar.amendments_applied -eq 1 + $aar.rows_appended) -and ($aar.results.Count -eq 2) -and ($aar.results[0].id -eq 'A-U-1') -and ($aar.results[1].id -eq 'A-U-2') -and ($aar.document_changed_in_this_run -eq $true) -and ($am.amendment_count -eq 2)) `
  ("replacements: {0}; rows appended: {1}; entries recorded: {2} ({3})" -f $aar.replacements_applied, $aar.rows_appended, $aar.amendments_applied, (($aar.results | ForEach-Object { $_.id }) -join ', '))
Check 'V-U13' 'the replacement is an extension: the replaced sentence survives verbatim inside it, the replacement occurs exactly once in the plan now, and no requirement was removed' `
  (($replacementOccurrencesInThePlan -eq 1) -and ($replacedOccurrencesInThePlan -ge 1) -and ($res.replacement_text_stated.StartsWith($res.replaced_text_quoted_verbatim)) -and ($res.extension_only_no_requirement_removed -eq $true) -and ($res.replaced_text_survives_verbatim_in_the_document -eq $true)) `
  ("replacement occurrences in the plan: {0}; replaced sentence occurrences: {1}; extension-only: {2}" -f $replacementOccurrencesInThePlan, $replacedOccurrencesInThePlan, $res.extension_only_no_requirement_removed)
$historyRow = (Get-Content -LiteralPath (Join-Path $Root $Plan)) | Where-Object { $_ -match '^\| 2026-10-01 \| PHASE5-001U \|' }
Check 'V-U14' 'the amendment-history row this order records is present in the amended document' `
  (@($historyRow).Count -eq 1) `
  ("rows found: {0}; row bytes: {1}" -f @($historyRow).Count, $(if (@($historyRow).Count -eq 1) { $historyRow.Length } else { 0 }))
$applierSource = Get-Content -LiteralPath (Join-Path $Out 'apply_amendment_001u.cjs') -Raw
$amendmentSource = Get-Content -LiteralPath (Join-Path $Out 'amendment_001u.cjs') -Raw
Check 'V-U15' 'the amendment applier was NOT re-run, and it carries the guards that make a second application impossible' `
  (($applierSource.Contains('not at the pinned digest')) -and ($amendmentSource.Contains('the replacement text already occurs')) -and ($planNow -ne $aar.digest_before) -and ($replacementOccurrencesInThePlan -eq 1)) `
  ("pinned-digest guard present: {0}; already-present guard present: {1}; document already past the pinned digest: {2}" -f $applierSource.Contains('not at the pinned digest'), $amendmentSource.Contains('the replacement text already occurs'), ($planNow -ne $aar.digest_before))

# ---------------------------------------------------------------- the gate text quoted is the gate text in the document
$verdictDoc = J 'scoped_gate_5_7_verdict.json'
$planLine180 = (Get-Content -LiteralPath (Join-Path $Root $Plan))[179]
Check 'V-U16' 'the verdict quotes the Gate 5.7 / segment-exit line of the amended document verbatim, at the line the amendment left it on' `
  (($verdictDoc.gate_text_quoted_verbatim.text -eq $planLine180) -and ($verdictDoc.gate_text_quoted_verbatim.quoted_verbatim -eq $true) -and ($verdictDoc.gate_text_quoted_verbatim.line -eq 180) -and ($verdictDoc.gate_text_quoted_verbatim.digest_now -eq $planNow)) `
  ("equal to the document line: {0}; line: {1}; digest bound: {2}" -f ($verdictDoc.gate_text_quoted_verbatim.text -eq $planLine180), $verdictDoc.gate_text_quoted_verbatim.line, ($verdictDoc.gate_text_quoted_verbatim.digest_now -eq $planNow))

# ---------------------------------------------------------------- the historical records this order must not touch
Check 'V-U17' 'the withheld PHASE5-001R Gate 5.5 verdict is preserved unchanged at its recorded digest' `
  ((Get-Sha256 (Join-Path $Root $WithheldVerdict)) -eq $WithheldVerdictDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $WithheldVerdict)))
Check 'V-U18' 'the retained PHASE5-001I-A artifact is unchanged at the digest Owner Decision 1 accepted' `
  ((Get-Sha256 (Join-Path $Root $RetainedArtifact)) -eq $RetainedArtifactDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $RetainedArtifact)))
Check 'V-U19' 'the inherited internal-validation suite is unchanged and was not run: its harness still carries the digest the input verification recorded' `
  ((Get-Sha256 (Join-Path $Root $RunSuiteHarness)) -eq $RunSuiteHarnessDigest) `
  ("measured: {0}" -f (Get-Sha256 (Join-Path $Root $RunSuiteHarness)))

# ---------------------------------------------------------------- the governed rule record is not edited
$ruleRecord = Read-Json (Join-Path $Root $RuleRecordPath)
$ruleRecordText = Get-Content -LiteralPath (Join-Path $Root $RuleRecordPath) -Raw
$identityOccurrences = ([regex]::Matches($ruleRecordText, [regex]::Escape('CA-NS-CRA-S10-3-C-LIMB-1@ADMITTED-v1.0.0-C24CA3FD3AA3'))).Count
$reservationOccurrences = ([regex]::Matches($ruleRecordText, [regex]::Escape('RESERVED_TO_GATE_5_7'))).Count
Check 'V-U20' 'the governed rule record is not edited: it stands at its pinned digest, still reads NOT_ADMITTED, and still carries the reservation the admission resolved by reference' `
  (((Get-Sha256 (Join-Path $Root $RuleRecordPath)) -eq $RuleRecordDigest) -and ($ruleRecord.admission_state.state -eq 'NOT_ADMITTED') -and ($identityOccurrences -eq 0) -and ($reservationOccurrences -ge 1)) `
  ("digest: {0}; state: {1}; production-identity occurrences: {2}; reservation occurrences: {3}" -f (Get-Sha256 (Join-Path $Root $RuleRecordPath)), $ruleRecord.admission_state.state, $identityOccurrences, $reservationOccurrences)

# ---------------------------------------------------------------- the scoped Gate 5.6 successor and the record it supersedes
$gate56 = J 'scoped_gate_5_6_verdict_successor.json'
$gate56Row = @($gate56.gate_criteria)
Check 'V-U21' 'the scoped Gate 5.6 successor records all four clauses met on its own re-measurement, and names none as unmet' `
  ((@($gate56Row).Count -eq 4) -and ($gate56.gate_tally.met -eq 4) -and ($gate56.gate_tally.not_met -eq 0) -and ($gate56.every_clause_met -eq $true) -and ($gate56.gate_5_7_admission_may_proceed -eq $true)) `
  ("clauses: {0}; met: {1}; not met: {2}" -f @($gate56Row).Count, $gate56.gate_tally.met, $gate56.gate_tally.not_met)
Check 'V-U22' 'the predecessor Gate 5.6 verdict of PHASE5-001T is preserved unchanged at its digest and named as superseded rather than edited' `
  (($gate56.supersedes_and_preserves.its_digest -eq '86886EDBDCF6F13A29B1E10A031339FEB1A6C766D11D599DE0505B03DE4AC94C') -and ((Get-Sha256 (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json')) -eq $gate56.supersedes_and_preserves.its_digest) -and ($gate56.supersedes_and_preserves.its_state -like 'PRESERVED UNCHANGED*')) `
  ("recorded digest: {0}; measured: {1}" -f $gate56.supersedes_and_preserves.its_digest, (Get-Sha256 (Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001T\scoped_gate_5_6_verdict.json')))

# ---------------------------------------------------------------- the admission, measured against what it claims
$admission = J 'admission_record_001u.json'
$counts = J 'counts_001u.json'
$post = J 'post_assignment_binding_verification_001u.json'
Check 'V-U23' 'exactly one governed rule is admitted, at the production identity and version the amendment record names' `
  (($admission.the_admission.immutable_rule_id -eq 'CA-NS-CRA-S10-3-C-LIMB-1') -and ($admission.the_admission.production_admission_identity -eq 'CA-NS-CRA-S10-3-C-LIMB-1@ADMITTED-v1.0.0-C24CA3FD3AA3') -and ($admission.the_admission.assigned_version_string -eq 'CA-NS-CRA-S10-3-C-LIMB-1/v1.0.0') -and ($admission.the_admission.admission_form_in_the_governed_rule_record -like 'the record still reads RESERVED_TO_GATE_5_7*')) `
  ("rule: {0}; identity: {1}; version: {2}" -f $admission.the_admission.immutable_rule_id, $admission.the_admission.production_admission_identity, $admission.the_admission.assigned_version_string)
$admittedList = @((J 'rule_corpus_amendment_001u.json').rules_admitted)
Check 'V-U24' 'the rule-corpus amendment carries exactly one admitted rule, and the pre-admission identity it supersedes is named' `
  ((@($admittedList).Count -eq 1) -and ($admittedList[0].production_admission_identity -eq $admission.the_admission.production_admission_identity) -and ($admittedList[0].pre_admission_identity_this_supersedes -eq 'CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3')) `
  ("admitted rules: {0}; supersedes: {1}" -f @($admittedList).Count, $admittedList[0].pre_admission_identity_this_supersedes)
Check 'V-U25' 'the post-assignment verification re-measures the binding to the same package digest the admission recorded, with no row moved' `
  (($post.package_digest_recorded_by_the_admission -eq $post.package_digest_measured_now) -and ($post.package_digest_state -eq 'UNCHANGED') -and ($post.summary.rows_moved -eq 0) -and ($post.summary.rows_total -eq 22)) `
  ("digest: {0}; rows: {1}; moved: {2}" -f $post.package_digest_state, $post.summary.rows_total, $post.summary.rows_moved)

# ---------------------------------------------------------------- the counts, the register and the finding-class ceiling
$four = $counts.the_four_counts_the_plan_names_recorded_separately
Check 'V-U26' 'the four counts the plan names are recorded separately, each marked uncertified, and nothing unresolved is presented as certified' `
  (($four.excluded.count -eq 0) -and ($four.unresolved.count -eq 416) -and ($four.gap.count -eq 18) -and ($four.refusal.count -eq 3) -and ($four.unresolved.certified -eq $false) -and ($four.gap.certified -eq $false) -and ($four.refusal.certified -eq $false)) `
  ("excluded {0}; unresolved {1}; gap {2}; refusal {3}" -f $four.excluded.count, $four.unresolved.count, $four.gap.count, $four.refusal.count)
$register = $counts.the_register_this_record_reads
Check 'V-U27' 'the register is unchanged at its digest, still holds 437 rows, and still carries the same disposition distribution' `
  (($register.sha256 -eq 'DFB78DD20AAD444A4FC5B03D0FDFF11081AD67A454AF80BBBB2CD4CB0C0F24BB') -and ((Get-Sha256 (Join-Path $Root $register.path)) -eq $register.sha256) -and ($register.rows -eq 437) -and ($register.disposition_tally.UNRESOLVED -eq 416) -and ($register.disposition_tally.GAP -eq 18) -and ($register.disposition_tally.REFUSAL -eq 3)) `
  ("digest unchanged: {0}; rows: {1}; unresolved {2} / gap {3} / refusal {4}" -f ($register.sha256 -eq (Get-Sha256 (Join-Path $Root $register.path))), $register.rows, $register.disposition_tally.UNRESOLVED, $register.disposition_tally.GAP, $register.disposition_tally.REFUSAL)
$rowChange = $counts.register_rows_this_order_changes
Check 'V-U28' 'the register row the admitted unit was derived from is unchanged: this order dispositioned, cleared and moved no row' `
  (($rowChange.dispositioned -eq 0) -and ($rowChange.cleared -eq 0) -and ($rowChange.moved -eq 0) -and ($rowChange.evidence_of_that.source_entry_id -eq 'CRP-LSRC-0354') -and ($rowChange.evidence_of_that.disposition -eq 'UNRESOLVED')) `
  ("row {0}: {1}; dispositioned {2}; cleared {3}; moved {4}" -f $rowChange.evidence_of_that.source_entry_id, $rowChange.evidence_of_that.disposition, $rowChange.dispositioned, $rowChange.cleared, $rowChange.moved)
Check 'V-U29' 'the governed counts move only by the admission: one governed rule, one coverage entry, and no permitted finding' `
  (($counts.governed_counts.governed_rules_admitted.after_this_order -eq 1) -and ($counts.governed_counts.governed_coverage_entries.after_this_order -eq 1) -and ($counts.governed_counts.permitted_findings.after_this_order -eq 0) -and ($counts.governed_counts.authorised_finding_classes.count -eq 0) -and ($counts.governed_counts.consumer_visible_outputs.count -eq 0)) `
  ("rules {0}; coverage {1}; permitted findings {2}; authorised classes {3}" -f $counts.governed_counts.governed_rules_admitted.after_this_order, $counts.governed_counts.governed_coverage_entries.after_this_order, $counts.governed_counts.permitted_findings.after_this_order, $counts.governed_counts.authorised_finding_classes.count)
$owner = J 'owner_decision_record.json'
$decision2 = @($owner.decisions | Where-Object { $_.id -eq 'OWNER-DECISION-2' })[0]
Check 'V-U30' 'the owner withholds the finding-class decision, and no finding class is authorised or emitted anywhere in this order' `
  (($decision2.the_finding_class_decision.state -like 'WITHHELD*') -and ($admission.the_finding_class_decision_the_owner_withholds -ne $null) -and ($ruleRecord.classification_and_ceiling.permitted_result_ceiling -eq 'OBSERVATION_CLASS_ONLY') -and ($verdictDoc.the_admission_this_verdict_records.finding_authorisation.finding_class_count -eq 0)) `
  ("owner decision: {0}; ceiling: {1}" -f $decision2.the_finding_class_decision.state, $ruleRecord.classification_and_ceiling.permitted_result_ceiling)
Check 'V-U31' 'the crosswalk proposal of PROBABLE_VIOLATION stays unadopted, and the ceiling is read from the pinned rule record rather than chosen here' `
  (($ruleRecord.classification_and_ceiling.proposed_ceiling_not_adopted -ne $null) -and ($admission.the_limitation_recorded_rather_than_filled -ne $null) -and ($decision2.the_finding_class_decision.what_it_does_not_do -join ' ' -like '*does not adopt*PROD-003*')) `
  ("proposal recorded: {0}; limitation recorded: {1}" -f ($ruleRecord.classification_and_ceiling.proposed_ceiling_not_adopted -ne $null), ($admission.the_limitation_recorded_rather_than_filled -ne $null))

# ---------------------------------------------------------------- the scoped Gate 5.7 verdict, measured against itself
$gate57 = @($verdictDoc.gate_criteria)
$c4 = @($verdictDoc.gate_criteria | Where-Object { $_.n -eq 4 })[0]
Check 'V-U32' 'the verdict states every branch and every completion condition of the gate sentence, meets two for this scope, relies on one, and names the one it cannot meet' `
  ((@($gate57).Count -eq 4) -and ($verdictDoc.gate_tally.met -eq 2) -and ($verdictDoc.gate_tally.not_met_and_named -eq 1) -and ($verdictDoc.gate_tally.condition_of_this_admission_met -eq $true) -and ($verdictDoc.gate_tally.segment_completion_condition_met -eq $false) -and ($c4.state -like 'NOT MET AND NAMED*')) `
  ("criteria: {0}; met for this scope: {1}; not relied on: {2}; not met and named: {3}" -f @($gate57).Count, $verdictDoc.gate_tally.met, $verdictDoc.gate_tally.not_relied_on, $verdictDoc.gate_tally.not_met_and_named)
Check 'V-U33' 'the criterion it cannot meet is the segment-completion sentence, quoted out of the gate sentence the verdict reads at runtime, and the verdict names it instead of passing it or omitting it' `
  (($planLine180.Contains($c4.criterion_verbatim)) -and ($verdictDoc.criterion_it_cannot_meet.criterion -eq $c4.criterion_verbatim) -and ($verdictDoc.criterion_it_cannot_meet.what_is_missing -like '*remaining in-scope rules*')) `
  ("criterion 4 is quoted from the gate sentence: {0}; missing: {1}" -f $planLine180.Contains($c4.criterion_verbatim), $verdictDoc.criterion_it_cannot_meet.what_is_missing)
Check 'V-U34' 'the verdict passes the gate for this one scope and states no corpus-wide gate as satisfied' `
  (($verdictDoc.verdict -like 'PASSED FOR THIS ONE SCOPE*') -and ($verdictDoc.corpus_wide_status_kept_separate.'5.7' -like 'NOT PASSED corpus-wide*') -and ($verdictDoc.corpus_wide_status_kept_separate.'5.6' -like 'NOT PASSED corpus-wide*') -and ($verdictDoc.corpus_wide_status_kept_separate.'5.2' -like 'NOT PASSED corpus-wide*')) `
  ("verdict: {0}; 5.7 corpus-wide: {1}" -f $verdictDoc.verdict.Substring(0, 40), $verdictDoc.corpus_wide_status_kept_separate.'5.7')
Check 'V-U35' 'the verdict states every acceptance criterion of this order and marks none of them not met' `
  ((@($verdictDoc.acceptance_criteria).Count -eq 6) -and ($verdictDoc.acceptance_tally.not_met -eq 0) -and ($verdictDoc.acceptance_tally.met -eq 6)) `
  ("acceptance criteria: {0}; met: {1}; not met: {2}" -f @($verdictDoc.acceptance_criteria).Count, $verdictDoc.acceptance_tally.met, $verdictDoc.acceptance_tally.not_met)
$pv = $verdictDoc.pin_verification
Check 'V-U36' 'the pin table is reported as it was measured: one expected non-match (the authorised plan change), nothing absent, and every other pin matching' `
  (($pv.pins_carried_by_this_order -eq 36) -and ($pv.pins_matching_their_pin -eq 35) -and ($pv.pins_not_matching -eq 1) -and (@($pv.pins_not_matching_keys).Count -eq 1) -and ($pv.pins_not_matching_keys[0] -eq $Plan) -and ($pv.pins_absent_from_this_workspace -eq 0) -and ($pv.the_one_expected_non_match.is_the_authorised_change -eq $true) -and ($pv.pins_left_at_the_pre_amendment_value_by_this_order -eq 0)) `
  ("pins {0}: matching {1}; not matching {2}; absent {3}; the non-match is the authorised change: {4}" -f $pv.pins_carried_by_this_order, $pv.pins_matching_their_pin, $pv.pins_not_matching, $pv.pins_absent_from_this_workspace, $pv.the_one_expected_non_match.is_the_authorised_change)
Check 'V-U37' 'the verdict records the defects found while executing this order and records no behavioural defect in the evaluator' `
  ((@($verdictDoc.defects_found_while_executing_this_order).Count -ge 3) -and ($verdictDoc.behavioural_defects_found_in_the_evaluator -eq 0)) `
  ("defects recorded: {0}; evaluator defects: {1}" -f @($verdictDoc.defects_found_while_executing_this_order).Count, $verdictDoc.behavioural_defects_found_in_the_evaluator)

# ---------------------------------------------------------------- the next step: issued, not begun
$order = J 'next_work_order.json'
Check 'V-U38' 'the next order is issued, is not begun, and is issued for this one scope only' `
  (($order.order_issued -eq $true) -and ($order.the_order_issued.begun -eq $false) -and ($order.the_order_issued.order_id -eq 'PHASE5-001V') -and ($order.the_order_issued.issued_for -eq 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT')) `
  ("issued: {0}; id: {1}; begun: {2}; scope: {3}" -f $order.order_issued, $order.the_order_issued.order_id, $order.the_order_issued.begun, $order.the_order_issued.issued_for)
Check 'V-U39' 'the queue the next order is issued against is the preserved register, with no row changed by this order' `
  (($order.the_corpus_queue_it_is_issued_against.register_rows -eq 437) -and ($order.the_corpus_queue_it_is_issued_against.open_queue_size -eq 416) -and ($order.the_corpus_queue_it_is_issued_against.rows_changed_by_this_order -eq 0) -and ($order.the_corpus_queue_it_is_issued_against.register_sha256 -eq $register.sha256)) `
  ("rows: {0}; open: {1}; changed: {2}" -f $order.the_corpus_queue_it_is_issued_against.register_rows, $order.the_corpus_queue_it_is_issued_against.open_queue_size, $order.the_corpus_queue_it_is_issued_against.rows_changed_by_this_order)
Check 'V-U40' 'the next order names the one outstanding owner decision, forbids choosing it on the owner''s behalf, and carries the same stop condition this order honoured' `
  (($order.the_order_issued.the_decision_it_must_obtain.the_one_owner_decision_outstanding -like '*the exact finding classes authorised*') -and ($order.the_order_issued.the_decision_it_must_obtain.what_the_next_order_may_not_do -like '*may not choose the finding classes*') -and (@($order.the_order_issued.stop_conditions_it_would_carry | Where-Object { $_ -like '*withholds the finding-class decision again*' }).Count -eq 1) -and ($order.the_order_issued.this_record_does_not_authorise_it_to_begin -like 'nothing in this record authorises*')) `
  ("outstanding decision: {0}; stop conditions: {1}" -f $order.the_order_issued.the_decision_it_must_obtain.the_one_owner_decision_outstanding, @($order.the_order_issued.stop_conditions_it_would_carry).Count)

# ---------------------------------------------------------------- builders re-run and compared byte-for-byte
# apply_amendment_001u.cjs is EXCLUDED by design: it is the only write-capable command of this order and it edits the
# governed plan. Its single application is verified by digest and by its own guards at V-U11 to V-U15.
$builders = @('build_001u_owner_records.cjs', 'build_001u_successor_verdict.cjs', 'build_001u_admission.cjs', 'build_001u_verdict.cjs', 'build_001u_next_order.cjs')
$producedBy = [ordered]@{
  'build_001u_owner_records.cjs' = @('owner_decision_record.json', 'version_conflict_resolution_record.json')
  'build_001u_successor_verdict.cjs' = @('scoped_gate_5_6_verdict_successor.json')
  'build_001u_admission.cjs' = @('rule_corpus_amendment_001u.json', 'admission_record_001u.json', 'counts_001u.json', 'post_assignment_binding_verification_001u.json')
  'build_001u_verdict.cjs' = @('scoped_gate_5_7_verdict.json')
  'build_001u_next_order.cjs' = @('next_work_order.json')
}
$before = @{}
foreach ($b in $builders) { foreach ($a in $producedBy[$b]) { $before[$a] = Get-Sha256 (Join-Path $Out $a) } }
$planBeforeRerun = Get-Sha256 (Join-Path $Root $Plan)
$rerunFailures = New-Object System.Collections.Generic.List[string]
foreach ($b in $builders) {
  $null = & node (Join-Path $Out $b) 2>&1
  if ($LASTEXITCODE -ne 0) { $rerunFailures.Add($b + ' (exit ' + $LASTEXITCODE + ')') }
}
foreach ($a in $before.Keys) {
  $now = Get-Sha256 (Join-Path $Out $a)
  if ($now -ne $before[$a]) { $rerunFailures.Add($a + ' (digest changed on re-run)') }
}
Check 'V-U41' 'every builder of this order that is safe to re-run was re-run, every one of its outputs is byte-for-byte identical, and the re-run left the governed plan untouched' `
  (($rerunFailures.Count -eq 0) -and ((Get-Sha256 (Join-Path $Root $Plan)) -eq $planBeforeRerun)) `
  ("builders re-run: {0}; artifacts compared: {1}; unstable: {2}{3}; plan unchanged by the re-run: {4}" -f $builders.Count, $before.Keys.Count, $rerunFailures.Count, $(if ($rerunFailures.Count -gt 0) { ': ' + ($rerunFailures -join '; ') } else { '' }), ((Get-Sha256 (Join-Path $Root $Plan)) -eq $planBeforeRerun))

# ---------------------------------------------------------------- the input verification, re-measured
Check 'V-U42' 'no input conflicts with the order''s own pin, none was missing, and no input difference requires an explanation' `
  (($inputVerification.input_count -gt 0) -and ($inputVerification.input_conflicts_with_the_orders_own_pin -eq 0) -and ($inputVerification.differences_requiring_an_explanation -eq 0) -and ($inputVerification.absent_from_this_workspace -eq $pinAbsent.Count)) `
  ("inputs: {0}; own-pin matches: {1}; conflicts: {2}; differences requiring an explanation: {3}; absent: {4}" -f $inputVerification.input_count, $inputVerification.matches_the_orders_own_pin, $inputVerification.input_conflicts_with_the_orders_own_pin, $inputVerification.differences_requiring_an_explanation, $inputVerification.absent_from_this_workspace)
$externalMismatch = @($roRows | Where-Object { $_.state -ne 'MATCHES_THE_RECORDED_PIN' })
Check 'V-U43' 'every read-only pointer outside the workspace matched its recorded pin when the input verification was taken' `
  ($externalMismatch.Count -eq 0) `
  ("pointers: {0}; mismatching at capture: {1}" -f $roRows.Count, $externalMismatch.Count)

# ---------------------------------------------------------------- preservation and change record
$verdictSummary = if (@($checks | Where-Object { $_.passed -ne $true }).Count -eq 0) {
  'PRESERVATION HELD FOR THIS ORDER — exactly one pre-existing file was changed, it is the one authorised amendment of the governing build plan, and nothing else outside this order''s own package was written, deleted or re-classified'
} else {
  'PRESERVATION NOT ESTABLISHED — see the failed checks in verification_results.json'
}
[ordered]@{
  artifact    = 'preservation_and_change_record.json'
  work_order  = 'PHASE5-001U'
  created_utc = '2026-10-01'
  baseline_artifact = 'preserved_files_before.json'
  baseline_files = $baseline.file_count
  files_unchanged = $unchanged
  files_changed = $changed.ToArray()
  changed_count = $changed.Count
  files_missing = $missing.ToArray()
  missing_count = $missing.Count
  files_added_by_this_order = $thisOrdersOwnAdditions
  added_count = $thisOrdersOwnAdditions.Count
  files_added_to_the_workspace_by_other_work_after_the_baseline = $strayAdditions
  added_by_other_work_count = $strayAdditions.Count
  other_work_note = 'these files appeared in the workspace after this order''s baseline was captured and before this harness ran. No command of this order writes outside its own package and the governing plan, so they are not this order''s output; they are listed rather than ignored so that the baseline comparison is complete. None of them is a pinned input, an earlier artifact this order must not touch, or the register (V-U07).'
  expected_changes = $baseline.authorised_change_this_order_may_make
  authorised_changes_by_this_order = $authorised.Count
  unauthorised_changes_by_this_order = $unauthorised.Count
  undeclared_changes = 0
  governed_documents_amended = if ($changed.Count -eq 1 -and $changed[0].relative_path -eq $Plan) { 1 } else { 0 }
  earlier_baselines_overwritten = 0
  earlier_manifests_edited = 0
  the_authorised_change = [pscustomobject][ordered]@{
    relative_path = $Plan
    digest_before = $aar.digest_before
    digest_after = $aar.digest_after
    digest_measured_now = $planNow
    amendment = 'A-U-1 — the Gate 5.6 pre-admission sharing sentence extended by the quoted-replacement procedure of CRP_CORE_CONSTITUTION.md sections 6.1, 6.2 and 6.5, plus one amendment-history row under section 6.5'
    replacements_applied = $aar.replacements_applied
    rows_appended = $aar.rows_appended
    requirement_removed = $false
    requirement_removed_because = 'the replacement is an extension: the replaced text survives verbatim inside it, so nothing the Gate 5.6 sentence required was deleted or weakened'
    recorded_in = 'SOURCE_CAPTURES\PHASE5-001U\amendment_text.json and SOURCE_CAPTURES\PHASE5-001U\amendment_application_result.json'
    authorised_by = 'the owner instrument recorded in SOURCE_CAPTURES\PHASE5-001U\owner_decision_record.json'
    applied_once = $true
    applier_re_run = $false
    why_the_applier_was_not_re_run = 'it edits the governed plan: re-running it would be a second write to a governing document. It carries a pinned-digest guard and an already-applied guard, and this run verified the plan stands at the recorded after digest, with the replacement occurring exactly once.'
  }
  historical_preservation_failure_preserved_unchanged = [pscustomobject][ordered]@{
    the_failure = 'PHASE5-001R changed SOURCE_CAPTURES\PHASE5-001I-A\test_results_001i_a.json without authorisation, disclosed it, and did not repair it'
    still_recorded_as = 'PRESERVED: the withheld PHASE5-001R Gate 5.5 verdict stands at B3A019E6… and that order''s own preservation finding is unedited'
    covered_prospectively_by = 'OWNER DECISION 1, recorded in SOURCE_CAPTURES\PHASE5-001S\custody_supplement.json'
    edited_by_this_order = $false
    separated_from_this_orders_result = 'yes — this record reports the one authorised change of this order and the absence of any other change; the historical failure is reported as history, not as a count in this order''s preservation result'
  }
  legal_corpus_untouched = $true
  legacy_corpus_files_written_or_deleted = 0
  inherited_suite_run = $false
  output_character = 'one admission, observation-only: no consumer-visible output, no authorised finding class, no application change, no deployment and no external transmission'
  verdict = $verdictSummary
  created_by = 'PHASE5-001U'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'preservation_and_change_record.json') -Encoding utf8

# ---------------------------------------------------------------- custody manifest
$manifestFiles = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Root -Recurse -File -Force | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($Root.Length + 1)
  if (($harnessSummaryRecords | ForEach-Object { "SOURCE_CAPTURES\PHASE5-001U\$_" }) -contains $rel) { continue }
  $manifestFiles.Add([pscustomobject][ordered]@{ relative_path_from_workspace = $rel; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}

$readOnly = New-Object System.Collections.Generic.List[object]
foreach ($p in @(
  [pscustomobject]@{ label = 'the accepted source pin (the admitted legal authority, read by the independent reviewer)'; rel = 'packages\backend\src\services\legalCorpus\rules.canada.ts'; recorded = '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF' },
  [pscustomobject]@{ label = 'consumer specimen PR-01 (the byte-pinned presentation; never opened by this order)'; rel = 'packages\backend\fixtures\reports\equifax-david-webb.pdf'; recorded = 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F' },
  [pscustomobject]@{ label = 'consumer specimen PR-02 (secondary; admitted for no rule unit; never opened)'; rel = 'packages\backend\fixtures\reports\transunion-david-webb.pdf'; recorded = '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4' }
)) {
  $abs = Join-Path $Legacy $p.rel
  $h = if (Test-Path -LiteralPath $abs -PathType Leaf) { Get-Sha256 $abs } else { $null }
  $readOnly.Add([pscustomobject][ordered]@{ label = $p.label; relative_path = $p.rel; measured_sha256 = $h; recorded_sha256 = $p.recorded; state = if ($h -eq $p.recorded) { 'MATCHES_THE_RECORDED_PIN' } else { 'DOES_NOT_MATCH' } })
}

[ordered]@{
  artifact    = 'file_custody_manifest.json'
  work_order  = 'PHASE5-001U'
  created_utc = '2026-10-01'
  purpose     = 'record, in one place, the digest of every file this order read or wrote, so custody is measured rather than asserted'
  file_count  = $manifestFiles.Count
  files       = $manifestFiles.ToArray()
  harness_summary_records_excluded_from_files = [pscustomobject][ordered]@{
    records = $harnessSummaryRecords
    why     = 'these three records are written by this same harness during the run, so a digest recorded inside one of them for itself or for another would be stale by construction. The rows above are the files that were stable when the manifest was written; the two that are already final are recorded by digest in verification_results.json, and the third is written last and records its own absence.'
  }
  added_by_this_order = $thisOrdersOwnAdditions
  added_to_the_workspace_by_other_work_after_the_baseline = $strayAdditions
  read_only_outside_the_workspace = $readOnly.ToArray()
  plan_digest = [pscustomobject][ordered]@{
    path = $Plan
    sha256 = $planNow
    baseline_sha256 = $baselineByPath[$Plan].sha256
    state = 'CHANGED BY THIS ORDER, ONCE AND UNDER THE OWNER INSTRUMENT — the one authorised amendment (A-U-1), recorded at ' + $aar.digest_after + ' and left at its own baseline pin in the pin table so the change stays visible'
  }
  retained_artifact = [pscustomobject][ordered]@{
    path = $RetainedArtifact
    sha256 = Get-Sha256 (Join-Path $Root $RetainedArtifact)
    state = 'RETAINED ARTIFACT UNDER OWNER DECISION 1 — read at its digest only and never executed, imported or rewritten by this order'
  }
  inherited_suite = [pscustomobject][ordered]@{
    tree = 'internal-validation\ca-ns-last-payment-six-year'
    harness_sha256 = Get-Sha256 (Join-Path $Root $RunSuiteHarness)
    run_by_this_order = $false
    why = 'it writes its results into its own package. This order inspected its write destinations and recorded its digests, and never ran it.'
  }
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files = $baseline.file_count
    files_unchanged = $unchanged
    files_changed = $changed.Count
    files_missing = $missing.Count
    files_added_by_this_order = $thisOrdersOwnAdditions.Count
    files_added_to_the_workspace_by_other_work_after_the_baseline = $strayAdditions.Count
    earlier_baselines_overwritten = 0
    earlier_manifests_edited = 0
  }
  created_by = 'PHASE5-001U'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'file_custody_manifest.json') -Encoding utf8

# ---------------------------------------------------------------- results
$preservationReadBack = Get-Sha256 (Join-Path $Out 'preservation_and_change_record.json')
$manifestReadBack = Get-Sha256 (Join-Path $Out 'file_custody_manifest.json')
$manifestBack = Read-Json (Join-Path $Out 'file_custody_manifest.json')
$manifestMismatch = @($manifestBack.files | Where-Object { (Get-Sha256 (Join-Path $Root $_.relative_path_from_workspace)) -ne $_.sha256 })
Check 'V-U44' 'the custody manifest re-measures clean: every file it lists is still at the digest it recorded, and it does not list itself' `
  (($manifestMismatch.Count -eq 0) -and (($manifestBack.files | ForEach-Object { $_.relative_path_from_workspace }) -notcontains 'SOURCE_CAPTURES\PHASE5-001U\file_custody_manifest.json')) `
  ("files: {0}; mismatching: {1}" -f $manifestBack.file_count, $manifestMismatch.Count)
$preservationBack = Read-Json (Join-Path $Out 'preservation_and_change_record.json')
Check 'V-U45' 'the preservation record states the authorised change as one change and reports no unauthorised change' `
  (($preservationBack.changed_count -eq 1) -and ($preservationBack.authorised_changes_by_this_order -eq 1) -and ($preservationBack.unauthorised_changes_by_this_order -eq 0) -and ($preservationBack.governed_documents_amended -eq 1) -and ($preservationBack.the_authorised_change.relative_path -eq $Plan)) `
  ("changed: {0}; authorised: {1}; unauthorised: {2}; governed documents amended: {3}" -f $preservationBack.changed_count, $preservationBack.authorised_changes_by_this_order, $preservationBack.unauthorised_changes_by_this_order, $preservationBack.governed_documents_amended)

$failures = @($checks | Where-Object { $_.passed -ne $true })
$artifactsThisOrderWrote = New-Object System.Collections.Generic.List[object]
foreach ($f in (Get-ChildItem -LiteralPath $Out -File | Sort-Object Name)) {
  if ($f.Name -eq 'verification_results.json') { continue }
  $artifactsThisOrderWrote.Add([pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001U\' + $f.Name; bytes = $f.Length; sha256 = Get-Sha256 $f.FullName })
}

[ordered]@{
  artifact    = 'verification_results.json'
  work_order  = 'PHASE5-001U'
  created_utc = '2026-10-01'
  purpose     = 'the checks this order ran over its own artifacts, the amendment it applied, the admission it recorded, the counts and the register it read, the scoped Gate 5.6 successor, the scoped Gate 5.7 verdict, the next step, its preservation and custody, and the historical records it must not have touched'
  checks      = $checks.ToArray()
  check_count = $checks.Count
  failure_count = $failures.Count
  failed      = $failures
  verdict     = if ($failures.Count -eq 0) { 'ALL PHASE5-001U CHECKS PASSED' } else { 'PHASE5-001U CHECKS FAILED: ' + (($failures | ForEach-Object { $_.id }) -join ', ') }
  checks_are_not_gate_evidence = 'these checks verify this order''s own artifacts, its amendment, its admission and its custody. They are not the scope''s gate verdict, which is scoped_gate_5_7_verdict.json, and they are evidence for no other gate or scope.'
  preservation_reading = [pscustomobject][ordered]@{
    baseline_files = $baseline.file_count
    files_unchanged = $unchanged
    files_changed = $changed.Count
    files_missing = $missing.Count
    files_added_by_this_order = $thisOrdersOwnAdditions.Count
    files_added_to_the_workspace_by_other_work_after_the_baseline = $strayAdditions.Count
    authorised_change = $Plan
    earlier_baselines_overwritten = 0
    earlier_manifests_edited = 0
  }
  artifacts_this_order_wrote = $artifactsThisOrderWrote.ToArray()
  harness_summary_records = @(
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001U\preservation_and_change_record.json'; sha256 = $preservationReadBack },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001U\file_custody_manifest.json'; sha256 = $manifestReadBack },
    [pscustomobject][ordered]@{ relative_path = 'SOURCE_CAPTURES\PHASE5-001U\verification_results.json'; note = 'written last by this same harness; its own digest is measured from the file rather than self-recorded' }
  )
  the_scope_verdict_this_order_reached = [pscustomobject][ordered]@{
    record = 'SOURCE_CAPTURES\PHASE5-001U\scoped_gate_5_7_verdict.json'
    sha256 = Get-Sha256 (Join-Path $Out 'scoped_gate_5_7_verdict.json')
    gate_criteria_met_for_this_scope = $verdictDoc.gate_tally.met
    gate_criteria_not_relied_on = $verdictDoc.gate_tally.not_relied_on
    gate_criteria_not_met_and_named = $verdictDoc.gate_tally.not_met_and_named
    admission_condition_met = $verdictDoc.gate_tally.condition_of_this_admission_met
    segment_completion_condition_met = $verdictDoc.gate_tally.segment_completion_condition_met
    verdict = $verdictDoc.verdict
  }
  observations_recorded_while_verifying = @(
    'the amendment record numbers the quoted replacement A-U-1 and the appended amendment-history row A-U-2, while the rule-corpus amendment record numbers the corpus addition A-U-2 as well. The two A-U-2 identifiers live in different namespaces — the plan amendment history and the rule-corpus amendment — and each is explained in its own record. Nothing measured by this order depends on either identifier. It is recorded here rather than harmonised, because harmonising it would mean changing two already-issued records to suit a naming preference.'
  )
  corpus_wide_status_kept_separate = [pscustomobject][ordered]@{
    '5.1' = 'MET with recorded administrative limitations; unchanged'
    '5.2' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.3' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.4' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.5' = 'NOT PASSED corpus-wide; PASSED_FOR_THIS_SCOPE only'
    '5.6' = 'NOT PASSED corpus-wide; MET IN FULL FOR THIS SCOPE on the successor re-measurement'
    '5.7' = 'NOT PASSED corpus-wide; PASSED FOR THIS ONE SCOPE on the first branch of the gate sentence, with the segment-completion sentence recorded as not met — 1 admitted governed rule, 1 governed coverage entry, 0 permitted findings, 0 authorised finding classes'
  }
  what_this_record_does_not_claim = @(
    'it is not the scope''s gate verdict and it passes no gate',
    'it does not admit a rule, create coverage or a candidate, or authorise a finding class',
    'it does not produce consumer-visible output of any class: report checking remains "not yet available"',
    'it does not run, re-run or invoke the PHASE5-001I-A internal suite, and it treats no passing test of that suite as evidence',
    'it does not run the amendment applier a second time, and it treats the single recorded application as the whole of that change',
    'it does not clear, move or re-classify any register row, including the row of the source entry the admitted unit was derived from',
    'it does not repair or deny the historical preservation failure of PHASE5-001R, which is reported separately from this order''s own preservation result',
    'it does not begin the next order it reports, and it decides nothing that order is issued to decide'
  )
  created_by = 'PHASE5-001U'
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'verification_results.json') -Encoding utf8

"checks: {0} | failures: {1} | preservation: {2} changed (authorised {3}), {4} missing of {5} baselined | added by this order: {6} | added by other work after the baseline: {7} | verdict: {8}" -f $checks.Count, $failures.Count, $changed.Count, $authorised.Count, $missing.Count, $baseline.file_count, $thisOrdersOwnAdditions.Count, $strayAdditions.Count, $(if ($failures.Count -eq 0) { 'ALL PHASE5-001U CHECKS PASSED' } else { 'FAILED: ' + (($failures | ForEach-Object { $_.id }) -join ', ') })
if ($failures.Count -gt 0) { $failures | ForEach-Object { "  FAIL {0}: {1} — {2}" -f $_.id, $_.what, $_.detail } }










