# Review Handoff Workflow

## Purpose

Review Handoff Markdown is an optional handoff document for manual external review.

It can be used with:

- Codex
- Claude
- Human reviewers
- Other code review tools
- The user's own review process

## Relationship With Trellis Check

Trellis native check is the default verification mechanism for full `/task <task-id>` work.

Review Handoff Markdown is not a replacement for Trellis check. It is a handoff document for optional external review.

The default full-task flow is:

1. Continue the Trellis task with `/task <task-id>`.
2. Implement the task.
3. Run native Trellis check.
4. Ask whether to generate Review Handoff Markdown.
5. Stop and let the user decide any external review.

The manual `/handoff` command may also generate the same Markdown artifact when the user asks for it directly.

## Optional Handoff Policy

Review Handoff Markdown is not generated automatically.

After implementation and Trellis check, the agent asks the user whether to generate it.

The user may choose:

1. Skip handoff and only receive an implementation summary.
2. Generate Review Handoff Markdown now.
3. Generate handoff later.

The agent must respect the user's choice.

## Manual Review Policy

Running external review is optional and user-controlled.

The agent must not automatically invoke Codex Review, Claude Review, review scripts, or any external reviewer from `/task` or `/handoff`.

The user may manually choose one of the following:

1. Review personally.
2. Paste the handoff into Codex.
3. Paste the handoff into Claude.
4. Use another external review tool manually.
5. Assign the handoff to a human reviewer.
6. Skip external review.

## Required Handoff Sections

Review Handoff Markdown must include:

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
- Review scope
- Suggested review prompt

## Review Scope

`Review Scope` is the declared review boundary. It describes what the reviewer should inspect and is not necessarily limited to a git diff.

Do not use the legacy `Git Diff Scope` name as the standard field name in new Review Handoff Markdown. Use `Review Scope` instead.

The default Review Scope is the current local working tree changes, including:

- staged changes
- unstaged changes
- newly added untracked files related to this task

Reviewers should not inspect only `git diff`, because:

- `git diff` only shows unstaged changes
- `git diff --cached` shows staged changes
- untracked files must be discovered with `git status --short` and then opened directly

Suggested commands:

```bash
git status --short
git diff
git diff --cached
```

## Suggested Review Prompt

The Suggested Review Prompt must refer to the declared Review Scope, not the legacy Git Diff Scope name.

Use this scope sentence:

```text
Read this handoff first, then inspect only the declared Review Scope.
```

## External Review Tooling

This kit does not install bundled review scripts.

Review Handoff Markdown is the portable artifact for manual external review. The user may paste it into Codex, Claude, another tool, or send it to a human reviewer.

No command automatically runs external review.

## Forbidden

The agent must not automatically:

- Run Codex Review
- Run Claude Review
- Run any external reviewer
- Run review scripts
- Fix P0/P1 findings from external review
- Re-review
- Commit
- Push
- Merge
- Rebase
- Run finish-work
