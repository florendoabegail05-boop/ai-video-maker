function clean(value,max=400){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function createAdapterDescriptor({id,kind,label,freeOnly=true,local=true,verified=false,capabilities={}}={}){
  const validKinds=new Set(['image','video','voice','music','sfx','lipsync','upscale']);
  if(!validKinds.has(kind))throw Error('Unsupported adapter kind.');
  if(!clean(id,80)||!clean(label,120))throw Error('Adapter id and label are required.');
  return {id:clean(id,80),kind,label:clean(label,120),freeOnly:!!freeOnly,local:!!local,verified:!!verified,capabilities:{...capabilities}};
}

export function canUseAdapter(adapter,{costMode='FREE ONLY',ownerApproved=false}={}){
  if(!adapter?.verified)return {allowed:false,reason:'Adapter is not verified on this device.'};
  if(String(costMode).toUpperCase()==='FREE ONLY'&&!adapter.freeOnly)return {allowed:false,reason:'FREE ONLY blocks paid-capable adapters.'};
  if(!adapter.freeOnly&&!ownerApproved)return {allowed:false,reason:'Owner approval is required for paid-capable adapters.'};
  return {allowed:true,reason:'Adapter is allowed by current cost and verification policy.'};
}

export function motionInstruction(scene){
  const direction=scene?.direction||{};
  return [
    clean(direction.motion,500)||'Use one clear primary subject action.',
    clean(direction.camera,300)||'Keep camera motion controlled and stable.',
    'Avoid flicker, identity drift, morphing, sudden object teleportation and unexplained camera jumps.',
    'Preserve the approved source image and earlier clips when generating a replacement.'
  ].join(' ');
}

export function audioPlanForScene(scene){
  return {
    dialogue:clean(scene?.dialogue,500),
    voiceId:clean(scene?.voiceId,80),
    ambience:clean(scene?.ambience,300),
    sfx:clean(scene?.sfx,300),
    musicCue:clean(scene?.musicCue,300),
    directorIntent:clean(scene?.direction?.audioIntent,400)
  };
}

export function qualityRiskProfile(adapter){
  const c=adapter?.capabilities||{};
  return {
    flickerRisk:c.temporalConsistency==='high'?'low':c.temporalConsistency==='medium'?'medium':'unknown',
    identityDriftRisk:c.referenceImages===true?'reduced':'unknown',
    maxDuration:Number.isFinite(c.maxDuration)?c.maxDuration:null,
    maxFps:Number.isFinite(c.maxFps)?c.maxFps:null,
    maxWidth:Number.isFinite(c.maxWidth)?c.maxWidth:null,
    maxHeight:Number.isFinite(c.maxHeight)?c.maxHeight:null,
    nativeAudio:c.nativeAudio===true,
    lipSync:c.lipSync===true
  };
}
