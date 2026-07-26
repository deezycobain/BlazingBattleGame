# Data Embed Regression Guard — v0.5.35

## Bug fixed
v0.5.34 embedded only playable/boss character records into
`window.BLAZING_UNIT_DATA`.

The battle engine initializes Level 1 immediately and therefore also requires:
- onre
- gotoku
- yurei

Because those enemy definitions were absent, `fresh()` threw during startup
before the Level 1 and Boss menu event listeners were attached.

## Required embedded canonical IDs
- crimson
- subzero
- lebee
- anubis
- onre
- gotoku
- yurei

Future standalone builds must embed both:
`assets/characters/**/data/unit.json`
and
`assets/enemies/**/data/unit.json`.
