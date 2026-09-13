# Blazing Battle — Sanctuary / First Bloom Asset Pack v1

This ZIP is the curated **test integration pack** for the Sanctuary side mode. Rejected mockups and broad concept sheets are intentionally excluded from the production folders. A few approved source sheets are preserved under `_sources/` for traceability.

## Folder layout
- `ui/home-button/` — Sanctuary main-menu entry
- `bonsai/pot/` — base pot
- `bonsai/roots/` — 4 root / soil / moss states
- `bonsai/trunks/` — 6 growth stages
- `bonsai/canopy/green/` — 4 standard canopy stages
- `bonsai/canopy/jade/` — 4 jade canopy stages
- `bonsai/blossoms/` — pink, blue, orange, red, ice, fire; 3 stages each
- `bonsai/fx/` — themed FX variants split for runtime use
- `sand/base/` — clean untouched sand bed
- `sand/patterns/` — Still Water, Ripple Ring, Flowing River, Spiral Wind
- `sand/motifs/` — Blazing Spiral, Akatsuki Cloud, Petal Drift, bonus Lotus + ninja variants
- `sand/name-templates/` — Straight, Arc, Seal dynamic name layouts
- `sand/accents/` — Petal Scatter, Moss Edge
- `sand/stones/` — 3 core layouts + 3 extra variants

## Runtime layer order
1. Sanctuary environment / temporary test background
2. Sand bed base
3. Base rake pattern
4. Signature motif
5. Sand accent
6. Stone layout
7. Pot / root base
8. Trunk stage
9. Canopy stage
10. Blossom overlay
11. Ambient FX
12. HUD / interaction UI

## Prototype notes
- This pack is for the first playable Sanctuary test. Some generative assets are not yet pixel-perfectly aligned to a universal anchor. Use consistent CSS / engine containers (`object-fit: contain`, fixed anchor points) during the first test.
- The 6 trunk filenames are placed in a prototype growth order based on visual complexity. We can reorder after seeing the animation in-engine.
- `sand/name-templates/` are framing/groove templates only. The actual player name should be rendered dynamically.
- Keep these files isolated from rejected mockups to avoid erroneous asset loads.

## First test target
Seedling → spend resources → visible root/trunk/canopy growth → select sand rake pattern → select motif → place stones → bloom → award Harmony Seal → persist state.
