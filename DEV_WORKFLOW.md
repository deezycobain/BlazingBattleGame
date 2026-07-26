# Blazing Battle Development Workflow

`main` is the approved stable build. `dev` is the active integration and testing branch.

## Default plan of attack

1. Treat `main` as authoritative and stable. Do not experiment directly on it.
2. Read the current authoritative source from GitHub before starting a new development checkpoint.
3. Do heavy work locally first whenever practical: unpack ZIPs, inspect batches of assets, clean transparency, resize/crop, prepare frame sequences, and assemble code changes as a complete unit.
4. Use GitHub primarily as version control and checkpoint storage, not as the step-by-step workspace.
5. One requested feature or polish pass should normally become one complete `dev` checkpoint rather than many tiny remote edits.
6. Keep asset preparation separate from gameplay integration. Preserve original/source sheets separately from cleaned runtime assets.
7. Keep character body animation, projectiles, impacts/explosions, other VFX, damage events, and stats/data separated in the architecture.
8. Maintain a predictable live dev preview/test path when practical so testing is refresh-based rather than creating a new test page for every small adjustment.
9. Before asking for approval, verify the complete `dev` change against `main` and report only when there is a meaningful testable checkpoint.
10. After user approval, merge/promote the tested checkpoint to `main`; otherwise continue adjusting only on `dev`.

## Working style

- Prefer fewer, larger completed actions over stop-and-report after every tiny step.
- Batch binary assets and related code changes together where possible.
- Avoid repeated repository reads when the current authoritative file has already been fetched and has not changed.
- Preserve rollback points and never overwrite approved gameplay casually.

## Current Senku checkpoint

- approved target: basic bomb projectile at 2x visual size
- integrate the uploaded 6-frame Small Explosion VFX
- keep throw body animation, projectile, explosion, recoil/damage timing, and canonical unit data separate
