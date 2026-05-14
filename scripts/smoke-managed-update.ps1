Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [int]$ExpectedExitCode = 0
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  if ($exitCode -ne $ExpectedExitCode) {
    throw "Command failed with exit code $exitCode, expected ${ExpectedExitCode}: $FilePath $($Arguments -join ' ')`n$output"
  }
  return ($output -join "`n")
}

function Invoke-SkillHub {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [int]$ExpectedExitCode = 0
  )

  $allArguments = @("bin\skill-hub.mjs") + $Arguments
  return Invoke-CheckedCommand -FilePath "node" -Arguments $allArguments -ExpectedExitCode $ExpectedExitCode
}

function Read-Lock {
  param([Parameter(Mandatory = $true)][string]$TargetDir)
  return Get-Content -LiteralPath (Join-Path $TargetDir ".skill-hub\lock.json") -Raw | ConvertFrom-Json
}

function Write-Lock {
  param(
    [Parameter(Mandatory = $true)][string]$TargetDir,
    [Parameter(Mandatory = $true)]$Lock
  )
  $json = $Lock | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText(
    (Join-Path $TargetDir ".skill-hub\lock.json"),
    "$json`n",
    [System.Text.UTF8Encoding]::new($false)
  )
}

function Set-ComponentStale {
  param(
    [Parameter(Mandatory = $true)][string]$TargetDir,
    [Parameter(Mandatory = $true)][string[]]$ComponentIds
  )

  $lock = Read-Lock -TargetDir $TargetDir
  foreach ($componentId in $ComponentIds) {
    $component = @($lock.components | Where-Object { $_.id -eq $componentId })[0]
    if ($null -eq $component) {
      throw "Missing component in lock: $componentId"
    }
    $component.version = "0.0.0"
  }
  Write-Lock -TargetDir $TargetDir -Lock $lock
}

function Convert-ToSchemaOneLock {
  param([Parameter(Mandatory = $true)][string]$TargetDir)

  $lock = Read-Lock -TargetDir $TargetDir
  $schemaOneComponents = @()
  foreach ($component in $lock.components) {
    if ($component.id -eq "skill:grill-me") {
      $schemaOneComponents += [pscustomobject]@{
        id = $component.id
        version = $component.version
        agent = $component.agent
        dest = $component.dest
        status = $component.status
      }
    }
  }
  $schemaOneLock = [pscustomobject]@{
    schemaVersion = 1
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    hubVersion = $lock.hubVersion
    profile = $lock.profile
    agents = $lock.agents
    components = $schemaOneComponents
  }
  Write-Lock -TargetDir $TargetDir -Lock $schemaOneLock
}

function Assert-HasUpdate {
  param(
    [Parameter(Mandatory = $true)]$Report,
    [Parameter(Mandatory = $true)][string]$ComponentId
  )
  $match = @($Report.updates | Where-Object { $_.id -eq $ComponentId })
  if ($match.Count -eq 0) {
    throw "Expected update report to include $ComponentId"
  }
}

