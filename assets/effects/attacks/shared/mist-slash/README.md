# Shared Mist Slash VFX

This folder is the canonical home for reusable mist-slash effects.

## Shared asset law

Reusable slashes, trails, impacts, particles and similar effects live under `assets/effects/`, not inside the first unit that uses them. Units reference shared effects by stable IDs.

## Atlas mapping

`mist_slash_shared_vfx.atlas.json` defines 29 named regions using top-left pixel coordinates plus normalized pivots. Example effect ID:

`shared.mist:mist_crescent_04`

Two named sequences are currently defined:

- `mist_crescent_build`
- `mist_ground_impact_build`

## Source package

The original uploaded package is preserved at:

`source/blazing-battle-shared-mist-vfx-atlas-v1.zip`

That archive contains the 1536x1024 PNG atlas and its source documentation. The PNG should be extracted to this folder as `mist_slash_shared_vfx.png` before direct runtime atlas loading is wired.

Do not duplicate this package into Mistblade's character folder.
