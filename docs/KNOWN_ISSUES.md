# Known Issues

## Open

No confirmed open gameplay defect is recorded at this checkpoint.

## Repository Hygiene

- Completed feature branches are not active development lines and should be deleted after their work is confirmed in `dev`. New `feature/*` branches should be exceptional and short-lived.
- The existing `experimental` branch is substantially divergent from current `dev`. Treat it as a legacy sandbox, not as a base for new development, until its unique history is intentionally reviewed. New experiments should branch from current `dev` using `experiment/<topic>`.
- Keep no more than one or two active experiment branches at once. Checkpoint refs are historical and do not count as active development branches.

## Deferred / Tech Debt

- Package-manager normalization is deferred. The repository does not currently track `pnpm-lock.yaml` or `pnpm-workspace.yaml`; locally generated package-manager files, `node_modules/`, and `dist/` remain excluded until this is addressed as a dedicated project.
- `scripts/combat-stabilization-postprocess.mjs` rewrites generated `dist/index.html` to integrate battle readiness, attack timeline routing, fallback policy, configured attack behavior, and map geometry delegation. The behavior is working and approved, but it should eventually move into authoritative source/runtime modules instead of generated-output string replacement. Do not refactor it incidentally.
- The production shell is assembled through an ordered postprocessor chain. Any future shell migration must preserve or deliberately replace those integration contracts.

## Resolved Recently

- Cold-load abbreviation/name-circle artifacts and legacy Scorpion representation.
- First-attack frame readiness and attack timing desynchronization.
- Idle/attack apparent size mismatch and feet-anchor drift.
- Melee attacks failing to visually connect to target-relative contact positions.
- Generic Lantern Garden movement bounds.
