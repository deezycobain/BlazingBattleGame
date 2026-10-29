# Blazing Motion Studio 1.0

This is the existing Animation Lab upgraded into an independent reference and inspection workstation. It does not load game scripts, touch accounts/saves, edit sprites, or perform image generation. No paid services or new dependencies are required.

## Open locally

From the repository root, with Node 20+:

```sh
npm run serve:motion
```

Open `http://127.0.0.1:5181/animation-lab/` on that same computer. `STUDIO_PORT=5182 npm run serve:motion` selects another local port. The included server serves only explicit studio resources and reference artwork over loopback. Phone review is hosted separately at https://blazing-motion-studio-review.wirydace13.chatgpt.site with owner-only ChatGPT sign-in; the game deployment is unchanged. The studio is also included by the existing static game build; use its `/animation-lab/` path when reviewing a separately authorized preview.

## Phone review

Open https://blazing-motion-studio-review.wirydace13.chatgpt.site in Safari or Chrome and sign in with the same ChatGPT account if asked. Tap **Characters & import** to open the controls panel; tap **Back to viewer** to close it. Play and step controls remain in the viewer. Local PNG imports use the phone file picker and stay on the device. This is a static review copy of the same Animation Lab, with only its required reference sprites and visual constants; no game/account code is hosted there.

## First inspection

1. Itachi's real twelve-frame run loads by default, at 85 ms per source pose. Play, pause, scrub or step; inspect original 420×420 geometry without rewriting it.
2. Choose Obito or Scorpion on A or B. Shared elapsed time preserves each sequence's actual cadence. Cycle-phase lock deliberately retimes B for pose comparison; its label makes that distinction explicit.
3. Use **Effective runtime / Declared manifest** to inspect timing differences. Scorpion idle has six sources but ten ping-pong slots; Obito basic ends at 360 ms and only presents its first three source poses in the current driver. Manifest mode exposes all source poses. Recoil is desktop-only, shown at the normal 180 ms hit duration; strong hit duration is 230 ms. Itachi recoil is unavailable.
4. Matched body scale is the default comparison view. It uses one constant transform per sequence against the median body height of that sequence, so a 600px production body compares fairly with Itachi’s 391px legacy body. A shared fit keeps wide poses visible without per-frame resizing. Untouched source shows original pixels. Runtime preparation preview reproduces Scorpion's sequence transform/edge cleanup, and labels the older per-frame desktop recoil behavior. All such operations use temporary canvases. The game-size canvases separately show the audited neutral legacy placement or the 96px production target. Legacy placement is an emulation with a fully prepared idle reference; real cold-cache occupancy can differ, and camera/depth, pickup and selection effects are excluded.
5. Import individual PNGs. Files are naturally sorted, decoded locally, checked as actual PNG/RGBA, and validated against `config/fighter-visual-standard.json`. Up to 96 frames per import, max 4096px side / 8MP per frame. Timeline holds/reordering leave source PNGs alone. The initial 6–8-frame targets are review guidance, never fixed limits.
6. Enable onion skin or the translucent B overlay; inspect bounds, center axis, feet and silhouette changes. The source viewer aligns sequence anchors to its ground guide using one transform per sequence.
7. Add the editable anatomy scaffold, then click/drag points or enter source coordinates. Near/far limbs have separate points. Arrow keys move a selected point by 1px (Shift: 10px). Source-coordinate editing is available in matched and untouched views; guides do not bend the artwork. Every scaffold and placed guide remains unverified until visual review. Annotate the pose phase separately.
8. Inherit Gold timing for your selected artwork count, then edit individual durations, source order and events as needed. Event times are milliseconds, independent of frame indices; body and VFX can be labeled separately. No event executes game code.
9. Export QA, reference metrics and editable profile JSON. Reimport the same PNGs before restoring a saved profile; exact source-name ordering and saved decoded-pixel fingerprints are checked. JSON does not embed or upload artwork. Refreshing the page discards unsaved edits. Undo restores up to thirty metadata edits during the current session.

**Prepare Road Rookie workspace** opens an empty working pane beside Itachi's real run and lists eight pending illustrated run poses. The rejected pilot files have been deleted from the studio. The approved replacement must be attached in chat for production; importing it on a phone keeps it only in that browser. No run artwork is fabricated. The pending-pose checklist remains visible when importing artwork into that workspace.

## Portable profiles

`profiles/itachi-gold-v1.json` contains the versioned initial Gold reference. `core.mjs` is DOM/game-independent: time sampling, profile inheritance, manual pose data and QA can be reused by other pipelines. Child profiles use `extends` with a profile ID. Per-animation fields override inherited fields while unspecified animation metadata remains inherited. Cycle/missing-parent/version errors are rejected. Events, source artwork and anatomical approval are separate concerns; inheriting timing never proves that two characters' poses correspond.

`motion-profile.schema.json` documents the JSON contract. Source geometry is governed by the existing fighter standard. New production imports use one fixed sequence transform and the existing size-class authority, with independent VFX. Legacy reference exceptions are explicitly preserved. Runtime integration/atlas packing/Godot conversion is outside this milestone.

## Verification

```sh
npm run test:motion
npm run smoke:motion
python3 scripts/test-qa-sprite-frames.py
python3 scripts/qa-sprite-frames.py assets/characters/obito/sprites/runtime/run --animation run --count 12 --strict
npm run build
```

Browser tests retain the existing Chromium and WebKit coverage by default, using the existing Playwright dependency. If Playwright is in a shared location or uses system Chromium:

```sh
STUDIO_BROWSERS=chromium PLAYWRIGHT_MODULE=file:///workspace/.tools/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run smoke:motion
```

`STUDIO_BROWSERS=chromium` explicitly selects the locally available browser when WebKit is not installed; CI retains both browsers. The default browser evidence is under `work/motion-studio/browser/`; `STUDIO_ARTIFACTS` overrides that directory. The static build excludes scratch `work/` from its output. Chromium at 390px tests responsive layout, not iPhone Safari execution.

Read `../ITACHI_GOLD_MOTION_AUDIT.md` for active-path precedence, measured source geometry, cold-cache behavior, effective runtime timing and the remaining production decisions. Technical QA never supplies anatomical or artwork approval.
