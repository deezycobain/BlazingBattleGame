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
- `runtime_shell` and `legacy_embedded` are not valid canonical resource types after Pass 2.

## Canonical unit and routing data

Primary per-character unit files live at:

`assets/characters/<unit>/data/unit.json`

The runtime unit list is defined by:

`runtime/registry/unit-index.json`

Every registered production unit also owns:

`assets/characters/<unit>/data/runtime-map.json`

Each runtime map connects canonical ability IDs to animation resources, VFX resources, shared gameplay actions, current execution handlers, and relevant presentation/timing metadata.

`runtime/registry/asset-manifest.json` is the canonical resource-identity registry. `runtime/registry/action-registry.json` is the canonical gameplay-action registry. `runtime/resource-resolver.js` joins canonical unit data, runtime maps, resources, actions, and presentation metadata.

The superseded aggregate file `assets/data/units_registry.json` has been removed. Do not recreate or consume a second aggregate gameplay registry.

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

Sub-Zero recoil was audited and found not to have a hidden frame list. Its current hit reaction is positional/procedural and is represented as such instead of inventing missing artwork.

### Pass 2 runtime modules

- `runtime/animation/frame-runtime.js` owns shared image-frame loading/selection helpers.
- `runtime/rendering/vfx-renderer.js` owns extracted Lebee Star Blast, Lebee Meteor, and Sub-Zero Freeze Blast projectile drawing logic.

The shell delegates these floater branches to the VFX module:

- `lebeeStarProjectile`
- `lebeeMeteor`
- `lebeeMeteorImpact`
- `lebeeMeteorFinale`
- `lebeeMeteorAftermath`
- `iceProjectile`

Pass 2 reduced source `index.html` from 52,333,570 bytes to 50,086,243 bytes (about 49.9 MiB to 47.8 MiB). The build still externalizes unrelated historical embedded assets and produces an approximately 0.3 MiB deployed `index.html`.

## Combat runtime extraction — Pass 3 complete

Pass 3 moves deterministic combat math and combat-effect mutations out of the historical shell into:

`runtime/combat/combat-runtime.js`

The combat runtime now owns:

- canonical scaled-damage calculation,
- linked normal-attack damage scaling,
- HP damage application with zero-floor clamping,
- multi-target damage mutation,
- chakra spending and capped chakra gain,
- ability-driven gauge reduction,
- percent-max-HP healing with max-HP cap and defeated-unit skip,
- dispatch for the currently executable shared action IDs.

The shell still owns battle orchestration: target geometry, turn-meter scheduling, animation callbacks, KO choreography, combo sequencing, victory/defeat transitions, and CPU positioning/turn flow. Pass 3 intentionally does not move or redesign those systems.

### Shared action execution contract

`runtime/registry/action-registry.json` is schema v3 after Pass 3.

The four action IDs currently referenced by production runtime maps are executable through `BlazingCombatRuntime`:

- `damage_target`
- `damage_targets`
- `reduce_target_gauge`
- `heal_party_percent`

Future/shared action definitions that are not currently used by a production runtime map are explicitly marked `declared_not_wired` rather than receiving invented behavior:

- `revive_ally`
- `apply_status`
- `buff_party`
- `debuff_target`

Validation fails if a production runtime map references an action without an executable runtime handler.

### Pass 3 shell boundary

The historical shell now delegates the current direct player/CPU damage mutations, linked/basic damage calculation, Jutsu damage calculation, combat chakra spend/gain, and Freeze Blast's `-35` gauge effect to `runtime/combat/combat-runtime.js`.

Turn-readiness gauge increments/resets remain shell-owned scheduler state. Pass 3 does not reinterpret them as gameplay status effects.

No defense formula was introduced. The current production damage paths continue using their established attack/multiplier values; canonical `defense` remains data for systems that explicitly consume it later.

### Pass 3 behavior validation

