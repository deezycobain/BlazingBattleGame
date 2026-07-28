# Blazing Battle — Authoritative Project Master State

**Checkpoint date:** 2026-07-28  
**Production line:** `main`  
**Promoted game version:** `v0.7.0`  
**Repository:** `deezycobain/BlazingBattleGame`

## Source-of-truth rule

GitHub `main` is the authoritative master build. Conversation history, old uploaded builds, screenshots, and prior chat summaries are never authoritative when they conflict with the repository.

For future development sessions:

1. Inspect the current `main` branch before changing gameplay.
2. Read this file first for project orientation.
3. Read only the specific runtime functions and unit files relevant to the requested change; do not load the full `index.html` unless absolutely necessary.
4. Preserve tested gameplay behavior unless the requested change explicitly alters it.
5. Update this file whenever a major production checkpoint or architecture rule changes.

## Asset / animation standard

- Character artwork: polished 2D cel-shaded anime style; no pixel art unless explicitly requested.
- Character body animation frames and VFX are separate asset systems.
- Runtime character frames live in organized character asset folders.
- Preserve source sheets/art separately from runtime frames.
- Gameplay stats, attack properties, ranges, chakra behavior, and presentation metadata belong in canonical unit data where migrated.
- Do not bake explosions, projectiles, fire, healing flashes, or other VFX into character body sprites unless explicitly required.
- Runtime animation should map individual frames from organized asset folders.

## Canonical unit data

Primary per-character unit files live at:

`assets/characters/<unit>/data/unit.json`

These per-character files are the preferred canonical source when they conflict with older aggregate data.

### Known registry issue

`assets/data/units_registry.json` currently contains older data for at least Senku and is behind the current per-character `unit.json`. Do not use the stale Senku registry entry as the authority until the registry is intentionally regenerated/synchronized.

## Current Senku production state

Canonical file: `assets/characters/senku/data/unit.json`

- HP: 180
- Attack: 38
- Defense: 28
- Speed: 200
- Chakra: 8 / 8 start
- Render scale: 1.3

### Basic — Explosive Bomb

- Delivery: ranged projectile
- Target mode: single
- Range presentation: circular bomb range
- Canonical basic shape: circle, radius 140
- Selector: nearest target inside shape
- Cast duration: 560 ms
- Flight duration: 620 ms
- Arc height: 86 px
- Projectile rotation: enabled
- Canonical projectile scale metadata: 2.0
- Clean projectile frames live under `assets/characters/senku/vfx/bomb/projectile_clean/`
- Six-frame Small Explosion assets are declared under `assets/characters/senku/vfx/bomb/small_explosion_6f/`

### Current runtime mismatch to resolve

The canonical Senku unit data declares the six-frame Small Explosion sequence, but the current `index.html` runtime renderer still contains the older `SENKU_BASIC_STATIC_EXPLOSION` / static-hold-fade impact path for `senkuExplosion`.

Therefore the next Senku basic-attack integration task is to wire the actual six-frame explosion VFX into the runtime without changing damage timing or target resolution.

The runtime `animateSenkuBomb()` already reads canonical Senku presentation metadata for cast/flight/arc timing and applies damage on projectile arrival.

### Jutsu — Ally Heal

Current approved behavior:

- Cost: 4 chakra
- Delivery: airburst party heal
- Heals all living allies, including Senku
- Heal amount: 30% max HP
- Does not revive dead allies
- Planted throw / bottle airburst presentation retained

## Runtime architecture notes

The current game still has substantial runtime logic in `index.html`. Because this file is very large, future inspections should search for exact functions/identifiers and read narrow ranges rather than fetching the entire file.

Useful Senku runtime identifiers include:

- `animateSenkuBomb`
- `senkuBombProjectile`
- `senkuExplosion`
- `canonicalUnit('senku')`
- `SENKU_BOMB_FRAMES`
- `SENKU_BASIC_STATIC_EXPLOSION`

## Current immediate development checkpoint

At this checkpoint:

1. `main` is the production authority.
2. v0.7.0 is the promoted baseline.
3. Senku bomb targeting is stable: circular range, exactly one nearest target in range.
4. Senku bomb projectile uses cleaned assets and canonical presentation metadata.
5. Senku Ally Heal is stable and should not be disturbed while editing the basic attack.
6. The six-frame Small Explosion is present in canonical asset/data structure but still needs final runtime rendering integration in place of the older static explosion path.
7. The stale aggregate unit registry should eventually be synchronized with canonical per-character unit files.

## New-chat handoff rule

A new development chat should begin with:

> Open `deezycobain/BlazingBattleGame` on `main`. Read `docs/PROJECT_MASTER_STATE.md` first, then inspect only the files/functions related to the requested task. Treat GitHub as authoritative and do not reconstruct the game from conversation memory.

Old GameDev chats are historical reference only after this checkpoint and are not required to continue development, provided needed artwork/assets have been committed or otherwise safely saved.