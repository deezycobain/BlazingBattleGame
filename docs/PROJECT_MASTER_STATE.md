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
3. Inspect only the runtime functions and unit files relevant to the requested change; do not load the full historical `index.html` unless absolutely necessary.
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

Primary per-character unit files:

`assets/characters/<unit>/data/unit.json`

Runtime unit list:

`runtime/registry/unit-index.json`

Every registered production unit also owns:

`assets/characters/<unit>/data/runtime-map.json`

Each runtime map connects canonical ability IDs to animation resources, VFX resources, shared gameplay actions, execution handlers, and presentation/timing metadata.

`runtime/registry/asset-manifest.json` is the canonical resource-identity registry. `runtime/registry/action-registry.json` is the canonical gameplay-action registry. `runtime/resource-resolver.js` joins canonical unit data, runtime maps, resources, actions, and presentation metadata.

The superseded aggregate file `assets/data/units_registry.json` has been removed. Do not recreate or consume a second aggregate gameplay registry.

## Pass 1 — canonical routing complete

All five production units have canonical `unit.json` and `runtime-map.json` routing. Runtime maps cover every canonical ability and state currently declared by the registered production units.

Anubis `boss_rotation` remains intentionally `declared_not_wired`; production CPU behavior still uses the current normal-attack route. Do not activate a boss Jutsu implicitly during refactors.

## Pass 2 — animation / VFX extraction complete

Pass 2 removed the explicit shell-resource dependencies found during Pass 1 without changing intended combat behavior.

Extracted physical resources include:

- Lebee Star Blast projectile → `assets/characters/lebee/vfx/basic/star_blast/projectile/`
- Lebee Meteor falling frames → `assets/characters/lebee/vfx/jutsu/meteor/meteor/`
- Lebee Meteor impact frames → `assets/characters/lebee/vfx/jutsu/meteor/impact/`
- Lebee Meteor finale → `assets/characters/lebee/vfx/jutsu/meteor/finale/`
- Lebee Meteor aftermath → `assets/characters/lebee/vfx/jutsu/meteor/aftermath/`
- Sub-Zero Freeze Blast cast frames → `assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast/`

The extracted files were copied byte-for-byte from the historical shell before references were replaced. Sub-Zero recoil was audited and found to have no dedicated production frame list, so it remains correctly represented as procedural positional recoil rather than invented artwork.

Pass 2 runtime modules:

- `runtime/animation/frame-runtime.js` — shared frame loading/selection.
- `runtime/rendering/vfx-renderer.js` — Lebee Star Blast/Meteor and Sub-Zero Freeze Blast projectile drawing.

Canonical runtime currently contains 32 routed resources: 24 physical, 8 procedural, 0 `runtime_shell`.

## Pass 3 — combat runtime extraction complete

Deterministic combat math and combat-effect mutation live in:

`runtime/combat/combat-runtime.js`

It owns:

- canonical scaled-damage calculation,
- linked normal-attack damage scaling,
- HP damage application with zero-floor clamping,
- multi-target damage mutation,
- chakra spending and capped chakra gain,
- ability-driven gauge reduction,
- percent-max-HP healing with max-HP cap and defeated-unit skip,
- dispatch for the currently executable shared action IDs.

`runtime/registry/action-registry.json` is schema v3. The four action IDs currently referenced by production maps are executable:

- `damage_target`
- `damage_targets`
- `reduce_target_gauge`
- `heal_party_percent`

Unused future action definitions remain `declared_not_wired` rather than receiving invented behavior:

- `revive_ally`
- `apply_status`
- `buff_party`
- `debuff_target`

Validation fails if a production runtime map references an action without an executable handler.

The shell still owns orchestration such as target geometry, readiness/turn scheduling, movement, combo sequencing, animation callbacks, KO choreography, victory/defeat state transitions, and CPU positioning/turn flow. No defense formula was introduced by Pass 3.

## Pass 4 — stable battlefield / battle UI rendering extraction complete

Pass 4 deliberately extracts only rendering seams with clean deterministic boundaries. It does **not** attempt a full scene or character-body renderer rewrite.

Permanent modules:

- `runtime/rendering/battlefield-renderer.js`
- `runtime/rendering/battle-ui-renderer.js`

`battlefield-renderer.js` now owns the currently delegated canvas primitives:

- battlefield map crop/zoom/fallback drawing,
- normal/Jutsu attack-range shape drawing,
- overhead link icon drawing,
- active player HP/chakra resource HUD drawing,
- drag-return / move-cancel cue drawing,
- victory overlay drawing.

`battle-ui-renderer.js` now owns DOM application for:

- tactical ticker contents/classes,
- boss HP HUD state/width/ARIA label,
- phase/log text,
- Basic/Jutsu/Swap selected and disabled states,
- Jutsu label,
- player status-card HTML application.

The historical shell keeps compatibility wrapper function names so existing combat/animation callers do not change their sequencing behavior. The shell still derives the battle view model; the UI renderer applies that model to DOM elements.

### Pass 4 intentionally retained shell seams

The following remain shell-owned because they are coupled to scene assembly or animation state and were not safe to extract in the same pass:

