# trellis-codex-review-kit

`trellis-codex-review-kit` installs local Trellis + Claude Code + Codex Review workflow files into a project.

It is a small Node.js CLI package with no runtime dependencies. It does not replace Trellis, Claude Code, or Codex CLI. It only copies versionable project files so Claude Code can implement work and Codex CLI can review the local git diff in a repeatable way.

This kit is local-only. It does not create GitHub Actions, does not push, does not merge, and does not run Codex Review during installation.

[中文 README](README.zh-CN.md)

## What It Installs

Running `trellis-codex-review-kit init` installs the Markdown templates on every platform and installs review scripts for the host OS:

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh          # macOS/Linux
.trellis/scripts/codex-rereview.sh        # macOS/Linux
.trellis/scripts/codex-review.ps1         # Windows
.trellis/scripts/codex-rereview.ps1       # Windows
.claude/commands/dev.md
```

On non-Windows hosts, `init` installs the Bash `.sh` scripts. On Windows hosts, it installs the native PowerShell `.ps1` scripts instead.

The installed files should be committed into the target project so the workflow is stable, reviewable, and editable by the team.

## Prerequisites

- Node.js
- git
- Trellis
- Claude Code
- Codex CLI available as `codex`
- macOS/Linux for the installed Bash `.sh` review scripts
- Windows PowerShell 5.1+ or PowerShell 7+ for the installed `.ps1` review scripts

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
/dev 新需求：实现 xxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

The `新需求：` prefix is useful for clarity, but it is not required. Any explicit implementation request after `/dev` triggers the default delivery flow. Shorter examples:

```text
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

The default delivery flow is built into the `/dev` command template: after implementation, generate the handoff, commit locally, run local Codex Review, and stop before push or finish-work.

If you do not use `/dev`, this kit does not require the Codex Review gate. For a small bug fix or scoped local edit, use your normal project workflow unless you explicitly ask Claude Code to run Codex Review.

Claude Code should, for `/dev` requests:

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

For `/dev` requests or explicit Codex-gated work, the recommended task-branch or worktree flow is:

1. Work in the task branch/worktree.
2. Commit implementation to the current worktree branch.
3. Run Codex Review from the same worktree.
4. Fix P0/P1 findings only by default.
5. Run Codex Re-Review.
6. Merge back only after Codex Review passes and the user explicitly authorizes the merge.

For non-`/dev` work that does not explicitly enable the Codex gate, use the normal project worktree flow. Do not auto-generate a handoff, auto-commit, or run Codex Review.

Do not auto-merge or auto-resolve conflicts in any workflow.

## Scripts

`init` installs OS-native review scripts. Use the command that matches the files installed in your project.

### Initial Review

macOS/Linux:

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<task>
```

Windows PowerShell:

```powershell
.\.trellis\scripts\codex-review.ps1 .trellis/tasks/<task>
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

macOS/Linux:

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Windows PowerShell:

```powershell
.\.trellis\scripts\codex-rereview.ps1 .trellis/tasks/<task>
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
- Claude Code fixes P0/P1 issues by default when the Codex Review gate is active.
- For `/dev` requests or explicit Codex-gated work, `/trellis:finish-work` must wait until Codex Review passes or the user explicitly overrides the gate.

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

On macOS/Linux, reinstall or fix permissions:

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/scripts/codex-review.sh .trellis/scripts/codex-rereview.sh
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

test -f .trellis/spec/guides/claude-codex-review-workflow.md
test -f .trellis/spec/templates/codex-handoff-template.md
test -x .trellis/scripts/codex-review.sh
test -x .trellis/scripts/codex-rereview.sh
test -f .claude/commands/dev.md

# On Windows, verify the installed script files instead:
# Test-Path .trellis/scripts/codex-review.ps1
# Test-Path .trellis/scripts/codex-rereview.ps1
```
