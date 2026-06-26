# trellis-codex-review-kit

`trellis-codex-review-kit` 会把本地 Trellis + Claude Code 工作流文件安装到项目中。

它是一个无运行时依赖的小型 Node.js CLI 包。它不会替代 Trellis、Claude Code 或 Codex CLI，只会复制可纳入版本管理的项目文件，让 Claude Code 按 Trellis 工作流实现代码，并可选择生成 Review Handoff 用于手动外部审查。

这个工具只在本地工作。安装过程不会创建 GitHub Actions，不会 push，不会 merge，也不会运行 Codex Review。

[English README](README.md)

## 安装内容

运行 `trellis-codex-review-kit init` 会在所有平台安装 Markdown 模板，并按当前宿主 OS 安装 review 脚本：

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

非 Windows 主机会安装 Bash `.sh` 脚本；Windows 主机会安装原生 PowerShell `.ps1` 脚本。

这些安装后的文件应该提交到目标项目中，这样工作流就能保持稳定、可审查，并且团队可以按需编辑。

## 前置条件

- Node.js
- git
- Trellis
- Claude Code
- 可通过 `codex` 命令访问的 Codex CLI（可选；仅在用户手动选择运行 Codex Review 时需要）
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

### `/dev` — 完整 Trellis 工作流

`/dev` 会执行完整 Trellis 工作流。进入 implementation 前，它会询问是在当前工作区开发，还是在 `.worktrees/<task-id>` 下创建/切换任务专用 worktree。实现完成后，默认走 Trellis 内置 check。check 完成后，它会询问是否生成 Review Handoff Markdown，用于可选的手动外部审查。它不会自动调用 Codex Review、Claude Review 或任何 reviewer。

在 Claude Code 中开始新需求：

```text
/dev 新需求：实现 xxx
/dev 实现 xxx
/dev 帮我实现 xxx，并更新相关测试
```

对于 `/dev` 请求，Claude Code 应该：

1. 读取 `.trellis/workflow.md` 和相关 `.trellis/spec/` 文件。
2. 检查请求是否适用 Fast Path；如果可以，建议使用 `/fix`。
3. 创建或确认 Trellis task。
4. 按 Trellis 要求编写 task PRD、design、implementation artifacts。
5. 询问用户选择开发位置：当前工作区或 `.worktrees/<task-id>`。
6. 实现任务。
7. 运行 Trellis 内置 check。
8. 询问是否生成 Review Handoff Markdown。
9. 停止——是否 review、commit、push 或 finish-work 由用户决定。

### `/fix` — 快速修复

`/fix` 用于小 bug、小改动和低风险 patch。它默认不创建完整 Trellis task，不创建 PRD/DESIGN/TASK，不生成 Review Handoff，不 commit，也不执行 review。

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/task` — 继续已有任务

按目录名或后缀继续指定 task：

```text
/task 06-24-school-operation-log
/task school-operation-log
```

### `/trellis:continue` — 继续中断的工作

继续当前 active task：

```text
/trellis:continue
```

## 开发位置选择

完整 `/dev` 任务进入 implementation 前，由用户选择：

1. 当前分支 / 当前工作区
2. task 专用 git worktree

如果选择 worktree，固定路径为：

```text
.worktrees/<task-id>
```

固定分支名为：

```text
task/<task-id>
```

示例：

```text
.worktrees/06-23-customer-safety-education
task/06-23-customer-safety-education
```

Agent 只负责展示状态和提供建议，用户最终决定。

不得在以下位置创建 worktree：

```text
.trellis/worktrees/
../<repo>-worktrees/
../<repo>-<task-id>
/tmp/
```

建议目标项目 `.gitignore` 包含：

```gitignore
.worktrees/
```

## Review Handoff

Review Handoff Markdown 是可选外部审查交接材料，不是 Trellis check 的替代品。

生成 Review Handoff 不代表会自动 review。

用户可以选择：

* 不生成
* 生成后自己审查
* 生成后交给 Codex
* 生成后交给 Claude
* 生成后交给人工 reviewer
* 生成后使用其他工具审查
* 稍后再生成

## Review 脚本

现有 Codex Review 脚本是可选的手动工具：

* 不由 `/dev` 自动执行
* 不由 `/fix` 自动执行
* 用户需要时自行运行
* 不能描述成强制 Delivery Gate
* 不能描述成默认流程

### 初次 Review（手动）

macOS/Linux：

```bash
.trellis/spec/scripts/codex-review.sh .trellis/tasks/<task>
```

Windows PowerShell：

```powershell
.\.trellis\spec\scripts\codex-review.ps1 .trellis/tasks/<task>
```

### Re-Review（手动）

macOS/Linux：

```bash
.trellis/spec/scripts/codex-rereview.sh .trellis/tasks/<task>
```

Windows PowerShell：

```powershell
.\.trellis\spec\scripts\codex-rereview.ps1 .trellis/tasks/<task>
```

## 安全规则

安装器不会：

- 修改 `.trellis/workflow.md`。
- 运行 `trellis init`。
- 安装 Trellis、Claude Code 或 Codex CLI。
- 在安装过程中运行 Codex Review。
- 默认删除文件；只有 `update --prune-old` 会删除 `.trellis/scripts/` 下文档列出的四个遗留 review 脚本。
- 在未传入 `--force` 的 `init` 或未明确运行 `update` 时覆盖文件。
- push、merge 或 rebase。
- 修改远端仓库。
- 创建 `.worktrees/` 目录。
- 修改目标项目 `.gitignore`。

安装后的工作流会要求 Claude Code 遵守：

- Claude Code 负责实现和修复。
- Trellis 内置 check 是默认验证方式。
- Review Handoff 是可选且由用户控制的。
- 外部审查由用户控制。
- 是否 commit、push、merge 或 finish-work 由用户决定。

## 更新已安装文件

当项目里已经安装过这个 kit，想把已安装模板更新到当前包版本时，请运行：

```bash
trellis-codex-review-kit update
```

`update` 会用包内模板覆盖已安装的 kit 文件。运行前请先检查本地自定义内容。

如果你正在从旧版本迁移，旧版本曾把 review 脚本安装到 `.trellis/scripts/`，可以显式清理这些旧脚本；新脚本会安装在 `.trellis/spec/scripts/`：

```bash
trellis-codex-review-kit update --prune-old
```

`--prune-old` 只会删除下面这些存在的遗留文件：

```text
.trellis/scripts/codex-review.sh
.trellis/scripts/codex-rereview.sh
.trellis/scripts/codex-review.ps1
.trellis/scripts/codex-rereview.ps1
```

不确定时先 dry run：

```bash
trellis-codex-review-kit update --dry-run
trellis-codex-review-kit update --dry-run --prune-old
```

## 迁移说明

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

### 脚本 permission denied

在 macOS/Linux 上，重新安装或修复权限：

```bash
trellis-codex-review-kit init --force
chmod +x .trellis/spec/scripts/codex-review.sh .trellis/spec/scripts/codex-rereview.sh
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

test -f .trellis/spec/guides/review-handoff-workflow.md
test -f .trellis/spec/templates/review-handoff-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -x .trellis/spec/scripts/codex-review.sh
test -x .trellis/spec/scripts/codex-rereview.sh
test -f .claude/commands/dev.md
test -f .claude/commands/task.md
test -f .claude/commands/fix.md

# Windows 上改为验证安装的 .ps1 文件：
# Test-Path .trellis/spec/scripts/codex-review.ps1
# Test-Path .trellis/spec/scripts/codex-rereview.ps1
```
