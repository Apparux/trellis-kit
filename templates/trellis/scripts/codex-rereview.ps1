#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Show-Usage {
  [Console]::Error.WriteLine("Usage: .trellis/spec/scripts/codex-rereview.ps1 .trellis/tasks/<task>")
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
$FirstReview = Join-Path $ReviewsDir "codex-review-1.md"
$FixNotes = Join-Path $ReviewsDir "claude-fix-notes.md"
$Output = Join-Path $ReviewsDir "codex-review-2.md"

if (-not (Test-Path -LiteralPath $TaskPath -PathType Container)) {
  Fail "task path does not exist: $TaskPath"
}

if (-not (Test-Path -LiteralPath $FirstReview -PathType Leaf)) {
  Fail "missing first review file: $FirstReview"
}

if (-not (Test-Path -LiteralPath $FixNotes -PathType Leaf)) {
  Fail "missing fix notes file: $FixNotes"
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
You are Codex running a local automated re-review. Re-review only. Do not modify files, do not commit, do not push, do not merge, and do not rebase.

Read these files if present:
- AGENTS.md
- .trellis/workflow.md
- .trellis/spec/
- $TaskPath/prd.md
- $TaskPath/design.md
- $TaskPath/implement.md
- $FirstReview
- $FixNotes

Re-review only the fix state. Focus on:
- whether previous P0 issues from codex-review-1.md were fixed
- whether previous P1 issues from codex-review-1.md were fixed
- whether the fixes introduced new P0/P1 blocking issues

Do not introduce broad new refactor requests. Do not expand scope beyond P0/P1 verification and new blockers.

Output exactly this structure:

# Codex Re-Review Result

## Verdict

PASS or FAIL

## Fixed P0/P1 Issues

What was fixed, or None.

## Remaining P0 Issues

Remaining blocking issues, or None.

## Remaining P1 Issues

Remaining must-fix issues, or None.

## New Blocking Issues

New P0/P1 issues introduced by the fixes, or None.

## Final Notes

Brief notes for Claude Code.
"@

$CodexOutput = & codex exec $Prompt
$CodexExitCode = $LASTEXITCODE
$CodexOutput | Out-File -LiteralPath $Output -Encoding utf8

if ($CodexExitCode -ne 0) {
  exit $CodexExitCode
}

Write-Output "Wrote Codex Re-Review: $Output"