`npm run validate` now runs both structural routing validation and `scripts/validate-combat-runtime.mjs` smoke tests. The combat smoke test locks the currently extracted behavior, including:

- damage zero-floor clamping,
- multi-target damage,
- linked-damage rounding,
- Senku Ally Heal at 30% max HP (`54` HP at Senku's `180` max HP),
- heal cap at max HP,
- no revival of defeated units,
- chakra spend / insufficient-chakra no-op / capped gain,
- Freeze Blast gauge reduction floored at zero,
- fail-closed behavior for unsupported future action IDs.

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

`animateSenkuBomb()` still applies the hit on projectile arrival; the HP mutation now routes through the Pass 3 combat runtime. Targeting, arrival timing, recoil, and presentation behavior are unchanged.

### Jutsu — Ally Heal

Approved behavior remains:

- Cost: 4 chakra
- Delivery: airburst party heal
- Heals all living allies, including Senku
- Heal amount: 30% max HP
- Does not revive defeated allies
- Planted throw / bottle airburst presentation retained

The production compatibility build still installs the approved Ally Heal cast/presentation path, but the actual 30% HP mutation now executes through `heal_party_percent` in `runtime/combat/combat-runtime.js` using canonical `heal_percent` metadata.

Some approved Senku runtime PNGs still physically live under historical `chemical_reaction` directory names. These are storage aliases only; their logical resource IDs are canonical.

## Known Anubis routing gap

Anubis `boss_rotation` exists in canonical unit data, but production CPU behavior still executes current normal-attack routing only. Its runtime map remains `declared_not_wired`. Pass 3 does not invent or activate boss Jutsu behavior.

## Remaining `index.html` debt

`index.html` is still a large historical UI/combat/rendering shell. Passes 2 and 3 deliberately avoid a broad rewrite.

Now externalized/delegated:

- identified Lebee/Sub-Zero animation/VFX assets,
- six VFX drawing branches,
- shared frame loading,
- deterministic damage/heal/chakra/combat-gauge mutation primitives.

Still shell-owned:

- target/hit geometry and movement positioning,
- player/CPU turn sequencing and readiness gauges,
- combo orchestration,
- animation callback choreography,
- KO/victory/defeat transitions,
- substantial UI/rendering logic,
- unrelated historical embedded artwork externalized during build,
- defensive build-time compatibility patches for tested legacy-shell paths.

Future modularization should continue one subsystem at a time with validation before deleting compatibility code.

## Current immediate development checkpoint

At this checkpoint:

1. `main` is the production authority and v0.7.0 remains the promoted gameplay baseline.
2. All five production units have canonical `unit.json` and `runtime-map.json` routing.
3. The aggregate unit registry remains removed.
4. Canonical runtime contains 32 routed resources: 24 physical, 8 procedural, 0 `runtime_shell`.
5. Pass 2 animation/VFX extraction remains validated.
6. Pass 3 combat mutations route through `runtime/combat/combat-runtime.js`.
7. Four action IDs referenced by production maps are explicitly executable; unused future actions are `declared_not_wired`.
8. Senku bomb timing/targeting and Ally Heal semantics remain unchanged; Ally Heal's HP mutation now uses the combat runtime.
9. Anubis `boss_rotation` remains explicitly declared but not wired.
10. `npm run validate` includes behavior-level combat smoke tests and `npm run build` validates the full runtime before Cloudflare output.
11. The historical shell remains transitional debt and should continue shrinking in controlled passes.

## New-chat handoff rule

A new development chat should begin with:

> Open `deezycobain/BlazingBattleGame` on `main`. Read `docs/PROJECT_MASTER_STATE.md` first, then inspect only the files/functions related to the requested task. Treat GitHub as authoritative and do not reconstruct the game from conversation memory.

Old GameDev chats are historical reference only after this checkpoint and are not required to continue development, provided needed artwork/assets have been committed or otherwise safely saved.
