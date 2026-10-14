param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Tests = @('play', 'stage2', 'mvp', 'visual', 'quests', 'features', 'growth', 'title', 'games', 'garden'),
  [ValidateRange(1, 3600)][int]$TestTimeoutSeconds = 120,
  [ValidateRange(1024, 65535)][int]$Port = 8742
)

$ErrorActionPreference = 'Stop'
$proj = Split-Path -Parent $PSScriptRoot
$scratch = Join-Path $env:TEMP 'nubi-verify'
$runDir = Join-Path $scratch ([guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$deadline = (Get-Date).AddMinutes(15)
$server = $null
$fail = 0
$sequence = 0

function Stop-OwnedProcessTree($Process) {
  if ($Process -and -not $Process.HasExited) {
    $savedPreference = $ErrorActionPreference
    try {
      # A browser child can exit while taskkill walks the tree. That race must
      # not skip the remaining cleanup or hide the original timeout result.
      $ErrorActionPreference = 'SilentlyContinue'
      & "$env:SystemRoot\System32\taskkill.exe" /PID $Process.Id /T /F 2>$null | Out-Null
      if (-not $Process.WaitForExit(5000)) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        $Process.WaitForExit(5000) | Out-Null
      }
    } finally { $ErrorActionPreference = $savedPreference }
  }
}

function Invoke-BoundedCommand([string]$File, [string[]]$CommandArgs, [int]$TimeoutSeconds) {
  $remaining = [int][math]::Ceiling(($deadline - (Get-Date)).TotalSeconds)
  if ($remaining -le 0) { throw 'Limite total de 15 minutos atingido.' }
  $budget = [math]::Min($TimeoutSeconds, $remaining)
  $script:sequence++
  $stdout = Join-Path $runDir "$sequence.stdout.log"
  $stderr = Join-Path $runDir "$sequence.stderr.log"
  # Start-Process on Windows needs an explicitly quoted argument string.
  $quoted = ($CommandArgs | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }) -join ' '
  $process = New-Object System.Diagnostics.Process
  $process.StartInfo.FileName = $File
  $process.StartInfo.Arguments = $quoted
  $process.StartInfo.WorkingDirectory = $scratch
  $process.StartInfo.UseShellExecute = $false
  $process.StartInfo.CreateNoWindow = $true
  $process.StartInfo.RedirectStandardOutput = $true
  $process.StartInfo.RedirectStandardError = $true
  $process.Start() | Out-Null
  $stdoutTask = $process.StandardOutput.ReadToEndAsync()
  $stderrTask = $process.StandardError.ReadToEndAsync()
  $exitCode = 1
  try {
    if (-not $process.WaitForExit($budget * 1000)) {
      Write-Output "TIMEOUT: $File excedeu ${budget}s; encerrando a arvore de processos."
      $exitCode = 124
    } else {
      $process.WaitForExit()
      $exitCode = $process.ExitCode
    }
  } finally {
    Stop-OwnedProcessTree $process
    $outText = 'Output pipe remained open after the process ended.'
    $errText = 'Error pipe remained open after the process ended.'
    if ($stdoutTask.Wait(5000)) { $outText = $stdoutTask.GetAwaiter().GetResult() }
    if ($stderrTask.Wait(5000)) { $errText = $stderrTask.GetAwaiter().GetResult() }
    [System.IO.File]::WriteAllText($stdout, $outText)
    [System.IO.File]::WriteAllText($stderr, $errText)
    Get-Content -LiteralPath $stdout -Tail 70 -ErrorAction SilentlyContinue
    Get-Content -LiteralPath $stderr -Tail 70 -ErrorAction SilentlyContinue
    $process.Dispose()
  }
  $script:commandExitCode = $exitCode
}

try {
  $node = (Get-Command node.exe -ErrorAction Stop).Source
  Get-ChildItem -LiteralPath (Join-Path $proj 'src') -Recurse -Filter '*.js' | ForEach-Object {
    Invoke-BoundedCommand $node @('--check', $_.FullName) 10
    if ($commandExitCode -ne 0) { $script:fail++; Write-Output "SYNTAX FAIL: $($_.FullName)" }
  }
  Write-Output "syntax failures: $fail"

  if (-not (Test-Path -LiteralPath (Join-Path $scratch 'node_modules\playwright'))) {
    $npmCli = Join-Path (Split-Path -Parent (Get-Command npm.cmd).Source) 'node_modules\npm\bin\npm-cli.js'
    $npxCli = Join-Path (Split-Path -Parent (Get-Command npm.cmd).Source) 'node_modules\npm\bin\npx-cli.js'
    Invoke-BoundedCommand $node @($npmCli, 'init', '-y') 30
    if ($commandExitCode -ne 0) { throw 'npm init falhou.' }
    Invoke-BoundedCommand $node @($npmCli, 'install', 'playwright@1.48.2', '--no-audit', '--no-fund') 180
    if ($commandExitCode -ne 0) { throw 'Instalacao do Playwright falhou ou excedeu o limite.' }
    Invoke-BoundedCommand $node @($npxCli, 'playwright', 'install', 'chromium') 180
    if ($commandExitCode -ne 0) { throw 'Instalacao do Chromium falhou ou excedeu o limite.' }
  }

  $serverExists = $false
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 2
    $serverExists = $response.StatusCode -eq 200
  } catch {}
  if (-not $serverExists) {
    $python = (Get-Command python.exe -ErrorAction Stop).Source
    # Launch the interpreter directly to avoid WindowsApps filesystem redirection.
    $resolvedPython = (& $python -c 'import sys; print(sys.executable)' | Select-Object -Last 1).Trim()
    if (Test-Path -LiteralPath $resolvedPython) { $python = $resolvedPython }
    $server = Start-Process -FilePath $python `
      -ArgumentList "-m http.server $Port --bind 127.0.0.1 --directory `"$proj`"" `
      -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2
    Invoke-WebRequest -Uri "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 3 | Out-Null
  }
  foreach ($testName in $Tests) {
    if ($testName -notmatch '^[a-zA-Z0-9_-]+$') { throw "Nome de teste invalido: $testName" }
    $testPath = Join-Path $scratch "$testName.test.js"
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot "$testName.test.js") -Destination $testPath -Force
    Write-Output "TEST: $testName (limite ${TestTimeoutSeconds}s)"
    Invoke-BoundedCommand $node @($testPath) $TestTimeoutSeconds
    Write-Output "exit: $commandExitCode"
    if ($commandExitCode -ne 0) { $fail++ }
  }
} catch {
  Write-Output "VERIFY ERROR: $($_.Exception.Message)"
  $fail++
} finally {
  # Only stop the server created by this invocation, including its Python child.
  Stop-OwnedProcessTree $server
}

Write-Output "VERIFY RESULT: $fail failure(s); logs: $runDir"
if ($fail -gt 0) { exit 1 }
exit 0
