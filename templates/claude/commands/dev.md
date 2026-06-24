# /dev

Use `/dev` as the standard entrypoint for a new implementation request.

The text after `/dev` is the requirement. The exact `新需求：<需求描述>` prefix is recommended for clarity, but it is not required. Any explicit implementation request after `/dev` must trigger the default delivery flow.

Accepted examples:

```text
/dev 新需求：实现 xxx
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

For every `/dev` implementation request, even when the user does not say it explicitly, Claude Code must generate a Codex handoff after implementation, commit locally, run local Codex Review, and stop before push or finish-work.

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

- Claude Code must generate `.trellis/tasks/<task>/reviews/codex-handoff.md` from `.trellis/spec/templates/codex-handoff-template.md` after every `/dev` implementation request.
- Claude Code must commit the implementation locally before running Codex Review.
- Claude Code must run `.trellis/scripts/codex-review.sh .trellis/tasks/<task>` after the implementation commit for every `/dev` implementation request.
- Claude Code must fix P0/P1 issues by default and write `.trellis/tasks/<task>/reviews/claude-fix-notes.md`.
- Claude Code must run `.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>` after P0/P1 fixes.
- Claude Code must not run `/trellis:finish-work` until Codex Review passes or the user explicitly overrides the gate.
- Claude Code must not push, merge, or rebase without explicit user authorization.
```

## Implementation Rule

Implementation cannot skip handoff, local commit, or Codex Review for `/dev` implementation requests. These steps are default behavior even when the user only writes `/dev <需求描述>`. The default flow is:

1. Plan in Trellis.
2. Implement.
3. Run local validation.
4. Generate `reviews/codex-handoff.md`.
5. Commit locally.
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
