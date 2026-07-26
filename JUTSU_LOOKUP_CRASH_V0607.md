# Jutsu Lookup Crash Fix — v0.6.7

## Actual root cause
`isUltimateAction()` referenced `NAME_TO_ID`.

That identifier does not exist in the battle engine.

The canonical lookup table is:
`UNIT_NAME_TO_ID`

As soon as Jutsu targeting rendered, `isUltimateAction(activeUnit)` executed and threw a ReferenceError.
The render catch displayed `Recovering renderer…`, leaving only the map visible.

## Fix
`isUltimateAction()` now calls:

`canonicalUnit(unit.name)`

`canonicalUnit()` already resolves display names through `UNIT_NAME_TO_ID`, so no duplicate lookup table is needed.

The helper is also guarded with try/catch and safely returns false for any unknown unit.

Targeting rules remain unchanged:
- Normal: centered white circle
- Jutsu: move shape + cyan
- Ultimate: move shape + red
