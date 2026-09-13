# Sanctuary / First Bloom layered asset contract

Sanctuary must never be delivered as one flattened scene. Runtime progression swaps independent layers so the tree and karesansui visibly evolve while preserving the same composition.

## Coordinate contract

- Master working canvas: 2048 x 2048 transparent PNG for isolated scene layers unless a layer is explicitly full-background.
- All six bonsai growth assets use the exact same canvas size, pot baseline, pot center, viewing angle, and trunk root anchor.
- Transparent padding is intentional. Do not crop stages independently.
- Garden overlays use the same scene coordinate system so they can be stacked without hand-tuning each stage.
- Art should remain crisp at 4K source quality. Runtime may generate smaller optimized copies later.

## Required final assets

### Bonsai growth

`bonsai/first-bloom-stage-01-seedling.png`
`bonsai/first-bloom-stage-02-new-growth.png`
`bonsai/first-bloom-stage-03-young-bonsai.png`
`bonsai/first-bloom-stage-04-shaped-bonsai.png`
`bonsai/first-bloom-stage-05-mature-bonsai.png`
`bonsai/first-bloom-stage-06-first-bloom.png`

Stages 04-06 eventually support silhouette variants:

- `balanced`
- `windswept`
- `ascending`

The pot may be baked into the bonsai stage set for V1 only if its position and size remain identical across every stage. Long term the pot should become a separate cosmetic layer.

### Karesansui progression

`sand/first-bloom-stage-01-untouched.png`
`sand/first-bloom-stage-02-first-lines.png`
`sand/first-bloom-stage-03-flow.png`
`sand/first-bloom-stage-04-balance.png`
`sand/first-bloom-stage-05-harmony.png`
`sand/first-bloom-stage-06-complete.png`

Final selectable pattern overlays:

- `sand/pattern-still-water.png`
- `sand/pattern-ripple.png`
- `sand/pattern-spiral-wind.png`

### Stone layouts

- `stones/layout-centered.png`
- `stones/layout-riverbank.png`
- `stones/layout-mountain.png`

Stone assets include only stones, contact shadows, and attached moss. They must remain transparent everywhere else.

### Environmental layers

- `environment/sanctuary-background.webp` - architecture, distant mountains, sky; no bonsai, sand markings, foreground stones, or UI
- `environment/garden-base.webp` - neutral garden ground/base with no progression markings
- `environment/petal-01.png` through animation frames or particle sprite(s)
- `environment/leaf-01.png` through animation frames or particle sprite(s)
- `environment/growth-glow.png`
- `environment/water-splash.png`

### UI

Sanctuary UI follows Blazing Battle's established visual language:

- deep strong navy
- circular/wave texture
- parchment
- restrained red
- gold trim

UI pieces must be independent from the scene art. No text should be baked into reusable frames.

## Runtime order

Recommended scene stack from back to front:

1. Sanctuary background
2. Garden base
3. Sand progression/pattern layer
4. Stone layout layer
5. Bonsai/pot layer
6. Moss/decorative accents
7. Petal/leaf/water/growth VFX
8. HUD and Sanctuary navigation

## V1 implementation rule

The functional prototype in `sanctuary.html` currently uses CSS/SVG-like procedural placeholders. Those placeholders exist only to prove state changes, persistence, completion, and layer swapping. Final generated art should replace those visual layers without changing the progression state model.
