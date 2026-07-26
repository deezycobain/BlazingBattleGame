# Targeting System — v0.6.4

Corrected targeting architecture.

## Normal attack
- always a centered circle around the active unit
- white field
- white target bubble
- Link remains green when active

## Jutsu
- uses its own ability-defined shape
- cyan/blue glow

## Ultimate
- uses its own ability-defined shape
- red glow

Current ability tiers:
- Lebee Meteor Jutsu: Ultimate
- Sub-Zero Freeze Blast: Jutsu
- Crimson current Jutsu: Jutsu

## Enemy visibility bug
Fixed an invalid enemy alpha expression that could set canvas alpha to `undefined`
when an enemy entered the hitbox. Enemy body sprites now remain fully visible.

Target bubble rendering is also wrapped in its own save/restore + source-over state.

No damage, stats, animations, team selection, or boss AI were changed.
