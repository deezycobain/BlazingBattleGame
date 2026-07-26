BLAZING BATTLE v0.5.28 — UNIT ARCHITECTURE CHECKPOINT

PLAYABLE HTML: index.html
Gameplay code is unchanged from v0.5.27.

Architecture docs:
- UNIT_ARCHITECTURE.md
- ARCHITECTURE_MIGRATION.md
- assets/data/unit.schema.json
- assets/data/units_registry.json
- templates/unit_template/
- tools/validate_units.py
- tools/rebuild_unit_registry.py

Run: python tools/validate_units.py

Do not manually wire new character files into random locations. Copy templates/unit_template, fill unit.json, add assets to that unit folder, validate, then migrate the unit into runtime in a dedicated checkpoint.
