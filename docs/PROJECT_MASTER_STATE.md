# Blazing Battle — Authoritative Project Master State

**Checkpoint date:** 2026-07-28  
**Production line:** `main`  
**Promoted game version:** `v0.7.0`  
**Repository:** `deezycobain/BlazingBattleGame`

## Source-of-truth rule

GitHub `main` is the authoritative master build. Conversation history, old uploaded builds, screenshots, and prior chat summaries are never authoritative when they conflict with the repository.

For future development sessions:

1. Inspect current `main` before changing gameplay.
2. Read this file first for project orientation.
3. Read only the specific runtime functions and unit files relevant to the requested change; do not load the full `index.html` unless absolutely necessary.
4. Preserve tested gameplay behavior unless the requested change explicitly alters it.
5. Update this file whenever a major production checkpoint or architecture rule changes.

## Asset / animation standard

- Character artwork: polished 2D cel-shaded anime style; no pixel art unless explicitly requested.
- Character body animation frames and VFX are separate asset systems.
- Runtime character/VFX files belong under organized character asset folders.
- Preserve source sheets/art separately from runtime frames.
- Gameplay stats, attack properties, ranges, chakra behavior, and presentation metadata belong in canonical unit data where migrated.
- Do not bake explosions, projectiles, fire, healing flashes, or other VFX into character body sprites unless explicitly required.
- Runtime animation should map individual frames from organized asset folders.
- After Pass 2, `runtime_shell` is no longer a valid canonical resource type. A production resource must resolve to a physical path or be explicitly procedural.

## Canonical unit data

Primary per-character unit files live at:

`assets/characters/<unit>/data/unit.json`

The runtime unit list is defined by:

`runtime/registry/unit-index.json`

The superseded aggregate file `assets/data/units_registry.json` has been removed. Do not recreate or consume a second aggregate gameplay registry; canonical unit data must come from the registered per-character files.

## Runtime routing contract — Pass 1 complete

Every production unit registered in `runtime/registry/unit-index.json` owns:

`assets/characters/<unit>/data/runtime-map.json`

Each runtime map connects canonical ability IDs to animation resources, VFX resources, shared gameplay actions, current execution handlers, and relevant presentation/timing metadata.

`runtime/registry/asset-manifest.json` is the canonical resource-identity registry. `runtime/registry/action-registry.json` is the canonical shared gameplay-action registry. `runtime/resource-resolver.js` joins canonical unit data, runtime maps, resources, actions, and presentation metadata.

## Animation / VFX extraction — Pass 2 complete

Pass 2 removed the four explicit Pass 1 shell-resource dependencies without changing intended combat behavior.

### Extracted physical resources

- Lebee Star Blast projectile → `assets/characters/lebee/vfx/basic/star_blast/projectile/`
- Lebee Meteor falling frames → `assets/characters/lebee/vfx/jutsu/meteor/meteor/`
- Lebee Meteor impact frames → `assets/characters/lebee/vfx/jutsu/meteor/impact/`
- Lebee Meteor finale → `assets/characters/lebee/vfx/jutsu/meteor/finale/`
- Lebee Meteor aftermath → `assets/characters/lebee/vfx/jutsu/meteor/aftermath/`
- Sub-Zero Freeze Blast cast frames → `assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast/`

The extracted files were copied byte-for-byte from the historical shell before shell references were replaced.

Sub-Zero recoil was audited and found not to have a hidden `HIT_SPRITES` frame list. Its current hit reaction is positional/procedural and is therefore correctly represented as a procedural resource instead of inventing a missing animation directory.

### Runtime modules introduced

- `runtime/animation/frame-runtime.js` owns shared image-frame loading/selection helpers.
- `runtime/rendering/vfx-renderer.js` owns the extracted Lebee Star Blast, Lebee Meteor, and Sub-Zero Freeze Blast projectile drawing logic.

The historical shell now delegates these floater branches to the VFX module:

- `lebeeStarProjectile`
- `lebeeMeteor`
- `lebeeMeteorImpact`
- `lebeeMeteorFinale`
- `lebeeMeteorAftermath`
- `iceProjectile`

Pass 2 reduced source `index.html` from 52,333,570 bytes to 50,086,243 bytes (about 49.9 MiB to 47.8 MiB) by removing the migrated embedded animation/VFX bytes. The production build still externalizes unrelated historical embedded assets and produces an approximately 0.3 MiB deployed `index.html`.

