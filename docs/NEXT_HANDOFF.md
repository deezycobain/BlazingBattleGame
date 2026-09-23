# Next Handoff

Project: Blazing Battle (`deezycobain/BlazingBattleGame`). Start by reading this file and `PROJECT_STATE.md`.

## Start here

Use `dev` as the normal development and test branch. Do not create a feature branch automatically for every task.

Current approved organizational checkpoint: `checkpoint/project-continuity-atlas-v1-2026-09-23` at `40b02ca7e3f5d90969da943c998a9e13b11cd399`.

Historical combat-only checkpoint: `checkpoint/combat-runtime-stable-2026-09-23` at `06319adbadec3b9eaf00f4a4b4a641c06158ef54`. It preserves the combat stabilization milestone but is not the current development baseline.

Current uncheckpointed `dev` gameplay work has moved beyond the organizational checkpoint. Road now uses authored speed-based round initiative with pause/status guards, the post-battle Road intermission exposes next-stage and carried HP/chakra state, and the latest progression bridge renders per-unit battle XP/level/gate state with a direct Forge route when a supported deployed unit is actually Awakening-ready. The gameplay implementation series currently culminates at `858c5e54c91d7fbbcf2a3e2791b363d1f0672d56`; documentation-only commits may follow it. Run the full validation/build/browser-smoke gates before treating this increment as checkpoint-approved or promoting it toward `main`.

## Branch rules

- `main`: stable only. Do not develop directly on it. Promote from validated `dev` only with explicit approval.
- `dev`: primary working and testable build. Normal development should happen here or be merged back here.
- `experiment/<topic>`: use only for risky or speculative work that should not destabilize `dev`. Keep at most one or two active, branch from current `dev`, and retire after the decision.
- `feature/*`: exceptional and short-lived only. Use when isolation is genuinely useful, then merge to `dev` and delete.
- `checkpoint/*`: immutable historical reference points, never active development branches.

The goal is a clean repository: `main` + `dev` + at most one or two current experiments, with checkpoints retained for history.

The current architecture combines canonical character data in `assets/characters/*/data/unit.json`, runtime modules under `runtime/`, a standalone shell, and a production build that writes `dist/`. Recent approved work covers readiness-gated battle entry, configured attack timelines, fallback removal, stable visual scale/feet anchoring, target-relative melee contact, Road geometry, and Character Sprite / Atlas Contract v1 continuity and validation.

Visual direction: clean transparent character bodies, stable feet anchors, authored attack contact timing, and map-aware world placement. New sprites must follow `ASSET_CONTRACT.md` Contract v1; legacy assets remain supported until intentionally rebuilt.

Preserve approved systems and assets. Validate meaningful changes before they are considered approved. Do not automatically merge experimental work.

Checkpoint documentation rule: whenever an approved feature is merged into `dev` and a new checkpoint is created, update `PROJECT_STATE.md`, `NEXT_HANDOFF.md`, `DEV_CHANGELOG.md`, and `KNOWN_ISSUES.md` as applicable before starting the next major development cycle.

Known debt: combat stabilization is currently integrated through `scripts/combat-stabilization-postprocess.mjs`, which rewrites the generated shell. It works and is approved; document and deliberately plan any migration rather than casually changing it.

See `DEV_CHANGELOG.md`, `KNOWN_ISSUES.md`, and `ASSET_CONTRACT.md` for context.
