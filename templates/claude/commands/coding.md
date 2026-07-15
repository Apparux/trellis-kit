# /coding

Use `/coding <task-id>` as the Trellis big-task entrypoint for an existing task. It resolves and inspects the requested task without mutation, then performs compatible additive manifest repair when needed, completes the development-location and implementation-approval gates, activates or switches the task, and continues through native `/trellis:continue` phase routing.

Usage:

```text
/coding 06-24-school-operation-log
/coding school-operation-log
```

The text after `/coding` is the target task id. This command does not create a new Trellis task.

## Required Reading

Before task routing and development-location decisions, read only:

1. `.trellis/spec/guides/development-location-decision.md`
2. `.trellis/spec/guides/minimal-implementation.md`, when it exists

Do not load all of `.trellis/spec/` by default. Let targeted Trellis workflow lookup, task artifacts, later native context, and spec indexes select any additional project rules. Do not rely on an `index.md` file to discover the Minimal Implementation guide, and do not modify an index for this purpose.

## Resolve The Task Without Mutation

For every `/coding <task-id>` request, resolve one task path before changing task state, manifests, workspaces, branches, or the current-task pointer:

1. Treat `$ARGUMENTS` as the target task id. If it is empty, ask the user for a task id and stop.
2. Check the current active task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   If the active task path basename equals the target id, or the basename ends with `-<target-id>`, retain that path as a candidate.

