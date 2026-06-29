<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

## Commands

- `/task <id>` — continue or implement a prepared Trellis task
- `/fix <request>` — fast path for small bug fixes and low-risk patches
- `/handoff` — manually generate Review Handoff Markdown for the active task
- `/spec-cleanup` — safely audit and consolidate `.trellis/spec/`
- `/trellis:continue` — continue the current active task
- `/trellis:finish-work` — finish the current task

## Key Guides

- `.trellis/spec/guides/development-location-decision.md` — worktree vs current workspace for `/task`
- `.trellis/spec/guides/fast-path-change-policy.md` — when to use `/fix` instead of full task work
- `.trellis/spec/guides/review-handoff-workflow.md` — optional Review Handoff generation

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

## Manual External Review

This kit does not install bundled review scripts. Review Handoff Markdown is the portable artifact for manual external review. Users may paste it into Codex, Claude, another tool, or send it to a human reviewer manually.

No Trellis command automatically runs an external reviewer.

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
