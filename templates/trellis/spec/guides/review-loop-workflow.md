# Review Loop Workflow

## Purpose

This guide defines the manual review-fix loop after a Review Handoff has been given to Codex, Claude, a human reviewer, or another external reviewer.

The review loop is:

```text
/handoff -> external review markdown -> /review-fix -> /rereview -> external re-review
```

All external review and re-review steps are manually triggered by the user. Trellis Kit prepares local artifacts; it does not call external reviewers automatically.

## `/review-fix` Policy

`/review-fix <review-md>` reads an external review markdown file and fixes issues reported by that review.

By default, `/review-fix` fixes only P0 and P1 findings.

P2 findings are not fixed automatically by default. The agent may summarize P2 findings, but must not apply P2 fixes unless the user explicitly asks to fix P2 findings in the current conversation.

The agent must only fix problems explicitly identified in the review markdown. It must not:

- fix issues the review did not mention
- perform unrelated refactors
- expand the implementation scope
- redesign the original requirements
- add new features while fixing review findings

`/review-fix` must not automatically:

- call Codex Review
- call Claude Review
- call any external reviewer
- run review scripts
- commit
- push
- merge
- rebase
- run finish-work

After applying review fixes, `/review-fix` must generate a `review-fix-summary.md` file that records what was fixed, what was not fixed, P2 findings left unapplied, changed files, checks performed, remaining risks, and the suggested next step.

## `/rereview` Policy

`/rereview <review-md>` prepares a re-review request after `/review-fix` has applied fixes.

`/rereview` only generates re-review materials. It must not automatically call Codex, Claude Review, a human reviewer, or any external reviewer.

The re-review request should focus reviewers on:

- whether the original P0/P1 findings were correctly fixed
- whether any previously reported finding remains unresolved
- whether the fixes introduced regressions
- whether the fixes stayed within the original review scope

`/rereview` must not automatically:

- call Codex Review
- call Claude Review
- call any external reviewer
- run review scripts
- modify code
- commit
- push
- merge
- rebase
- run finish-work

## Manual External Review Ownership

The user owns every external review step:

1. The user manually gives `review-handoff.md` to Codex, Claude, a human reviewer, or another reviewer.
2. The user manually saves the review result as markdown.
3. The user runs `/review-fix <review-md>` when they want local fixes.
4. The user runs `/rereview <review-md>` when they want a re-review request prepared.
5. The user manually gives the re-review request to the reviewer.

Generating a fix summary or re-review request never implies that review should run automatically.
