# fix_001o_blank_lines.ps1 — restore a blank line before each paragraph this order inserted, so no
# inserted paragraph is merged into the text above it when the document is rendered. Content is unchanged
# apart from the added blank lines; line endings are written back exactly as the document had them.

$ErrorActionPreference = 'Stop'
$Root = 'C:\CRP-NEW'
$targets = @(
  @{ file = 'CRP_GOVERNED_LEGAL_CORPUS_CONTRACT.md'; markers = @('**Owner directive PHASE5-001O:**', 'For a certified-baseline record, acceptance is governed', 'Source-record counts and unique legal-rule counts are administrative') },
  @{ file = 'CRP_LEGACY_JURISDICTION_SOURCE_NORMALIZATION_CONTRACT.md'; markers = @('Under owner directive PHASE5-001O these two items') }
)

foreach ($t in $targets) {
  $path = Join-Path $Root $t.file
  $text = [IO.File]::ReadAllText($path)
  $crlf = $text -match "`r`n"
  $lines = [System.Collections.Generic.List[string]](($text -split "`r?`n"))
  $inserted = 0
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    foreach ($m in $t.markers) {
      if ($lines[$i].StartsWith($m)) {
        if ($i -gt 0 -and $lines[$i - 1].Trim() -ne '') {
          $lines.Insert($i, '')
          $inserted += 1
        }
      }
    }
  }
  $sep = if ($crlf) { "`r`n" } else { "`n" }
  [IO.File]::WriteAllText($path, ($lines -join $sep), (New-Object System.Text.UTF8Encoding($false)))
  "{0}: blank lines inserted = {1}" -f $t.file, $inserted
}
