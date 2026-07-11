# Trellis Kit

Trellis Kit 不替代 Trellis 原生工作流，只补充几个聚焦的 Claude 命令：

- `/coding <task-id>`：切换/启动/继续 Trellis task，并在 implementation 前决定开发位置。
- `/fix <request>`：小 bug、小改动的快车道。
- `/review`：为当前 Trellis task 生成 review brief，并通过 `trellis channel` 调用 Codex review-only worker；也支持 rereview mode。
- `/review-fix`：读取最近一次 Codex review 结果，只修复 Blocking / Should Fix findings。
- `/spec-cleanup`：自动整理、归档、废弃并合并 `.trellis/spec/`。

它是一个无运行时依赖的小型 Node.js CLI 包。这个工具只在本地工作。安装过程不会创建 GitHub Actions，不会 push，不会 merge，也不会运行 Codex Review。

[English README](README.en.md)

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
.trellis/spec/guides/review-workflow.md
.trellis/spec/guides/review-loop-workflow.md
.trellis/spec/guides/minimal-implementation.md
.trellis/spec/templates/review-brief-template.md
.trellis/spec/templates/rereview-brief-template.md
.trellis/spec/templates/review-fix-summary-template.md
.trellis/spec/guides/development-location-decision.md
.trellis/spec/guides/fast-path-change-policy.md
.trellis/spec/guides/spec-cleanup-guide.md
.claude/commands/coding.md
.claude/commands/fix.md
.claude/commands/review.md
.claude/commands/review-fix.md
.claude/commands/spec-cleanup.md
```

这些安装后的文件应该提交到目标项目中，这样工作流就能保持稳定、可审查，并且团队可以按需编辑。

## 前置条件

- Node.js
- git
- Trellis
- Claude Code
- 可通过 `codex` 命令访问的 Codex CLI（可选；仅在运行 `/review` 或 `/review --rereview` 的 Codex worker 时需要）

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
npm test
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
SKIP existing: .claude/commands/coding.md
```

## 日常工作流

### `/coding <task-id>` — 完整 Trellis Task 入口

使用 `/coding <task-id>` 处理已准备好的 Trellis task。它会解析当前或指定 task，只在唯一匹配后切换 task，读取开发位置选择 guide，在需要 implementation 前询问使用当前工作区还是 `.worktrees/<task-id>`，然后继续 Trellis 原生 `/trellis:continue` 阶段路由。

```text
/coding 06-24-school-operation-log
/coding school-operation-log
```

`/coding` 不创建新 task，不默认读取整个 `.trellis/spec/`，不自动生成 Review Brief，也不会自动 review、commit、push、merge、rebase 或 finish-work。

### `/fix <request>` — 快速修复

