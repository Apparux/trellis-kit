# PRD: trellis-codex-review-kit

## 1. Product Name

`trellis-codex-review-kit`

## 2. Background

Users who use Trellis, Claude Code, and Codex often want a repeatable workflow:

1. Claude Code creates or continues Trellis tasks.
2. Claude Code implements code.
3. Claude Code generates a Codex Review handoff.
4. Claude Code commits implementation locally.
5. Codex CLI reviews the current git diff in non-interactive mode.
6. Codex writes review results back into the current Trellis task.
7. Claude Code fixes only P0/P1 issues.
8. Codex re-reviews the fix.
9. Claude Code runs `finish-work` only after Codex Review passes.

Currently, setting this up requires manually copying multiple Markdown files, Claude Code command files, and shell scripts into every project. This is repetitive and error-prone.

`trellis-codex-review-kit` provides a reusable local installer that injects the required Trellis specs, templates, scripts, and Claude Code command into any project.

## 3. Goal

Create a small CLI tool that installs the local Trellis + Claude Code + Codex Review workflow files into a target project.

After installation, a project should support this workflow:

```text
/dev 新需求：xxxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

Then, after interruptions or new sessions:

```text
/trellis:continue
```

The workflow should be preserved through files committed into the project:

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.claude/commands/dev.md
```

## 4. Target Users

Primary users:

- Developers using Trellis with Claude Code.
- Developers using Codex CLI for local code review.
- Users who want Claude Code to write code and Codex to review code.
- Users who want a reusable setup across many projects.

Secondary users:

- Teams using Trellis specs as persistent project workflow rules.
- Developers using git worktrees for task branches.

## 5. User Stories

### 5.1 Install Review Workflow

As a developer, I want to run one command in a project, so that all required Trellis + Codex Review files are installed automatically.

Example:

```bash
trellis-codex-review-kit init
```

Expected output:

```text
CREATE .trellis/spec/guides/claude-codex-review-workflow.md
CREATE .trellis/spec/templates/codex-handoff-template.md
CREATE .trellis/scripts/codex-review.sh
CREATE .trellis/scripts/codex-rereview.sh
CREATE .claude/commands/dev.md
Installed Trellis Codex Review Kit.
```

### 5.2 Avoid Overwriting Existing Files

As a developer, I want the installer to skip existing files by default, so that project-specific modifications are not overwritten.

Default behavior:

```text
SKIP existing: .claude/commands/dev.md
```

### 5.3 Force Reinstall

As a developer, I want a `--force` option, so that I can overwrite previously installed files with the latest template version.

Example:

```bash
trellis-codex-review-kit init --force
```

### 5.4 Dry Run

As a developer, I want a `--dry-run` option, so that I can preview what files would be written before changing the project.

Example:

```bash
trellis-codex-review-kit init --dry-run
```

Expected behavior:

- No files are modified.
- The CLI prints what would be created, overwritten, or skipped.

### 5.5 Local Codex Review

As a developer, I want the installed `codex-review.sh` script to run Codex CLI locally using `codex exec`, so that Codex can review the current git diff without opening an interactive Codex session.

Example:

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/2026-06-24-example-task
```

Expected output file:

```text
.trellis/tasks/2026-06-24-example-task/reviews/codex-review-1.md
```

### 5.6 Local Codex Re-Review

As a developer, I want the installed `codex-rereview.sh` script to run a second review after Claude Code fixes P0/P1 issues.

Example:

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/2026-06-24-example-task
```

Expected output file:

```text
.trellis/tasks/2026-06-24-example-task/reviews/codex-review-2.md
```

### 5.7 Claude Code Command

As a developer, I want a `.claude/commands/dev.md` file installed, so that `/dev 新需求：xxxx` becomes the standard new-demand entrypoint.

The command should:

- Read Trellis workflow and specs.
- Create or confirm a Trellis task.
- Generate PRD/design/implementation artifacts.
- Add a Delivery Gate to the task.
- Require Codex handoff and review before finish-work.

