# /dev

Use `/dev` for full Trellis workflow tasks, including:

* New features
* Complex requirements
* Cross-module changes
* Schema changes
* Permission/authentication changes
* Changes requiring PRD/DESIGN/TASK decomposition

## Required Reading

Before implementing, read:

1. `.trellis/workflow.md`
2. `.trellis/spec/guides/fast-path-change-policy.md`
3. `.trellis/spec/guides/development-location-decision.md`
4. `.trellis/spec/guides/review-handoff-workflow.md`
5. Relevant `.trellis/spec/` files selected by the Trellis workflow, task context, or spec indexes
6. The active task `prd.md`, `design.md` if present, and `implement.md` if present

## Fast Path Check

Before creating a full Trellis task, check whether the request clearly qualifies for Fast Path Fix according to `.trellis/spec/guides/fast-path-change-policy.md`.

If it clearly qualifies, tell the user:

> 这个看起来是小改动，可以使用 `/fix` Fast Path，不创建完整 Trellis task，也不默认生成 handoff、commit 或执行 review。是否切换到 `/fix`？

Stop for the user's decision unless the user explicitly asked to use `/dev` anyway.

If the user explicitly insists on `/dev`, continue the full Trellis workflow.

## Development Location Decision

Before implementation or code changes, follow `.trellis/spec/guides/development-location-decision.md`.

The agent must collect and show:

* Active Trellis task
* Current branch
* Current working directory
* Dirty status
* Existing worktrees from `git worktree list`
* Whether `.gitignore` contains `.worktrees/`

The agent may recommend current working tree or task-specific worktree, but the user makes the final decision.

If the user chooses task-specific worktree, use only:

```text
.worktrees/<task-id>
```

Do not use:

```text
.trellis/worktrees/<task-id>
../<repo>-worktrees/<task-id>
../<repo>-<task-id>
/tmp/<task-id>
```

Before creating the worktree, ensure `.gitignore` ignores `.worktrees/`.

If `.gitignore` does not ignore `.worktrees/`, ask the user whether to add it.

Do not create a worktree, switch branches, or start implementation before the user chooses when this decision point applies.

## Full Trellis Workflow

After the user chooses the development location, continue the normal Trellis workflow.

Use Trellis-native commands and context loading as appropriate.

Do not bypass Trellis planning, design, implementation, or check phases for full `/dev` tasks.

## Post-Implementation Quality Decision

After implementation, follow the native Trellis check flow unless the user explicitly instructs otherwise.

Trellis native check is the default quality verification for full `/dev` tasks.

After implementation and Trellis check are complete, ask the user whether to generate a Review Handoff Markdown file for optional manual external review.

Ask:

> 实现和 Trellis 内置 check 已完成。请选择后续处理方式：
>
> A. 不生成 Review Handoff，只输出实现总结
> B. 生成 Review Handoff Markdown，稍后我手动决定是否交给 Codex / Claude / 人工 reviewer
> C. 暂不生成，稍后再说

If the user chooses A:

* Do not generate a Review Handoff.
* Return final implementation summary.
* Include changed files, checks run, and remaining risks.

If the user chooses B:

* Generate the Review Handoff Markdown according to `.trellis/spec/guides/review-handoff-workflow.md`.
* Return the generated file path.
* Do not run any reviewer.
* Do not run Codex.
* Do not run Claude.
* Do not run review scripts.

If the user chooses C:

* Do not generate a Review Handoff.
* Explain that the user can request it later.

The agent must not automatically run:

* `codex`
* `claude`
* any review script
* any external reviewer command

The user decides:

* whether to generate a Review Handoff
* whether to do external review
* when to review
* who or what tool reviews it
* whether to apply review findings

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/dev` must not automatically:

* Run Codex Review
* Run Claude Review
* Run any external reviewer
* Run review scripts
* Fix P0/P1 findings from external review
* Re-review
* Commit
* Push
* Merge
* Rebase
* Run finish-work
