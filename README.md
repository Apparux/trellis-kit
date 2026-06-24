# trellis-codex-review-kit

`trellis-codex-review-kit` installs local Trellis + Claude Code + Codex Review workflow files into a project.

It is a small Node.js CLI package with no runtime dependencies. It does not replace Trellis, Claude Code, or Codex CLI. It only copies versionable project files so Claude Code can implement work and Codex CLI can review the local git diff in a repeatable way.

This kit is local-only. It does not create GitHub Actions, does not push, does not merge, and does not run Codex Review during installation.

[中文 README](README.zh-CN.md)

## What It Installs

Running `trellis-codex-review-kit init` installs:

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.claude/commands/dev.md
```

The installed files should be committed into the target project so the workflow is stable, reviewable, and editable by the team.

## Prerequisites

- Node.js
- git
- Trellis
- Claude Code
- Codex CLI available as `codex`
- macOS, Linux, or WSL for the installed `.sh` review scripts

Windows native PowerShell scripts are out of scope for this first version.

## Install Package

From this package repository:

```bash
npm install -g .
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

Overwrite previously installed files:

```bash
trellis-codex-review-kit init --force
```

Preview overwrite actions without writing:

```bash
trellis-codex-review-kit init --force --dry-run
```

By default, existing files are skipped:

```text
SKIP existing: .claude/commands/dev.md
```

## Daily Workflow

Start new work in Claude Code with `/dev`. Recommended form:

```text
/dev 新需求：实现 xxx
```

The `新需求：` prefix is useful for clarity, but it is not required. Any explicit implementation request after `/dev` triggers the default delivery flow. Examples:

```text
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

The default delivery flow is built into the `/dev` command template: after implementation, generate the handoff, commit locally, run local Codex Review, and stop before push or finish-work.

Claude Code should:

1. Read `.trellis/workflow.md` and relevant `.trellis/spec/` files.
2. Create or confirm a Trellis task.
3. Write the task PRD/design/implementation artifacts required by Trellis.
4. Add the Delivery Gate from `.claude/commands/dev.md`.
5. Implement the task.
6. Generate `.trellis/tasks/<task>/reviews/codex-handoff.md` from the installed handoff template.
7. Commit locally automatically.
8. Run local Codex Review automatically.
9. Fix P0/P1 issues by default.
10. Run Codex Re-Review when fixes were made.
11. Stop before push, merge, rebase, or finish-work unless explicitly authorized.

Continue interrupted work with:

```text
/trellis:continue
```

## Worktree Workflow

Recommended task-branch or worktree flow:

1. Work in the task branch/worktree.
2. Commit implementation to the current worktree branch.
3. Run Codex Review from the same worktree.
4. Fix P0/P1 findings only by default.
5. Run Codex Re-Review.
6. Merge back only after Codex Review passes and the user explicitly authorizes the merge.

Do not auto-merge before Codex Review passes. Do not auto-resolve conflicts.

## Scripts

### Initial Review

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<task>
```

Required before running:

```text
.trellis/tasks/<task>/reviews/codex-handoff.md
```

Output:

```text
.trellis/tasks/<task>/reviews/codex-review-1.md
```

### Re-Review

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Required before running:

```text
.trellis/tasks/<task>/reviews/codex-review-1.md
.trellis/tasks/<task>/reviews/claude-fix-notes.md
```

Output:

```text
.trellis/tasks/<task>/reviews/codex-review-2.md
```

## Safety Rules

The installer does not:

- Modify `.trellis/workflow.md`.
- Run `trellis init`.
- Install Trellis, Claude Code, or Codex CLI.
- Run Codex Review during installation.
- Delete files.
- Overwrite files unless `--force` is used.
- Push, merge, or rebase.
- Modify remote repositories.

The installed workflow tells Claude Code and Codex:

- Claude Code implements and fixes.
- Codex reviews only.
- Codex must not modify business code.
- Claude Code fixes P0/P1 issues by default.
- `/trellis:finish-work` must wait until Codex Review passes or the user explicitly overrides the gate.

## Updating Installed Files

Run:

```bash
trellis-codex-review-kit init --force
```

This overwrites installed kit files with the packaged templates. Review local customizations before using `--force`.

Use dry run first when unsure:

```bash
trellis-codex-review-kit init --force --dry-run
```

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

### Missing handoff

`codex-review.sh` requires:

```text
.trellis/tasks/<task>/reviews/codex-handoff.md
```

Create it from:

```text
.trellis/spec/templates/codex-handoff-template.md
```

### Missing fix notes

`codex-rereview.sh` requires:

```text
.trellis/tasks/<task>/reviews/claude-fix-notes.md
```

Write the P0/P1 fixes, changed files, and checks run before re-review.

### Script permission denied

Reinstall or fix permissions:

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/scripts/codex-review.sh .trellis/scripts/codex-rereview.sh
```

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

test -f .trellis/spec/guides/claude-codex-review-workflow.md
test -f .trellis/spec/templates/codex-handoff-template.md
test -x .trellis/scripts/codex-review.sh
test -x .trellis/scripts/codex-rereview.sh
test -f .claude/commands/dev.md
```
