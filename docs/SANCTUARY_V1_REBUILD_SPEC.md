# Sanctuary V1 Rebuild Specification

Status: design/engineering repair plan after first playable First Bloom test

Branch: `feature/sanctuary-first-bloom`

## Core decision

Sanctuary must render as one authored diorama/compositor, not as unrelated responsive images stretched into a web layout. Preserve the current state/persistence skeleton, but replace the scene compositor and interaction presentation.

## Keep

- Sanctuary resource model: Leaf Essence, Garden Stone, Spirit Water, Harmony Seal
- six tree stages
- independent Tree Growth and Garden Harmony concepts
- local persistence namespace/schema concept
- Grove records and duplicate-completion protection
- isolated Sanctuary Summon seal spending
- DEV panel/presets as a testing mechanism
- Home navigation entry

## Rebuild

- scene geometry and all layer alignment
- pot/trunk ownership and occlusion
- garden overlay normalization
- First Bloom FX sequencing
- Cultivate/Garden menu presentation
- generic percentage-button progression
- Grove visual presentation
- Sanctuary Summon presentation

## Canonical coordinate systems

### Tree canvas

Use one transparent `1536 x 1536` coordinate space for every active bonsai layer.

Runtime layers must all occupy `inset: 0; width: 100%; height: 100%` and use the same canvas. Do not use per-layer `object-fit: fill`, arbitrary percentage stretching, or viewport-specific offsets.

Render order:

1. root/pot back layer
2. trunk layer
3. canopy layer
4. blossom layer
5. root/pot front occlusion layer
6. light ambient FX

The current standalone `pot_base.png` must not render together with `rootbase_01..04.png`. The rootbase images already own the visible blue bonsai container. For V1 the rootbase asset is the active pot/soil state.

Create a front-occlusion mask from each rootbase so trunk roots appear planted inside the container rather than painted over its front face.

### Garden canvas

Use one transparent `1536 x 1024` coordinate space for every active karesansui layer.

Render order:

1. sand bed base
2. true rake-groove overlay
3. motif overlay
4. signature/name overlay
5. moss/petal accents
6. stone layout
7. localized ambient FX if any

No garden layer may use `object-fit: fill`.

## Asset repair rules

- Rake assets must become groove-only transparent overlays. Their current authored sand/background must not be stacked over the sand bed.
- Stone layouts must have residual rectangular/background matte removed before runtime use.
- Name templates must be normalized to the garden canvas without stretching.
- Blossom assets are flowering branch strips, not full-tree blossom masks. Place them locally near the crown. Do not stretch them across the canopy.
- FX assets are temporal ceremony pieces. Do not enable every FX asset simultaneously.

## Tree stage mapping

Stage 1 Seedling
- rootbase 01
- trunk 01
- no canopy
- no blossom

Stage 2 New Growth
- rootbase 01
- trunk 02
- canopy 01
- no blossom

Stage 3 Young Bonsai
- rootbase 02
- trunk 03
- canopy 02
- no blossom

Stage 4 Shaped Bonsai
- rootbase 02
- trunk 04
- canopy 03
- no blossom

Stage 5 Mature Bonsai
- rootbase 03
- trunk 05
- canopy 04
- optional buds

Stage 6 First Bloom
- rootbase 04
- trunk 06
- canopy 04
- selected full blossom treatment

Green and Jade canopy sets use the same normalized anchors.

## First Bloom FX state machine

Do not use one boolean for all effects.

Use:

`idle -> petal_drift -> wind_ring -> bloom_burst -> settle`

Rules:
- only one major ceremony effect dominates at a time
- bloom burst is short
- wind ring ends before final settled state
- final completed state should be calm, with at most subtle drifting petals and ground scatter
- completed state must remain readable after the ceremony ends

## Mobile scene composition

The live diorama must remain visible while the player edits it.

Suggested viewport structure:

1. compact Sanctuary header with title/cultivation and resources
2. large persistent live diorama, approximately 55-65% of available game viewport
3. thin Tree/Harmony progress strip attached to the diorama
4. compact Sanctuary navigation dock
5. collapsible bottom action drawer

The current long parchment page should be replaced with the drawer. The player must never need to scroll the live garden offscreen merely to select a rake pattern or stone layout.

Player-facing navigation:
- Cultivate
- Design
- Grove
- Summon

DEV should become a small tester control, not a dominant red player-facing button.

## Interaction redesign

Do not make Water/Nourish/Prune/Rake/Stones/Refine merely different buttons that add generic percentages.

### Tree progression

Each stage has requirements. Example model:

- Seedling: Water + Nourish
- New Growth: Water + Nourish + first Shape
- Young Bonsai: repeated care + Shape
- Shaped Bonsai: care + deliberate pruning milestone
- Mature Bonsai: final care + refinement
- First Bloom: tree requirements complete and Garden Harmony complete

Actions should fill stage requirements. Completing a stage triggers a visible layer transition.

### Garden progression

Harmony should represent actual garden completion.

Suggested components:
- apply rake pattern
- place stones
- choose/apply motif
- add signature/name design
- add optional accent
- final refinement

Customization selection and action execution must be separate. Pressing `Rake` must not automatically cycle the selected pattern. Pressing `Place Stones` must not automatically cycle the layout.

## Bottom drawer behavior

Cultivate drawer:
- current stage requirements
- Water
- Nourish
- Shape/Prune
- next-stage readiness

Design drawer:
- segmented subnav: Pattern / Motif / Stones / Accent / Signature
- horizontally scrollable choice cards or compact grid
- live preview updates the persistent diorama immediately
- explicit Apply action when spending resources is required

Grove drawer/page:
- visual miniature garden cards, not text-only records
- tapping a completed cultivation loads it into the diorama in read-only showcase mode

Summon drawer/page:
- isolated Sanctuary summon remains separate from normal summon
- Harmony Seal count visible
- result presentation should eventually use Sanctuary-specific reveal UI

## DEV testing model

Keep granular controls, but reorganize them by:
- Tree
- Garden
- Cosmetics
- Economy
- Save
- Ceremony

DEV controls must be able to independently select every visual layer without forcing impossible presets. Presets remain useful for flow testing, but are secondary to direct state controls.

## Runtime prohibitions

- no `object-fit: fill` for production art layers
- no simultaneous standalone pot + rootbase pot
- no all-FX-at-once First Bloom state
- no automatic pattern/layout cycling when performing gameplay actions
- no scrolling UI that hides the garden during customization
- no fake alternate tree shapes made by warping the Balanced art

## Repair order

1. normalize Tree Canvas assets
2. normalize Garden Canvas assets
3. remove double-pot ownership and add pot-front occlusion
4. replace current scene compositor with deterministic full-canvas layers
5. replace long page controls with persistent scene + bottom drawer
6. redesign Tree stage requirements
7. redesign Garden Harmony around actual design completion
8. sequence First Bloom FX
9. upgrade Grove visual collection
10. polish Sanctuary Summon

## Acceptance target

On a phone, the player can enter Sanctuary and keep the live bonsai/garden visible while cultivating or designing it. Every stage transition is visually coherent, every layer shares deterministic coordinates, no asset stretches or rectangular mattes appear, First Bloom is dramatic but readable, and a completed cultivation settles into a calm showcase state before being preserved in the Grove.
