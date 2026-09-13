import fs from 'node:fs/promises';

const html = await fs.readFile('sanctuary.html', 'utf8');
const required = [
  'bb:sanctuary:v1',
  "const TREE=['Seedling','New Growth','Young Bonsai','Shaped Bonsai','Mature Bonsai','First Bloom']",
  "const GARDEN=['Untouched','First Lines','Flow','Balance','Harmony','First Bloom Garden']",
  "cycle:'first-bloom'",
  'leafEssence',
  'gardenStone',
  'spiritWater',
  'harmonySeals',
  'treeShape',
  'sandPattern',
  'stoneLayout',
  'completed:[]',
  'Complete First Bloom',
  'Sanctuary Summon'
];
for (const token of required) {
  if (!html.includes(token)) throw new Error(`Sanctuary validation missing: ${token}`);
}
if ((html.match(/data-tab=/g) || []).length !== 5) throw new Error('Sanctuary must expose exactly five V1 tabs');
if (!html.includes("localStorage.setItem(KEY,JSON.stringify(S))")) throw new Error('Sanctuary persistence write missing');
if (!html.includes("localStorage.getItem(KEY)")) throw new Error('Sanctuary persistence read missing');
console.log('Sanctuary validation PASS: First Bloom state, persistence, progression, Grove, and Harmony Seal loop are present.');
