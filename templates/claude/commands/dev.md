# /dev

Use `/dev 新需求：<需求描述>` as the standard entrypoint for a new implementation request.

Example:

```text
/dev 新需求：实现 xxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

## Required Reading

Before implementing, read:

1. `.trellis/workflow.md`
2. Relevant files under `.trellis/spec/`
3. `.trellis/spec/guides/claude-codex-review-workflow.md`
4. The active task `prd.md`, `design.md` if present, and `implement.md` if present

## Task Rule

Create or confirm a Trellis task before implementation according to `.trellis/workflow.md`.

For complex work, produce and review:

- `prd.md`
- `design.md`
- `implement.md`

Do not treat task creation approval as implementation approval unless the user explicitly says to proceed.

## Delivery Gate

Write this Delivery Gate into the current task PRD or implementation plan:

```md
## Delivery Gate

- Claude Code must generate `.trellis/tasks/<task>/reviews/codex-handoff.md` from `.trellis/spec/templates/codex-handoff-template.md`.
- Claude Code must run `.trellis/scripts/codex-review.sh .trellis/tasks/<task>` after the implementation commit when the user requested Codex Review.
- Claude Code must fix P0/P1 issues by default and write `.trellis/tasks/<task>/reviews/claude-fix-notes.md`.
- Claude Code must run `.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>` after P0/P1 fixes.
- Claude Code must not run `/trellis:finish-work` until Codex Review passes or the user explicitly overrides the gate.
- Claude Code must not push, merge, or rebase without explicit user authorization.
```

## Implementation Rule

Implementation cannot skip Codex Review when the request asks for handoff/review. The default flow is:

1. Plan in Trellis.
2. Implement.
3. Run local validation.
4. Generate `reviews/codex-handoff.md`.
5. Commit locally if requested.
6. Run `.trellis/scripts/codex-review.sh .trellis/tasks/<task>`.
7. Fix only P0/P1 issues by default.
8. Run `.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>` when fixes were made.
9. Stop before push, merge, rebase, or `/trellis:finish-work` unless explicitly authorized.

## Continue Rule

For interrupted work, use:

```text
/trellis:continue
```

Then read the active task and review artifacts before continuing.
