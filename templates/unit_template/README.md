# New Unit Template

Copy this entire folder to `assets/characters/<unit_id>/` for a playable/boss unit.

Do not wire the unit into the live game until `data/unit.json` passes validation and the required readiness flags are true.

Never replace an existing sprite mapping when adding another action. Additive mappings only: idle, basic attack, recoil, and each Jutsu stay independent.
