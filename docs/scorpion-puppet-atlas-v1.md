# Scorpion — Puppet Atlas Contract v1 pilot

This supersedes the former Phase 1 and Neutral V2 alpha-island prototypes. See [Puppet Atlas Contract v1](PUPPET_ATLAS_CONTRACT_V1.md) for the reusable architecture and authoring rules.

The checked-in source of truth is `assets/characters/scorpion/data/puppet-atlas-v1.json`. No automatic island assignment or saved lab mapping participates in production rendering. The Atlas Lab is now a read-only neutral/manifest inspector. The existing 12-frame FRAME idle remains the default and fallback. Run, Attack, Recoil, spear, chain, and VFX remain on their existing frame/effect paths. No puppet animation, including idle breathing, is enabled.

## Reviewed native assembly

Left/right slot names are retained from the pilot and denote the two assembly chains as seen in the neutral preview; they are not an automatic inference of anatomical laterality from packing positions. The original source atlas has no artist-authored skeleton or assembled neutral reference. The following is an explicit authored reconstruction, visually reviewed against its visible cutouts, rather than a claim of recovering an original source rig.

| Slot | Source region | Native crop | Crop-local pivot | Parent bone | Layer |
| --- | --- | --- | --- | --- | --- |
| head | body_04 | 226 × 252 | 122,218 | head | 100 |
| torso + embedded upper arms | body_01 | 296 × 238 | 148,80 | torso | 50 |
| pelvis | body_07 | 273 × 268 | 136,55 | pelvis | 80 |
| leftForearm + hand | body_13 | 192 × 302 | 64,46 | leftElbow | 60 |
| rightForearm + hand | body_14 | 203 × 272 | 62,46 | rightElbow | 40 |
| leftUpperLeg | body_26 | 198 × 250 | 77,36 | leftHip | 20 |
| leftLowerLeg | body_31 | 132 × 228 | 66,38 | leftKnee | 21 |
| leftFoot | body_35 | 183 × 163 | 67,57 | leftAnkle | 19 |
| rightUpperLeg | body_23 | 167 × 280 | 83,36 | rightHip | 10 |
| rightLowerLeg | body_34 | 129 × 208 | 64,38 | rightKnee | 11 |
| rightFoot | body_41 | 148 × 145 | 64,37 | rightAnkle | 9 |

The torso explicitly uses the top 238 source rows of body_01, covering its duplicate lower belt under body_07. This authored subrect is recorded in the manifest; the supplied map and PNG are unchanged. Torso owns both upper-arm shapes, and forearm attachments own their hands: no duplicate full-arm or hand components. Feet render behind their shins so native cuff overlaps remain hidden. body_05 is declared as an optional head attachment with its own native crop and pivot (121,216); it is not selected by the neutral pilot. All attachment-level mirror permissions are false until separately reviewed.

Native visible envelope: `x=-148, y=-809, w=383, h=809`. Bottom-center anchor: `x=43.5, baseline=0`. Native surface including source gutters: 425 × 849. Two authored sole contacts land at `(17,0)` and `(67,0)`; the pixel verifier confirms actual opaque source pixels at those contacts. They are sole markers, not inferred ankle centers. Rendered alpha >16 contains 160,654 pixels.

The original atlas/contact sheet remains source evidence at [original contact sheet](validation/scorpion-puppet-atlas-v1/scorpion-puppet-body-contact-sheet.png). The standalone inspector reconstructs the current authored neutral pose directly from the checked-in manifest and source atlas. Browser screenshots and result JSON are generated validation artifacts and are not committed. The old screenshots and claims that island existence alone established visual correctness are historical, not acceptance evidence for this contract.

## Scope and continuity

The Scorpion adapter compiles the manifest, paints the complete neutral body at native size, validates its actual pixels, and draws it once through the existing bottom-center fighter seam. It does not change `drawUnit`, character identity, sprite resolver metadata, or canvas methods. The final whole-body scale takes the existing draw seam's body height; combat hitboxes never derive from puppet bounds.

Source assets, weapons/VFX, Character Sprite / Atlas Contract v1, combat behavior, canonical unit data, and save compatibility are preserved. Only `experiment/scorpion-puppet-atlas` is used. No merge to dev/main or production deployment is part of this work.
