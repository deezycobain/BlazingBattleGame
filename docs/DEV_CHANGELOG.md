# Development Changelog

## 2026-09-24 — Legacy full-card presentation correction + Itachi reference kinetics (uncheckpointed dev)

Branch: `dev`  
Starting head: `a8d40c6`  
Checkpoint: none yet.

Changes: retired the generated `legacy_summon_art.png` center-crop workaround. Legacy Edit Team, summon reveal, and summon results now route to each fighter's canonical full card at native aspect ratio with `object-fit: contain`, no presentation scale transform, and a UI-owned lower matte that covers the baked source-name zone so the UI nameplate is the only visible fighter name. The unpacker now deletes the obsolete cropped derivatives instead of regenerating them. Wong Fei-Hung's 250 ms idle / 190 ms basic cadence and fixed-scale Drunken Master runtime remain unchanged.

Itachi verification: the Itachi ring stack directly uses `bbOrnateRingBuild`, `bbOuterRingCharge`, and `bbEnergyRingCharge` from the regular summon cinematic with the same .90 s / 1.05 s / .76 s durations and .21 s / .47 s / .81 s three-beat start timing. The special visual assets remain Itachi-specific; the movement curve/rotation trajectory is shared with the reference rather than duplicated. The stale Itachi-only snap/spin keyframes and forced opaque ring-image override are removed so the shared reference keyframes now control opacity as well as transform, eliminating the remaining gear-like hold.

Validation target: full `dev` build, targeted Legacy browser smoke, paired-team smoke, Itachi integration smoke, Road persistence/gameplay smoke, and deployed commit check before calling this pass test-ready.

## 2026-09-23 — Wong Fei-Hung refresh + team-editor art cleanup (uncheckpointed dev)

Branch: `dev`  
Asset materialization commit: `6e1dd77`  
Checkpoint: none yet.

Changes: integrated `legacy_of_the_shinobi_jackie_chan_refresh.zip` as Wong Fei-Hung's canonical refresh source, including refreshed card art plus new 1536x1024 3x2 idle/basic sheets split on exact 512x512 source cells and normalized into six 512x768 bottom-center runtime frames. Wong retains the Drunken Master identity and 220 ms idle / 165 ms basic authored cadence. Idle uses irregular repeated holds, while the configured melee path keeps all six attack poses and the authored hit frame intact, adding randomized hesitation, a late snap into range, small cadence variation, and a looser recovery. The Edit Team screen now avoids old named trading-card art: core fighters prefer clean full art while Legacy fighters fall back to clean normalized body art; Wong specifically uses his refreshed idle body there.

Pipeline: the Legacy unpack workflow now recognizes the Wong refresh archive, accepts 1536x1024 square-cell 3x2 sheets, and rebases before its bot push so generated assets are not lost when `dev` moves concurrently. The refresh unpack/materialization workflow completed successfully.

Validation status: targeted Legacy cadence checks and clean-art browser guards are wired. A fresh full `dev` build/deployed smoke is required on the post-materialization head before this pass is checkpoint-approved or promoted to `main`.

Remaining scope: recoil/hit-reaction standardization for player/enemy units remains the next combat-feel pass. Inventory presentation, Jutsus, reusable VFX, elements/type balance, and field/status effects remain later focused passes.

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
