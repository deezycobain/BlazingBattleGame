# Blazing Battle — Project State

`main` is the authoritative master build. Do not rebuild from conversation memory, old uploads, or rollback bundles.

## Development standard
- Canonical unit data lives in each unit's `data/unit.json`; `assets/data/units_registry.json` is generated from those files.
- Runtime animation uses individually exported frames from organized character folders.
- Character/body animation and VFX remain separate.
- Stats, ranges, ability properties, render scale, and asset mappings belong to canonical unit data.
- Source sprite/VFX sheets are preserved separately from runtime assets.

## Senku — current repository state
- Basic attack: `Explosive Bomb`, ranged projectile.
- Cleaned bomb projectile frames are under `assets/characters/senku/vfx/bomb/projectile_clean/` and are referenced by the basic attack presentation data.
- Basic attack body animation is a separate 4-frame sequence under `sprites/runtime/attack/basic/`.
- Current presentation data uses `vfx/bomb/static_impact/explosion.png` as the live static impact asset.
- Senku's animation/VFX registry also still contains a separate 5-frame `bomb/explosion` sequence. A 6-frame Small Explosion sequence is not currently mapped in canonical Senku unit data.

## Rule for future work
Before changing gameplay, animation, VFX, stats, or assets, inspect the current `main` branch implementation first and make changes against that master only.
