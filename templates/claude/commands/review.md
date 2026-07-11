# /review

## Purpose

Use `/review` as the Trellis review entrypoint for normal review and rereview mode.

`/review` prepares a numbered review brief, delegates the worker lifecycle to Trellis 0.6.6 Channel CLI, and saves a complete pair of raw JSONL plus normalized Markdown. `/review` does not implement a worker runtime, poll the event store, or read `events.jsonl` directly. Structured `JSON.parse` handling of Channel CLI output is required.

The reviewer is read-only. Code changes belong only to an explicit later `/review-fix` stage.

## When to Use

- Use `/review` after implementation and local checks for the active Trellis task.
- Use `/review --rereview` after `/review-fix` has written the matching numbered fix summary.
- If arguments are unavailable, use `/review` and state `rereview mode` in the prompt.

## Inputs

Normal review reads:

- Active task from `python3 ./.trellis/scripts/task.py current --source`.
- Existing `prd.md`, `design.md`, `implement.md`, `check.jsonl`, and relevant task-local documents.
- Current `git status --short`, `git diff`, and `git diff --cached` scope.
- `.trellis/spec/templates/review-brief-template.md`.

Rereview additionally reads:

- The latest complete pair under `<task-path>/review/`.
- Its same-number `review-fix-summary-NNN.md`.
- Current fix diff and task-related untracked files.
- `.trellis/spec/templates/rereview-brief-template.md`.

If `.trellis/spec/guides/minimal-implementation.md` exists and simplification risk is relevant, include it through `check.jsonl`. It is one review dimension only and never overrides correctness, security, data integrity, permissions, regression coverage, or tests. Do not modify a spec index to load it.

## Artifact Contract

Every new round uses one unused three-digit pair number `NNN` in `001` through `999`. Scan every numbered brief, result, and summary artifact, choose one greater than the highest occupied number (or `001` when none exist), and create the brief only if its path is still absent. Stop on a concurrent collision or when `999` is exhausted; never overwrite or silently reuse an artifact.

Normal review creates:

```text
review-brief-NNN.md
codex-review-NNN.jsonl
codex-review-NNN.md
```

Rereview creates:

```text
rereview-brief-NNN.md
codex-review-NNN.jsonl
codex-review-NNN.md
```

`codex-review-NNN.jsonl` is the unmodified `messages --raw` audit stream after the send sequence. `codex-review-NNN.md` contains an exact final worker message prefixed by one structured provenance comment:

```text
<!-- trellis-review: {"pair":"NNN","channel":"<channel-name>","sendSeq":123,"jsonl":"codex-review-NNN.jsonl","workspaceStable":true} -->
```

A numbered result is a complete pair only when all of these are true:

1. Both sibling files exist with the same `codex-review-NNN` stem.
2. Every non-empty JSONL line parses with `JSON.parse` to a non-array event object containing integer `seq`, string `ts`, string `kind`, and non-empty string `by`; sequence values are strictly increasing and greater than `SEND_SEQ`.
3. The provenance JSON parses and identifies the same pair, non-empty Channel, positive integer send sequence, and JSONL sibling.
4. The first qualifying completion is an event with `event.kind === "done"`, `event.by === "check-codex"`, and `event.seq > SEND_SEQ`. Raw events use `by` for the author; `--from` is only the CLI filter name and there is no `event.from` field.
5. Before that first qualifying `done`, at least one event with `event.kind === "message"`, `event.by === "check-codex"`, and non-empty string `event.text` exists.
6. The Markdown consists of exactly one provenance line, one `\n` separator, and the exact bytes of the last such message without trimming, reformatting, or adding a trailing newline. The message starts with the expected review title.
7. `workspaceStable` is true because the before/after Git-visible snapshots matched.

If JSONL is invalid, `done` is absent, the final message is absent, the title is invalid, or the workspace changed, keep the raw JSONL and ephemeral Channel for diagnosis but do not create Markdown. An incomplete pair must never be selected automatically by `/review-fix` or rereview.

## Complete-Pair Selection

For rereview:

