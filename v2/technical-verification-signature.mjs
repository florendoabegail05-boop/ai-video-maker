import {finalVerificationGate} from './final-verification-gate.mjs';

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

function normalizedOptions(options={}){
  const expectedWidth=Number(options.expectedWidth);
  const expectedHeight=Number(options.expectedHeight);
  return {
    expectedWidth:Number.isFinite(expectedWidth)?expectedWidth:1080,
    expectedHeight:Number.isFinite(expectedHeight)?expectedHeight:1920,
    requireAudioStream:options.requireAudioStream===true,
    requireFps:options.requireFps===true,
    requireCodecs:options.requireCodecs===true,
    requireContainer:options.requireContainer===true
  };
}

function actual(reconciliation,field){
  const fact=reconciliation?.selected?.[field];
  if(!fact||fact.stale===true||fact.trusted!==true)return null;
  if(fact.value===false)return false;
  if(fact.value!==true)return null;
  return fact.details?.actual??fact.details??true;
}

function machineVerified(reconciliation,field){
  const fact=reconciliation?.selected?.[field];
  return !!fact
    &&['ffprobe','bridge'].includes(fact.source)
    &&fact.trusted===true
    &&fact.stale!==true
    &&fact.value===true;
}

export function technicalVerificationDescriptor(project,factSets=[],options={}){
  if(!project?.id)throw Error('Project is required.');
  const normalized=normalizedOptions(options);
  const sets=Array.isArray(factSets)?factSets:[factSets];
  const gate=finalVerificationGate(project,sets,normalized);
  const reconciliation=gate.reconciliation;
  const machineCoreVerified=['width','height','duration'].every(field=>machineVerified(reconciliation,field));
  const selected={
    width:actual(reconciliation,'width'),
    height:actual(reconciliation,'height'),
    duration:actual(reconciliation,'duration')
  };
  if(normalized.requireAudioStream)selected.audioStream=actual(reconciliation,'audioStream');
  if(normalized.requireFps)selected.fps=actual(reconciliation,'fps');
  if(normalized.requireCodecs){
    selected.videoCodec=actual(reconciliation,'videoCodec');
    selected.audioCodec=actual(reconciliation,'audioCodec');
  }
  if(normalized.requireContainer)selected.container=actual(reconciliation,'container');

  return {
    schema:1,
    kind:'aivm-v2-technical-verification-descriptor',
    projectId:project.id,
    renderSignature:gate.renderSignature||null,
    options:normalized,
    gatePassed:gate.passed===true,
    machineCoreVerified,
    selected,
    blockerReasons:[...(gate.blockerReasons||[])].sort()
  };
}

export function currentTechnicalVerificationStamp(project,factSets=[],options={}){
  const descriptor=technicalVerificationDescriptor(project,factSets,options);
  const eligible=descriptor.gatePassed===true&&descriptor.machineCoreVerified===true;
  return {
    schema:1,
    kind:'aivm-v2-technical-verification-stamp',
    eligible,
    signature:eligible?`tvs1-${hash32(stableStringify(descriptor))}`:null,
    descriptor,
    publishAuthorized:false,
    note:'Portable deterministic stamp for the current configured technical gate. Required codec verification binds both the video codec and, when present, the audio codec evidence. It excludes local paths and observation timestamps and never authorizes publishing.'
  };
}
