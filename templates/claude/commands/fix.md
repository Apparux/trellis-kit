# /fix

Use `/fix` as the lightweight entrypoint for small bug fixes, small adjustments, and low-risk patches.

The text after `/fix` is the requested bug fix or small change.

Accepted examples:

```text
/fix 修复学生档案导出时手机号为空导致 NPE 的问题
/fix 学生档案列表里班级名称字段现在返回 classId，改成返回 className
/fix 班主任只能看到自己班级学生，现在好像能看到全年级，帮我修一下
/fix 补全风险事件登记接口的 Swagger 注释
```

## Required Reading

Before editing, read:

1. `.trellis/spec/guides/fast-path-change-policy.md`
2. Relevant project rules under `.trellis/spec/` selected by Trellis context or spec indexes

## Minimal Implementation Context

If `.trellis/spec/guides/minimal-implementation.md` exists, read it before editing and include it when curating implementation context:

- Add it to `implement.jsonl` when the fix is handled inside Trellis task context.
- Do not rely on `.trellis/spec/**/index.md` to discover this guide.
- Do not modify any `index.md` file for this purpose.

## Fast Path Rule

For every `/fix <request>`:

1. Treat `$ARGUMENTS` as the requested bug fix or small change.
2. Inspect relevant code before editing.
3. Decide whether the request qualifies for Fast Path Fix according to `.trellis/spec/guides/fast-path-change-policy.md`.
4. If it clearly qualifies, do not create PRD/DESIGN/TASK documents.
5. If it does not qualify, explain briefly why it needs the full Trellis workflow and stop for the user's decision.
6. Do not auto-generate Review Brief or run review.
7. Do not auto-commit.
8. Do not run Codex Review, Claude Review, external review, or review scripts.
9. Do not push, merge, rebase, or run finish-work.

## Current Workspace Rule

Before editing:

1. Check current branch.
2. Check current working directory.
3. Check whether there are uncommitted changes.
4. Stay in the current workspace for `/fix`.
5. If the workspace has unrelated changes or the fix is risky, stop and explain that the request should use `/task <task-id>` for a prepared full Trellis task, or be retried after the workspace is clean.

## Implementation Rule

Make the smallest safe code change.

Prefer targeted validation:

* Compile the affected module when possible.
* Run the related test when available.
* Run lint/type check only when relevant.
* Do not run broad expensive checks unless needed.

## Final Response

The final response must include:

* Root cause
* Changed files
* Verification performed
* Remaining risks
