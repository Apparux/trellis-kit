# TASKS: trellis-codex-review-kit

## Phase 0: Project Setup

### Task 0.1: Create Repository Skeleton

Create the following structure:

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

Acceptance:

- All directories exist.
- All placeholder files exist.

### Task 0.2: Create package.json

Create `package.json`:

```json
{
  "name": "trellis-codex-review-kit",
  "version": "0.1.0",
  "description": "Install local Trellis + Claude Code + Codex Review workflow files",
  "type": "module",
  "bin": {
    "trellis-codex-review-kit": "./bin/trellis-codex-review-kit.js"
  },
  "files": [
    "bin",
    "templates",
    "README.md"
  ],
  "license": "MIT"
}
```

Acceptance:

- `npm install -g .` creates `trellis-codex-review-kit` command.
- Package uses ESM.

---

## Phase 1: CLI Installer

### Task 1.1: Implement CLI Argument Parsing

Implement support for:

```bash
trellis-codex-review-kit init
trellis-codex-review-kit init --force
trellis-codex-review-kit init --dry-run
trellis-codex-review-kit --help
trellis-codex-review-kit --version
```

Behavior:

- `--help` prints usage and exits 0.
- `--version` prints version and exits 0.
- Unknown command exits 1.
- Unknown option exits 1.
- `init` is the main command.

Acceptance:

- Help output is clear.
- Version output matches `package.json`.

### Task 1.2: Implement Project Warning Checks

Before installation, check whether current directory contains:

```text
.git
.trellis
.claude
```

Behavior:

- Missing `.git` prints warning.
- Missing `.trellis` prints warning.
- Missing `.claude` prints warning.
- Missing directories do not block installation.

Acceptance:

- Warnings are printed.
- Exit code remains 0 when only warnings occur.

### Task 1.3: Implement Template Mapping

Define install mapping:

```js
const files = [
  {
    from: "templates/trellis/spec/guides/claude-codex-review-workflow.md",
    to: ".trellis/spec/guides/claude-codex-review-workflow.md"
  },
  {
    from: "templates/trellis/spec/templates/codex-handoff-template.md",
    to: ".trellis/spec/templates/codex-handoff-template.md"
  },
  {
    from: "templates/trellis/scripts/codex-review.sh",
    to: ".trellis/scripts/codex-review.sh",
    executable: true
  },
  {
    from: "templates/trellis/scripts/codex-rereview.sh",
    to: ".trellis/scripts/codex-rereview.sh",
    executable: true
  },
  {
    from: "templates/claude/commands/dev.md",
    to: ".claude/commands/dev.md"
  }
];
```

Acceptance:

- All source template paths resolve correctly.
- All destination paths are relative to current working directory.

### Task 1.4: Implement Safe Copy Logic

Rules:

- Create parent directories.
- If destination does not exist, create it.
- If destination exists and `--force` is false, skip it.
- If destination exists and `--force` is true, overwrite it.
- Never delete existing files.
- Never modify skipped files.

Output labels:

```text
CREATE
OVERWRITE
SKIP existing
```

Acceptance:

- Fresh install creates all files.
- Second install skips all existing files.
- `--force` overwrites all files.

### Task 1.5: Implement Dry Run

Rules:

- `--dry-run` writes nothing.
- It still validates source templates.
- It prints planned actions.

Output labels:

```text
WOULD CREATE
WOULD OVERWRITE
WOULD SKIP existing
```

Acceptance:

- No file is created during dry run.
- Dry run with `--force` prints `WOULD OVERWRITE` for existing files.

### Task 1.6: Implement Executable Permission

For files with `executable: true`, set mode `755` after writing.

Acceptance:

On macOS/Linux:

```bash
test -x .trellis/scripts/codex-review.sh
test -x .trellis/scripts/codex-rereview.sh
```

passes after install.

### Task 1.7: Print Next Steps

After successful install, print:

```text
Installed Trellis Codex Review Kit.

Next steps:
1. Verify Codex CLI:
   codex --version

2. Start new work in Claude Code:
   /dev 新需求：xxxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。

3. Continue interrupted work:
   /trellis:continue
```

Acceptance:

- Message appears after install.
- Message does not appear after `--help` or `--version`.

---

## Phase 2: Template Files

### Task 2.1: Implement codex-handoff-template.md

Create:

```text
templates/trellis/spec/templates/codex-handoff-template.md
```

Content must include these exact headings:

```md
# Codex Review Handoff

## Task

## Implementation Summary

## Changed Files

## API Changes

## Database / Permission / Config Changes

## Checks Run

## Review Focus

## Git Diff Scope

## Codex Review Prompt
```

