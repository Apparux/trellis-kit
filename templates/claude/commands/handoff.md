# /handoff

Use `/handoff` to manually generate a Review Handoff Markdown file for the current Trellis task.

This command creates a portable handoff document. It does not run review, commit, push, merge, rebase, or finish-work.

## Required Reading

Before generating the handoff, read:

1. `.trellis/spec/guides/review-handoff-workflow.md`
2. `.trellis/spec/templates/review-handoff-template.md`

Do not load the entire `.trellis/spec/` directory by default.

## Process

For every `/handoff` request:

1. Confirm the active Trellis task:

   ```bash
   python3 ./.trellis/scripts/task.py current --source
   ```

2. Load current task context:

   ```bash
   python3 ./.trellis/scripts/get_context.py
   ```

3. Inspect the working tree and diff scope.
4. Collect the information required by the handoff template:
   - Task
   - Task path
   - Implementation summary
   - Changed files
   - API changes
   - Database changes
   - Permission/data-scope changes
   - Configuration changes
   - Checks performed
   - Known limitations and risks
   - Review focus
   - Git diff scope
   - Suggested review prompt
5. Ask the user for any missing summary, risk, or check information that cannot be inferred safely.
6. Write the Review Handoff Markdown file in the current task directory, using a clear filename such as `review-handoff.md` unless the task already has a more specific convention.
7. Return the generated file path.

## Constraints

Review Handoff generation is manual and user-controlled. Generating the file does not imply that review should run now.

Do not create or switch tasks. If there is no active task, explain that `/handoff` needs an active Trellis task and stop.

Do not generate a handoff from guessed implementation details. If changed files, checks, risks, or summary are unclear, ask the user or mark the section explicitly as unknown.

## Forbidden

Unless the user explicitly authorizes it in the current conversation, `/handoff` must not automatically:

- Run Codex Review
- Run Claude Review
- Run any external reviewer
- Run review scripts
- Fix review findings
- Re-review
- Commit
- Push
- Merge
- Rebase
- Run finish-work
