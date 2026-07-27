import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'dist');
const SKIP_TOP = new Set(['.git', '.github', 'node_modules', 'dist', 'scripts']);
const SKIP_FILES = new Set(['wrangler.jsonc', 'package.json', 'package-lock.json']);
const MIME_EXT = new Map([
  ['image/png', 'png'], ['image/jpeg', 'jpg'], ['image/jpg', 'jpg'], ['image/webp', 'webp'],
  ['image/gif', 'gif'], ['image/svg+xml', 'svg'], ['audio/mpeg', 'mp3'], ['audio/ogg', 'ogg'],
  ['application/octet-stream', 'bin']
]);

async function copyTree(src, dst, topLevel = true) {
  await fs.mkdir(dst, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    if (topLevel && (SKIP_TOP.has(entry.name) || SKIP_FILES.has(entry.name) || entry.name === 'index.html')) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) await copyTree(from, to, false);
    else if (entry.isFile()) await fs.copyFile(from, to);
  }
}

await fs.rm(OUT, { recursive: true, force: true });
await copyTree(ROOT, OUT, true);

const indexPath = path.join(ROOT, 'index.html');
let html = await fs.readFile(indexPath, 'utf8');
const originalBytes = Buffer.byteLength(html);
const embeddedDir = path.join(OUT, '_embedded');
await fs.mkdir(embeddedDir, { recursive: true });

let extracted = 0;
let extractedBytes = 0;
const seen = new Map();
const dataUriRx = /data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g;

html = html.replace(dataUriRx, (full, mime, b64) => {
  try {
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length) return full;
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20);
    const ext = MIME_EXT.get(mime.toLowerCase()) || 'bin';
    const fileName = `${hash}.${ext}`;
    if (!seen.has(fileName)) {
      seen.set(fileName, buf);
      extracted++;
      extractedBytes += buf.length;
    }
    return `_embedded/${fileName}`;
  } catch {
    return full;
  }
});

for (const [fileName, buf] of seen) {
  await fs.writeFile(path.join(embeddedDir, fileName), buf);
}

const finalBytes = Buffer.byteLength(html);
await fs.writeFile(path.join(OUT, 'index.html'), html);

console.log(`Cloudflare build: index ${(originalBytes / 1048576).toFixed(1)} MiB -> ${(finalBytes / 1048576).toFixed(1)} MiB`);
console.log(`Externalized ${extracted} embedded assets (${(extractedBytes / 1048576).toFixed(1)} MiB decoded)`);

const MAX_SAFE = 24 * 1024 * 1024;
if (finalBytes > MAX_SAFE) {
  throw new Error(`Transformed index.html is still ${(finalBytes / 1048576).toFixed(1)} MiB; Cloudflare requires each asset under 25 MiB.`);
}
