# Jutsu Render Scope Fix — v0.6.6

## Root cause
`isUltimateAction()` was created as a local constant inside the ground targeting
field block in `render()`.

Later in the same frame, the enemy target-feedback pass called
`isUltimateAction(activePlayer)` outside that local block.

When Jutsu targeting overlapped an enemy this caused:

`ReferenceError: isUltimateAction is not defined`

The render catch handler then displayed:

`Recovering renderer…`

and the battlefield appeared empty.

## Fix
- moved `isUltimateAction(unit)` to permanent battle-module scope
- removed the local render-only duplicate
- reset alpha/composite/shadow state at the start of each frame

Targeting standard remains:
- Normal = centered white circle
- Jutsu = move-specific cyan/blue
- Ultimate = move-specific red
