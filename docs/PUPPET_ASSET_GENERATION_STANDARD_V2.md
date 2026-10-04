# Puppet Asset Generation Standard v2

Status: locked for Blazing Battle puppet/skeletal character production.

## Core rule

Do not generate puppet characters as unrelated body-part illustrations and do not retrofit frame-animation atlases into skeletal rigs when the source art was not authored for articulation.

For every puppet character:

1. Author and approve one coherent full-body master in the intended gameplay view first.
2. Derive the articulated body pieces from that same approved master.
3. Preserve identity, costume, proportions, lighting, rendering, silhouette, and native source proportions across every derived piece.
4. Build the atlas around the intended bone hierarchy and joint pivots from the beginning.
5. Each rotating connection must include hidden painted overlap beneath the adjoining piece so small rotations do not reveal transparent seams.
6. Assemble the complete puppet at native source size before any character scaling. Character scaling happens only after the whole puppet is assembled.
7. Weapon, chain, projectile, and VFX assets remain separate from the body puppet.
8. Zero-transform reconstruction must visually match the approved master before animation work begins.

## Default anatomical slots

Required unless the character design genuinely requires a different topology:

- head
- torso
- pelvis
- leftUpperArm
- leftForearm
- leftHand
- rightUpperArm
- rightForearm
- rightHand
- leftThigh
- leftShin
- leftFoot
- rightThigh
- rightShin
- rightFoot

Optional only where required for clean articulation:

- frontCloth
- rearCloth
- leftShoulderArmor
- rightShoulderArmor
- other isolated armor or costume pieces that materially improve joint behavior

## Authoring pose

Use the approved gameplay-neutral view for the unit, normally the Blazing Battle right-facing 3/4 combat stance. Do not default to a T-pose unless a specific character requires it.

The neutral master is visual authority. The segmented puppet must reconstruct that pose at zero transforms.

## Pivot intent

- head: base of neck
- torso: chest/core relative to pelvis
- pelvis: body/root center
- upper arm: shoulder socket
- forearm: elbow center
- hand: wrist center
- thigh: hip socket
- shin: knee center
- foot: ankle center

Pivots are authored data, not renderer guesses.

## Joint overlap requirement

Hidden painted overlap is required at:

- neck
- shoulders
- elbows
- wrists
- hips
- knees
- ankles

Overlap should be sufficient for the initial articulation validation without exposing alpha gaps or producing duplicate visible anatomy.

## Acceptance order

Do not begin Idle, Run, Attack, Recoil, or Jutsu animation until the following pass in order:

1. Zero-transform reconstruction matches the approved master.
2. Approximately 20 degree elbow rotation remains visually intact.
3. Approximately 10 degree shoulder rotation remains visually intact.
4. Approximately 10 degree knee bend remains visually intact.

Fail conditions include transparent seams, clipping, duplicate anatomy, deformation, silhouette collapse, broken costume layers, or incorrect proportions.

## Scorpion V2 pilot

Scorpion Puppet Atlas V1 remains preserved as reference/fallback. Scorpion Puppet Atlas V2 is the first production pilot under this standard.

Step A: approve one high-quality full-body Scorpion neutral master.
Step B: derive the V2 anatomical puppet atlas from that exact master.
Step C: validate zero transform and the elbow/shoulder/knee articulation gates.
Step D: only after those gates pass, author skeletal Idle and Run.
