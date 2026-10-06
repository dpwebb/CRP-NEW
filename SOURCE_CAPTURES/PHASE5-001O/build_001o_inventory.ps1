# build_001o_inventory.ps1 — PHASE5-001O step 1: locate and verify the legacy statutory corpus.
#
# Read-only with respect to the legacy corpus at C:\Users\webbd\crp-credit-app. Writes only inside
# C:\CRP-NEW\SOURCE_CAPTURES\PHASE5-001O. Verifies every artifact designated by the owner-approved
# Legacy Legal Corpus Admission Contract against its recorded SHA-256.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001O'
$LegacyRoot = 'C:\Users\webbd\crp-credit-app'
$ContractPath = Join-Path $Root 'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md'
$LegalCorpusRel = 'packages\backend\src\services\legalCorpus'

function Get-Sha256([string]$path) { return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash }

$contractDigest = Get-Sha256 $ContractPath
$admitted = New-Object System.Collections.Generic.List[object]
foreach ($line in Get-Content -LiteralPath $ContractPath) {
  $m = [regex]::Match($line, '^\| `(?<p>[^`]+)`(?<sfx>[^|]*)\| `(?<sha>[0-9A-Fa-f]{64})` \| (?<role>[^|]+)\|\s*$')
  if (-not $m.Success) { continue }
  $rel = $m.Groups['p'].Value
  $path = Join-Path $LegacyRoot $rel
  $row = [ordered]@{
    relative_path        = $rel
    recorded_sha256      = $m.Groups['sha'].Value.ToUpperInvariant()
    recorded_role        = $m.Groups['role'].Value.Trim()
    admission_scope_note = $m.Groups['sfx'].Value.Trim()
    legacy_absolute_path = $path
    exists               = (Test-Path -LiteralPath $path -PathType Leaf)
    actual_bytes         = $null
    actual_sha256        = $null
    digest_match         = $false
  }
  if ($row.exists) {
    $row.actual_bytes = (Get-Item -LiteralPath $path).Length
    $row.actual_sha256 = Get-Sha256 $path
    $row.digest_match = ($row.actual_sha256 -eq $row.recorded_sha256)
  }
  $admitted.Add([pscustomobject]$row)
}

$verifiedCount = [int](($admitted | Where-Object { $_.digest_match }).Count)
[pscustomobject]@{
  artifact                      = 'admitted_artifacts.json'
  work_order                    = 'PHASE5-001O'
  created_utc                   = '2026-09-30'
  purpose                       = 'record the exact legacy statutory corpus located for PHASE5-001O and verify every artifact designated by the owner-approved admission contract against its recorded SHA-256'
  admission_contract            = 'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md'
  admission_contract_sha256     = $contractDigest
  legacy_source_root            = $LegacyRoot
  legacy_source_root_exists     = (Test-Path -LiteralPath $LegacyRoot -PathType Container)
  admitted_artifact_count       = $admitted.Count
  admitted_artifacts_verified   = $verifiedCount
  admitted_artifacts_unverified = $admitted.Count - $verifiedCount
  verification_meaning          = 'A digest match establishes that the artifact on disk is byte-identical to the artifact the owner-approved contract designated. It is not a re-review of the artifact legal content.'
  artifacts                     = $admitted.ToArray()
} | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $Out 'admitted_artifacts.json') -Encoding utf8

"admitted artifacts: {0} of {1} verified" -f $verifiedCount, $admitted.Count

# ---------------------------------------------------------------- corpus inventory
$allFiles = Get-ChildItem -LiteralPath $LegacyRoot -Recurse -File -Force -ErrorAction SilentlyContinue
$excluded = $allFiles | Where-Object { $_.FullName -match '\\\.git\\' -or $_.FullName -match '\\node_modules\\' }
$content = $allFiles | Where-Object { $_.FullName -notmatch '\\\.git\\' -and $_.FullName -notmatch '\\node_modules\\' }

$legalCorpusDir = Join-Path $LegacyRoot $LegalCorpusRel
$legalCorpusFiles = @()
if (Test-Path -LiteralPath $legalCorpusDir) {
  foreach ($f in Get-ChildItem -LiteralPath $legalCorpusDir -File -Force | Sort-Object Name) {
    $rel = $LegalCorpusRel + '\' + $f.Name
    $legalCorpusFiles += [pscustomobject]@{
      name     = $f.Name
      bytes    = $f.Length
      sha256   = Get-Sha256 $f.FullName
      admitted = [bool]($admitted | Where-Object { $_.relative_path -eq $rel })
    }
  }
}

$evidenceDir = Join-Path $LegacyRoot 'evidence'
$evidenceCount = 0
if (Test-Path -LiteralPath $evidenceDir) {
  $evidenceCount = (Get-ChildItem -LiteralPath $evidenceDir -Recurse -File -Force -ErrorAction SilentlyContinue).Count
}

$inventory = [ordered]@{
  artifact              = 'legacy_corpus_inventory.json'
  work_order            = 'PHASE5-001O'
  created_utc           = '2026-09-30'
  located_legacy_corpus = [ordered]@{
    legacy_source_root                   = $LegacyRoot
    identified_from                      = 'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md line 5 (Legacy source root), and CRP_CORE_CONSTITUTION.md section 2.3'
    total_files_all                      = $allFiles.Count
    total_bytes_all                      = ($allFiles | Measure-Object Length -Sum).Sum
    files_excluding_git_and_node_modules = $content.Count
    bytes_excluding_git_and_node_modules = ($content | Measure-Object Length -Sum).Sum
    excluded_git_or_node_modules_files   = $excluded.Count
    legal_corpus_module                  = $LegalCorpusRel
    legal_corpus_module_files            = $legalCorpusFiles.Count
    legal_corpus_module_bytes            = ($legalCorpusFiles | Measure-Object bytes -Sum).Sum
    legacy_evidence_files                = $evidenceCount
  }
  admitted_artifact_verification = [ordered]@{
    admission_contract           = 'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md'
    admission_contract_sha256    = $contractDigest
    admitted_artifact_count      = $admitted.Count
    digest_matches               = $verifiedCount
    digest_mismatches_or_missing = $admitted.Count - $verifiedCount
    all_digests_match            = ($verifiedCount -eq $admitted.Count)
  }
  legal_corpus_module_files = $legalCorpusFiles
  admitted_artifacts        = $admitted.ToArray()
  what_this_does_not_do     = @(
    'It does not copy, move, edit or delete any legacy file: the corpus is read-only for this order.',
    'It does not re-review the legal content of any designated artifact; the digest match is a custody fact only.',
    'It does not admit any additional legacy file beyond the artifacts the owner-approved contract designates.'
  )
  created_by = 'PHASE5-001O'
}
$inventory | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Out 'legacy_corpus_inventory.json') -Encoding utf8

"legacy files (all): {0}  bytes: {1}" -f $allFiles.Count, ($allFiles | Measure-Object Length -Sum).Sum
"legalCorpus module files: {0}" -f $legalCorpusFiles.Count