`/fix` 用于在当前工作区完成小 bug、小改动和低风险 patch。它默认不创建完整 Trellis task，不创建 PRD/DESIGN/TASK，不生成 Review Brief，不 commit，也不执行 review。

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/review` — Trellis Channel Review

`/review` 由 Claude Code 读取 `.claude/commands/review.md` 后执行。默认流程不指定 Trellis agent，也不新增 agent 类型；它显式启动一个 Codex `check-codex` worker，把当前编号 brief 通过 `spawn --file` 注入 system prompt，再发送同一 brief 启动 turn 并记录 `SEND_SEQ`。brief 内的完整 no-edit 边界和前后 workspace snapshot 共同约束并检测写入，但不声称提供 OS 级只读隔离。

```text
/review
```

每轮新 review 使用统一三位编号：

```text
review-brief-001.md
codex-review-001.jsonl
codex-review-001.md
review-fix-summary-001.md
rereview-brief-002.md
codex-review-002.jsonl
codex-review-002.md
```

`.jsonl` 是 Channel CLI 返回的原始审计事件；raw event 的作者字段是 `by`，`--from` 只是 CLI 过滤参数，不存在 `event.from`。`.md` 是一行 provenance、一个 LF 和首个 send-after `done` 之前最后一条非空 worker `message.text` 的逐字正文，不 trim、不重排、不追加换行。原始 JSONL 不再伪装成 Markdown，也不使用 `--last 100` 截断正式结果。

主链路：

1. 读取 active task、相关 task/spec context 和当前 Git diff scope，在 `001`–`999` 中分配下一个未占用 `NNN`；编号耗尽、路径并发冲突或任何目标已存在时停止，绝不覆盖。
2. 写 `review-brief-NNN.md`，然后记录 full before snapshot：`git status --short --untracked-files=all`、`git diff --binary`、`git diff --cached --binary`、`git ls-files --others --exclude-standard -z`。NUL 输出必须由 binary-safe Node `execFile` 消费，不能放进 shell variable；用 SHA-256 记录 Git-visible untracked 文件、当前 brief、选中的 review/fix 输入和直接/manifest 注入的 task/spec context，symlink 只 hash link target、不跟随到 workspace 外。`diff --stat` 只能用于报告，不能证明内容未变。
3. 创建关联 task 的 ephemeral Channel：

   ```bash
   trellis channel create <channel-name> --ephemeral --task <task-path> --by review
   ```

4. 不指定 Trellis agent，显式启动 Codex-backed `check-codex` worker。当前编号 brief 是必须注入的 system context；其余 context 只传存在的文件：

   ```bash
   trellis channel spawn <channel-name> \
     --provider codex \
     --as check-codex \
     --file "$NUMBERED_BRIEF" \
     --file <task-path>/prd.md \
     --file <task-path>/design.md \
     --file <task-path>/implement.md \
     --jsonl <task-path>/check.jsonl \
     --cwd "$PWD" \
     --timeout 30m
   ```

5. 定向发送同一 brief 以启动 turn，并要求命令退出 0；对完整 stdout 只调用一次 `JSON.parse`，要求 `event.kind === "message"`、`event.by === "review"`、`event.to === "check-codex"`，且 `event.seq` 是正整数，再把它记为 `SEND_SEQ`。不得用正则、目测截取或猜测 sequence：

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <review-brief-path>
   ```

6. 先查询 `SEND_SEQ` 之后的历史 `done`；没有时才把 `wait` 作为低延迟快路径；wait 返回 0 或 124 后再次查询历史：

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ" --kind done
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ" --kind done
   ```

   `wait` 从启动时的日志末尾监听，因此最终完成事实必须是历史查询中满足 `event.kind === "done"`、`event.by === "check-codex"`、`event.seq > SEND_SEQ` 的事件。历史命令退出 0 且 stdout 为空才表示“没有 done”；非零退出或 malformed JSON 是命令失败。即使 wait 返回 124，只要历史已有该 done 就按完成处理；有 done 但无 final message 是“turn 已完成、pair 不完整”，不是 timeout；历史仍无 done 才是真实 timeout。

7. worker 完成后、写任何 post-worker artifact 前，重取同一份 full Git/untracked/context snapshot。任何命令/hash 失败或内容变化都使 review 失败：报告差异但不把并发变化强归因于 reviewer，不自动 reset、checkout、stash 或回滚，也不创建 Markdown。
8. 保存完整 post-send raw stream，要求 `messages` 退出 0，并逐字保留 stdout：

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ"
   ```

   通过 agent tool API 或 Node `child_process.execFile` Buffer 做 binary-safe capture，再以 exclusive `wx` 方式创建 JSONL。正式 artifact 不使用可能转码的 PowerShell text redirection，也不 normalize line ending。
9. 逐行 `JSON.parse` JSONL；验证每行是含整数 `seq`、字符串 `ts`/`kind`、非空 `by` 的 event object，post-send sequence 严格递增，按 `event.by === "check-codex"` 找 done 与 final message。只有 sibling、provenance、标题和稳定工作区全部有效后，才把“一行 provenance + 一个 LF + 不经 trim 的 exact message”写入 `codex-review-NNN.md`。

一个 **complete pair** 必须同时有同编号 `.jsonl`/`.md`、合法且有序的 raw event objects、匹配 provenance、send 后 worker done、done 前 final message 的逐字正文，以及 `workspaceStable: true`。orphan、损坏 JSONL、缺 done/final message、正文被改写或 workspace snapshot 不稳定产生的 incomplete pair 都不会被 `/review-fix` 或 rereview 自动消费。

