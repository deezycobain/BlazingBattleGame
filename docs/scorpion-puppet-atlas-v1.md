# Scorpion Puppet Atlas V1 — Phase 1

This branch holds a development-only A/B prototype. The existing Scorpion V2 twelve-frame idle remains the default FRAME mode and the hard fallback for any atlas load or draw failure. PUPPET is enabled only by localhost, the scorpionPuppetAB query flag, or the development local-storage flag.

## Asset boundaries

- body/ is the only atlas Phase 1 loads and renders.
- weapons/ and vfx/, together with their supplied rectangle maps, are retained separately and are not loaded into the fighter renderer.
- The original source ZIP is retained at the repository root.

## Pivots and hierarchy

The supplied maps define crop rectangles, not joints. Pivots were authored separately in local fighter space, using the current renderer’s established feet contact at local Y=12. Root is centered between planted ankles. Pelvis is 21 logical pixels above root; torso is 17 pixels above pelvis; head is 18 pixels above torso. Shoulders, elbows and wrists are parented from torso through the arm chains. Hips, knees and ankles are parented from pelvis through the leg chains. Cutout pivots are authored per attachment: shoulder and pelvis pieces use interior attachment pivots, limb pieces attach near their proximal edge, and each foot uses a bottom pivot at the ankle contact. Rectangle centers are never used as joints.

The 1.8-second idle has four interpolated keys. Only torso, head and arm rotations change; both hip-knee-ankle chains and both foot cutouts are invariant on every key. The renderer intercepts the existing Scorpion draw call and uses its existing x/y, scale, flip and bottom-center transform, so both A/B modes share the Fighter Visual Contract authority and battlefield origin.

## Known reconstruction limits

The V1 body map labels components only as body_01 through body_41; it does not identify semantic limbs or layer order. The neutral assembly therefore selects pieces by silhouette and proportions and uses authored pivots. It is adequate for the Phase 1 idle comparison, but exact armour layering and any weapon or chain attachment cannot be reconstructed cleanly until a semantic part manifest or artist pivot sheet is supplied. Weapons and VFX are intentionally deferred.
