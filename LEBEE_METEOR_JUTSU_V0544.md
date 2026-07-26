# Lebee Meteor Jutsu — v0.5.44

## Root cause fixed
v0.5.43 created `meteorScreenFlash` after the game scripts had already executed.
The cached DOM reference was therefore `null`, so the fullscreen overlay never rendered.

## Fix
- fullscreen overlay now exists before battle JavaScript initializes
- flash helpers also resolve the element lazily as a regression safeguard

## Final timing
- second-to-last meteor -> yellow fullscreen flash
- yellow lead: 240 ms
- final meteor -> white fullscreen flash
- white hold: 220 ms
- white fade: 780 ms
- next turn begins only after fade completes
