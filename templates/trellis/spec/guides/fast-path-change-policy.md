# Fast Path Change Policy

## Goal

This guide defines when an agent may use a lightweight change process instead of the full Trellis workflow.

The goal is to make small bug fixes and low-risk changes faster while still keeping enough context, safety, and reviewability.

## Change Modes

There are two development modes:

1. Full Trellis Workflow
2. Fast Path Fix

## Fast Path Fix Is Allowed When

Use Fast Path Fix for small, low-risk changes, including:

* Fixing a clear bug
* Adjusting validation logic
* Fixing a typo, label, message, or enum mapping
* Fixing a small frontend/backend field mismatch
* Adding or correcting comments or API documentation
* Adjusting a single query condition
* Fixing a small permission/data-scope issue when the intended rule is already clear
* Making a small compatibility fix
* Modifying a small number of files with limited blast radius

## Full Trellis Workflow Is Required When

Do not use Fast Path Fix. Use the full Trellis workflow when the change involves:

* New feature implementation
* New module or major flow
* Database schema changes
* Permission/authentication architecture changes
* Data model redesign
* Cross-module business process changes
* Large refactoring
* Public API contract changes with unclear impact
* Multiple competing solution options
* Unclear product requirement
* Risky migration or data correction
* Changes that require PRD/DESIGN/TASK decomposition

## Required Fast Path Steps

For Fast Path Fix, the agent must follow this lightweight process:

1. Restate the bug or requested small change.
2. Inspect the relevant code before editing.
3. Identify the minimal change scope.
4. Explain whether this qualifies for Fast Path.
5. Ask the user only if the change mode is ambiguous or risky.
6. Apply the smallest safe change.
7. Run targeted checks if available.
8. Summarize:

   * Root cause
   * Changed files
   * Verification performed
   * Remaining risks

## Trellis Task Handling

Fast Path Fix does not require creating a full Trellis task unless the user explicitly asks.

If there is already an active Trellis task, do not modify its phase or status unless the user explicitly says the fix belongs to that task.

If the user asks to attach the fix to an existing Trellis task, add a short note or context entry to that task instead of forcing the full workflow.

## Work Location Decision

Fast Path Fix is intended for current-workspace changes.

Before editing, inspect the current branch, current working directory, and uncommitted changes.

For Fast Path Fix, continue only when:

* The fix is small
* The current branch/current workspace is appropriate
* There are no unrelated uncommitted changes that would make the fix unsafe

If the workspace has unrelated changes or the fix is risky, stop and explain that the request should use `/task <task-id>` for a prepared full Trellis task, or be retried after the workspace is clean.

## Forbidden

Do not do any of the following for Fast Path Fix unless explicitly requested:

* Create PRD/DESIGN/TASK documents
* Run the full Trellis planning workflow for a clearly small fix
* Change database schema
* Perform large refactoring
* Start implementation before inspecting relevant code
* Switch development location
* Generate Review Handoff
* Commit
* Run Codex Review
* Run Claude Review
* Run review scripts
* Push
* Merge
* Rebase
* Run finish-work