排障只使用 0.6.6 支持的命令：

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
```

Channel 使用 `--ephemeral`，但成功和失败后都保留，便于诊断。清理默认只是预览；只有显式决定后才加 `--yes`：

```bash
trellis channel prune --scope project --ephemeral
trellis channel prune --scope project --ephemeral --yes
```

不使用成功后会自动删除 Channel 的 `trellis channel run`，也不直接读取 `events.jsonl`。

### `/review-fix` — Review 问题修复

`/review-fix` 按编号选择最大的 complete pair，而不是按 mtime 或裸 `codex-review*.md` glob。显式指定的新格式 Markdown 也必须有同编号 JSONL sibling 并通过完整校验。只有没有新 complete pair 时，才允许把无 provenance、无同 stem JSONL sibling 的 `codex-review.md` 或 `codex-review-<digits>.md` 当 legacy；显式路径可选择一个合法候选，自动 fallback 必须恰好一个。brief、summary、无关 Markdown 或旁边有 malformed/orphan JSONL 的 Markdown 都不是 legacy result。

它默认只修 Blocking / Should Fix，并写与来源 review 同编号、禁止覆盖的：

```text
review-fix-summary-NNN.md
```

它不调用 reviewer、不 spawn、不 wait、不自动 rereview、不 commit。Nice to Have 默认不修，False Positive 记录证据，Needs Human Decision 停止猜测。

### `/review --rereview` — Trellis Channel Re-review

```text
/review --rereview
```

Rereview 要求最新 complete `codex-review-NNN.md` + `codex-review-NNN.jsonl` 以及同编号 `review-fix-summary-NNN.md`，从 `NNN+1` 开始在不超过 `999` 的范围分配下一未占用编号，再走与普通 review 相同的 read-only、ephemeral、send-sequence、history-done、双产物和 full workspace snapshot 流程。

它只确认旧 findings 是否修复、是否引入回归、是否仍有 Blocking，并输出 `# Rereview Result` 下的 Blocking、Should Fix、Nice to Have、Verified Fixed、False Positive / Not Applicable、New Risks Introduced 和 Final Recommendation。Rereview 仍是 `/review` 的 mode，不恢复独立 `/rereview` 命令。

### `/spec-cleanup` — Spec 清理

`/spec-cleanup` 会自动审查、安全整理并整合 `.trellis/spec/`。它会保留当前有效规则，自动归档历史任务文档，自动废弃已被替代的旧流程规则，把低风险重复 spec 自动合并到 canonical guide，更新旧引用到 canonical 文件，并移除过时的全量读取 spec 写法，但不覆盖 Trellis 原生 context 选择。只有在删除、歧义、冲突或会改变核心行为的操作时才会询问确认。

```text
/spec-cleanup
```

## 选择性 Spec 加载

命令不应默认盲目全量读取 `.trellis/spec/`。`/coding` 和 `/fix` 交给 Trellis 原生 workflow、task context 和 spec index 判断哪些项目规则相关；`/review`、`/review-fix`、`/review --rereview` 和 `/spec-cleanup` 会先读取自己的目标 guide/template，再按命令需要检查相关文件。

如果 `.trellis/spec/guides/minimal-implementation.md` 存在，相关命令会在 context curation 时把它加入 `implement.jsonl` 或 `check.jsonl`；不会依赖或要求修改 `.trellis/spec/**/index.md`。

## 开发位置选择

worktree 选择发生在 `/coding` 中，并且必须在 implementation 前完成。

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

## Review Brief 与 Review 闭环

Review Brief 是 `/review` 发给 agentless Codex review worker 的结构化输入，不替代 Trellis 原生 check。它固定 task context、Git diff scope、已跑检查、风险和 no-edit 约束。

推荐闭环：

```text
实现 + 本地检查
  -> /review
  -> review-brief-NNN.md
  -> codex-review-NNN.jsonl + codex-review-NNN.md (complete pair)
  -> /review-fix
  -> review-fix-summary-NNN.md
  -> /review --rereview
  -> 下一编号 complete pair
```

职责边界：

