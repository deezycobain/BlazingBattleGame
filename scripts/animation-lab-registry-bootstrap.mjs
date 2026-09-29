import fs from 'node:fs/promises';

// Feature-branch bootstrap only. The current dev runtime-map already declares
// scorpion.animation.run and scorpion.animation.recoil, but the production
// asset manifest does not yet register those v2 resources. The animation lab
// needs the existing dev tree to validate before Cloudflare can publish its
// isolated preview. Do not carry this bootstrap into dev when the registry is
// normalized at source.
const manifestPath = new URL('../runtime/registry/asset-manifest.json', import.meta.url);
const raw = await fs.readFile(manifestPath, 'utf8');
const manifest = JSON.parse(raw);
const scorpion = manifest.units?.scorpion;

if (!scorpion?.animations) {
  throw new Error('Animation Lab bootstrap: Scorpion animation registry missing');
}

scorpion.animations.run ??= {
  resource_id: 'scorpion.animation.run',
  path: 'assets/characters/scorpion/sprites/runtime/v2/run/',
  required_runtime_frames: 12,
  renderer: 'BlazingFrameRuntime',
  usage: 'Twelve-frame Scorpion v2 run animation used by the isolated Animation Lab and current runtime state map.'
};

scorpion.animations.recoil ??= {
  resource_id: 'scorpion.animation.recoil',
  path: 'assets/characters/scorpion/sprites/runtime/v2/recoil/',
  required_runtime_frames: 12,
  renderer: 'BlazingFrameRuntime',
  usage: 'Twelve-frame Scorpion v2 recoil animation used by the isolated Animation Lab and current runtime state map.'
};

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('Animation Lab bootstrap: Scorpion v2 run/recoil resources registered for this build.');
