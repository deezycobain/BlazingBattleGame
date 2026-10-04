# Scorpion Puppet Atlas V1 — Phase 1

This branch holds a development-only A/B prototype. The existing Scorpion V2 twelve-frame idle remains the default FRAME mode and the hard fallback for any atlas load or draw failure. PUPPET is enabled only by localhost, the `scorpionPuppetAB` / `scorpionPuppetLab` query flags, or the development local-storage flag.

## Asset boundaries

- `body/` is the only atlas Phase 1 loads and renders.
- `weapons/` and `vfx/`, together with their supplied rectangle maps, are retained separately and are not loaded into the fighter renderer.
- The original source ZIP is retained at the repository root.

## Neutral V2 anatomy correction

The first phone Atlas Lab test exposed an important topology error rather than an animation error. `body_08` and `body_10` were treated as upper-arm pieces even though the actual atlas pixels show they are complete arms. Drawing those cells and then adding `body_13` / `body_14` forearms stacked duplicate anatomy through Scorpion's chest and waist.

[`scorpion-puppet-body-contact-sheet.png`](validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png) and the development-only **SCORPION · ATLAS LAB** are the source evidence. The lab derives eight-connected alpha islands from the unchanged body atlas and labels them `body_XX.N`; local test assignments never mutate the supplied PNG or JSON.

Neutral V2 now follows the anatomy actually present in the atlas:

| Semantic part | Atlas ID | Pixel evidence |
| --- | --- | --- |
| head/mask | `body_04.0` | hood, eyes, gold mask and neck cloth |
| torso + upper arms | `body_01.0` | front chest, both shoulders/upper arms and waist edge as one authored attachment |
| pelvis | `body_07.0` | belt, medallion, pelvis armour and hanging cloth |
| left forearm/hand | `body_13.0` | independent bracer, forearm and open hand |
| right forearm/hand | `body_14.0` | independent bracer, forearm and fist |
| left leg/foot | `body_26.0`, `body_31.0`, `body_35.0` | thigh, shin guard and boot |
| right leg/foot | `body_28.0`, `body_32.0`, `body_40.0` | thigh, shin guard and boot |

The torso therefore owns the upper-arm art in Phase 1. The renderer does **not** invent upper-arm cuts that do not exist in the approved atlas. Future motion can use alternate whole-arm/torso attachments or a later deliberately authored split if more shoulder articulation is required.

## Pivots, scale and layering

The supplied maps define crop rectangles, not joints. Neutral V2 uses local fighter-space pivots with a planted baseline at `y=12`: root `(0,-8)`, pelvis `y=-17` from root, torso `y=-19` from pelvis, head `y=-2` from torso, forearm anchors `(±16,8)` from torso, hips `(±7,-2)` from pelvis, knees roughly `17px` below each hip, and ankles `22px` below each knee.

Attachment width is derived from each isolated component's **native pixel aspect ratio**. Only logical attachment height is authored. This replaces the first prototype's forced `w × h` rectangles, which visibly stretched and squashed body parts. Layering is legs → torso → forearms → pelvis → head so the pelvis cleanly covers the torso waist seam without duplicating belt art.

The 1.8-second idle has four interpolated keys. Only torso, head and forearm rotations change; both hip-knee-ankle chains and both foot cutouts stay invariant. The narrow `drawUnit` seam calls the puppet only after the real Scorpion's normal world transform/facing/scale has been established. It does not substitute a sprite, change Scorpion's name, or intercept `ctx.drawImage`. Atlas load, rectangle validation, assignment failure, and drawing failure all return that same draw call to FRAME mode.

## Known reconstruction limits

This is still the neutral/idle proof. Weapon, chain, recoil, attack, run and VFX conversion remain intentionally out of scope until the neutral anatomy is visually accepted on-device. The approved atlas contains several whole-arm and pose-specific attachments rather than a perfectly segmented upper-arm/forearm anatomy, so later actions should prefer attachment swaps where that is visually cleaner than forcing every pose through one skeleton.
