# Blazing Battle Character Sprite / Atlas Contract v1

This mandatory contract applies to newly created character sprite assets. Functional existing packs are legacy until intentionally rebuilt.

## Character animation standard

- Six frames exactly: indices `0`–`5`.
- Atlas layout: three columns by two rows; read left-to-right across the top row, then bottom row.
- Equal square cells; transparent background; no text, names, environments, unrelated objects, or clipping.
- Bottom-center/feet anchoring, a stable visual baseline, and consistent apparent combat scale across states.
- Standard packages: idle, basic attack, and special/Jutsu character motion when applicable. VFX should normally be separate.

For six-frame standard melee: frame 0 ready, 1 wind-up, 2 extension, 3 primary contact, 4 follow-through, 5 recovery. Frame 3 is the default hit frame unless metadata explicitly overrides it. Idle has no hit frame. Ranged and special timing may differ through metadata.

## Metadata and validation

Contract-v1 is opted into by `assets/characters/<unit>/data/atlas-contract-v1.json`. It must declare `contract_version: "blazing-battle-character-atlas-v1"`, unit ID, and animation entries. Each entry requires animation type, `frame_count: 6`, `rows: 2`, `columns: 3`, square frame dimensions, `frame_ms`, loop behavior, `anchor_x: "center"`, `anchor_y: "feet"`, positive `combat_visual_height`, and a local atlas file. Basic attacks also require hit frame `0`–`5`.

The canonical repository schema remains authoritative; this contract metadata is the explicit opt-in marker for new atlas validation.

## Preferred pipeline

Character reference → six transparent individual frames → frame validation → deterministic atlas packing → metadata generation → repository validator → game integration.

Prefer files such as `unit_idle_f00.png` through `unit_idle_f05.png`, then deterministic packing to `unit_idle_atlas.png` and metadata. Do not rely on generative output to construct the final atlas grid when avoidable.

## Legacy policy

New units must use Contract v1. Materially rebuilt units should migrate. Existing legacy packs remain supported until intentional migration; exceptions require an explicit engine or design reason.
