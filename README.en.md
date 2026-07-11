# Trellis Kit

Trellis Kit does not replace Trellis native workflow. It adds focused Claude commands around it:

- `/coding <task-id>`: switch/start/continue a Trellis task and decide the development location before implementation.
- `/fix <request>`: lightweight fast path for small fixes.
- `/review`: generate a review brief for the current Trellis task and invoke a Codex check worker through `trellis channel`; also supports rereview mode.
- `/review-fix`: read the latest Codex review result and fix only Blocking / Should Fix findings by default.
- `/spec-cleanup`: automatically clean, archive, deprecate, and consolidate `.trellis/spec/`.

It is a small Node.js CLI package with no runtime dependencies. This kit is local-only. It does not create GitHub Actions, does not push, does not merge, and does not run Codex Review during installation.

[中文 README](README.md)

## Rename Notice

This project was previously named `trellis-codex-review-kit`.

The new package and CLI name is `trellis-kit`.

If you installed the old package globally, uninstall it first:

```bash
npm uninstall -g trellis-codex-review-kit
npm install -g trellis-kit
```

If your project still references the old command, replace:

```bash
trellis-codex-review-kit
```

with:

```bash
trellis-kit
```

## What It Installs

Running `trellis-kit init` installs Markdown templates and Claude command templates:

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

The installed files should be committed into the target project so the workflow is stable, reviewable, and editable by the team.

## Prerequisites

- Node.js
- git
- Trellis
- Claude Code
- Codex CLI available as `codex` (optional; only needed when running `/review` or `/review --rereview` Codex workers)

## Install Package

From this package repository (local development install):

```bash
npm install -g .
```

From npm (remote install):

```bash
npm install -g trellis-kit
```

If you do not want a global install, you can also run the published CLI through `npx`:

```bash
npx trellis-kit init
```

Verify:

```bash
trellis-kit --help
trellis-kit --version
```

## Local Development

Run the CLI directly from this repository:

```bash
node bin/trellis-kit.js --help
node bin/trellis-kit.js init --dry-run
```

## Install Into a Project

Example setup flow:

```bash
cd your-project
trellis init -u amin --claude --codex
trellis-kit init
```

Preview without writing:

```bash
trellis-kit init --dry-run
```

If you intentionally want to reinstall during init and overwrite existing files:

```bash
trellis-kit init --force
```

Preview overwrite actions without writing:

```bash
trellis-kit init --force --dry-run
```

