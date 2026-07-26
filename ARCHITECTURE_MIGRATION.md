# Architecture Migration Status

## v0.5.28
The filesystem/data architecture is now canonical. The live `index.html` remains byte-for-byte identical to v0.5.27 for safety.

This is deliberate: we are not rewriting working battle code during the organization pass.

### Future migration order
1. Inventory reads generated unit registry.
2. Team selection reads battle-ready owned units.
3. Battle setup reads stats/ranges from registry.
4. Animation resolver reads per-action asset manifests.
5. Status/field-effect engine reads shared effect registry.

Each step should be a separate checkpoint with regression testing.
