# Rereview Brief

## Task

- Task title: `Unknown`
- Task slug: `Unknown`
- Branch/worktree: `Unknown`

## Task Path

`Unknown`

## Source Review

Path: `Unknown`

## Review Fix Summary

Path: `Unknown`

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

Verify whether previous review findings were fixed, whether fixes introduced regressions, and whether Blocking issues remain.

## Git Diff Scope

Type: Local working tree changes after review fixes

Review the current project/worktree changes related to the original findings and fixes, including:

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

Please rereview the implementation fixes as a code reviewer.

Read this brief first, then inspect only the declared Git Diff Scope.

Focus only on:

1. Whether previous review findings were fixed.
2. Whether fixes introduced new issues.
3. Whether Blocking issues remain.
4. Do not repeat Nice to Have findings already confirmed as not being handled.
5. Do not repeat issues already marked False Positive.

Do not modify code.
Do not commit.
Do not run external reviewers.
Do not review the entire repository.

Use this output format:

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
