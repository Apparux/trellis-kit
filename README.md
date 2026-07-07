# Trellis Kit

Trellis Kit 不替代 Trellis 原生工作流，只补充几个聚焦的 Claude 命令：

- `/task <task-id>`：切换/启动/继续 Trellis task，并在 implementation 前决定开发位置。
- `/fix <request>`：小 bug、小改动的快车道。
- `/review`：为当前 Trellis task 生成 review brief，并通过 `trellis channel` 调用 Codex check worker；也支持 rereview mode。
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
.claude/commands/task.md
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

`/task` 不创建新 task，不默认读取整个 `.trellis/spec/`，不自动生成 Review Brief，也不会自动 review、commit、push、merge、rebase 或 finish-work。

### `/fix <request>` — 快速修复

`/fix` 用于在当前工作区完成小 bug、小改动和低风险 patch。它默认不创建完整 Trellis task，不创建 PRD/DESIGN/TASK，不生成 Review Brief，不 commit，也不执行 review。

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/review` — Trellis Channel Review

`/review` 对应的 `.claude/commands/review.md` 是 Claude Code 的 slash command 指令文件。Claude Code 读取这个 Markdown，按其中步骤在当前项目里执行 shell/tool commands；这个 Markdown 文件本身不会调用 Codex，生成出来的 `review-brief*.md` 也不会自己调用 Codex。

真正把 Codex 拉起来的是 brief 生成之后的 `trellis channel spawn <channel-name> --agent check --provider codex --as check-codex ...`。其中 `--provider codex` 是选择 Codex provider 的开关，`check-codex` 是后续 `send` / `wait` / `messages` 都会使用的 worker handle。

```text
/review
```

`/review` 先准备输入，再调用 channel：

1. 读取 active Trellis task：`python3 ./.trellis/scripts/task.py current --source`。
2. 读取 task context：`prd.md` 必读；`design.md`、`implement.md`、`check.jsonl` 和 task-local docs 存在才读。
3. 读取 git scope：`git status --short`、`git diff`、`git diff --cached`，以及 task 相关 untracked files。
4. 根据 `.trellis/spec/templates/review-brief-template.md` 写出 `.trellis/tasks/<task>/review/review-brief*.md`。

`review-brief*.md` 生成后的精确调用链如下；实际命令会把 `<channel-name>`、`<task-path>`、`<review-brief-path>`、`<review-result-path>` 换成具体路径，并跳过不存在的 `--file` / `--jsonl` 输入：

1. Claude Code 创建本次 review channel：

   ```bash
   trellis channel create <channel-name> --task <task-path> --by review
   ```

2. Claude Code 启动 Codex-backed check worker：

   ```bash
   trellis channel spawn <channel-name> \
     --agent check \
     --provider codex \
     --as check-codex \
     --file <task-path>/prd.md \
     --file <task-path>/design.md \
     --file <task-path>/implement.md \
     --jsonl <task-path>/check.jsonl \
     --cwd "$PWD" \
     --timeout 30m
   ```

3. 上面的 `spawn` 是真正把 Codex 拉起来的步骤：Trellis Channel/supervisor 根据 `--agent check` 载入 check agent 角色，根据 `--provider codex` 选择 Codex provider，并把 worker 注册为 `check-codex`。

4. Claude Code 把刚生成的 Markdown brief 内容发给 Codex worker：

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <review-brief-path>
   ```

   `--text-file <review-brief-path>` 表示读取这个 Markdown 文件的内容并作为 channel message 写入；`--to check-codex` 表示定向投递到 Codex worker 的 inbox，而不是让 Markdown 文件自己执行任何东西。

5. Claude Code 等待 Codex worker 结束：

   ```bash
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   ```

   完成条件是 Trellis runtime/supervisor 写回的 `done` 事件，不是 worker 正文里某句自定义文字。

