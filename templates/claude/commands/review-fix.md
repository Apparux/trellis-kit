# /review-fix

Use `/review-fix <review-md>` to apply fixes from a Codex, Claude, human, or other external review markdown file.

Example:

```text
/review-fix .trellis/tasks/06-23-customer-safety-education/reviews/codex-review.md
```

This command fixes only explicitly reported review findings. By default it fixes P0/P1 findings only, summarizes P2 findings without applying them, and does not run reviewers or commit.

## Required Reading

Before fixing review findings, read:

1. The review markdown path provided in `$ARGUMENTS`
2. `.trellis/spec/guides/review-loop-workflow.md`

Do not load the entire `.trellis/spec/` directory by default. Load only task context and relevant project rules needed to understand and safely fix the reported findings.

## Process

For every `/review-fix <review-md>` request:

1. Treat `$ARGUMENTS` as the source review markdown path. If it is empty, ask the user for a review markdown path and stop.
2. Read the source review markdown.
3. Read `.trellis/spec/guides/review-loop-workflow.md`.
4. Identify all P0, P1, and P2 findings in the review markdown.
5. Confirm the current active Trellis task when possible:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   If there is no active task, continue without failing and use the fallback summary path.

6. Try to find the corresponding `review-handoff.md`:
   - first, from paths or references in the review markdown
   - second, under the current active task directory, especially its `reviews/` directory
   - if no handoff is found, continue and report that the handoff was not found
7. Decide the fix set:
   - Fix P0 and P1 findings by default.
   - Do not fix P2 findings by default.
   - Fix P2 findings only when the user explicitly asks for P2 fixes in the current conversation.
8. Inspect only the code and files needed to fix the selected findings.
9. Apply the smallest safe changes that directly address the selected findings.
10. Do not fix issues that are not explicitly described in the review markdown.
11. Run targeted checks related to the changed files and findings.
12. Generate `review-fix-summary.md`.
13. Return the required final response.

## Output Path

Prefer this summary path when the task id is known:

```text
.trellis/tasks/<task-id>/reviews/review-fix-summary.md
```

If the task id cannot be determined, use:

```text
.trellis/reviews/review-fix-summary.md
```

Create the `reviews/` directory if needed.

## `review-fix-summary.md` Structure

The summary must include at least:

```markdown
# Review Fix Summary

## Source Review

Path: <review-md>

## Fixed Findings

- <finding id / severity / summary / files changed>

## Not Fixed Findings

- <finding id / severity / reason>

## P2 Findings Not Applied

- <finding summary / reason>

## Changed Files

- <file path>

## Checks Performed

- <command / result>

## Remaining Risks

- <risk>

## Suggested Next Step

Run `/rereview <review-md>` to prepare a re-review request.
```

Use `None` or `No known ...` only when a section truly has no entries.

## Final Response

The final response must include:

1. Fixed findings
2. Not fixed findings and reason
3. P2 findings not applied
4. Changed files
5. Checks performed
6. Remaining risks
7. Review fix summary path
8. Suggested next step: `/rereview <review-md>`

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/review-fix` must not:

- Fix findings not mentioned in the review markdown
- Automatically fix P2 findings
- Do unrelated refactors
- Add new features
- Expand implementation scope
- Redesign requirements
- Generate or rewrite Review Handoff as part of the fix
- Run Codex Review
- Run Claude Review
- Run any external reviewer
- Run review scripts
- Run `/rereview`
- Commit
- Push
- Merge
- Rebase
- Run finish-work
