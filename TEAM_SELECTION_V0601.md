# Team Selection — v0.6.1

First feature branch from the v0.6.0 master checkpoint.

## Flow
Main Menu -> Inventory -> Edit Team

Three active team slots are now controlled by saved roster data instead of being hard-coded in battle.

## Current roster
- Crimson
- Lebee
- Sub-Zero

Because only three battle-ready fighters exist right now, the editor primarily controls team order. The implementation is already structured for additional owned fighters later.

## Battle authority
Both Level 1 and the Anubis boss battle call `buildPlayerPairs()` from the saved active team.

## Persistence
Team selection is stored in localStorage when supported. A safe in-memory/default fallback is used for local-file browser environments that restrict storage.

## Safety
The v0.6.0 master is unchanged.
No character stats, animations, hitboxes, Jutsu behavior, boss HP behavior, or enemy data were modified.
