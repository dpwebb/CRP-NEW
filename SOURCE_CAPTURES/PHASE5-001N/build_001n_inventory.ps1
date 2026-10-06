# build_001n_inventory.ps1
# PHASE5-001N producer script: pre-write inventory and composite digest of the workspace.
# Writes SOURCE_CAPTURES\PHASE5-001N\input_inventory.json and .\pre_write_control.txt
# Method mirrors PHASE5-001M input_inventory.json so the two are directly comparable.

$ErrorActionPreference = 'Stop'
$root = 'C:\CRP-NEW'
$outDir = Join-Path $root 'SOURCE_CAPTURES\PHASE5-001N'
$excludePrefix = Join-Path $outDir ''

$files = Get-ChildItem -LiteralPath $root -Recurse -File -Force |
    Where-Object { -not $_.FullName.StartsWith($excludePrefix, [StringComparison]::OrdinalIgnoreCase) } |
    Sort-Object -Property FullName

$rows = @()
foreach ($f in $files) {
    $rows += [pscustomobject]@{
        path   = $f.FullName.Substring($root.Length)
        bytes  = [int64]$f.Length
        sha256 = (Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash
    }
}

$lines = ($rows | ForEach-Object { '{0} {1} {2}' -f $_.sha256, $_.bytes, $_.path }) -join "`n"
$sha = [Security.Cryptography.SHA256]::Create()
$digest = ([BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($lines))) -replace '-', '')

$record = [pscustomobject]@{
    artifact                                 = 'input_inventory.json'
    work_order                               = 'PHASE5-001N'
    created_utc                              = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    purpose                                  = 'pre-write inventory and hash of every workspace file, recorded before any file of this order was written and before any public source was retrieved'
    inventory_scope                          = "all files under the workspace root (recursive, including hidden), this order's new output directory excluded"
    pre_existing_file_count                  = $rows.Count
    pre_existing_total_bytes                 = ($rows | Measure-Object -Property bytes -Sum).Sum
    pre_existing_inventory_sha256            = $digest
    pre_existing_inventory_sha256_definition = "SHA-256 over the LF-joined lines UPPERCASE_SHA256<space>bytes<space>relative_path for every file, relative_path beginning with a backslash, sorted by absolute path; no trailing newline"
    expected_control_from_001m                = 'PHASE5-001M recorded 245 files before its own writes and created 8 files; 245 + 8 = 253 is the expected pre-write file count for this order'
    files                                    = $rows
}

$json = $record | ConvertTo-Json -Depth 6
[IO.File]::WriteAllText((Join-Path $outDir 'input_inventory.json'), $json, (New-Object Text.UTF8Encoding($false)))

"PHASE5-001N pre-write inventory"
"files           = $($rows.Count)"
"bytes           = $(($rows | Measure-Object -Property bytes -Sum).Sum)"
"inventory_sha256= $digest"
