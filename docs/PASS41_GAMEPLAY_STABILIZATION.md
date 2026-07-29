# Pass 4.1 — Gameplay Presentation Stabilization

Pass 4.1 is a stabilization gate between the completed Pass 4 renderer extraction and Pass 5 character-body extraction.

## Why this gate exists

Manual testing of the Pass 4 Cloudflare preview exposed presentation behavior that automated structural/build tests did not protect. Pass 5 must not extract character-body behavior until these cases are known-good and regression-guarded.

## Locked acceptance cases

### A. Sub-Zero Freeze Blast range presentation

- The Jutsu preview must read as a directional attack extending from Sub-Zero toward his facing/target direction.
- It must not appear rotated 90 degrees relative to the intended attack direction.
- Canonical Freeze Blast combat geometry remains the existing cone (`r: 205`, `a: 1.05`) unless comparison with the frozen v0.7 gameplay checkpoint proves canonical data itself is wrong.
- Damage, target eligibility, projectile timing, freeze hold, and the `-35` gauge effect must remain unchanged.

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
- When the resolved target is within the established close/melee presentation threshold, Senku must use his supplied basic punch/strike body animation rather than throwing the bomb at point-blank range.
- The close-range branch is presentation-only: it must preserve the already-resolved basic target, damage amount, combo/chakra rules, and normal impact timing semantics appropriate to the melee presentation.

## Shared repair rule

Facing and body-animation selection must be fixed through shared attack presentation contracts wherever possible. Do not add one-off `Sub-Zero` or `Senku` sprite flips if the same issue can be solved by passing the resolved attack target/facing and semantic animation kind through the shared attack path.

## Out of scope

Pass 4.1 must not redesign:

- combat damage formulas,
- target/hit geometry beyond correcting the visual orientation bug,
- readiness/turn scheduling,
- movement rules,
- combo eligibility,
- KO/victory/defeat orchestration,
- boss AI,
- Anubis `boss_rotation` wiring.

## Promotion gate

Before Pass 5 begins:

1. Structural regression checks for these presentation contracts must pass.
2. Existing runtime/combat/rendering validation must remain green.
3. The full Cloudflare build must pass on the exact PR merge ref.
4. A fresh Cloudflare preview must be manually checked for the four acceptance cases on the intended gameplay viewport, including mobile.
5. Only after that manual verification should Pass 4.1 be promoted and frozen as the new gameplay-stable checkpoint.
