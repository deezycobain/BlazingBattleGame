# Blazing Battle Development Operating Rules

These rules govern all ongoing work on Blazing Battle.

## Core objective

Move as fast as possible without trading away correctness, continuity, maintainability, visual quality, or player experience. Every change should leave the project at least as understandable and controllable as it was before the change.

## Decision and communication rules

- Ask a focused question when missing information could materially change architecture, gameplay behavior, visual direction, destructive asset work, save compatibility, or the amount of rework required.
- Do not stall on low-risk or easily reversible details that can be resolved from the repository, established project direction, existing assets, or a targeted test.
- When a materially better implementation path exists, recommend it before committing to the weaker path.
- If a requested or proposed change could create regressions, technical debt, duplicated systems, performance problems, asset clutter, brittle behavior, or future workflow friction, flag that risk immediately and explain the cleaner alternative.
- Separate temporary diagnostic work from production solutions. A debugging shortcut must not quietly become permanent architecture.

## Implementation rules

- Preserve approved systems unless the current task explicitly requires changing them.
- Inspect the existing implementation before adding new code so behavior is extended rather than duplicated.
- Prefer small, reversible, well-scoped changes over broad rewrites.
- Do not use visual crop/zoom tricks, duplicate runtime assets, hidden fallback systems, or generated-output hacks to disguise an incorrect source asset or broken contract when the source can be fixed correctly.
- Respect Character Sprite / Atlas Contract v1, Road save compatibility, combat stabilization, canonical unit data, and approved runtime boundaries.
- Keep `main` stable. Normal work happens on `dev`. Create experimental isolation only when the risk genuinely warrants it or the user explicitly requests it.
- Do not accumulate unnecessary branches, stale generated assets, abandoned experiments, or parallel implementations of the same feature.

## Validation ladder

Use the smallest reliable gate that matches the risk of the change:

1. Run source/static validation and the directly affected smoke or browser test first.
2. Add the nearest cross-system integration test when a change crosses a runtime boundary.
3. Retry only the failed or flaky gate after a test-harness-only correction instead of restarting unrelated work.
4. Run the full regression suite for checkpoint approval, stable promotion, major cross-system work, save/runtime contract changes, or when targeted testing reveals broader uncertainty.

Independent browser and subsystem checks should be parallelized where practical. Chromium and WebKit should not be serialized merely by habit.

## Test quality rules

- Prefer state-based assertions over arbitrary wall-clock sleeps.
- Verify the exact deployed commit SHA when testing a deployed build.
- A flaky test should be made deterministic; do not weaken meaningful coverage just to turn CI green.
- Distinguish a test-harness failure from a gameplay/runtime regression before modifying production behavior.
- Reuse known-good setup helpers and readiness signals instead of inventing slightly different boot logic in every smoke.
- Deployment lag should trigger an exact-SHA recheck or targeted retry, not an unrelated code change.

## Workflow hygiene

Negative workflow is not acceptable. Avoid redundant full-suite runs, repeated asset regeneration, branch churn, broad refactors during focused fixes, unnecessary narration that interrupts execution, and fixes that create more cleanup than the original defect.

When a task is complete, leave a concise handoff: what changed, what was validated, remaining risk if any, the current `dev` SHA, and the test URL when relevant.
