$ErrorActionPreference = "Continue"
$proj = "C:\Users\joaos\.kiro\crew\workspace\nubi-casa-magica"
$scratch = Join-Path $env:TEMP "nubi-verify"
New-Item -ItemType Directory -Force -Path $scratch | Out-Null

# 1) sintaxe de todos os módulos
$fail = 0
Get-ChildItem -Path (Join-Path $proj "src") -Recurse -Filter *.js | ForEach-Object {
  $out = & node --check $_.FullName 2>&1
  if ($LASTEXITCODE -ne 0) { $fail++; Write-Output "SYNTAX FAIL $($_.FullName)"; Write-Output $out }
}
Write-Output "syntax failures: $fail"

# 2) playwright no scratch
if (-not (Test-Path (Join-Path $scratch "node_modules\playwright"))) {
  Push-Location $scratch
  & npm init -y 2>&1 | Out-Null
  & npm install playwright@1.48.2 --no-audit --no-fund 2>&1 | Select-Object -Last 3
  & npx playwright install chromium 2>&1 | Select-Object -Last 3
  Pop-Location
}

# 3) servidor estático local (127.0.0.1 apenas)
$srv = Start-Process -FilePath python -ArgumentList "-m","http.server","8742","--bind","127.0.0.1","--directory",$proj -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

# 4) testes (copiados para o scratch, onde está o node_modules)
$tests = $args
if (-not $tests -or $tests.Count -eq 0) { $tests = @("play","stage2","mvp","visual","quests") }
foreach ($t in $tests) {
  Copy-Item (Join-Path $proj "test\$t.test.js") (Join-Path $scratch "$t.test.js") -Force
  Push-Location $scratch
  Write-Output "===== $t ====="
  & node "$t.test.js" 2>&1 | Select-Object -Last 25
  Write-Output "exit: $LASTEXITCODE"
  Pop-Location
}

Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue
