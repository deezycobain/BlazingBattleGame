# Blazing Motion Studio 1.0 — milestone report

The existing `animation-lab/` has been upgraded into the first reference and inspection milestone, based on latest fetched `dev` at `f2b8759`, on feature branch `feature/blazing-motion-studio-1`.

## Implemented

- Real Itachi, Obito and approved-design Scorpion idle/run/basic/recoil references where available. Itachi's twelve-frame 420×420 originals remain intact; missing recoil is labeled unavailable.
- Effective runtime versus manifest timing, variable-duration playback slots, frame thumbnails/order/durations, play/pause/loop/step/speed/scrub, shared-time comparison and explicitly retimed cycle-phase comparison.
- Onion skinning, transparent reference overlay, original alpha bounds/feet/center metrics, mirroring, nondestructive runtime-preparation preview and separate gameplay-scale A/B views.
- Local individual-PNG import; actual PNG/RGBA/alpha/dimension/empty-frame/edge/gap/duplicate/registration/occupancy/loop QA. Edited playback order is used for loop analysis. Hard failures and visual-review warnings are separate.
- Twenty editable manual humanoid landmarks, distinct near/far limbs, numeric/click/drag/keyboard placement, unverified guide scaffolds, pose annotation and metadata undo.
- Versioned Gold motion JSON, portable profile/QA/timing core, inheritance with animation-specific overrides, independent event markers, profile/metrics/QA export and source-name/pixel-fingerprint-checked profile restoration.
- Road Rookie's existing four-frame idle pilot beside Itachi's run, with eight illustrated run poses explicitly pending. No fabricated run or automatic artwork approval.

The audit is [ITACHI_GOLD_MOTION_AUDIT.md](ITACHI_GOLD_MOTION_AUDIT.md); workflow and profile details are [animation-lab/README.md](animation-lab/README.md).

## Files

Added: `ITACHI_GOLD_MOTION_AUDIT.md`, this report, `animation-lab/README.md`, `animation-lab/core.mjs`, `animation-lab/studio.mjs`, `animation-lab/studio.css`, `animation-lab/reference-library.json`, `animation-lab/profiles/itachi-gold-v1.json`, `animation-lab/motion-profile.schema.json`, `animation-lab/audit/runtime-resolver-observations.json`, `animation-lab/audit/source-metrics.json`, `scripts/serve-animation-lab.mjs`.

Modified: `animation-lab/index.html`, `scripts/test-animation-lab.mjs`, `scripts/animation-lab-browser-smoke.mjs`, `package.json` (three commands, no dependency changes), `scripts/build-cloudflare.mjs` (exclude scratch `work/`).

No source sprites/assets, game runtime modules, root game shell or visual-standard configuration changed. No main/stable deployment, merge, paid service, dependency purchase or image generation was performed.

## Exact verification commands and results

From `/workspace/experiments/BlazingBattleGame`:

```sh
git fetch origin dev
git switch -c feature/blazing-motion-studio-1 origin/dev
npm run test:motion
STUDIO_BROWSERS=chromium PLAYWRIGHT_MODULE=file:///workspace/.tools/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run smoke:motion
/workspace/.venvs/motion/bin/python scripts/test-qa-sprite-frames.py
/workspace/.venvs/motion/bin/python scripts/qa-sprite-frames.py animation-lab/pilots/road_rookie_idle_20261019 --animation idle --count 4 --strict --report work/motion-studio/road-rookie-qa.json
npm run build
git diff --check
git diff --exit-code origin/dev -- assets runtime index.html config
```

Results:

- **14/14 core tests pass.** Exact time boundaries, wrapping/clamping, legacy counts/timings/active paths, true PNG headers, bad-frame QA, edited-order loop continuity, inheritance/version/cycle errors, manual anatomy validation and game isolation.
- **61 Chromium assertions pass.** Real references, exact cadence, synchronized comparison, rendered onion/reference overlays, normalization preview, local import/QA, timeline edits/undo, pointer anatomy, event/profile save/restore, rejection of guides for different pixels with reused filenames, downloads, playback controls and a 390px layout without horizontal page overflow. Zero page exceptions, mutation requests or missing studio/reference resources.
- **7/7 existing Python tests pass.** The four-frame Road Rookie idle pilot also passes strict structural QA, without artistic approval.
- **Full build passes**, including the existing validation chain and final animation/visual-contract postprocessors. Studio modules/profiles are copied and scratch `work/` is excluded.
- **Whitespace and protected-path diff checks pass**; protected paths have zero changes.

