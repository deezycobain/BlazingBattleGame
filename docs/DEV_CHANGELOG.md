# Development Changelog

Git history is the detailed record. This file tracks approved engineering milestones and important project-governance changes.

## 2026-09-23 — Battle-to-progression results bridge (uncheckpointed dev)

Branch: `dev`  
Implementation commits: `57a7808`, `f56af53`, `49c59b6`, `858c5e5`  
Checkpoint: none yet.

Changes: expanded battle results from a single XP summary into per-unit persistent progression state, including current level, XP toward the next level, level gains, Awakening-gate status, and Shiny completion. Road victories now expose a direct `OPEN FORGE` route only when a deployed fighter supported by the current Forge progression UI is at an Awakening gate and has the required duplicate copies. Existing `CONTINUE ROAD`, carried HP/chakra, stage advancement, Castle, Journey, combat stabilization, and Atlas v1 contracts remain intact.

Validation status: source-integrity checks pass and both `scripts/results-browser-smoke.mjs` and `scripts/validate-blazing-road.mjs` now cover the bridge. GitHub reported no combined-status checks for the direct `dev` push, so the full local validation/build/browser-smoke suite is still required before this work is considered checkpoint-approved or promoted to `main`.

Remaining scope: direct battle-result Forge routing is intentionally limited to the five units supported by the current progression-panel Forge bridge (`Crimson`, `Sub-Zero`, `Lebee`, `Senku`, `Tyler`). Broader Forge support should be expanded deliberately rather than routing unsupported units to the wrong card.

## 2026-09-23 — Branch governance simplification

Branch: `feature/next-development-task-2026-09-23` → `dev`  
Checkpoint: none; organizational housekeeping only.

Changes: established `main` as the stable-only branch, `dev` as the permanent primary development/test branch, `experiment/<topic>` as the limited temporary sandbox pattern, `feature/*` as exceptional short-lived isolation only, and `checkpoint/*` as immutable historical references. Normal work no longer requires a new feature branch by default.

Validation: documentation-only change; repository branch relationships were inspected before integration. No gameplay, asset, build, or deployment files were changed.

Remaining cleanup: completed legacy `feature/*` refs should be removed once their merged status is confirmed. The existing `experimental` branch is divergent from current `dev` and should be reviewed deliberately before retirement or replacement.

## 2026-09-23 — Combat runtime stabilization

Branch: `feature/combat-runtime-stabilization-2026-09-23`  
Commit/checkpoint: `9e88403` / `checkpoint/combat-runtime-stable-2026-09-23`

Changes: asset readiness gate; fallback artifact removal; configured attack timing; map-specific Road geometry; alpha-bounds scale normalization; target-relative melee contact positioning.

Validation: full validation suite, production build, generated-shell contract checks, and phone gameplay test.

Remaining issues: generated-output combat integration is documented tech debt.

## Earlier meaningful milestones

- Home/menu polish, Forge and summon progression, and UI navigation stabilization.
- Sanctuary/First Bloom and Journey environment scaffolding.
- Blazing Road stages, persistence, geometry, presentation, and camera work.
- Legacy Shinobi cards, idle/basic sprite integration, and canonical unit coverage.

For future passes use: date, title, branch, commit/checkpoint, changes, validation, and remaining issues.
