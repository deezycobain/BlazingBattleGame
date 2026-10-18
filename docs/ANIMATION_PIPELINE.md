# Animation Lab Pilot (Common Characters)

Status: isolated developer tooling on dev. **Not** a replacement for the runtime and **not** approval of any generated sprites.

## Launch

After deploying dev, open `/animation-lab/index.html` under the dev workers URL.
Local build: `npm run build && npm run serve:dist`, then open `http://127.0.0.1:4173/animation-lab/index.html`.

The lab is intentionally standalone: it has no game-state writes, no unit registration, no summon-pool activation, and no effect on Road save compatibility. The existing Road Rookie and five other enemy sheets are **legacy visual examples**, not quality-approved playable character sprites. Their current PNGs have known contamination/fallback problems.

## Review workflow

1. Approve a **single**, high-resolution, transparent full-body visual master with stable identity, outfit, silhouette, direction, and proportions.
2. Author a small set of meaningfully distinct poses (2-3 for idle pilot) as **individual PNG files**. Do not generate another 12-pose atlas without proving continuity.
3. Load local numbered frames in the lab, play at intended timing, scrub, optionally onion-skin and compare against approved PNGs. Reject failed anatomy, silhouette wobble, looping or expression immediately.
4. Normalize approved poses into canonical **512x768 RGBA PNG** files in sequential names (`frame_01.png`, etc.). For grounded idle frames, source feet land on y=700 (±8), visible character height targets 600±30. Preserve the same transform for the whole sequence.
5. Run automatic QA, fix structural defects, review at gameplay scale, then integrate on dev via the existing active rendering route. Approval requires a working gameplay loop, not just a sheet.
6. Once the unit is visually approved and integrated, expand to the next Common and reuse only truly compatible motions.

## Structural QA and packing

Pillow is required (`python3 -m pip install Pillow` if missing).

```bash
python3 scripts/test-qa-sprite-frames.py
node scripts/test-animation-lab.mjs
python3 scripts/qa-sprite-frames.py /path/to/road_rookie/idle --animation idle --count 6 --strict --report /tmp/road-qa.json
python3 scripts/qa-sprite-frames.py /path/to/source/poses --mode source --report /tmp/source-qa.json
python3 scripts/qa-sprite-frames.py /path/to/runtime/idle --count 12 --pack-dir /tmp/atlas-preview
```

Hard failures include invalid dimensions, missing RGBA transparency, empty art, visible pixels at rectangular crop edges, and missing/duplicate frame indices. Warnings flag source art under 700px, insufficient source margins, bad idle feet/height alignment, gross silhouette drift, and identical frames. `--strict` treats warnings as blocking. JSON reports are exportable for review; inputs are never altered.

**Source margins are not runtime gutters.** Individually generated source poses should aim for 96px clear padding. Final 512x768 runtime frames have a standardized feet baseline at y=700, leaving 68px at the bottom. Packing copies full frame rectangles: it does not mask irregular polygons or attempt to salvage clipped source art. Six runtime frames produce one deterministic 3x2 atlas; twelve produce two. Those atlases are preview/export artifacts only until corresponding runtime metadata and loader integration are approved.

The browser lab QA is an instant preliminary check. The Python CLI is the final structural gate. Neither can automatically certify anatomy, identity, motion quality, or gameplay correctness.

## Scope / guardrails

- No skeletal puppet or mesh warping is introduced.
- Do not modify Atlas Contract v1 or force a universal 12-frame runtime in this pilot. Existing builds use both six-frame and twelve-frame animation routes; select the actual active route only after approved motion exists.
- Source character and VFX stay separate. No injected image-resizing hacks or generated-shell animation overrides.
- Current six enemies remain `enemy_basic`, not full roster/inventory/summon entries. The new Common and Uncommon characters remain gated on separate QA, integration, and producer approval.
- Max two retries for the same AI failure mode before switching authoring method; quality is the release gate, not frame-count quotas.
