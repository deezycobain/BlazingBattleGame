# Character Asset Routing Fix — v0.5.47

## Root cause
Crimson's `ATTACK_SPRITES.Crimson.special` had been overwritten with six frames
from Lebee's Meteor Jutsu cast/spin sequence.

## Correction
Crimson special now uses only:

`assets/characters/crimson/sprites/runtime/jutsu/cast.png`

## Protection
The renderer now resolves body animation frames through explicit character maps:

- Crimson -> Crimson assets only
- Sub-Zero -> Sub-Zero assets only
- Lebee -> Lebee assets only

This prevents another unit's animation array from being silently used as a fallback.

No stats, damage, hitboxes, meteor animation, boss HUD, or Sub-Zero scaling were changed.
