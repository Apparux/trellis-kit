# /task

Use `/task <task-id>` as the Trellis big-task entrypoint for an existing task. It resolves or switches to the requested task, makes the development-location decision before implementation, then continues through native `/trellis:continue` phase routing.

Usage:

```text
/task 06-24-school-operation-log
/task school-operation-log
```

The text after `/task` is the target task id. This command does not create a new Trellis task.

## Required Reading

Before task routing and development-location decisions, read only:

1. `.trellis/spec/guides/development-location-decision.md`

Do not load all of `.trellis/spec/` by default. Let Trellis context, phase routing, task artifacts, and spec indexes select any additional project rules later.

## Resolve The Task

For every `/task <task-id>` request:

1. Treat `$ARGUMENTS` as the target task id. If it is empty, ask the user for a task id and stop.
2. Check the current active task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   If the active task path basename equals the target id, or the basename ends with `-<target-id>`, keep the current active task.

3. If the current active task does not match, list active tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list
   ```

   Search `.trellis/tasks/` by exact directory-name match first. If no exact match exists, allow a suffix match where the directory basename ends with `-<target-id>`.

4. If no active task matches, inspect archived tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list-archive
   ```

   Search `.trellis/tasks/archive/<YYYY-MM>/` with the same exact-name first, suffix-match second rule.

5. If multiple matches exist, list the matches and stop for user clarification.
6. If no match exists, say `Task not found: <target-id>` and stop.
7. If the only match is archived and its `task.json` status is `completed`, report that the task is archived/completed and stop unless the user explicitly asks to reopen or continue completed work.

## Switch Context

When exactly one matching non-current, non-completed task is resolved, set it as the current task:

```bash
python3 ./.trellis/scripts/task.py start <resolved-task-path>
```

Use the resolved path from `.trellis/tasks/...` or `.trellis/tasks/archive/<YYYY-MM>/...`.

## Load Trellis Context

After confirming or switching the active task, load native Trellis context and phase routing:

```bash
python3 ./.trellis/scripts/get_context.py
python3 ./.trellis/scripts/get_context.py --mode phase
```

Determine the active task phase/status and whether implementation has started. Load the specific phase step before taking action:

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform claude
```

## Development Location Decision

Worktree decisions happen only in `/task`, before implementation.

If the task has not yet entered implementation, ask this exact decision before creating a worktree, switching branches, starting implementation, or modifying code:

```text
当前 task 是：<task-id>
当前阶段是：<phase>

请选择开发位置：

A. 在当前分支 / 当前工作区继续
B. 创建或切换到任务专用 worktree：.worktrees/<task-id>

如果选择 B，将使用分支：
task/<task-id>
```

Before asking, inspect and show the context required by `.trellis/spec/guides/development-location-decision.md`: current task, current phase/status, current branch, current working directory, `git worktree list`, working-tree dirty state, whether `.gitignore` contains `.worktrees/`, and whether uncommitted Trellis planning/design/task artifacts exist.

If the user chooses A, continue in the current branch/current working directory.

If the user chooses B:

1. Use only `.worktrees/<task-id>`.
2. Use only branch `task/<task-id>`.
3. Before creating the task worktree, verify `.gitignore` contains `.worktrees/`.
4. If `.gitignore` does not contain `.worktrees/`, ask before adding it.
5. Prompt the user about uncommitted Trellis planning/design/task artifacts before creating the worktree.
6. Do not automatically create `.worktrees/` except as part of creating the user-selected task worktree.
7. Do not modify target-project `.gitignore` without explicit confirmation.

If implementation has already started and code is dirty, default to continuing in the current workspace unless the user explicitly asks to move. If the user insists on switching to a worktree, remind them that uncommitted code changes must be migrated manually or committed before they will appear in the new worktree.

Do not create worktrees in `.trellis/worktrees/`, `../<repo>-worktrees/`, `../<repo>-<task-id>`, or `/tmp/`.

## Continue Native Trellis Flow

After the requested task is active and the development location is chosen when required, continue native Trellis flow:

```text
/trellis:continue
```

Route by task status and artifacts:

- `planning` with missing required artifacts: stop and explain which artifact is missing.
- `planning` with sufficient artifacts: continue the Trellis activation/start review step only after any required development-location decision is complete.
- `in_progress`: continue implementation or quality check according to the Trellis phase and current code state.
- `completed`: report that the task is completed and stop unless the user explicitly asks for follow-up work.

Do not automatically generate Review Brief Markdown or run review. The user may request `/review` when they want a channel-driven review.

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/task` must not automatically:

- Create a new task
- Re-plan when existing task status and artifacts are consistent
- Load all of `.trellis/spec/` by default
- Create a worktree before the user chooses a development location
- Switch branches before the user chooses a development location
- Start implementation before the user chooses a development location when the decision applies
- Generate Review Brief Markdown
- Run Codex Review
- Run Claude Review
- Run any external reviewer
- Run review scripts
- Fix external-review findings
- Re-review
- Commit
- Push
- Merge
- Rebase
- Run finish-work
