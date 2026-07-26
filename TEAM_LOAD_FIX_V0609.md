# Team Load Fix — v0.6.9

## Root cause
Senku was included in:
- Inventory
- Edit Team
- ACTIVE_PLAYABLE_UNITS

but was missing from `BATTLE_ROSTER`.

Selecting Senku therefore saved correctly, but `makeRosterUnit('Senku')`
threw `Unknown battle unit: Senku` when Level 1 or Boss Battle tried to build the team.

## Fix
- Added `senku` to BATTLE_ROSTER.
- Added playable-roster registration validation.
- Added safe fallback protection inside buildPlayerPairs().
- Team save confirmation now prints the actual saved three names.

Battle startup already rebuilds from `getActiveTeam()` every time, so no additional
battle-state reset changes were necessary.
