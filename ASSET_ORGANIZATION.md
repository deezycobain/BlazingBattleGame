# Blazing Battle Asset Organization — v0.5.24

This is an **asset-only reorganization checkpoint** based on v0.5.23. The live `index.html` is copied unchanged so combat behavior is not altered.

## Canonical structure

- `assets/characters/<character>/` — each finished character owns sprites, cards, portraits, and character data.
- `assets/enemies/ghosts/<enemy>/` — standard enemy art separated from playable characters.
- `assets/maps/level/` — normal-stage maps.
- `assets/maps/boss/` — boss-specific maps.
- `assets/effects/attacks/` — projectiles, impacts, beams, elemental attacks.
- `assets/effects/field/` — persistent battlefield hazards/zones.
- `assets/effects/status/` — freeze/burn/poison/curse/stun/buff/debuff visuals.
- `assets/effects/summon/` — card reveal and rarity presentation VFX.
- `assets/effects/ui/` — victory and other UI presentation FX.
- `assets/ui/` — battle, summon, menu and character-detail UI assets.
- `assets/audio/` — music and SFX.
- `assets/archive/` — disabled placeholder/legacy assets preserved for rollback.

## Active character folders

### Crimson
`assets/characters/crimson/` contains the approved source sheet, normalized runtime idle/basic/Jutsu frames, and the legacy summon card retained separately.

### Sub-Zero
`assets/characters/subzero/` contains the original source pack, runtime idle/basic/recoil/walk assets, and the Freeze Blast source sheet plus extracted cast/projectile frames.

### Anubis
`assets/characters/anubis/` contains the current embedded runtime battle sprite/idle and separate legacy summon card. Future Anubis authored animation frames should be added here.

## Enemies
Onre, Gotoku and Yurei are under `assets/enemies/ghosts/` and are not mixed with playable-character folders.

## Legacy assets
Disabled characters and placeholder ninja cards were **not deleted**. They were extracted from the standalone bundle and placed under `assets/archive/`.

## Runtime safety
The standalone v0.5.23 runtime still embeds its assets internally. This package does **not** rewrite those runtime references yet. That intentionally avoids introducing new path/loading bugs while we clean the source library. Future builds can migrate runtime loading to these canonical paths one system at a time.

## Rollback
`_rollback_v0523/` contains the exact v0.5.23 standalone and project ZIP used as the parent checkpoint.


## v0.5.27 Sub-Zero attack fix
Restored the approved Sub-Zero Basic Hit/punch runtime animation. Freeze Blast remains a separate Jutsu animation; adding a Jutsu must not overwrite normal attack sprite mappings.
