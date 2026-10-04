# Scorpion Puppet Atlas V1 — Phase 1

This branch holds a development-only A/B prototype. The existing Scorpion V2 twelve-frame idle remains the default FRAME mode and the hard fallback for any atlas load or draw failure. PUPPET is enabled only by localhost, the scorpionPuppetAB query flag, or the development local-storage flag.

## Asset boundaries

- body/ is the only atlas Phase 1 loads and renders.
- weapons/ and vfx/, together with their supplied rectangle maps, are retained separately and are not loaded into the fighter renderer.
- The original source ZIP is retained at the repository root.

## Component evidence, lab, and pivots

[`scorpion-puppet-body-contact-sheet.png`](validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png) is the reviewed source evidence: all 41 supplied body cells are coherent opaque cutouts. At runtime the development-only **SCORPION · ATLAS LAB** repeats that inspection with eight-connected alpha segmentation and labels the resulting `body_XX.N` cutouts from the unchanged PNG and JSON. It includes an isolated, animated hierarchy preview with transformed ankle markers and a live measured-drift readout. The lab lets a reviewer assign each inspected island to a semantic slot and immediately test that assignment in PUPPET mode; local development assignments are stored separately and never mutate supplied assets.

The verified defaults below are each visible in the contact sheet and the lab. They remain editable in the lab for comparison, but no source rectangle is treated as a joint:

| Semantic part | Atlas ID | Pixel evidence |
| --- | --- | --- |
| head/mask | `body_04.0` | hood, eye, and gold mask |
| torso | `body_03.0` | front torso and yellow waist tab |
| pelvis | `body_07.0` | belt, pelvis, and hanging cloth |
| left arm | `body_08.0`, `body_13.0` | upper arm and forearm/open hand |
| right arm | `body_10.0`, `body_14.0` | armoured arm and forward fist |
| left leg/foot | `body_26.0`, `body_31.0`, `body_35.0` | thigh, shin guard, and boot |
| right leg/foot | `body_28.0`, `body_32.0`, `body_40.0` | thigh, shin guard, and boot |

The supplied maps define crop rectangles, not joints. Independent pivots are authored in local fighter space: root `(0,-8)`, pelvis `(0,-20)`, torso `(0,-17)` from pelvis, head `(0,-4)` from torso, shoulders `(±11,-6)`, elbows `(±7,13)`, wrists `(±3,12)`, hips `(±7,1)`, knees `(±1,16)`, and ankles `(±1,23)`. Each cutout additionally has a local attachment pivot; feet are bottom-pivoted at their ankles. Rectangle centres are never used as joints.

The 1.8-second idle has four interpolated keys. Only torso, head and arm rotations change; both hip-knee-ankle chains and both foot cutouts stay invariant. The narrow `drawUnit` seam calls the puppet only after the real Scorpion’s normal world transform/facing/scale has been established. It does not substitute a sprite, change Scorpion’s name, or intercept `ctx.drawImage`. Atlas load, rectangle validation, and drawing failure all return that same draw call to FRAME mode.

## Known reconstruction limits

The map does not supply an artist semantic manifest or final armour-layer order. The lab exists specifically to verify or replace the initial candidates without guessing from packing-cell IDs. Exact armour-layer refinements and all weapon, chain, recoil, attack, run, and VFX work remain out of scope for Phase 1.
