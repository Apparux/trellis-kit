# Review Workflow

## Purpose

This guide defines the Trellis channel review workflow for `/review` and `/review-fix`.

The workflow is:

```text
implementation -> /review -> /review-fix -> /review --rereview
```

`/review` owns normal review and rereview dispatch through `trellis channel`. `/review-fix` owns local fixes for actionable review findings.

## When to Use

Use this guide when running review for an active Trellis task or fixing findings from a saved review result.

## Inputs

The workflow uses:

- active Trellis task artifacts
- saved review brief files under `.trellis/tasks/<task>/review/`
- saved Codex review results under `.trellis/tasks/<task>/review/`
- saved review fix summaries under `.trellis/tasks/<task>/review/`
- current git diff for implementation and fix scope

## Outputs

Expected files:

```text
.trellis/tasks/<task>/review/review-brief.md
.trellis/tasks/<task>/review/codex-review.md
.trellis/tasks/<task>/review/review-fix-summary.md
.trellis/tasks/<task>/review/rereview-brief.md
.trellis/tasks/<task>/review/codex-review-001.md
```

Use numbered variants when history exists.

## `/review` Policy

`/review` prepares a review brief and delegates execution to `trellis channel`.

It must:

- identify the active task
- read task artifacts and current git scope
- write `review-brief*.md`
- create a traceable review channel
- spawn a Codex check worker through `trellis channel spawn --agent check --provider codex`
- send the brief with `--text-file`
- wait with `--kind done`
- save `trellis channel messages --raw --from check-codex --last 100` as `codex-review*.md`

It must not:

- implement custom worker scheduling
- poll or parse channel event logs directly as the primary result path
- depend on custom completion tags
- modify code while running review
- commit, push, merge, rebase, or finish-work

## `/review` Rereview Mode Policy

Rereview is a mode of `/review`.

It reads the latest prior review result, latest review fix summary, and current fix diff, then sends `rereview-brief*.md` through the same `trellis channel` create/spawn/send/wait/messages flow.

The rereview prompt must focus Codex on:

- whether previous review findings were fixed
- whether fixes introduced new problems
- whether Blocking issues remain
- avoiding repeated Nice to Have findings already confirmed as not being handled
- avoiding repeated issues already marked False Positive

The requested output must be grouped as:

- Blocking
- Should Fix
- Nice to Have
- Verified Fixed
- False Positive / Not Applicable
- New Risks Introduced
- Final Recommendation

## `/review-fix` Policy

`/review-fix` reads the latest saved Codex review result and fixes actionable findings.

Finding categories:

- Blocking
- Should Fix
- Nice to Have
- False Positive
- Needs Human Decision

Default behavior:

- Fix Blocking findings.
- Fix Should Fix findings.
- Do not fix Nice to Have findings unless clearly low-risk and design-aligned.
- Do not change code for False Positive findings; document why.
- Do not make broad changes for Needs Human Decision; document the decision needed.

`/review-fix` must not call Codex, Claude Review, any external reviewer, `trellis channel spawn`, `trellis channel wait`, `/review`, or `/review --rereview`.

After fixes, it writes `review-fix-summary*.md` with source review, fixed findings, changed files, false positives, deferred findings, checks, remaining risks, and suggested rereview input.

## Failure Handling

If no saved review result exists, run `/review` first.

If `/review-fix` cannot safely classify or fix a finding, mark it Needs Human Decision.

If a channel worker stalls during `/review`, inspect:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

Do not use direct `events.jsonl` reads unless channel CLI diagnostics are insufficient.

## Examples

Normal review:

```text
/review
```

Fix actionable findings:

```text
/review-fix
```

Rereview fixes:

```text
/review --rereview
```