- `drawUnit()` and character-body sprite selection/transforms,
- attack/recoil/KO body animation state,
- frame-loop canvas reset and Jutsu-dim lifecycle,
- live enemy target-bubble drawing,
- Senku Ally Heal target-highlight drawing,
- inline enemy HP-bar scene drawing,
- target/hit geometry,
- world-layer ordering and scene assembly.

These are explicit future modularization targets, not hidden dependencies. Pass 4 validation checks that the retained seams still exist so the checkpoint cannot falsely claim full renderer extraction.

### Pass 4 validation contract

`npm run validate` now runs:

1. canonical runtime/routing validation,
2. combat-runtime behavior smoke tests,
3. Pass 4 rendering-boundary structural validation,
4. rendering-runtime behavior smoke tests.

Rendering smoke tests lock:

- map draw and transparent fallback,
- attack-range geometry draw parameters,
- player HP width and eight-chakra-pip HUD behavior,
- move-return cancel cue rendering,
- victory fallback rendering,
- tactical ticker classes/text,
- boss HP width/active state,
- action-button selected/disabled state and Jutsu label/status application.

The Cloudflare build remains responsible for externalizing unrelated historical embedded assets and produces an approximately 0.3 MiB deployed `index.html`.

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
- Canonical basic shape: circle, radius 140
- Selector: nearest target inside shape
- Cast duration: 560 ms
- Flight duration: 620 ms
- Arc height: 86 px
- Projectile rotation: enabled
- Canonical projectile scale metadata: 2.0
- Clean projectile frames: `assets/characters/senku/vfx/bomb/projectile_clean/`
- Current production impact: `assets/characters/senku/vfx/bomb/static_impact/explosion.png`

`animateSenkuBomb()` still applies the hit on projectile arrival; HP mutation routes through the Pass 3 combat runtime. Targeting, arrival timing, recoil, and presentation behavior are unchanged.

### Jutsu — Ally Heal

Approved behavior remains:

- Cost: 4 chakra
- Delivery: airburst party heal
- Heals all living allies, including Senku
- Heal amount: 30% max HP
- Does not revive defeated allies
- Planted throw / bottle airburst presentation retained

The production compatibility build still installs the approved Ally Heal cast/presentation path, while the actual HP mutation executes through `heal_party_percent` in `runtime/combat/combat-runtime.js` using canonical `heal_percent` metadata.

Some approved Senku runtime PNGs still physically live under historical `chemical_reaction` directory names. These are storage aliases only; their logical resource IDs are canonical.

## Remaining `index.html` debt

`index.html` remains a large historical shell, but its responsibilities are now more explicit.

Already externalized/delegated:

- canonical unit/resource/action routing,
- identified Lebee/Sub-Zero physical animation/VFX assets,
- shared frame loading,
- six extracted VFX drawing branches,
- deterministic combat math/effect mutation,
- stable battlefield range/map/resource-HUD/victory primitives,
- battle DOM UI application.

Still shell-owned:

- character-body renderer / animation-state integration,
- scene-local target/heal/enemy-HP overlays,
- frame-loop dim/reset lifecycle,
- target/hit geometry and movement positioning,
- player/CPU turn sequencing and readiness gauges,
- combo orchestration,
- animation callback choreography,
- KO/victory/defeat orchestration,
- unrelated historical embedded artwork externalized during build,
- defensive build-time compatibility patches for tested legacy-shell paths.

Future modularization must continue one bounded subsystem at a time with validation before deleting compatibility code.

## Current immediate development checkpoint

At this checkpoint:

1. `main` is the production authority and v0.7.0 remains the promoted gameplay baseline.
2. All five production units have canonical `unit.json` and `runtime-map.json` routing.
3. Canonical runtime contains 32 routed resources: 24 physical, 8 procedural, 0 `runtime_shell`.
4. Pass 2 animation/VFX extraction remains validated.
5. Pass 3 combat mutations route through `runtime/combat/combat-runtime.js` and four production action IDs are executable.
6. Pass 4 stable battlefield/HUD wrappers route through `runtime/rendering/battlefield-renderer.js`.
7. Pass 4 battle DOM application routes through `runtime/rendering/battle-ui-renderer.js`.
8. Character-body and scene-local target overlays remain intentionally shell-owned and explicitly validated as retained seams.
9. Senku bomb timing/targeting and Ally Heal semantics remain unchanged.
10. Anubis `boss_rotation` remains explicitly declared but not wired.
11. `npm run validate` includes combat and rendering behavior smoke tests before the full Cloudflare build.
12. The historical shell remains transitional debt and should continue shrinking only in controlled passes.

## New-chat handoff rule

A new development chat should begin with:

> Open `deezycobain/BlazingBattleGame` on `main`. Read `docs/PROJECT_MASTER_STATE.md` first, then inspect only the files/functions related to the requested task. Treat GitHub as authoritative and do not reconstruct the game from conversation memory.

Old GameDev chats are historical reference only after this checkpoint and are not required to continue development, provided needed artwork/assets have been committed or otherwise safely saved.
