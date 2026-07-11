# Trellis Kit

Trellis Kit does not replace Trellis native workflow. It adds focused Claude commands around it:

- `/coding <task-id>`: switch/start/continue a Trellis task and decide the development location before implementation.
- `/fix <request>`: lightweight fast path for small fixes.
- `/review`: generate a review brief for the current Trellis task and invoke a Codex review-only worker through `trellis channel`; also supports rereview mode.
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
npm test
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

Claude Code executes `/review` by reading `.claude/commands/review.md`. The default flow names no Trellis agent and adds no agent type. It explicitly starts one Codex `check-codex` worker, injects the current numbered brief into the system prompt with `spawn --file`, then sends the same brief to start the turn and record `SEND_SEQ`. The brief's complete no-edit boundary and before/after workspace snapshot constrain and detect writes, but do not claim OS-level read-only isolation.

```text
/review
```

Every new round uses one three-digit number:

```text
review-brief-001.md
codex-review-001.jsonl
codex-review-001.md
review-fix-summary-001.md
rereview-brief-002.md
codex-review-002.jsonl
codex-review-002.md
```

The `.jsonl` file is the raw Channel audit stream. Raw events use `by` for the author; `--from` is only the CLI filter, and there is no `event.from`. The `.md` file is exactly one provenance line, one LF, and the last non-empty worker `message.text` before the first send-after `done`, with no trimming, reformatting, or appended newline. Raw JSONL is never stored under a Markdown extension, and formal results are not truncated with `--last 100`.

Main flow:

1. Read the active task, relevant task/spec context, and Git diff scope; allocate the next unused `NNN` in `001`–`999`. Stop on exhaustion, a concurrent path collision, or any occupied target; never overwrite.
2. Write `review-brief-NNN.md`, then capture the full before snapshot: `git status --short --untracked-files=all`, `git diff --binary`, `git diff --cached --binary`, and `git ls-files --others --exclude-standard -z`. Consume NUL output with binary-safe Node `execFile`, never a shell variable. Use SHA-256 for Git-visible untracked files, the current brief, selected review/fix inputs, and direct/manifest-injected task/spec context; hash a symlink's link target without following it outside the workspace. Diff stats are reporting aids, not content-stability evidence.
3. Create an ephemeral task Channel:

   ```bash
   trellis channel create <channel-name> --ephemeral --task <task-path> --by review
   ```

4. Name no Trellis agent and explicitly start a Codex-backed `check-codex` worker. The current numbered brief is mandatory system context; pass other context only when it exists:

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

5. Send the same brief explicitly to start the turn and require exit code 0. Parse the complete stdout exactly once with `JSON.parse`; require `event.kind === "message"`, `event.by === "review"`, `event.to === "check-codex"`, and a positive integer `event.seq` as `SEND_SEQ`. Never infer the sequence with regex, visual slicing, or guessing:

   ```bash
   trellis channel send <channel-name> --as review --to check-codex --text-file <review-brief-path>
   ```

6. Query historical `done` after `SEND_SEQ`; only when absent use `wait` as a low-latency path; query history again after wait exits 0 or 124:

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ" --kind done
   trellis channel wait <channel-name> --as review --from check-codex --kind done --timeout 30m
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ" --kind done
   ```

   Because `wait` starts at the current log end, completion requires a historical event with `event.kind === "done"`, `event.by === "check-codex"`, and `event.seq > SEND_SEQ`. Only history exit 0 with empty stdout means “no done”; a non-zero exit or malformed JSON is a command failure. Wait exit 124 plus historical done is complete. Done without a final message means a completed turn with an incomplete pair, not a timeout; no historical done after a successful query is a true timeout.

7. After worker completion and before writing any post-worker artifact, capture the same full Git/untracked/context snapshot. Any command/hash failure or content difference fails review: report the difference without attributing concurrent work to the reviewer, do not reset/checkout/stash/revert, and do not create Markdown.
8. Save the full post-send stream, requiring messages exit 0 and preserving stdout byte-for-byte:

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ"
   ```

   Capture a binary-safe Buffer through an agent tool API or Node `child_process.execFile`, then create JSONL with exclusive `wx` semantics. Do not use potentially transcoding PowerShell text redirection or normalize line endings for the formal artifact.
