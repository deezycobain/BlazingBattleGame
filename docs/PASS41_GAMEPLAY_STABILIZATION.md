# Pass 4.1 — Gameplay Presentation Stabilization

Pass 4.1 is a stabilization gate between the completed Pass 4 renderer extraction and Pass 5 character-body extraction.

**Current status:** active candidate on the Pass 4.1 branch; **manual gameplay verification is required before promotion to `main`**. Senku's Basic presentation was intentionally revised after manual feedback, so earlier Pass 4.1 preview approvals do not apply to the current candidate.

## Why this gate exists

Manual testing exposed presentation behavior that automated structural/build tests did not protect. Pass 5 must not extract character-body behavior until these cases are known-good and regression-guarded.

## Locked acceptance cases

### A. Sub-Zero Freeze Blast range / facing presentation

- Freeze Blast must always project forward from Sub-Zero's current body facing.
- Sub-Zero's body facing follows the nearest live enemy during preview/commit, so the cone may point right, left, upward, downward, or diagonally depending on enemy direction.
- The projectile origin must stay on the forward side of his body rather than always spawning from screen-right.
- Freeze Blast keeps its long `205 px` reach but uses the approved thinner cone (`a: 0.52`).
- Damage, target eligibility, projectile timing, freeze hold, and the `-35` gauge effect remain unchanged.

### B. Sub-Zero regular basic attack

- Sub-Zero must face the resolved enemy during the attack performance.
- The supplied Sub-Zero basic body animation must be visible during the lunge/strike instead of silently falling back to idle art.
- Damage timing and amount remain unchanged.

### C. Sub-Zero combo/helper basic attack

- When Sub-Zero joins a valid player combo as a helper, he must face the combo target.
- His supplied basic body animation must visibly play during his helper strike.
- Combo membership, order, damage scaling, chakra gain, recoil, and target selection remain unchanged.

### D. Senku directional Explosive Bomb retreat

- Senku Basic uses real directional **pear-shaped** range geometry, not a cosmetic overlay.
- The approved pear is deliberately short and thin (`rear: 24`, `reach: 82`, `width: 58`) so Senku must begin relatively close before creating distance with the retreat.
- The pear rotates toward the nearest live enemy and uses the same mathematical shape for preview and hit testing.
- Any valid primary Senku Basic uses the evasive bomb-retreat presentation; the earlier `78 px` close-only split is retired.
- Senku throws Explosive Bomb while simultaneously turning/running directly away from the already-resolved target.
- Retreat distance is randomized between `64 px` and `144 px`, producing visibly more variation while remaining battlefield-clamped.
- Retreat destination is clamped to normal battlefield bounds.
- The bomb releases late enough for the six-frame retreat sequence to visibly read (`close_bomb_release_ratio: 0.68`, canonical release event on frame 5).
- Bomb damage remains single-target and applies to the original resolved target on projectile arrival.
- Retreat movement lasts `540 ms` and uses six body frames at `90 ms` per frame.
- The primary attacker's final retreat position persists after the action.
- A helper/combo Senku does not permanently reposition the linked pair; turn/combo orchestration remains shell-owned.

### E. Senku dedicated melee body animation

The newest Asset Inbox upload labeled **Senku melee attack** is a separate canonical body-animation resource. Semantic melee/lunge requests for Senku must use this artwork instead of the bomb-bearing throw body frames.

- Dedicated melee animation: six frames at `100 ms` per frame.
- Canonical contact event: frame 6.
- Melee body art is separate from Explosive Bomb projectile/VFX and from the retreat-run presentation.
- Senku helper/combo attacks use the shared `animateLunge` driver with the dedicated melee animation; they do not use `animateSenkuBomb`.
- A legacy explicit `bomb_throw` frame request remains a separate fallback to the historical bomb/basic body pack, but it is not the active helper/combo route.
- Shared frame resolution performs this semantic routing; no Senku-only renderer flip or duplicate combat mutation is introduced.

## Senku artwork contract

The current Asset Inbox source sheet is preserved under both owning source semantics because it supplies the approved poses used by this candidate:

- `assets/characters/senku/sprites/source/attack/melee/source_sheet.webp`
- `assets/characters/senku/sprites/source/retreat_run/source_sheet.webp`

Tracked runtime body frames live under:

- `assets/characters/senku/sprites/runtime/attack/melee/frame_01.webp` through `frame_06.webp`
- `assets/characters/senku/sprites/runtime/movement/retreat_run/frame_01.webp` through `frame_06.webp`

All runtime frames are normal repository assets on Senku's existing `420 × 420` animation canvas. There is no build-time tar/materialization dependency. The bomb projectile/explosion remain separate VFX resources.

## Implemented runtime contract

