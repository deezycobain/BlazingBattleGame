# Blazing Battle v0.7 Runtime Baseline

## Branch contract

- `main` is the authoritative production source branch.
- Development/refactor work should occur on isolated branches and reach `main` through a validated pull request.
- Historical `dev` / `dev-v2` branches are not authoritative when they differ from `main`.
- A production architecture milestone should receive a frozen checkpoint branch after validation.

## Canonical unit contract

Every battle unit is registered in `runtime/registry/unit-index.json` and owns its gameplay data in `assets/characters/<unit>/data/unit.json`.

Every registered production unit also owns `assets/characters/<unit>/data/runtime-map.json`, which maps canonical ability IDs to animation resources, VFX resources, gameplay actions, and current execution handlers.

Required unit-core fields include:

- `stats.hp`
- `stats.attack`
- `stats.defense`
- `stats.speed`
- `combat.chakra_max`
- `combat.chakra_start`

There is no global/default starting chakra value in the canonical model. Each unit defines its own start value.

## Shared action/resource contract

Gameplay behavior is named through `runtime/registry/action-registry.json` rather than duplicated as canonical data per unit. Runtime maps refer to reusable actions such as `damage_target`, `damage_targets`, `heal_party_percent`, and `reduce_target_gauge`.

Runtime asset identities are named through `runtime/registry/asset-manifest.json`. Unit-specific directory names are implementation paths, not gameplay action names.

After Pass 2, canonical resources must be one of:

- a physical asset resource with `path`, or
- an explicit procedural resource with `type: "procedural"` and a renderer.

`runtime_shell` and `legacy_embedded` are rejected by validation.

`runtime/resource-resolver.js` resolves an ability into:

1. canonical unit ability data,
2. animation resource,
3. VFX resources,
4. shared gameplay actions,
5. presentation parameters.

## Animation / VFX runtime

Pass 2 introduced two reusable runtime modules:

- `runtime/animation/frame-runtime.js` — image-frame loading/selection helpers.
- `runtime/rendering/vfx-renderer.js` — extracted VFX drawing logic.

Current VFX renderer ownership includes:

- Lebee Star Blast projectile,
- Lebee Meteor falling frames,
- Lebee Meteor impacts,
- Lebee Meteor finale,
- Lebee Meteor aftermath,
- Sub-Zero Freeze Blast projectile.

The historical shell still creates the corresponding floater state objects and owns gameplay timing/callbacks; drawing those floaters is delegated to the VFX module. This keeps Pass 2 presentation-only and preserves combat behavior.

Sub-Zero Freeze Blast body-cast frames now live under `assets/characters/subzero/sprites/runtime/jutsu/freeze_blast/cast/`. Sub-Zero recoil remains procedural because no dedicated production recoil frame list exists.

## Build safety

`npm run build` runs runtime validation before producing a Cloudflare bundle.

The validator rejects:

- missing/duplicate unit IDs,
- missing canonical unit files or runtime maps,
- missing or invalid chakra core values,
- unknown resource/state/action IDs,
- missing physical asset paths,
- insufficient required runtime frame counts,
- `runtime_shell` or `legacy_embedded` resources,
- missing Pass 2 animation/VFX runtime modules,
- loss of the required shell-to-module delegation markers,
- re-embedding of the migrated Lebee/Sub-Zero resources,
- broken Senku Ally Heal semantics,
- legacy `Revival Formula` identifiers,
- recreation of the removed aggregate unit registry.

Cloudflare deployment then:

1. builds `dist/`,
2. applies remaining defensive compatibility migration for tested legacy-shell paths,
3. synchronizes all registered canonical unit files into deployed runtime data,
4. externalizes remaining historical embedded data URIs,
5. validates Cloudflare's per-asset size limit,
6. adds branch/commit build metadata,
7. applies renderer-safe presentation postprocessing.

The Pass 2 validated baseline contains 5 units, 5 runtime maps, 32 routed resources, 24 physical resources, 8 procedural resources, and zero `runtime_shell` resources.

## Production vs preview

Production (`main`) uses canonical unit stats and canonical `chakra_start` values.

Non-production Workers builds may use isolated testing overrides after the production bundle has been created:

- playable starting chakra: max,
- playable speed: 200,
- boss speed: 50.

These overrides never modify canonical unit files and never define production gameplay values.

## Known transitional debt

The large historical `index.html` remains the UI/combat/rendering shell while systems are moved outward. Pass 2 reduced the source shell from about 49.9 MiB to 47.8 MiB by extracting the identified Lebee/Sub-Zero animation/VFX bytes, while the build still produces an approximately 0.3 MiB deployed `index.html` after externalizing unrelated historical embedded assets.

Remaining debt includes:

- combat/action execution in the shell,
- substantial inline UI/rendering logic,
- unrelated embedded artwork that the build still externalizes,
- defensive build-time compatibility patches,
- historical Senku `chemical_reaction` physical directory names used as storage aliases.

Anubis `boss_rotation` is canonical but deliberately `declared_not_wired`; production boss AI still uses current normal-attack routing.

## Promotion rule

A production refactor may move to `main` only when:

- `npm run validate` passes,
- `npm run build` passes on the pull-request merge ref,
- canonical unit/resource routing remains valid,
- intended gameplay behavior is unchanged unless explicitly part of the task,
- no production URL/configuration is unintentionally changed,
- the project master state is updated for architecture milestones.
