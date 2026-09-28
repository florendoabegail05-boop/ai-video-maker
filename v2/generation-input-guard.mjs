import {directorBrief} from './director.mjs';
import {referenceSummary} from './references.mjs';
import {reusableAsset} from './core.mjs';

function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableStringify(value[key])).join(',')+'}';
}

function hash32(text){
  let hash=0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash^=text.charCodeAt(i);
    hash=Math.imul(hash,0x01000193)>>>0;
  }
  return hash.toString(16).padStart(8,'0');
}

function clean(value,max=8000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

function referenceDescriptor(project){
  const refs=referenceSummary(project);
  const normalize=item=>({id:item.id||null,label:clean(item.label,180)||null,locked:!!item.locked});
  return {
    characters:refs.characters.map(normalize),
    worlds:refs.worlds.map(normalize)
  };
}

function sourceAssetDescriptor(project,sceneId,type,parentAssetId=null){
  if(type!=='motion')return null;
  let asset=null;
  if(parentAssetId)asset=(project.assets||[]).find(item=>item.id===parentAssetId)||null;
  if(!asset)asset=reusableAsset(project,sceneId,'image');
  if(!asset)return null;
  return {
    id:asset.id||null,
    kind:asset.kind||null,
    provider:asset.provider||null,
    parentAssetId:asset.parentAssetId||null,
    status:asset.status||null,
    locked:!!asset.locked,
    hasFile:asset.hasFile!==false,
    size:Number(asset.size)||0
  };
}

export function generationInputSnapshot(project,sceneId,{type='image',route=null,parentAssetId=null}={}){
  if(!project?.id)throw Error('Project is required.');
  if(!['image','motion'].includes(type))throw Error('Generation input guard supports image or motion jobs only.');
  const scene=(project.scenes||[]).find(item=>item.id===sceneId);
  if(!scene)throw Error('Scene missing.');
  return {
    schema:1,
    projectId:project.id,
    type,
    route:clean(route,120)||null,
    scene:{
      id:scene.id,
      order:Number(scene.order)||0,
      duration:Number(scene.duration)||0,
      beat:clean(scene.beat,1200),
      prompt:clean(scene.prompt,6000),
      caption:clean(scene.caption,500),
      direction:{
        shot:clean(scene.direction?.shot,500),
        camera:clean(scene.direction?.camera,500),
        motion:clean(scene.direction?.motion,800),
        continuityGoal:clean(scene.direction?.continuityGoal,800),
        audioIntent:clean(scene.direction?.audioIntent,800)
      },
      directorBrief:directorBrief(project,sceneId)
    },
    projectGuidance:{
      style:clean(project.style,120)||'custom',
      hardwareMode:clean(project.hardwareMode,120)||'light',
      character:clean(project.bible?.character,1200),
      world:clean(project.bible?.world,1200),
      visualRules:clean(project.bible?.visualRules,1200)
    },
    references:referenceDescriptor(project),
    sourceAsset:sourceAssetDescriptor(project,sceneId,type,parentAssetId)
  };
}

export function generationInputSignature(project,sceneId,options={}){
  return `gis1-${hash32(stableStringify(generationInputSnapshot(project,sceneId,options)))}`;
}

export function captureGenerationInputGuard(project,sceneId,options={}){
  const snapshot=generationInputSnapshot(project,sceneId,options);
  return {
    schema:1,
    kind:'aivm-v2-generation-input-guard',
    projectId:project.id,
    sceneId,
    type:snapshot.type,
    route:snapshot.route,
    signature:`gis1-${hash32(stableStringify(snapshot))}`,
    parentAssetId:snapshot.sourceAsset?.id||null,
    portable:true,
    note:'The signature excludes local source paths and file bytes. It tracks generation-relevant scene, director, bible, reference, route and motion-source metadata.'
  };
}

export function validateGenerationInputGuard(project,guard,{route=null,parentAssetId=null}={}){
  if(!guard||guard.kind!=='aivm-v2-generation-input-guard')return {ok:false,reason:'invalid-generation-guard'};
  if(guard.projectId!==project?.id)return {ok:false,reason:'project-changed'};
  const options={type:guard.type,route:route??guard.route,parentAssetId:parentAssetId??guard.parentAssetId};
  let current;
  try{current=generationInputSignature(project,guard.sceneId,options);}catch(error){return {ok:false,reason:'generation-input-unavailable',message:error.message};}
  if(current!==guard.signature)return {ok:false,reason:'generation-inputs-changed',currentSignature:current,guardSignature:guard.signature};
  return {ok:true,reason:'match',currentSignature:current};
}
