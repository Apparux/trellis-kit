# Review Loop Workflow

## Purpose

This guide preserves the stage boundary in the Channel-driven review loop:

```text
implementation -> /review -> /review-fix -> /review --rereview
```

Review stages inspect and report only. `/review-fix` is the explicit modification stage. Review workers are spawned without a Trellis agent card; the current numbered no-edit brief supplies system-prompt context and a self-fixing check role must never be substituted.

## Round Model

Each round has one three-digit identifier:

```text
review-brief-NNN.md or rereview-brief-NNN.md
codex-review-NNN.jsonl
codex-review-NNN.md
review-fix-summary-NNN.md
```

The JSONL file is the full post-send Channel audit. Trellis 0.6.6 raw events identify the author with `by`; `--from` is only the CLI filter and there is no raw `from` field. The Markdown file is one provenance line plus one LF plus the exact last non-empty worker message before the first send-after `done`; it is not trimmed, reformatted, or raw JSONL renamed to `.md`.

A new Markdown result is written only for a complete pair: valid ordered Channel event objects, matching structured provenance, a send-after event with `event.kind === "done"` and `event.by === "check-codex"`, an earlier final message by that worker, expected title, sibling match, and unchanged full Git-visible/untracked/context snapshot. Incomplete pairs and provenance-bearing orphans are ignored by automatic selection.

If no complete numbered pair exists, fallback is limited to `codex-review.md` / `codex-review-<digits>.md` with no provenance and no same-stem JSONL sibling. Automatic fallback requires one candidate; multiple files require explicit user choice. Legacy files are not renamed or migrated.

## Normal Review

1. Allocate the next unused `NNN` in `001` through `999` and create `review-brief-NNN.md` only while absent; stop on exhaustion or collision.
2. Capture full before-review status, unstaged/staged binary diffs, and NUL-delimited Git-visible untracked paths through binary-safe Node `execFile`, never a shell variable. Hash untracked files, the numbered brief, selected review/fix inputs, and direct/manifest-supplied task/spec context; hash symlink targets without following them outside the workspace. Diff stats alone are insufficient.
3. Create `trellis channel create ... --ephemeral --task ... --by review`.
4. Spawn without an agent card using explicit `--provider codex --as check-codex`, and pass the current numbered brief through `--file` as mandatory system-prompt context. Do not pass any `--agent` option or install another agent type.
5. Send the same numbered brief through targeted `--text-file` to start the turn. Require send exit 0 and parse its entire stdout with `JSON.parse`; validate `event.kind === "message"`, `event.by === "review"`, `event.to === "check-codex"`, and positive integer `event.seq` as `SEND_SEQ`.
6. Query `messages --raw --from check-codex --since SEND_SEQ --kind done`; non-zero exit is failure, while exit 0 plus empty output means no completion.
7. Only if history is not complete, call `wait --kind done`; after exit 0 or 124, query history again and parse raw `event.by === "check-codex"`.
8. Treat historical `done` with `seq > SEND_SEQ` as authoritative. A wait timeout without historical `done` remains a timeout; done without a final message is complete but cannot form a pair.
9. Before writing post-worker artifacts, compare the same full snapshot. If it changed or snapshotting failed, fail and report without automatic rollback.
10. Save exact complete post-send history as `codex-review-NNN.jsonl` without `--last`, requiring the messages command to succeed and using binary-safe stdout capture plus exclusive file creation; do not use PowerShell text redirection for the formal raw artifact.
11. Parse JSONL structurally and write one provenance line, one LF, and the exact untrimmed final message to `codex-review-NNN.md` only when all complete-pair checks pass.

The Channel remains ephemeral but retained for diagnosis. There is no automatic removal.

## Review Fix

`/review-fix` chooses the numerically largest complete pair after validating all candidates. An explicit numbered path still requires the matching JSONL sibling. It fixes Blocking and Should Fix by default and writes `review-fix-summary-NNN.md` with the same source number.

It must not overwrite an existing summary, spawn a worker, wait on Channel events, invoke an external reviewer, or launch rereview.

## Rereview

`/review --rereview` requires:

- latest complete `codex-review-NNN.md` + `codex-review-NNN.jsonl`
- same-number `review-fix-summary-NNN.md`
- current fix diff and task context

It starts allocation at `NNN+1`, chooses the next unused number through `999` without overwriting, writes `rereview-brief-NNN.md`, and follows the same ephemeral/read-only/send-seq/history/JSONL/Markdown flow.

Rereview output uses:

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

Do not restore a standalone `/rereview` command.

## Completion Truth

`wait` listens from the event position present when it starts. Therefore:

- history after `SEND_SEQ` is checked before wait
- wait is only a low-latency path
- history is checked again after wait exits 0 or 124
- a parsed historical event with `kind === "done"`, `by === "check-codex"`, and `seq > SEND_SEQ` is final truth
- done without a final message is completion with an incomplete artifact, not timeout
- exit-0 empty history means no done; query failure or malformed JSON is an error, not empty history
- no historical `done` after a successful query means true timeout

Do not add a poller, direct event-store reader, or custom runtime to change this behavior.

## Troubleshooting And Cleanup

Use supported diagnostics:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel list --all
```

Preview retained ephemeral cleanup:

```bash
trellis channel prune --scope project --ephemeral
```

Explicitly delete after approval:

```bash
trellis channel prune --scope project --ephemeral --yes
```

Never use `channel run` for this flow because successful runs remove their Channel. Never auto-revert a reviewer write; report the before/after difference so user or concurrent work is not destroyed.
