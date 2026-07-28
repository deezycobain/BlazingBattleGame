# Blazing Battle v0.7 Runtime Baseline

## Branch contract

- `main` is the authoritative production source branch.
- Development/refactor work occurs on isolated branches and reaches `main` only through a validated pull request.
- Historical `dev` / `dev-v2` branches are not authoritative when they differ from `main`.
- Production architecture milestones receive frozen checkpoint branches after validation.

## Canonical unit contract

Every battle unit is registered in `runtime/registry/unit-index.json` and owns gameplay data in `assets/characters/<unit>/data/unit.json`.

Every registered production unit also owns `assets/characters/<unit>/data/runtime-map.json`, mapping canonical ability IDs to animation resources, VFX resources, gameplay actions, and current execution handlers.

Required unit-core fields include `stats.hp`, `stats.attack`, `stats.defense`, `stats.speed`, `combat.chakra_max`, and `combat.chakra_start`. There is no global canonical starting-chakra default.

## Shared action/resource contract

Gameplay behavior is named through `runtime/registry/action-registry.json`. After Pass 3 it is schema v3: every action referenced by a live production runtime map must declare an executable `runtime_handler`; unused future actions are explicit `declared_not_wired`.

Runtime assets are identified through `runtime/registry/asset-manifest.json`. Canonical resources must be either a physical resource with `path` or an explicit procedural resource with a renderer. `runtime_shell` and `legacy_embedded` are rejected.

`runtime/resource-resolver.js` resolves an ability into canonical unit data, animation/VFX resources, shared gameplay actions, cost, and presentation parameters.

## Pass 2 — animation / VFX runtime

- `runtime/animation/frame-runtime.js` owns shared image-frame loading/selection.
- `runtime/rendering/vfx-renderer.js` owns extracted Lebee Star Blast/Meteor and Sub-Zero Freeze Blast projectile drawing.
- Physical Pass 2 assets live in organized per-character directories.
- The shell still creates floater state and owns callback/timing orchestration.

Current resource baseline: 5 units, 5 runtime maps, 32 resources — 24 physical, 8 procedural, 0 `runtime_shell`.

## Pass 3 — combat runtime

`runtime/combat/combat-runtime.js` owns deterministic combat math/effect mutation for current production paths:

- scaled damage math,
- linked normal-attack scaling,
- HP damage mutation and zero-floor clamping,
- multi-target damage,
- combat chakra spend/gain,
- ability-driven gauge reduction,
- percent-max-HP living-party healing,
- dispatch for executable shared action IDs.

Production maps currently use four executable actions: `damage_target`, `damage_targets`, `reduce_target_gauge`, and `heal_party_percent`.

`revive_ally`, `apply_status`, `buff_party`, and `debuff_target` remain future `declared_not_wired` definitions.

Pass 3 does not own target geometry, readiness scheduling, movement, combo sequencing, animation callbacks, KO/victory orchestration, or boss AI. No defense formula was invented.

## Pass 4 — rendering boundaries

Pass 4 adds:

- `runtime/rendering/battlefield-renderer.js`
- `runtime/rendering/battle-ui-renderer.js`

### Battlefield renderer ownership

The shell now delegates these stable canvas primitives to `BlazingBattlefieldRenderer`:

- map crop/zoom/fallback drawing,
- normal/Jutsu range-shape drawing,
- overhead link icon,
- player HP/chakra resource HUD,
- move-return / cancel cue,
- victory overlay.

Existing shell function names remain as compatibility wrappers so combat and animation sequencing do not change.

### Battle UI renderer ownership

`BlazingBattleUiRenderer` applies the shell-derived view model to DOM state for:

- tactical ticker,
- boss HP HUD,
- phase/log text,
- Basic/Jutsu/Swap selected/disabled state,
- Jutsu label,
- status-card HTML.

### Explicitly retained rendering seams

Pass 4 does **not** claim full scene extraction. The following remain shell-owned:

- `drawUnit()` and character-body sprite/animation integration,
- frame-loop reset and Jutsu-dim lifecycle,
- target-bubble drawing,
- Ally Heal target highlight,
- inline enemy HP scene bar,
- world-layer ordering/scene assembly,
- target/hit geometry.

They remain visible and validated as retained seams so future passes can extract them intentionally.

## Build and validation safety

`npm run validate` runs:

1. `scripts/validate-runtime.mjs` — canonical routing/resource/action boundaries.
2. `scripts/validate-combat-runtime.mjs` — combat behavior smoke tests.
3. `scripts/validate-pass4-rendering.mjs` — Pass 4 structural delegation boundary.
4. `scripts/validate-rendering-runtime.mjs` — deterministic rendering/UI smoke tests.

The Pass 4 smoke suite locks field draw/fallback, attack-range shape parameters, player HP/chakra HUD behavior, move-cancel cue, victory fallback, tactical ticker state, boss HP state, and battle action-control state.

`npm run build` then builds `dist/`, applies remaining tested compatibility migration, synchronizes registered canonical unit data, externalizes unrelated historical data URIs, checks Cloudflare asset limits, adds build metadata, and applies renderer-safe presentation postprocessing.

## Production vs preview

Production (`main`) uses canonical unit stats and `chakra_start` values.

Non-production Workers builds may apply isolated test overrides after the production bundle has been created: playable starting chakra=max, playable speed=200, boss speed=50. These overrides never define canonical production values.

## Known transitional debt

The historical `index.html` remains roughly 47.8 MiB because most remaining size is unrelated embedded artwork; the Cloudflare build still emits an approximately 0.3 MiB deployed `index.html` after externalization.

Remaining architecture debt includes:

- character-body rendering/animation integration,
- scene-local target/heal/enemy-HP overlays,
- frame-loop dim/reset lifecycle,
- target/turn/combo orchestration,
- KO/victory/defeat orchestration,
- unrelated embedded artwork,
- defensive compatibility patches,
- historical Senku `chemical_reaction` storage-directory aliases.

Anubis `boss_rotation` remains canonical but `declared_not_wired`; production boss AI still uses the current normal-attack route.

## Promotion rule

A production refactor may move to `main` only when:

- `npm run validate` passes,
- `npm run build` passes on the exact pull-request merge ref,
- canonical unit/resource/action routing remains valid,
- intended gameplay behavior is unchanged unless explicitly part of the task,
- production URL/configuration is not unintentionally changed,
- project master state and architecture baseline are updated for the milestone.
