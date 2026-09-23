# Blazing Battle — Project State

Repository: `deezycobain/BlazingBattleGame`.

## Current branch model

- `main` is the permanent stable branch. Current SHA: `6b64102cbc3524e4bb97499ee29920c1331fbb9b`. Do not use it for ordinary development and do not modify it casually. Promote validated work from `dev` only with explicit approval.
- `dev` is the permanent primary development and test branch. Normal gameplay, UI, content, and systems work should begin from and return to `dev`. Small or routine development may happen directly on `dev` when isolation is unnecessary.
- `experiment/<topic>` branches are temporary sandboxes for risky, architectural, or highly speculative work. Keep no more than one or two active at a time, always branch them from the current `dev`, never merge them directly to `main`, and retire them after the experiment is accepted or rejected.
- `feature/*` branches are not the default workflow. Use one only when a substantial change genuinely benefits from isolation, keep it short-lived, merge validated work back to `dev`, then delete the branch.
- `checkpoint/*` refs are immutable historical milestones, not working branches.

The repository should normally have only `main`, `dev`, zero to two active experiment branches, and historical checkpoint refs. Avoid accumulating completed feature branches.

## Approved continuity

- Approved organizational checkpoint: `checkpoint/project-continuity-atlas-v1-2026-09-23` at `40b02ca7e3f5d90969da943c998a9e13b11cd399`.
- Historical combat-only checkpoint: `checkpoint/combat-runtime-stable-2026-09-23` at `06319adbadec3b9eaf00f4a4b4a641c06158ef54`. This remains useful as the combat stabilization milestone but is not the current development baseline.
- `dev` may advance beyond the last checkpoint as approved development and organizational housekeeping land. The latest checkpoint remains the rollback/reference milestone until a new checkpoint is intentionally created.
- Development URL, when deployed: `https://dev-blazing-battle-game.blazingbattle.workers.dev` (the repository's deployed-smoke CI targets this exact URL).

Approved systems include the Home/UI shell, summon and Forge progression, Legacy of the Shinobi collection, Blazing Road, Journey scaffolding, canonical unit data, combat runtime, approved combat presentation stabilization, and the Character Sprite / Atlas Contract v1 continuity layer.

Important directories: `assets/characters/`, `assets/maps/`, `runtime/combat/`, `runtime/modes/`, `runtime/ui/`, and `scripts/`.

Runtime architecture: canonical unit JSON feeds the generated standalone shell; runtime modules own reusable behavior; the production build creates `dist/` and runs ordered integration postprocessors. Combat stabilization currently has a documented generated-shell integration dependency.

Validate with `pnpm run validate`. Build with `pnpm run build` where `npm` is available, or follow the ordered build commands used by the project environment. Serve the generated build with `node scripts/serve-dist.mjs`.

Checkpoint documentation rule: whenever an approved feature is merged into `dev` and a new checkpoint is created, update `PROJECT_STATE.md`, `NEXT_HANDOFF.md`, `DEV_CHANGELOG.md`, and `KNOWN_ISSUES.md` as applicable before starting the next major development cycle.
