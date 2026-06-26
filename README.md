# trellis-codex-review-kit

`trellis-codex-review-kit` installs local Trellis + Claude Code workflow files into a project.

It is a small Node.js CLI package with no runtime dependencies. It does not replace Trellis, Claude Code, or Codex CLI. It only copies versionable project files so Claude Code can implement work following the Trellis workflow, with optional Review Handoff for manual external review.

This kit is local-only. It does not create GitHub Actions, does not push, does not merge, and does not run Codex Review during installation.

[中文 README](README.zh-CN.md)

## What It Installs

Running `trellis-codex-review-kit init` installs the Markdown templates on every platform and installs review scripts for the host OS:

```text
.trellis/spec/guides/review-handoff-workflow.md
.trellis/spec/templates/review-handoff-template.md
.trellis/spec/guides/development-location-decision.md
.trellis/spec/guides/fast-path-change-policy.md
.trellis/spec/scripts/codex-review.sh          # macOS/Linux
.trellis/spec/scripts/codex-rereview.sh        # macOS/Linux
.trellis/spec/scripts/codex-review.ps1         # Windows
.trellis/spec/scripts/codex-rereview.ps1       # Windows
.claude/commands/dev.md
.claude/commands/task.md
.claude/commands/fix.md
```

On non-Windows hosts, `init` installs the Bash `.sh` scripts. On Windows hosts, it installs the native PowerShell `.ps1` scripts instead.

The installed files should be committed into the target project so the workflow is stable, reviewable, and editable by the team.

## Prerequisites

- Node.js
- git
- Trellis
- Claude Code
- Codex CLI available as `codex` (optional; only needed if the user chooses to run Codex Review manually)
- macOS/Linux for the installed Bash `.sh` review scripts
- Windows PowerShell 5.1+ or PowerShell 7+ for the installed `.ps1` review scripts

## Install Package

From this package repository (local development install):

```bash
npm install -g .
```

From npm (remote install):

```bash
npm install -g trellis-codex-review-kit
```

If you do not want a global install, you can also run the published CLI through `npx`:

```bash
npx trellis-codex-review-kit init
```

Verify:

```bash
trellis-codex-review-kit --help
trellis-codex-review-kit --version
```

## Install Into a Project

Example setup flow:

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-codex-review-kit init
```

Preview without writing:

```bash
trellis-codex-review-kit init --dry-run
```

If you intentionally want to reinstall during init and overwrite existing files:

```bash
trellis-codex-review-kit init --force
```

Preview overwrite actions without writing:

```bash
trellis-codex-review-kit init --force --dry-run
```

For routine updates to already installed kit files, use `update` instead of `init --force`; see [Updating Installed Files](#updating-installed-files).

By default, `init` skips existing files:

```text
SKIP existing: .claude/commands/dev.md
```

## Daily Workflow

### `/dev` — Full Trellis Workflow

`/dev` runs the full Trellis workflow. Before implementation, it asks whether to develop in the current working tree or in a task-specific worktree under `.worktrees/<task-id>`. After implementation, it follows the native Trellis check flow. Then it asks whether to generate a Review Handoff Markdown file for optional manual external review. It does not automatically run Codex Review, Claude Review, or any reviewer.

Start new feature work in Claude Code:

```text
/dev 新需求：实现 xxx
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

For `/dev` requests, Claude Code should:

1. Read `.trellis/workflow.md` and relevant `.trellis/spec/` files.
2. Check whether the request qualifies for Fast Path; if so, suggest `/fix` instead.
3. Create or confirm a Trellis task.
4. Write the task PRD/design/implementation artifacts required by Trellis.
5. Ask the user to choose development location: current workspace or `.worktrees/<task-id>`.
6. Implement the task.
7. Run Trellis native check.
8. Ask whether to generate Review Handoff Markdown.
9. Stop — the user decides whether to review, commit, push, or finish-work.

### `/fix` — Fast Path Fix

