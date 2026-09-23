# Blazing Battle — Project State

Repository: `deezycobain/BlazingBattleGame`.

- Main SHA: `af0baf2e69d909744593859e7672559a81852622` (do not casually modify).
- Approved development SHA: `40b02ca7e3f5d90969da943c998a9e13b11cd399`.
- Approved organizational checkpoint: `checkpoint/project-continuity-atlas-v1-2026-09-23` at `40b02ca7e3f5d90969da943c998a9e13b11cd399`.
- Historical combat-only checkpoint: `checkpoint/combat-runtime-stable-2026-09-23` at `06319adbadec3b9eaf00f4a4b4a641c06158ef54`. This remains useful as the combat stabilization milestone but is not the current dev baseline.
- Current working feature branch: `feature/next-development-task-2026-09-23`.
- Development URL, when deployed: `https://dev-blazing-battle-game.blazingbattle.workers.dev` (the repository's deployed-smoke CI targets this exact URL).

Approved systems include the Home/UI shell, summon and Forge progression, Legacy of the Shinobi collection, Blazing Road, Journey scaffolding, canonical unit data, combat runtime, approved combat presentation stabilization, and the Character Sprite / Atlas Contract v1 continuity layer.

Important directories: `assets/characters/`, `assets/maps/`, `runtime/combat/`, `runtime/modes/`, `runtime/ui/`, and `scripts/`.

Runtime architecture: canonical unit JSON feeds the generated standalone shell; runtime modules own reusable behavior; the production build creates `dist/` and runs ordered integration postprocessors. Combat stabilization currently has a documented generated-shell integration dependency.

Validate with `pnpm run validate`. Build with `pnpm run build` where `npm` is available, or follow the ordered build commands used by the project environment. Serve the generated build with `node scripts/serve-dist.mjs`.

Checkpoint documentation rule: whenever an approved feature is merged into `dev` and a new checkpoint is created, update `PROJECT_STATE.md`, `NEXT_HANDOFF.md`, `DEV_CHANGELOG.md`, and `KNOWN_ISSUES.md` as applicable before starting the next major development cycle.
