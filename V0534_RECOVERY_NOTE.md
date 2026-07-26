# v0.5.34 Recovery

v0.5.33 had a JavaScript syntax error in the battle script caused by an over-broad sprite-mapping replacement. Because that script also owns menu navigation, Level 1 and Anubis buttons could not initialize.

v0.5.34 was rebuilt from the last syntax-valid v0.5.32 project and then the desired Lebee Jutsu polish was reapplied with unit-scoped replacements. All inline JavaScript blocks pass `node --check`.
