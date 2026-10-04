# Scorpion Puppet Atlas V2 authoring lock

Branch: `experiment/scorpion-puppet-atlas`

This document locks the next step after Puppet Atlas Contract v1. Contract v1 and its renderer are not being redesigned. The V1 neutral reconstruction is the visual master. V2 is an asset-authoring pass whose only purpose is to replace coarse combined anatomy with deliberately cut, articulation-safe source pieces.

## Visual master

The accepted V1 neutral reconstruction is authoritative for silhouette, proportions, stance, baseline, facing, armor placement, hood/head size, and overall visual weight.

Native neutral reference from the current authored manifest:

- visual bounds: `x -148, y -809, w 383, h 809`
- baseline: `0`
- anchorX: `43.5`
- normalization: whole-character only, after complete assembly

No per-piece scaling is allowed. No automatic alpha-island mapping is allowed. No anatomy may be inferred from disconnected alpha regions.

## V2 base segmentation

Author exactly these 15 anatomical pieces first:

1. `headHood`
2. `torso`
3. `pelvis`
4. `leftUpperArm`
5. `leftForearm`
6. `leftHand`
7. `rightUpperArm`
8. `rightForearm`
9. `rightHand`
10. `leftThigh`
11. `leftShin`
12. `leftFoot`
13. `rightThigh`
14. `rightShin`
15. `rightFoot`

Only add a cloth/armor sub-piece if the 15-piece reconstruction cannot preserve the approved neutral silhouette or if a rigid joint rotation would visibly tear that item. Decorative subdivision alone is not a reason to add pieces.

Weapon, chain/spear, and VFX remain separate assets and are not part of the body atlas.

## Cut rules

Each piece must be manually authored from the approved neutral master, not selected from old packed cells by alpha-island heuristics.

Every rotating joint must contain hidden image overlap beneath the neighboring piece so small rotations do not expose transparent seams. Minimum overlap is judged visually, not by a fixed pixel count. The overlap must be large enough to survive the required acceptance rotations without revealing background.

Required overlap zones:

- torso under both upper arms at shoulders
- upper arm under forearm at elbows
- forearm under hand at wrists
- pelvis under thighs at hips
- thigh under shin at knees
- shin under foot at ankles
- head/hood under upper torso/neck boundary where rotation could expose a seam

Do not duplicate visible anatomy in the neutral pose. Hidden overlap is allowed only beneath the covering piece.

Preserve native source pixels and native proportions. Assemble at source size. The renderer may apply fighter scaling only after the complete V2 body has been assembled.

## Zero-transform gate

Before any animation work, a V2 pose with every bone rotation at zero must visually match the approved V1 neutral master.

Reject V2 if any of these occur:

- different silhouette or stance
- changed limb thickness or length
- head/hood scale drift
- foot/baseline drift
- duplicate arm, hand, leg, cloth, or armor shapes
- transparent seams
- piece-specific stretching or normalization

## Articulation gate

Do not build Idle, Run, Attack, or Recoil until these three isolated tests pass at native size:

1. elbow: approximately `20deg`
2. shoulder: approximately `10deg`
3. knee: approximately `10deg`

Each test must remain visually intact with no gaps, clipping, duplicate anatomy, or deformation. Test one joint at a time first, then the three together.

If a test fails, fix the cut/overlap/pivot. Do not compensate with renderer scaling or a new mapping heuristic.

## After the gate

Only after zero-transform and articulation acceptance:

1. author skeletal Idle
2. author skeletal Run
3. validate planted-foot behavior, silhouette, and in-game normalization
4. then evaluate Attack and Recoil

The existing 12-frame Scorpion animation remains the fallback until the skeletal path passes those gates.
