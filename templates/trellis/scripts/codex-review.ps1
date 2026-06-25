#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Show-Usage {
  [Console]::Error.WriteLine("Usage: .trellis/spec/scripts/codex-review.ps1 .trellis/tasks/<task>")
}

function Fail {
  param([Parameter(Mandatory = $true)][string]$Message)
  [Console]::Error.WriteLine("ERROR: $Message")
  exit 1
}

if ($args.Count -lt 1) {
  Show-Usage
  Fail "missing task path argument"
}

$TaskPath = $args[0]
$ReviewsDir = Join-Path $TaskPath "reviews"
$Handoff = Join-Path $ReviewsDir "codex-handoff.md"
$Output = Join-Path $ReviewsDir "codex-review-1.md"

if (-not (Test-Path -LiteralPath $TaskPath -PathType Container)) {
  Fail "task path does not exist: $TaskPath"
}

if (-not (Test-Path -LiteralPath $Handoff -PathType Leaf)) {
  Fail "missing handoff file: $Handoff"
}

& git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "not inside a git work tree"
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
  Fail "codex CLI not found; install Codex CLI and ensure codex is on PATH"
}

New-Item -ItemType Directory -Force -Path $ReviewsDir | Out-Null

$Prompt = @"
You are Codex running a local automated review. Review only. Do not modify files, do not commit, do not push, do not merge, and do not rebase.

Read these files if present before reviewing:
- AGENTS.md
- .trellis/workflow.md
- .trellis/spec/
- $TaskPath/prd.md
- $TaskPath/design.md
- $TaskPath/implement.md
- $Handoff

Review the implementation diff:

  git diff HEAD~1..HEAD

Use the handoff Git Diff Scope if it specifies a more precise range.

Focus on:
- task acceptance criteria
- correctness and regressions
- security, permissions, privacy, and data-loss risks
- missing or misleading validation
- whether checks claimed in the handoff are supported

Output exactly this structure:

# Codex Review Result

## Verdict

PASS or FAIL

## P0 Issues

Blocking correctness/security/data-loss/build issues, or None.

## P1 Issues

Must-fix issues before finish-work, or None.

## P2 Issues

Non-blocking suggestions, or None.

## Passing Checks

What looks correct.

## Fix Prompt for Claude Code

A concise prompt asking Claude Code to fix only P0/P1 issues by default.
"@

$CodexOutput = & codex exec $Prompt
$CodexExitCode = $LASTEXITCODE
$CodexOutput | Out-File -LiteralPath $Output -Encoding utf8

if ($CodexExitCode -ne 0) {
  exit $CodexExitCode
}

Write-Output "Wrote Codex Review: $Output"
