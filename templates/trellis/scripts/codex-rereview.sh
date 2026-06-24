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
FIRST_REVIEW="$REVIEWS_DIR/codex-review-1.md"
FIX_NOTES="$REVIEWS_DIR/claude-fix-notes.md"
OUTPUT="$REVIEWS_DIR/codex-review-2.md"

[[ -d "$TASK_PATH" ]] || fail "task path does not exist: $TASK_PATH"
[[ -f "$FIRST_REVIEW" ]] || fail "missing first review file: $FIRST_REVIEW"
[[ -f "$FIX_NOTES" ]] || fail "missing fix notes file: $FIX_NOTES"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "not inside a git work tree"
command -v codex >/dev/null 2>&1 || fail "codex CLI not found; install Codex CLI and ensure codex is on PATH"

mkdir -p "$REVIEWS_DIR"

PROMPT=$(cat <<PROMPT_EOF
You are Codex running a local automated re-review. Re-review only. Do not modify files, do not commit, do not push, do not merge, and do not rebase.

Read these files if present:
- AGENTS.md
- .trellis/workflow.md
- .trellis/spec/
- $TASK_PATH/prd.md
- $TASK_PATH/design.md
- $TASK_PATH/implement.md
- $FIRST_REVIEW
- $FIX_NOTES

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
PROMPT_EOF
)

codex exec "$PROMPT" > "$OUTPUT"

echo "Wrote Codex Re-Review: $OUTPUT"
