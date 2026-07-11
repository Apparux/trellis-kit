# Review Fix Summary

## Source Complete Pair

- Pair: `NNN`
- Markdown path: `codex-review-NNN.md`
- Raw JSONL path: `codex-review-NNN.jsonl`
- Provenance validated: `Unknown`

This summary must use the source review's same number. Do not overwrite an existing `review-fix-summary-NNN.md`.

## Fixed Findings

None

## Changed Files

None

## Findings Marked False Positive

None

## Findings Deferred

None

## Tests / Checks Run

None

## Remaining Risks

None

## Suggested Rereview Input

Run `/review --rereview` for the active Trellis task. Rereview must consume this same-number summary and source complete pair, then allocate the next unused three-digit pair.

Suggested input context:

```text
Rereview mode. Read codex-review-NNN.md, codex-review-NNN.jsonl, and review-fix-summary-NNN.md. Verify that Blocking and Should Fix findings were fixed, check for regressions, and report only remaining actionable items plus Verified Fixed or False Positive / Not Applicable findings.
```
