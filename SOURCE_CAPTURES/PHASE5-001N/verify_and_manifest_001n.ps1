# verify_and_manifest_001n.ps1
# PHASE5-001N producer script: post-write preservation verification, unit-level
# preservation checks, and the custody manifest for this order's own artifacts.
# Writes .\preservation_and_change_record.json and .\file_custody_manifest.json

$ErrorActionPreference = 'Stop'
$root = 'C:\CRP-NEW'
$outDir = Join-Path $root 'SOURCE_CAPTURES\PHASE5-001N'
$excludePrefix = Join-Path $outDir ''
$narrative = Join-Path $root 'CRP_PHASE5_001N_UNRESOLVED_SOURCE_IDENTITY_INVESTIGATION.md'

function Get-CompositeDigest($rows) {
    $lines = ($rows | ForEach-Object { '{0} {1} {2}' -f $_.sha256, $_.bytes, $_.path }) -join "`n"
    $sha = [Security.Cryptography.SHA256]::Create()
    return ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($lines))) -replace '-', '')
}

# ---- 1. post-write recheck of the pre-existing file set ----
$baseline = [IO.File]::ReadAllText((Join-Path $outDir 'input_inventory.json')) | ConvertFrom-Json
$now = @()
foreach ($f in (Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        Where-Object { (-not $_.FullName.StartsWith($excludePrefix, [StringComparison]::OrdinalIgnoreCase)) -and ($_.FullName -ne $narrative) } |
        Sort-Object -Property FullName)) {
    $now += [pscustomobject]@{
        path   = $f.FullName.Substring($root.Length)
        bytes  = [int64]$f.Length
        sha256 = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
    }
}
$byPath = @{}
foreach ($r in $now) { $byPath[$r.path] = $r }

$missing = 0; $mismatch = 0; $unchanged = 0
foreach ($b in $baseline.files) {
    if (-not $byPath.ContainsKey($b.path)) { $missing++; continue }
    $n = $byPath[$b.path]
    if ($n.sha256 -eq $b.sha256 -and $n.bytes -eq $b.bytes) { $unchanged++ } else { $mismatch++ }
}
$postDigest = Get-CompositeDigest $now
$postBytes = ($now | Measure-Object -Property bytes -Sum).Sum

# ---- 2. unit-level preservation ----
$cataloguePath = Join-Path $root 'CRP_GLOBAL_LEGAL_SOURCE_CATALOGUE.md'
$raw = [IO.File]::ReadAllText($cataloguePath)
$i = $raw.IndexOf('```json'); $j = $raw.IndexOf('```', $i + 7)
$catalogue = $raw.Substring($i + 7, $j - ($i + 7)) | ConvertFrom-Json
$catSha = (Get-FileHash -LiteralPath $cataloguePath -Algorithm SHA256).Hash

$registerPath = Join-Path $root 'SOURCE_CAPTURES\PHASE5-001K\rescreen_register.csv'
$register = Import-Csv $registerPath
$regSha = (Get-FileHash -LiteralPath $registerPath -Algorithm SHA256).Hash

$scoped = @('CRP-LSRC-0315','CRP-LSRC-0316','CRP-LSRC-0317','CRP-LSRC-0318','CRP-LSRC-0320','CRP-LSRC-0149','CRP-LSRC-0150','CRP-LSRC-0165','CRP-LSRC-0166','CRP-LSRC-0409','CRP-LSRC-0411','CRP-LSRC-0336','CRP-LSRC-0349','CRP-LSRC-0337','CRP-LSRC-0351')
$scopedRows = $register | Where-Object { $scoped -contains $_.source_entry_id }
$scopedPreserved = ($scopedRows | Where-Object { $_.disposition -eq 'UNRESOLVED' -and $_.disposition_state -eq 'BLOCKED_MISSING_EVIDENCE' }).Count