3. If the current active task does not match, list active tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list
   ```

   Search `.trellis/tasks/` by exact directory-name match first. Only when there is no exact match, allow a suffix match whose directory basename ends with `-<target-id>`.

4. If no active task matches, inspect archived tasks:

   ```bash
   python3 ./.trellis/scripts/task.py list-archive
   ```

   Search `.trellis/tasks/archive/<YYYY-MM>/` with the same exact-name-first and suffix-match rules.

5. If multiple matches remain, list all multiple matches and stop for user clarification.
6. If no match exists, say `Task not found: <target-id>` and stop.
7. Produce exactly one `<resolved-task-path>`. An archived/completed match remains a stop case once its status is confirmed in readiness inspection, unless the user explicitly asks to reopen it.

This entire section is read-only. A missing, ambiguous, or unresolved target stops with no mutation.

## Inspect Resolved Task Readiness

Inspect the resolved path directly; do not use a possibly stale current-task pointer. Read these paths when applicable:

- `<resolved-task-path>/task.json`
- `<resolved-task-path>/prd.md`
- `<resolved-task-path>/design.md`
- `<resolved-task-path>/implement.md`
- `<resolved-task-path>/implement.jsonl`
- `<resolved-task-path>/check.jsonl`

Classify and gate the task before activation:

1. Read lifecycle status from `task.json`: `planning`, `in_progress`, or `completed`. A missing or invalid status is a blocker. A `completed` task stops unless the user explicitly requested reopening.
2. For a `planning` task, classify accepted planning scope as Lightweight or Complex. Lightweight tasks require `prd.md`; `design.md` and `implement.md` are optional. Complex tasks require `prd.md`, `design.md`, and `implement.md`. Report every missing required artifact and stop without changing status. For an existing `in_progress` task, inspect its accepted artifacts without forcing it back into planning.
3. Determine whether the applicable local workflow uses sub-agent dispatch or inline execution with this targeted, read-only Phase 1.3 lookup:

   ```bash
   python3 ./.trellis/scripts/get_context.py --mode phase --step 1.3 --platform claude-code
   ```

   Use only the applicable platform branch. This lookup selects context mode without consuming the current-task pointer.
4. Read accepted task artifacts to determine whether they identify any of the conditional check risks listed in the next section. Do not infer a risk merely to fill a manifest.

Do not load native current-task context yet. Any readiness failure leaves a `planning` task in `planning` and leaves an `in_progress` task unchanged.

## Preflight Task Context Manifests

The canonical guide path is `.trellis/spec/guides/minimal-implementation.md`.

Inline workflows skip manifest mutation and load the guide directly when it exists. Continue to the location and approval gates after artifact readiness succeeds.

For sub-agent dispatch workflows, inspect and repair manifests against `<resolved-task-path>` before activation or the next implementation dispatch:

1. Treat missing or seed-only manifests as compatible additive-repair cases. Parse every nonblank JSONL row structurally and require a JSON object before any repair. Invalid JSONL is a blocker: report its file and line, then stop before repair. For each real entry, verify that its referenced file or declared directory exists; a dangling referenced path is also a blocker, so report it and stop before repair.
2. An object with a non-empty `file` is a real entry. An object containing only `_example`, or any object without a non-empty `file`, is not a real entry. Test canonical membership only when a non-empty parsed `file` value exactly equals the canonical path; never use substring matching.
3. Determine the conditional check rule only from accepted `prd.md`, `design.md`, and `implement.md` content. The five applicable risks are over-engineering, cleanup, deprecated compatibility, broad refactor, and unnecessary abstraction.
4. When the guide exists and implementation work is in scope, `implement.jsonl` must contain the canonical real entry. If exact membership is absent, run once:

   ```bash
   python3 ./.trellis/scripts/task.py add-context "<resolved-task-path>" implement ".trellis/spec/guides/minimal-implementation.md" "Apply the minimal implementation rule during implementation"
   ```

5. `check.jsonl` receives the canonical entry only when at least one of the five listed risks applies. Preserve an existing exact entry. When a risk applies and exact membership is absent, run once:

   ```bash
   python3 ./.trellis/scripts/task.py add-context "<resolved-task-path>" check ".trellis/spec/guides/minimal-implementation.md" "Check applicable simplification and over-engineering risks"
   ```

   When no listed check risk applies, do not add this guide as filler. The normal check manifest still needs another genuinely relevant real entry before sub-agent dispatch.

6. Repair is additive and idempotent: preserve every existing row, inspect exact membership before each command, and do not add a duplicate or rewrite the manifests manually. If the guide is absent in an older installation, skip both guide-specific insertions, do not create a dangling entry, and do not fail solely because that Kit-specific guide is unavailable.
7. Re-read `implement.jsonl` and `check.jsonl` after any applicable repair and verify exact membership again. If an `add-context` command fails, or a canonical entry required by steps 4 or 5 is still absent, report the failed repair and stop without activation. Then run:

   ```bash
   python3 ./.trellis/scripts/task.py validate <resolved-task-path>
   python3 ./.trellis/scripts/task.py list-context <resolved-task-path>
   ```

8. Stop if validation reports malformed data, a missing referenced path, or if either dispatch manifest still lacks a genuinely relevant real entry after applicable repair. A no-risk seed-only `check.jsonl` requires relevant curation; the canonical guide must not be used as filler.
9. Continue the same `/coding` invocation after successful compatible repair. Do not stop solely to announce the added row, and do not re-enter broad planning when the task artifacts remain consistent.

## Development Location And Approval Gates

Worktree decisions happen only in `/coding`, before implementation or activation. A ready `planning` task must remain in `planning` throughout these gates.

If the task has not yet entered implementation, ask this exact decision before creating a worktree, switching branches, activating the task, or modifying code:

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
8. Rerun resolved-path readiness inspection and manifest preflight before activation in the final workspace. Stop there if planning artifacts or compatible manifest changes did not move with the workspace.

Artifact review and implementation approval remain required for a `planning` task unless both are already explicit in the current conversation. If approval or the development-location choice is deferred, stop with the task still in `planning`.

If implementation has already started and code is dirty, default to continuing in the current workspace unless the user explicitly asks to move. If the user insists on switching to a worktree, remind them that uncommitted code changes must be migrated manually or committed before they will appear in the new worktree.

Do not create worktrees in `.trellis/worktrees/`, `../<repo>-worktrees/`, `../<repo>-<task-id>`, or `/tmp/`.

## Activate Or Switch The Task

Apply the resolved lifecycle state only after readiness, manifest preflight, development-location choice, and any required implementation approval have succeeded:

| Resolved state | Action |
| --- | --- |
| `planning` | Activate only after every applicable gate above succeeds. |
| non-current `in_progress` | Preflight first, then establish the current-task pointer. Do not force replanning. |
| current `in_progress` | Preflight before the next dispatch; do not call `task.py start` redundantly. |
| `completed` | Report completion and stop unless the user explicitly asks to reopen or continue completed work. |
| missing, unsupported, or invalid status | Stop without mutation and explain the blocker. |

For the `planning` activation or non-current `in_progress` pointer switch, run only now:

```bash
python3 ./.trellis/scripts/task.py start <resolved-task-path>
```

Use the resolved path from `.trellis/tasks/...` or `.trellis/tasks/archive/<YYYY-MM>/...`. If the command fails, report the error and do not continue with context for another task.

## Load Native Trellis Context

Only after activation or pointer switch succeeds—or readiness confirms that the resolved `in_progress` task is already current—load native current-task context and phase routing:

```bash
python3 ./.trellis/scripts/get_context.py
python3 ./.trellis/scripts/get_context.py --mode phase
```

Determine the active task phase/status and load the specific execution step before taking action:

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.X> --platform claude-code
```

Verify that native context now names `<resolved-task-path>`. This deferred load prevents a non-current target from being reviewed through a stale active-task pointer.

## Continue Native Trellis Flow

After the requested task is active and the development location is chosen when required, continue native Trellis flow:

```text
/trellis:continue
```

Route by task status, artifacts, phase, and current code state:

- A newly activated task continues to implementation through the applicable native execution step.
- `in_progress` continues implementation or quality check; compatible preflight runs before the next sub-agent dispatch.
- `completed` reports completion and stops unless the user explicitly requested follow-up or reopening.
- Any blocker discovered after activation is reported with context; do not silently switch to another task.

Do not automatically generate Review Brief Markdown or run review. The user may request `/review` when they want a channel-driven review.

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/coding` must not automatically:

- Create a new task
- Re-plan when existing task status and artifacts are consistent
- Load all of `.trellis/spec/` by default
- Mutate manifests for an inline workflow
- Create a worktree before the user chooses a development location
- Switch branches before the user chooses a development location
- Activate or start implementation before readiness, manifest, location, and approval gates pass
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
