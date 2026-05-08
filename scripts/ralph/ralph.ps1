param(
  [int]$MaxIterations = 10,
  [string]$WorkDir,
  [string]$Model = "",
  [ValidateSet("workspace-write", "read-only", "danger-full-access")]
  [string]$Sandbox = "workspace-write",
  [ValidateSet("never", "on-request", "on-failure", "untrusted")]
  [string]$Approval = "never"
)

$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
if (-not $WorkDir) {
  $WorkDir = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
} else {
  $WorkDir = (Resolve-Path $WorkDir).Path
}

$PrdFile = Join-Path $ScriptDir "prd.json"
$PromptFile = Join-Path $ScriptDir "CODEX.md"
$ProgressFile = Join-Path $ScriptDir "progress.txt"
$ArchiveDir = Join-Path $ScriptDir "archive"
$LastBranchFile = Join-Path $ScriptDir ".last-branch"

function Read-Prd {
  if (-not (Test-Path $PrdFile)) {
    throw "Missing $PrdFile. Create it from a PRD first, or copy prd.json.example and edit it."
  }
  return Get-Content -LiteralPath $PrdFile -Raw | ConvertFrom-Json
}

function Initialize-Progress {
  if (-not (Test-Path $ProgressFile)) {
    @(
      "# Ralph Progress Log",
      "Started: $(Get-Date -Format o)",
      "---"
    ) | Set-Content -LiteralPath $ProgressFile -Encoding UTF8
  }
}

function Archive-Previous-Run($CurrentBranch) {
  if (-not (Test-Path $LastBranchFile)) { return }

  $lastBranch = (Get-Content -LiteralPath $LastBranchFile -Raw).Trim()
  if (-not $CurrentBranch -or -not $lastBranch -or $CurrentBranch -eq $lastBranch) { return }

  $folderName = $lastBranch -replace '^ralph/', ''
  $archivePath = Join-Path $ArchiveDir "$(Get-Date -Format yyyy-MM-dd)-$folderName"
  New-Item -ItemType Directory -Force -Path $archivePath | Out-Null

  if (Test-Path $PrdFile) { Copy-Item -LiteralPath $PrdFile -Destination $archivePath -Force }
  if (Test-Path $ProgressFile) { Copy-Item -LiteralPath $ProgressFile -Destination $archivePath -Force }

  @(
    "# Ralph Progress Log",
    "Started: $(Get-Date -Format o)",
    "---"
  ) | Set-Content -LiteralPath $ProgressFile -Encoding UTF8
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  throw "codex CLI is not available on PATH."
}

$prd = Read-Prd
Archive-Previous-Run $prd.branchName
Initialize-Progress

if ($prd.branchName) {
  $prd.branchName | Set-Content -LiteralPath $LastBranchFile -Encoding UTF8
}

$prompt = Get-Content -LiteralPath $PromptFile -Raw

Write-Host "Starting Ralph for Codex - Max iterations: $MaxIterations"
Write-Host "WorkDir: $WorkDir"
Write-Host "Sandbox: $Sandbox, Approval: $Approval"

for ($i = 1; $i -le $MaxIterations; $i++) {
  Write-Host ""
  Write-Host "==============================================================="
  Write-Host "  Ralph Iteration $i of $MaxIterations (codex)"
  Write-Host "==============================================================="

  $codexArgs = @(
    "exec",
    "-C", $WorkDir,
    "--sandbox", $Sandbox,
    "--ask-for-approval", $Approval
  )

  if ($Model) {
    $codexArgs += @("--model", $Model)
  }

  $codexArgs += "-"

  $output = $prompt | & codex @codexArgs 2>&1
  $exitCode = $LASTEXITCODE
  $text = ($output | Out-String)
  Write-Host $text

  if ($text -match "<promise>COMPLETE</promise>") {
    Write-Host ""
    Write-Host "Ralph completed all tasks at iteration $i of $MaxIterations."
    exit 0
  }

  if ($exitCode -ne 0) {
    Write-Warning "Codex exited with code $exitCode. Continuing so the next iteration can inspect progress."
  }

  Write-Host "Iteration $i complete. Continuing..."
  Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Ralph reached max iterations ($MaxIterations) without completion."
Write-Host "Check $ProgressFile for status."
exit 1
