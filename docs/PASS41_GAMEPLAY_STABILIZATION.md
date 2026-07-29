# Pass 4.1 — Gameplay Presentation Stabilization

Pass 4.1 is a stabilization gate between the completed Pass 4 renderer extraction and Pass 5 character-body extraction.

**Current status:** implementation complete on the Pass 4.1 branch; automated validation is green; **manual gameplay verification is still required before promotion to `main`**.

## Why this gate exists

Manual testing of the Pass 4 Cloudflare preview exposed presentation behavior that automated structural/build tests did not protect. Pass 5 must not extract character-body behavior until these cases are known-good and regression-guarded.

## Locked acceptance cases

### A. Sub-Zero Freeze Blast range / facing presentation

- Freeze Blast must always project forward from Sub-Zero's current body facing.
- Sub-Zero's body facing follows the nearest live enemy during preview/commit, so the cone may point right, left, upward, downward, or diagonally depending on enemy direction.
- The projectile origin must stay on the forward side of his body rather than always spawning from screen-right.
- Canonical Freeze Blast combat geometry remains the existing cone (`r: 205`, `a: 1.05`).
- Damage, target eligibility, projectile timing, freeze hold, and the `-35` gauge effect remain unchanged.

### B. Sub-Zero regular basic attack

- Sub-Zero must face the resolved enemy during the attack performance.
- The supplied Sub-Zero basic body animation must be visible during the lunge/strike instead of silently falling back to idle art.
- Damage timing and amount remain unchanged.

### C. Sub-Zero combo/helper basic attack

- When Sub-Zero joins a valid player combo as a helper, he must face the combo target.
- His supplied basic body animation must visibly play during his helper strike.
- Combo membership, order, damage scaling, chakra gain, recoil, and target selection remain unchanged.

### D. Senku close-range basic presentation

- Senku keeps Explosive Bomb as his normal ranged basic presentation.
- When the resolved target is within the approved `78 px` close-range threshold, Senku uses a melee-only lunge sequence instead of throwing the bomb at point-blank range.
- The melee-only body sequence is limited to the first two pre-release frames of the existing basic pack; the projectile-release/bomb frame and later throw frame(s) are excluded.
- The close-range branch is presentation-only: it preserves the already-resolved basic target, damage amount, combo/chakra rules, and existing combat action semantics.

## Implemented repair contract

Pass 4.1 introduces `runtime/animation/attack-presentation.js` so four concepts are no longer overloaded onto one rotation/frame field:

1. **Authored fallback attack rotation** — canonical `basic_rotation_deg` / `jutsu_rotation_deg` metadata used when an ability does not request target-relative rotation.
2. **Action-relative range rotation** — an ability may explicitly request `nearest_enemy_facing`, making its mechanical preview/hit cone follow the same enemy direction as the body.
3. **Character-body facing** — visual presentation that may face the exact resolved attack target while the action is playing.
4. **Semantic attack-frame selection** — selects an available body animation and can constrain a close-range presentation to a safe subset of that frame pack.

Sub-Zero canonical presentation keeps `0°` as the fallback rotation but Freeze Blast now declares `range_rotation_mode: nearest_enemy_facing` and `projectile_origin_mode: forward_facing`. Its cone therefore remains forward from Sub-Zero as his facing changes with enemy direction. His normal/helper basic still uses the canonical `punch` presentation; a missing optional `kick` pack falls back to real punch art instead of suppressing the attack animation.

Senku canonical presentation keeps the `78 px` close-range split, but the close branch now requests `melee_clean` with `close_body_frame_count: 2`. That resolves to the existing punch/basic pack while intentionally excluding the projectile-release/bomb frame. Farther valid targets still use the approved Explosive Bomb presentation and current production static impact asset.

No historical `dev-v2` explosion assets or other unpromoted gameplay changes were imported.

## Regression protection

`scripts/validate-gameplay-presentation.mjs` is part of `npm run validate` and verifies:

- exact-target facing lock / clear behavior,
- dynamic `nearest_enemy_facing` action rotation in multiple directions,
- forward-facing Freeze Blast projectile origin contract,
- missing melee-kind fallback to canonical punch art,
- no inappropriate melee fallback for special/Jutsu frame kinds,
- unchanged Freeze Blast cone dimensions, cost, multiplier, timing, and `-35` gauge effect,
- Senku `78 px` close-lunge vs far-bomb selection,
- Senku close melee resolving to exactly two pre-release frames,
- unchanged Senku single-target nearest-in-shape combat semantics,
- shell integration through the shared presentation runtime.

The production build's Senku compatibility migration is idempotent with the Pass 4.1 frame resolver and still preserves the approved Ally Heal path.

## Shared repair rule

Facing and body-animation selection must be fixed through shared attack presentation contracts wherever possible. Do not add one-off `Sub-Zero` or `Senku` sprite flips if the same issue can be solved by passing target/facing policy and semantic animation metadata through the shared attack path.

## Out of scope

Pass 4.1 does not redesign:

- combat damage formulas,
- target/hit geometry dimensions,
- readiness/turn scheduling,
- movement rules,
- combo eligibility,
- KO/victory/defeat orchestration,
- boss AI,
- Anubis `boss_rotation` wiring.

## Promotion gate

Before Pass 5 begins:

1. Structural and behavior regression checks for these presentation contracts must pass.
2. Existing runtime/combat/rendering validation must remain green.
3. The full Cloudflare build must pass on the exact clean PR merge ref.
4. A fresh Cloudflare preview must be manually checked for all four acceptance cases on the intended gameplay viewport, including mobile.
5. Only after that manual verification should `docs/PROJECT_MASTER_STATE.md` and `docs/ARCHITECTURE_BASELINE_V070.md` be updated to declare Pass 4.1 production-complete, the PR be promoted, and a new gameplay-stable checkpoint be frozen.
