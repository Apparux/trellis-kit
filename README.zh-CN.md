# Trellis Kit

Trellis Kit 不替代 Trellis 原生工作流，只补充几个聚焦的 Claude 命令：

- `/task <task-id>`：切换/启动/继续 Trellis task，并在 implementation 前决定开发位置。
- `/fix <request>`：小 bug、小改动的快车道。
- `/handoff`：用户需要时手动生成 Review Handoff Markdown。
- `/review-fix <review-md>`：根据 Codex、Claude 或人工 review markdown 修复 P0/P1 问题。
- `/rereview <review-md>`：修复后生成 re-review 请求，交给 reviewer 复查。
- `/spec-cleanup`：自动整理、归档、废弃并合并 `.trellis/spec/`。

它是一个无运行时依赖的小型 Node.js CLI 包。这个工具只在本地工作。安装过程不会创建 GitHub Actions，不会 push，不会 merge，也不会运行 Codex Review。

[English README](README.md)

## 重命名说明

本项目原名为 `trellis-codex-review-kit`，现已更名为 `trellis-kit`。

新的 npm 包名和 CLI 命令均为：

```bash
trellis-kit
```

如果你之前全局安装过旧包，请先卸载旧包：

```bash
npm uninstall -g trellis-codex-review-kit
npm install -g trellis-kit
```

如果你的项目脚本中仍引用旧命令，请将：

```bash
trellis-codex-review-kit
```

替换为：

```bash
trellis-kit
```

## 安装内容

运行 `trellis-kit init` 会安装 Markdown 模板和 Claude 命令模板：

```text
.trellis/spec/guides/review-handoff-workflow.md
.trellis/spec/guides/review-loop-workflow.md
.trellis/spec/templates/review-handoff-template.md
.trellis/spec/guides/development-location-decision.md
.trellis/spec/guides/fast-path-change-policy.md
.trellis/spec/guides/spec-cleanup-guide.md
.claude/commands/task.md
.claude/commands/fix.md
.claude/commands/handoff.md
.claude/commands/review-fix.md
.claude/commands/rereview.md
.claude/commands/spec-cleanup.md
```

这些安装后的文件应该提交到目标项目中，这样工作流就能保持稳定、可审查，并且团队可以按需编辑。

## 前置条件

- Node.js
- git
- Trellis
- Claude Code
- 可通过 `codex` 命令访问的 Codex CLI（可选；仅在用户自行选择用 Codex 做手动外部审查时需要）

## 安装包

在本包仓库中运行（本地开发安装）：

```bash
npm install -g .
```

从 npm 安装（远程安装）：

```bash
npm install -g trellis-kit
```

如果你不想全局安装，也可以通过 `npx` 直接运行已发布的 CLI：

```bash
npx trellis-kit init
```

验证：

```bash
trellis-kit --help
trellis-kit --version
```

## 本地开发

在本仓库中直接运行 CLI：

```bash
node bin/trellis-kit.js --help
node bin/trellis-kit.js init --dry-run
```

## 安装到项目

示例初始化流程：

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-kit init
```

只预览、不写文件：

```bash
trellis-kit init --dry-run
```

如果你确实想在 init 时重新安装并覆盖已有文件：

```bash
trellis-kit init --force
```

预览覆盖操作但不写文件：

```bash
trellis-kit init --force --dry-run
```

如果是日常更新已经安装过的 kit 文件，请使用 `update`，不要再用 `init --force`；见[更新已安装文件](#更新已安装文件)。

默认情况下，`init` 会跳过已有文件：

```text
SKIP existing: .claude/commands/task.md
```

## 日常工作流

### `/task <task-id>` — 完整 Trellis Task 入口

使用 `/task <task-id>` 处理已准备好的 Trellis task。它会解析当前或指定 task，只在唯一匹配后切换 task，读取开发位置选择 guide，在需要 implementation 前询问使用当前工作区还是 `.worktrees/<task-id>`，然后继续 Trellis 原生 `/trellis:continue` 阶段路由。

```text
/task 06-24-school-operation-log
/task school-operation-log
```

`/task` 不创建新 task，不默认读取整个 `.trellis/spec/`，不自动生成 Review Handoff，也不会自动 review、commit、push、merge、rebase 或 finish-work。

### `/fix <request>` — 快速修复

`/fix` 用于在当前工作区完成小 bug、小改动和低风险 patch。它默认不创建完整 Trellis task，不创建 PRD/DESIGN/TASK，不生成 Review Handoff，不 commit，也不执行 review。

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/handoff` — 手动 Review Handoff