- `/review` 与 rereview 只准备 brief、调用 Channel CLI、解析 CLI JSON、验证 complete pair 和报告，不修改实现。
- `/review-fix` 是唯一的 review findings 本地修改阶段，不调 reviewer。
- 默认 `/review` 只有一个 `check-codex`；多 reviewer 是显式高级用法，不是默认行为。
- 不恢复 `/handoff`、独立 `/rereview`、`/task` alias 或旧 review scripts。

## Trellis Channel Review

### Event 模型

```text
create/spawned
  -> send message (记录 SEND_SEQ)
  -> awake / progress / worker message
  -> done / error / killed
```

`send` 等 mutation stdout 是 JSON event；`messages --raw` 是每行一个 JSON event。raw schema 使用 `seq`、`ts`、`kind`、`by`，其中 `--from check-codex` 过滤的是 `event.by === "check-codex"`。`wait` 只观察调用后的事件，所以 `/review` 用成功返回且结构化解析后的 `messages --since SEND_SEQ --kind done` 作为完成事实。worker inbox 默认 `explicitOnly`，因此 brief 必须 `send --to check-codex`。

Review Channel 是 ephemeral：默认 `channel list` 隐藏，但 `channel list --all` 可见，并可由 project-scoped `prune --ephemeral` 预览或显式删除。它不是一次性 `channel run`。

### 关键命令语义

| 命令 | 本流程中的职责 |
| --- | --- |
| `channel create --ephemeral --task` | 创建与 task 关联、默认列表隐藏但保留供诊断的事件日志。 |
| `channel spawn --provider <provider> --as <handle> --file <brief>` | 不加载 agent card；显式选择 provider 和稳定 handle，并把当前 no-edit brief 注入 system prompt；其他 `--file` / `--jsonl` context 只在存在时注入。 |
| `channel send --to <handle> --text-file <brief>` | 定向唤醒默认 `explicitOnly` worker；stdout 是 author 为 dispatcher 的 message event。 |
| `channel wait --from <handle> --kind done` | 只作 from-now 低延迟等待；不能替代 send sequence 后的历史事实查询。 |
| `channel messages --raw --since <seq>` | 由 CLI 输出 JSONL 审计流；正式结果不加 `--last`，也不直接读 event store。 |
| `channel list --all` | 显示默认列表隐藏的 ephemeral review Channels。 |
| `channel prune --scope project --ephemeral [--yes]` | 不带 `--yes` 预览，显式决定后才清理当前 project 的 ephemeral Channels。 |

路由时，`spawn --as` 定义 worker handle，`send` / `wait --as` 定义当前 dispatcher 身份，`--to` 定向投递，`--from` 按 raw `by` 字段筛选来源。只有等待多个明确 handle 时才使用 `--all`。

### 并行 Reviewer

需要交叉审查时，可以在一个显式 Channel 中 spawn 多个不同 handle，并分别定向发送 brief：

```bash
trellis channel create cr-feature --ephemeral --task "$TASK" --by main
trellis channel spawn cr-feature --provider codex --as review-codex --file "$BRIEF" --timeout 30m
trellis channel spawn cr-feature --provider claude --as review-claude --file "$BRIEF" --timeout 30m
trellis channel send cr-feature --as main --to review-codex --text-file "$BRIEF"
trellis channel send cr-feature --as main --to review-claude --text-file "$BRIEF"
trellis channel wait cr-feature --as main --from review-codex,review-claude --all --kind done --timeout 30m
```

实际使用时：

- 每个 worker 都不指定 agent card，必须显式选择 provider，并把同一个 no-edit brief 通过 `--file` 注入 system prompt。
- 每个 worker 使用互不冲突的稳定 handle，只传存在的额外 `--file` / `--jsonl`，并分别发送同一 brief；不要依赖 broadcast 唤醒 `explicitOnly` inbox。
- 多 worker 等待可使用 `--from a,b --all --kind done`，但每个 worker 仍要独立执行 send-sequence 历史确认和 JSONL/Markdown 完整性校验。
- 每个 worker 的事件和产物必须独立过滤、验证和人工综合；Channel 负责路由和审计，不自动去重 severity 或裁决 False Positive。

