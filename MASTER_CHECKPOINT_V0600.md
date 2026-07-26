# BLAZING BATTLE — MASTER CHECKPOINT v0.6.0

**Checkpoint date:** 2026-07-24  
**Status:** CANONICAL MASTER / MAJOR BACKUP POINT  
**Baseline:** v0.5.47 Character Asset Routing Fix

## Rule going forward

All future Blazing Battle builds should patch forward from **v0.6.0**.
Do not rebuild from an older branch unless intentionally performing a rollback.

Canonical standalone:
`Blazing_Battle_v0600_MASTER_STANDALONE.html`

Canonical project folder:
`blazing_battle_v0600_MASTER_project/`

SHA-256:
`6bae16c7477fc445a8663a542b7b52a272d6c976fa849abd89fbc51d76cbe360`

## Locked-in systems at this checkpoint

- Three playable characters currently integrated: Crimson, Sub-Zero, Lebee.
- Character/unit architecture and canonical unit-data system.
- Per-character stats/archetype data structure.
- Organized character asset folders and runtime sprite structure.
- Strict per-character animation routing introduced in v0.5.47.
- Crimson Jutsu no longer resolves Lebee Meteor/spin assets.
- Lebee idle clipping correction retained.
- Lebee Meteor Jutsu current approved animation/timing retained.
- Meteor end flash behavior retained.
- Sub-Zero corrected in-game scale retained.
- Boss battle HP bar/current boss HUD retained.
- Inventory, level, and boss-level navigation state retained from the working branch.
- Existing validation and registry tools retained.

## Asset isolation standard

Character body animation assets must resolve only through that character's own mapping:

- Crimson -> Crimson assets
- Sub-Zero -> Sub-Zero assets
- Lebee -> Lebee assets

No cross-character fallback should be introduced.

## Production rule

MASTER CHARACTER -> ONE ACTION -> INDIVIDUAL FRAMES -> NORMALIZE -> GAME

Battle sprites, cards, reference sheets, maps, effects, and UI assets remain separated by purpose.

## Rollback policy

This v0.6.0 package is the new clean recovery point.
Future experimental or feature builds should increment forward from v0.6.0 and preserve this package unchanged.
