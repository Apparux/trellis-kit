# DESIGN: trellis-codex-review-kit

## 1. Overview

`trellis-codex-review-kit` is a Node.js CLI package.

It installs a fixed set of workflow files into the current project:

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.claude/commands/dev.md
```

The package itself does not run Trellis, Claude Code, or Codex during installation. It only copies templates and sets executable permissions.

The installed shell scripts later call Codex CLI using `codex exec`.

## 2. Design Goals

1. Simple to install.
2. Safe by default.
3. No accidental overwrite.
4. No automatic remote operations.
5. Easy to inspect and customize.
6. Easy to commit into target projects.
7. Minimal dependencies.
8. Works locally without GitHub Actions.

## 3. Non-Goals

The package will not:

1. Modify `.trellis/workflow.md`.
2. Create Trellis tasks.
3. Run `/dev`.
4. Run `/trellis:continue`.
5. Automatically run Codex Review during installation.
6. Install Codex CLI.
7. Install Claude Code.
8. Push or merge git branches.
9. Implement a GUI.

## 4. Technology Choices

### 4.1 Runtime

Use Node.js.

Recommended package type:

```json
{
  "type": "module"
}
```

Reason:

- Easy npm global install.
- Cross-platform installer.
- Good file-system support.
- No extra dependencies needed.

### 4.2 Dependencies

Use Node.js standard library only:

```js
fs
path
process
url
```

No external dependencies for v0.1.

### 4.3 Shell Scripts

Installed review scripts are Bash scripts:

```text
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
```

Supported environments:

- macOS
- Linux
- WSL

Windows native support is not required in v0.1.

## 5. Package Structure

Repository structure:

```text
trellis-codex-review-kit/
├── package.json
├── README.md
├── PRD.md
├── DESIGN.md
├── TASKS.md
├── bin/
│   └── trellis-codex-review-kit.js
└── templates/
    ├── trellis/
    │   ├── spec/
    │   │   ├── guides/
    │   │   │   └── claude-codex-review-workflow.md
    │   │   └── templates/
    │   │       └── codex-handoff-template.md
    │   └── scripts/
    │       ├── codex-review.sh
    │       └── codex-rereview.sh
    └── claude/
        └── commands/
            └── dev.md
```

Installed target project structure:

```text
target-project/
├── .trellis/
│   ├── spec/
│   │   ├── guides/
│   │   │   └── claude-codex-review-workflow.md
│   │   └── templates/
│   │       └── codex-handoff-template.md
│   └── scripts/
│       ├── codex-review.sh
│       └── codex-rereview.sh
└── .claude/
    └── commands/
        └── dev.md
```

## 6. CLI Interface

### 6.1 Command

```bash
trellis-codex-review-kit init
```

### 6.2 Options

```bash
--force
```

Overwrite existing target files.

```bash
--dry-run
```

Preview actions without writing.

```bash
--help
```

Print usage.

```bash
--version
```

Print package version.

### 6.3 Examples

Install:

```bash
trellis-codex-review-kit init
```

Preview:

```bash
trellis-codex-review-kit init --dry-run
```

Overwrite:

```bash
trellis-codex-review-kit init --force
```

Preview overwrite:

```bash
trellis-codex-review-kit init --force --dry-run
```

## 7. CLI Behavior

### 7.1 Startup Flow

1. Parse command and options.
2. If `--help`, print help and exit 0.
3. If `--version`, print package version and exit 0.
4. Validate command.
5. Resolve current working directory as install target.
6. Print project warnings.
7. Copy templates according to file mapping.
8. Set executable permissions for scripts.
9. Print next steps.

### 7.2 Project Warnings

The installer checks:

```text
.git
.trellis
.claude
```

Missing directories should produce warnings only. No warning should block installation.

Example:

```text
WARN: current directory does not contain .trellis
      Run `trellis init -u <name> --claude --codex` first if this is a new project.
