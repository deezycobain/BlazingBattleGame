# Blazing Battle v0.7 Runtime Baseline

## Branch contract

- `main` is the production source branch deployed to the production Workers URL.
- `dev-v2` is the active development branch deployed only as a Cloudflare preview version.
- Production changes are promoted from `dev-v2` only after the preview build is tested.

## Canonical unit contract

Every battle unit is registered in `runtime/registry/unit-index.json` and owns its gameplay data in `assets/characters/<unit>/data/unit.json`.

Required unit-core fields include:

- `stats.hp`
- `stats.attack`
- `stats.defense`
- `stats.speed`
- `combat.chakra_max`
- `combat.chakra_start`

There is no global/default starting chakra value in the canonical model. Each unit defines its own start value.

## Shared action/resource contract

Gameplay behavior is named through `runtime/registry/action-registry.json` rather than duplicated per unit. Unit ability maps refer to reusable actions such as `damage_target` and `heal_party_percent`.

Runtime asset identities are named through `runtime/registry/asset-manifest.json`. Unit-specific directory names are implementation paths, not gameplay action names.

`runtime/resource-resolver.js` resolves an ability into:

1. canonical unit ability data,
2. animation resource,
3. VFX resources,
4. shared gameplay actions,
5. presentation parameters.

## Build safety

`npm run build` runs runtime validation before producing a Cloudflare bundle.

The validator rejects:

- missing/duplicate unit IDs,
- missing canonical unit files,
- missing or invalid chakra core values,
- unknown resource IDs,
- unknown shared action IDs,
- broken Senku Ally Heal semantics,
- legacy `Revival Formula` identifiers in canonical runtime data.

Cloudflare deployment then:

1. builds `dist/`,
2. applies the transitional legacy-index migration,
3. synchronizes **all** registered unit files into the deployed runtime,
4. externalizes embedded base64 assets,
5. validates Cloudflare's per-asset size limit,
6. adds branch/commit build metadata.

## Production vs preview

Production (`main`) uses canonical unit stats and canonical `chakra_start` values.

Non-production Workers builds use isolated testing overrides only after the production bundle has been created:

- playable starting chakra: max,
- playable speed: 200,
- boss speed: 50.

These overrides never modify canonical unit files and never run on `main`.

## Known transitional debt

The large historical `index.html` is still the visual/combat shell while systems are moved outward. The build intentionally fails when a required migration anchor changes rather than silently shipping mixed old/new behavior.

Senku's Ally Heal has canonical ability/resource/action IDs, but some physical sprite/VFX directories still retain historical `chemical_reaction` folder names. They are treated as storage aliases only and should be physically renamed after the approved throw frames are normalized as ordinary PNG runtime assets.

## Promotion rule

A `dev-v2` revision may move to `main` only when:

- `npm run validate` passes,
- Cloudflare preview deploy passes,
- game boots on desktop and mobile,
- Senku starts with expected preview chakra,
- Ally Heal routes only when executed,
- Ally Heal uses the approved bottle airburst sequence,
- boss/player preview speed separation is correct,
- no production URL is changed during testing.
