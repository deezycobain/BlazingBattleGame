(()=>{
  'use strict';

  class BlazingResourceResolver{
    constructor({actionRegistry,assetManifest,unitMap,unitData}){
      this.actionRegistry=actionRegistry;
      this.assetManifest=assetManifest;
      this.unitMap=unitMap;
      this.unitData=unitData;
      this.resourceIndex=new Map();
      this.buildResourceIndex();
    }

    buildResourceIndex(){
      const add=(entry)=>{
        if(!entry?.resource_id)return;
        if(this.resourceIndex.has(entry.resource_id))throw new Error(`Duplicate resource_id: ${entry.resource_id}`);
        this.resourceIndex.set(entry.resource_id,entry);
      };
      for(const unit of Object.values(this.assetManifest?.units||{})){
        for(const groupName of ['animations','vfx']){
          for(const entry of Object.values(unit?.[groupName]||{}))add(entry);
        }
      }
      for(const group of Object.values(this.assetManifest?.shared||{})){
        for(const entry of Object.values(group||{}))add(entry);
      }
    }

    getByPath(object,path){
      return String(path||'').split('.').reduce((value,key)=>value?.[key],object);
    }

    resolveResource(resourceId){
      const resource=this.resourceIndex.get(resourceId);
      if(!resource)throw new Error(`Unknown resource_id: ${resourceId}`);
      return {resource_id:resourceId,...resource};
    }

    resolveAction(actionId,parameters={}){
      const definition=this.actionRegistry?.actions?.[actionId];
      if(!definition)throw new Error(`Unknown action_id: ${actionId}`);
      const resolvedParameters={};
      for(const [name,value] of Object.entries(parameters)){
        if(name.endsWith('_source')){
          const outName=name.slice(0,-7);
          resolvedParameters[outName]=this.getByPath(this.unitData,value);
        }else if(value&&typeof value==='object'&&value.source){
          resolvedParameters[name]=this.getByPath(this.unitData,value.source);
        }else{
          resolvedParameters[name]=value;
        }
      }
      return {action_id:actionId,definition,parameters:resolvedParameters};
    }

    resolveAbility(abilityId){
      const mapping=this.unitMap?.abilities?.[abilityId];
      if(!mapping)throw new Error(`Unknown ability '${abilityId}' for unit '${this.unitMap?.unit_id||'unknown'}'`);
      const abilityData=Object.values(this.unitData?.abilities||{}).find(a=>a?.id===abilityId);
      if(!abilityData)throw new Error(`Ability '${abilityId}' missing from canonical unit data`);
      const animation=this.resolveResource(mapping.animation_id);
      const vfx={};
      for(const [key,resourceId] of Object.entries(mapping.vfx||{}))vfx[key]=this.resolveResource(resourceId);
      const actions=(mapping.gameplay_actions||[]).map(event=>({event:event.event,...this.resolveAction(event.action_id,event.parameters||{})}));
      const cost=mapping.cost_source?this.getByPath(this.unitData,mapping.cost_source):0;
      return {unit_id:this.unitMap.unit_id,ability_id:abilityId,slot:mapping.slot,cost,ability_data:abilityData,animation,vfx,actions,presentation:mapping.projectile_presentation||null};
    }

    resolveState(stateId){
      const resourceId=this.unitMap?.states?.[stateId];
      if(!resourceId)throw new Error(`Unknown state '${stateId}'`);
      return this.resolveResource(resourceId);
    }

    validate(){
      const errors=[];
      if(this.unitMap?.unit_id!==this.unitData?.id)errors.push(`unit_id mismatch: map=${this.unitMap?.unit_id}, data=${this.unitData?.id}`);
      for(const abilityId of Object.keys(this.unitMap?.abilities||{})){
        try{this.resolveAbility(abilityId)}catch(error){errors.push(error.message)}
      }
      for(const stateId of Object.keys(this.unitMap?.states||{})){
        try{this.resolveState(stateId)}catch(error){errors.push(error.message)}
      }
      return {ok:errors.length===0,errors};
    }
  }

  window.BlazingResourceResolver=BlazingResourceResolver;
})();