9. Parse JSONL line by line with `JSON.parse`; require event objects with integer `seq`, string `ts`/`kind`, non-empty `by`, and strictly increasing post-send sequence values. Find done and final message using `event.by === "check-codex"`. Only after sibling, provenance, title, and stable-workspace validation, write `codex-review-NNN.md` as one provenance line, one LF, and the exact untrimmed message.

A **complete pair** has same-number `.jsonl`/`.md` siblings, valid ordered raw event objects and provenance, a post-send worker done, the exact final message before it, and `workspaceStable: true`. Orphans, damaged JSONL, missing done/final message, altered Markdown bodies, or unstable workspace snapshots produce incomplete pairs that `/review-fix` and rereview never auto-consume.

Use supported 0.6.6 diagnostics:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
```

Channels are ephemeral but retained after success/failure. Cleanup previews by default and deletes only with an explicit `--yes` decision:

```bash
trellis channel prune --scope project --ephemeral
trellis channel prune --scope project --ephemeral --yes
```

The flow does not use success-deleting `trellis channel run` and does not read `events.jsonl` directly.

### `/review-fix` — Review Finding Fixes

`/review-fix` validates candidates and selects the numerically largest complete pair, not mtime or a bare `codex-review*.md` glob. An explicit new-format Markdown still requires its JSONL sibling. Only when no new complete pair exists may `codex-review.md` or `codex-review-<digits>.md` without provenance and without a same-stem JSONL sibling be legacy. An explicit path may select one valid candidate; automatic fallback requires exactly one. Briefs, summaries, unrelated Markdown, and Markdown beside malformed/orphan JSONL are not legacy results.

It fixes Blocking/Should Fix by default and writes a non-overwriting same-number summary:

```text
review-fix-summary-NNN.md
```

It does not call reviewers, spawn, wait, rereview automatically, or commit. Nice to Have is deferred by default, False Positive records evidence, and Needs Human Decision is not guessed.

### `/review --rereview` — Trellis Channel Rereview

```text
/review --rereview
```

Rereview requires the latest complete `codex-review-NNN.md` + `codex-review-NNN.jsonl` and same-number `review-fix-summary-NNN.md`. It begins allocation at `NNN+1`, chooses the next unused number no higher than `999`, and follows the same read-only, ephemeral, send-sequence, history-done, paired-artifact, and full workspace-snapshot flow.

It checks only whether findings were fixed, regressions were introduced, or Blocking remains. It emits `# Rereview Result` with Blocking, Should Fix, Nice to Have, Verified Fixed, False Positive / Not Applicable, New Risks Introduced, and Final Recommendation. Rereview remains a `/review` mode; no standalone `/rereview` command is restored.

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

A Review Brief is structured input sent by `/review` to an agentless Codex review worker; it does not replace native Trellis check. It freezes task context, Git diff scope, checks, risk, and the no-edit boundary.

Recommended loop:

```text
implementation + local checks
  -> /review
  -> review-brief-NNN.md
  -> codex-review-NNN.jsonl + codex-review-NNN.md (complete pair)
  -> /review-fix
  -> review-fix-summary-NNN.md
  -> /review --rereview
  -> next numbered complete pair
```

Boundaries:

- `/review` and rereview prepare briefs, call Channel CLI, parse CLI JSON, validate complete pairs, and report; they do not modify implementation.
- `/review-fix` is the only review-finding modification stage and does not call a reviewer.
- Default `/review` starts one `check-codex`; parallel review is explicit advanced usage.
- `/handoff`, standalone `/rereview`, `/task` aliases, and legacy review scripts stay removed.

## Trellis Channel Review

### Event Model