Read-only browser probes of the final built resolvers were also run against fresh 1280px and 390px Chromium contexts; source alpha bounds were measured with Pillow. Their retained evidence is under `animation-lab/audit/`. A mobile-width Chromium/WebKit-UA guard observation is not Safari execution.

## Open locally

```sh
npm run serve:motion
```

Open `http://127.0.0.1:5181/animation-lab/` on the same computer. Node 20+ is sufficient; the included loopback server only serves explicit studio resources and referenced artwork. An owner-private phone review is now available at https://blazing-motion-studio-review.wirydace13.chatgpt.site . Sign in with the same ChatGPT account if prompted. This hosts only the studio browser files, required reference sprites and visual constants; the game deployment is unchanged. The session's configured download-output directory is read-only, so the source, audit and this report are available on the feature branch.

## Limits and next step

Manual anatomy/pose correspondence, character identity, loop quality and artistic approval remain pending. The repository has no established approved Road Rookie master/run cycle; the idle pilot is a reference awaiting review. Exports are metadata/QA rather than newly approved runtime atlases. Local edits require explicit export before refresh.

Legacy neutral-scale emulation uses a fully prepared cached idle reference; live fallback/cache ordering can differ. Camera, depth, pickup pulse/lift, glow and VFX are excluded. New imports use a single fixed production transform and the existing visual standard. Obito's missing V2 requests and final per-frame gameplay placement are audit findings, not gameplay fixes in this milestone.

WebKit's browser binary is not installed in this local environment; local Safari/iPhone execution and full combat end-to-end regressions were not run. CI retains the prior default Chromium + WebKit browser-smoke coverage. Full local build/validation and the isolated Chromium smoke passed.

Next: review this milestone; annotate Itachi's actual near/far contacts and passing poses; confirm the Road Rookie identity master; then illustrate and review his eight run poses at gameplay scale. Keep gameplay routing and character replacement outside that phase until separately approved.

## Follow-up CI evidence

The Animation Lab focused QA workflow completed successfully in both Chromium and WebKit: https://github.com/deezycobain/BlazingBattleGame/actions/runs/40828891669 . Physical Safari/iPhone review remains pending.

The broader game workflow built successfully and passed paired-team and Itachi integration checks, then failed in the unchanged Legacy summon test at its ten-pull action. That test started with the production three-Ember wallet and had already spent one Ember. Its old full-roster inventory and Scorpion twelve-slot expectations also predated current starter ownership and the approved ten-slot quality idle.

The follow-up changes only that presentation test: seed owned Legacy fighters in its isolated browser context, fund exactly eleven Embers through the actual wallet API, assert all eleven are spent, and await/expect Scorpion's real ten-slot quality idle. Production wallet, ownership, sprites and gameplay code remain untouched. Default Chromium + WebKit coverage is retained; environment selectors allow the installed local browser to be used explicitly.

```sh
BB_SMOKE_URL=http://127.0.0.1:4174 BB_SMOKE_BROWSER=chromium PLAYWRIGHT_MODULE=file:///workspace/.tools/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium node scripts/legacy-shinobi-browser-smoke.mjs
```

PASS: Legacy lobby, single reveal/results, ten-pull grid, exact wallet spending, inventory, active runtime and attack-render probes. A new full CI run is required before merge.


## Phone-access follow-up

Added a compact phone controls panel for character selection, comparison, and PNG import, with a Back to viewer action. Local validation passes 14 core tests and 63 Chromium assertions, including opening the phone panel, choosing Obito, and returning to the viewer at 390px. The same static studio is deployed privately through Sites at https://blazing-motion-studio-review.wirydace13.chatgpt.site ; imported frames remain browser-local. No game or account scripts, audit documents, uploaded personal frames or credentials were included in that deployment. Physical iPhone/Safari review remains for the producer.
