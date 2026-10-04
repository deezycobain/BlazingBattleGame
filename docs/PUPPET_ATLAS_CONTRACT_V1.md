# Puppet Atlas Contract v1

Status: Scorpion neutral pilot on `experiment/scorpion-puppet-atlas`. No puppet animation clips are approved or enabled. This is an additive contract; Character Sprite / Atlas Contract v1, canonical unit data, combat, saves, and the Scorpion V2 frame packs are unchanged.

## Authority and files

- `config/puppet-atlas-contract-v1.schema.json`: strict JSON Schema (2020-12) for the v1 humanoid profile. Unknown properties are errors, including piece scale/size overrides. The canonical required-slot list cannot be weakened in a character manifest.
- `assets/characters/<unit>/data/puppet-atlas-v1.json`: character-owned source of truth. Scorpion is the pilot. Paths are repository-relative and must stay within the owning character.
- `runtime/rendering/puppet-atlas-contract-v1.js`: shared pure schema validator, hierarchy assembler, native renderer, pixel verifier, and final normalizer. Browser and Node use the same implementation. Its schema walker supports only the keywords used by this schema; it is not a general JSON Schema engine.
- `runtime/rendering/scorpion-puppet-atlas.js`: asset loading, immutable compiled model, development-only FRAME/PUPPET mode, read-only inspector, and failure fallback.
- `scripts/validate-puppet-atlas-contract-v1.mjs`: discovers opt-in manifests, checks actual PNG dimensions and supplied rectangle maps, then validates anatomy and assembly.
- `scripts/test-puppet-atlas-contract-v1.mjs`: mutation and transform regression tests.
- `scripts/scorpion-puppet-atlas-browser-smoke.mjs`: actual built-game integration and failure tests in Chromium/WebKit.
- `dev-tools/puppet-atlas-neutral.html`: standalone native-pixel inspection, served from repository root; excluded from the shipped build.

## Coordinate and assembly rules

All positions are authored in source pixels, x right and y down; rotations are radians clockwise. There is no per-component scaling, target width, target height, automatic aspect fitting, or runtime anatomy inference. Bone transforms contain translation and rotation only.

A bone declares `id`, `parent` (null for the sole root), `restOffset` in parent-local pixels, and `restRotation`. Order in the manifest is irrelevant; missing parents and cycles fail validation.

Each component declares:

| Field | Meaning |
| --- | --- |
| `slot` | Explicit semantic owner, never a packing-cell ordinal |
| `covers` | Additional anatomy already painted into this component, e.g. torso-owned upper arms or forearm-owned hands |
| `parentBone` | Named bone to which this component attaches |
| `attachmentPoint` | Socket in parent-bone local pixels |
| `zOrder` | Back-to-front order, with slot-name tie-break for determinism |
| `defaultAttachment` | The selected authored attachment ID |
| `attachments` | One default and optional alternative cutouts; each carries its own complete region/pivot/rest metadata |

Every attachment requires `id`, `sourceRegion`, absolute `atlasRect` (`x,y,w,h`), crop-local `pivot`, `restOffset`, `restRotation`, `mirrorEligible`, and `nativeAspectRatio`. The crop must be inside both the real PNG and its named source-map region. Pivots are independent of packing rectangles and are never generated from alpha-island centers. `nativeAspectRatio` must equal crop width/height; drawing uses those exact native dimensions. `mirrorEligible` is authoring permission for future attachment-level mirroring; v1 does not mirror individual attachments. Existing whole-character facing stays with the fighter renderer.

Component transform = parent bone world transform × translation(socket + attachment rest offset) × rotation(rest rotation). Draw the atlas crop at `(-pivot.x,-pivot.y)` with destination dimensions equal to the source crop. Required anatomy must have exactly one owner across `slot` and `covers`; an integrated shoulder or hand must not also be attached as a second mandatory body part.

The complete neutral body is rasterized once at 1:1 native resolution into an offscreen surface, including transparent crop gutters. Only after that succeeds, the single normalizer uses `bodyHeight / neutral.visualBounds.h` for both axes and anchors `neutral.anchorX` / `neutral.baseline` to the caller's bottom-center origin. Existing fighter/world/camera/facing transforms still belong to the Fighter Visual Contract. Transparent padding cannot set body height. No body part sets world size independently.

`neutral.visualBounds` is the authored visible silhouette envelope, confirmed against rendered alpha >16 with at most 2 source pixels of raster tolerance. It is not inferred to assign anatomy. Two distinct authored crop-local sole contact points must transform to the declared baseline and have actual rendered pixels at their soles. Geometry, visible pixels, and final-scale feet are tested separately.

## Neutral acceptance before animation

1. Inspect the original atlas and supplied map; select semantic regions explicitly. Preserve those source assets.
2. Author native pivots, sockets, rest transforms, embedded anatomy coverage, and layers in the manifest. If source art cannot join correctly at native scale, repair the source art or leave the puppet unapproved; do not stretch pieces to conceal it.
3. Inspect the native reconstruction with the standalone inspector and save evidence. Author the silhouette bounds and sole contacts from that reviewed reconstruction.
4. Pass schema, geometry, source-image, pixel, and FRAME fallback checks before enabling the development preview.
5. Future motion uses `assemble(manifest, {boneRotations, attachments})`, followed by native rasterization and the same whole-body normalization. No Run/Attack/Recoil or idle timeline is included in this pilot. Embedded anatomy cannot articulate independently without new authored split pieces. Alternative artwork must be reviewed for the intended pose before use; declaring an alternate does not approve an animation.
6. Unsupported states and full-frame overrides keep using existing frame animation. The current game seam already selects frames for explicit visuals, attack state, hit/KO effects, and non-Scorpion fighters.

## Failure and migration behavior

Loading, schema, hierarchy, bounds, empty-body, sole-pixel, and drawing failures disable PUPPET and return false to the existing frame draw path. Native composition and pixel verification finish offscreen before any puppet is presented. Canvas state is restored through `finally` even on draw failure.

FRAME remains the default. PUPPET is still development-only, with the existing mode/dev keys retained. Old `bb.scorpion-puppet-atlas.components` and `.components.v2` assignments are neither read nor migrated. They cannot override checked-in anatomy. The former alpha-island assignment UI is replaced by a read-only authored-manifest inspector. No save keys or schemas are changed.

Body, weapon, and VFX atlases/maps and the supplied ZIP remain unchanged and separate. The body renderer never loads weapons/VFX. Unselected source-map cells are available source artwork, not implicit runtime components. A future use must first add a complete semantic attachment definition; runtime never guesses their meaning.

## Validation commands

```
node scripts/validate-puppet-atlas-contract-v1.mjs
node scripts/test-puppet-atlas-contract-v1.mjs
node scripts/validate-scorpion-puppet-atlas-v1.mjs
npm run build
node scripts/serve-dist.mjs
node scripts/scorpion-puppet-atlas-browser-smoke.mjs
```

The existing Scorpion validator remains in the standard validation chain and delegates to the reusable contract validator. The schema and core load before the Scorpion adapter; the final fighter-authority postprocessor remains last. No deployment step is part of this migration.