```

### 7.3 File Copy Logic

For each file mapping:

```js
{
  from: "templates/...",
  to: ".trellis/...",
  executable: true | false
}
```

Perform:

1. Resolve source path relative to package root.
2. Resolve destination path relative to current working directory.
3. If source missing, fail with error.
4. If destination exists and `--force` is false:
   - print `SKIP existing: <path>`
   - do not modify
5. If destination exists and `--force` is true:
   - print `OVERWRITE <path>`
   - copy file
6. If destination does not exist:
   - print `CREATE <path>`
   - create parent directories
   - copy file
7. If `--dry-run` is true:
   - print `WOULD ...`
   - do not write
   - do not chmod

### 7.4 File Actions

Possible action labels:

```text
CREATE
OVERWRITE
SKIP existing
WOULD CREATE
WOULD OVERWRITE
WOULD SKIP existing
```

### 7.5 Exit Codes

```text
0 = success
1 = usage error, unknown command, missing template, or unexpected failure
```

Dry run success exits 0. Skipping existing files exits 0.

## 8. Template File Contents

### 8.1 Codex Handoff Template

Destination:

```text
.trellis/spec/templates/codex-handoff-template.md
```

Purpose:

- Defines fixed structure for task-level handoff.
- Claude Code copies and fills it into:

```text
.trellis/tasks/<active-task>/reviews/codex-handoff.md
```

Important rule:

- Claude Code must preserve headings.
- Missing content should be written as `无`.

### 8.2 Review Workflow Spec

Destination:

```text
.trellis/spec/guides/claude-codex-review-workflow.md
```

Purpose:

- Defines long-term rules for Claude Code + Codex local review.
- Covers role definition, handoff generation, commit rules, local review scripts, worktree safety, Codex output format, and finish-work gate.

### 8.3 Claude Command

Destination:

```text
.claude/commands/dev.md
```

Purpose:

- Provides the `/dev` command for new requirements.
- Keeps `/dev` simple:
  - start a new requirement
  - create/confirm Trellis task
  - write Delivery Gate into task
  - follow `.trellis/spec/` rules

### 8.4 Review Script

Destination:

```text
.trellis/scripts/codex-review.sh
```

Purpose:

- Runs initial local Codex Review.
- Saves output to:

```text
.trellis/tasks/<active-task>/reviews/codex-review-1.md
```

### 8.5 Re-Review Script

Destination:

```text
.trellis/scripts/codex-rereview.sh
```

Purpose:

- Runs local Codex Re-Review after Claude fixes P0/P1.
- Saves output to:

```text
.trellis/tasks/<active-task>/reviews/codex-review-2.md
```

## 9. Shell Script Design

### 9.1 Shared Expectations

Both scripts must:

1. Use Bash.
2. Use strict mode:

```bash
set -euo pipefail
```

3. Accept task path as first argument.
4. Validate task path exists.
5. Validate current directory is inside a git work tree.
6. Validate `codex` command exists.
7. Save output into the task `reviews` directory.
8. Never modify business code directly.

### 9.2 codex-review.sh Flow

Input:

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<task>
```

Validation:

```text
TASK_PATH exists
TASK_PATH/reviews/codex-handoff.md exists
codex CLI exists
inside git work tree
```

Output:

```text
TASK_PATH/reviews/codex-review-1.md
```

Codex prompt should instruct:

- Review only.
- Do not modify business code.
- Read AGENTS.md.
- Read `.trellis/workflow.md`.
- Read task files.
- Read `.trellis/spec/`.
- Read handoff.
- Review `git diff HEAD~1..HEAD`.
- Output P0/P1/P2/通过项/修复 Prompt.

### 9.3 codex-rereview.sh Flow

Input:

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Validation:

```text
TASK_PATH exists
TASK_PATH/reviews/codex-review-1.md exists
TASK_PATH/reviews/claude-fix-notes.md exists
codex CLI exists
inside git work tree
```

Output:

```text
TASK_PATH/reviews/codex-review-2.md
```

Codex prompt should instruct:

