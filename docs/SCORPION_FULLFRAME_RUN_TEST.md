# Scorpion full-frame run test

This branch replaces only the Scorpion V2 run-state PNGs with the new direct full-body animation.

- 12 unique transparent frames at 24 FPS (0.5-second loop)
- 768 x 768 RGBA, bottom-centred
- Full coherent character art in every frame; no puppet parts, mesh deformation, sockets, or layer assembly
- Visible alternating foot contacts, knee bend/lift, arm counter-swing, body lead, and cloth follow-through

The state map continues to resolve `run` to `scorpion.animation.run`. The frame list and timing live in `assets/characters/scorpion/data/unit.json`.
