# Blazing Battle v0.7 Runtime Baseline

## Branch contract

- `main` is the authoritative production source branch.
- Development/refactor work occurs on isolated branches and reaches `main` through a validated pull request.
- Historical `dev` / `dev-v2` branches are not authoritative when they differ from `main`.
- Production architecture milestones receive frozen checkpoint branches after validation.

## Canonical unit contract

Every battle unit is registered in `runtime/registry/unit-index.json` and owns gameplay data in `assets/characters/<unit>/data/unit.json`.

Every registered production unit also owns `assets/characters/<unit>/data/runtime-map.json`, mapping canonical ability IDs to animation resources, VFX resources, gameplay actions, and current execution handlers.

Required unit-core fields include:

- `stats.hp`
- `stats.attack`
- `stats.defense`
- `stats.speed`
- `combat.chakra_max`
- `combat.chakra_start`

There is no global/default starting chakra value in the canonical model. Each unit defines its own start value.

## Shared action/resource contract

Gameplay behavior is named through `runtime/registry/action-registry.json`. Runtime maps refer to reusable actions such as `damage_target`, `damage_targets`, `heal_party_percent`, and `reduce_target_gauge`.

After Pass 3 the action registry is schema v3. Every action referenced by a live production runtime map must declare an executable `runtime_handler`. Unused future action definitions must be explicit `declared_not_wired`; production maps may not reference them.

Runtime asset identities are named through `runtime/registry/asset-manifest.json`. Canonical resources must be either:

- a physical asset resource with `path`, or
- an explicit procedural resource with `type: "procedural"` and a renderer.

`runtime_shell` and `legacy_embedded` are rejected by validation.

`runtime/resource-resolver.js` resolves an ability into canonical unit data, animation/VFX resources, shared gameplay actions, cost, and presentation parameters.

## Animation / VFX runtime — Pass 2

Pass 2 introduced:

- `runtime/animation/frame-runtime.js` — image-frame loading/selection helpers.
- `runtime/rendering/vfx-renderer.js` — extracted VFX drawing logic.

Current VFX renderer ownership includes Lebee Star Blast projectile, Lebee Meteor fall/impact/finale/aftermath, and Sub-Zero Freeze Blast projectile.

The shell still creates the corresponding floater state and owns animation timing/callback orchestration; drawing is delegated to the VFX module.

Sub-Zero Freeze Blast cast frames live under `assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast/`. Sub-Zero recoil is procedural because no dedicated production recoil frame list exists.

## Combat runtime — Pass 3

Pass 3 introduces:

`runtime/combat/combat-runtime.js`

This module owns deterministic combat math/effect mutation for the current production paths:

- scaled Jutsu/basic damage math,
- linked normal-attack damage scaling,
- HP damage mutation and zero-floor clamping,
- resolved multi-target damage,
- combat chakra spending and capped gain,
- ability-driven gauge reduction,
- percent-max-HP party healing with max-HP cap and no defeated-unit revival,
- dispatch for executable shared action IDs.

The four action IDs currently referenced by production maps are executable:

- `damage_target`
- `damage_targets`
- `reduce_target_gauge`
- `heal_party_percent`

The following registry entries remain future declarations only:

- `revive_ally`
- `apply_status`
- `buff_party`
- `debuff_target`

Pass 3 deliberately does **not** move or redesign:

- target/hit geometry,
- turn-meter scheduling or readiness-gauge resets/increments,
- player/CPU sequencing,
- movement/positioning,
- combo sequencing,
- animation callback choreography,
- KO/victory/defeat transitions,
- boss AI.

Those remain shell/orchestration concerns. In particular, Anubis `boss_rotation` stays canonical but `declared_not_wired`.

No defense formula was invented during extraction. Current damage values retain their established production calculations.

## Build and validation safety

`npm run validate` runs:

1. `scripts/validate-runtime.mjs` for structural routing/boundary validation.
2. `scripts/validate-combat-runtime.mjs` for behavior-level combat smoke tests.

Structural validation rejects:

- missing/duplicate unit IDs,
- missing canonical unit files or runtime maps,
- invalid chakra core values,
- unknown resource/state/action IDs,
- referenced actions without executable handlers,
- references to `declared_not_wired` actions,
- missing physical asset paths or required frames,
- `runtime_shell` / `legacy_embedded`,
- missing Pass 2/3 runtime modules,
- loss of required shell-to-module delegation markers,
- return of extracted direct shell HP/chakra/Freeze-gauge mutations,
- production Ally Heal inline HP mutation,
- broken Senku Ally Heal canonical semantics,
- legacy `Revival Formula` canonical identifiers,
- recreation of the removed aggregate unit registry.

Combat smoke validation locks:

- scaled and linked damage rounding,
- damage floor at zero,
- multi-target damage,
- Senku's 30% max-HP heal (`54` at 180 max HP),
- max-HP heal cap,
- no revive of defeated units,
- chakra spend / insufficient spend / capped gain,
- Freeze Blast gauge floor,
- fail-closed unsupported action behavior.

`npm run build` then:

1. runs the validation suite,
2. builds `dist/`,
3. applies remaining defensive compatibility migration for tested shell paths,
4. synchronizes all registered canonical unit files,
5. externalizes remaining historical embedded data URIs,
6. validates Cloudflare's per-asset size limit,
7. adds branch/commit metadata,
8. applies renderer-safe presentation postprocessing.

The current routed baseline remains 5 units, 5 runtime maps, 32 resources (24 physical / 8 procedural), and zero `runtime_shell` resources.

## Production vs preview

Production (`main`) uses canonical unit stats and canonical `chakra_start` values.

Non-production Workers builds may use isolated testing overrides after the production bundle has been created:

- playable starting chakra: max,
- playable speed: 200,
- boss speed: 50.

These overrides never modify canonical unit files and never define production gameplay values.

## Known transitional debt

The large historical `index.html` remains the UI/orchestration/rendering shell. Pass 2 reduced it from about 49.9 MiB to 47.8 MiB by extracting identified animation/VFX bytes; Pass 3 primarily changes execution ownership rather than large asset bytes, so source size remains roughly 47.8 MiB.

Remaining debt includes:

- target/turn/combo orchestration in the shell,
- substantial inline UI/rendering logic,
- unrelated embedded artwork externalized by the build,
- defensive build-time compatibility patches,
- historical Senku `chemical_reaction` physical directory aliases.

## Promotion rule

A production refactor may move to `main` only when:

- `npm run validate` passes,
- `npm run build` passes on the exact pull-request merge ref,
- canonical unit/resource/action routing remains valid,
- intended gameplay behavior is unchanged unless explicitly part of the task,
- no production URL/configuration is unintentionally changed,
- project master state and architecture baseline are updated for the milestone.