6. Claude Code 保存 Codex 输出：

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --last 100 > <review-result-path>
   ```

   实际保存路径是 `.trellis/tasks/<task>/review/codex-review*.md`；如果已有历史文件，会使用 `codex-review-001.md`、`codex-review-002.md` 等编号，避免覆盖旧结果。

文字时序图：

```text
用户
  -> Claude Code: 输入 /review

Claude Code
  -> Files: 读取 active task、task artifacts、git diff scope
  -> Files: 写出 <task>/review/review-brief*.md

Claude Code
  -> trellis channel CLI: create <channel-name> --task <task-path> --by review

trellis channel CLI
  -> Files/channel log: 记录 create event

Claude Code
  -> trellis channel CLI: spawn <channel-name> --agent check --provider codex --as check-codex ...

trellis channel CLI / supervisor
  -> Supervisor/Codex worker: 启动 Codex-backed check worker，并记录 spawned event

Claude Code
  -> trellis channel CLI: send <channel-name> --as review --to check-codex --text-file <review-brief-path>

trellis channel CLI
  -> Supervisor/Codex worker: 将 review-brief*.md 内容投递到 check-codex inbox

Supervisor/Codex worker
  -> Files/channel log: 写入 progress / message / done 等事件

Claude Code
  -> trellis channel CLI: wait <channel-name> --as review --from check-codex --kind done --timeout 30m

trellis channel CLI
  -> Claude Code: 看到 check-codex 的 done 事件后返回

Claude Code
  -> trellis channel CLI: messages <channel-name> --raw --from check-codex --last 100
  -> Files: shell 重定向保存为 <task>/review/codex-review*.md
```

默认输出路径：

```text
.trellis/tasks/<task>/review/review-brief.md
.trellis/tasks/<task>/review/codex-review.md
```

如果已有历史文件，会使用 `review-brief-001.md`、`review-brief-002.md`、`codex-review-001.md`、`codex-review-002.md` 等编号文件，避免覆盖旧 review。发生 spawn、send、wait 或 timeout 问题时，不直接把 `events.jsonl` 当主结果读取；优先用下面的 channel 诊断命令查看 raw 输出、progress 和 channel 列表：

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

### `/review-fix` — Review 问题修复

使用 `/review-fix` 读取当前 task 最近一次 Codex review 结果，分类 findings，并默认只修复 Blocking / Should Fix。

```text
/review-fix
```

`/review-fix` 会写出：

```text
.trellis/tasks/<task>/review/review-fix-summary.md
```

它不调用 reviewer，不 spawn worker，不 wait channel，不运行 `/review --rereview`，也不 commit。Nice to Have 默认不修，False Positive 只记录原因，Needs Human Decision 写入待确认说明。

### `/review --rereview` — Trellis Channel Re-review

`/review --rereview` 仍然使用同一个 Claude Code slash command 指令文件 `.claude/commands/review.md`，只是进入 rereview mode。Claude Code 仍然是先生成 Markdown brief，再执行 `trellis channel` 命令；`rereview-brief*.md` 本身不会启动 Codex。

```text
/review --rereview
```

和普通 review 的差异在 brief 内容：`rereview-brief*.md` 会基于最近一次 `codex-review*.md`、最近一次 `review-fix-summary*.md`（如果存在）以及当前 fix diff 生成，要求 Codex 只确认上一轮 findings 是否修好、修复是否引入新问题、是否仍有 Blocking。

`rereview-brief*.md` 生成之后，调用链与 `/review` 相同，只是 channel 名称通常改为 `rereview-<task-slug>-<timestamp>`，发送的 brief 换成 `<rereview-brief-path>`，结果保存为下一份 `codex-review*.md`：

1. Claude Code 创建 rereview channel：

   ```bash
   trellis channel create <channel-name> --task <task-path> --by review
   ```

2. Claude Code 再次通过 `spawn` 启动 Codex-backed check worker：

   ```bash
   trellis channel spawn <channel-name> \
     --agent check \
     --provider codex \
     --as check-codex \
     --file <task-path>/prd.md \
     --file <task-path>/design.md \
     --file <task-path>/implement.md \
     --jsonl <task-path>/check.jsonl \
     --cwd "$PWD" \
     --timeout 30m
   ```

3. `spawn` 仍然是真正把 Codex 拉起来的步骤；`--provider codex` 仍然是选择 Codex provider 的开关。

4. Claude Code 把复审 brief 发给同一个 worker handle：

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <rereview-brief-path>
   ```