1. If the user supplied a review path, prefer it. A provenance-bearing numbered Markdown requires its same-number JSONL sibling and complete-pair validation.
2. Otherwise validate numbered candidates and choose the numerically largest complete pair, never by mtime or a bare glob.
3. Require `review-fix-summary-NNN.md` for that numbered source pair. Stop rather than overwrite or guess when it is absent.
4. Allocate the rereview output from `NNN+1`, advancing to the next unused number through `999`; stop on exhaustion or a concurrent path collision.
5. If no complete numbered pair exists, a legacy result candidate must be named `codex-review.md` or `codex-review-<digits>.md`, contain no Trellis provenance, and have no same-stem JSONL sibling. A user-supplied explicit legacy path may select one candidate; automatic fallback requires exactly one candidate.
6. Legacy rereview also requires one explicit or uniquely matched `review-fix-summary.md` / `review-fix-summary-<digits>.md`. Otherwise list candidates and ask the user to choose.
7. A provenance-bearing orphan `.md`, any `.md` with a same-stem malformed/orphan JSONL, an orphan `.jsonl`, malformed JSONL, or mismatched pair is incomplete, not a legacy fallback. Briefs, summaries, and unrelated Markdown are never legacy review candidates.

Do not rename or migrate legacy files, and do not restore a standalone `/rereview` command.

## Steps

### 1. Prepare The Round

1. Resolve the active task and stop if none is active.
2. Read only the task/spec context needed for the review.
3. Inspect staged, unstaged, and task-related untracked changes.
4. Create `<task-path>/review/` if needed.
5. Select the next unused `NNN` and write `review-brief-NNN.md` or `rereview-brief-NNN.md` from its template.
6. Use a traceable Channel name:

   ```text
   review-<task-slug>-<timestamp>
   rereview-<task-slug>-<timestamp>
   ```

7. Immediately before spawning, capture a before snapshot in memory or outside the worktree. The stability comparison must include the exact outputs of:

   ```bash
   git status --short --untracked-files=all
   git diff --binary
   git diff --cached --binary
   git ls-files --others --exclude-standard -z
   ```

   Use binary-safe Node.js `child_process.execFile`/`crypto` handling to consume the NUL-delimited list and record SHA-256 for every listed untracked path, the current numbered brief, every selected review/fix input, and every directly or manifest-supplied task/spec context file, including ignored task artifacts. Never put NUL-delimited output in a shell variable; hash regular-file bytes and a symlink's link target without following it outside the workspace. Do not use only `git diff --stat`: equal line counts can hide content changes. Record `git diff --stat` and `git diff --cached --stat` separately only when useful for the human report. Do not write the snapshot into the project.

### 2. Create And Spawn

Create an ephemeral Channel that remains available after success:

```bash
trellis channel create <channel-name> \
  --ephemeral \
  --task <task-path> \
  --by review
```

Spawn without a Trellis agent card. Explicitly select Codex and inject the current numbered brief first so its complete review-only/no-edit contract is part of the worker system prompt:

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

The numbered brief is mandatory at spawn. Pass the other `--file` and `--jsonl` inputs only when they exist. Do not pass any `--agent` option, add a project agent type, or modify `.trellis/agents/check.md`. The worker sandbox may still permit writes; the full before/after workspace snapshot is the enforcement backstop, not OS-level read-only isolation.

### 3. Send And Record The Sequence

Send the brief through the explicit worker inbox, require exit code 0, and capture stdout as one JSON event. The POSIX assignment below is illustrative; on PowerShell or when using an agent tool API, capture stdout natively rather than copying shell-specific assignment syntax.

```bash
SEND_JSON="$(trellis channel send "$CHANNEL" \
  --as review \
  --to check-codex \
  --text-file "$NUMBERED_BRIEF")"
```

Parse the complete stdout once with `JSON.parse`; do not use regex, line slicing, or model-only visual extraction. Require one non-array object satisfying `event.kind === "message"`, `event.by === "review"`, `event.to === "check-codex"`, and a positive integer `event.seq`; then store that value as `SEND_SEQ`. Stop if the command failed, stdout has extra non-whitespace content, or any field is invalid. Do not guess a sequence.

### 4. Determine Completion

First query history after the send sequence:

```bash
trellis channel messages "$CHANNEL" \
  --raw \
  --from check-codex \
  --since "$SEND_SEQ" \
  --kind done
```

