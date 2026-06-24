# Claude Code + Codex Local Review Workflow

## Role Definition

- Claude Code is the implementer and fixer.
- Codex is the local reviewer only.
- Codex must not modify business code, commit, push, merge, or rebase.
- Claude Code may fix issues after Codex Review, but fixes must stay inside the current Trellis task scope.

## Implementation Definition of Done

Implementation is not done until all of these are true:

1. The active Trellis task has PRD/design/implementation artifacts as required by the project workflow.
2. Claude Code has implemented the requested change.
3. Local validation requested by the task has been run where possible.
4. A Codex handoff has been created at `.trellis/tasks/<task>/reviews/codex-handoff.md`.
5. The implementation has been committed locally when the user requested an automatic local commit.
6. Codex Review has run through `.trellis/scripts/codex-review.sh`.
7. Claude Code has fixed P0/P1 issues by default.
8. Codex Re-Review has passed through `.trellis/scripts/codex-rereview.sh` when fixes were needed.

## Handoff Template Rule

Use `.trellis/spec/templates/codex-handoff-template.md` as the source template for Codex handoffs.

For each task, copy and fill it at:

```text
.trellis/tasks/<active-task>/reviews/codex-handoff.md
```

Rules:

- Preserve the template headings.
- Use `无` when a section has no content.
- Include the exact git diff range Codex should review.
- Include checks actually run; do not claim unrun checks passed.
- State special review focus areas such as permissions, security, migrations, concurrency, or compatibility.

## Git Commit Rule

When the user asks Claude Code to automatically commit after implementation:

- Commit only the implementation and directly related task artifacts.
- Do not push unless the user explicitly authorizes push.
- Do not merge unless the user explicitly authorizes merge.
- Do not rebase unless the user explicitly authorizes rebase.
- Do not auto-resolve merge conflicts.
- Keep the Codex handoff aligned with the committed diff.
- If unrelated dirty files exist, stop and ask before including them.

## Local Automated Codex Review Rule

After the implementation commit and handoff are ready, run:

```bash
.trellis/scripts/codex-review.sh .trellis/tasks/<active-task>
```

Expected output:

```text
.trellis/tasks/<active-task>/reviews/codex-review-1.md
```

The review script runs Codex CLI with `codex exec` in non-interactive mode. Codex must review only and must not modify code.

## Local Automated Codex Re-Review Rule

If Codex reports P0 or P1 issues:

1. Claude Code fixes only P0/P1 issues by default.
2. Claude Code writes fix notes to:

   ```text
   .trellis/tasks/<active-task>/reviews/claude-fix-notes.md
   ```

3. Run:

   ```bash
   .trellis/scripts/codex-rereview.sh .trellis/tasks/<active-task>
   ```

Expected output:

```text
.trellis/tasks/<active-task>/reviews/codex-review-2.md
```

## Worktree Rule

When working in a git worktree or task branch:

- Commit to the current worktree branch only.
- Run Codex Review before merging back to a target branch.
- Do not merge back automatically.
- Require explicit user authorization before merging, rebasing, or pushing.
- If the target branch is dirty or has conflicts, stop and report the situation.

## Codex Review Scope

Codex should review the implementation diff and the task context, not the entire unrelated repository history.

Default diff range:

```bash
git diff HEAD~1..HEAD
```

If the implementation spans more than one commit, Claude Code must put the correct diff range in the handoff before running review.

## Codex Review Rules

Codex must:

- Read the handoff.
- Read task PRD/design/implement artifacts when present.
- Read relevant `.trellis/spec/` rules.
- Review for correctness, regressions, missing validation, unsafe behavior, tests, and task acceptance criteria.
- Separate blocking issues from non-blocking suggestions.
- Avoid broad refactor requests unless required to fix a P0/P1 issue.
- Never edit code or run commands that mutate business code.

## Codex Output Format

Codex Review output should use:

```md
# Codex Review Result

## Verdict

PASS or FAIL

## P0 Issues

## P1 Issues

## P2 Issues

## Passing Checks

## Fix Prompt for Claude Code
```

P0 means blocking correctness, data loss, security, or build-breaking problems. P1 means must-fix before `finish-work`. P2 means optional improvements.

## Claude Fix Rule

Claude Code fixes P0/P1 issues by default. Do not fix P2 suggestions unless the user explicitly asks or the P2 is required to resolve a P0/P1.

After fixing, write `.trellis/tasks/<active-task>/reviews/claude-fix-notes.md` with:

- Issues fixed.
- Files changed.
- Checks run.
- Any issue intentionally not fixed and why.

## Finish Rule

Do not run `/trellis:finish-work` until Codex Review passes or the user explicitly overrides the gate.

Passing means:

- `codex-review-1.md` has no P0/P1 issues, or
- P0/P1 issues were fixed, `claude-fix-notes.md` exists, and `codex-review-2.md` confirms no remaining P0/P1 blockers.

Even after review passes, do not push, merge, or rebase without explicit authorization.
