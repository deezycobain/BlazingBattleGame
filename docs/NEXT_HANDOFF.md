# Next Handoff

Project: Blazing Battle (`deezycobain/BlazingBattleGame`). Start by reading this file and `PROJECT_STATE.md`.

Approved dev baseline: `06319adbadec3b9eaf00f4a4b4a641c06158ef54`. Checkpoint: `checkpoint/combat-runtime-stable-2026-09-23` at the same SHA.

The current architecture combines canonical character data in `assets/characters/*/data/unit.json`, runtime modules under `runtime/`, a standalone shell, and a production build that writes `dist/`. Recent approved work covers readiness-gated battle entry, configured attack timelines, fallback removal, stable visual scale/feet anchoring, target-relative melee contact, and Road geometry.

Visual direction: clean transparent character bodies, stable feet anchors, authored attack contact timing, and map-aware world placement. New sprites must follow `ASSET_CONTRACT.md` Contract v1; legacy assets remain supported until rebuilt.

Rules: do not casually modify `main`; begin ordinary work from `dev`; use feature branches; validate before merge; preserve approved systems and assets; do not merge a feature automatically unless requested.

Known debt: combat stabilization is currently integrated through `scripts/combat-stabilization-postprocess.mjs`, which rewrites the generated shell. It works and is approved; document and deliberately plan any migration rather than casually changing it.

Recommended next priorities: review this continuity branch, use Contract v1 for new assets, and plan a separate migration away from generated-output combat integration only after behavior remains covered by tests.

See `DEV_CHANGELOG.md`, `KNOWN_ISSUES.md`, and `ASSET_CONTRACT.md` for context.
