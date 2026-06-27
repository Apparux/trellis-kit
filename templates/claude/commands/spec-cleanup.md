# /spec-cleanup

Use `/spec-cleanup` to automatically audit, consolidate, and safely organize `.trellis/spec/`.

This command performs safe cleanup automatically and asks the user only for destructive, ambiguous, conflicting, or behavior-changing actions.

## Required Reading

Before cleanup, read:

1. `.trellis/spec/guides/spec-cleanup-guide.md`

Do not load all `.trellis/spec/` files blindly.

First list files, then inspect only files relevant to cleanup decisions.

## Process

For every `/spec-cleanup` request:

1. Inspect `.trellis/spec/` structure.
2. Classify files into:
   - Active guides
   - Templates
   - Task-specific specs
   - Archive candidates
   - Deprecated candidates
   - Duplicate / merge candidates
   - Ambiguous candidates
3. Automatically keep current active guides.
4. Automatically keep templates.
5. Automatically move clear archive candidates to `.trellis/spec/archive/`.
6. Automatically move clear deprecated candidates to `.trellis/spec/deprecated/`.
7. Automatically detect duplicated or overlapping specs.
8. Automatically merge low-risk duplicate specs into canonical guides.
9. Automatically add deprecation headers for deprecated files.
10. Automatically update references to canonical files when unambiguous.
11. Automatically update command templates to remove broad load-all spec wording when the update is straightforward.
12. Ask the user only for ambiguous, conflicting, destructive, or behavior-changing operations.
13. Output a final cleanup report.

## Automatic Cleanup Actions

The agent may automatically:

- Create `.trellis/spec/archive/`.
- Create `.trellis/spec/deprecated/`.
- Move historical task-specific specs to archive.
- Move clearly replaced workflow files to deprecated.
- Add deprecation headers.
- Merge non-conflicting duplicate wording into canonical guides.
- Merge examples into canonical guides.
- Merge missing constraints that match current approved behavior.
- Update stale command references.
- Update references from old files to canonical files.
- Remove stale broad spec-loading wording from `/dev`, `/fix`, and `/spec-cleanup` while preserving Trellis-native context selection.

## Duplicate Merge Process

During cleanup, also detect duplicated or overlapping specs.

For each duplicate group:

1. Identify the workflow topic.
2. Identify the canonical target file.
3. Compare the duplicated content against the canonical rule.
4. If the duplicate content is non-conflicting and low-risk, merge it automatically.
5. Move the superseded file to archive or deprecated.
6. Update references.
7. Report the merge.

If the duplicate group is conflicting, ambiguous, user-authored, or changes core behavior, stop and ask the user.

## Automatic Merge Actions

The agent may automatically:

- merge non-conflicting duplicate wording into the canonical guide
- merge examples into the canonical guide
- merge missing constraints that match current approved behavior
- update references from old files to canonical files
- move merged old files to `.trellis/spec/deprecated/` or `.trellis/spec/archive/`

## Merge Confirmation Required

Ask before merging when:

- there is any conflict
- both files are active command-referenced guides
- the canonical target is unclear
- the merge changes behavior
- the content is project-specific
- the content belongs to the current active task
- the merge affects review, check, handoff, commit, push, merge, rebase, finish-work, or worktree location behavior

## Confirmation Required

Ask the user before:

- Deleting files.
- Merging conflicting rules.
- Merging behavior-changing rules.
- Merging ambiguous user-authored policies.
- Rewriting active guide logic.
- Moving ambiguous files.
- Moving files related to the current active Trellis task.
- Removing custom user rules.
- Changing installer behavior beyond template mappings.
- Making changes outside the expected template, command, README, and installer files.

## Final Response

After cleanup, report:

- Active guides kept
- Templates kept
- Files archived
- Files deprecated
- Duplicate specs merged
- Files updated
- References updated
- Files requiring user decision
- Checks performed
- Remaining risks
- Suggested next cleanup timing

## Forbidden

Do not:

- Delete files without user confirmation.
- Silently resolve conflicting rules.
- Silently delete superseded files.
- Merge conflicting rules without user confirmation.
- Merge behavior-changing rules without user confirmation.
- Merge active guides in a way that changes behavior without user confirmation.
- Rewrite active guide behavior without user confirmation.
- Treat archived specs as active rules.
- Run `/dev`.
- Run `/fix`.
- Run Codex Review.
- Run Claude Review.
- Run external reviewer tools.
- Commit.
- Push.
- Merge.
- Rebase.
- Run finish-work.
