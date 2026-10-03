# Blazing Battle Rig Animation System V1

## Goal

Add smooth control-point animation without replacing the authored sprite system. The live game remains a hybrid: rigs handle motion that benefits from interpolation, while frame animation remains authoritative for large pose/perspective changes and signature combat.

## V1 architecture

- Renderer: Canvas 2D.
- Rig method: a low-resolution deformable mesh driven by named body control points.
- Interpolation: time-based keyframes sampled every rendered frame, so motion is not limited to PNG frame count.
- Safety: activation is opt-in per fighter and per animation state.
- Fallback: if a rig source image is not decoded, a profile is missing, or the state is not rigged, the existing sprite-frame renderer draws exactly as before.
- Canonical fighter contract remains 512x768 source, bottom-center anchor, feet baseline y=700.

## Pilot

Scorpion and Mashle use a single approved V2 idle source frame plus subtle control-point breathing/sway. Their run, Basic and all special/Jutsu presentation continue using authored frames. The isolated recoil pilot keeps the authored recoil frame sequence and only adds a brief 260 ms control-point impact/settle overlay.

The pilot intentionally uses a small mesh on mobile (4x6 cells) and a slightly denser mesh on desktop (5x8 cells). This keeps the proof-of-concept compatible with the existing iPhone/WebKit safety work.

## Review tool

The Rig Lab is an in-game review overlay available from Home. It shows the exact authored source and the same source drawn through the production mesh at enlarged scale, with a y=700 feet-baseline guide. `INSPECT 3×` amplifies only the lab's control-point deltas for visual review; it never changes combat or production rendering. `TRIGGER RECOIL` compares the authored recoil source against the isolated recoil overlay.

## Production direction

Use rigs for idle breathing, subtle weight shifts, cloth/hair follow-through, anticipation and light recoil when the artwork can deform cleanly. Keep hand-authored frame sequences for attacks that redraw anatomy, silhouette, perspective, hands, faces, smears or VFX-heavy choreography.

Future premium character assets may use layered body-part puppets on top of the same animation API. V1 does not require existing characters to be cut apart, so migration can happen character-by-character instead of forcing a roster-wide asset rewrite.
