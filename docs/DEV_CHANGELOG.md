# Development Changelog

Git history is the detailed record. This file tracks approved engineering milestones and important project-governance changes.

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
