# Blazing Battle Data Authority — v0.5.30

## Rule
`data/unit.json` is the canonical source of truth for every unit.

Battle code and Inventory must not define independent HP, ATK, DEF, SPD, attack range, Jutsu range, chakra capacity, Jutsu cost, or damage multipliers. The standalone HTML embeds a generated snapshot of these JSON definitions only because local mobile browsers cannot reliably `fetch()` sibling JSON files.

## Separation of concerns
- Unit JSON: identity, archetype, base stats, combat shapes, ability definitions, render scale, asset paths.
- Stage configuration: spawn positions, enemy variants, starting chakra for special test builds, boss placement/AI.
- Assets: animation/VFX/art only; they do not carry balance numbers.

## Balance status
All v0.5.30 values are provisional archetype-based numbers. They are expected to change during balance passes.

## Current archetypes
- Crimson: Assassin / Melee DPS
- Sub-Zero: Ranged Controller
- Lebee: Caster / AoE
- Anubis: Boss / Tank Controller
- Ghosts: Skirmisher / Striker
