import {reconcileFinalMediaFacts} from './final-media-facts.mjs';

function evidenceState(reconciliation,field){
  const fact=reconciliation?.selected?.[field];
  if(!fact)return {known:false,verified:false,value:null,source:'unknown'};
  const current=fact.stale!==true;
  const trusted=fact.trusted===true;
  const known=current&&trusted&&(fact.value===true||fact.value===false);
  return {known,verified:known&&fact.value===true,value:known?fact.value:null,source:fact.source||'unknown'};
}

export function finalVerificationGate(project,factSets=[],{
  expectedWidth=1080,
  expectedHeight=1920,
  requireAudioStream=false,
  requireFps=false,
  requireCodecs=false,
  requireContainer=false
}={}){
  const sets=Array.isArray(factSets)?factSets:[factSets];
  const reconciliation=reconcileFinalMediaFacts(project,...sets);
  const checks=[];
  const add=(id,state,message,details={})=>checks.push({id,state,message,...details});

  if(reconciliation.hasContradictions){
    add('contradictions','BLOCKED','Browser and machine facts disagree. Re-inspect the rendered file before trusting technical claims.',{reason:'facts-contradict',count:reconciliation.contradictions.length});
  }else add('contradictions','PASS','No browser/machine contradiction was detected in the supplied current facts.',{reason:'no-contradiction'});

  const width=reconciliation.selected.width;
  const height=reconciliation.selected.height;
  const widthActual=width?.details?.actual??null;
  const heightActual=height?.details?.actual??null;
  const widthKnown=width?.trusted===true&&width?.stale!==true&&(width?.value===true||width?.value===false);
  const heightKnown=height?.trusted===true&&height?.stale!==true&&(height?.value===true||height?.value===false);
  if(!widthKnown||!heightKnown){
    add('dimensions','BLOCKED','Trusted current output dimensions are not yet verified.',{reason:'dimensions-unknown',expectedWidth,expectedHeight});
  }else if(width?.value!==true||height?.value!==true){
    add('dimensions','BLOCKED','Rendered dimensions are invalid or non-positive.',{reason:'dimensions-invalid',expectedWidth,expectedHeight,actualWidth:widthActual,actualHeight:heightActual});
  }else if(widthActual!==expectedWidth||heightActual!==expectedHeight){
    add('dimensions','BLOCKED',`Rendered dimensions are ${widthActual}×${heightActual}, expected ${expectedWidth}×${expectedHeight}.`,{reason:'dimensions-mismatch',expectedWidth,expectedHeight,actualWidth:widthActual,actualHeight:heightActual});
  }else add('dimensions','PASS',`Rendered dimensions match ${expectedWidth}×${expectedHeight}.`,{reason:'dimensions-match',actualWidth:widthActual,actualHeight:heightActual});

  const duration=reconciliation.selected.duration;
  const durationKnown=duration?.trusted===true&&duration?.stale!==true&&(duration?.value===true||duration?.value===false);
  const durationActual=duration?.details?.actual??null;
  const durationNumber=durationActual===null||durationActual===undefined||durationActual===''?null:Number(durationActual);
  if(!durationKnown){
    add('duration','BLOCKED','Rendered duration is not verified by current trusted evidence.',{reason:'duration-unknown'});
  }else if(duration?.value!==true||!Number.isFinite(durationNumber)||durationNumber<=0){
    add('duration','BLOCKED','Rendered duration must be greater than zero.',{reason:'duration-invalid',actual:Number.isFinite(durationNumber)?durationNumber:null,source:duration.source||'unknown'});
  }else{
    add('duration','PASS','Rendered duration is available from current trusted evidence.',{reason:'duration-known',actual:durationNumber,source:duration.source||'unknown'});
  }

  const audio=evidenceState(reconciliation,'audioStream');
  if(requireAudioStream){
    if(!audio.known)add('audio-stream','BLOCKED','Audio stream presence is unknown. FFprobe/bridge verification is required.',{reason:'audio-unknown',source:audio.source});
    else if(!audio.verified)add('audio-stream','BLOCKED','The rendered file was verified without an audio stream.',{reason:'audio-absent',source:audio.source});
    else add('audio-stream','PASS','An audio stream is verified in the rendered file.',{reason:'audio-present',source:audio.source});
  }else{
    const reason=!audio.known?'audio-optional-unknown':audio.verified?'audio-present':'audio-absent';
    add('audio-stream',audio.known?'PASS':'INFO',audio.known?(audio.verified?'Audio stream verified present.':'Audio stream verified absent.'):'Audio stream status is unknown; audio is not required by this gate.',{reason,source:audio.source});
  }

  for(const [field,id,label,required] of [
    ['fps','fps','FPS',requireFps],
    ['videoCodec','video-codec','video codec',requireCodecs],
    ['container','container','container',requireContainer]
  ]){
    const fact=reconciliation.selected[field];
    const known=fact?.trusted===true&&fact?.stale!==true&&(fact?.value===true||fact?.value===false);
    const verified=known&&fact?.value===true;
    if(required&&!known)add(id,'BLOCKED',`Current trusted ${label} evidence is required but missing.`,{reason:`${field}-unknown`});
    else if(required&&!verified)add(id,'BLOCKED',`Current trusted ${label} evidence is present but invalid.`,{reason:`${field}-invalid`,actual:fact?.details?.actual??null,source:fact?.source||'unknown'});
    else if(verified)add(id,'PASS',`Current trusted ${label} evidence is available.`,{reason:`${field}-known`,actual:fact.details?.actual??null,source:fact.source||'unknown'});
    else add(id,'INFO',`${label[0].toUpperCase()+label.slice(1)} is not verified; it is not required by this gate.`,{reason:`${field}-optional-unknown`});
  }

  const blocking=checks.filter(item=>item.state==='BLOCKED');
  return {
    schema:1,
    kind:'aivm-v2-final-verification-gate',
    projectId:project?.id||null,
    renderSignature:reconciliation.renderSignature,
    passed:blocking.length===0,
    checks,
    blockers:blocking.map(item=>item.id),
    blockerReasons:blocking.map(item=>item.reason||'unknown'),
    reconciliation,
    publishAuthorized:false,
    note:'This gate verifies technical render facts only. It distinguishes missing evidence from known-invalid media values, and it does not prove artistic quality, rights, platform eligibility, native AI audio, lip-sync quality, or publication readiness.'
  };
}