5. Claude Code 等待 `check-codex` 的 `done` 事件：

   ```bash
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   ```

6. Claude Code 保存 Codex 复审输出为下一份 review 结果：

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --last 100 > <review-result-path>
   ```

复审文字时序图：

```text
Claude Code
  -> Files: 读取 latest codex-review*.md、latest review-fix-summary*.md、当前 fix diff
  -> Files: 写出 <task>/review/rereview-brief*.md
  -> trellis channel CLI: create rereview-* --task <task> --by review
  -> trellis channel CLI: spawn rereview-* --agent check --provider codex --as check-codex ...

trellis channel CLI / supervisor
  -> Supervisor/Codex worker: 启动 Codex-backed check worker

Claude Code
  -> trellis channel CLI: send rereview-* --as review --to check-codex --text-file <rereview-brief-path>
  -> trellis channel CLI: wait rereview-* --as review --from check-codex --kind done --timeout 30m
  -> trellis channel CLI: messages rereview-* --raw --from check-codex --last 100
  -> Files: 保存为 <task>/review/下一份 codex-review*.md
```

普通 review 与 rereview 的输入、输出和关注点差异：

| 项目 | `/review` | `/review --rereview` |
| --- | --- | --- |
| 生成的 brief | `review-brief*.md` | `rereview-brief*.md` |
| brief 主要输入 | active task artifacts、当前 git diff scope、已跑检查、风险说明 | 最新 `codex-review*.md`、最新 `review-fix-summary*.md`、当前 fix diff、task artifacts |
| Codex 启动方式 | `trellis channel spawn ... --agent check --provider codex --as check-codex` | 同一条 spawn 链 |
| Markdown 发送方式 | `send ... --to check-codex --text-file <review-brief-path>` | `send ... --to check-codex --text-file <rereview-brief-path>` |
| 完成检测 | `wait ... --from check-codex --kind done --timeout 30m` | 同一条 wait 链 |
| 结果保存 | `codex-review*.md` | 下一份 `codex-review*.md`，例如 `codex-review-001.md` |
| 关注点 | correctness、requirement coverage、regression、task/spec alignment、权限/配置/数据形状变化 | 上次 findings 是否已修、修复是否引入新风险、是否仍有 Blocking；不重复已确认不处理的 Nice to Have 或 False Positive |

Rereview 结果要求按下面分组，方便下一步只处理仍然 actionable 的事项：

```text
Blocking
Should Fix
Nice to Have
Verified Fixed
False Positive / Not Applicable
New Risks Introduced
Final Recommendation
```

如果 rereview channel timeout 或 worker 卡住，使用与普通 review 相同的诊断命令查看 channel raw messages、progress messages 和 channel list。

### `/spec-cleanup` — Spec 清理

`/spec-cleanup` 会自动审查、安全整理并整合 `.trellis/spec/`。它会保留当前有效规则，自动归档历史任务文档，自动废弃已被替代的旧流程规则，把低风险重复 spec 自动合并到 canonical guide，更新旧引用到 canonical 文件，并移除过时的全量读取 spec 写法，但不覆盖 Trellis 原生 context 选择。只有在删除、歧义、冲突或会改变核心行为的操作时才会询问确认。

```text
/spec-cleanup
```

## 选择性 Spec 加载

命令不应默认盲目全量读取 `.trellis/spec/`。`/task` 和 `/fix` 交给 Trellis 原生 workflow、task context 和 spec index 判断哪些项目规则相关；`/review`、`/review-fix`、`/review --rereview` 和 `/spec-cleanup` 会先读取自己的目标 guide/template，再按命令需要检查相关文件。

如果 `.trellis/spec/guides/minimal-implementation.md` 存在，相关命令会在 context curation 时把它加入 `implement.jsonl` 或 `check.jsonl`；不会依赖或要求修改 `.trellis/spec/**/index.md`。

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

## Review Brief 与 Review 闭环

Review Brief Markdown 是 `/review` 发送给 Codex check worker 的结构化输入，不是 Trellis check 的替代品。它把 task 背景、变更范围、已跑检查、风险点和 review prompt 固定下来，让 worker 只审查当前 task 的 git diff scope，而不是盲目审查整个仓库。

推荐 review 闭环：

1. Claude Code / Trellis 完成实现和本地检查。
2. 使用 `/review` 生成 `review-brief*.md`，并通过 `trellis channel` 运行一个 Codex check worker。
3. `/review` 保存 Codex 输出到 `.trellis/tasks/<task>/review/codex-review*.md`。
4. 使用 `/review-fix` 修复 Blocking / Should Fix findings，并生成 `review-fix-summary*.md`。
5. 使用 `/review --rereview` 基于上次 review、fix summary 和本次 fix diff 复审。
6. 如果 rereview 仍有 Blocking / Should Fix，继续 `/review-fix`；如果没有 actionable finding，就由用户决定是否 commit、finish-work 或做后续发布。

```text
实现 + 本地检查
  |
  |  交付物：代码/文档 diff、已运行的 lint/typecheck/test 结果
  v
