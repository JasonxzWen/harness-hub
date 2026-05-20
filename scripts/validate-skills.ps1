param(
  [switch]$SkipExternal
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
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
  $skillRoots = @("skills")
  $skillDirs = @()

  foreach ($root in $skillRoots) {
    if (Test-Path $root) {
      $skillDirs += Get-ChildItem -LiteralPath $root -Directory | Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") }
    }
  }

  if ($skillDirs.Count -eq 0) {
    Add-Failure "No skills found under skills/"
  }

  foreach ($skill in $skillDirs) {
    $skillMd = Join-Path $skill.FullName "SKILL.md"

    $head = Get-Content -LiteralPath $skillMd -TotalCount 1
    if ($head -ne "---") {
      Add-Failure "Missing YAML frontmatter in $skillMd"
    }

    foreach ($file in @($skillMd)) {
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

  $platformSpecificPatterns = @(
    "AskUserQuestion",
    "TodoWrite",
    "Task tool",
    "Skill tool",
    "Read tool",
    "Edit tool",
    "Bash tool",
    "/opsx",
    ".codex",
    "agents/openai.yaml",
    "openai.yaml",
    "Codex adaptation",
    "Codex native",
    "Codex-specific",
    "claude.ai",
    "Claude.ai",
    "WebFetch"
  )
  $textFiles = Get-ChildItem -Path "skills" -Recurse -File -Include *.md,*.yaml,*.yml,*.json,*.txt -ErrorAction SilentlyContinue
  foreach ($file in $textFiles) {
    $matches = Select-String -LiteralPath $file.FullName -Pattern $platformSpecificPatterns -SimpleMatch -ErrorAction SilentlyContinue
    foreach ($match in $matches) {
      Add-Failure "Platform-specific reference in $($file.FullName):$($match.LineNumber): $($match.Line.Trim())"
    }
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