- Re-review only.
- Do not modify business code.
- Check whether P0/P1 from first review are fixed.
- Check whether new blocking issues were introduced.
- Do not introduce new broad refactor requests.
- Output pass/fail and remaining issues.

## 10. Safety Design

### 10.1 Installer Safety

The installer must not:

- Delete files.
- Overwrite files by default.
- Run shell scripts.
- Run Codex CLI.
- Run Trellis.
- Modify `.trellis/workflow.md`.
- Modify git state.

### 10.2 Workflow Safety

The installed workflow spec must instruct Claude Code:

- Do not push unless explicitly authorized.
- Do not merge unless explicitly authorized.
- Do not rebase unless explicitly authorized.
- Do not auto-resolve conflicts.
- Do not finish-work before Codex Review passes.
- Do not let Codex modify business code.
- Only fix P0/P1 by default.

### 10.3 Worktree Safety

The installed spec should define:

- Commit to current worktree branch.
- Do not merge to target branch before Codex Review passes.
- Require explicit authorization before merging back.
- Stop on dirty target branch or merge conflicts.

## 11. README Design

README sections:

1. Title
2. What this is
3. What it installs
4. Prerequisites
5. Install package
6. Install into a project
7. Daily workflow
8. Worktree workflow
9. Scripts
10. Safety rules
11. Updating installed files
12. Troubleshooting

README should include these exact examples:

```bash
trellis init -u amin --claude --codex
trellis-codex-review-kit init
```

```text
/dev 新需求：实现 xxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

```text
/trellis:continue
```

## 12. Testing Strategy

### 12.1 Manual Test Project

Create temp test project:

```bash
mkdir /tmp/tcrk-test
cd /tmp/tcrk-test
git init
mkdir -p .trellis .claude
trellis-codex-review-kit init
```

Verify files exist.

### 12.2 Skip Test

Run install twice:

```bash
trellis-codex-review-kit init
trellis-codex-review-kit init
```

Second run should print `SKIP existing`.

### 12.3 Force Test

Modify a target file, then run:

```bash
trellis-codex-review-kit init --force
```

File should be overwritten.

### 12.4 Dry Run Test

Use empty temp project:

```bash
trellis-codex-review-kit init --dry-run
```

No files should be written.

### 12.5 Script Validation Test

Create fake task without handoff:

```bash
mkdir -p .trellis/tasks/test-task/reviews
.trellis/scripts/codex-review.sh .trellis/tasks/test-task
```

Expected: non-zero exit with missing handoff error.

### 12.6 Re-Review Validation Test

Create fake first review but no fix notes:

```bash
touch .trellis/tasks/test-task/reviews/codex-review-1.md
.trellis/scripts/codex-rereview.sh .trellis/tasks/test-task
```

Expected: non-zero exit with missing fix notes error.

## 13. Implementation Notes

### 13.1 Reading package.json Version

For `--version`, read package.json from package root.

### 13.2 ESM Path Handling

Use:

```js
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, "..");
```

### 13.3 Chmod

Use:

```js
fs.chmodSync(dest, 0o755);
```

Only do chmod when not dry-run and file was written.

### 13.4 Template Inclusion

Ensure `package.json` includes:

```json
"files": [
  "bin",
  "templates"
]
```

### 13.5 Bin Field

Ensure `package.json` includes:

```json
"bin": {
  "trellis-codex-review-kit": "./bin/trellis-codex-review-kit.js"
}
```

## 14. Suggested Initial Version

Version:

```text
0.1.0
```

Implementation priority:

1. CLI installer.
2. Templates.
3. Scripts.
4. README.
5. Manual tests.

## 15. Completion Definition

The implementation is complete when:

1. `npm install -g .` installs the CLI locally.
2. `trellis-codex-review-kit --help` works.
3. `trellis-codex-review-kit --version` works.
4. `trellis-codex-review-kit init` installs all target files.
5. `trellis-codex-review-kit init --dry-run` writes nothing.
6. `trellis-codex-review-kit init --force` overwrites existing files.
7. Shell scripts are executable.
8. README explains how to use the kit.
9. Manual test instructions pass.