Pass 4.1 uses shared presentation/movement helpers rather than character-specific renderer flips:

- `runtime/animation/attack-presentation.js` — exact-target facing, action-relative range rotation, semantic body-frame resolution, canonical animation-frame loading, and reposition scope.
- `runtime/movement/retreat-runtime.js` — bounded retreat distance selection, away-vector destination planning, battlefield clamping, and deterministic interpolation helpers.

Sub-Zero canonical presentation keeps `0°` as fallback rotation, while Freeze Blast declares `range_rotation_mode: nearest_enemy_facing` and `projectile_origin_mode: forward_facing`.

Senku canonical Basic declares the short/thin directional pear geometry plus `range_rotation_mode: nearest_enemy_facing`, `animateSenkuRetreatBomb`, `retreat_run`, and primary-attacker reposition. The dedicated melee resource is declared as `melee_animation_kind: melee_attack`; runtime routing declares `senku.animation.retreat_run` as the primary Basic animation and `senku.animation.melee_attack` as the helper/combo presentation animation.

The source shell continues to own action/combo sequencing. The production compatibility pass switches a non-repositioning helper Senku to the shared lunge driver while leaving the primary attacker on the retreat driver. The existing bomb callback still applies damage on projectile arrival.

No historical `dev-v2` explosion assets or unrelated unpromoted gameplay changes were imported.

## Regression protection

`scripts/validate-gameplay-presentation.mjs` is part of `npm run validate` and verifies:

- exact-target facing lock / clear behavior,
- dynamic `nearest_enemy_facing` Freeze Blast rotation in multiple directions,
- forward-facing Freeze Blast projectile origin contract,
- missing Sub-Zero melee-kind fallback to canonical punch art,
- approved thin Freeze Blast cone (`r: 205`, `a: 0.52`) with unchanged cost, multiplier, timing, and `-35` gauge effect,
- deterministic Senku retreat RNG endpoints at `64 px` / `144 px`,
- retreat direction increasing separation from the target,
- battlefield clamping and finite overlap fallback,
- retreat interpolation endpoints,
- Senku short/thin directional pear geometry (`24 / 82 / 58`) and nearest-enemy rotation,
- all-distance primary bomb-retreat selection,
- six tracked retreat runtime frames and canonical source sheet,
- six tracked dedicated melee runtime frames and canonical source sheet,
- semantic `punch`, `kick`, and explicit `melee_attack` requests resolving only to dedicated melee art,
- primary-retreat/helper-melee runtime-map and manifest routing,
- helper/combo Senku using `animateLunge` instead of `animateSenkuBomb`,
- unchanged Senku `damage_target` action on projectile arrival,
- shell integration of persistent primary retreat without replacing turn/combo orchestration,
- absence of the retired tar archive/materializer workflow.

The production build's Senku Ally Heal compatibility migration remains separate and must continue preserving the approved Ally Heal path.

## Asset ingestion rule

User-supplied artwork follows `dev-tools/DIRECT_ASSET_WORKFLOW.md`: source art is preserved in the owning character tree, processed runtime frames are tracked as ordinary binary assets, canonical data is updated only after those files exist, and validation fails closed if declared frames are missing. Temporary write-enabled import machinery must not remain in a promotion candidate.

## Shared repair rule

Facing, body-animation selection, range geometry, and bounded retreat planning should be data-driven/shared where possible. Do not add one-off sprite flips or arbitrary screen coordinates when a reusable presentation/movement contract can express the behavior.

## Out of scope

Pass 4.1 still does not redesign:

- combat damage formulas,
- readiness/turn scheduling,
- general movement rules outside the explicitly requested Senku attack retreat,
- combo eligibility/order/scaling,
- KO/victory/defeat orchestration,
- boss AI,
- Anubis `boss_rotation` wiring.

The only target/hit geometry intentionally changed in this stabilization pass is Senku Basic's approved directional pear shape and the explicitly requested Sub-Zero Freeze Blast cone thickness.

## Promotion gate

Before Pass 5 begins:

1. Structural and behavior regression checks for these presentation contracts must pass.
2. Existing runtime/combat/rendering validation must remain green.
3. The full Cloudflare build must pass on the exact clean PR merge ref.
4. A fresh Cloudflare preview must be manually checked for Sub-Zero facing/animation and thinner cone, Senku's short/thin pear range and visible larger/random bomb-retreat animation, and Senku's dedicated helper/combo melee body animation, including mobile.
5. Only after that manual verification should `docs/PROJECT_MASTER_STATE.md` and `docs/ARCHITECTURE_BASELINE_V070.md` be updated to declare Pass 4.1 production-complete, the PR be promoted, and a new gameplay-stable checkpoint be frozen.
