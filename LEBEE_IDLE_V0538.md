# Lebee Idle Asset Rebuild — v0.5.38

The runtime idle PNGs were completely replaced from the user-supplied
four-frame idle sheet.

## Fix
Previous runtime files were discarded.

New frames use:
- one 420×420 canvas size
- one fixed lower-body X anchor
- one fixed baseline
- one normalized visible height
- transparent background reconstructed from the source sheet
- no procedural bob
- no procedural rotation

Live loop:
1 → 2 → 3 → 4 → 3 → 2

Frame time: 520 ms.

The supplied sheet is preserved as:
`assets/characters/lebee/sprites/source/lebee_idle_sheet_v0538.jpeg`
