# retrieve_001n_sources.ps1
# PHASE5-001N producer script: bounded public-source retrieval for the six unresolved clusters.
# Saves each returned original under .\retrieved\ and records URL, retrieval time, bytes,
# SHA-256, HTTP status and publisher headers in .\retrieval_ledger.json.
# Only public official / recorded-locator pages named by the catalogue rows are requested.
# No login, purchase, private report, consumer data or external contact is used.

$ErrorActionPreference = 'Continue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = 'C:\CRP-NEW'
$outDir = Join-Path $root 'SOURCE_CAPTURES\PHASE5-001N'
$saveDir = Join-Path $outDir 'retrieved'
New-Item -ItemType Directory -Path $saveDir -Force | Out-Null

$targets = @(
  @{ id = 'R01'; file = 'R01-CA-FCA-credit-report-information.html'; cluster = 'PIPEDA'; purpose = 'recorded locator of CRP-LSRC-0315/0316/0317/0318/0320'; url = 'https://www.canada.ca/en/financial-consumer-agency/services/credit-reports-score/information-credit-report.html' },
  @{ id = 'R02'; file = 'R02-CA-PIPEDA-justice-laws.html';       cluster = 'PIPEDA'; purpose = 'official consolidation of the recorded instrument (PIPEDA, S.C. 2000, c. 5)'; url = 'https://laws-lois.justice.gc.ca/eng/acts/P-8.6/' },
  @{ id = 'R04'; file = 'R04-US-WV-code-55-2-6.html';            cluster = 'WV';     purpose = 'recorded provision of CRP-LSRC-0149/0150'; url = 'https://code.wvlegislature.gov/55-2-6/' },
  @{ id = 'R05'; file = 'R05-US-WV-code-55-2-12.html';           cluster = 'WV';     purpose = 'test route for the 10-year recorded value in CRP-LSRC-0150'; url = 'https://code.wvlegislature.gov/55-2-12/' },
  @{ id = 'R06'; file = 'R06-US-NY-senate-GBS-380-j.html';       cluster = 'NY';     purpose = 'official publisher text of the recorded provision 380-j (New York Senate OpenLegislation)'; url = 'https://www.nysenate.gov/legislation/laws/GBS/380-J' },
  @{ id = 'R07'; file = 'R07-US-NY-public-law-380-j.html';       cluster = 'NY';     purpose = 'recorded locator of CRP-LSRC-0165/0166'; url = 'https://newyork.public.law/laws/n.y._general_business_law_section_380-j' },
  @{ id = 'R08'; file = 'R08-UK-CRAIN-data-retention-periods.html'; cluster = 'CRAIN'; purpose = 'recorded locator of CRP-LSRC-0409/0411'; url = 'https://www.experian.co.uk/legal/crain/data-retention-periods' },
  @{ id = 'R09'; file = 'R09-CA-NS-consumer-reporting-act.pdf';  cluster = 'NS';     purpose = 'recorded locator of CRP-LSRC-0336/0349'; url = 'https://nslegislature.ca/sites/default/files/legc/statutes/consumer%20reporting.pdf' },
  @{ id = 'R10'; file = 'R10-CA-ON-consumer-reporting-act-90c33.html'; cluster = 'ON'; purpose = 'recorded locator of CRP-LSRC-0337/0351'; url = 'https://www.ontario.ca/laws/statute/90c33' }
)

$ledger = @()
foreach ($t in $targets) {
    $dest = Join-Path $saveDir $t.file
    $entry = [ordered]@{
        retrieval_id      = $t.id
        cluster           = $t.cluster
        purpose           = $t.purpose
        url_requested     = $t.url
        retrieved_at_utc  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
        saved_as          = "SOURCE_CAPTURES\PHASE5-001N\retrieved\$($t.file)"
        http_status       = $null
        response_headers  = $null
        bytes             = $null
        sha256            = $null
        outcome           = 'NOT_RETRIEVED'
        error             = $null
    }
    try {
        $resp = Invoke-WebRequest -Uri $t.url -OutFile $dest -UseBasicParsing -TimeoutSec 90 `
                 -Headers @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CRP-PHASE5-001N-evidence-capture' } -PassThru
        $entry.http_status = [int]$resp.StatusCode
        $entry.response_headers = [ordered]@{
            content_type           = [string]$resp.Headers['Content-Type']
            last_modified          = [string]$resp.Headers['Last-Modified']
            etag                   = [string]$resp.Headers['ETag']
            content_length_header  = [string]$resp.Headers['Content-Length']
            x_robots_tag           = [string]$resp.Headers['X-Robots-Tag']
        }
        $fi = Get-Item -LiteralPath $dest
        $entry.bytes  = [int64]$fi.Length
        $entry.sha256 = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
        $entry.outcome = 'RETRIEVED'
    } catch {
        $entry.error = $_.Exception.Message
        if ($_.Exception.Response) { $entry.http_status = [int]$_.Exception.Response.StatusCode }
        if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
    }
    $ledger += [pscustomobject]$entry
    "{0} {1} -> {2} ({3} bytes)" -f $t.id, $t.outcome, $t.url, $entry.bytes
}

$json = $ledger | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $outDir 'retrieval_ledger.json'), $json, (New-Object Text.UTF8Encoding($false)))
'done'
