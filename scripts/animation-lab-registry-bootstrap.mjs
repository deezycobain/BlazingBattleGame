import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Feature-branch bootstrap only.
//
// Current dev contains several runtime-map state IDs that point at existing v2
// frame folders but are not yet registered in runtime/registry/asset-manifest.json.
// That causes the global validator to stop before the isolated Animation Lab can
// be built and previewed. For this branch only, register missing state resources
// when a matching v2 frame directory actually exists. If no matching frames are
// present, leave the state untouched so validation still exposes a real missing
// integration instead of hiding it.
//
// Do not carry this bootstrap into dev once the source registry is normalized.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'runtime/registry/asset-manifest.json');
const charactersDir = path.join(repoRoot, 'assets/characters');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

function collectKnownResourceIds() {
  const known = new Set();
  for (const unit of Object.values(manifest.units || {})) {
    for (const group of ['animations', 'vfx']) {
      for (const entry of Object.values(unit?.[group] || {})) {
        if (entry?.resource_id) known.add(entry.resource_id);
      }
    }
  }
  for (const group of ['animations', 'vfx']) {
    for (const entry of Object.values(manifest.shared?.[group] || {})) {
      if (entry?.resource_id) known.add(entry.resource_id);
    }
  }
  return known;
}

const known = collectKnownResourceIds();
let registrations = 0;
const characterEntries = await fs.readdir(charactersDir, { withFileTypes: true });

for (const dirent of characterEntries) {
  if (!dirent.isDirectory()) continue;

  const unitId = dirent.name;
  const runtimeMapPath = path.join(charactersDir, unitId, 'data/runtime-map.json');
  let runtimeMap;
  try {
    runtimeMap = JSON.parse(await fs.readFile(runtimeMapPath, 'utf8'));
  } catch {
    continue;
  }

  for (const [stateName, resourceId] of Object.entries(runtimeMap.states || {})) {
    if (!resourceId || known.has(resourceId)) continue;

    const v2Dir = path.join(charactersDir, unitId, 'sprites/runtime/v2', stateName);
    let files;
    try {
      files = await fs.readdir(v2Dir);
    } catch {
      console.log(`Animation Lab bootstrap: ${resourceId} remains unresolved (no v2/${stateName}/ directory).`);
      continue;
    }

    const frameFiles = files
      .filter(name => /^frame_\d+\.png$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    if (!frameFiles.length) {
      console.log(`Animation Lab bootstrap: ${resourceId} remains unresolved (v2/${stateName}/ has no frame PNGs).`);
      continue;
    }

    manifest.units ??= {};
    manifest.units[unitId] ??= {};
    manifest.units[unitId].animations ??= {};

    if (manifest.units[unitId].animations[stateName]?.resource_id) {
      const existing = manifest.units[unitId].animations[stateName].resource_id;
      known.add(existing);
      if (existing !== resourceId) {
        console.log(`Animation Lab bootstrap: ${resourceId} remains unresolved (${unitId}.animations.${stateName} already belongs to ${existing}).`);
      }
      continue;
    }

    manifest.units[unitId].animations[stateName] = {
      resource_id: resourceId,
      path: `assets/characters/${unitId}/sprites/runtime/v2/${stateName}/`,
      required_runtime_frames: frameFiles.length,
      renderer: 'BlazingFrameRuntime',
      usage: `Animation Lab feature-branch bootstrap for ${unitId} ${stateName} v2 runtime state.`
    };

    known.add(resourceId);
    registrations++;
    console.log(`Animation Lab bootstrap: registered ${resourceId} (${frameFiles.length} frames).`);
  }
}

await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Animation Lab bootstrap complete: ${registrations} missing v2 state resource(s) registered for this build.`);
