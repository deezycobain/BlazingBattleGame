# Known Issues

## Open

No confirmed open gameplay defect is recorded at this checkpoint.

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
