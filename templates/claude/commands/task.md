# /task

Continue a specific existing Trellis task by directory name or suffix.

Usage:

```text
/task 06-24-school-operation-log
/task school-operation-log
```

The text after `/task` is the target task id. This command is a continuation shortcut, not a task-creation command.

## Required Reading

When continuing a full Trellis task, read `.trellis/spec/guides/review-handoff-workflow.md` before the post-check decision point.

## Required Behavior

For every `/task <task-id>` request:

1. Treat `$ARGUMENTS` as the target task id. If it is empty, ask the user for a task id and stop.
2. Do not create a new Trellis task.
3. Do not re-plan by default. Re-enter planning only when required artifacts are missing or the task status/artifacts are inconsistent.
4. Do not run push, merge, rebase, or `/trellis:finish-work` unless the user explicitly authorizes it.

## Locate the Task

1. Check the current active task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   If the active task path basename equals the target id, or the basename ends with `-<target-id>`, keep the current active task and continue.

2. If the current active task does not match, list active tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list
   ```

   Look for an exact directory-name match under `.trellis/tasks/` first. If no exact match exists, allow a suffix match where the directory basename ends with `-<target-id>`, such as `school-operation-log` matching `06-24-school-operation-log`.

3. If no active task matches, inspect archived tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list-archive
   ```

   Search under `.trellis/tasks/archive/<YYYY-MM>/` using the same exact-name first, suffix-match second rule.

4. If there are multiple matches, list the matches and stop for user clarification.
5. If no match exists, say `Task not found: <target-id>` and stop.

## Switch Context

When exactly one matching task is found and it is not already active, set it as the current task:

```bash
python3 ./.trellis/scripts/task.py start <resolved-task-path>
```

Use the resolved path from `.trellis/tasks/...` or `.trellis/tasks/archive/<YYYY-MM>/...`.

If the only match is archived and its `task.json` status is `completed`, report that the task is archived/completed and stop unless the user explicitly asks to reopen or continue completed work.

## Continue Flow

After confirming or switching the active task, continue using the Trellis continue flow:

1. Load current context:

   ```bash
   python3 ./.trellis/scripts/get_context.py
   ```

2. Load the phase index:

   ```bash
   python3 ./.trellis/scripts/get_context.py --mode phase
   ```

3. Route by task status and artifacts, following `/trellis:continue`:
   - `planning` with missing required artifacts: stop and explain which artifact is missing.
   - `planning` with sufficient artifacts: continue to the activation/start review step before implementation.
   - `in_progress`: continue to implementation or quality check according to artifact/code state.
   - `completed`: report that the task is completed and stop unless the user explicitly asks for follow-up work.

4. Load the specific phase step before taking action:

   ```bash
   python3 ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform claude
   ```

## Post-Check Review Handoff Decision

For an in-progress full Trellis task resumed through `/task`, continue implementation and Trellis native check as usual. After implementation and Trellis native check are complete, ask whether to generate a Review Handoff Markdown file for optional manual external review before final summary or finish-style wrap-up.

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

* `.trellis/scripts/codex-review.sh`
* `.trellis/scripts/codex-rereview.sh`
* `.trellis/scripts/codex-review.ps1`
* `.trellis/scripts/codex-rereview.ps1`
* `.trellis/spec/scripts/codex-review.sh`
* `.trellis/spec/scripts/codex-rereview.sh`
* `.trellis/spec/scripts/codex-review.ps1`
* `.trellis/spec/scripts/codex-rereview.ps1`
* `codex`
* `claude`
* any external reviewer command

The user decides:

* whether to generate a Review Handoff
* whether to do external review
* when to review
* who or what tool reviews it
* whether to apply review findings

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/task` must not automatically:

* Create a new task
* Re-plan when existing task status and artifacts are consistent
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
