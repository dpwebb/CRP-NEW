# capture_001i_a_baseline.ps1 — PHASE5-001I-A baseline of the inherited workspace.
#
# Writes SOURCE_CAPTURES\PHASE5-001I-A\preserved_files_before.json before this order records anything.
# Excludes this order's own evidence package and its narrative, exactly as earlier orders excluded theirs.
# Read-only: it reads and hashes; it changes no file outside its own output directory.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$Out = Join-Path $Root 'SOURCE_CAPTURES\PHASE5-001I-A'
$Narrative = 'CRP_PHASE5_001I_A_LAST_PAYMENT_EXTRACTOR_AND_SIX_YEAR_EVALUATOR.md'

if (-not (Test-Path -LiteralPath $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }

$files = Get-ChildItem -LiteralPath $Root -Recurse -File -Force |
  Where-Object { $_.FullName -notlike (Join-Path $Out '*') -and $_.Name -ne $Narrative } |
  ForEach-Object {
    [pscustomobject]@{
      relative_path = $_.FullName.Substring($Root.Length + 1)
      bytes         = $_.Length
      sha256        = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
  }

[ordered]@{
  artifact    = 'preserved_files_before.json'
  work_order  = 'PHASE5-001I-A'
  created_utc = (Get-Date -Format 'yyyy-MM-dd')
  purpose     = 'the inherited state of every workspace file at the start of this order, measured before this order recorded anything, excluding this order''s own evidence package and narrative'
  root        = $Root
  excludes    = @('SOURCE_CAPTURES\PHASE5-001I-A\** (this order''s own output)', $Narrative)
  file_count  = @($files).Count
  files       = @($files)
  created_by  = 'PHASE5-001I-A'
} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Out 'preserved_files_before.json') -Encoding utf8

'baseline files: {0}' -f @($files).Count
