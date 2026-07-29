# Pass 4.1 — Gameplay Presentation Stabilization

Pass 4.1 is a stabilization gate between the completed Pass 4 renderer extraction and Pass 5 character-body extraction.

**Current status:** active candidate on the Pass 4.1 branch; **manual gameplay verification is required before promotion to `main`**. The Senku close-range behavior was intentionally revised after manual feedback, so earlier Pass 4.1 preview approvals do not apply to the current candidate.

## Why this gate exists

Manual testing exposed presentation behavior that automated structural/build tests did not protect. Pass 5 must not extract character-body behavior until these cases are known-good and regression-guarded.

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

### D. Senku close-range evasive Explosive Bomb

- Senku keeps the existing Explosive Bomb target resolution and bomb VFX/damage path.
- When the already-resolved nearest target is within the approved `78 px` close threshold and Senku is the primary attacker, he throws the bomb while simultaneously turning and running directly away from that enemy.
- Retreat distance is randomized uniformly between `48 px` and `88 px`, intentionally below Senku's existing `92 px` movement range so the move reads as a few evasive paces instead of a full-screen escape.
- Retreat destination is clamped to the normal battlefield bounds. No teleport outside the playable field is allowed.
- The bomb releases early during the retreat (`close_bomb_release_ratio: 0.22`) and still damages the original resolved enemy only when the projectile arrives.
- Retreat movement lasts `540 ms` and uses the six-frame run sequence at `90 ms` per frame.
- The final retreat position persists for the primary attacker after the action.
- A helper/combo Senku may still throw the bomb but does **not** permanently reposition the linked pair; this prevents the new move from silently rewriting combo formation/orchestration.
- Farther valid targets retain the existing Explosive Bomb behavior.

## Senku retreat artwork contract

The user-supplied six-pose sheet is preserved under:

`assets/characters/senku/sprites/source/retreat_run/source_sheet.jpg`

Runtime body frames live under:

`assets/characters/senku/sprites/runtime/movement/retreat_run/frame_01.webp` through `frame_06.webp`

The runtime frames were extracted from the supplied sheet and normalized to Senku's existing `420 × 420` animation canvas. They are character-body animation assets; the bomb projectile/explosion remain separate VFX resources.

## Implemented runtime contract

Pass 4.1 uses shared presentation/movement helpers rather than character-specific renderer flips:

- `runtime/animation/attack-presentation.js` — action-facing policy, semantic frame selection, close/far presentation metadata, and reposition scope.
- `runtime/movement/retreat-runtime.js` — bounded retreat distance selection, away-vector destination planning, battlefield clamping, and deterministic interpolation helpers.

Sub-Zero canonical presentation keeps `0°` as the fallback rotation, while Freeze Blast declares `range_rotation_mode: nearest_enemy_facing` and `projectile_origin_mode: forward_facing`.

Senku canonical presentation keeps the `78 px` close threshold but now selects `animateSenkuRetreatBomb` / `retreat_run` for a primary close attack, with `48–88 px` retreat distance, `540 ms` movement, and `0.22` bomb release ratio. Far attacks select the existing `animateSenkuBomb` path.

The source shell continues to own action/combo sequencing. The new Senku driver only owns the explicitly requested close-attack reposition presentation: it computes a bounded plan, renders the temporary retreat position, persists the pair position on completion, and lets the existing bomb callback apply damage on projectile arrival.

No historical `dev-v2` explosion assets or unrelated unpromoted gameplay changes were imported.

## Regression protection

`scripts/validate-gameplay-presentation.mjs` is part of `npm run validate` and verifies:

- exact-target facing lock / clear behavior,
- dynamic `nearest_enemy_facing` Freeze Blast rotation in multiple directions,
- forward-facing Freeze Blast projectile origin contract,
- missing Sub-Zero melee-kind fallback to canonical punch art,
- unchanged Freeze Blast cone dimensions, cost, multiplier, timing, and `-35` gauge effect,
- deterministic retreat RNG endpoints at `48 px` / `88 px`,
- retreat direction increasing distance from the threat,
- battlefield clamping and finite overlap fallback,
- retreat interpolation endpoints,
- Senku `78 px` close-retreat vs far-bomb selection,
- primary-attacker-only reposition scope,
- six physical retreat runtime frames plus preserved source sheet,
- runtime-map and manifest routing for `senku.animation.retreat_run`,
- unchanged Senku `damage_target` action on projectile arrival,
- shell integration of persistent primary retreat without replacing turn/combo orchestration.

The production build's Senku Ally Heal compatibility migration remains separate and must continue preserving the approved Ally Heal path.

## Shared repair rule

Facing, body-animation selection, and bounded retreat planning should be data-driven/shared where possible. Do not add one-off sprite flips or arbitrary screen coordinates when a reusable presentation/movement contract can express the behavior.

## Out of scope

Pass 4.1 still does not redesign:

- combat damage formulas,
- target/hit geometry dimensions,
- readiness/turn scheduling,
- general movement rules outside the explicitly requested Senku close-attack retreat,
- combo eligibility/order/scaling,
- KO/victory/defeat orchestration,
- boss AI,
- Anubis `boss_rotation` wiring.

## Promotion gate

Before Pass 5 begins:

1. Structural and behavior regression checks for these presentation contracts must pass.
2. Existing runtime/combat/rendering validation must remain green.
3. The full Cloudflare build must pass on the exact clean PR merge ref.
4. A fresh Cloudflare preview must be manually checked for Sub-Zero facing/animation plus Senku's close bomb-and-retreat behavior, including mobile.
5. Only after that manual verification should `docs/PROJECT_MASTER_STATE.md` and `docs/ARCHITECTURE_BASELINE_V070.md` be updated to declare Pass 4.1 production-complete, the PR be promoted, and a new gameplay-stable checkpoint be frozen.