Acceptance:

- Headings are present.
- Prompt instructs Codex to only review and not modify code.
- Prompt references `git diff HEAD~1..HEAD`.

### Task 2.2: Implement claude-codex-review-workflow.md

Create:

```text
templates/trellis/spec/guides/claude-codex-review-workflow.md
```

Must include sections:

```md
# Claude Code + Codex Local Review Workflow

## Role Definition
## Implementation Definition of Done
## Handoff Template Rule
## Git Commit Rule
## Local Automated Codex Review Rule
## Local Automated Codex Re-Review Rule
## Worktree Rule
## Codex Review Scope
## Codex Review Rules
## Codex Output Format
## Claude Fix Rule
## Finish Rule
```

Acceptance:

- It defines Claude Code as implementer/fixer.
- It defines Codex as reviewer only.
- It requires Codex handoff.
- It forbids finish-work before Codex Review passes.
- It forbids push/merge/rebase without explicit authorization.
- It requires P0/P1-only fixes by default.

### Task 2.3: Implement dev.md

Create:

```text
templates/claude/commands/dev.md
```

Must define `/dev` as new requirement entry.

It must:

- Require reading `.trellis/workflow.md`.
- Require reading `.trellis/spec/`.
- Require reading review workflow spec.
- Require writing Delivery Gate into current task PRD or implement file.
- State that implementation cannot skip Codex Review.
- State that implementation cannot directly finish-work.

Acceptance:

- `/dev 新需求：<需求描述>` is documented.
- Delivery Gate is included.
- Local Codex Review script is referenced.

---

## Phase 3: Review Scripts

### Task 3.1: Implement codex-review.sh

Create:

```text
templates/trellis/scripts/codex-review.sh
```

Script requirements:

- Bash script.
- Uses `set -euo pipefail`.
- Accepts task path as `$1`.
- Validates task path.
- Validates handoff exists:

```text
$TASK_PATH/reviews/codex-handoff.md
```

- Validates `codex` command exists.
- Validates inside git work tree.
- Creates reviews directory if needed.
- Runs:

```bash
codex exec "$PROMPT" > "$OUTPUT"
```

- Writes output:

```text
$TASK_PATH/reviews/codex-review-1.md
```

Acceptance:

- Missing argument prints usage and exits non-zero.
- Missing task path exits non-zero.
- Missing handoff exits non-zero.
- Missing Codex CLI exits non-zero.
- Valid input writes `codex-review-1.md`.

### Task 3.2: Implement codex-rereview.sh

Create:

```text
templates/trellis/scripts/codex-rereview.sh
```

Script requirements:

- Bash script.
- Uses `set -euo pipefail`.
- Accepts task path as `$1`.
- Validates task path.
- Validates first review exists:

```text
$TASK_PATH/reviews/codex-review-1.md
```

- Validates fix notes exist:

```text
$TASK_PATH/reviews/claude-fix-notes.md
```

- Validates `codex` command exists.
- Validates inside git work tree.
- Runs:

```bash
codex exec "$PROMPT" > "$OUTPUT"
```

- Writes output:

```text
$TASK_PATH/reviews/codex-review-2.md
```

Acceptance:

- Missing first review exits non-zero.
- Missing fix notes exits non-zero.
- Valid input writes `codex-review-2.md`.
- Prompt focuses only on previous P0/P1 and new blocking issues.

---

## Phase 4: README

### Task 4.1: Write README Introduction

README must explain:

- What this tool is.
- Why it exists.
- What files it installs.
- That it is local-only and does not use GitHub Actions.

Acceptance:

- New user can understand purpose in 1 minute.

### Task 4.2: Write Prerequisites

Include:

```text
Node.js
Trellis
Claude Code
Codex CLI
git
macOS/Linux/WSL for shell scripts
```

Acceptance:

- README clearly states Codex CLI is required for review scripts.

### Task 4.3: Write Installation Instructions

Include local development install:

```bash
npm install -g .
```

Include project install:

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-codex-review-kit init
```

Acceptance:

- User can install into a project by following README.

### Task 4.4: Write Daily Workflow

Include:

```text
/dev 新需求：实现 xxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

Include:

```text
/trellis:continue
```

Acceptance:

- README explains when to use `/dev`.
- README explains when to use `/trellis:continue`.

### Task 4.5: Write Worktree Workflow

Document:

1. Work in task branch/worktree.
2. Commit to current worktree branch.
3. Run Codex Review.
4. Fix P0/P1.
5. Re-review.
6. Merge back only after explicit authorization.

Acceptance:

- README warns not to auto-merge before Codex Review passes.

