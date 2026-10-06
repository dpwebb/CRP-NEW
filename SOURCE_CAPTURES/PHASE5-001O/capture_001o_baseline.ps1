# capture_001o_baseline.ps1 — PHASE5-001O: hash every pre-existing workspace file before any amendment.
#
# Writes SOURCE_CAPTURES\PHASE5-001O\preserved_files_before.json. Excludes this order's own output
# directory and the narrative this order creates, so the baseline is exactly the pre-existing corpus.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001O'
$Narrative = 'CRP_PHASE5_001O_LEGACY_CORPUS_ACCEPTANCE_AND_COVERAGE_RECONCILIATION.md'

$files = Get-ChildItem -LiteralPath $Root -Recurse -File -Force -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch '\\SOURCE_CAPTURES\\PHASE5-001O\\' -and
    $_.Name -ne $Narrative
  } |
  Sort-Object FullName

$rows = foreach ($f in $files) {
  [pscustomobject]@{
    relative_path = $f.FullName.Substring($Root.Length + 1)
    bytes         = $f.Length
    sha256        = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
  }
}

$doc = [ordered]@{
  artifact    = 'preserved_files_before.json'
  work_order  = 'PHASE5-001O'
  created_utc = '2026-09-30'
  purpose     = 'byte-level baseline of every pre-existing file, taken before this order amended any governing document, so preservation is proved by measurement rather than asserted'
  excludes    = @('SOURCE_CAPTURES\PHASE5-001O\** (this order''s own output)', $Narrative)
  file_count  = $rows.Count
  total_bytes = ($rows | Measure-Object bytes -Sum).Sum
  files       = @($rows)
}
$doc | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Encoding utf8

"baseline files: {0}  bytes: {1}" -f $rows.Count, $doc.total_bytes
