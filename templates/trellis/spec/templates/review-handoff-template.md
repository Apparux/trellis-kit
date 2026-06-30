# Review Handoff

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

## Database Changes

无

## Permission / Data Scope Changes

无

## Configuration Changes

无

## Checks Performed

无

## Known Limitations / Risks

无

## Review Focus

Describe special review focus areas such as permissions, security, migrations, concurrency, or compatibility. If there are no special focus areas, write `无`.

## Review Scope

Type: Local working tree changes

Review the local working tree changes in the current project/worktree.

Include:

- staged changes
- unstaged changes
- newly added untracked files related to this task

Suggested commands:

```bash
git status --short
git diff
git diff --cached
```

Notes:

- Do not review the entire repository.
- Do not rely only on `git diff`, because staged changes and untracked files may be missed.
- Inspect untracked task-related files shown by `git status --short`.

## Suggested Review Prompt

Please review this implementation as a code reviewer.

Read this handoff first, then inspect only the declared Review Scope.

Review the local working tree changes in the current project/worktree, including:

- staged changes
- unstaged changes
- newly added untracked files related to this task

Suggested commands:

```bash
git status --short
git diff
git diff --cached
```

Do not modify code.
Do not commit.
Do not run external reviewers.
Do not review the entire repository.
Report findings as P0/P1/P2.

For each finding, include:

- Severity
- File path
- Problem
- Impact
- Suggested fix

If there are no findings, say: No findings.
