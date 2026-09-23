# Known Issues

## Open

No confirmed open gameplay defect is recorded at this checkpoint.

## Deferred / Tech Debt

- `scripts/combat-stabilization-postprocess.mjs` rewrites generated `dist/index.html` to integrate battle readiness, attack timeline routing, fallback policy, configured attack behavior, and map geometry delegation. The behavior is working and approved, but it should eventually move into authoritative source/runtime modules instead of generated-output string replacement. Do not refactor it incidentally.
- The production shell is assembled through an ordered postprocessor chain. Any future shell migration must preserve or deliberately replace those integration contracts.

## Resolved Recently

- Cold-load abbreviation/name-circle artifacts and legacy Scorpion representation.
- First-attack frame readiness and attack timing desynchronization.
- Idle/attack apparent size mismatch and feet-anchor drift.
- Melee attacks failing to visually connect to target-relative contact positions.
- Generic Lantern Garden movement bounds.
