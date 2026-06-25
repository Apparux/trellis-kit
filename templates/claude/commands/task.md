# /task

Continue a specific existing Trellis task by directory name or suffix.

Usage:

```text
/task 06-24-school-operation-log
/task school-operation-log
```

The text after `/task` is the target task id. This command is a continuation shortcut, not a task-creation command.

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