默认 `/review` 不运行这套并行模式。

### Channel 排障

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
trellis channel prune --scope project --ephemeral
trellis channel prune --scope project --ephemeral --yes
```

没有 `spawned` 时检查显式 provider、handle 和注入的 brief/context；没有 `awake` 时检查定向 `send --to`；有 progress 无 done 时检查 worker error/timeout；wait timeout 时用 send sequence 后的历史 done 复核。`messages` 非零退出或 malformed raw JSON 是查询失败，不能当“无事件”；解析来源看 `by` 字段。正式结果不使用 `--last 100`，不把 pretty output 或 JSONL 直接当 Markdown。

## 安全规则

安装器不会：

- 修改 `.trellis/workflow.md`。
- 运行 `trellis init`。
- 安装 Trellis、Claude Code 或 Codex CLI。
- 在安装过程中运行 Codex Review。
- 默认删除文件；只有 `update --prune-old` 会删除 `.trellis/scripts/` 和 `.trellis/spec/scripts/` 下文档列出的遗留 review 脚本、`.trellis/spec/` 下已改名的旧模板，以及旧的 `.claude/commands/task.md`。
- 在未显式使用 `update --prune-old` 时删除目标项目中旧版本留下的 Claude 命令文件。
- 在未传入 `--force` 的 `init` 或未明确运行 `update` 时覆盖文件。
- push、merge 或 rebase。
- 修改远端仓库。
- 创建 `.worktrees/` 目录。
- 修改目标项目 `.gitignore`。

安装后的工作流会要求 Claude Code 遵守：

- Claude Code 负责实现已准备好的 task、小修复和 review findings 明确指出的问题。
- Trellis 内置 check 是默认验证方式。
- `/review` 和 `/review --rereview` 通过 `trellis channel` 调用 Codex review-only worker。
- `/review-fix` 只负责根据 saved review findings 修复代码，不负责 worker 调度。
- Nice to Have 默认不自动修。
- 是否 commit、push、merge 或 finish-work 由用户决定。

## 更新已安装文件

当项目里已经安装过这个 kit，想把已安装模板更新到当前包版本时，请运行：

```bash
trellis-kit update
```

`update` 会用包内模板覆盖已安装的 kit 文件。运行前请先检查本地自定义内容。

如果你正在从旧版本迁移，旧版本曾把 review 脚本安装到 `.trellis/scripts/` 或 `.trellis/spec/scripts/`、在 `.trellis/spec/` 下安装过已改名的旧 Review Brief 模板，或安装过 `.claude/commands/task.md`，可以在安装当前文件后显式清理这些旧文件：

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
.trellis/spec/guides/review-handoff-workflow.md
.trellis/spec/templates/codex-handoff-template.md
.trellis/spec/templates/review-handoff-template.md
.trellis/spec/templates/rereview-handoff-template.md
.claude/commands/handoff.md
.claude/commands/rereview.md
.claude/commands/task.md
```

不确定时先 dry run：

```bash
trellis-kit update --dry-run
trellis-kit update --dry-run --prune-old
```

## 迁移说明

### Claude 命令面

旧版本可能安装过 `.claude/commands/task.md`。当前入口是 `/coding`，且不会安装兼容别名；运行 `trellis-kit update --prune-old` 可删除旧文件。

更早版本也可能安装过 `.claude/commands/dev.md`。如果存在，请确认不再需要后手动删除。

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

test ! -e .trellis/agents/review.md
test -f .trellis/spec/guides/review-workflow.md
test -f .trellis/spec/guides/review-loop-workflow.md
test -f .trellis/spec/guides/minimal-implementation.md
test -f .trellis/spec/templates/review-brief-template.md
test -f .trellis/spec/templates/rereview-brief-template.md
test -f .trellis/spec/templates/review-fix-summary-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -f .trellis/spec/guides/spec-cleanup-guide.md
test -f .claude/commands/coding.md
test -f .claude/commands/fix.md
test -f .claude/commands/review.md
test -f .claude/commands/review-fix.md
test -f .claude/commands/spec-cleanup.md
test ! -f .claude/commands/dev.md
```
