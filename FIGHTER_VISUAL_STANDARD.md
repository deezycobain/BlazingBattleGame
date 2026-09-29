# Fighter Visual Standard v1.0

This is the single visual-size contract for playable combat units. Unit art is not allowed to choose its own in-world size.

## Canonical source frame

- Runtime character frame: **512 x 768 RGBA PNG**.
- Anchor: **bottom center**.
- Feet baseline: **Y = 700 px**, tolerance **±8 px**.
- Standard visible fighter body height: **600 px**, tolerance **±30 px** for idle, run and recoil frames.
- Keep at least **64 px transparent gutter** where the pose allows it.
- Do not bake projectile, aura, impact, smoke trail or large attack VFX into the character body frame. VFX use their own world-space layer.

## Canonical gameplay size

At neutral road depth/camera scale, a normal humanoid fighter targets **96 logical px of visible body height**. Perspective/camera scaling happens after fighter normalization.

Approved size classes are:

| Class | Multiplier | Intended use |
| --- | ---: | --- |
| small | 0.94 | intentionally short/small fighters |
| standard | 1.00 | default for normal humanoids |
| large | 1.06 | intentionally tall/bulky fighters |
| boss | 1.18 | explicit boss-only exception |

A normal unit must never become larger because its PNG has different dimensions, more transparent padding, or a differently cropped source sheet.

## Runtime invariants

1. **One authority:** fighter visual scale comes from `config/fighter-visual-standard.json` only.
2. **No renderer magic numbers:** character-name scale ternaries or one-off CSS/canvas boosts are prohibited outside the visual-standard contract.
3. **Stable feet:** idle, run, attack and recoil frames keep the same bottom-center ground origin.
4. **Body and VFX are separate:** fighter scale never scales a projectile or impact effect, and VFX bounds never affect fighter size.
5. **Combat geometry is separate:** hitboxes, hurtboxes, attack origins and target contact points are gameplay metadata, never inferred from sprite width/height.
6. **Attack alignment:** projectiles originate from an authored attack origin and terminate at the target contact point. Frame edges are not attack coordinates.
7. **Legacy compensation is temporary:** older packs that were authored with inconsistent body occupancy may use the centralized `legacy_source_compensation` map. New production assets must meet the 600 ±30 px body-height standard instead of adding another compensation value.

## Production gate

The build validator must reject an invalid visual-standard file, unsafe compensation values, or a missing final fighter-visual-contract postprocess. If a new unit looks the wrong size, the fix is either to normalize the source frames to this contract or intentionally assign an approved size class. Do not patch the renderer per character.
