# Itachi Gold Motion Audit

Audited base: `f2b8759` (`origin/dev`, fetched for this attempt). Read the final `dist/index.html` produced by `npm run build`, not the embedded root shell alone. Browser resolver probes on desktop (1280 px) and mobile (390 px Chromium/WebKit user-agent guard) decoded actual frames. These are controlled browser observations, not an iPhone hardware certification. No approved sprites are changed. Machine-readable evidence is retained in `animation-lab/audit/runtime-resolver-observations.json` and `animation-lab/audit/source-metrics.json` (the latter also measures superseded packs for comparison).

## Resolution and effective playback

| Character / motion | Final source | Distinct source frames / playback | Manifest timing | Effective renderer timing |
| --- | --- | --- | --- | --- |
| Itachi idle | `assets/characters/itachi/sprites/runtime/idle` | 12 / forward | 100 ms | 165 ms; 1980 ms cycle |
| Itachi run | `assets/characters/itachi/sprites/runtime/run` | 12 / forward | 85 ms | 85 ms; 1020 ms cycle |
| Itachi basic | `assets/characters/itachi/sprites/runtime/attack/basic` | 12 / forward | 85 ms | 85 ms; 1020 ms body; release at 340 ms, impact at 1020 ms, presentation ends 1360 ms |
| Obito idle | `assets/characters/obito/sprites/runtime/idle` | 6 / forward | 145 ms | 205 ms; 1230 ms cycle |
| Obito run | `assets/characters/obito/sprites/runtime/run` | 12 / forward | 85 ms | 85 ms; 1020 ms cycle |
| Obito basic | `assets/characters/obito/sprites/runtime/attack/basic` | 6 / first 3 visible | 120 ms | 720 ms progress across 6 frames = 120 ms/frame, but body state is deleted at release 360 ms; later three poses are unreachable in this driver |
| Obito recoil | `assets/characters/obito/sprites/runtime/v2/recoil` | 12 | Not declared | Hit-duration driven: normal 180 ms, strong 230 ms; desktop uploaded route only |
| Scorpion idle | `assets/characters/scorpion/sprites/runtime/idle` | 6 / 10 slots: 0,1,2,3,4,5,4,3,2,1 | 145 ms | 205 ms; 2050 ms after quality sequence is ready |
| Scorpion run | `assets/characters/scorpion/sprites/runtime/run` | 12 / forward | 1000/24 ms | 72 ms; 864 ms cycle |
| Scorpion basic | `assets/characters/scorpion/sprites/runtime/attack/basic` | 6 / held poses | 120 ms | 80 ms slots [0,1,2,3,4,4,5,5,5,5], clamped to final pose until 990 ms; release 350 ms, impact 740 ms |
| Scorpion recoil | `assets/characters/scorpion/sprites/runtime/v2/recoil` | 12 | Not declared | 180/230 ms hit-driven; desktop uploaded route, NOT the quality runtime recoil method |

Sources: `scripts/itachi-playable-postprocess.mjs:105` and `:202`; `scripts/itachi-motion-postprocess.mjs`; `scripts/obito-run-postprocess.mjs`; `scripts/uploaded-character-motion-postprocess.mjs`; `scripts/animation-quality-postprocess.mjs`; `scripts/animation-v2-finalize-postprocess.mjs`; final `drawUnit`, `unitIdleFrames`, `unitAttackFrames`, `animateObitoFireball`, `animateScorpionSpearStrike`, `startHitReaction` in built output. Metadata: each unit's `data/unit.json`; runtime maps can omit states or describe superseded handlers.

Itachi has no dedicated recoil sequence. The studio must say unavailable, not substitute idle. Recoil availability for Obito/Scorpion is desktop-specific; the mobile uploaded guard excludes both. No recoil cadence is hard-coded as an authored FPS.

### Precedence and cold-cache behavior

Final idle/run order is quality-ready → September pack → uploaded-ready → Itachi → Madara → Obito held legacy run → legacy idle → older fallback. Basic uses quality-ready → September → uploaded-ready (excluding Scorpion) → Madara → legacy → Itachi → older fallback. `unitAttackFrames` therefore does not simply follow runtime-map JSON.

Obito's desktop uploaded resolver attempts 12-frame V2 idle, run and attack directories that do not exist in this revision. Only V2 recoil exists. Failed readiness returns the real legacy frames. Mobile avoids these uploaded attempts. Thus code advertising a pack does not make it active. The missing requests are a plausible cold-start contributor, not a measured root-cause determination of input latency.

Scorpion's quality path owns approved six-frame idle/basic and direct twelve-frame run. V2 idle/run/attack remain on disk but are superseded. Its quality normalizer loads and measures the complete sequence asynchronously, then decodes outputs one at a time; readiness requires every output. Until ready, fallback art can render. The final Scorpion idle is ten playback slots after its six normalized sources are ready. A probe that samples the first return observes the six-frame fallback instead.