For routine updates to already installed kit files, use `update` instead of `init --force`; see [Updating Installed Files](#updating-installed-files).

By default, `init` skips existing files:

```text
SKIP existing: .claude/commands/coding.md
```

## Daily Workflow

### `/coding <task-id>` — Full Trellis Task Entrypoint

Use `/coding <task-id>` for prepared Trellis tasks. It resolves the current or requested task, switches only after exactly one match is found, reads the development-location guide, asks whether to use the current workspace or `.worktrees/<task-id>` before implementation when needed, and then continues native `/trellis:continue` phase routing.

```text
/coding 06-24-school-operation-log
/coding school-operation-log
```

`/coding` does not create a new task, does not load all of `.trellis/spec/` by default, does not automatically generate Review Brief, and does not review, commit, push, merge, rebase, or finish-work.

### `/fix <request>` — Fast Path Fix

Use `/fix` for small bug fixes, small adjustments, and low-risk patches in the current workspace. It does not create a full Trellis task, does not create PRD/DESIGN/TASK documents, does not generate Review Brief by default, does not commit, and does not run review by default.

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
```

### `/review` — Trellis Channel Review

The `.claude/commands/review.md` file behind `/review` is a Claude Code slash command instruction file. Claude Code reads that Markdown and runs shell/tool commands in the current project; the Markdown command file does not call Codex by itself, and the generated `review-brief*.md` does not call Codex by itself either.

The step that actually starts Codex is the channel spawn command after brief generation: `trellis channel spawn <channel-name> --agent check --provider codex --as check-codex ...`. The `--provider codex` flag selects the Codex provider, and `check-codex` is the worker handle used later by `send`, `wait`, and `messages`.

```text
/review
```

`/review` prepares inputs first, then calls the channel runtime:

1. Read the active Trellis task: `python3 ./.trellis/scripts/task.py current --source`.
2. Read task context: `prd.md` is required; `design.md`, `implement.md`, `check.jsonl`, and task-local docs are read when present.
3. Read git scope: `git status --short`, `git diff`, `git diff --cached`, plus task-related untracked files.
4. Generate `.trellis/tasks/<task>/review/review-brief*.md` from `.trellis/spec/templates/review-brief-template.md`.

After `review-brief*.md` is generated, the exact invocation chain is below. The real command substitutes concrete values for `<channel-name>`, `<task-path>`, `<review-brief-path>`, and `<review-result-path>`, and skips `--file` / `--jsonl` inputs that do not exist.

1. Claude Code creates the review channel:

   ```bash
   trellis channel create <channel-name> --task <task-path> --by review
   ```

2. Claude Code starts the Codex-backed check worker:

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

3. The `spawn` command above is the step that actually starts Codex: the Trellis Channel supervisor loads the check agent role from `--agent check`, selects Codex through `--provider codex`, and registers the worker as `check-codex`.

4. Claude Code sends the generated Markdown brief to the Codex worker:

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <review-brief-path>
   ```

   `--text-file <review-brief-path>` reads that Markdown file and writes its content as a channel message. `--to check-codex` targets the Codex worker inbox; the Markdown file itself is not executing anything.

5. Claude Code waits for the Codex worker to finish:

   ```bash
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   ```

   Completion is the Trellis runtime/supervisor `done` event, not a custom sentence inside the worker's prose.

6. Claude Code saves the Codex output:

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --last 100 > <review-result-path>
   ```

   The actual save path is `.trellis/tasks/<task>/review/codex-review*.md`. Existing history is preserved with numbered files such as `codex-review-001.md` and `codex-review-002.md`.

Text sequence diagram:

```text
User
  -> Claude Code: enter /review

Claude Code
  -> Files: read active task, task artifacts, and git diff scope
  -> Files: write <task>/review/review-brief*.md

Claude Code
  -> trellis channel CLI: create <channel-name> --task <task-path> --by review

trellis channel CLI
  -> Files/channel log: record create event

Claude Code
  -> trellis channel CLI: spawn <channel-name> --agent check --provider codex --as check-codex ...

trellis channel CLI / supervisor
  -> Supervisor/Codex worker: start Codex-backed check worker and record spawned event

Claude Code
  -> trellis channel CLI: send <channel-name> --as review --to check-codex --text-file <review-brief-path>

trellis channel CLI
  -> Supervisor/Codex worker: deliver review-brief*.md content to the check-codex inbox

Supervisor/Codex worker
  -> Files/channel log: write progress / message / done events

Claude Code
  -> trellis channel CLI: wait <channel-name> --as review --from check-codex --kind done --timeout 30m

trellis channel CLI
  -> Claude Code: return after seeing the check-codex done event

Claude Code
  -> trellis channel CLI: messages <channel-name> --raw --from check-codex --last 100
  -> Files: shell redirection saves <task>/review/codex-review*.md
```

Default output paths:

```text
.trellis/tasks/<task>/review/review-brief.md
.trellis/tasks/<task>/review/codex-review.md
```

When history exists, numbered files such as `review-brief-001.md`, `review-brief-002.md`, `codex-review-001.md`, and `codex-review-002.md` are used so prior reviews are not overwritten. If `spawn`, `send`, `wait`, or timeout handling fails, do not read `events.jsonl` as the primary result path. Prefer these channel diagnostics for raw output, progress, and channel listing:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

### `/review-fix` — Review Finding Fixes

Use `/review-fix` to read the current task's latest Codex review result, classify findings, and fix Blocking / Should Fix findings by default.

```text
/review-fix
```

`/review-fix` writes:

```text
.trellis/tasks/<task>/review/review-fix-summary.md
```

It does not call reviewers, spawn workers, wait on channels, run `/review --rereview`, or commit. Nice to Have findings are not fixed by default, False Positive findings are documented with reasons, and Needs Human Decision findings are deferred for confirmation.

### `/review --rereview` — Trellis Channel Rereview

`/review --rereview` still uses the same Claude Code slash command instruction file, `.claude/commands/review.md`; it just enters rereview mode. Claude Code still generates a Markdown brief first and then runs `trellis channel` commands. The generated `rereview-brief*.md` does not start Codex by itself.

```text
/review --rereview
```

The difference from normal review is the brief content: `rereview-brief*.md` is generated from the latest `codex-review*.md`, the latest `review-fix-summary*.md` when present, and the current fix diff. It asks Codex to focus only on whether previous findings were fixed, whether the fixes introduced new issues, and whether Blocking issues remain.

After `rereview-brief*.md` is generated, the invocation chain is the same as `/review`. The channel name usually changes to `rereview-<task-slug>-<timestamp>`, the sent brief becomes `<rereview-brief-path>`, and the result is saved as the next `codex-review*.md` file.

1. Claude Code creates the rereview channel:

   ```bash
   trellis channel create <channel-name> --task <task-path> --by review
   ```

2. Claude Code starts the Codex-backed check worker again through `spawn`:

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

3. `spawn` is still the step that actually starts Codex; `--provider codex` still selects the Codex provider.

4. Claude Code sends the rereview brief to the same worker handle:

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <rereview-brief-path>
   ```

5. Claude Code waits for the `check-codex` `done` event:

   ```bash
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   ```

6. Claude Code saves Codex rereview output as the next review result:

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --last 100 > <review-result-path>
   ```

Rereview text sequence diagram:

```text
Claude Code
  -> Files: read latest codex-review*.md, latest review-fix-summary*.md, and current fix diff
  -> Files: write <task>/review/rereview-brief*.md
  -> trellis channel CLI: create rereview-* --task <task> --by review
  -> trellis channel CLI: spawn rereview-* --agent check --provider codex --as check-codex ...

trellis channel CLI / supervisor
  -> Supervisor/Codex worker: start Codex-backed check worker

Claude Code
  -> trellis channel CLI: send rereview-* --as review --to check-codex --text-file <rereview-brief-path>
  -> trellis channel CLI: wait rereview-* --as review --from check-codex --kind done --timeout 30m
  -> trellis channel CLI: messages rereview-* --raw --from check-codex --last 100
  -> Files: save as the next <task>/review/codex-review*.md
```

Normal review and rereview differ in inputs, outputs, and focus:

| Item | `/review` | `/review --rereview` |
| --- | --- | --- |
| Generated brief | `review-brief*.md` | `rereview-brief*.md` |
| Main brief inputs | active task artifacts, current git diff scope, checks run, known risks | latest `codex-review*.md`, latest `review-fix-summary*.md`, current fix diff, task artifacts |
| Codex start path | `trellis channel spawn ... --agent check --provider codex --as check-codex` | same spawn chain |
| Markdown send path | `send ... --to check-codex --text-file <review-brief-path>` | `send ... --to check-codex --text-file <rereview-brief-path>` |
| Completion detection | `wait ... --from check-codex --kind done --timeout 30m` | same wait chain |
| Result file | `codex-review*.md` | next `codex-review*.md`, for example `codex-review-001.md` |
| Review focus | correctness, requirement coverage, regressions, task/spec alignment, permission/config/data-shape changes | whether previous findings were fixed, whether fixes introduced new risks, whether Blocking remains; do not repeat Nice to Have items already confirmed as not being handled or issues already marked False Positive |

Rereview output is requested in these groups so the next step can handle only still-actionable items:

```text
Blocking
Should Fix
Nice to Have
Verified Fixed
False Positive / Not Applicable
New Risks Introduced
Final Recommendation
```

If the rereview channel times out or the worker stalls, use the same diagnostics as normal review to inspect channel raw messages, progress messages, and channel list.

### `/spec-cleanup` — Spec Cleanup

`/spec-cleanup` automatically audits, safely organizes, and consolidates `.trellis/spec/`. It keeps active guides, archives historical task specs, deprecates replaced workflow rules, merges low-risk duplicate specs into canonical guides, updates references to canonical files, and removes stale broad spec-loading wording without overriding Trellis-native context selection. It asks for confirmation before destructive, ambiguous, conflicting, or behavior-changing actions.

```text
/spec-cleanup
```

## Selective Spec Loading

Commands should not blindly load the entire `.trellis/spec/` directory by default. `/coding` and `/fix` rely on native Trellis workflow, task context, and spec indexes to decide which project rules are relevant. `/review`, `/review-fix`, `/review --rereview`, and `/spec-cleanup` read their targeted guide/template first, then inspect only the files needed for the command.

When `.trellis/spec/guides/minimal-implementation.md` exists, relevant commands curate it into `implement.jsonl` or `check.jsonl`; they do not rely on or require edits to `.trellis/spec/**/index.md`.

## Development Location

Worktree selection happens inside `/coding`, before implementation.

If the user chooses a task-specific worktree, Trellis Kit uses:

```text
.worktrees/<task-id>
```

with branch:

```text
task/<task-id>
```

Before creating a task worktree, the agent verifies `.gitignore` contains `.worktrees/`; if missing, it asks before adding it. If Trellis planning/design/task artifacts are uncommitted, it warns before creating the worktree. If implementation has already started and code is dirty, it defaults to continuing the current workspace.

Worktrees must not be created in:

```text
.trellis/worktrees/
../<repo>-worktrees/
../<repo>-<task-id>
/tmp/
```

## Review Brief And Review Loop

Review Brief Markdown is the structured input that `/review` sends to a Codex check worker. It is not a replacement for Trellis native check. It freezes the task context, diff scope, checks performed, known risks, and review prompt so the worker reviews only the current task's git diff scope instead of the whole repository.

Recommended review loop:

1. Claude Code / Trellis finishes implementation and local checks.
2. Run `/review` to generate `review-brief*.md` and run one Codex check worker through `trellis channel`.
3. `/review` saves Codex output to `.trellis/tasks/<task>/review/codex-review*.md`.
4. Run `/review-fix` to fix Blocking / Should Fix findings and generate `review-fix-summary*.md`.
5. Run `/review --rereview` to rereview using the prior review, fix summary, and current fix diff.
6. If rereview still reports Blocking / Should Fix findings, repeat `/review-fix`; otherwise the user decides whether to commit, finish-work, or continue toward release.

```text
Implementation + local checks
  |
  |  Outputs: code/doc diff and lint/typecheck/test results already run
  v
/review
  |
  |  Reads: active task + task artifacts + git diff scope
  |  Writes: review-brief*.md
  |  Channel: create review-* -> spawn check-codex -> send brief -> wait done -> messages raw
  v
codex-review*.md
  |
  |  Human/command reads findings and classifies Blocking / Should Fix /
  |  Nice to Have / False Positive / Needs Human Decision
  v
/review-fix
  |
  |  Fixes only Blocking / Should Fix by default; records Nice to Have deferral
  |  and False Positive rationale
  |  Writes: review-fix-summary*.md
  v
review-fix-summary*.md + current fix diff
  |
  v
/review --rereview
  |
  |  Reads: prior codex-review*.md + review-fix-summary*.md + current fix diff
  |  Writes: rereview-brief*.md
  |  Channel: create rereview-* -> spawn check-codex -> send brief -> wait done -> messages raw
  v
next codex-review*.md
  |
  |  Output groups: Blocking / Should Fix / Nice to Have / Verified Fixed /
  |                 False Positive / Not Applicable / New Risks Introduced / Final Recommendation
  v
Continue fixing or finish the task
```

Keep the responsibility boundaries clear:

- `/review` and `/review --rereview` are channel wrappers. They prepare briefs, call `trellis channel`, and save worker raw output; they do not implement custom worker scheduling, waiting, message reading, cleanup logic, or event-log parsing.
- `/review-fix` is a local fix command. It reads saved review results and edits local files; it does not call Codex, Claude Review, or other external reviewers, does not spawn workers, does not wait on channels, and does not automatically run `/review --rereview`.
- default /review starts only one Codex reviewer: `check-codex`. Multiple reviewers are an advanced Trellis Channel collaboration pattern, not the default review behavior.

## Trellis Channel Review

If you only need to know how Codex is started after Markdown generation, the `/review` and `/review --rereview` sections above are the main path: Claude Code reads `.claude/commands/review.md`, then runs `create`, `spawn --provider codex`, `send --text-file`, `wait --kind done`, and `messages --raw` in order. This section explains the Trellis Channel multi-agent behavior model and how the same runtime can expand to parallel reviewers; that is not the default `/review` behavior.

### Channel Mental Model

```text
Channel = one append-only durable event log

create event
  records channel name, task, creator, cwd, and related metadata

spawned event
  records worker handle, provider, agent card, pid, injected --file entries, and --jsonl manifests

message event
  written by send; can be broadcast or targeted with --to <worker>

awake / turn_started / progress / message / turn_finished
  written by the runtime and worker while work is running; progress is useful for debugging,
  message is the worker's prose output

done / error / killed / supervisor_warning
  written by the Trellis runtime; dispatchers should wait for these system events,
  not for custom words in worker prose
```

Core roles:

| Role | Meaning |
| --- | --- |
| Dispatcher | Creates the channel, spawns workers, sends tasks, waits for completion, and reads raw messages. In `/review`, the dispatcher identity is usually `review`; in ordinary human coordination it can be `main`. |
| Channel | Local durable event log shared by all participants; readers filter it with `--from`, `--to`, and `--kind`. |
| Worker | Child agent process/session started and supervised by `trellis channel spawn`. It receives targeted messages through its handle, runs independently with injected context, and writes `progress`, `message`, `done`, `error`, and related events back to the channel. `check-codex` is the Codex check worker used by `/review`. |
| Worker handle | Stable address created by `spawn --as <name>`, such as `check-codex`, `check-claude`, or `check-cx`. Later `send --to`, `wait --from`, and `messages --from` commands depend on it. |
| Agent card / provider | `--agent check` selects the worker role prompt; `--provider codex` selects Codex as the provider. |
| Context injection | `--file` injects task files directly; `--jsonl` injects spec/research files through a manifest. The spawned event records what was injected so the worker's context is auditable. |
| Raw audit | `messages --raw` emits JSON lines and is the trustworthy path for saving review results and debugging. |

### Key Command Semantics

| Command | Role in `/review` / `/review --rereview` | Role in multi-agent collaboration |
| --- | --- | --- |
| `trellis channel create` | Creates the traceable review/rereview channel and associates it with the task. | Creates a collaboration room / shared event log for review, brainstorm, implementation discussion, or debugging. |
| `trellis channel spawn` | Starts the `check-codex` worker and injects task files plus `check.jsonl`. | Creates stable worker handles for each participant, such as `check-claude`, `check-cx`, or `architect-codex`. |
| `trellis channel send --text-file` | Sends `review-brief*.md` or `rereview-brief*.md` directly to `check-codex`. | The dispatcher can send the same brief to multiple workers with `--to <worker>`, or send different questions to different workers. Long messages should use `--text-file` or `--stdin`. |
| `trellis channel wait --kind done` | Waits for the Trellis runtime completion event from `check-codex`. | Use `--from a,b --all --kind done` to wait for every listed worker; on timeout, inspect which source has not completed. |
| `trellis channel messages --raw` | Reads worker raw events and saves them as `codex-review*.md`. | Audits each agent's output, progress, and errors; the result is then used for human synthesis, fixing, or rereview. |

Routing rules to remember:

- `--as` is the worker handle in `spawn`; in `send`, `wait`, and `interrupt` it is the current speaker identity.
- `--to` targets a specific recipient; omitting `--to` from `send` broadcasts the message.
- Worker inbox policy defaults to `explicitOnly`: only `send --to <worker>` or `interrupt --to <worker>` wakes the worker.
- If `spawn` uses `--inbox-policy broadcastAndExplicit`, broadcast messages also wake the worker. Default `/review` does not need this mode because it always sends directly to `check-codex`.
- `--from` filters event sources. Use `messages --from <worker>` to read a worker's result and `wait --from <worker>` to wait for that worker.
- `--all` is used when waiting for multiple sources and means every listed worker must emit a matching event. Without `--all`, any matching event can release the wait.
- `--kind done` / `--kind turn_finished` are Trellis runtime event filters. Do not invent custom completion tags, and do not make the dispatcher depend on a sentence in worker prose.

### Default Single Reviewer And Parallel Reviewers

Default `/review` and `/review --rereview` spawn only one Codex check worker, usually named `check-codex`. That keeps review result paths, wait semantics, and the fix/rereview loop simple and stable.

Parallel reviewers are an advanced use of the same Trellis Channel runtime. They are useful when you want cross-checking, different providers reviewing the same diff, or separate dimensions such as correctness, compatibility, and security. This does not change default `/review`: running `/review` alone does not automatically start multiple reviewers.

```text
Human / main dispatcher
  |
  | create one channel, for example cr-feature-review
  v
+------------------------------------------------------------------+
| Channel: cr-feature-review                                       |
|  durable event log: create / spawned / message / progress / done |
+------------------------------------------------------------------+
  |                         |                         |
  | spawn --as check-claude | spawn --as check-cx     | optional spawn --as security-cx
  v                         v                         v
check-claude              check-cx                  security-cx
  |                         |                         |
  | send --to check-claude  | send --to check-cx      | send --to security-cx
  | --text-file brief       | --text-file brief       | --text-file focused brief
  v                         v                         v
independent same-diff     independent same-diff     focused risk review
review                    review
  |                         |                         |
  | progress/message/done   | progress/message/done   | progress/message/done
  +------------+------------+------------+------------+
               |
               | wait --from check-claude,check-cx,security-cx --all --kind done
               v
        dispatcher reads messages --raw
               |
               | human synthesis: dedupe findings, merge severity,
               | judge false positives, and create the fix plan
               v
        /review-fix or manual fixes -> /review --rereview
```

Minimal command sketch:

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

Practical notes:

- Pass only existing `--file` and `--jsonl` inputs. If a task has no `design.md` or `implement.md`, do not pass those flags.
- Multiple workers need stable, non-conflicting `--as` names, or later `send`, `wait`, and `messages` commands become hard to route precisely.
- When sending the same brief to multiple workers, send it separately with `send --to <worker>`; do not rely on broadcast to wake default `explicitOnly` workers.
- Parallel reviewer output needs human synthesis. Agents can duplicate findings, disagree on severity, or report false positives. Channel collects events; it does not adjudicate findings for you.
- If a worker times out, `wait --all` tells you which source is still pending. Then use the raw/progress diagnostics below to see whether it stalled, errored, or was never woken.

### Channel Troubleshooting

Prefer these diagnostics when debugging a channel:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

Do not read `events.jsonl` directly as the primary result path unless channel CLI diagnostics are insufficient. When waiting for workers, rely on Trellis runtime events such as `done` / `turn_finished`, not on a custom completion marker written in worker prose. Common debugging checks:

- No `spawned`: check whether `trellis channel spawn` failed, whether the agent card exists, and whether the provider is available.
- `spawned` exists but no `awake` / `progress`: check whether `send --to <worker>` was omitted, or whether the worker inbox policy only accepts explicit messages.
- `progress` exists but no `done`: inspect raw progress messages to see whether the worker is waiting for input, timed out, hit a tool error, or reported an OOM guard warning.
- `wait --all` timeout: use `messages --raw --from <worker>` for each worker to identify which source has not emitted `done`.
- Empty or incomplete result file: confirm the save command used `messages --raw --from <worker> --last 100`, not truncated pretty output.

## Safety Rules

The installer does not:

- Modify `.trellis/workflow.md`.
- Run `trellis init`.
- Install Trellis, Claude Code, or Codex CLI.
- Run Codex Review during installation.
- Delete files by default; only `update --prune-old` deletes the documented legacy review scripts under `.trellis/scripts/` and `.trellis/spec/scripts/`, old renamed templates under `.trellis/spec/`, and the old `.claude/commands/task.md` command.
- Delete older target-project Claude command files unless `update --prune-old` is explicitly used.
- Overwrite files unless `--force` is used with `init` or `update` is used intentionally.
- Push, merge, or rebase.
- Modify remote repositories.
- Create `.worktrees/` directory.
- Modify target project `.gitignore`.

The installed workflow tells Claude Code:

- Claude Code implements prepared tasks, small fixes, and explicitly reported review findings.
- Trellis native check is the default verification.
- `/review` and `/review --rereview` invoke Codex check workers through `trellis channel`.
- `/review-fix` only fixes code from saved review findings; it does not orchestrate workers.
- Nice to Have findings are not fixed automatically by default.
- The user decides whether to commit, push, merge, or finish-work.

## Updating Installed Files

Use `update` when the kit is already installed in a project and you want to refresh the installed templates from the current package version:

```bash
trellis-kit update
```

`update` overwrites installed kit files with the packaged templates. Review local customizations before running it.

If you are migrating from a version that installed review scripts under `.trellis/scripts/` or `.trellis/spec/scripts/`, old renamed Review Brief templates under `.trellis/spec/`, or `.claude/commands/task.md`, explicitly prune those old files after installing the current files:

```bash
trellis-kit update --prune-old
```

`--prune-old` deletes only these legacy files when they exist:

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

Use dry run first when unsure:

```bash
trellis-kit update --dry-run
trellis-kit update --dry-run --prune-old
```

## Migration Notes

### Claude Command Surface

Older versions may have installed `.claude/commands/task.md`. The current entrypoint is `/coding`, and no compatibility alias is installed; run `trellis-kit update --prune-old` to remove the old file.

Even older versions may have installed `.claude/commands/dev.md`. Remove it manually if it exists.

### Worktree Path Change

Older versions may have recommended worktree paths such as `../<repo>-worktrees/<task-id>`, `../<repo>-<task-id>`, or `.trellis/worktrees/<task-id>`. The current version uses only `.worktrees/<task-id>`.

## Troubleshooting

### `.trellis directory not found`

Initialize Trellis in the target project first:

```bash
trellis init -u amin --claude --codex
```

The installer warns about missing `.trellis`, but it does not fail because some users may prepare directories manually.

## Local Manual Test Outline

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
test -f .claude/commands/coding.md
test -f .claude/commands/fix.md
test -f .claude/commands/review.md
test -f .claude/commands/review-fix.md
test -f .claude/commands/spec-cleanup.md
test ! -f .claude/commands/dev.md
```
