# trellis-codex-review-kit

`trellis-codex-review-kit` 会把本地 Trellis + Claude Code + Codex Review 工作流文件安装到项目中。

它是一个无运行时依赖的小型 Node.js CLI 包。它不会替代 Trellis、Claude Code 或 Codex CLI，只会复制可纳入版本管理的项目文件，让 Claude Code 负责实现代码、Codex CLI 负责复查本地 git diff，从而形成可重复的本地流程。

这个工具只在本地工作。安装过程不会创建 GitHub Actions，不会 push，不会 merge，也不会运行 Codex Review。

[English README](README.md)

## 安装内容

运行 `trellis-codex-review-kit init` 会安装：

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.claude/commands/dev.md
```

这些安装后的文件应该提交到目标项目中，这样工作流就能保持稳定、可审查，并且团队可以按需编辑。

## 前置条件

- Node.js
- git
- Trellis
- Claude Code
- 可通过 `codex` 命令访问的 Codex CLI
- macOS、Linux 或 WSL，用于运行安装后的 `.sh` review 脚本

第一版不包含 Windows 原生 PowerShell 脚本。

## 安装包

在本包仓库中运行：

```bash
npm install -g .
```

验证：

```bash
trellis-codex-review-kit --help
trellis-codex-review-kit --version
```

## 安装到项目

示例初始化流程：

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-codex-review-kit init
```

只预览、不写文件：

```bash
trellis-codex-review-kit init --dry-run
```

覆盖已安装文件：

```bash
trellis-codex-review-kit init --force
```

预览覆盖操作但不写文件：

```bash
trellis-codex-review-kit init --force --dry-run
```

默认情况下，已有文件会被跳过：

```text
SKIP existing: .claude/commands/dev.md
```

## 日常工作流

在 Claude Code 中用 `/dev` 开始新需求。推荐写法是：

```text
/dev 新需求：实现 xxx
```

`新需求：` 前缀有助于表达清楚，但不是必需的；只要 `/dev` 后面是明确的实现需求，就会触发默认交付流程。例如：

```text
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

默认交付流程已经写入 `/dev` 命令模板：实现后必须生成 handoff、自动本地 commit、自动触发 Codex Review，并且不要 push、不要 finish-work。

Claude Code 应该：

1. 读取 `.trellis/workflow.md` 和相关 `.trellis/spec/` 文件。
2. 创建或确认 Trellis task。
3. 按 Trellis 要求编写 task PRD、design、implementation artifacts。
4. 写入 `.claude/commands/dev.md` 中定义的 Delivery Gate。
5. 实现任务。
6. 根据安装的 handoff 模板生成 `.trellis/tasks/<task>/reviews/codex-handoff.md`。
7. 自动进行本地 commit。
8. 自动运行本地 Codex Review。
9. 默认只修复 P0/P1 问题。
10. 如有修复，运行 Codex Re-Review。
11. 在没有明确授权前，停止于 push、merge、rebase 或 finish-work 之前。

中断后继续工作：

```text
/trellis:continue
```

## Worktree 工作流

推荐的 task 分支或 worktree 流程：

1. 在 task 分支或 worktree 中工作。
2. 将实现提交到当前 worktree 分支。
3. 在同一个 worktree 中运行 Codex Review。
4. 默认只修复 P0/P1 发现。
5. 运行 Codex Re-Review。
6. 只有在 Codex Review 通过且用户明确授权后，才 merge 回目标分支。

Codex Review 通过前不要自动 merge。不要自动解决冲突。

## 脚本

### 初次 Review

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<task>
```

运行前需要：

```text
.trellis/tasks/<task>/reviews/codex-handoff.md
```

输出：

```text
.trellis/tasks/<task>/reviews/codex-review-1.md
```

### Re-Review

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>
```

运行前需要：

```text
.trellis/tasks/<task>/reviews/codex-review-1.md
.trellis/tasks/<task>/reviews/claude-fix-notes.md
```

输出：

```text
.trellis/tasks/<task>/reviews/codex-review-2.md
```

## 安全规则

安装器不会：

- 修改 `.trellis/workflow.md`。
- 运行 `trellis init`。
- 安装 Trellis、Claude Code 或 Codex CLI。
- 在安装过程中运行 Codex Review。
- 删除文件。
- 在未传入 `--force` 时覆盖文件。
- push、merge 或 rebase。
- 修改远端仓库。

安装后的工作流会要求 Claude Code 和 Codex 遵守：

- Claude Code 负责实现和修复。
- Codex 只负责 review。
- Codex 不能修改业务代码。
- Claude Code 默认只修复 P0/P1 问题。
- `/trellis:finish-work` 必须等 Codex Review 通过，或者用户明确覆盖这个 gate。

## 更新已安装文件

运行：

```bash
trellis-codex-review-kit init --force
```

这会用包内模板覆盖已安装的 kit 文件。使用 `--force` 前请先检查本地自定义内容。

不确定时先 dry run：

```bash
trellis-codex-review-kit init --force --dry-run
```

## 故障排查

### `codex: command not found`

安装 Codex CLI，并确保 `codex` 在 `PATH` 上：

```bash
codex --version
```

### `.trellis directory not found`

先在目标项目中初始化 Trellis：

```bash
trellis init -u amin --claude --codex
```

安装器会警告缺少 `.trellis`，但不会失败，因为有些用户可能会手动准备目录。

### 缺少 handoff

`codex-review.sh` 需要：

```text
.trellis/tasks/<task>/reviews/codex-handoff.md
```

可以从下面的模板创建：

```text
.trellis/spec/templates/codex-handoff-template.md
```

### 缺少 fix notes

`codex-rereview.sh` 需要：

```text
.trellis/tasks/<task>/reviews/claude-fix-notes.md
```

在 Re-Review 前，请写明 P0/P1 修复内容、变更文件和已运行检查。

### 脚本 permission denied

重新安装或修复权限：

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/scripts/codex-review.sh .trellis/scripts/codex-rereview.sh
```

### 不在 git work tree 内

请在 git 仓库或 worktree 中运行 review 脚本。Codex Review 依赖本地 git diff。

## 本地手动测试概要

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
