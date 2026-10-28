$ErrorActionPreference='Stop'
$root='C:\Users\webbd\.codex\worktrees\international-consumer-local\CRP-NEW'
Set-Location -LiteralPath $root
$run='output/implementation/continuation/soak-1793189081391-535a44/result.json'
$intent='output/implementation/continuation/final-regression-intent.json'
$stream=[IO.File]::Open((Join-Path $root $intent),[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::Read)
try {$bytes=[Text.Encoding]::UTF8.GetBytes(([ordered]@{operationId=[guid]::NewGuid().ToString();pid=$PID;createdAt=[DateTime]::UtcNow.ToString('o');scope='LOCAL_ONLY';dependsOn=$run;deploymentAuthorized=$false}|ConvertTo-Json));$stream.Write($bytes,0,$bytes.Length);$stream.Flush($true)} finally {$stream.Dispose()}
$deadline=[DateTime]::UtcNow.AddMinutes(45)
while($true){
 if([DateTime]::UtcNow -gt $deadline){throw 'LOCAL_LOAD_DEPENDENCY_EXPIRED'}
 try {$state=Get-Content -LiteralPath $run -Raw | ConvertFrom-Json} catch {Start-Sleep -Seconds 10;continue}
 if($state.finishedAt){break};Start-Sleep -Seconds 10
}
if(!$state.passed -or $state.durationMs -lt 1800000){throw 'LOCAL_LOAD_DEPENDENCY_FAILED'}
foreach($app in $state.sourceAfter){foreach($file in $app.files){$source=(Get-Content docs/implementation/program.json -Raw|ConvertFrom-Json).sources|Where-Object {$_.app -eq $app.app};if((Get-FileHash -LiteralPath (Join-Path $source.workspace $file.file) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha256){throw 'MEASURED_SOURCE_CHANGED'}}}
node tools/implementation/public-prerequisites.cjs > output/implementation/continuation/public-prerequisites-before-r5.json
if($LASTEXITCODE -ne 0){throw 'PUBLIC_PREREQUISITES_FAILED'}
$env:PG_BIN='C:\CRP-AFFILIATE-OPS\.local\tools\postgresql18\bin'
$env:CRP_FAMILY_CONSUMER_ROOT=$root
$env:CRP_FAMILY_MAIL_ROOT='C:\Users\webbd\.codex\worktrees\international-mail-local\CRP-MAIL-OPS'
$env:CRP_FAMILY_AFFILIATE_ROOT='C:\Users\webbd\.codex\worktrees\international-affiliate-local\CRP-AFFILIATE-OPS'
$family='C:\Users\webbd\.codex\worktrees\international-family-local\CRP-NEW\family-admin'
Set-Location -LiteralPath $family
node --test test/native-sso-acceptance.mjs *> international-native-sso-final.log
if($LASTEXITCODE -ne 0){throw 'FINAL_NATIVE_JOINED_FAILED'}
Set-Location -LiteralPath $root
if(Test-Path -LiteralPath output/implementation/continuation/consumer-full-r5.log){throw 'PRESERVE_EXISTING_FINAL_FULL'}
node accelerated-launch/service/tests/run-tests.cjs --fictional-regression *> output/implementation/continuation/consumer-full-r5.log
$result=$LASTEXITCODE
Copy-Item -LiteralPath accelerated-launch/service/out/current-regression-evidence.json -Destination output/implementation/continuation/consumer-full-r5-evidence.json
[ordered]@{completedAt=[DateTime]::UtcNow.ToString('o');exitCode=$result;deploymentPerformed=$false}|ConvertTo-Json|Set-Content output/implementation/continuation/final-regression-result.json
Get-Content output/implementation/continuation/consumer-full-r5.log -Tail 8
exit $result
