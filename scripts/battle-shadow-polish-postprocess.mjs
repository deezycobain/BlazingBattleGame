import fs from 'node:fs/promises';
import path from 'node:path';

const file=path.join(process.cwd(),'dist','index.html');
let html=await fs.readFile(file,'utf8');

function replaceRegexOnce(rx,replacement,label){
  const matches=[...html.matchAll(new RegExp(rx.source,rx.flags.includes('g')?rx.flags:rx.flags+'g'))];
  if(matches.length!==1)throw new Error(`Battle shadow polish: expected one ${label}, found ${matches.length}`);
  html=html.replace(rx,replacement);
}

// Replace the old player-only hard-edged oval with one restrained world-space contact
// shadow for both teams. The asymmetric smear is deliberately small and faint so it
// grounds the feet without reading as a gray/black ellipse painted onto the battlefield.
replaceRegexOnce(
  /\s*\/\/ PLAYER GROUND SHADOW[\s\S]*?ctx\.restore\(\);\s*\}\s*\n\s*ctx\.save\(\);\s*\n\s*ctx\.translate\(x,y-lift\);/,
  `\n  // VISIBLE WORLD-SPACE CONTACT SHADOW\n  {\n    const liftRatio=clamp(lift/17,0,1);\n    const bbDepthScale=(S.bbRunMode==='road'&&window.BlazingRoadContent?.visualScaleForY)\n      ? Math.max(.82,Math.min(1.02,Number(window.BlazingRoadContent.visualScaleForY(S.bbRoadContent?.map,y))||1))\n      : 1;\n    const halfWidth=(isEnemy ? 12.2 : 11.4)+(1.4*liftRatio);\n    const contactOpacity=(isEnemy ? .14 : .125)*(1-.62*liftRatio);\n    const blurOpacity=contactOpacity*.84;\n    ctx.save();\n    ctx.translate(x+.55,y+17.0);\n    ctx.scale(bbDepthScale,bbDepthScale);\n    ctx.fillStyle=\`rgba(12,16,20,\${contactOpacity})\`;\n    ctx.shadowColor=\`rgba(7,10,14,\${blurOpacity})\`;\n    ctx.shadowBlur=4.4+(1.4*liftRatio);\n    ctx.beginPath();\n    ctx.moveTo(-halfWidth*.82,.35);\n    ctx.bezierCurveTo(-halfWidth*.62,-1.75,-halfWidth*.22,-2.15,.05,-1.55);\n    ctx.bezierCurveTo(halfWidth*.32,-1.9,halfWidth*.7,-1.0,halfWidth*.84,.1);\n    ctx.bezierCurveTo(halfWidth*.6,1.25,halfWidth*.18,1.62,-.08,1.4);\n    ctx.bezierCurveTo(-halfWidth*.4,1.5,-halfWidth*.72,1.05,-halfWidth*.82,.35);\n    ctx.closePath();\n    ctx.fill();\n    ctx.restore();\n  }\n\n  ctx.save();\n  ctx.translate(x,y-lift);`,
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
console.log('Battle shadow polish applied: visible depth-aware contact shadows for both teams, no doubled enemy puddle.');
