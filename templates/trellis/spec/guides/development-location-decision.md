# Development Location Decision Guide

## Goal

Worktree decisions happen only inside `/coding`, before implementation starts.

The agent must not automatically choose between the current working tree and a task-specific git worktree.

## Required Decision Point

When `/coding <task-id>` reaches a task that has not yet entered implementation, ask this exact question before creating a worktree, switching branches, starting implementation, or modifying code:

```text
当前 task 是：<task-id>
当前阶段是：<phase>

请选择开发位置：

A. 在当前分支 / 当前工作区继续
B. 创建或切换到任务专用 worktree：.worktrees/<task-id>

如果选择 B，将使用分支：
task/<task-id>
```

The user chooses. The agent may recommend an option after showing the current state.

## Required Context Before Asking

Before asking, collect and show:

- Current Trellis active task, if any
- Target task id
- Current task phase/status
- Current git branch
- Current working directory
- Existing git worktrees from `git worktree list`
- Whether the current working tree has uncommitted changes
- Whether uncommitted changes include Trellis planning/design/task artifacts
- Whether implementation has already started
- Whether `.gitignore` already ignores `.worktrees/`

## Decision Rules

Recommend task-specific worktree when:

- The task is a new feature
- The task is large or risky
- The task changes database schema
- The task changes permissions/authentication
- The task touches multiple modules
- The current working tree has unrelated uncommitted changes and implementation has not started
- The user needs isolated development

Recommend current branch / current working tree when:

- The task is small
- The task is documentation-only
- The current branch is already dedicated to this task
- The user explicitly wants to continue in the current workspace
- Implementation has already started and code is dirty
- The change is a `/fix` task, the workspace is clean, and the risk is low

If implementation has already started and code is dirty, default to continuing the current workspace. Do not move dirty implementation work to a worktree unless the user explicitly asks and accepts the migration risk.

## Worktree Naming Rule

When the user chooses a task-specific worktree, the agent must use:

- Branch: `task/<task-id>`
- Worktree path: `.worktrees/<task-id>`

Example:

```text
Branch: task/06-23-customer-safety-education
Worktree: .worktrees/06-23-customer-safety-education
```

The agent must not create task worktrees outside `.worktrees/`.

Forbidden legacy paths:

```text
.trellis/worktrees/<task-id>
../<repo>-worktrees/<task-id>
../<repo>-<task-id>
/tmp/<task-id>
```

If the user explicitly asks for a different path, stop and warn that the project default is `.worktrees/<task-id>`, then ask for confirmation before using the custom path.

## Gitignore Rule

Before creating `.worktrees/<task-id>`, check whether `.gitignore` contains:

```gitignore
.worktrees/
```

If missing, ask the user whether to add it.

Do not silently edit `.gitignore`.

Do not automatically create `.worktrees/` or modify `.gitignore` before the user chooses the worktree option.

## Planning Artifact Rule

Before creating a task worktree, check whether the current workspace has uncommitted Trellis planning/design/task artifacts, such as:

- `.trellis/tasks/<task-id>/prd.md`
- `.trellis/tasks/<task-id>/design.md`
- `.trellis/tasks/<task-id>/implement.md`
- `.trellis/tasks/<task-id>/task.json`
- `.trellis/tasks/<task-id>/implement.jsonl`
- `.trellis/tasks/<task-id>/check.jsonl`

If these artifacts are uncommitted, warn the user with this exact prompt before creating the worktree:

```text
当前工作区存在未提交的 Trellis planning/design/task 产物。
如果现在创建新 worktree，这些未提交文件不会自动带过去。

请选择：

A. 继续在当前工作区开发
B. 我先处理这些未提交文件，再切 worktree
C. 仍然创建 worktree，但我知道需要手动迁移/提交相关文件
```

Do not create or switch to the worktree until the user answers.

Do not commit these artifacts automatically.

## Implementation Already Started Rule

If the task has already entered implementation and the current workspace has code changes:

- Default recommendation: continue in the current workspace.
- Do not automatically switch to a worktree.
- If the user insists on switching, remind them that uncommitted code changes will not automatically appear in the new worktree and must be migrated manually or committed first.

## Fast Path Fix

For `/fix`, follow `fast-path-change-policy.md`. Fast Path Fix is intended for small current-workspace changes. If the current workspace is not safe for the fix, stop and ask the user to use `/coding <task-id>` for a prepared full Trellis task, or retry after the workspace is clean.

## Forbidden

Do not do any of the following before the user chooses:

- Create a worktree
- Create `.worktrees/`
- Edit `.gitignore`
- Switch branch
- Start implementation for a full `/coding` task
- Modify code
- Push
- Merge
- Rebase
- Run finish-work
