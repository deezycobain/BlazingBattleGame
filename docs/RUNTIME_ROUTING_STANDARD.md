# Blazing Battle Runtime Routing Standard

## Goal

Every playable unit should be wired through stable logical IDs instead of hard-coded file paths inside combat logic.

The routing chain is:

`unit data -> runtime map -> action registry + asset manifest -> renderer / gameplay executor`

Combat code should request logical resources such as:

`senku.animation.jutsu.revival_formula.cast`

or:

`senku.vfx.jutsu.revival_formula.impact`

It should not need to know the physical PNG folder or frame filenames.

## Canonical naming

Use lowercase snake_case for unit IDs, ability IDs, states, and folders.

Ability examples:

- `explosive_bomb`
- `revival_formula`
- `freeze_blast`

Logical resource IDs use dot-separated namespaces:

`<unit>.animation.<state-or-slot>[.<ability>][.<phase>]`

`<unit>.vfx.<slot>.<ability>.<phase>`

Examples:

- `senku.animation.idle`
- `senku.animation.basic_attack`
- `senku.animation.jutsu.revival_formula.cast`
- `senku.vfx.basic.explosive_bomb.projectile`
- `senku.vfx.basic.explosive_bomb.impact`
- `senku.vfx.jutsu.revival_formula.projectile`
- `senku.vfx.jutsu.revival_formula.impact`

## Canonical folder target

New assets should follow this shape:

```text
assets/characters/<unit>/
  data/
    unit.json
    runtime-map.json
  sprites/runtime/
    idle/
    recoil/
    basic_attack/
    jutsu/<ability_id>/cast/
    ultimate/<ability_id>/cast/
  vfx/
    basic/<ability_id>/projectile/
    basic/<ability_id>/impact/
    jutsu/<ability_id>/projectile/
    jutsu/<ability_id>/impact/
    ultimate/<ability_id>/projectile/
    ultimate/<ability_id>/impact/
```

## Migration rule

Do not rename a physical asset folder while the legacy runtime still directly references it.

During migration, `runtime/registry/asset-manifest.json` may map a canonical logical ID to a legacy physical folder. The manifest can also record `canonical_future_path` so folders can be moved later without changing gameplay or animation code.

This keeps migration non-breaking.

## Gameplay actions

Character data should not invent one-off action strings. Use reusable action IDs from `runtime/registry/action-registry.json`.

Examples:

- `damage_target`
- `heal_party_percent`
- `revive_ally`
- `apply_status`
- `buff_party`
- `debuff_target`

Character-specific behavior belongs in parameters, not new action names.

Example Revival Formula action:

```json
{
  "event": "on_impact",
  "action_id": "heal_party_percent",
  "parameters": {
    "percent_of_max_hp": 0.3
  }
}
```

The action registry defines that `heal_party_percent` targets living allies, includes the caster, ignores defeated units, cannot revive, and caps healing at max HP.

## Chakra is unit-core data

Chakra is a numeric per-unit resource, not a level-wide default and not a value invented by the battle scene.

Every `unit.json` must explicitly define:

```json
"combat": {
  "chakra_max": 8,
  "chakra_start": 0
}
```

`chakra_max` is the unit's authored capacity.

`chakra_start` is the authored amount that unit receives when a new battle-state instance is created. It may differ by character: `0`, `4`, `8`, or another valid integer from `0` through `chakra_max`.

The mutable current value does **not** belong in canonical unit data. Battle state must initialize it once:

`current_chakra = unit.combat.chakra_start`

After that, attacks, abilities, passives, costs, and gains modify the battle-state `current_chakra` only. Resetting/recreating a battle unit must read `chakra_start` again instead of using a hard-coded global value.

Dev/testing overrides are allowed to initialize playable units with `current_chakra = chakra_max`, but that override must happen at battle-state creation and must never rewrite the canonical unit values. Bosses/enemies keep their authored values unless a specific test explicitly overrides them.

Missing `chakra_max` or `chakra_start` is a schema error for schema version 3+; the runtime should not silently invent a value.

## Source of truth responsibilities

### `assets/characters/<unit>/data/unit.json`
Owns identity, stats, ability balance, authored `chakra_max`, authored `chakra_start`, chakra costs, targeting, and presentation values.

### `assets/characters/<unit>/data/runtime-map.json`
Connects ability IDs and unit states to reusable gameplay action IDs and logical animation/VFX resource IDs.

### `runtime/registry/action-registry.json`
Defines reusable gameplay operations and their targeting/rules.

### `runtime/registry/asset-manifest.json`
Resolves logical animation/VFX resource IDs to physical asset folders.

### Renderer / runtime resolver
Loads resources through the manifest and executes actions through the action registry. It should not contain character-specific PNG paths.

## Current schema-3 chakra migration

Active canonical units now explicitly own their starting chakra:

- Senku: max `8`, start `8`
- Crimson: max `8`, start `0`
- Sub-Zero: max `8`, start `0`
- Lebee: max `8`, start `0`
- Anubis: max `8`, start `0`

The zero values preserve the previous implicit/default start where no authored start value existed. They can now be deliberately balanced per unit without changing battle code.

## Senku migration checkpoint

Senku is the reference implementation.

His current `chemical_reaction` physical folders remain temporarily as legacy aliases because the existing runtime may still reference them directly. Their canonical logical identity is now `revival_formula`.

Once the runtime resolver is active and verified, the physical folders can be moved to the canonical `revival_formula` locations without changing Senku's ability map.

## Rule for all future units

A new unit is not considered fully integrated until it has:

1. `unit.json` using schema version 3 or newer with explicit `chakra_max` and `chakra_start`
2. `runtime-map.json`
3. logical animation/VFX entries in the asset manifest
4. only registered gameplay action IDs
5. no new character-specific hard-coded asset paths in the central battle runtime
6. battle state initialized from unit-core resource values rather than global chakra defaults