Itachi idle/run/basic are eager `makeImageFrames` calls. Legacy arrays are cached by name/kind and lazy. Uploaded warmup queues only three URLs per kind, not a complete decoded run. Encounter preparation awaits provided idle/attack arrays, but this does not prove every held-run sequence is predecoded. The ordinary idle clock uses `floor((performance.now()+idlePhase*7)/idleMs)`: it does not restart at frame zero on pickup. Drag state uses persistent `S.dragUnitName`/`S.dragUnitRef`; this avoids switching based on the last rendered unit. Direction changes after >=1.25 px horizontal pointer movement. Right-facing art is horizontally mirrored by authoritative facing; attack facing is locked separately. Itachi's pickup-origin ghost deliberately uses idle.

## Measured source geometry

Alpha silhouette cutoff is >12, bounds use exclusive right/bottom.

| Source | Canvas | Visible height range | Feet bottom range | Bounds center X range |
| --- | --- | --- | --- | --- |
| Itachi idle | 420×420 | 390–392 | 402 | 209.5–210 |
| Itachi run | 420×420 | 378–392 | 402 | 209.5–210 |
| Itachi basic | 420×420 | 286–370 | 402 | 209.5–210 |
| Obito idle | 512×768 | 703–704 | 741–742 | 255.5–256 |
| Obito run | 512×768 | 505–615 | 700 | 255.5–256 |
| Obito basic | 512×768 | 485–642 | 741–742 | 255.5–256 |
| Scorpion idle | 512×768 | 704 | 742 | 255.5–256 |
| Scorpion direct run | 512×768 | 400–535 | 646–741 | 259–296 |
| Scorpion basic | 512×768 | 403–626 | 742 | 256–256.5 |

Itachi's metadata anchor is (210,392), while the measured silhouette bottom is 402. Preserve both facts. Bounds are not anatomical joint positions: clothing, hair and VFX can change them. No anatomical approval is inferred from these measurements.

### Two separate runtime normalization stages

Scorpion quality normalization discards small disconnected edge-column debris and computes one fit, DX and DY per sequence: fit = min(1.60,600/maxBodyH,maxWidth/maxBodyW), with maxWidth idle/recoil=420, run=440, attack=448; center and bottom are sequence medians. It outputs 512×768. The studio offers this preview plus untouched source inspection. No files are rewritten.

However, `runtime/combat/combat-presentation-controller.js:30` subsequently calculates `spritePlacement` from current-frame silhouette height/bottom and a cached idle reference. **The effective legacy renderer still changes frame scale and feet placement individually.** This can suppress airborne motion and cause scale pumping; it is not a suitable new production normalization rule. Scorpion desktop recoil uses the older uploaded per-frame center/742 transform, not the quality method. The idle reference is cached on its first successful measurement, which may be fallback art before quality normalization finishes. Consequently legacy neutral size can depend on cold-start readiness. The studio emulates a fully prepared idle reference and labels that assumption; it does not claim identical size under every startup ordering. These facts are exposed as legacy runtime emulation, not adopted for new artwork.

Final size authority is `config/fighter-visual-standard.json`, injected by `scripts/fighter-visual-contract-postprocess.mjs`. Neutral base canvas height before source occupancy is 68×1.14×1.07×1.09×1.27995 logical px, multiplied by size class and legacy compensation (Itachi 0.960288). Visible-body height also depends on idle occupancy and `spritePlacement`; the 96 logical px target is not proof that every legacy body actually measures exactly 96. Road depth/camera, active pulse and pickup lift/scale modify this further. The studio labels its neutral legacy display separately from the 96px production target.

## Reuse and boundaries

Reuse data-driven durations, independent body/VFX events, persistent movement identity, decoded sequence readiness, bottom-center origins, centralized size classes, horizontal facing, and nondestructive sequence metrics. Gold Itachi run is twelve unchanged source poses over 1020 ms. Its stable center/feet are useful references. Cloak silhouette, crow release, pickup bob (0.65 px), small scale pulse and attack silhouette are character-specific, not universal anatomy or motion rules.

The studio's portable v1 profile separates artwork references, playback slots, source/production geometry, events, manual landmarks, provenance, review state and inheritance. Six to eight distinct poses are new production targets, not limits; existing 10/12 playback/source sequences remain intact. Do not impose the older document's preferred twelve frames on future imports. Manual pose guides remain unverified scaffolds until placed and reviewed. Alternating contacts, compression, passing, opposing arms and flight require artist inspection.

Existing `scripts/qa-sprite-frames.py` checks real PNG mode, dimensions, alpha, boundaries, numbered gaps, body height and idle drift; `scripts/test-qa-sprite-frames.py` exercises it. Existing Animation Lab supported local PNGs, four-cell enemy references and the Road Rookie pilot, but lacked real playable-unit references, effective timing, anatomical metadata and timeline profiles. Upgrade that application in place. Keep legacy sample/pilot access.

## Road Rookie

`animation-lab/pilots/road_rookie_idle_20261019/` has four flattened idle pilot poses, explicitly awaiting review. The legacy enemy four-cell sheets are reference-only and differ in proportions. Do not combine them into a supposed approved run. The new workspace loads the pilot alongside Itachi's real run and lists missing near/far contact, compression, passing and flight poses. Face, outfit, harness, coverings, shin guards and proportions are locked to approved identity references supplied by the producer. No run art is fabricated; approval/master provenance outside this repository remains unresolved.

Next: manually annotate and review the Gold run at gameplay scale; approve the Road Rookie identity master and eight illustrated run poses; validate them without gameplay integration. Gameplay routing changes require the separate milestone review requested in the brief.
