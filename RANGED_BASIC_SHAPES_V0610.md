# Ranged Basic Attack Shapes — v0.6.10

Canonical rule:

- Normal/basic attack geometry comes from `combat.basic_shape`.
- Jutsu geometry comes from `combat.jutsu_shape`.
- These systems are intentionally separate.

## Lebee
Basic attack:
- type: rect
- width: 255 px
- height: 58 px
- forward offset: 116 px

## Senku
Basic attack:
- type: rect
- width: 255 px
- height: 58 px
- forward offset: 116 px

## Other current playable units
Crimson and Sub-Zero keep their canonical circular basic attacks.

## Visual language
- Normal/basic attack field: white
- Jutsu: cyan/blue
- Ultimate: red

## Link attacks
Link eligibility still uses the standard short-range normal proximity circle.
Ranged basic hitboxes do not artificially enlarge team-link distance.
