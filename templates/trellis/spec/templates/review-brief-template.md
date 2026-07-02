# Review Brief

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

Focus on correctness, requirement coverage, regressions, task/spec alignment, and any changed permissions, config, data shape, concurrency, or compatibility behavior.

## Git Diff Scope

Type: Local working tree changes

Review the current project/worktree changes for this task, including:

- staged changes
- unstaged changes
- task-related untracked files

Suggested commands:

```bash
git status --short
git diff
git diff --cached
```

Do not review unrelated repository files outside this scope.

## Known Risks

Unknown

## Review Prompt

Please review this implementation as a code reviewer.

Read this brief first, then inspect only the declared Git Diff Scope.

Use the active task artifacts and project specs to check whether the implementation satisfies the requirement and follows local conventions.

Do not modify code.
Do not commit.
Do not run external reviewers.
Do not review the entire repository.

Report findings grouped as:

- Blocking
- Should Fix
- Nice to Have

For each finding, include:

- Severity
- File path and line when available
- Problem
- Impact
- Suggested fix

If there are no findings, say: No findings.
