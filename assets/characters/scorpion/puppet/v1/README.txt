SCORPION PUPPET / ATLAS V1 SOURCE PACK

Purpose
-------
Pilot assets for comparing the new atlas/skeletal animation mechanic against
Scorpion's existing authored 12-frame animation in Blazing Battle.

Included
--------
body/
  scorpion_puppet_body_atlas_v1.png
  scorpion_puppet_body_atlas_v1.json

weapons/
  scorpion_weapon_atlas_v1.png
  scorpion_weapon_atlas_v1.json

vfx/
  scorpion_vfx_atlas_v1.png
  scorpion_vfx_atlas_v1.json

Architecture
------------
- Body atlas is separate from weapons and VFX.
- PNGs are transparent RGBA.
- Parts are spaced with large gutters to avoid crop overlap.
- JSON files contain deterministic atlas rectangles from the packed sheets.
- Do not replace the current Scorpion frame animation yet.
- Integrate this as an opt-in comparison path with full fallback to the current
  12-frame system.

Recommended repo destination
----------------------------
assets/characters/scorpion/puppet/v1/
  body/
  weapons/
  vfx/

Next implementation target
--------------------------
1. Register atlas + JSON data.
2. Define skeleton pivots / hierarchy.
3. Reconstruct one neutral Scorpion pose.
4. Add a 4-key idle clip with planted feet.
5. Add a dev-only toggle:
      Current 12-frame idle <-> Puppet Atlas idle
6. Compare visually and on Chromium/WebKit before expanding to recoil/run/attack.

IMPORTANT
---------
The JSON rectangle maps describe the current packed sheets. Skeleton pivots and
bone-parent relationships still need to be authored during integration.
