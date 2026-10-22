# Blazing Journey Environment Asset Guide

This specification is the production contract for long-form Journey environments. Art is authored per segment and per depth layer; never deliver one image for an entire route. Collision, platforms, hazards, encounters, and checkpoints live in route configuration and must not be baked into the artwork.

## Portrait-first viewport

- Primary target: a 390 × 844 CSS-pixel phone viewport, with the playable stage normally occupying about 390 × 640 CSS pixels after safe areas and navigation.
- Secondary targets: 844 × 390 landscape and desktop stages up to 980 × 680 CSS pixels.
- Artwork should tolerate about 1.15× presentation scale and moderate camera/parallax movement without exposing an edge.
- Keep important silhouettes, exits, and landmarks inside the central 70% of a segment. The outer 15% on each side is transition-safe scenery.
- The gameplay readability band is the lower 55% of the stage. Avoid high-contrast faces, text, or bright VFX directly behind units and interactable markers.

## Segment units

The test route uses 880 world units per segment. A production segment may normally use 800–1400 world units. Very long biomes should be several connected segments, not a wider texture.

- Standard artboard ratio: 16:10 or 8:5.
- Standard raster delivery: 2048 × 1280 px.
- High-detail hero segment: up to 2560 × 1600 px when the compressed file remains within budget.
- Tile strips: normally 1024 × 1024 or 1536 × 1024 px.
- Maximum texture dimensions: 4096 px on either axis. Prefer two 2048 px assets to one 4096 px asset.
- Do not author an 8K route background.

## Layer deliverables

Each segment may define the following six layers. Keep layers registered to the same artboard origin so they align when stacked.

| Layer | Typical dimensions | Alpha | Scroll multiplier | Tile guidance | Content |
|---|---:|---|---:|---|---|
| Sky | 2048 × 1280 | Opaque | 0.04–0.12 | Optional repeat-x for clouds | Gradient, sky color, very distant clouds |
| Distant scenery | 2048 × 1280 | Transparent preferred | 0.15–0.35 | Repeat only if the silhouette is seamless | Mountains, skyline, distant canopy |
| Midground scenery | 2048 × 1280 | Transparent | 0.4–0.7 | Usually no-repeat | Trees, dunes, buildings, large depth shapes |
| Gameplay/background plane | 2048 × 1280 | Opaque or transparent | 1.0 | No-repeat | Ground-adjacent environment behind units; no collision authority |
| Foreground scenery | 2048 × 1280 or 1536 × 1280 | Transparent | 1.05–1.25 | Small repeat-x strips are allowed | Branches, grass, pillars, sand lips that pass in front of units |
| Atmospheric/VFX overlay | 1024 × 1024 tile or 1536 × 1024 strip | Transparent | 0.5–1.1 | Prefer repeat-x | Mist, dust, embers, pollen, light shafts; subtle opacity |

Layer configuration supports `asset`, `parallax`, `offsetY`, `scale`, `repeat`, `size`, `opacity`, and `z`. Foreground and atmosphere use z values of 80 or greater and render above the runner; all other layers render behind gameplay.

## Transparency and edges

- Sky and a fully painted gameplay plane may be opaque.
- Distant, midground, foreground, and VFX layers should normally include alpha.
- Never fake transparency with checkerboards, white, or black matte pixels.
- Extend painted content 64–96 px beyond each artboard edge before export. The runtime also supports configurable overlap.
- Keep foreground cutouts at least 80 px away from the exact left/right crop edge unless the asset is designed to tile.

## Segment overlap

- Safe overlap between neighboring segments: 64–96 source pixels at 2048 px delivery width.
- Match the horizon height, dominant ground value, and major silhouette direction across both sides of a transition.
- Biome changes should take place across two neighboring segments: the outgoing segment introduces 15–30% of the next biome, and the incoming segment retains 15–30% of the previous biome.
- Do not paint a hard vertical seam. Avoid unique landmarks inside the overlap band.
- A transition name in configuration describes the intended crossfade or environmental handoff; it is not collision data.

## Foreground sizing

- Foreground elements may extend 10–18% outside the nominal artboard because the segment wrapper clips them safely.
- Keep opaque foreground coverage below roughly 25% of the screen at one time on portrait phones.
- Leave the runner’s central readability corridor clear: approximately 18–72% of viewport width and 38–88% of stage height.
- Use a separate foreground layer for objects that must pass in front of the player. Do not duplicate them in the gameplay plane.

## Compression targets and formats

- Default raster format: WebP.
- Use lossy WebP quality 72–82 for opaque painted layers.
- Use lossless WebP or high-quality lossy WebP with alpha for clean foreground cutouts. AVIF may be evaluated later but is not the baseline contract.
- PNG is reserved for small sharp masks, UI-like overlays, or assets whose alpha edge visibly degrades in WebP.
- Target 250–700 KB per 2048 × 1280 painted layer.
- Target 100–400 KB per transparent scenery or VFX layer.
- Soft ceiling: 1.25 MB per layer. Any exception should be reviewed.
- Recommended active three-segment window: under 12 MB compressed and under roughly 90 MB decoded RGBA memory.
- Strip metadata and embedded color profiles that are not required. Export sRGB.

## Tile rules

- Mark a layer `repeat-x` only after checking a three-copy preview for seams.
- Tileable art must match color, alpha, and silhouette at both horizontal edges.
- Never tile a recognizable landmark, character, sign, or unique building.
- Atmospheric tiles should avoid obvious evenly spaced clusters.
- A repeating layer still belongs to one segment and is released with that segment.

## Geometry handoff

Artists may provide a non-shipping guide image showing intended ground, platforms, gaps, and hazards. Engineering converts that guide into configuration. The shipping art contains no authoritative collision mask.

Geometry supports:

- ground spans;
- raised platforms with lane and elevation;
- gaps, including jump-required gaps;
- gradual slopes with start/end elevation;
- hazard regions;
- encounter/interaction trigger regions;
- invisible left/right boundaries.

Keep important platform tops visually consistent with their configured elevation. Allow at least 48 source pixels of visual landing space beyond each collision edge.

## Naming convention

Use lowercase kebab-case:

`{realm}-{route}-{segment-order}-{segment-id}-{layer-role}-v{revision}.webp`

Examples:

- `shinobi-forest-03-border-trail-sky-v1.webp`
- `shinobi-forest-03-border-trail-midground-v2.webp`
- `shinobi-forest-03-border-trail-foreground-v1.webp`
- `shinobi-forest-03-border-trail-atmosphere-v1.webp`

Do not use `final`, `new`, dates, spaces, or tool-generated random suffixes in production filenames.

## Directory layout

```text
assets/maps/journey/
  shinobi/
    forest-approach/
      shared/
        atmosphere/
        tiles/
      01-forest-entry/
        sky/
        distant/
        midground/
        gameplay/
        foreground/
        atmosphere/
      02-deep-forest/
      03-border-trail/
      04-sunscar-desert/
      05-desert-ruins/
```

Place an asset in `shared` only when multiple segments intentionally use the exact same file. Do not duplicate identical bytes under several names.

## Delivery checklist

1. Supply flattened layer files, not a single composite.
2. Include the source art file separately from runtime assets; source files should not ship in the game build.
3. Confirm dimensions, alpha, sRGB, and file size.
4. Preview at 390 × 640, 844 × 390, and 980 × 680 stage sizes.
5. Preview three adjacent segments and verify the transition seam.
6. Preview foreground coverage over a runner silhouette.
7. Verify repeatable layers with three horizontal copies.
8. Provide a non-shipping geometry guide when the scene implies platforms, slopes, or gaps.
