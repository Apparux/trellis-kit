# Review Workflow

## Purpose

This guide defines the Trellis 0.6.6 Channel workflow for:

```text
implementation -> /review -> /review-fix -> /review --rereview
```

`/review` owns read-only review dispatch and artifact normalization. `/review-fix` is the only stage that applies review-driven code changes.

## Ownership Boundaries

- `/review` does not name a Trellis agent and Trellis Kit does not install an additional agent type.
- `.trellis/agents/check.md` remains upstream-owned and is not used by `/review` because it may self-fix mechanical findings.
- The current numbered review/rereview brief is injected with `spawn --file` as system-prompt context, then sent through the worker inbox to start the turn and record `SEND_SEQ`.
- Worker lifecycle and event reads stay in `trellis channel`; do not add a scheduler, poller, direct event-store reader, or `channel run` wrapper.
- Codex may have a workspace-write sandbox, so the no-edit brief is reinforced by before/after Git state detection. This is detection, not OS-level read-only isolation.

## Numbered Artifacts

Every new round uses one unused three-digit number:

```text
review-brief-001.md
codex-review-001.jsonl
codex-review-001.md
review-fix-summary-001.md
rereview-brief-002.md
codex-review-002.jsonl
codex-review-002.md
```

The JSONL/Markdown siblings share one `codex-review-NNN` stem. New unnumbered results are forbidden. Allocation uses `001` through `999`, creates paths only while absent, and stops on exhaustion or a concurrent collision. A rereview starts from `NNN+1` and advances only to an unused number.

The Markdown starts with structured provenance:

```text
<!-- trellis-review: {"pair":"001","channel":"review-example","sendSeq":10,"jsonl":"codex-review-001.jsonl","workspaceStable":true} -->
```

## Complete Pair

A numbered pair is complete only when:

- both same-stem siblings exist
- every non-empty JSONL line parses to a Channel event object with integer `seq`, string `ts`/`kind`, and non-empty string `by`; post-send sequences are strictly increasing
- provenance parses and matches the pair, non-empty Channel, positive integer send sequence, and sibling
- the first qualifying event satisfies `event.kind === "done"`, `event.by === "check-codex"`, and `event.seq > SEND_SEQ`
- the last earlier non-empty message satisfies `event.kind === "message"` and `event.by === "check-codex"`
- after one provenance line and one LF, the Markdown body exactly matches that message without trimming or an appended newline and has the expected title
- before/after Git-visible snapshots match and provenance records `workspaceStable: true`

The CLI option is named `--from`, but Trellis 0.6.6 raw JSON stores the author in `event.by`; there is no `event.from` field.

Invalid JSONL, no send-after `done`, no final message, changed workspace, malformed provenance, and orphan files are incomplete. Keep raw JSONL and the ephemeral Channel for diagnosis, but do not create or consume normalized Markdown.

When no complete numbered pair exists, `/review-fix` or rereview may use a legacy `codex-review.md` / `codex-review-<digits>.md` only when it has no Trellis provenance and no same-stem JSONL sibling. Automatic fallback requires exactly one candidate; an explicit path may select one valid candidate. A provenance-bearing orphan or Markdown beside malformed/orphan JSONL is incomplete, not legacy. Briefs, summaries, and unrelated Markdown are never review fallbacks.

## `/review` Data Flow

1. Resolve the active task, inspect task artifacts and Git scope, then allocate `NNN`.
2. Write `review-brief-NNN.md` or `rereview-brief-NNN.md`.
3. Create an ephemeral Channel:

   ```bash
   trellis channel create <channel-name> --ephemeral --task <task-path> --by review
   ```

4. Capture exact `git status --short --untracked-files=all`, `git diff --binary`, `git diff --cached --binary`, and NUL-delimited `git ls-files --others --exclude-standard -z` output. Consume NUL output with binary-safe Node `execFile`, never a shell variable. Hash each Git-visible untracked file, numbered brief, selected review/fix input, and direct/manifest-supplied task/spec context with Node.js SHA-256; hash symlink targets without following them outside the workspace. Diff stats may be reported but are not sufficient for stability.
5. Spawn without a Trellis agent card, explicitly select the provider/handle, and inject the current numbered brief as mandatory system-prompt context:

   ```bash
   trellis channel spawn <channel-name> \
     --provider codex \
     --as check-codex \
     --file "$NUMBERED_BRIEF" \
     --cwd "$PWD" \
     --timeout 30m
   ```

   Add only existing task `--file` and `--jsonl` inputs after the mandatory brief. Do not pass any `--agent` option or install another agent type.
