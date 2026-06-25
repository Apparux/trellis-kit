# trellis-codex-review-kit

`trellis-codex-review-kit` 会把本地 Trellis + Claude Code + Codex Review 工作流文件安装到项目中。

它是一个无运行时依赖的小型 Node.js CLI 包。它不会替代 Trellis、Claude Code 或 Codex CLI，只会复制可纳入版本管理的项目文件，让 Claude Code 负责实现代码、Codex CLI 负责复查本地 git diff，从而形成可重复的本地流程。

这个工具只在本地工作。安装过程不会创建 GitHub Actions，不会 push，不会 merge，也不会运行 Codex Review。

[English README](README.md)

## 安装内容

运行 `trellis-codex-review-kit init` 会在所有平台安装 Markdown 模板，并按当前宿主 OS 安装 review 脚本：

```text
.trellis/spec/guides/claude-codex-review-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/scripts/codex-review.sh          # macOS/Linux
.trellis/scripts/codex-rereview.sh        # macOS/Linux
.trellis/scripts/codex-review.ps1         # Windows
.trellis/scripts/codex-rereview.ps1       # Windows
.claude/commands/dev.md
```

非 Windows 主机会安装 Bash `.sh` 脚本；Windows 主机会安装原生 PowerShell `.ps1` 脚本。

这些安装后的文件应该提交到目标项目中，这样工作流就能保持稳定、可审查，并且团队可以按需编辑。

## 前置条件

- Node.js
- git
- Trellis
- Claude Code
- 可通过 `codex` 命令访问的 Codex CLI
- macOS/Linux，用于运行安装后的 Bash `.sh` review 脚本
- Windows PowerShell 5.1+ 或 PowerShell 7+，用于运行安装后的 `.ps1` review 脚本

## 安装包

在本包仓库中运行（本地开发安装）：

```bash
npm install -g .
```

从 npm 安装（远程安装）：

```bash
npm install -g trellis-codex-review-kit
```

如果你不想全局安装，也可以通过 `npx` 直接运行已发布的 CLI：

```bash
npx trellis-codex-review-kit init
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

如果你确实想在 init 时重新安装并覆盖已有文件：

```bash
trellis-codex-review-kit init --force
```

预览覆盖操作但不写文件：

```bash
trellis-codex-review-kit init --force --dry-run
```

如果是日常更新已经安装过的 kit 文件，请使用 `update`，不要再用 `init --force`；见[更新已安装文件](#更新已安装文件)。

默认情况下，`init` 会跳过已有文件：

```text
SKIP existing: .claude/commands/dev.md
```

## 日常工作流

在 Claude Code 中用 `/dev` 开始新需求。推荐写法是：

```text
/dev 新需求：实现 xxx。写完后生成 handoff，自动 commit，并自动触发 Codex Review。不要 push，不要 finish-work。
```

`新需求：` 前缀有助于表达清楚，但不是必需的；只要 `/dev` 后面是明确的实现需求，就会触发默认交付流程。更短示例：

```text
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

默认交付流程已经写入 `/dev` 命令模板：实现后必须生成 handoff、自动本地 commit、自动触发 Codex Review，并且不要 push、不要 finish-work。

如果你没有使用 `/dev`，这个工具不会要求 Codex Review gate。修小 bug 或做小范围本地改动时，按项目普通流程走即可，除非你明确要求 Claude Code 运行 Codex Review。

对于 `/dev` 请求，Claude Code 应该：

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

对于 `/dev` 请求或明确启用 Codex gate 的工作，推荐的 task 分支或 worktree 流程是：

1. 在 task 分支或 worktree 中工作。
2. 将实现提交到当前 worktree 分支。
3. 在同一个 worktree 中运行 Codex Review。
4. 默认只修复 P0/P1 发现。
5. 运行 Codex Re-Review。
6. 只有在 Codex Review 通过且用户明确授权后，才 merge 回目标分支。

对于未明确启用 Codex gate 的非 `/dev` 工作，使用项目普通 worktree 流程。不要自动生成 handoff、自动 commit 或运行 Codex Review。

任何工作流都不要自动 merge，也不要自动解决冲突。

## 脚本

`init` 会安装 OS 原生 review 脚本。这些脚本是 `/dev` 的 review gate。Claude Code 在 `/dev` 或明确启用 Codex gate 的工作中，通常会在实现后自动调用它们。你也可以在排查或手动 review 时自己运行。

### 初次 Review

macOS/Linux：

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<task>
```

Windows PowerShell：

```powershell
.\.trellis\scripts\codex-review.ps1 .trellis/tasks/<task>
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

macOS/Linux：

```bash
.trellis/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Windows PowerShell：

```powershell
.\.trellis\scripts\codex-rereview.ps1 .trellis/tasks/<task>
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
- Codex Review gate 生效时，Claude Code 默认只修复 P0/P1 问题。
- 对于 `/dev` 请求或明确启用 Codex gate 的工作，`/trellis:finish-work` 必须等 Codex Review 通过，或者用户明确覆盖这个 gate。

## 更新已安装文件

当项目里已经安装过这个 kit，想把已安装模板更新到当前包版本时，请运行：

```bash
trellis-codex-review-kit update
```

`update` 会用包内模板覆盖已安装的 kit 文件。运行前请先检查本地自定义内容。

不确定时先 dry run：

```bash
trellis-codex-review-kit update --dry-run
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

在 macOS/Linux 上，重新安装或修复权限：

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/scripts/codex-review.sh .trellis/scripts/codex-rereview.sh
```

在 Windows PowerShell 上，如果执行策略阻止本地脚本，请使用组织允许的 shell 或按组织规则配置适合本机的执行策略，例如 `RemoteSigned`。

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

# Windows 上改为验证安装的 .ps1 文件：
# Test-Path .trellis/scripts/codex-review.ps1
# Test-Path .trellis/scripts/codex-rereview.ps1
```
