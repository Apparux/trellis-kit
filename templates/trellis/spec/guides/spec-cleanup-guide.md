# Spec Cleanup Guide

## Purpose

This guide defines how to keep `.trellis/spec/` small, current, and useful.

Spec cleanup prevents:

- duplicated workflow rules
- deprecated prompts
- conflicting guides
- oversized context loading
- outdated task artifacts influencing new work
- unnecessary token usage

## Core Principle

`.trellis/spec/` should be a curated rule and reference library, not a dumping ground for every historical discussion, draft, or completed task artifact.

Keep active rules small, explicit, and easy for agents to load selectively.

## Cleanup Mode

Spec cleanup uses an automatic safe-cleanup mode.

The agent should automatically classify, consolidate, and safely organize `.trellis/spec/`.

The command should not require the user to approve every low-risk cleanup action.

The agent asks the user only for destructive, ambiguous, conflicting, or behavior-changing actions.

## Spec Categories

Classify files into these categories:

1. Active Guides
2. Templates
3. Task-Specific Specs
4. Archive
5. Deprecated
6. Ambiguous

### Active Guides

Long-lived rules used by commands or agents.

Examples:

- `development-location-decision.md`
- `fast-path-change-policy.md`
- `review-handoff-workflow.md`
- `spec-cleanup-guide.md`

Active guides should be:

- short
- current
- non-overlapping
- clearly named
- explicitly referenced by commands

### Templates

Reusable output templates.

Examples:

- `review-handoff-template.md`

Templates should stay under `.trellis/spec/templates/`.

### Task-Specific Specs

Task PRDs, designs, plans, task notes, handoffs, and temporary specs that are only relevant to a single Trellis task.

These should not be treated as global guides.

When the task is complete and clearly historical, these may be archived automatically.

### Archive

Historical specs that may be useful for reference but should not be loaded by default.

Recommended location:

`.trellis/spec/archive/`

Archived specs must not be referenced by default command templates.

### Deprecated

Old rules replaced by newer rules.

Deprecated files should be moved to:

`.trellis/spec/deprecated/`

Every deprecated file should clearly say:

`DEPRECATED - Do not use. Replaced by <new-file>.`

or:

`DEPRECATED - Do not use. Merged into <canonical-file>.`

### Ambiguous

Files whose purpose, status, or replacement is unclear.

Ambiguous files require user confirmation before moving, deleting, merging, or rewriting.

## Cleanup Triggers

Run spec cleanup:

- after a large Trellis task is completed
- after 5 to 10 Trellis tasks
- after workflow naming changes
- after replacing old rules with new rules
- when commands start reading too much context
- when agent behavior becomes inconsistent
- when `.trellis/spec/` contains multiple versions of similar rules

## Cleanup Process

The agent must follow this process:

1. List files under `.trellis/spec/`.
2. Classify files as:
   - Active guide
   - Template
   - Task-specific spec
   - Archive candidate
   - Deprecated candidate
   - Duplicate / merge candidate
   - Ambiguous candidate
3. Automatically keep current active guides.
4. Automatically keep reusable templates.
5. Automatically move clear historical task-specific specs to `.trellis/spec/archive/`.
6. Automatically move clearly replaced or outdated workflow rules to `.trellis/spec/deprecated/`.
7. Automatically merge low-risk duplicate specs into canonical guides.
8. Automatically add a deprecation header when moving deprecated files.
9. Automatically update references to canonical files when the replacement is unambiguous.
10. Automatically update command templates to remove broad load-all spec wording when the fix is straightforward.
11. Ask the user before destructive, ambiguous, conflicting, or behavior-changing actions.
12. Summarize all actions taken.

## Automatic Actions

The agent may perform these actions without asking first:

- Create `.trellis/spec/archive/` if needed.
- Create `.trellis/spec/deprecated/` if needed.
- Move clearly historical task-specific specs to archive.
- Move clearly replaced old workflow files to deprecated.
- Add a `DEPRECATED - Do not use` header to deprecated files.
- Keep current active guides unchanged.
- Keep templates unchanged.
- Merge non-conflicting duplicate wording into canonical guides.
- Merge examples into canonical guides.
- Merge missing constraints that match current approved behavior.
- Update references from old files to canonical files.
- Update `/dev` and `/fix` command templates to remove broad load-all spec wording while preserving Trellis-native context selection.
- Remove stale references to old workflow names when the replacement is unambiguous.

## Actions Requiring Confirmation

The agent must ask before:

- Deleting any file.
- Merging files with conflicting rules.
- Merging two or more active guides that are both referenced by current commands.
- Rewriting the core behavior of an active guide.
- Moving a file whose purpose is ambiguous.
- Archiving a file that appears related to the current active Trellis task.
- Removing user-authored custom rules.
- Renaming files when references are unclear.
- Changing installer behavior beyond adding missing template mappings.
- Modifying anything outside `.trellis/spec/`, `.claude/commands/`, README files, or installer template mappings.

## Classification Rules

Keep as active guides when the file is current, long-lived, and referenced by commands.

Canonical current guide names include:

- `development-location-decision.md`
- `fast-path-change-policy.md`
- `review-handoff-workflow.md`
- `spec-cleanup-guide.md`

Canonical current template names include:

- `review-handoff-template.md`

Keep as templates when the file is reusable output structure.

Archive when the file is task-specific, historical, completed, or no longer part of global workflow.

Move to:

`.trellis/spec/archive/`

Deprecate when the file contains old workflow naming or replaced behavior.