6. Send the same numbered brief with targeted `--text-file` to start the turn. Require exit 0 and parse the entire stdout once with `JSON.parse`; require `event.kind === "message"`, `event.by === "review"`, `event.to === "check-codex"`, and a positive integer `event.seq` as `SEND_SEQ`. Never infer it with regex.
7. Query historical completion first:

   ```bash
   trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ" --kind done
   ```

   Exit 0 plus empty stdout means no completion; a non-zero query is a failure. Parse each line and use raw `event.by === "check-codex"`, not `event.from`.
8. If history has no qualifying `done`, call `wait --kind done --timeout 30m` as a low-latency fast path and capture exit 124 without aborting the flow.
9. After wait exits 0 or 124, query history again. A historical `done` after `SEND_SEQ` is authoritative. Exit 124 plus history `done` is complete; no historical `done` is a true timeout. Done without a final message is completed but produces an incomplete pair.
10. Before writing post-worker artifacts, capture and compare the same full Git/untracked/context snapshot. Any command/hash failure or difference fails review; report it without attributing concurrent work and never auto-revert.
11. Save all post-send worker events without `--last` truncation, requiring exit 0. Capture stdout as a binary-safe Buffer through an agent tool API or Node `child_process.execFile`, then create the JSONL with exclusive `wx` semantics. Do not use PowerShell text redirection, which can transcode the formal artifact:

    ```bash
    trellis channel messages <channel-name> --raw --from check-codex --since "$SEND_SEQ"
    ```

12. Parse JSONL with a JSON parser, validate the event schema/order/author, select the final message before the first qualifying `done`, validate its title, then write one provenance line, one LF, and the exact untrimmed body to `codex-review-NNN.md`.

`wait` is never the final truth because it listens from its own start position. Historical `messages --since` closes a fast-worker race without adding polling.

## `/review-fix` Policy

`/review-fix` selects the numerically largest complete pair, not the newest mtime or a bare glob. An explicit new-format path still requires its sibling and full validation.

Default finding policy:

- fix Blocking
- fix Should Fix
- defer Nice to Have unless clearly low-risk and design-aligned
- document False Positive without changing code
- defer Needs Human Decision rather than broadening scope

For source `codex-review-NNN.*`, write `review-fix-summary-NNN.md`. Never overwrite an existing summary. `/review-fix` must not spawn, wait, call a reviewer, or run rereview automatically.

## Rereview Policy

Rereview is `/review --rereview`, not a standalone command. It requires the latest complete pair plus same-number `review-fix-summary-NNN.md`, then allocates the next unused number.

It asks only whether findings were fixed, fixes introduced regressions, Blocking remains, or previously deferred/false-positive items should remain closed. The output title is `# Rereview Result` with Blocking, Should Fix, Nice to Have, Verified Fixed, False Positive / Not Applicable, New Risks Introduced, and Final Recommendation sections.

## Failure And Retention

| Failure | Required behavior |
| --- | --- |
| create/spawn/send fails | Stop, retain any Channel, show supported diagnostics, create no Markdown |
| send stdout invalid or lacks the expected event/target/integer seq | Stop; never guess `SEND_SEQ` |
| history/messages command fails or emits malformed JSON | Channel failure; never treat it as empty history |
| wait 124, history has done | Complete, but report the fast-path timeout |
| wait 124, history lacks done | True timeout; retain JSONL/Channel, no Markdown |
| history has done but JSONL/final message is invalid or absent | Completed turn with incomplete pair; no Markdown, not a timeout |
| Git snapshot changed | Review failure; report differences, do not auto-revert |
| sibling/provenance mismatch | Ignore as incomplete |
| numbered summary already exists | Stop instead of overwriting |

Diagnose with:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
```

Review Channels remain ephemeral and retained after success/failure. Preview cleanup with:

```bash
trellis channel prune --scope project --ephemeral
```

Delete only after an explicit decision:

```bash
trellis channel prune --scope project --ephemeral --yes
```

Do not use direct `events.jsonl` reads, automatic `rm`, or `channel run`.
