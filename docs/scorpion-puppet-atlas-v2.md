# Scorpion Puppet Atlas V2 articulation gate

Status: experiment only on `experiment/scorpion-puppet-atlas`. Contract v1 remains authoritative and unchanged. The approved V1 neutral reconstruction is the visual master.

## V2 authored cut

V2 uses 17 deliberate pieces from the already-approved neutral source pixels:

- head / hood
- torso
- pelvis
- left and right upper arms
- left and right forearms
- left and right hands
- left and right thighs
- left and right shins
- left and right feet
- left and right shoulder-armor covers

No automatic alpha-island assignment is used. `body_08` and `body_10` whole-arm candidates are intentionally excluded. Weapons and VFX remain in their existing separate atlases and are not part of this gate.

The V2 pieces keep source-size proportions. Crops from the approved V1 neutral are placed back at the exact same zero-transform source coordinates. Shoulder, elbow/wrist, and knee chains keep deliberately overlapping source pixels beneath their joints so a small rotation does not expose a transparent seam. Whole-character normalization still happens only after native assembly through Puppet Atlas Contract v1.

## Gate before animation

The runtime exposes a dev-only **SCORPION · PUPPET V2** lab. It compares V2 neutral against the approved V1 master at native pixels, then renders only these static articulation checks:

1. left elbow +20 degrees
2. left shoulder +10 degrees
3. left knee +10 degrees

Run, Attack, Recoil, and skeletal Idle are intentionally not authored or enabled here. Progress only after the V2 neutral master comparison and the three articulation poses are visually intact without gaps, clipping, duplicate anatomy, or deformation.