### Pass 2 validation contract

Current runtime validation requires:

- all 5 registered production units and runtime maps,
- asset manifest schema v5+,
- every mapped resource/action/state ID to resolve,
- physical asset paths to exist,
- required runtime frame counts to be present,
- `runtime/animation/frame-runtime.js` and `runtime/rendering/vfx-renderer.js` to exist and be loaded by the shell,
- the migrated Lebee/Sub-Zero declarations to use physical asset paths,
- VFX renderer delegation markers to remain present,
- zero `runtime_shell` resources,
- zero `legacy_embedded` resources,
- no recreated aggregate unit registry.

Validated Pass 2 baseline:

- 5 registered units
- 5 runtime maps
- 32 routed resources
- 24 physical resources
- 8 procedural resources
- 0 `runtime_shell` resources

### Known Anubis routing gap

Anubis `boss_rotation` exists in canonical unit data, but production `cpuTurn()` still executes normal attack routing only. The Anubis runtime map marks `boss_rotation` as `declared_not_wired`. Pass 2 does not invent or activate boss Jutsu behavior.

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
- Clean projectile frames: `assets/characters/senku/vfx/bomb/projectile_clean/`
- Current production impact: `assets/characters/senku/vfx/bomb/static_impact/explosion.png`
- Impact timing, size, and ground anchor remain canonical presentation metadata applied during the production build.

The previously declared six-frame Small Explosion sequence is not part of production because those files were absent from `main`. A multi-frame impact may be introduced later only when approved files are committed and validation passes.

`animateSenkuBomb()` still applies damage on projectile arrival. Pass 2 did not change Senku targeting, damage timing, or recoil behavior.

### Jutsu — Ally Heal

Approved behavior remains:

- Cost: 4 chakra
- Delivery: airburst party heal
- Heals all living allies, including Senku
- Heal amount: 30% max HP
- Does not revive defeated allies
- Planted throw / bottle airburst presentation retained

Some approved Senku runtime PNGs still physically live under historical `chemical_reaction` directory names. These are storage aliases only; their logical resource IDs are canonical.

## Remaining `index.html` debt

`index.html` is still a large historical UI/combat/rendering shell. Pass 2 deliberately did not attempt a broad rewrite.

What improved:

- identified shell-owned animation/VFX bytes were extracted,
- six VFX rendering branches now live in a dedicated runtime renderer,
- shared frame loading now lives in a runtime animation module,
- canonical validation prevents those migrated resources from silently returning to shell ownership.

What remains for later passes:

- combat/action execution still largely lives in the shell,
- substantial UI/rendering logic remains inline,
- unrelated historical embedded assets still exist and are externalized by the Cloudflare build,
- build-time compatibility patches remain for tested gameplay paths such as Senku.

Future modularization should continue by subsystem, with each extracted path validated before deleting its old shell implementation.

## Current immediate development checkpoint

At this checkpoint:

1. `main` remains the production authority.
2. v0.7.0 remains the promoted gameplay baseline.
3. All five production units have canonical `unit.json` and `runtime-map.json` routing.
4. The aggregate unit registry remains removed.
5. The four Pass 1 `runtime_shell` targets have been resolved; canonical runtime now contains zero `runtime_shell` resources.
6. Lebee Star Blast/Meteor and Sub-Zero Freeze Blast presentation assets have organized physical locations.
7. Six migrated VFX branches delegate to `runtime/rendering/vfx-renderer.js`.
8. Shared frame loading delegates to `runtime/animation/frame-runtime.js`.
9. Senku bomb targeting/damage timing and Ally Heal semantics remain unchanged.
10. Anubis `boss_rotation` remains explicitly declared but not wired.
11. `npm run build` validates the Pass 2 contract before Cloudflare output.
12. The large historical shell remains transitional debt and should continue shrinking in controlled passes.

## New-chat handoff rule

A new development chat should begin with:

> Open `deezycobain/BlazingBattleGame` on `main`. Read `docs/PROJECT_MASTER_STATE.md` first, then inspect only the files/functions related to the requested task. Treat GitHub as authoritative and do not reconstruct the game from conversation memory.

Old GameDev chats are historical reference only after this checkpoint and are not required to continue development, provided needed artwork/assets have been committed or otherwise safely saved.
