# Animation + VFX Standard — v0.6.16

Runtime animation policy:
- Every body animation uses individually exported frame files.
- Full sprite sheets remain source/reference assets only.
- Body frames contain the character body only.
- Projectiles, impacts, explosions, smoke, flashes, meteors, healing symbols,
  trails, and lingering effects remain separate VFX sequences.
- Unit data explicitly maps ordered frames, timing, loops, and events.

Senku:
- Dedicated four-frame recoil replaces the idle fallback.
- Normal bomb body animation is separate from bomb projectile/explosion VFX.
- Revival Formula body animation is separate from bottle, green impact/smoke,
  and party-heal effects.

The existing renderer remains compatible while future animations can migrate
incrementally to the data-driven event system.
