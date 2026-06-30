# /rereview

Use `/rereview <review-md>` after `/review-fix` to generate a re-review request markdown file.

Example:

```text
/rereview .trellis/tasks/06-23-customer-safety-education/reviews/codex-review.md
```

This command prepares re-review materials only. It does not run Codex, Claude Review, or any external reviewer, and it does not commit.

## Required Reading

Before generating a re-review request, read:

1. The original review markdown path provided in `$ARGUMENTS`
2. `.trellis/spec/guides/review-loop-workflow.md`
3. The corresponding `review-fix-summary.md`, when found

Do not load the entire `.trellis/spec/` directory by default. Load only task context and files needed to prepare the re-review request.

## Process

For every `/rereview <review-md>` request:

1. Treat `$ARGUMENTS` as the original review markdown path. If it is empty, ask the user for a review markdown path and stop.
2. Read the original review markdown.
3. Read `.trellis/spec/guides/review-loop-workflow.md`.
4. Locate the corresponding `review-fix-summary.md`:
   - first, look in the original review markdown directory for `review-fix-summary.md`
   - if multiple candidate summaries exist, choose the latest when that is unambiguous, or ask the user to choose
   - if no summary is found, stop and ask the user to run `/review-fix <review-md>` first or provide a summary path
5. Confirm the current active Trellis task when possible:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   If there is no active task, continue without failing and use the fallback request path.

6. Try to find the corresponding `review-handoff.md`:
   - first, from paths or references in the original review markdown
   - second, from paths or references in `review-fix-summary.md`
   - third, under the current active task directory, especially its `reviews/` directory
   - if no handoff is found, continue and report that the handoff was not found
7. Collect the current local workspace state:

   ```bash
   git status --short
   git diff
   git diff --cached
   ```

   Also identify newly added untracked files related to this task so the re-review request can mention them.

8. Generate `rereview-request.md`.
9. Return the required final response.

## Output Path

Prefer this request path when the task id is known:

```text
.trellis/tasks/<task-id>/reviews/rereview-request.md
```

If the task id cannot be determined, use:

```text
.trellis/reviews/rereview-request.md
```

Create the `reviews/` directory if needed.

## `rereview-request.md` Structure

The request must include at least:

````markdown
# Re-review Request

## Original Review

Path: <review-md>

## Review Fix Summary

Path: <review-fix-summary.md>

## Original Handoff

Path: <review-handoff.md>

## Re-review Scope

Type: Local working tree changes after review fixes

Review the current local working tree changes related to the original findings and fixes.

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

## Fixed Findings to Verify

- <P0/P1 finding summary>

## Findings Not Fixed

- <finding summary / reason>

## P2 Findings Not Applied

- <finding summary / reason>

## Suggested Re-review Prompt

Please re-review the implementation fixes as a code reviewer.

Read these files first:

1. Original Review: <review-md>
2. Review Fix Summary: <review-fix-summary.md>
3. Original Handoff: <review-handoff.md>

Then inspect only the declared Re-review Scope.

Focus on:

- whether P0/P1 findings were correctly fixed
- whether the fixes introduced regressions
- whether any previously reported finding remains unresolved
- whether the fix stayed within the original review scope

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
````

If the original handoff is not found, set its path to `Not found` and keep the suggested prompt focused on the original review and review fix summary.

## Final Response

The final response must include:

1. Re-review request path
2. Original review path
3. Review fix summary path
4. Original handoff path, if found
5. Re-review scope
6. Suggested prompt location
7. Reminder that the reviewer must be run manually

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/rereview` must not:

- Run Codex Review
- Run Claude Review
- Run any external reviewer
- Run review scripts
- Modify code
- Commit
- Push
- Merge
- Rebase
- Run finish-work
