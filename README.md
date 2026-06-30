# Trellis Kit

Trellis Kit does not replace Trellis native workflow. It adds focused Claude commands around it:

- `/task <task-id>`: switch/start/continue a Trellis task and decide the development location before implementation.
- `/fix <request>`: lightweight fast path for small fixes.
- `/handoff`: manually generate Review Handoff Markdown when requested.
- `/spec-cleanup`: automatically clean, archive, deprecate, and consolidate `.trellis/spec/`.

It is a small Node.js CLI package with no runtime dependencies. This kit is local-only. It does not create GitHub Actions, does not push, does not merge, and does not run Codex Review during installation.

[中文 README](README.zh-CN.md)

## Rename Notice

This project was previously named `trellis-codex-review-kit`.

The new package and CLI name is `trellis-kit`.

If you installed the old package globally, uninstall it first:

```bash
npm uninstall -g trellis-codex-review-kit
npm install -g trellis-kit
```

If your project still references the old command, replace:

```bash
trellis-codex-review-kit
```

with:

```bash
trellis-kit
```

## What It Installs

Running `trellis-kit init` installs Markdown templates and Claude command templates:

```text
.trellis/spec/guides/review-handoff-workflow.md
.trellis/spec/templates/review-handoff-template.md
.trellis/spec/guides/development-location-decision.md
.trellis/spec/guides/fast-path-change-policy.md
.trellis/spec/guides/spec-cleanup-guide.md
.claude/commands/task.md
.claude/commands/fix.md
.claude/commands/handoff.md
.claude/commands/spec-cleanup.md
```

The installed files should be committed into the target project so the workflow is stable, reviewable, and editable by the team.

## Prerequisites

- Node.js
- git
- Trellis
- Claude Code
- Codex CLI available as `codex` (optional; only needed if the user independently chooses to use Codex for manual external review)

## Install Package

From this package repository (local development install):

```bash
npm install -g .
```

From npm (remote install):

```bash
npm install -g trellis-kit
```

If you do not want a global install, you can also run the published CLI through `npx`:

```bash
npx trellis-kit init
```

Verify:

```bash
trellis-kit --help
trellis-kit --version
```

## Local Development

Run the CLI directly from this repository:

```bash
node bin/trellis-kit.js --help
node bin/trellis-kit.js init --dry-run
```

## Install Into a Project

Example setup flow:

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-kit init
```

Preview without writing:

```bash
trellis-kit init --dry-run
```

If you intentionally want to reinstall during init and overwrite existing files:

```bash
trellis-kit init --force
```

Preview overwrite actions without writing:

```bash
trellis-kit init --force --dry-run
```

For routine updates to already installed kit files, use `update` instead of `init --force`; see [Updating Installed Files](#updating-installed-files).

By default, `init` skips existing files:

```text
SKIP existing: .claude/commands/task.md
```

## Daily Workflow

### `/task <task-id>` — Full Trellis Task Entrypoint

Use `/task <task-id>` for prepared Trellis tasks. It resolves the current or requested task, switches only after exactly one match is found, reads the development-location guide, asks whether to use the current workspace or `.worktrees/<task-id>` before implementation when needed, and then continues native `/trellis:continue` phase routing.

```text
/task 06-24-school-operation-log
/task school-operation-log
```

`/task` does not create a new task, does not load all of `.trellis/spec/` by default, does not automatically generate Review Handoff, and does not review, commit, push, merge, rebase, or finish-work.

### `/fix <request>` — Fast Path Fix

Use `/fix` for small bug fixes, small adjustments, and low-risk patches in the current workspace. It does not create a full Trellis task, does not create PRD/DESIGN/TASK documents, does not generate Review Handoff by default, does not commit, and does not run review by default.

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/handoff` — Manual Review Handoff

Use `/handoff` when you want Claude Code to generate a Review Handoff Markdown file for the active Trellis task.

```text
/handoff
```

It confirms the active task, reads the handoff workflow guide and template, collects changed files, checks, risks, and summary information, writes the Markdown handoff, and returns the path. `/handoff` generates a Review Handoff Markdown file with a Review Scope and a Suggested Review Prompt. The default Review Scope is the local working tree changes, including staged changes, unstaged changes, and task-related untracked files. It does not run reviewers or commit.

### `/spec-cleanup` — Spec Cleanup

`/spec-cleanup` automatically audits, safely organizes, and consolidates `.trellis/spec/`. It keeps active guides, archives historical task specs, deprecates replaced workflow rules, merges low-risk duplicate specs into canonical guides, updates references to canonical files, and removes stale broad spec-loading wording without overriding Trellis-native context selection. It asks for confirmation before destructive, ambiguous, conflicting, or behavior-changing actions.

```text
/spec-cleanup
```

## Selective Spec Loading

Commands should not blindly load the entire `.trellis/spec/` directory by default. `/task` and `/fix` rely on native Trellis workflow, task context, and spec indexes to decide which project rules are relevant. `/spec-cleanup` reads its cleanup guide first, then lists and selectively analyzes `.trellis/spec/` for cleanup decisions.

## Development Location

