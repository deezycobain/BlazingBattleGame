import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {validateAtlasContracts} from './validate-atlas-contract.mjs';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'blazing-atlas-contract-'));
const characterRoot=path.join(root,'assets','characters');
const pngSignature=Buffer.from([137,80,78,71,13,10,26,10]);
async function writePng(file,width,height){const header=Buffer.alloc(24);pngSignature.copy(header);header.writeUInt32BE(13,8);header.write('IHDR',12);header.writeUInt32BE(width,16);header.writeUInt32BE(height,20);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,header);}
function manifest(atlas,overrides={}){return {contract_version:'blazing-battle-character-atlas-v1',unit_id:'tester',animations:[{id:'idle',type:'idle',atlas,frame_count:6,rows:2,columns:3,frame_width:64,frame_height:64,frame_ms:100,loop:true,anchor_x:'center',anchor_y:'feet',combat_visual_height:128,...overrides}]};}
async function fixture(atlas,dimensions,overrides={}){const data=path.join(characterRoot,'tester','data');await fs.mkdir(data,{recursive:true});await fs.writeFile(path.join(data,'atlas-contract-v1.json'),JSON.stringify(manifest(atlas,overrides)));if(dimensions)await writePng(path.resolve(data,atlas),...dimensions);}
async function reset(){await fs.rm(path.join(characterRoot,'tester'),{recursive:true,force:true});}
async function mustFail(message){await assert.rejects(()=>validateAtlasContracts(characterRoot),message);}
try{
 await fixture('../sprites/idle/tester_idle_atlas.png',[192,128]);await validateAtlasContracts(characterRoot);
 await reset();await fixture('../sprites/idle/tester_idle_atlas.png',[191,128]);await mustFail('wrong PNG dimensions must fail');
 await reset();await fixture('../sprites/idle/tester_idle_atlas.png',[192,128],{columns:6});await mustFail('wrong 3x2 geometry must fail');
 await reset();await fixture('../../../outside.png',[192,128]);await mustFail('an atlas path escaping its unit directory must fail');
 console.log('Atlas Contract validator fixtures PASS: valid PNG, dimension mismatch, grid mismatch, and path escape cases verified.');
}finally{await fs.rm(root,{recursive:true,force:true});}
