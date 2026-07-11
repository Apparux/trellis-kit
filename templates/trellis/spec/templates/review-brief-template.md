# Review Brief

## Review Artifact

- Pair: `NNN`
- Brief path: `review-brief-NNN.md`
- Raw result path: `codex-review-NNN.jsonl`
- Normalized result path: `codex-review-NNN.md`

The dispatcher injects this numbered brief with `spawn --file` as system-prompt context, then sends the same file through the worker inbox to start the turn and record `SEND_SEQ`. It creates normalized Markdown only after valid ordered Channel events, a send-after worker `done`, an exact final message, and an unchanged full Git-visible/untracked/context snapshot are verified. Raw event authorship uses `by`, not `from`.

## Task

- Task title: `Unknown`
- Task slug: `Unknown`
- Branch/worktree: `Unknown`

## Task Path

`Unknown`

## Implementation Summary

Unknown

## Changed Files

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

## Review Focus

Focus on correctness, requirement coverage, regressions, task/spec alignment, and changed permissions, config, data shape, concurrency, compatibility, or missing tests.

## Git Diff Scope

Type: Local working tree changes

Review only the declared task scope, including staged changes, unstaged changes, and task-related untracked files.

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

Review this implementation and report findings only.

Read this brief first, then inspect only the declared Git Diff Scope and supplied task/spec context.

Do not modify, create, delete, rename, format, or generate project files.
Do not self-fix findings.
Use only read-only Git, search, file-reading, and existing validation commands known not to write project state.
Do not install dependencies or run checks known to write cache/generated state.
Do not commit, checkout, reset, stash, merge, rebase, or push.
Do not run external reviewers or review the entire repository.

Use exactly this top-level structure:

```markdown
# Review Result

## Blocking

## Should Fix

## Nice to Have
```

For each finding include severity, file and line when available, problem, impact, and suggested fix. If there are no findings, say `No findings.`