function New-Target {
  param([Parameter(Mandatory = $true)][string]$Root)
  $path = Join-Path $Root ([guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $path | Out-Null
  return $path
}

$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("skill-hub-managed-update-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
  Invoke-CheckedCommand -FilePath "bun" -Arguments @("run", "build") | Out-Null

  $target = New-Target -Root $tempRoot
  Invoke-SkillHub -Arguments @("install", $target, "--profile", "minimal", "--agent", "codex", "--yes", "--json") | Out-Null
  Set-ComponentStale -TargetDir $target -ComponentIds @("skill:grill-me")
  $status = Invoke-SkillHub -Arguments @("status", $target, "--json") | ConvertFrom-Json
  Assert-HasUpdate -Report $status -ComponentId "skill:grill-me"
  $preview = Invoke-SkillHub -Arguments @("update", $target, "--dry-run", "--json") | ConvertFrom-Json
  Assert-HasUpdate -Report $preview -ComponentId "skill:grill-me"
  $updated = Invoke-SkillHub -Arguments @("update", $target, "--yes", "--json") | ConvertFrom-Json
  if (@($updated.updated | Where-Object { $_.id -eq "skill:grill-me" }).Count -ne 1) {
    throw "Expected confirmed update to update skill:grill-me"
  }

  $selectedTarget = New-Target -Root $tempRoot
  Invoke-SkillHub -Arguments @("install", $selectedTarget, "--profile", "minimal", "--agent", "codex", "--yes", "--json") | Out-Null
  Set-ComponentStale -TargetDir $selectedTarget -ComponentIds @("skill:grill-me", "skill:diagnose")
  $selected = Invoke-SkillHub -Arguments @("update", $selectedTarget, "--component", "skill:grill-me", "--yes", "--json") | ConvertFrom-Json
  if (@($selected.updated | Where-Object { $_.id -eq "skill:grill-me" }).Count -ne 1) {
    throw "Expected selected update to update only skill:grill-me"
  }
  $selectedLock = Read-Lock -TargetDir $selectedTarget
  $diagnose = @($selectedLock.components | Where-Object { $_.id -eq "skill:diagnose" })[0]
  if ($diagnose.version -ne "0.0.0") {
    throw "Expected unselected skill:diagnose to remain stale"
  }

  $forceTarget = New-Target -Root $tempRoot
  Invoke-SkillHub -Arguments @("install", $forceTarget, "--profile", "minimal", "--agent", "codex", "--yes", "--json") | Out-Null
  Set-ComponentStale -TargetDir $forceTarget -ComponentIds @("skill:grill-me")
  Add-Content -LiteralPath (Join-Path $forceTarget ".agents\skills\grill-me\SKILL.md") -Value "modified"
  Invoke-SkillHub -Arguments @("update", $forceTarget, "--yes", "--json") -ExpectedExitCode 3 | Out-Null
  $forced = Invoke-SkillHub -Arguments @("update", $forceTarget, "--force", "--yes", "--json") | ConvertFrom-Json
  if (@($forced.forced | Where-Object { $_.id -eq "skill:grill-me" }).Count -ne 1) {
    throw "Expected force update to report skill:grill-me"
  }

  $migrationTarget = New-Target -Root $tempRoot
  Invoke-SkillHub -Arguments @("install", $migrationTarget, "--profile", "minimal", "--agent", "codex", "--yes", "--json") | Out-Null
  Convert-ToSchemaOneLock -TargetDir $migrationTarget
  $migration = Invoke-SkillHub -Arguments @("migrate-lock", $migrationTarget, "--yes", "--json") | ConvertFrom-Json
  if ($migration.lock.data.schemaVersion -ne 2) {
    throw "Expected migrate-lock to write schema version 2"
  }
  Invoke-SkillHub -Arguments @("remove", $migrationTarget, "--yes", "--json") | Out-Null

  $divergentTarget = New-Target -Root $tempRoot
  Invoke-SkillHub -Arguments @("install", $divergentTarget, "--profile", "minimal", "--agent", "codex", "--yes", "--json") | Out-Null
  Convert-ToSchemaOneLock -TargetDir $divergentTarget
  Add-Content -LiteralPath (Join-Path $divergentTarget ".agents\skills\grill-me\SKILL.md") -Value "divergent"
  Invoke-SkillHub -Arguments @("migrate-lock", $divergentTarget, "--yes", "--json") -ExpectedExitCode 3 | Out-Null

  Write-Host "Managed update smoke passed."
} finally {
  $resolvedTempRoot = [IO.Path]::GetFullPath($tempRoot)
  $systemTemp = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTempRoot.StartsWith($systemTemp, [StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $resolvedTempRoot)) {
    Remove-Item -LiteralPath $resolvedTempRoot -Recurse -Force
  }
}
