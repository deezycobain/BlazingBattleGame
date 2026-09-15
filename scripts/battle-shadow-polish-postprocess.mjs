import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

function replaceRegexOnce(rx,replacement,label){
  const matches=[...html.matchAll(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))];
  if(matches.length!==1)throw new Error(`Battle shadow polish: expected one ${label}, found ${matches.length}`);
  html=html.replace(rx,replacement);
}

// Replace the old player-only hard-edged oval with one soft world-space contact
// shadow for both teams. It stays attached to the ground instead of inheriting the
// sprite transform, which keeps attack poses and KO rotations from dragging the
// shadow around like a sticker.
replaceRegexOnce(
  /\s*\/\/ PLAYER GROUND SHADOW[\s\S]*?ctx\.restore\(\);\s*\}\s*\n\s*ctx\.save\(\);\s*\n\s*ctx\.translate\(x,y-lift\);/,
  `\n  // SOFT WORLD-SPACE CONTACT SHADOW\n  {\n    const liftRatio=clamp(lift/17,0,1);\n    const baseRadius=isEnemy?13.2:10.8;\n    const radius=baseRadius+(2.2*liftRatio);\n    const opacity=(isEnemy ? .155 : .145)-(.055*liftRatio);\n    ctx.save();\n    ctx.translate(x,y+17.5);\n    ctx.scale(1,.37+.05*liftRatio);\n    const shadowGradient=ctx.createRadialGradient(0,0,0,0,0,radius);\n    shadowGradient.addColorStop(0,\`rgba(0,0,0,\${opacity})\`);\n    shadowGradient.addColorStop(.42,\`rgba(0,0,0,\${opacity*.68})\`);\n    shadowGradient.addColorStop(.76,\`rgba(0,0,0,\${opacity*.24})\`);\n    shadowGradient.addColorStop(1,'rgba(0,0,0,0)');\n    ctx.fillStyle=shadowGradient;\n    ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.fill();\n    ctx.restore();\n  }\n\n  ctx.save();\n  ctx.translate(x,y-lift);`,
  'legacy player ground shadow block'
);

// The original renderer also drew a second, flat enemy ellipse inside the transformed
// sprite context. Removing it prevents the doubled gray puddle visible under Road enemies.
replaceRegexOnce(
  /\s*\/\/ CPU enemies retain their small orientation shadow\.\s*if\(isEnemy\)\{\s*ctx\.beginPath\(\);\s*ctx\.ellipse\(0,17,16,6,0,0,Math\.PI\*2\);\s*ctx\.fillStyle='rgba\(0,0,0,\.22\)';\s*ctx\.fill\(\);\s*\}/,
  `\n\n  // Enemy contact shadow is drawn once in world space above.`,
  'legacy enemy orientation shadow block'
);

await fs.writeFile(file,html);
console.log('Battle shadow polish applied: single soft contact shadow, no doubled enemy puddle.');
