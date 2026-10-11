param([int]$Port = 4317)
$ErrorActionPreference = 'Stop'
$url = "http://127.0.0.1:$Port/"
try {
  $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing
  if ($response.StatusCode -eq 200) { Write-Output $url; exit 0 }
} catch { }
$node = (Get-Command node -ErrorAction Stop).Source
$script = Join-Path $PSScriptRoot 'creator-console.cjs'
$root = 'C:\Users\webbd\CREDIT REPORTS\CRP_CREATOR_VIOLATION_TESTS'
New-Item -ItemType Directory -Path $root -Force | Out-Null
$env:CRP_CREATOR_CONSOLE_PORT = [string]$Port
$process = Start-Process -FilePath $node -ArgumentList @($script) -WorkingDirectory 'C:\CRP-NEW' -WindowStyle Hidden -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $root 'creator-console.pid')
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  Start-Sleep -Milliseconds 250
  try {
    $response = Invoke-WebRequest -Uri $url -TimeoutSec 2 -UseBasicParsing
    if ($response.StatusCode -eq 200) { Write-Output $url; exit 0 }
  } catch { }
}
throw "Creator console did not start. Process ID: $($process.Id)"
