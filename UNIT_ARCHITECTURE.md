# Blazing Battle Unit Architecture Standard v1

**Locked starting with v0.5.28.** v0.5.27 gameplay is preserved unchanged in this checkpoint.

## Core rule
Every unit is self-contained. A new character must never require copying assets into another character's folder or replacing another action mapping.

## Character folder
`assets/characters/<unit_id>/`

- `art/` — clean full artwork for View Art
- `cards/` — inventory/detail/summon card art
- `portraits/` — turn meter and compact portrait assets
- `icons/` — element/ability/unit icons owned by this unit
- `sprites/source/` — untouched original sheets/source art
- `sprites/runtime/idle/`
- `sprites/runtime/walk/`
- `sprites/runtime/attack/basic/`
- `sprites/runtime/recoil/`
- `sprites/runtime/jutsu/<jutsu_id>/`
- `vfx/attacks/<attack_id>/` — separate VFX, never baked into body sprites unless source art demands it
- `vfx/jutsu/<jutsu_id>/`
- `audio/sfx/` and `audio/voice/`
- `data/unit.json` — authoritative unit metadata

## Shared effects
Shared effects do not belong inside a character folder:
- `assets/effects/status/<status_id>/` — Freeze, Burn, Poison, Curse, Stun, buffs/debuffs
- `assets/effects/field/<field_id>/` — frozen ground, sand zones, hazards, portals
- `assets/effects/attacks/` — genuinely shared attack VFX

A unit's `unit.json` references shared effects by ID.

## Maps
- `assets/maps/level/<map_id>/` (future maps should use one folder per map)
- `assets/maps/boss/<map_id>/`
Map-specific field art stays with that map; reusable field/status effects stay under `assets/effects/`.

## Runtime safety
1. `unit.json` is source-of-truth for future character edits.
2. Standalone mobile builds embed generated data/assets at build time; they do not fetch JSON during play.
3. Adding a Jutsu must EXTEND sprite/action mappings. It must never replace Basic Attack, Idle, Recoil, or another Jutsu.
4. Source art is immutable. Runtime crops/normalized frames go in `sprites/runtime/`.
5. Collection-ready and battle-ready are separate states.
6. A unit does not enter battle until required battle assets/data are complete.
7. Existing live combat values remain authoritative during the migration period until each subsystem is explicitly switched to registry data.

## Battle-ready minimum
Required before a playable unit is activated:
- idle sprite
- basic attack animation/pose
- Jutsu animation + VFX when applicable
- basic and Jutsu hitbox/range data
- HP / ATK / SPD / chakra data
- consistent foot anchor and render scale
- collection art/card if the unit is obtainable

Recoil is strongly preferred and becomes mandatory before production release.

## Current readiness
- Crimson: collection + battle ready
- Sub-Zero: collection + battle ready; reference pipeline
- Lebee: collection ready only
- Anubis: boss battle ready
- Onre / Gotoku / Yurei: active enemy placeholders retained


## v0.5.30 DATA AUTHORITY RULE
All unit balance/gameplay properties now originate in that unit's `data/unit.json`. Do not hardcode independent character stats into battle or inventory modules. Stage-specific overrides are allowed only for encounter setup (spawn, variant HP/ATK, starting chakra test flags).