## 6. In Scope

The first version must include:

1. Node.js CLI package.
2. Executable command:

   ```bash
   trellis-codex-review-kit init
   ```

3. Options:
   - `--force`
   - `--dry-run`
   - `--help`
   - `--version`

4. Template files:
   - `.trellis/spec/guides/claude-codex-review-workflow.md`
   - `.trellis/spec/templates/codex-handoff-template.md`
   - `.trellis/scripts/codex-review.sh`
   - `.trellis/scripts/codex-rereview.sh`
   - `.claude/commands/dev.md`

5. Safe default behavior:
   - Create missing directories.
   - Skip existing files unless `--force` is used.
   - Mark shell scripts as executable.
   - Warn if the current directory does not appear to be a git repo.
   - Warn if `.trellis/` does not exist.
   - Warn if `.claude/` does not exist.

6. Documentation:
   - README with installation and usage.
   - Example setup flow.
   - Example daily workflow.

## 7. Out of Scope

The first version does not need to:

1. Modify `.trellis/workflow.md`.
2. Run `trellis init`.
3. Install Trellis.
4. Install Claude Code.
5. Install Codex CLI.
6. Call GitHub Actions.
7. Push to remote repositories.
8. Merge or rebase branches.
9. Automatically detect active Trellis task in the installer.
10. Automatically run Codex Review during installation.
11. Provide a GUI.

## 8. Functional Requirements

### FR-1: CLI Entrypoint

The package must expose a command:

```bash
trellis-codex-review-kit
```

Supported subcommand:

```bash
trellis-codex-review-kit init
```

Supported options:

```bash
--force
--dry-run
--help
--version
```

### FR-2: Template Copying

The `init` command must copy bundled template files into the current working directory.

Mapping:

```text
templates/trellis/spec/guides/claude-codex-review-workflow.md
→ .trellis/spec/guides/claude-codex-review-workflow.md

templates/trellis/spec/templates/codex-handoff-template.md
→ .trellis/spec/templates/codex-handoff-template.md

templates/trellis/scripts/codex-review.sh
→ .trellis/scripts/codex-review.sh

templates/trellis/scripts/codex-rereview.sh
→ .trellis/scripts/codex-rereview.sh

templates/claude/commands/dev.md
→ .claude/commands/dev.md
```

### FR-3: Non-Destructive Default

If a target file already exists and `--force` is not provided, the installer must skip that file.

### FR-4: Force Overwrite

If `--force` is provided, the installer must overwrite existing files.

### FR-5: Dry Run

If `--dry-run` is provided, the installer must not modify the file system and must print planned actions.

### FR-6: Executable Scripts

Installed shell scripts must be executable:

```text
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
```

Mode should be `755` where supported.

### FR-7: Project Warnings

The CLI should warn, but not fail, when:

- `.git` is missing.
- `.trellis` is missing.
- `.claude` is missing.

### FR-8: Review Script Behavior

`codex-review.sh` must:

1. Accept a task path argument:

   ```bash
   .trellis/scripts/codex-review.sh .trellis/tasks/<task>
   ```

2. Validate:
   - task path exists
   - handoff file exists
   - current directory is inside a git work tree
   - Codex CLI is available

3. Run:

   ```bash
   codex exec "<prompt>"
   ```

4. Save output to:

   ```text
   <task>/reviews/codex-review-1.md
   ```

5. Never modify business code.

### FR-9: Re-Review Script Behavior

`codex-rereview.sh` must:

1. Accept a task path argument.
2. Validate:
   - task path exists
   - first review exists
   - fix notes exist
   - current directory is inside a git work tree
   - Codex CLI is available

3. Run Codex CLI using `codex exec`.
4. Save output to:

   ```text
   <task>/reviews/codex-review-2.md
   ```