/review
  |
  |  读取：active task + task artifacts + git diff scope
  |  写出：review-brief*.md
  |  Channel：create review-* -> spawn check-codex -> send brief -> wait done -> messages raw
  v
codex-review*.md
  |
  |  人/命令读取 findings，按 Blocking / Should Fix / Nice to Have / False Positive / Needs Human Decision 分类
  v
/review-fix
  |
  |  只修 Blocking / Should Fix；Nice to Have 默认不修；False Positive 只记录理由
  |  写出：review-fix-summary*.md
  v
review-fix-summary*.md + 当前 fix diff
  |
  v
/review --rereview
  |
  |  读取：上一份 codex-review*.md + review-fix-summary*.md + 当前 fix diff
  |  写出：rereview-brief*.md
  |  Channel：create rereview-* -> spawn check-codex -> send brief -> wait done -> messages raw
  v
下一份 codex-review*.md
  |
  |  输出分组：Blocking / Should Fix / Nice to Have / Verified Fixed /
  |          False Positive / Not Applicable / New Risks Introduced / Final Recommendation
  v
继续修复或结束 task
```

职责边界必须保持清晰：

- `/review` 和 `/review --rereview` 是 channel wrapper，只负责准备 brief、调用 `trellis channel` 并保存 worker raw output；不实现自定义 worker 调度、等待、消息读取、清理逻辑或 event-log 解析。
- `/review-fix` 是本地修复命令，只读 saved review result 并修改本地文件；不调用 Codex、Claude Review 或其他外部 reviewer，不 spawn worker，不 wait channel，不自动运行 `/review --rereview`。
- 默认 `/review` 只启动一个 Codex reviewer：`check-codex`。多 reviewer 是 Trellis Channel 的高级协同用法，不是默认 review 行为。

## Trellis Channel Review

如果你只关心 “md 生成后怎么把 Codex 调起来”，以上 `/review` 和 `/review --rereview` 两节就是主链路：Claude Code 读 `.claude/commands/review.md`，然后依次执行 `create`、`spawn --provider codex`、`send --text-file`、`wait --kind done`、`messages --raw`。本节保留 Trellis Channel 的多 agent 行为模型，说明同一个 runtime 如何扩展到并行 reviewer；这不是 `/review` 的默认行为。

### Channel 心智模型

```text
Channel = 一个按顺序追加的事件日志

