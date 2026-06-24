# Codex Review Handoff

## Task

- Task path: `无`
- Task title: `无`
- Branch/worktree: `无`

## Implementation Summary

无

## Changed Files

无

## API Changes

无

## Database / Permission / Config Changes

无

## Checks Run

无

## Review Focus

Ask Codex to focus on correctness, safety, regressions, tests, and whether the implementation satisfies the task PRD/design/implement artifacts. If there are no special focus areas, write `无`.

## Git Diff Scope

Default review scope:

```bash
git diff HEAD~1..HEAD
```

If the implementation used multiple local commits, record the exact diff range here before running Codex Review.

## Codex Review Prompt

You are the reviewer only. Do not modify code, do not commit, do not push, do not merge, and do not rebase.

Read the project instructions and task context before reviewing:

1. `AGENTS.md` if present.
2. `.trellis/workflow.md` if present.
3. The active task `prd.md`, `design.md` if present, and `implement.md` if present.
4. Relevant files under `.trellis/spec/`.
5. This handoff file.

Review the current implementation diff:

```bash
git diff HEAD~1..HEAD
```

Output in this structure:

```md
# Codex Review Result

## Verdict

PASS or FAIL

## P0 Issues

- None, or blocking correctness/security/data-loss issues.

## P1 Issues

- None, or must-fix issues before finish-work.

## P2 Issues

- None, or non-blocking suggestions.

## Passing Checks

- What looks correct.

## Fix Prompt for Claude Code

A concise prompt that asks Claude Code to fix only P0/P1 issues by default.
```