5. Focus only on:
   - whether previous P0 issues were fixed
   - whether previous P1 issues were fixed
   - whether new blocking issues were introduced

### FR-10: README

README must include:

- What this package does.
- Installation.
- Usage.
- Installed files.
- Daily workflow.
- Worktree workflow.
- Safety rules.
- Troubleshooting.

## 9. Non-Functional Requirements

### NFR-1: Simple Implementation

Use plain Node.js standard library. Avoid unnecessary dependencies.

### NFR-2: Cross-Platform

The installer should work on macOS, Linux, and Windows.

The installed `.sh` scripts are primarily for macOS/Linux/WSL. README must mention this.

### NFR-3: Safe by Default

The tool must not:

- Push code.
- Merge branches.
- Rebase branches.
- Modify `.trellis/workflow.md`.
- Delete files.
- Overwrite files unless `--force` is used.
- Run Codex Review during install.

### NFR-4: Versionable

Generated files should be committed into the target project, so the workflow is stable and reviewable.

### NFR-5: Human-Readable

All generated Markdown files should be easy to read and edit.

## 10. Acceptance Criteria

### AC-1: Fresh Project Install

Given a project with `.git`, `.trellis`, and `.claude`, when running:

```bash
trellis-codex-review-kit init
```

then all expected files are created.

### AC-2: Existing File Skip

Given `.claude/commands/dev.md` already exists, when running:

```bash
trellis-codex-review-kit init
```

then that file is skipped and not overwritten.

### AC-3: Force Overwrite

Given `.claude/commands/dev.md` already exists, when running:

```bash
trellis-codex-review-kit init --force
```

then that file is overwritten.

### AC-4: Dry Run No Writes

Given no installed files exist, when running:

```bash
trellis-codex-review-kit init --dry-run
```

then no files are created.

### AC-5: Scripts Are Executable

After install on macOS/Linux:

```bash
test -x .trellis/scripts/codex-review.sh
test -x .trellis/scripts/codex-rereview.sh
```

passes.

### AC-6: Review Script Validates Missing Handoff

Given a task path without `reviews/codex-handoff.md`, when running:

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/example
```

then the script exits non-zero with a clear error.

### AC-7: Re-Review Script Validates Missing Fix Notes

Given a task path without `reviews/claude-fix-notes.md`, when running:

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/example
```

then the script exits non-zero with a clear error.

### AC-8: README Includes Daily Flow

README must document:

```text
/dev 新需求：xxxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
/trellis:continue
```

## 11. Risks

### Risk 1: Codex CLI Command Changes

Codex CLI syntax may change.

Mitigation:

- Keep `codex exec` usage isolated in scripts.
- Document expected Codex CLI availability.
- Allow users to edit scripts in each project.

### Risk 2: Claude Code Does Not Fully Follow Rules

Claude Code may not always follow installed specs.

Mitigation:

- Put rules in `.trellis/spec/`.
- Put Delivery Gate into task PRD or implement file.
- Keep `/dev` command simple and explicit.

### Risk 3: Overwriting User Customizations

Users may customize installed files.

Mitigation:

- Skip existing files by default.
- Provide `--force` only for explicit overwrite.
- Print all file actions.

## 12. Future Enhancements

Potential future versions:

1. `trellis-codex-review-kit doctor`
   - Check Trellis, Claude command, Codex CLI, scripts, permissions.

2. `trellis-codex-review-kit update`
   - Show diffs before updating installed files.

3. `--profile`
   - Install different review profiles.

4. Windows PowerShell scripts:
   - `codex-review.ps1`
   - `codex-rereview.ps1`

5. Template checksum tracking.

6. Interactive install.

## 13. Final Product Summary

`trellis-codex-review-kit` is a lightweight local installer that gives any Trellis project a standardized Claude Code implementation + Codex CLI local review workflow.

It does not replace Trellis, Claude Code, or Codex. It installs the project-level workflow files that make them work together consistently.
