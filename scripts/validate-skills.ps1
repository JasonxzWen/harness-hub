param(
  [switch]$SkipExternal
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$QuickValidate = "C:\Users\Admin\.codex\skills\.system\skill-creator\scripts\quick_validate.py"
$QuickValidateAvailable = Test-Path $QuickValidate
$Failures = New-Object System.Collections.Generic.List[string]

function Add-Failure($Message) {
  $Failures.Add($Message) | Out-Null
}

function Get-SkillName($SkillMdPath) {
  $line = Get-Content -LiteralPath $SkillMdPath -TotalCount 12 | Where-Object { $_ -match '^name:\s*' } | Select-Object -First 1
  if (-not $line) { return $null }
  return (($line -replace '^name:\s*', '').Trim().Trim('"').Trim("'"))
}

Push-Location $Root
try {
  $skillRoots = @(".codex\skills", ".agents\skills")
  $skillDirs = @()

  foreach ($root in $skillRoots) {
    if (Test-Path $root) {
      $skillDirs += Get-ChildItem -LiteralPath $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }
    }
  }

  if ($skillDirs.Count -eq 0) {
    Add-Failure "No skills found under .codex/skills or .agents/skills"
  }

  if (-not $QuickValidateAvailable) {
    Write-Warning "quick_validate.py is not available at $QuickValidate; skipping system skill-creator validation."
  }

  foreach ($skill in $skillDirs) {
    $skillMd = Join-Path $skill.FullName "SKILL.md"

    if ($QuickValidateAvailable) {
      $output = & python $QuickValidate $skill.FullName 2>&1
      if ($LASTEXITCODE -ne 0) {
        Add-Failure "quick_validate failed for $($skill.FullName): $($output -join ' ')"
      }
    }

    $agentYaml = Join-Path $skill.FullName "agents\openai.yaml"
    if (-not (Test-Path $agentYaml)) {
      Add-Failure "Missing agents/openai.yaml for $($skill.FullName)"
    }

    foreach ($file in @($skillMd, $agentYaml)) {
      if (Test-Path $file) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
          Add-Failure "UTF-8 BOM found in $file"
        }
      }
    }
  }

  $names = @{}
  foreach ($skill in $skillDirs) {
    $name = Get-SkillName (Join-Path $skill.FullName "SKILL.md")
    if (-not $name) {
      Add-Failure "Missing name in $($skill.FullName)\SKILL.md"
      continue
    }
    if ($names.ContainsKey($name)) {
      Add-Failure "Duplicate skill name '$name' in $($names[$name]) and $($skill.FullName)"
    } else {
      $names[$name] = $skill.FullName
    }
  }

  $claudeOnlyPatterns = @(
    "AskUserQuestion",
    "TodoWrite",
    "Task tool",
    "Skill tool",
    "Read tool",
    "Edit tool",
    "Bash tool",
    "/opsx",
    "claude.ai",
    "Claude.ai",
    "WebFetch"
  )
  $textFiles = Get-ChildItem -Path ".codex\skills", ".agents\skills" -Recurse -File -Include *.md,*.yaml,*.yml,*.json,*.txt -ErrorAction SilentlyContinue
  foreach ($file in $textFiles) {
    $matches = Select-String -LiteralPath $file.FullName -Pattern $claudeOnlyPatterns -SimpleMatch -ErrorAction SilentlyContinue |
      Where-Object { $_.Line -notmatch "Codex adaptation" }
    foreach ($match in $matches) {
      Add-Failure "Claude-only reference in $($file.FullName):$($match.LineNumber): $($match.Line.Trim())"
    }
  }

  $configPath = ".codex\config.toml"
  if (Test-Path $configPath) {
    $tomlOutput = & python -c "import pathlib,tomllib; tomllib.loads(pathlib.Path(r'.codex/config.toml').read_text(encoding='utf-8')); print('config toml ok')" 2>&1
    if ($LASTEXITCODE -ne 0) {
      Add-Failure "config.toml failed TOML parse: $($tomlOutput -join ' ')"
    }
  }

  $yamlOutput = & python -c "import pathlib,yaml; [yaml.safe_load(p.read_text(encoding='utf-8')) for p in list(pathlib.Path('.codex/skills').rglob('openai.yaml')) + list(pathlib.Path('.agents/skills').rglob('openai.yaml'))]; print('openai yaml ok')" 2>&1
  if ($LASTEXITCODE -ne 0) {
    Add-Failure "openai.yaml parse failed: $($yamlOutput -join ' ')"
  }

  if (-not $SkipExternal) {
    if (Get-Command node -ErrorAction SilentlyContinue) {
      $node = & node --version 2>&1
      if ($LASTEXITCODE -ne 0) { Add-Failure "node unavailable: $($node -join ' ')" }
    } else {
      Add-Failure "node unavailable"
    }

    if (Get-Command npx -ErrorAction SilentlyContinue) {
      $npx = & npx --version 2>&1
      if ($LASTEXITCODE -ne 0) { Add-Failure "npx unavailable: $($npx -join ' ')" }
    } else {
      Add-Failure "npx unavailable"
    }

    if (Get-Command openspec -ErrorAction SilentlyContinue) {
      $openspec = & openspec --version 2>&1
      if ($LASTEXITCODE -ne 0) {
        Write-Warning "openspec returned a non-zero exit code: $($openspec -join ' ')"
      }
    } else {
      Write-Warning "openspec is not visible in this shell. It may be installed outside the sandbox/PATH."
    }
  }

  if ($Failures.Count -gt 0) {
    Write-Host "Skill validation failed:" -ForegroundColor Red
    foreach ($failure in $Failures) { Write-Host "- $failure" }
    exit 1
  }

  Write-Host "Skill validation passed for $($skillDirs.Count) skills." -ForegroundColor Green
} finally {
  Pop-Location
}
