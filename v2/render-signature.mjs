import {reusableAsset,selectedProjectAudio} from './core.mjs';

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

function assetDescriptor(asset){
  if(!asset)return null;
  return {
    id:asset.id||null,
    kind:asset.kind||null,
    size:Number(asset.size)||0,
    duration:Number.isFinite(asset.duration)?asset.duration:null,
    provider:asset.provider||null,
    parentAssetId:asset.parentAssetId||null,
    status:asset.status||null,
    locked:!!asset.locked
  };
}

export function renderInputDescriptor(project){
  const scenes=(project?.scenes||[]).map((scene,index)=>({
    sceneId:scene.id||null,
    order:index+1,
    duration:Number(scene.duration)||0,
    caption:String(scene.caption||'').trim(),
    clip:assetDescriptor(reusableAsset(project,scene.id,'video'))
  }));
  return {
    schema:1,
    projectId:project?.id||null,
    scenes,
    audio:{
      music:assetDescriptor(selectedProjectAudio(project,'music')),
      voice:assetDescriptor(selectedProjectAudio(project,'voice'))
    }
  };
}

export function renderSignature(project){
  const descriptor=renderInputDescriptor(project);
  return `rs1-${hash32(stableStringify(descriptor))}`;
}

export function verificationFreshness(project,verification=project?.publishing?.finalVerification){
  if(!verification||verification.kind!=='aivm-v2-final-output-manifest'||verification.projectId!==project?.id||verification.verified!==true){
    return {fresh:false,reason:'missing-or-invalid',currentSignature:renderSignature(project),verifiedSignature:verification?.renderSignature||null};
  }
  const currentSignature=renderSignature(project);
  const verifiedSignature=verification.renderSignature||null;
  if(!verifiedSignature)return {fresh:false,reason:'legacy-no-signature',currentSignature,verifiedSignature:null};
  if(verifiedSignature!==currentSignature)return {fresh:false,reason:'render-inputs-changed',currentSignature,verifiedSignature};
  return {fresh:true,reason:'match',currentSignature,verifiedSignature};
}
