# Player Visibility Fix — v0.6.5

## Root cause
The player body renderer contained a malformed alpha expression:

`ctx.globalAlpha=activePair&&!selected?.82:1;`

During targeting/Jutsu states this could resolve incorrectly and make player sprites transparent.

## Fix
Replaced with:

`ctx.globalAlpha=(activePair && !selected) ? .82 : 1;`

Additionally:
- player body draw pass now forces `source-over`
- shadow blur resets before body render
- `drawUnit()` guards against invalid/non-positive inherited alpha

## Unchanged
- normal attack = white circle
- Jutsu = move-specific shape + cyan
- Ultimate = move-specific shape + red
- stats, damage, animations, team selection, boss HUD
