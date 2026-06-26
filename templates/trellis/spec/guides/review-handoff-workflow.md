# Review Handoff Workflow

## Purpose

Review Handoff Markdown is an optional handoff document for manual external review.

It can be used with:

* Codex
* Claude
* Human reviewers
* Other code review tools
* The user's own review process

## Relationship with Trellis Check

Trellis native check is the default verification mechanism for full `/dev` tasks.

Review Handoff Markdown is not a replacement for Trellis check. It is a handoff document for optional external review.

The default `/dev` flow is:

1. Implement the Trellis task.
2. Run native Trellis check.
3. Ask whether to generate Review Handoff Markdown.
4. Stop and let the user decide any external review.

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

The agent must not automatically invoke Codex Review, Claude Review, or any external reviewer from `/dev`.

The user may manually choose one of the following:

1. Review personally.
2. Paste the handoff into Codex.
3. Paste the handoff into Claude.
4. Run the provided review scripts manually.
5. Assign the handoff to a human reviewer.
6. Skip external review.

## Required Handoff Sections

Review Handoff Markdown must include:

* Task
* Task path
* Implementation summary
* Changed files
* API changes
* Database changes
* Permission/data-scope changes
* Configuration changes
* Checks performed
* Known limitations and risks
* Review focus
* Git diff scope
* Suggested review prompt

## Review Scripts

The installed review scripts under `.trellis/spec/scripts/` are optional manual tools:

* `codex-review.sh` / `codex-review.ps1`
* `codex-rereview.sh` / `codex-rereview.ps1`

These scripts are not automatically executed by `/dev` or `/fix`.

The user may run them manually when they choose to use Codex as an external reviewer.

## Forbidden

The agent must not automatically:

* Run Codex Review
* Run Claude Review
* Run any external reviewer
* Run review scripts
* Fix P0/P1 findings from external review
* Re-review
* Commit
* Push
* Merge
* Rebase
* Run finish-work