当你希望 Claude Code 为当前 active Trellis task 生成 Review Handoff Markdown 时，使用 `/handoff`。

```text
/handoff
```

它会确认 active task，读取 handoff workflow guide 和 template，收集 changed files、checks、risks 和 summary，写出 Markdown handoff 并返回路径。`/handoff` 会生成包含 Review Scope 和 Suggested Review Prompt 的 Review Handoff Markdown。默认 Review Scope 是当前本地工作区改动，包括 staged、unstaged，以及与任务相关的 untracked 新文件。它不会运行 reviewer，也不会 commit。

### `/review-fix <review-md>` — Review 问题修复

使用 `/review-fix <review-md>` 根据 Codex、Claude、人工或其他外部 reviewer 输出的 review markdown 修复 P0/P1 问题。

```text
/review-fix .trellis/tasks/06-23-customer-safety-education/reviews/codex-review.md
```

`/review-fix` 会读取 review markdown 和 review loop guide，只修复 review markdown 明确指出的问题，运行 targeted checks，并写出 `review-fix-summary.md`。它不会自动调用 reviewer，不会 commit，并且默认不自动修复 P2，除非用户明确要求。

### `/rereview <review-md>` — Re-review 请求

使用 `/rereview <review-md>` 在 `/review-fix` 修复后生成聚焦的 re-review 请求。

```text
/rereview .trellis/tasks/06-23-customer-safety-education/reviews/codex-review.md
```

`/rereview` 会读取原始 review markdown、review loop guide 和 review fix summary，然后写出 `rereview-request.md`。它只准备 re-review 材料，不会自动调用 Codex、Claude Review、人工 reviewer 或任何外部 reviewer。

### `/spec-cleanup` — Spec 清理

`/spec-cleanup` 会自动审查、安全整理并整合 `.trellis/spec/`。它会保留当前有效规则，自动归档历史任务文档，自动废弃已被替代的旧流程规则，把低风险重复 spec 自动合并到 canonical guide，更新旧引用到 canonical 文件，并移除过时的全量读取 spec 写法，但不覆盖 Trellis 原生 context 选择。只有在删除、歧义、冲突或会改变核心行为的操作时才会询问确认。

```text
/spec-cleanup
```

## 选择性 Spec 加载

命令不应默认盲目全量读取 `.trellis/spec/`。`/task` 和 `/fix` 交给 Trellis 原生 workflow、task context 和 spec index 判断哪些项目规则相关；`/handoff`、`/review-fix`、`/rereview` 和 `/spec-cleanup` 会先读取自己的目标 guide，再按命令需要检查相关文件。

## 开发位置选择

worktree 选择发生在 `/task` 中，并且必须在 implementation 前完成。

如果用户选择任务专用 worktree，固定使用：

```text
.worktrees/<task-id>
```

分支名固定为：

```text
task/<task-id>
```

创建 task worktree 前，Agent 会确认 `.gitignore` 是否包含 `.worktrees/`；如果缺失，会先询问是否添加。如果 Trellis planning/design/task artifacts 尚未提交，它会先提醒。若 implementation 已经开始且代码有未提交改动，默认继续使用当前工作区。

不得在以下位置创建 worktree：

```text
.trellis/worktrees/
../<repo>-worktrees/
../<repo>-<task-id>
/tmp/
```

## Review Handoff 与 Review 闭环

Review Handoff Markdown 是可选外部审查交接材料，不是 Trellis check 的替代品。

`/handoff` 会生成包含 Review Scope 和 Suggested Review Prompt 的 Review Handoff Markdown。默认 Review Scope 是当前本地工作区改动，包括 staged、unstaged，以及与任务相关的 untracked 新文件。

生成 Review Handoff 不代表会自动 review。用户可以选择不生成、生成后自己审查、交给 Codex、交给 Claude、发送给人工 reviewer、使用其他工具，或稍后再生成。

推荐 review 闭环：

1. 使用 `/handoff` 生成 review-handoff.md。
2. 将 handoff 交给 Codex、Claude 或人工 reviewer。
3. 将 review 结果保存到 `.trellis/tasks/<task-id>/reviews/`。
4. 使用 `/review-fix <review-md>` 修复 P0/P1 问题。
5. 使用 `/rereview <review-md>` 生成 re-review 请求。
6. 手动将 re-review 请求交给 reviewer 复查。

