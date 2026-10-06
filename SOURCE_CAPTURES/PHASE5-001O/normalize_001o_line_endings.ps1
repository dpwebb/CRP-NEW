# normalize_001o_line_endings.ps1 — make the four CRLF governing documents internally consistent.
#
# These documents used CRLF before this order; the lines added by PHASE5-001O were written with LF.
# This rewrites each of the four files with CRLF throughout, so the amended document keeps one line
# ending convention. No text content is changed.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$files = @(
  'CRP_LEGACY_LEGAL_CORPUS_ADMISSION_CONTRACT.md',
  'CRP_DIRECT_REPORT_CONTENT_SOURCE_EXPANSION_CONTRACT.md',
  'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md',
  'CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md'
)

foreach ($rel in $files) {
  $path = Join-Path $Root $rel
  $text = [IO.File]::ReadAllText($path)
  $before = $text.Length
  $crlf = ([regex]::Matches($text, "`r`n")).Count
  $lfOnly = ([regex]::Matches($text, "(?<!`r)`n")).Count
  $normalised = $text -replace "`r`n", "`n" -replace "`n", "`r`n"
  [IO.File]::WriteAllText($path, $normalised, (New-Object System.Text.UTF8Encoding($false)))
  "{0}: bytes {1} -> {2}; CRLF before {3}, bare-LF before {4}, bare-LF after 0" -f $rel, $before, (Get-Item $path).Length, $crlf, $lfOnly
}