```text
create/spawned
  -> send message (records SEND_SEQ)
  -> awake / progress / worker message
  -> done / error / killed
```

Mutation stdout such as `send` is a JSON event; `messages --raw` is JSON-per-line. The raw schema uses `seq`, `ts`, `kind`, and `by`; `--from check-codex` filters for `event.by === "check-codex"`. Since `wait` observes only events after it starts, `/review` treats a successful, structurally parsed `messages --since SEND_SEQ --kind done` query as completion truth. Worker inbox defaults to `explicitOnly`, so the brief must use `send --to check-codex`.

Review Channels are ephemeral: hidden from default `channel list`, visible with `channel list --all`, and eligible for project-scoped `prune --ephemeral` preview or explicit deletion. They are not one-shot `channel run` Channels.

### Key Command Semantics

| Command | Responsibility in this flow |
| --- | --- |
| `channel create --ephemeral --task` | Create a task-linked event log that is hidden by the default list but retained for diagnostics. |
| `channel spawn --provider <provider> --as <handle> --file <brief>` | Load no agent card; explicitly select the provider and stable handle, inject the current no-edit brief into the system prompt, and add other `--file` / `--jsonl` context only when it exists. |
| `channel send --to <handle> --text-file <brief>` | Target and wake the default `explicitOnly` worker; stdout is a message event authored by the dispatcher. |
| `channel wait --from <handle> --kind done` | Provide only a from-now low-latency wait; it cannot replace post-send historical completion. |
| `channel messages --raw --since <seq>` | Emit the JSONL audit through the CLI; formal output has no `--last` and never reads the event store directly. |
| `channel list --all` | Show ephemeral review Channels hidden by the default list. |
| `channel prune --scope project --ephemeral [--yes]` | Preview without `--yes`; clean only after an explicit project-scoped decision. |

For routing, `spawn --as` defines the worker handle, `send` / `wait --as` defines the current dispatcher identity, `--to` targets delivery, and `--from` filters the raw `by` author. Use `--all` only when waiting for multiple named handles.

### Parallel Reviewers

For explicit cross-review, spawn distinct handles in one Channel and target each brief separately:

```bash
trellis channel create cr-feature --ephemeral --task "$TASK" --by main
trellis channel spawn cr-feature --provider codex --as review-codex --file "$BRIEF" --timeout 30m
trellis channel spawn cr-feature --provider claude --as review-claude --file "$BRIEF" --timeout 30m
trellis channel send cr-feature --as main --to review-codex --text-file "$BRIEF"
trellis channel send cr-feature --as main --to review-claude --text-file "$BRIEF"
trellis channel wait cr-feature --as main --from review-codex,review-claude --all --kind done --timeout 30m
```

In practice:

- Name no agent card for either worker, explicitly select each provider, and inject the same no-edit brief into each system prompt with `--file`.
- Give workers distinct stable handles, pass only existing additional `--file` / `--jsonl` inputs, and send the same brief separately to each worker; do not rely on broadcast to wake `explicitOnly` inboxes.
- Multi-worker waiting may use `--from a,b --all --kind done`, but each worker still needs independent send-sequence history confirmation and JSONL/Markdown validation.
- Each worker's events/artifacts need independent filtering, validation, and human synthesis. Channel routes and audits; it does not deduplicate severity or adjudicate False Positives.

Default `/review` does not run this parallel mode.

### Channel Troubleshooting

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
trellis channel prune --scope project --ephemeral
trellis channel prune --scope project --ephemeral --yes
```

No `spawned` means inspect the explicit provider, handle, and injected brief/context; no `awake` means inspect targeted `send --to`; progress without done means inspect worker errors/timeouts; wait timeout requires a post-send historical done check. A non-zero `messages` exit or malformed raw JSON is a query failure, not “no events”; inspect the `by` field for authorship. Formal output does not use `--last 100`, pretty output, or raw JSONL as Markdown.

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
- `/review` and `/review --rereview` invoke Codex review-only workers through `trellis channel`.
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
