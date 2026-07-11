# Rereview Brief

## Review Artifact

- New pair: `NNN`
- Brief path: `rereview-brief-NNN.md`
- Raw result path: `codex-review-NNN.jsonl`
- Normalized result path: `codex-review-NNN.md`

The dispatcher injects this numbered brief with `spawn --file` as system-prompt context, then sends the same file through the worker inbox to start the turn and record `SEND_SEQ`. It creates normalized Markdown only after valid ordered Channel events, a send-after worker `done`, an exact final message, and an unchanged full Git-visible/untracked/context snapshot are verified. Raw event authorship uses `by`, not `from`.

## Task

- Task title: `Unknown`
- Task slug: `Unknown`
- Branch/worktree: `Unknown`

## Task Path

`Unknown`

## Source Complete Pair

- Pair: `Unknown`
- Markdown path: `Unknown`
- JSONL path: `Unknown`

## Review Fix Summary

- Same source pair: `Unknown`
- Path: `review-fix-summary-NNN.md`

## Fix Summary

Unknown

## Changed Files Since Review Fix

Unknown

## API Changes

None

## DB Changes

None

## Permission / Auth Changes

None

## Config Changes

None

## Checks Performed

Unknown

## Rereview Focus

Verify whether previous findings were fixed, whether fixes introduced regressions, and whether Blocking issues remain.

## Git Diff Scope

Type: Local working tree changes after review fixes

Review only changes related to the original findings and fixes, including staged, unstaged, and task-related untracked files.

Suggested read-only commands:

```bash
git status --short
git diff
git diff --cached
```

Do not review unrelated repository files.

## Known Risks

Unknown

## Review Prompt

Read this brief, the validated source pair, and the same-number fix summary. Report only review findings; do not modify the project.

Focus only on:

1. Whether previous findings were fixed.
2. Whether fixes introduced new issues.
3. Whether Blocking issues remain.
4. Do not repeat Nice to Have findings already confirmed as deferred.
5. Do not repeat issues already marked False Positive.

Do not modify, create, delete, rename, format, or generate project files.
Do not self-fix findings.
Use only read-only Git, search, file-reading, and existing validation commands known not to write project state.
Do not install dependencies or run checks known to write cache/generated state.
Do not commit, checkout, reset, stash, merge, rebase, or push.
Do not run external reviewers or review the entire repository.

Use exactly this output format:

```markdown
# Rereview Result

## Blocking

## Should Fix

## Nice to Have

## Verified Fixed

## False Positive / Not Applicable

## New Risks Introduced

## Final Recommendation
```
