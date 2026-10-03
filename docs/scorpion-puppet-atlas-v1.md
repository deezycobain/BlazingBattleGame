# Scorpion Puppet Atlas V1 — Phase 1

This branch holds a development-only A/B prototype. The existing Scorpion V2 twelve-frame idle remains the default FRAME mode and the hard fallback for any atlas load or draw failure. PUPPET is enabled only by localhost, the scorpionPuppetAB query flag, or the development local-storage flag.

## Asset boundaries

- body/ is the only atlas Phase 1 loads and renders.
- weapons/ and vfx/, together with their supplied rectangle maps, are retained separately and are not loaded into the fighter renderer.
- The original source ZIP is retained at the repository root.

## Verified part evidence and pivots

[`scorpion-puppet-body-contact-sheet.png`](validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png) was generated directly from the unmodified body PNG and JSON rectangles. The mapping used by the neutral puppet was selected by the visible pixels in that sheet—not by `body_XX` ordering:

| Semantic part | Atlas ID | Pixel evidence |
| --- | --- | --- |
| head/mask | `body_13` | front hood, eye and gold mask |
| torso | `body_18` | belt, chest armour and yellow waist panels |
| pelvis | `body_15` | black hip cloth and gold hip guard |
| left arm | `body_04`, `body_07` | armoured open-hand segments |
| right arm | `body_09`, `body_25` | bracer and clenched-hand segments |
| left leg/foot | `body_14`, `body_23`, `body_21` | gold thigh, trouser/shin and boot pixels |
| right leg/foot | `body_26`, `body_31`, `body_22` | black/gold thigh, shin and boot pixels |

The supplied maps define crop rectangles, not joints. Independent pivots are authored in local fighter space: root `(0,12)`, pelvis `(0,-20)`, torso `(0,-17)` from pelvis, head `(0,-18)` from torso, shoulders `(±11,-6)`, elbows `(±7,13)`, wrists `(±3,12)`, hips `(±7,1)`, knees `(±1,16)`, and ankles `(±1,3)`. Each cutout additionally has a local attachment pivot; feet are bottom-pivoted at their ankles. Rectangle centres are never used as joints.

The 1.8-second idle has four interpolated keys. Only torso, head and arm rotations change; both hip-knee-ankle chains and both foot cutouts stay invariant. The narrow `drawUnit` seam calls the puppet only after the real Scorpion’s normal world transform/facing/scale has been established. It does not substitute a sprite, change Scorpion’s name, or intercept `ctx.drawImage`. Atlas load, rectangle validation, and drawing failure all return that same draw call to FRAME mode.

## Known reconstruction limits

The map does not supply an artist semantic manifest or final armour-layer order. The selected parts above are visually evidenced, but unselected components are intentionally not guessed into the body. Exact armour-layer refinements and all weapon, chain, recoil, attack, run, and VFX work remain out of scope for Phase 1.