`/review-fix` 不自动调用 reviewer。`/rereview` 不自动调用 reviewer。P2 默认不自动修。所有外部 review 和 re-review 都由用户手动触发。

## 手动外部审查

本 kit 不安装 bundled review 脚本。

Review Handoff Markdown 和 Re-review Request Markdown 都是可移植的交接材料。用户可以把 Suggested Review Prompt 手动粘贴给 Codex、Claude、其他 reviewer，或发送给人工 reviewer。

本 kit 中没有任何命令会自动运行外部 reviewer。

## 安全规则

安装器不会：

- 修改 `.trellis/workflow.md`。
- 运行 `trellis init`。
- 安装 Trellis、Claude Code 或 Codex CLI。
- 在安装过程中运行 Codex Review。
- 默认删除文件；只有 `update --prune-old` 会删除 `.trellis/scripts/` 和 `.trellis/spec/scripts/` 下文档列出的遗留 review 脚本，以及 `.trellis/spec/` 下已改名的旧模板。
- 删除目标项目中旧版本留下的 Claude 命令文件。
- 在未传入 `--force` 的 `init` 或未明确运行 `update` 时覆盖文件。
- push、merge 或 rebase。
- 修改远端仓库。
- 创建 `.worktrees/` 目录。
- 修改目标项目 `.gitignore`。

安装后的工作流会要求 Claude Code 遵守：

- Claude Code 负责实现已准备好的 task、小修复和 review markdown 明确指出的问题。
- Trellis 内置 check 是默认验证方式。
- Review Handoff 是可选且由用户控制的。
- 外部 review 和 re-review 由用户控制。
- P2 默认不自动修。
- 是否 commit、push、merge 或 finish-work 由用户决定。

## 更新已安装文件

当项目里已经安装过这个 kit，想把已安装模板更新到当前包版本时，请运行：

```bash
trellis-kit update
```

`update` 会用包内模板覆盖已安装的 kit 文件。运行前请先检查本地自定义内容。

如果你正在从旧版本迁移，旧版本曾把 review 脚本安装到 `.trellis/scripts/` 或 `.trellis/spec/scripts/`，或在 `.trellis/spec/` 下安装过已改名的旧 Review Handoff 模板，可以在安装当前文件后显式清理这些旧文件：

```bash
trellis-kit update --prune-old
```

`--prune-old` 只会删除下面这些存在的遗留文件：

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

不确定时先 dry run：

```bash
trellis-kit update --dry-run
trellis-kit update --dry-run --prune-old
```

## 迁移说明

### Claude 命令面

旧版本可能安装过 `.claude/commands/dev.md`。如果存在，请确认不再需要后手动删除。

### 文件重命名（v0.5.0）

以下模板文件已改名：

| 旧名称 | 新名称 |
|--------|--------|
| `.trellis/spec/guides/claude-codex-review-workflow.md` | `.trellis/spec/guides/review-handoff-workflow.md` |
| `.trellis/spec/templates/codex-handoff-template.md` | `.trellis/spec/templates/review-handoff-template.md` |

旧版本安装过的项目可能仍保留旧文件。升级后请先确认没有本地自定义内容，再手动删除旧文件，避免旧规则与新的 Review Handoff Workflow 冲突。

### Worktree 路径变更

旧版本可能推荐过 `../<repo>-worktrees/<task-id>`、`../<repo>-<task-id>` 或 `.trellis/worktrees/<task-id>` 等 worktree 路径。当前版本统一使用 `.worktrees/<task-id>`。

## 故障排查

### `.trellis directory not found`

先在目标项目中初始化 Trellis：

```bash
trellis init -u amin --claude --codex
```

安装器会警告缺少 `.trellis`，但不会失败，因为有些用户可能会手动准备目录。

## 本地手动测试概要

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
test -f .trellis/spec/guides/review-loop-workflow.md
test -f .trellis/spec/templates/review-handoff-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -f .trellis/spec/guides/spec-cleanup-guide.md
test -f .claude/commands/task.md
test -f .claude/commands/fix.md
test -f .claude/commands/handoff.md
test -f .claude/commands/review-fix.md
test -f .claude/commands/rereview.md
test -f .claude/commands/spec-cleanup.md
test ! -f .claude/commands/dev.md
```
