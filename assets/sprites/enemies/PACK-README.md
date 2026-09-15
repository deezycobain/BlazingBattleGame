# Blazing Battle Basic Enemy Sprite Pack v1

This pack contains six basic enemy units with matching **idle** and **basic attack**
sprite sheets.

## Folder layout

`assets/sprites/enemies/<unit_id>/`

Each unit folder contains:

- `<unit_id>_idle.png`
- `<unit_id>_attack.png`

## Sprite-sheet standard

- 4 frames per sheet
- horizontal layout
- 2172 × 724 PNG
- 543 × 724 per frame
- transparent background
- frame order: left → right

## Suggested playback

**Idle**
- Loop: yes
- Suggested speed: ~5 FPS
- Optional ping-pong order: `0, 1, 2, 3, 2, 1`

**Attack**
- Loop: no
- Suggested speed: ~10 FPS
- Order: `0, 1, 2, 3`
- Return to idle after frame 3

## Unit IDs

- `road_rookie`
- `rogue_kunoichi`
- `masked_scout`
- `blond_rookie`
- `purple_scarf_kunoichi`
- `mist_rogue`

These are intended as lightweight battlefield enemies and do not require full
collectible/inventory entries.

See `manifest.json` for machine-readable paths and animation metadata.
