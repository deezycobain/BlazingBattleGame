// Explicit browser-smoke fixtures. Never alter production starter or wallet defaults.
// Seed only the data the scenario needs before the first game navigation.
export const CORE_SIX=Object.freeze(['Itachi','Tyler','Lebee','Senku','Sub-Zero','Crimson']);
export const LEGACY_SIX=Object.freeze(['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion']);
export const LEGACY_TWELVE=Object.freeze(['Kakashi','Obito','Jiraiya','Sasuke','Pain','Scorpion','Rock Lee','Mashle','Wong Fei-Hung','Gabimaru','Killua','Zabuza']);

const id=name=>String(name||'').toLowerCase().trim().replaceAll('sub-zero','subzero').replaceAll('wong fei-hung','jackie_chan').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');

/**
 * Browser-local deterministic testing state, never a gameplay shortcut.
 * Scenarios that test new-player ownership must NOT use this helper.
 */
export async function seedSmokeProfile(context,{team=null,owned=null,embers=null,coins=null}={}){
  const units=owned===null?(team||[]):owned;
  const records={};
  if(team!==null){
    if(!Array.isArray(team)||team.length!==6||new Set(team).size!==6)throw new Error('Smoke roster must be six distinct fighters');
    records['blazingBattle.activeTeam.v5']=JSON.stringify(team);
    records['blazingBattle.activeTeam.v6']=JSON.stringify(team);
  }
  if(owned!==null||team!==null){
    const roster=[...new Set(['tyler','subzero','senku',...units.map(id)])];
    for(const name of (team||[]).map(id))if(!roster.includes(name))throw new Error('Smoke team unit not owned: '+name);
    records['blazing.collection.v1']=JSON.stringify({version:1,owned:roster});
  }
  if(embers!==null||coins!==null){
    const marks=coins===null?300:coins;
    const count=embers===null?3:embers;
    if(!Number.isSafeInteger(marks)||marks<0||!Number.isSafeInteger(count)||count<0)throw new Error('Smoke wallet must be nonnegative integers');
    records['blazing.economy.v1']=JSON.stringify({version:1,battleMarks:marks,lifetimeEarned:marks,embers:count,wins:{road:0,castle:0}});
  }
  await context.addInitScript(entries=>{
    for(const [key,value] of Object.entries(entries))localStorage.setItem(key,value);
  },records);
}
