# Blazing Battle Animation Quality Standard v1.0

Smooth motion is a production requirement, not optional polish. If an animation reads clipped, stepped, snappy, disconnected, or visibly under-framed in the live mobile build, it is not approved even if the gameplay logic works.

## Frame targets

These are quality targets, not hard maximums.

- Idle: 8-12 authored frames when motion is visible; fewer only when the pose is intentionally near-static.
- Run / movement: 12 authored frames preferred for production units. 10 frames is temporary/acceptable only when the motion reads cleanly in the live build.
- Basic attack: 10-14 authored frames. Use more when wind-up, contact, follow-through, or recovery needs it.
- Jutsu / special: 12-18+ authored body frames as needed. VFX frame count is independent.
- Recoil / hit: 6-10 authored frames with a readable impact, settle, and recovery.

Do not reduce frame count merely to make an atlas smaller. Quality wins over convenience and file count.

## Playback targets

- Run and active movement should normally present about 13-15 unique frames per second.
- Fast attacks may present about 14-18 unique frames per second when the source supports it.
- Idle timing can be slower, but frame-to-frame body movement must remain small and intentional.
- Movement speed in world space is independent from animation playback speed. Never make the fighter move farther simply to make the run cycle look faster.
- Hold/repeat frames are allowed for anticipation, contact, or recovery beats. Repeating frames is not a substitute for missing in-between poses.

## Source-frame integrity

All character frames follow `FIGHTER_VISUAL_STANDARD.md`.

- 512x768 RGBA runtime canvas.
- Bottom-center ground anchor.
- Feet baseline Y=700, tolerance +/-8 px for normalized production frames.
- Normal humanoid visible body height targets 600 +/-30 source pixels before world-space scaling.
- Keep usable transparent gutter around the pose. A body part touching a source-cell edge is a failed source frame unless contact with the edge is intentional and no pixels are missing.
- No neighboring atlas-cell fragments.
- No frame may change apparent character scale to compensate for a crop.
- Runtime normalization may correct transparent padding and anchor drift. It cannot restore pixels that were actually cut off. A genuinely clipped frame must be re-authored or re-sliced from a valid source.

## Continuity rules

Across one animation:

1. Character identity, costume, proportions, and camera angle stay locked.
2. Apparent scale stays stable.
3. Feet/ground origin stays stable unless the pose intentionally leaves the ground.
4. Torso and limb motion must travel through believable intermediate poses. Large unexplained jumps between adjacent frames fail review.
5. Attack release must visually match the body pose. Projectile/VFX origin is authored from the release point, never guessed from the PNG edge.
6. Body animation, projectile travel, impact VFX, and recovery are separate timed beats and must read as one continuous action.
7. VFX is rendered in world space independently from body-frame scaling and may animate at display refresh rate.

## Runtime policy

- Never fall back from a normalized premium animation to raw misaligned frames during first use.
- If premium frames are still decoding, use the last known stable presentation until the complete sequence is ready.
- Do not solve bad source framing with character-specific clip masks unless it is a temporary diagnostic patch.
- Do not solve choppy source animation by only decreasing `frame_ms`. Faster bad frames are still bad frames.
- When a 10-frame or 12-frame animation still looks choppy, inspect the authored poses and add/remake frames instead of continuing timing hacks.

## Current quality flags

- **Scorpion idle/run:** use the 12-frame V2 source only after canonical anchor/framing normalization. The legacy six-frame idle is not the production target.
- **Scorpion basic:** current safe body sequence is still temporary. The final attack needs a clean 12-frame authored spear-release sequence with a release pose that matches the hand-connected chain VFX.
- **Mashle run:** 12-frame V2 is the intended source. Any frame that remains visibly clipped after canonical normalization must be repaired/re-authored rather than masked.
- **Egyptian Gaara run:** current 10-frame sequence is temporary. It may ship to testing at a tighter cadence, but if pose stepping remains visible it should be expanded to 12 authored frames.

## Approval test

Every new or revised animation must be reviewed in the real battle renderer on mobile, not only as a sprite sheet. Check idle, pickup/run, release, return-to-idle, attack wind-up, release/contact, impact, recovery, facing changes, and perspective scaling. A technically valid atlas is not approved until the live motion reads smoothly.