create event
  记录 channel 名称、task、创建者、cwd 等元信息

spawned event
  记录 worker handle、provider、agent card、pid、注入的 --file 与 --jsonl manifests

message event
  由 send 写入；可 broadcast，也可 --to 某个 worker

awake / turn_started / progress / message / turn_finished
  由 runtime 和 worker 在执行过程中写入；progress 适合排障，message 是 worker 正文输出

done / error / killed / supervisor_warning
  由 Trellis runtime 写入，dispatcher 应等待这些系统事件，而不是等待 worker 正文里的自定义文字
```

核心角色：

| 角色 | 说明 |
| --- | --- |
| Dispatcher | 创建 channel、spawn worker、发送任务、等待完成、读取 raw messages。`/review` 中的 dispatcher 身份通常是 `review`；普通人工协同时可以是 `main`。 |
| Channel | 本地持久事件日志；所有参与者共享同一条日志，但通过 `--from`、`--to`、`--kind` 过滤。 |
| Worker | 由 `trellis channel spawn` 启动并监管的子 agent 进程/会话。它通过 handle 接收定向消息，带着注入 context 独立执行，并把 `progress`、`message`、`done`、`error` 等事件写回 channel；例如 `check-codex` 是 Codex check worker。 |
| Worker handle | `spawn --as <name>` 产生的稳定地址，例如 `check-codex`、`check-claude`、`check-cx`。后续 `send --to`、`wait --from`、`messages --from` 都依赖它。 |
| Agent card / provider | `--agent check` 决定 worker 角色提示；`--provider codex` 可覆盖 provider。 |
| Context injection | `--file` 直接注入 task 文件；`--jsonl` 按 manifest 注入 spec/research 文件。spawned event 会记录注入结果，便于审计 worker 到底看到了什么。 |
| Raw audit | `messages --raw` 输出 JSON lines，是保存 review 结果和排障的可信来源。 |

### 关键命令语义

| 命令 | 在 `/review` / `/review --rereview` 中的作用 | 多 agent 协同中的作用 |
| --- | --- | --- |
| `trellis channel create` | 创建本次 review/rereview 的可追踪 channel，并关联 task。 | 创建一个协作房间 / 共享事件日志，可用于 review、brainstorm、实现讨论或排障。 |
| `trellis channel spawn` | 启动 `check-codex` worker，注入 task files 和 `check.jsonl`。 | 为每个参与 agent 创建稳定 worker handle，例如 `check-claude`、`check-cx`、`architect-codex`。 |
| `trellis channel send --text-file` | 把 `review-brief*.md` 或 `rereview-brief*.md` 定向发送给 `check-codex`。 | dispatcher 可用 `--to <worker>` 给不同 agent 发同一份 brief，也可以给不同 worker 发不同问题。长文本用 `--text-file` 或 `--stdin`。 |
| `trellis channel wait --kind done` | 等待 `check-codex` 发出 Trellis runtime 的完成事件。 | 用 `--from a,b --all --kind done` 等待多个 worker 都完成；timeout 时可看到尚未完成的 worker。 |
| `trellis channel messages --raw` | 读取 worker 原始事件并保存为 `codex-review*.md`。 | 审计每个 agent 的输出、progress、error，并用于人工汇总、修复或复审。 |

路由规则要点：

- `--as` 在 `spawn` 中是 worker handle；在 `send` / `wait` / `interrupt` 中是当前说话者身份。
- `--to` 表示定向投递目标；省略 `--to` 的 `send` 是 broadcast。
- Worker inbox 默认是 `explicitOnly`：只有 `send --to <worker>` 或 `interrupt --to <worker>` 会唤醒它。
- 如果 `spawn` 指定 `--inbox-policy broadcastAndExplicit`，broadcast 消息也会唤醒 worker；默认 `/review` 不需要这个模式，因为它总是定向发送给 `check-codex`。
- `--from` 用来筛选事件来源；读取某个 worker 的结果时用 `messages --from <worker>`，等待某个 worker 完成时用 `wait --from <worker>`。
- `--all` 只在等待多个来源时使用，含义是每个列出的 worker 都必须发出匹配事件；没有 `--all` 时，任一匹配事件即可唤醒等待方。
- `--kind done` / `--kind turn_finished` 等是 Trellis runtime 事件过滤；不要发明自定义完成 tag，也不要让 dispatcher 依赖 worker 正文里的某句话。

### 默认单 reviewer 与并行多 reviewer 的关系

默认 `/review` 和 `/review --rereview` 只 spawn 一个 Codex check worker，通常命名为 `check-codex`。这样做能让 review 结果路径、等待语义和 fix/rereview 闭环保持简单稳定。

并行多 reviewer 是同一 Trellis Channel runtime 的高级用法，适合需要交叉检查、让不同 provider 各自审查、或让一个 agent 做 correctness review、另一个 agent 做 compatibility/security review 的场景。它不改变 `/review` 的默认行为：如果你只是运行 `/review`，不会自动启动多个 reviewer。

```text
人工 / main dispatcher
  |
  | create 一个 channel，例如 cr-feature-review
  v