Worktree selection happens inside `/task`, before implementation.

If the user chooses a task-specific worktree, Trellis Kit uses:

```text
.worktrees/<task-id>
```

with branch:

```text
task/<task-id>
```

Before creating a task worktree, the agent verifies `.gitignore` contains `.worktrees/`; if missing, it asks before adding it. If Trellis planning/design/task artifacts are uncommitted, it warns before creating the worktree. If implementation has already started and code is dirty, it defaults to continuing the current workspace.

Worktrees must not be created in:

```text
.trellis/worktrees/
../<repo>-worktrees/
../<repo>-<task-id>
/tmp/
```

## Review Handoff

Review Handoff Markdown is an optional handoff document for manual external review. It is not a replacement for Trellis native check.

`/handoff` generates a Review Handoff Markdown file with a Review Scope and a Suggested Review Prompt. The default Review Scope is the local working tree changes, including staged changes, unstaged changes, and task-related untracked files.

Generating a Review Handoff does not imply automatic review. The user may choose to skip, generate and review personally, hand off to Codex, hand off to Claude, send to a human reviewer, use another tool, or generate later.

## Manual External Review

This kit does not install bundled review scripts.

Review Handoff Markdown is the portable handoff artifact. The user may paste the Suggested Review Prompt into Codex, Claude, another reviewer, or send it to a human reviewer manually.

No command in this kit runs an external reviewer automatically.

## Safety Rules

The installer does not:

- Modify `.trellis/workflow.md`.
- Run `trellis init`.
- Install Trellis, Claude Code, or Codex CLI.
- Run Codex Review during installation.
- Delete files by default; only `update --prune-old` deletes the documented legacy review scripts under `.trellis/scripts/` and `.trellis/spec/scripts/`, plus old renamed templates under `.trellis/spec/`.
- Delete older target-project Claude command files.
- Overwrite files unless `--force` is used with `init` or `update` is used intentionally.
- Push, merge, or rebase.
- Modify remote repositories.
- Create `.worktrees/` directory.
- Modify target project `.gitignore`.

The installed workflow tells Claude Code:

- Claude Code implements prepared tasks and fixes.
- Trellis native check is the default verification.
- Review Handoff is optional and user-controlled.
- External review is user-controlled.
- The user decides whether to commit, push, merge, or finish-work.

## Updating Installed Files

Use `update` when the kit is already installed in a project and you want to refresh the installed templates from the current package version:

```bash
trellis-kit update
```

`update` overwrites installed kit files with the packaged templates. Review local customizations before running it.

If you are migrating from a version that installed review scripts under `.trellis/scripts/` or `.trellis/spec/scripts/`, or old renamed Review Handoff templates under `.trellis/spec/`, explicitly prune those old files after installing the current files:

```bash
trellis-kit update --prune-old
```

`--prune-old` deletes only these legacy files when they exist:

```text
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.trellis/scripts/codex-review.ps1
.trellis/scripts/codex-rereview.ps1
.trellis/spec/scripts/codex-review.sh
.trellis/spec/scripts/codex-rereview.sh
.trellis/spec/scripts/codex-review.ps1
.trellis/spec/scripts/codex-rereview.ps1
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
```

Use dry run first when unsure:

```bash
trellis-kit update --dry-run
trellis-kit update --dry-run --prune-old
```

## Migration Notes

### Claude Command Surface

Older versions may have installed `.claude/commands/dev.md`. Remove it manually if it exists.

### File Renames (v0.5.0)

The following template files were renamed:

| Old Name | New Name |
|----------|----------|
| `.trellis/spec/guides/claude-codex-review-workflow.md` | `.trellis/spec/guides/review-handoff-workflow.md` |
| `.trellis/spec/templates/codex-handoff-template.md` | `.trellis/spec/templates/review-handoff-template.md` |

Projects installed with older kit versions may still have the old files. After upgrading, confirm no local customizations exist in the old files, then manually delete them to avoid conflicts with the new Review Handoff Workflow.

### Worktree Path Change

Older versions may have recommended worktree paths such as `../<repo>-worktrees/<task-id>`, `../<repo>-<task-id>`, or `.trellis/worktrees/<task-id>`. The current version uses only `.worktrees/<task-id>`.

## Troubleshooting

### `.trellis directory not found`

Initialize Trellis in the target project first:

```bash
trellis init -u amin --claude --codex
```

The installer warns about missing `.trellis`, but it does not fail because some users may prepare directories manually.

## Local Manual Test Outline

```bash
npm install -g .
trellis-kit --help
trellis-kit --version

rm -rf /tmp/trellis-kit-test
mkdir /tmp/trellis-kit-test
cd /tmp/trellis-kit-test
git init
mkdir -p .trellis .claude
trellis-kit init

test -f .trellis/spec/guides/review-handoff-workflow.md
test -f .trellis/spec/templates/review-handoff-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -f .trellis/spec/guides/spec-cleanup-guide.md
test -f .claude/commands/task.md
test -f .claude/commands/fix.md
test -f .claude/commands/handoff.md
test -f .claude/commands/spec-cleanup.md
```