`/fix` is for small bug fixes, small adjustments, and low-risk patches. It does not create a full Trellis task, does not create PRD/DESIGN/TASK documents, does not generate a Review Handoff by default, does not commit, and does not run review by default.

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/task` — Continue Existing Task

Continue a specific existing Trellis task by directory name or suffix:

```text
/task 06-24-school-operation-log
/task school-operation-log
```

When `/task` resumes an in-progress full Trellis task, it preserves the same post-check Review Handoff decision as `/dev`: after implementation and Trellis native check, it asks whether to skip, generate now, or generate later. It does not automatically run reviewers or review scripts.

### `/trellis:continue` — Continue Interrupted Work

Continue work with the current active task:

```text
/trellis:continue
```

## Development Location

Before implementation for a full `/dev` task, the user chooses:

1. Current branch / current working tree
2. Task-specific git worktree

If a worktree is chosen, the fixed path is:

```text
.worktrees/<task-id>
```

The fixed branch name is:

```text
task/<task-id>
```

Example:

```text
.worktrees/06-23-customer-safety-education
task/06-23-customer-safety-education
```

The agent shows status and provides a recommendation, but the user makes the final decision.

Worktrees must not be created in:

```text
.trellis/worktrees/
../<repo>-worktrees/
../<repo>-<task-id>
/tmp/
```

It is recommended that the target project `.gitignore` includes:

```gitignore
.worktrees/
```

## Review Handoff

Review Handoff Markdown is an optional handoff document for manual external review. It is not a replacement for Trellis native check.

Generating a Review Handoff does not imply automatic review.

The user may choose to:

* Skip and only receive an implementation summary
* Generate and review personally
* Generate and hand off to Codex
* Generate and hand off to Claude
* Generate and hand off to a human reviewer
* Generate and use other tools
* Generate later

## Review Scripts

The installed Codex Review scripts are optional manual tools:

* Not automatically executed by `/dev`, `/task`, or `/fix`
* Users run them manually when they choose
* Not described as a mandatory Delivery Gate
* Not described as the default workflow

### Initial Review (manual)

macOS/Linux:

```bash
.trellis/spec/scripts/codex-review.sh .trellis/tasks/<task>
```

Windows PowerShell:

```powershell
.\.trellis\spec\scripts\codex-review.ps1 .trellis/tasks/<task>
```

### Re-Review (manual)

macOS/Linux:

```bash
.trellis/spec/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Windows PowerShell:

```powershell
.\.trellis\spec\scripts\codex-rereview.ps1 .trellis/tasks/<task>
```

## Safety Rules

The installer does not:

- Modify `.trellis/workflow.md`.
- Run `trellis init`.
- Install Trellis, Claude Code, or Codex CLI.
- Run Codex Review during installation.
- Delete files by default; only `update --prune-old` deletes the four documented legacy review scripts under `.trellis/scripts/`.
- Overwrite files unless `--force` is used with `init` or `update` is used intentionally.
- Push, merge, or rebase.
- Modify remote repositories.
- Create `.worktrees/` directory.
- Modify target project `.gitignore`.

The installed workflow tells Claude Code:

- Claude Code implements and fixes.
- Trellis native check is the default verification.
- Review Handoff is optional and user-controlled.
- External review is user-controlled.
- The user decides whether to commit, push, merge, or finish-work.

## Updating Installed Files

Use `update` when the kit is already installed in a project and you want to refresh the installed templates from the current package version:

```bash
trellis-codex-review-kit update
```

`update` overwrites installed kit files with the packaged templates. Review local customizations before running it.

If you are migrating from a version that installed review scripts under `.trellis/scripts/`, explicitly prune those old script files after installing the new `.trellis/spec/scripts/` files:

```bash
trellis-codex-review-kit update --prune-old
```

`--prune-old` deletes only these legacy files when they exist:

```text
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.trellis/scripts/codex-review.ps1
.trellis/scripts/codex-rereview.ps1
```

Use dry run first when unsure:

```bash
trellis-codex-review-kit update --dry-run
trellis-codex-review-kit update --dry-run --prune-old
```

## Migration Notes

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

### `codex: command not found`

Install Codex CLI and ensure `codex` is on `PATH`:

```bash
codex --version
```

### `.trellis directory not found`

Initialize Trellis in the target project first:

```bash
trellis init -u amin --claude --codex
```

The installer warns about missing `.trellis`, but it does not fail because some users may prepare directories manually.

### Script permission denied

On macOS/Linux, reinstall or fix permissions:

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/spec/scripts/codex-review.sh .trellis/spec/scripts/codex-rereview.sh
```

On Windows PowerShell, if execution policy blocks local scripts, run from an approved shell or use a policy appropriate for your machine, such as `RemoteSigned`, according to your organization's rules.

### Not inside git work tree

Run review scripts from inside a git repository/worktree. Codex Review depends on the local git diff.

## Local Manual Test Outline

```bash
npm install -g .
trellis-codex-review-kit --help
trellis-codex-review-kit --version

rm -rf /tmp/tcrk-test
mkdir /tmp/tcrk-test
cd /tmp/tcrk-test
git init
mkdir -p .trellis .claude
trellis-codex-review-kit init

test -f .trellis/spec/guides/review-handoff-workflow.md
test -f .trellis/spec/templates/review-handoff-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -x .trellis/spec/scripts/codex-review.sh
test -x .trellis/spec/scripts/codex-rereview.sh
test -f .claude/commands/dev.md
test -f .claude/commands/task.md
test -f .claude/commands/fix.md

# On Windows, verify the installed script files instead:
# Test-Path .trellis/spec/scripts/codex-review.ps1
# Test-Path .trellis/spec/scripts/codex-rereview.ps1
```
