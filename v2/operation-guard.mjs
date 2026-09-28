import {renderSignature} from './render-signature.mjs';

function sceneSnapshot(project,sceneId){
  const scene=(project?.scenes||[]).find(item=>item.id===sceneId);
  if(!scene)return null;
  return {
    id:scene.id,
    order:scene.order,
    duration:Number(scene.duration)||0,
    prompt:String(scene.prompt||''),
    caption:String(scene.caption||''),
    status:scene.status||null,
    assetIds:[...(scene.assetIds||[])]
  };
}

function stable(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
}

function hash32(text){
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}

export function sceneSignature(project,sceneId){
  const snapshot=sceneSnapshot(project,sceneId);
  return snapshot?`ss1-${hash32(stable(snapshot))}`:null;
}

export function captureOperationGuard(project,{kind='project',sceneId=null,assetId=null}={}){
  if(!project?.id)throw Error('Project is required for an operation guard.');
  if(sceneId&&!project.scenes?.some(scene=>scene.id===sceneId))throw Error('Scene missing.');
  if(assetId&&!project.assets?.some(asset=>asset.id===assetId))throw Error('Asset missing.');
  return {
    schema:1,
    kind:'aivm-v2-operation-guard',
    operationKind:String(kind||'project').slice(0,80),
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    renderSignature:renderSignature(project),
    sceneId:sceneId||null,
    sceneSignature:sceneId?sceneSignature(project,sceneId):null,
    assetId:assetId||null,
    assetLocked:assetId?!!project.assets.find(asset=>asset.id===assetId)?.locked:null
  };
}

export function validateOperationGuard(project,guard,{allowUnrelatedRevision=false,requireRenderMatch=false}={}){
  if(!guard||guard.kind!=='aivm-v2-operation-guard')return {ok:false,reason:'invalid-guard'};
  if(!project?.id||project.id!==guard.projectId)return {ok:false,reason:'project-changed'};
  if(!allowUnrelatedRevision&&Number(project.revision)!==Number(guard.projectRevision))return {ok:false,reason:'revision-changed'};
  if(guard.sceneId){
    const current=sceneSignature(project,guard.sceneId);
    if(!current)return {ok:false,reason:'scene-removed'};
    if(current!==guard.sceneSignature)return {ok:false,reason:'scene-changed'};
  }
  if(guard.assetId){
    const asset=(project.assets||[]).find(item=>item.id===guard.assetId);
    if(!asset)return {ok:false,reason:'asset-removed'};
    if(asset.locked&&!guard.assetLocked)return {ok:false,reason:'asset-became-locked'};
  }
  if(requireRenderMatch&&renderSignature(project)!==guard.renderSignature)return {ok:false,reason:'render-inputs-changed'};
  return {ok:true,reason:'match'};
}

export function assertOperationGuard(project,guard,options={}){
  const result=validateOperationGuard(project,guard,options);
  if(!result.ok)throw Error(`Operation result is stale: ${result.reason}. Retry from the current project state.`);
  return result;
}
