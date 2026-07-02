# /review-fix

## Purpose

Use `/review-fix` to fix actionable findings from the latest Codex review result saved by `/review` for the current Trellis task.

`/review-fix` does not spawn reviewers, wait for workers, read channel event logs directly, or run re-review. Worker orchestration belongs to `/review` through `trellis channel`.

## When to Use

Use `/review-fix` after `/review` has saved a review result under `.trellis/tasks/<task>/review/`.

Use `/review-fix` only when you want Claude Code to apply local code changes for Blocking and Should Fix findings.

Do not use `/review-fix` for general bug fixes. Use `/fix <request>` for small unrelated fixes.

## Inputs

- Active Trellis task from `python3 ./.trellis/scripts/task.py current --source`.
- Latest `codex-review*.md` under `.trellis/tasks/<task>/review/`.
- Task files such as `prd.md`, `design.md`, `implement.md`, and `check.jsonl` when relevant to the finding.
- Current source files needed to verify and fix the selected findings.
- `.trellis/spec/templates/review-fix-summary-template.md`.

If the user provides a review file path, prefer that explicit file over automatic latest-file discovery.

## Outputs

- Updated code or task files required to fix selected findings.
- Updated `<task-path>/implement.md` when the fix changes implementation notes or remaining risk.
- Appended `<task-path>/check.jsonl` entry when checks or review context should be preserved.
- Review fix summary at `.trellis/tasks/<task>/review/review-fix-summary.md`.

If a summary already exists, use a numbered filename such as:

```text
review-fix-summary-001.md
review-fix-summary-002.md
```

## Steps

1. Confirm the active Trellis task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   Stop if there is no active task and the user did not provide an explicit review file.

2. Locate the source review:

   - If `$ARGUMENTS` contains a review file path, read that file.
   - Otherwise choose the latest `codex-review*.md` under `.trellis/tasks/<task>/review/`.
   - Stop if no review result exists and tell the user to run `/review` first.

3. Read the review result and classify findings into:

   - Blocking
   - Should Fix
   - Nice to Have
   - False Positive
   - Needs Human Decision

4. Default fix policy:

   - Fix Blocking findings.
   - Fix Should Fix findings.
   - Do not fix Nice to Have findings by default unless the change is clearly low-risk and matches the existing design.
   - Do not modify code for False Positive findings; document the reason.
   - Do not make broad changes for Needs Human Decision; document the decision needed.

5. Inspect only files needed for the selected findings.

6. Apply the smallest safe changes that directly address selected findings.

7. Run targeted checks relevant to the modified files.

8. Update task artifacts when appropriate:

   - `implement.md` for implementation notes, fixed review findings, or remaining risk.
   - `check.jsonl` for check/review context that should be available to later review.

9. Generate `review-fix-summary.md` from `.trellis/spec/templates/review-fix-summary-template.md`.

10. Return fixed findings, deferred findings, false positives, changed files, checks, summary path, and remaining risks.

## Failure Handling

If the latest review result cannot be determined, list candidate files and ask the user to choose one.

If a finding lacks enough detail to fix safely, classify it as Needs Human Decision instead of guessing.

If checks fail, report the exact command and failure summary, keep the summary file honest, and do not claim the fix is complete.

If a finding appears false positive, cite the code or task artifact that proves it and record it in the summary.

## Examples

Fix findings from the latest review for the active task:

```text
/review-fix
```

Fix findings from an explicit review result:

```text
/review-fix .trellis/tasks/07-02-example/review/codex-review-001.md
```

Suggested next step after fixing:

```text
/review --rereview
```
