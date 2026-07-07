# /review

## Purpose

Use `/review` as the Trellis review entrypoint for normal review and rereview mode.

`/review` prepares review brief files, delegates Codex worker orchestration to `trellis channel`, waits for completion through channel events, and saves the review output.

`/review` is not an agent runtime. Do not implement custom worker spawning, polling, message parsing, cleanup, or event-log reading outside the `trellis channel` CLI.

## When to Use

Use `/review` after Claude Code or Trellis has finished implementation and local checks for the active Trellis task.

Use `/review --rereview` after `/review-fix` has applied review fixes and you want Codex to verify the fixes.

If the command system does not pass arguments, use `/review` and clearly state `rereview mode` in the prompt.

## Inputs

Normal review reads:

- Active Trellis task from `python3 ./.trellis/scripts/task.py current --source`.
- Current task files such as `prd.md`, `design.md`, `implement.md`, `check.jsonl`, and other task-local documents that exist.
- Current git state from `git status --short`, `git diff`, and `git diff --cached`.
- `.trellis/spec/templates/review-brief-template.md`.

Rereview mode additionally reads:

- Latest saved Codex review result under `.trellis/tasks/<task>/review/`.
- Latest `review-fix-summary*.md` under `.trellis/tasks/<task>/review/`, when present.
- Current fix diff and any task-related untracked files.
- `.trellis/spec/templates/rereview-brief-template.md`.

## Minimal Implementation Context

If `.trellis/spec/guides/minimal-implementation.md` exists, include it in review context when over-engineering, cleanup, deprecated compatibility, broad refactor risk, or unnecessary abstraction risk is relevant:

- Add it to `check.jsonl` when curating check/review context.
- Mention over-engineering as one review dimension only; correctness, security, regression risk, requirement coverage, data integrity, permissions, and tests have higher priority.
- Do not rely on `.trellis/spec/**/index.md` to discover this guide.
- Do not modify any `index.md` file for this purpose.

## Outputs

Normal review writes:

- Brief: `.trellis/tasks/<task>/review/review-brief.md`
- Review result: `.trellis/tasks/<task>/review/codex-review.md`

Rereview mode writes:

- Brief: `.trellis/tasks/<task>/review/rereview-brief.md`
- Review result: `.trellis/tasks/<task>/review/codex-review-<n>.md`

If a file already exists, use a numbered filename such as:

```text
review-brief-001.md
rereview-brief-001.md
codex-review-001.md
codex-review-002.md
```

Final response must include:

- brief file path
- review result file path
- channel name
- failure diagnostics when relevant

## Steps

### Normal Review

1. Confirm the active Trellis task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

   Stop if there is no active task.

2. Read task context in this order when present:

   ```text
   <task-path>/prd.md
   <task-path>/design.md
   <task-path>/implement.md
   <task-path>/check.jsonl
   other task-local docs relevant to the implementation
   ```

3. Inspect git scope:

   ```bash
   git status --short
   git diff
   git diff --cached
   ```

   Include staged changes, unstaged changes, and task-related untracked files.

4. Create `.trellis/tasks/<task>/review/` if needed.

5. Generate `review-brief.md` from `.trellis/spec/templates/review-brief-template.md`.

   The brief must include at least:

   - `# Review Brief`
   - `## Task`
   - `## Task Path`
   - `## Implementation Summary`
   - `## Changed Files`
   - `## API Changes`
   - `## DB Changes`
   - `## Permission / Auth Changes`
   - `## Config Changes`
   - `## Checks Performed`
   - `## Review Focus`
   - `## Git Diff Scope`
   - `## Known Risks`
   - `## Review Prompt`

6. Create a traceable channel name:

   ```text
   review-<task-slug>-<timestamp>
   ```

7. Create the review channel:

   ```bash
   trellis channel create <channel-name> --task <task-path> --by review
   ```

8. Spawn the Codex check worker through trellis channel:

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

   Skip `--file` or `--jsonl` entries whose files do not exist.

9. Send the brief with `--text-file`:

   ```bash
   trellis channel send <channel-name> \
     --as review \
     --to check-codex \
     --text-file <review-brief-path>
   ```

10. Wait for worker completion with `--kind done`:

    ```bash
    trellis channel wait <channel-name> \
      --as review \
      --from check-codex \
      --kind done \
      --timeout 30m
    ```

11. Save the review output:

    ```bash
    trellis channel messages <channel-name> \
      --raw \
      --from check-codex \
      --last 100 > <review-result-path>
    ```

12. Return the brief path, review result path, channel name, and diagnostic commands.

### Rereview Mode

1. Follow the normal review setup steps for active task and git state.
2. Locate the latest prior `codex-review*.md` in `.trellis/tasks/<task>/review/`.
3. Locate the latest `review-fix-summary*.md` in `.trellis/tasks/<task>/review/`, when present.
4. Generate `rereview-brief.md` from `.trellis/spec/templates/rereview-brief-template.md`.
5. Use channel name:

   ```text
   rereview-<task-slug>-<timestamp>
   ```

6. Run the same `trellis channel create`, `spawn`, `send --text-file`, `wait --kind done`, and `messages --raw` flow.
7. Save the new Codex output as the next available `codex-review*.md` file.

The rereview prompt must ask Codex to focus only on:

- whether previous review findings were fixed
- whether fixes introduced new issues
- whether Blocking issues remain
- avoiding repeated Nice to Have findings already confirmed as not being handled
- avoiding repeated issues already marked False Positive

The rereview output request must be grouped as:

- Blocking
- Should Fix
- Nice to Have
- Verified Fixed
- False Positive / Not Applicable
- New Risks Introduced
- Final Recommendation

## Failure Handling

If active task detection fails, stop and ask the user to activate a Trellis task.

If brief generation lacks evidence for a section, write `Unknown` or `None` explicitly instead of guessing.

If `trellis channel spawn`, `send`, or `wait` fails, do not read `events.jsonl` directly as the primary path. Show these diagnostics:

```bash
trellis channel messages <channel-name> --raw --last 100
trellis channel messages <channel-name> --raw --kind progress --last 100
trellis channel ls
```

If `wait` times out, report the timeout and the channel name so the user can inspect or resume.

## Examples

Normal review:

```text
/review
```

Rereview:

```text
/review --rereview
```

Argument-free rereview fallback:

```text
/review rereview mode
```