Move to:

`.trellis/spec/deprecated/`

and add:

`DEPRECATED - Do not use. Replaced by <new-file>.`

or:

`DEPRECATED - Do not use. Merged into <canonical-file>.`

Old workflow files likely to deprecate:

- `claude-codex-review-workflow.md`
- `codex-handoff-template.md`

Old concepts likely to deprecate:

- `Codex Review Gate`
- `Automatic Codex Review`
- `Mandatory Codex Review`
- `Review Handoff Gate`
- `Review Handoff Decision Gate`
- `automatic P0/P1 fix`
- `automatic re-review`
- `Review Handoff replaces Trellis check`
- `Review Handoff is mandatory`

Old worktree path rules likely to deprecate:

- `../<repo>-worktrees/<task-id>`
- `../<repo>-<task-id>`
- `.trellis/worktrees/<task-id>`

Current approved worktree path:

`.worktrees/<task-id>`

## Duplicate Spec Merge Policy

The agent should detect duplicated, overlapping, or superseded specs.

The goal is to keep one clear source of truth for each workflow topic.

### Merge Targets

When multiple files describe the same workflow topic, choose one canonical target file.

Canonical current guide names include:

- `development-location-decision.md`
- `fast-path-change-policy.md`
- `review-handoff-workflow.md`
- `spec-cleanup-guide.md`

Canonical current template names include:

- `review-handoff-template.md`

### Automatic Low-Risk Merge

The agent may automatically merge duplicated specs when all of the following are true:

- The files describe the same workflow topic.
- One file is clearly newer, canonical, or referenced by current commands.
- The duplicated content is consistent with the canonical rule.
- The merge only adds clarifying details, examples, or missing non-conflicting constraints.
- The merge does not change the core behavior of an active guide.
- The old file can be safely moved to archive or deprecated after merging.
- References can be updated unambiguously.

Examples of automatic low-risk merges:

- Moving non-conflicting worktree path details into `development-location-decision.md`.
- Moving non-conflicting Fast Path examples into `fast-path-change-policy.md`.
- Moving old Codex-specific handoff wording into reviewer-neutral `review-handoff-workflow.md` after rewriting it to current terminology.
- Consolidating duplicate selective spec loading rules into `spec-cleanup-guide.md`.
- Consolidating duplicate Review Handoff template guidance into `review-handoff-template.md`.
- Consolidating duplicate “do not auto review / do not auto commit” wording into the current canonical guide if the meaning is unchanged.

### Actions After Automatic Merge

After an automatic low-risk merge, the agent should:

1. Update the canonical guide.
2. Move the old duplicated file to `.trellis/spec/deprecated/` if it was replaced by a new rule.
3. Move the old duplicated file to `.trellis/spec/archive/` if it was historical or task-specific.
4. Add a deprecation header when moved to deprecated:
   `DEPRECATED - Do not use. Merged into <canonical-file>.`
5. Update command templates or README references to point to the canonical file.
6. Report the merge in the final cleanup summary.

### Confirmation Required Before Merge

The agent must ask the user before merging when:

- Two or more active guides are both referenced by current commands.
- The files contain conflicting rules.
- It is unclear which rule is newer or canonical.
- The merge would change default behavior.
- The merge affects worktree location policy.
- The merge affects review, check, handoff, commit, push, merge, rebase, or finish-work behavior.
- The merge affects `/dev`, `/fix`, or `/spec-cleanup` core behavior.
- The file appears to contain user-authored project-specific policy.
- The file appears related to the current active Trellis task.
- The merge requires deleting information rather than preserving or relocating it.

### Forbidden Merge Behavior

The agent must not:

- silently resolve conflicting rules
- silently delete superseded files
- merge ambiguous user-authored policies without confirmation
- merge current active task specs into global guides without confirmation
- change canonical behavior without user confirmation

## Selective Spec Loading Rule

Commands must not blindly load the entire `.trellis/spec/` directory by default.

Selective spec loading means targeted discovery and relevant rule loading, not under-reading project conventions.

`/dev` and `/fix` should rely on the native Trellis workflow, task context, package/layer spec indexes, and relevant manifests to decide which project rules to read.

Do not replace Trellis-native context selection with a hard-coded minimal list inside `/dev` or `/fix`.

`/spec-cleanup` should read:

- `.trellis/spec/guides/spec-cleanup-guide.md`
- then list and selectively analyze `.trellis/spec/` for cleanup decisions

Do not treat archived or deprecated specs as active rules.

Ignore by default:

- `.trellis/spec/archive/`
- `.trellis/spec/deprecated/`

unless the user explicitly asks for historical context.

## Forbidden

The agent must not:

- delete files without user confirmation
- merge conflicting rules without user confirmation
- merge active guides in a way that changes behavior without user confirmation
- rewrite active guide behavior without user confirmation
- move ambiguous files without user confirmation
- archive current active task files without user confirmation
- load the entire `.trellis/spec/` directory during `/dev` or `/fix`
- treat archived specs as active rules
- keep multiple active guides that define conflicting workflow behavior
- create a cleanup commit unless explicitly asked
- push, merge, rebase, or run finish-work

## Final Cleanup Report

After automatic cleanup, report:

- Files kept active
- Templates kept
- Files archived automatically
- Files deprecated automatically
- Duplicate specs merged automatically
- Files updated automatically
- References updated automatically
- Files requiring user decision
- Files not touched
- Remaining risks
- Suggested next cleanup time