### Task 4.6: Write Troubleshooting

Include issues:

- `codex: command not found`
- `.trellis directory not found`
- missing handoff
- missing fix notes
- script permission denied
- not inside git work tree

Acceptance:

- Each issue has a short fix.

---

## Phase 5: Manual Tests

### Task 5.1: Local Global Install Test

Run:

```bash
npm install -g .
trellis-codex-review-kit --help
trellis-codex-review-kit --version
```

Acceptance:

- Command is available.
- Help prints.
- Version prints `0.1.0`.

### Task 5.2: Fresh Install Test

Run:

```bash
rm -rf /tmp/tcrk-test
mkdir /tmp/tcrk-test
cd /tmp/tcrk-test
git init
mkdir -p .trellis .claude
trellis-codex-review-kit init
```

Verify:

```bash
test -f .trellis/spec/guides/claude-codex-review-workflow.md
test -f .trellis/spec/templates/codex-handoff-template.md
test -x .trellis/scripts/codex-review.sh
test -x .trellis/scripts/codex-rereview.sh
test -f .claude/commands/dev.md
```

Acceptance:

- All tests pass.

### Task 5.3: Skip Existing Test

Run install twice:

```bash
trellis-codex-review-kit init
trellis-codex-review-kit init
```

Acceptance:

- Second run prints `SKIP existing` for installed files.
- No files are overwritten.

### Task 5.4: Force Overwrite Test

Modify one installed file:

```bash
echo "custom" > .claude/commands/dev.md
trellis-codex-review-kit init --force
```

Acceptance:

- `.claude/commands/dev.md` is restored from template.

### Task 5.5: Dry Run Test

Run in clean temp directory:

```bash
rm -rf /tmp/tcrk-dry
mkdir /tmp/tcrk-dry
cd /tmp/tcrk-dry
git init
trellis-codex-review-kit init --dry-run
```

Acceptance:

- Output contains `WOULD CREATE`.
- No `.trellis/spec/guides/claude-codex-review-workflow.md` is created.

### Task 5.6: Review Script Validation Test

In test project:

```bash
mkdir -p .trellis/tasks/test-task/reviews
.trellis/scripts/codex-review.sh .trellis/tasks/test-task
```

Acceptance:

- Script exits non-zero.
- Error mentions missing handoff.

### Task 5.7: Re-Review Script Validation Test

In test project:

```bash
touch .trellis/tasks/test-task/reviews/codex-review-1.md
.trellis/scripts/codex-rereview.sh .trellis/tasks/test-task
```

Acceptance:

- Script exits non-zero.
- Error mentions missing fix notes.

---

## Phase 6: Polish

### Task 6.1: Improve Console Output

Make output readable:

```text
Trellis Codex Review Kit

Target: /path/to/project

CREATE ...
SKIP existing ...

Installed Trellis Codex Review Kit.
```

Acceptance:

- Output is clear and concise.

### Task 6.2: Add License

Add `LICENSE` file.

Recommended:

```text
MIT
```

Acceptance:

- `package.json` license matches.

### Task 6.3: Add .gitignore

Create `.gitignore`:

```gitignore
node_modules/
.DS_Store
npm-debug.log*
```

Acceptance:

- Common generated files ignored.

### Task 6.4: Final Self-Review

Check:

- No broken template paths.
- No missing files.
- Shell scripts are executable in template directory.
- README examples match actual command names.
- PRD, DESIGN, TASKS are consistent.

Acceptance:

- Repository is ready for initial commit.

---

## Suggested Codex Vibe Coding Prompt

Use this prompt after creating `PRD.md`, `DESIGN.md`, and `TASKS.md` in the repository:

```text
请根据当前仓库的 PRD.md、DESIGN.md、TASKS.md 实现 trellis-codex-review-kit。

要求：
1. 先阅读 PRD.md、DESIGN.md、TASKS.md。
2. 不要直接自由发挥，严格按文档实现。
3. 先创建 package.json、bin 脚本、templates 目录和所有模板文件。
4. 实现 Node.js CLI：
   - init
   - --force
   - --dry-run
   - --help
   - --version
5. 默认不覆盖已有文件。
6. --force 才覆盖。
7. --dry-run 不写文件。
8. 安装 shell scripts 后设置可执行权限。
9. 编写 README.md。
10. 最后按 TASKS.md 的手动测试步骤自检。
11. 不要加入不必要依赖。
12. 不要实现 GitHub Actions。
13. 不要修改 .trellis/workflow.md。
14. 完成后输出：
    - 实现摘要
    - 主要文件
    - 如何本地测试
    - 是否有未完成事项
```
