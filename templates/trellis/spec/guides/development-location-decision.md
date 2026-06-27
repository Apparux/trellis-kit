# Development Location Decision Guide

## Goal

Before implementing a full Trellis task, the agent must let the user decide where the change should be developed.

The agent must not automatically choose between the current working tree and a task-specific git worktree.

## Required Decision Point

Before implementation or meaningful code changes for a full `/dev` task, ask the user:

> 这个任务要在当前分支/当前工作区开发，还是新建/切换到专用 git worktree 开发？

Provide two options:

1. Current branch / current working tree
2. Task-specific git worktree under `.worktrees/<task-id>`

## Required Context Before Asking

Before asking, collect and show:

* Current Trellis active task, if any
* Target task id, if the user specified one
* Current git branch
* Current working directory
* Existing git worktrees from `git worktree list`
* Whether the current working tree has uncommitted changes
* Whether `.gitignore` already ignores `.worktrees/`

## Decision Rules

The agent may recommend an option, but the user makes the final decision.

Recommend task-specific worktree when:

* The task is a new feature
* The task is large or risky
* The task changes database schema
* The task changes permissions/authentication
* The task touches multiple modules
* The current working tree has unrelated uncommitted changes
* The user may want optional external review in parallel
* The user needs isolated development

Recommend current branch / current working tree when:

* The task is small
* The task is documentation-only
* The current branch is already dedicated to this task
* The user explicitly wants to continue in the current workspace
* The change is a `/fix` task, the workspace is clean, and the risk is low

## Worktree Naming Rule

When the user chooses a task-specific worktree, the agent must use:

* Branch: `task/<task-id>`
* Worktree path: `.worktrees/<task-id>`

Example:

```text
Branch: task/06-23-customer-safety-education
Worktree: .worktrees/06-23-customer-safety-education
```

The agent must not create task worktrees outside `.worktrees/`.

The agent must not create task worktrees inside `.trellis/`.

The agent must not create `../<repo>-worktrees/`.

The agent must not create `../<repo>-<task-id>`.

If the user explicitly asks for a different path, stop and warn that the project default is `.worktrees/<task-id>`, then ask for confirmation before using the custom path.

## Gitignore Rule

The repository should ignore `.worktrees/`.

Before creating `.worktrees/<task-id>`, check whether `.gitignore` contains:

```gitignore
.worktrees/
```

If missing, ask the user whether to add it.

Do not silently edit `.gitignore`.

## Forbidden

Do not do any of the following before the user chooses:

* Create a worktree
* Switch branch
* Start implementation for a full `/dev` task
* Push
* Merge
* Rebase
* Run finish-work

For `/fix`, follow `fast-path-change-policy.md`. Fast Path Fix is intended for small current-workspace changes. If the current workspace is not safe for the fix, stop and ask the user to use `/dev` or retry after the workspace is clean.
