#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 .trellis/tasks/<task>" >&2
}

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
  fail "missing task path argument"
fi

TASK_PATH="$1"
REVIEWS_DIR="$TASK_PATH/reviews"
HANDOFF="$REVIEWS_DIR/codex-handoff.md"
OUTPUT="$REVIEWS_DIR/codex-review-1.md"

[[ -d "$TASK_PATH" ]] || fail "task path does not exist: $TASK_PATH"
[[ -f "$HANDOFF" ]] || fail "missing handoff file: $HANDOFF"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not inside a git work tree"
command -v codex >/dev/null 2>&1 || fail "codex CLI not found; install Codex CLI and ensure codex is on PATH"

mkdir -p "$REVIEWS_DIR"

PROMPT=$(cat <<PROMPT_EOF
You are Codex running a local automated review. Review only. Do not modify files, do not commit, do not push, do not merge, and do not rebase.

Read these files if present before reviewing:
- AGENTS.md
- .trellis/workflow.md
- .trellis/spec/
- $TASK_PATH/prd.md
- $TASK_PATH/design.md
- $TASK_PATH/implement.md
- $HANDOFF

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
PROMPT_EOF
)

codex exec "$PROMPT" > "$OUTPUT"

echo "Wrote Codex Review: $OUTPUT"