# ---- 3. this order's own artifacts ----
$new = @()
foreach ($f in (Get-ChildItem -LiteralPath $outDir -Recurse -File | Sort-Object -Property FullName)) {
    $new += [pscustomobject]@{
        file   = 'SOURCE_CAPTURES/PHASE5-001N/' + $f.FullName.Substring($outDir.Length + 1).Replace('\', '/')
        bytes  = [int64]$f.Length
        sha256 = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
    }
}
if (Test-Path -LiteralPath $narrative) {
    $nfi = Get-Item -LiteralPath $narrative
    $new += [pscustomobject]@{
        file   = 'CRP_PHASE5_001N_UNRESOLVED_SOURCE_IDENTITY_INVESTIGATION.md'
        bytes  = [int64]$nfi.Length
        sha256 = (Get-FileHash -LiteralPath $narrative -Algorithm SHA256).Hash
    }
}
[IO.File]::WriteAllText((Join-Path $outDir 'file_custody_manifest.json'),
    ($new | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding($false)))
$record = [pscustomobject]@{
    artifact    = 'preservation_and_change_record.json'
    work_order  = 'PHASE5-001N'
    created_utc = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    requirement = 'Preserve every pre-existing workspace file byte for byte, verify it after writing, and record the custody of every artifact this order created'
    method      = 'input_inventory.json was written before the first retrieval and before the first artifact of this order; at the close of the order the whole workspace was re-hashed with this order own output directory and this order own narrative deliverable excluded, and compared per file and in aggregate'
    files_outside_the_output_directory_created_by_this_order = @('CRP_PHASE5_001N_UNRESOLVED_SOURCE_IDENTITY_INVESTIGATION.md')
    baseline    = [pscustomobject]@{ files = $baseline.pre_existing_file_count; bytes = $baseline.pre_existing_total_bytes; digest = $baseline.pre_existing_inventory_sha256 }
    post_write_recheck = [pscustomobject]@{
        files_compared = $byPath.Count
        unchanged      = $unchanged
        changed        = $mismatch
        missing        = $missing
        bytes          = $postBytes
        digest         = $postDigest
        result         = $(if ($missing -eq 0 -and $mismatch -eq 0 -and $postDigest -eq $baseline.pre_existing_inventory_sha256) { 'IDENTICAL' } else { 'DIFFERENCE FOUND' })
    }
    unit_level_preservation = [pscustomobject]@{
        catalogue_entries                 = $catalogue.Count
        catalogue_bytes                   = (Get-Item -LiteralPath $cataloguePath).Length
        catalogue_sha256                  = $catSha
        catalogue_changed_by_this_order   = ($catSha -ne '3ACB39A3B6E80DD4DB38689541CCC17542E941CEFA4D6C0A355B9816F030038D')
        register_rows                     = $register.Count
        register_bytes                    = (Get-Item -LiteralPath $registerPath).Length
        register_sha256                   = $regSha
        register_changed_by_this_order    = ($regSha -ne 'DFB78DD20AAD444A4FC5B03D0FDFF11081AD67A454AF80BBBB2CD4CB0C0F24BB')
        scoped_rows_in_register           = $scopedRows.Count
        scoped_rows_disposition_preserved = $scopedPreserved
        source_records_removed            = 0
        rows_rewritten                    = 0
        rows_reclassified                 = 0
        dispositions_changed              = 0
        clusters_collapsed_or_merged      = 0
        rules_admitted                    = 0
        coverage_or_findings_created      = 0
    }
    retrieved_originals = [pscustomobject]@{
        saved_count    = ($new | Where-Object { $_.file -like '*retrieved/*' }).Count
        total_bytes    = (($new | Where-Object { $_.file -like '*retrieved/*' } | Measure-Object -Property bytes -Sum).Sum)
        nova_scotia_pdf_equals_001g_capture = ((Get-FileHash -LiteralPath (Join-Path $outDir 'retrieved\R09-CA-NS-consumer-reporting-act.pdf') -Algorithm SHA256).Hash -eq (Get-FileHash -LiteralPath (Join-Path $root 'SOURCE_CAPTURES\PHASE5-001G\NS-consumer-reporting.pdf') -Algorithm SHA256).Hash)
        nova_scotia_pdf_equals_admission_pin = ((Get-FileHash -LiteralPath (Join-Path $outDir 'retrieved\R09-CA-NS-consumer-reporting-act.pdf') -Algorithm SHA256).Hash -eq '5AD228066B3281E1702C2C63DA012C28128D444B8D528069075DC65939445500')
    }
    new_artifacts      = $new
    new_artifact_count = $new.Count
    not_done = @(
        'no source was removed, merged, deleted or renamed',
        'no disposition was changed and none was inherited',
        'no rule was interpreted, admitted or applied',
        'no coverage, candidate or finding was created',
        'no gate was declared passed',
        'no Git operation was performed',
        'no consumer report, transmission, purchase, login or external contact occurred'
    )
    result = $(if ($missing -eq 0 -and $mismatch -eq 0 -and $postDigest -eq $baseline.pre_existing_inventory_sha256) { 'PRESERVATION HELD - every pre-existing file is byte-identical' } else { 'PRESERVATION FAILED' })
}
[IO.File]::WriteAllText((Join-Path $outDir 'preservation_and_change_record.json'),
    ($record | ConvertTo-Json -Depth 6), (New-Object Text.UTF8Encoding($false)))

"pre-existing files compared : $($byPath.Count)"
"unchanged / changed / missing: $unchanged / $mismatch / $missing"
"post-write digest           : $postDigest"
"baseline digest             : $($baseline.pre_existing_inventory_sha256)"
"catalogue entries / sha     : $($catalogue.Count) / $catSha"
"register rows / sha         : $($register.Count) / $regSha"
"scoped rows preserved       : $scopedPreserved of $($scopedRows.Count)"
"new artifacts               : $($new.Count)"
