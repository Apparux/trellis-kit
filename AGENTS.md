<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

## Commands

- `/dev` — full Trellis workflow for new features and complex changes
- `/fix` — fast path for small bug fixes and low-risk patches
- `/task <id>` — continue a specific existing Trellis task
- `/trellis:continue` — continue the current active task
- `/trellis:finish-work` — finish the current task

## Key Guides

- `.trellis/spec/guides/development-location-decision.md` — worktree vs current workspace
- `.trellis/spec/guides/fast-path-change-policy.md` — when to use `/fix` vs `/dev`
- `.trellis/spec/guides/review-handoff-workflow.md` — optional Review Handoff generation

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

## Review Scripts (Optional Manual Tools)

- `.trellis/spec/scripts/codex-review.sh` — manual Codex Review (macOS/Linux)
- `.trellis/spec/scripts/codex-rereview.sh` — manual Codex Re-Review (macOS/Linux)
- `.trellis/spec/scripts/codex-review.ps1` — manual Codex Review (Windows)
- `.trellis/spec/scripts/codex-rereview.ps1` — manual Codex Re-Review (Windows)

These scripts are not automatically executed by `/dev` or `/fix`. Users run them manually when they choose to use Codex as an external reviewer.

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->
