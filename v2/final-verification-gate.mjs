import {reconcileFinalMediaFacts} from './final-media-facts.mjs';

function selectedValue(reconciliation,field){
  const fact=reconciliation?.selected?.[field];
  if(!fact||fact.stale===true||fact.trusted!==true)return null;
  return fact.value===true?fact.details?.actual??fact.details??true:fact.value===false?false:null;
}

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
    add('contradictions','BLOCKED','Browser and machine facts disagree. Re-inspect the rendered file before trusting technical claims.',{count:reconciliation.contradictions.length});
  }else add('contradictions','PASS','No browser/machine contradiction was detected in the supplied current facts.');

  const width=reconciliation.selected.width;
  const height=reconciliation.selected.height;
  const widthActual=width?.details?.actual??null;
  const heightActual=height?.details?.actual??null;
  const dimensionsTrusted=width?.trusted===true&&height?.trusted===true&&width?.stale!==true&&height?.stale!==true&&width?.value===true&&height?.value===true;
  if(!dimensionsTrusted){
    add('dimensions','BLOCKED','Trusted current output dimensions are not yet verified.',{expectedWidth,expectedHeight});
  }else if(widthActual!==expectedWidth||heightActual!==expectedHeight){
    add('dimensions','BLOCKED',`Rendered dimensions are ${widthActual}×${heightActual}, expected ${expectedWidth}×${expectedHeight}.`,{expectedWidth,expectedHeight,actualWidth:widthActual,actualHeight:heightActual});
  }else add('dimensions','PASS',`Rendered dimensions match ${expectedWidth}×${expectedHeight}.`,{actualWidth:widthActual,actualHeight:heightActual});

  const duration=reconciliation.selected.duration;
  if(duration?.trusted===true&&duration?.stale!==true&&duration?.value===true){
    add('duration','PASS','Rendered duration is available from current trusted evidence.',{actual:duration.details?.actual??null,source:duration.source||'unknown'});
  }else add('duration','BLOCKED','Rendered duration is not verified by current trusted evidence.');

  const audio=evidenceState(reconciliation,'audioStream');
  if(requireAudioStream){
    if(!audio.known)add('audio-stream','BLOCKED','Audio stream presence is unknown. FFprobe/bridge verification is required.');
    else if(!audio.verified)add('audio-stream','BLOCKED','The rendered file was verified without an audio stream.');
    else add('audio-stream','PASS','An audio stream is verified in the rendered file.',{source:audio.source});
  }else{
    add('audio-stream',audio.known?'PASS':'INFO',audio.known?(audio.verified?'Audio stream verified present.':'Audio stream verified absent.'):'Audio stream status is unknown; audio is not required by this gate.',{source:audio.source});
  }

  for(const [field,id,label,required] of [
    ['fps','fps','FPS',requireFps],
    ['videoCodec','video-codec','video codec',requireCodecs],
    ['container','container','container',requireContainer]
  ]){
    const fact=reconciliation.selected[field];
    const trusted=fact?.trusted===true&&fact?.stale!==true&&fact?.value===true;
    if(required&&!trusted)add(id,'BLOCKED',`Current trusted ${label} evidence is required but missing.`);
    else if(trusted)add(id,'PASS',`Current trusted ${label} evidence is available.`,{actual:fact.details?.actual??null,source:fact.source||'unknown'});
    else add(id,'INFO',`${label[0].toUpperCase()+label.slice(1)} is not verified; it is not required by this gate.`);
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
    reconciliation,
    publishAuthorized:false,
    note:'This gate verifies technical render facts only. It does not prove artistic quality, rights, platform eligibility, native AI audio, lip-sync quality, or publication readiness.'
  };
}