+------------------------------------------------------------------+
| Channel: cr-feature-review                                       |
|  持久事件日志：create / spawned / message / progress / done / ... |
+------------------------------------------------------------------+
  |                         |                         |
  | spawn --as check-claude | spawn --as check-cx     | 可选 spawn --as security-cx
  v                         v                         v
check-claude              check-cx                  security-cx
  |                         |                         |
  | send --to check-claude  | send --to check-cx      | send --to security-cx
  | --text-file brief       | --text-file brief       | --text-file focused brief
  v                         v                         v
独立审查同一 diff          独立审查同一 diff          审查特定风险维度
  |                         |                         |
  | progress/message/done   | progress/message/done   | progress/message/done
  +------------+------------+------------+------------+
               |
               | wait --from check-claude,check-cx,security-cx --all --kind done
               v
        dispatcher 读取 messages --raw
               |
               | 人工 synthesis：去重、合并 severity、判断 false positive、形成修复计划
               v
        /review-fix 或手动修复 -> /review --rereview
```

实用命令骨架：

```bash
TASK=.trellis/tasks/05-13-example
CHANNEL=cr-example-review
BRIEF="$TASK/review/review-brief.md"

trellis channel create "$CHANNEL" --task "$TASK" --by main

trellis channel spawn "$CHANNEL" \
  --agent check \
  --as check-claude \
  --file "$TASK/prd.md" \
  --file "$TASK/design.md" \
  --file "$TASK/implement.md" \
  --jsonl "$TASK/check.jsonl" \
  --cwd "$PWD" \
  --timeout 30m

trellis channel spawn "$CHANNEL" \
  --agent check \
  --provider codex \
  --as check-cx \
  --file "$TASK/prd.md" \
  --file "$TASK/design.md" \
  --file "$TASK/implement.md" \
  --jsonl "$TASK/check.jsonl" \
  --cwd "$PWD" \
  --timeout 30m

trellis channel send "$CHANNEL" \
  --as main \
  --to check-claude \
  --text-file "$BRIEF"

trellis channel send "$CHANNEL" \
  --as main \
  --to check-cx \
  --text-file "$BRIEF"

trellis channel wait "$CHANNEL" \
  --as main \
  --from check-claude,check-cx \
  --all \
  --kind done \
  --timeout 30m

trellis channel messages "$CHANNEL" \
  --raw \
  --from check-claude \
  --last 100 > "$TASK/review/claude-review.md"

trellis channel messages "$CHANNEL" \
  --raw \
  --from check-cx \
  --last 100 > "$TASK/review/codex-review.md"
