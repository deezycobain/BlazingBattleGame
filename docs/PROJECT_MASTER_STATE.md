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
- Runtime character frames live in organized character asset folders when extracted from the historical shell.
- Preserve source sheets/art separately from runtime frames.
- Gameplay stats, attack properties, ranges, chakra behavior, and presentation metadata belong in canonical unit data where migrated.
- Do not bake explosions, projectiles, fire, healing flashes, or other VFX into character body sprites unless explicitly required.
- Runtime animation should map individual frames from organized asset folders.
- A `runtime_shell` resource is an explicit transitional extraction target, not a second source of truth.

## Canonical unit data

Primary per-character unit files live at:

`assets/characters/<unit>/data/unit.json`

The runtime unit list is defined by:

`runtime/registry/unit-index.json`

The superseded aggregate file `assets/data/units_registry.json` has been removed. Do not recreate or consume a second aggregate gameplay registry; canonical unit data must come from the registered per-character files.

## Runtime routing contract — Pass 1 complete

Every production unit registered in `runtime/registry/unit-index.json` now owns:

`assets/characters/<unit>/data/runtime-map.json`

Each runtime map connects the unit's canonical ability IDs to:

1. an animation resource ID,
2. zero or more VFX resource IDs,
3. shared gameplay action IDs,
4. the current runtime handler while the historical shell still owns execution,
5. presentation/timing metadata where relevant.

`runtime/registry/asset-manifest.json` is the canonical resource-identity registry. `runtime/registry/action-registry.json` is the canonical shared gameplay-action registry. `runtime/resource-resolver.js` is the resolution layer joining canonical unit data, runtime maps, resources, actions, and presentation metadata.

Runtime validation now requires all five production units to have a schema-v3+ runtime map, requires every mapped animation/VFX/state/action ID to resolve, rejects `legacy_embedded`, and requires shell-managed resources to be declared explicitly as `runtime_shell` with a renderer and migration note.

The Pass 1 validation baseline is:

- 5 registered units
- 5 runtime maps
- 29 routed resource IDs
- 4 explicit `runtime_shell` extraction targets

Current explicit shell extraction targets are:

- Sub-Zero Freeze Blast cast body frames
- Sub-Zero recoil presentation
- Lebee Star Blast projectile artwork
- Lebee Meteor VFX artwork

These are intentionally recorded rather than hidden so Pass 2 can extract them without changing gameplay behavior.

### Known Anubis routing gap

Anubis `boss_rotation` exists in canonical unit data, but the current production `cpuTurn()` executes normal attack routing only. The Anubis runtime map therefore marks `boss_rotation` as `declared_not_wired`. Pass 1 does not invent or activate boss Jutsu behavior.

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
- Current production impact asset: `assets/characters/senku/vfx/bomb/static_impact/explosion.png`
- Impact timing, size, and ground anchor are canonical presentation metadata and are applied to the legacy-shell renderer during the production build.

The previously declared six-frame Small Explosion sequence was removed from the production canonical data because those files were not present on `main`. A multi-frame impact may be introduced later only when the approved frames are committed to the active development line and validation passes.

The runtime `animateSenkuBomb()` reads canonical cast/flight/arc timing, applies damage on projectile arrival, and keeps the impact floater alive for the same canonical impact duration used to complete the attack.

### Jutsu — Ally Heal

Current approved behavior:

- Cost: 4 chakra
- Delivery: airburst party heal
- Heals all living allies, including Senku
- Heal amount: 30% max HP
- Does not revive dead allies
- Planted throw / bottle airburst presentation retained

The logical ability is `ally_heal`. Some approved runtime PNGs still physically live under historical `chemical_reaction` storage directories; canonical metadata points to those real files until a deliberate asset-directory rename is performed.

## Runtime architecture notes

The current game still has substantial runtime logic in `index.html`. Because this file is very large, future inspections should search for exact functions/identifiers and read narrow ranges rather than fetching the entire file.

Pass 1 does not move execution code out of `index.html`; it gives every current production unit/resource/action a canonical routing identity first. That routing layer is the prerequisite for safely extracting animation/VFX execution in Pass 2.

Useful Senku runtime identifiers include:

- `animateSenkuBomb`
- `senkuBombProjectile`
- `senkuExplosion`
- `canonicalUnit('senku')`
- `SENKU_BOMB_FRAMES`
- `SENKU_BASIC_STATIC_EXPLOSION`

Build-time migration remains intentionally defensive: required anchors cause the build to fail if the historical shell changes unexpectedly rather than silently shipping mixed legacy/canonical behavior.

## Current immediate development checkpoint

At this checkpoint:

1. `main` is the production authority.
2. v0.7.0 is the promoted gameplay baseline.
3. The stale aggregate unit registry is removed.
4. All five production units have canonical per-character `unit.json` and `runtime-map.json` routing.
5. The central asset manifest and action registry resolve 29 production resource identities across all five units.
6. Four remaining shell-owned asset/presentation resources are explicitly labeled extraction targets instead of being hidden legacy dependencies.
7. Anubis `boss_rotation` is explicitly documented as declared but not wired; production boss behavior was not changed by Pass 1.
8. Senku bomb targeting, impact timing, and Ally Heal behavior remain unchanged and validated.
9. Runtime validation rejects missing runtime maps, unresolved mapped resources/actions/states, phantom Senku assets, `legacy_embedded` resources, and recreation of the aggregate registry.
10. Build validation runs for pushes to `main` / `dev-v2` and for pull requests targeting `main`.

## New-chat handoff rule

A new development chat should begin with:

> Open `deezycobain/BlazingBattleGame` on `main`. Read `docs/PROJECT_MASTER_STATE.md` first, then inspect only the files/functions related to the requested task. Treat GitHub as authoritative and do not reconstruct the game from conversation memory.

Old GameDev chats are historical reference only after this checkpoint and are not required to continue development, provided needed artwork/assets have been committed or otherwise safely saved.