Treat exit code 0 with empty stdout as “no historical done.” Any non-zero history-query exit is a CLI failure, not an empty result. Parse every non-empty stdout line with `JSON.parse` and accept completion only for an event with `event.kind === "done"`, `event.by === "check-codex"`, and integer `event.seq > SEND_SEQ`. The CLI flag is named `--from`, but the raw JSON author field is `by`.

If no qualifying historical `done` exists, use `wait` only as a low-latency fast path:

```bash
trellis channel wait "$CHANNEL" \
  --as review \
  --from check-codex \
  --kind done \
  --timeout 30m
```

Capture the wait exit code explicitly so code 124 does not abort the surrounding shell/tool sequence. After `wait` exits with either 0 or 124, run and structurally parse the same history query again:

- History has a qualifying `done`: the worker turn completed, even if `wait` returned 124; report that the fast path timed out. A `done` without a final message is completed-but-incomplete output, not a timeout.
- History has no qualifying `done`: this is a real timeout; retain diagnostics and do not create Markdown.
- The history query fails, JSON is malformed, or `wait` exits with another code: report a Channel failure and do not create Markdown.

This history check closes the send-to-wait race without polling, a custom scheduler, or direct event-store access.

### 5. Save Raw JSONL And Normalize Markdown

After a qualifying historical `done` and before writing any post-worker result artifact, capture the after snapshot with the same full status, binary diffs, untracked list/content hashes, and supplied-context hashes. Compare exact bytes/digests with the before snapshot. This ordering keeps the dispatcher's own JSONL write out of the comparison. A snapshot command/hash failure or any difference makes the review unstable: report the before/after difference without attributing concurrent work, do not automatically revert/reset/checkout/stash/delete anything, and do not create Markdown.

Whether stable or not, obtain the complete worker history after the send sequence without `--last` truncation when send succeeded:

```bash
trellis channel messages "$CHANNEL" \
  --raw \
  --from check-codex \
  --since "$SEND_SEQ"
```

Require the messages command to exit 0. Capture stdout with a binary-safe agent tool API or Node.js `child_process.execFile` Buffer and create the unused `codex-review-NNN.jsonl` with exclusive-write semantics (for example, Node `fs.writeFile` with `flag: "wx"`). Do not use PowerShell text redirection for the formal artifact because it may transcode output; the POSIX examples are not a substitute for exact-byte capture on another shell. Do not overwrite, pretty-print, reorder, trim, normalize line endings, or synthesize events. If retrieval fails, report it and retain any partial output only as a clearly named diagnostic, not as a complete-pair JSONL, and do not create Markdown.

Only when the workspace snapshot is stable, parse every non-empty JSONL line with `JSON.parse` and validate the complete event-object/sequence/`by` contract above. Find the first qualifying `done`, then select the last non-empty `event.text` from an earlier `event.kind === "message"` and `event.by === "check-codex"`. Require `# Review Result` for normal review or `# Rereview Result` for rereview. Create `codex-review-NNN.md` exclusively as the provenance line, one LF, and the exact final message string; do not trim or append a newline. Create it only after every complete-pair condition passes.

### 6. Report

Return:

- numbered brief path
- raw JSONL path
- normalized Markdown path, or why it was intentionally not created
- Channel name
- `SEND_SEQ`
- whether `wait` timed out but history proved completion
- workspace stability result
- diagnostics and remaining risks

Do not automatically run `/review-fix`, remove the Channel, commit, push, merge, rebase, or finish-work.

## Failure Diagnostics And Retention

Check every create/spawn/send/history/messages/Git command exit status. Never treat a non-zero command as an empty successful result, and never continue with guessed Channel state or sequence data. Use only supported 0.6.6 diagnostics:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
```

Review Channels are ephemeral but retained after success or failure. Do not use `trellis channel run` and do not automatically call `rm`.

Preview project-scoped ephemeral cleanup:

```bash
trellis channel prune --scope project --ephemeral
```

Delete only after an explicit cleanup decision:

```bash
trellis channel prune --scope project --ephemeral --yes
```

## Rereview Output

Rereview asks only whether previous findings were fixed, whether fixes introduced issues, whether Blocking issues remain, and whether previously deferred Nice to Have or False Positive findings should stay closed. Require these groups:

```text
# Rereview Result
## Blocking
## Should Fix
## Nice to Have
## Verified Fixed
## False Positive / Not Applicable
## New Risks Introduced
## Final Recommendation
```
