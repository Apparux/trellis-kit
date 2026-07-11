# /review-fix

## Purpose

Use `/review-fix` to apply the smallest safe local fixes for actionable findings from a saved Codex review.

`/review-fix` owns code modification. It does not spawn a reviewer, wait on a Channel, read the Channel event store, or run rereview. Worker orchestration remains in `/review`.

## Inputs

- Active task from `python3 ./.trellis/scripts/task.py current --source` unless the user provides an explicit review path.
- A validated numbered complete pair, or one unambiguous legacy Markdown fallback.
- Relevant task artifacts and project specs.
- `.trellis/spec/templates/review-fix-summary-template.md`.

If `.trellis/spec/guides/minimal-implementation.md` exists and the finding concerns over-engineering or broad refactoring, include it in context through `check.jsonl`. Do not modify a spec index merely to load it.

## Complete-Pair Selection

A new-format source consists of:

```text
codex-review-NNN.md
codex-review-NNN.jsonl
```

Select the source in this order:

1. Prefer an explicit review path from `$ARGUMENTS`.
2. If it is a provenance-bearing numbered Markdown, require the same-number JSONL sibling and validate the complete pair.
3. Otherwise inspect all numbered candidates and select the numerically largest complete pair, never by mtime or a bare `codex-review*.md` glob.
4. Validate every non-empty JSONL line with `JSON.parse` as a non-array event object with integer `seq`, string `ts`/`kind`, and non-empty string `by`. Require a positive integer provenance `sendSeq`, strictly increasing post-send sequence values, matching provenance, and the first `event.kind === "done"` where `event.by === "check-codex"` and `event.seq > sendSeq`.
5. Select the last earlier non-empty worker message using `event.kind === "message"` and `event.by === "check-codex"`. Require the Markdown after its single provenance-line separator to equal that message exactly without trimming or an added newline, start with `# Review Result` or `# Rereview Result`, and record `workspaceStable: true`. `--from` is a CLI filter; raw events do not have `event.from`.
6. Ignore incomplete pairs, orphan files, malformed JSONL, mismatched siblings, and provenance-bearing Markdown whose JSONL is absent.
7. Only when no complete numbered pair exists, accept legacy names `codex-review.md` or `codex-review-<digits>.md` that have no provenance and have no same-stem JSONL sibling. An explicit path selects one valid legacy candidate; automatic fallback requires exactly one. Briefs, summaries, unrelated Markdown, and Markdown beside malformed/orphan JSONL are not legacy results.

An explicit new-format path never bypasses sibling or complete-pair validation. Do not rename or migrate legacy artifacts.

## Outputs

- Minimal code/task changes for selected findings.
- Targeted validation results.
- Same-number summary for a numbered source:

  ```text
  review-fix-summary-NNN.md
  ```

For a legacy source, write `review-fix-summary.md` only when that path is unused; if legacy summaries already exist, list them and ask for an explicit non-overwriting destination. State the source explicitly. If `review-fix-summary-NNN.md` already exists for a numbered source, stop and ask the user how to proceed.

## Steps

1. Resolve the active task, unless an explicit source outside the active task was supplied.
2. Select and validate the source using the complete-pair rules above. Stop if no valid source exists.
3. Read the review and classify findings as Blocking, Should Fix, Nice to Have, False Positive, or Needs Human Decision.
4. By default:
   - Fix Blocking.
   - Fix Should Fix.
   - Do not fix Nice to Have unless it is clearly low-risk and design-aligned.
   - Do not change code for False Positive; record the evidence.
   - Do not make broad changes for Needs Human Decision; state the decision needed.
5. Inspect only files needed for selected findings.
6. Apply the smallest safe changes.
7. Run targeted checks relevant to the changed files.
8. Update `implement.md` or `check.jsonl` only when the fix creates durable task/check context.
9. Generate `review-fix-summary-NNN.md` from the template, using the source review's same `NNN` and recording both source siblings.
10. Return fixed/deferred findings, false positives, changed files, checks, summary path, and remaining risks.

## Failure Handling

- If source selection is ambiguous, list candidates and ask; do not guess.
- If an incomplete pair is newest, ignore it and select the largest older complete pair. If none exists, apply the unique legacy fallback rule.
- If a finding lacks enough detail, classify it as Needs Human Decision.
- If a check fails, report the command and failure honestly; do not claim completion.
- If the numbered summary already exists, never silently overwrite it.

## Boundaries

Do not call Codex, Claude Review, another external reviewer, `trellis channel spawn`, `trellis channel wait`, `/review`, or `/review --rereview`. Do not commit, push, merge, rebase, or finish-work.

Suggested next step after a successful fix:

```text
/review --rereview
```