```

实际使用时注意：

- `--file` 和 `--jsonl` 只传存在的文件；如果 task 没有 `design.md` 或 `implement.md`，就不要传对应 flag。
- 多个 worker 必须使用稳定且互不冲突的 `--as` 名称，否则后续 `send`、`wait`、`messages` 很难准确路由。
- 给多个 worker 发送同一份 brief 时，应该分别 `send --to <worker>`；不要依赖 broadcast 唤醒默认 `explicitOnly` worker。
- 并行 reviewer 的输出需要人工 synthesis：多个 agent 可能重复报告同一问题、severity 不一致，或者一个 agent 报 False Positive。Channel 只负责收集事件，不替你自动裁决 findings。
- 如果某个 worker timeout，`wait --all` 会让你知道仍在等待哪些来源；随后用 raw/progress 诊断命令查看它是否卡住、报错或没有被唤醒。

### Channel 排障

排查 channel 时优先使用：

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

不要把直接读取 `events.jsonl` 作为主要结果读取方式，除非是最后排障手段。等待 worker 完成时优先依赖 Trellis runtime 发出的 `done` / `turn_finished` 等事件，不要依赖 worker 在正文里写某个自定义完成标记。常见排障思路：

- 没有 `spawned`：检查 `trellis channel spawn` 是否失败、agent card 是否存在、provider 是否可用。
- 有 `spawned` 但没有 `awake` / `progress`：检查是否忘记 `send --to <worker>`，或 worker inbox policy 是否只接受 explicit 消息。
- 有 `progress` 但没有 `done`：查看 progress raw messages，确认 worker 是否在等待输入、超时、遇到工具错误或 OOM guard 警告。
- `wait --all` timeout：用 `messages --raw --from <worker>` 分别查看每个 worker，定位尚未发出 `done` 的来源。
- 结果文件为空或不完整：确认保存结果时使用的是 `messages --raw --from <worker> --last 100`，而不是被截断的 pretty output。

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

- Claude Code 负责实现已准备好的 task、小修复和 review findings 明确指出的问题。
- Trellis 内置 check 是默认验证方式。
- `/review` 和 `/review --rereview` 通过 `trellis channel` 调用 Codex check worker。
- `/review-fix` 只负责根据 saved review findings 修复代码，不负责 worker 调度。
- Nice to Have 默认不自动修。
- 是否 commit、push、merge 或 finish-work 由用户决定。

## 更新已安装文件

当项目里已经安装过这个 kit，想把已安装模板更新到当前包版本时，请运行：

```bash
trellis-kit update
```

`update` 会用包内模板覆盖已安装的 kit 文件。运行前请先检查本地自定义内容。

如果你正在从旧版本迁移，旧版本曾把 review 脚本安装到 `.trellis/scripts/` 或 `.trellis/spec/scripts/`，或在 `.trellis/spec/` 下安装过已改名的旧 Review Brief 模板，可以在安装当前文件后显式清理这些旧文件：

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
```

不确定时先 dry run：

```bash
trellis-kit update --dry-run
trellis-kit update --dry-run --prune-old
```

## 迁移说明

### Claude 命令面

旧版本可能安装过 `.claude/commands/dev.md`。如果存在，请确认不再需要后手动删除。

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

test -f .trellis/spec/guides/review-workflow.md
test -f .trellis/spec/guides/review-loop-workflow.md
test -f .trellis/spec/guides/minimal-implementation.md
test -f .trellis/spec/templates/review-brief-template.md
test -f .trellis/spec/templates/rereview-brief-template.md
test -f .trellis/spec/templates/review-fix-summary-template.md
test -f .trellis/spec/guides/development-location-decision.md
test -f .trellis/spec/guides/fast-path-change-policy.md
test -f .trellis/spec/guides/spec-cleanup-guide.md
test -f .claude/commands/task.md
test -f .claude/commands/fix.md
test -f .claude/commands/review.md
test -f .claude/commands/review-fix.md
test -f .claude/commands/spec-cleanup.md
test ! -f .claude/commands/dev.md
```
