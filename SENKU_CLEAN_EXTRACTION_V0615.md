# Senku Clean Frame Extraction — v0.6.15

The prior frames contained fragments from neighboring poses because the source sheet
was split into broad equal-width cells.

This build re-extracts every basic and Jutsu body pose with:
- tight per-pose source coordinates
- connected-component isolation of Senku's body
- removal of neighboring limbs, bombs, and effect fragments
- a shared 420x420 canvas
- 315px body height
- 392px baseline
- scale reduced to 1.30

Projectile and impact VFX remain separate from body frames.
