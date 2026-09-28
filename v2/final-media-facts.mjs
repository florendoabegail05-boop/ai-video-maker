import {renderSignature} from './render-signature.mjs';
import {makeTechnicalEvidence,evidenceForCurrentRender} from './verification-evidence.mjs';

const BROWSER_OBSERVABLE_FIELDS=new Set(['width','height','duration','fileSize','mimeType']);
const SOURCE_PRIORITY={ffprobe:3,bridge:2,browser:1,unknown:0};
const DURATION_CONTRADICTION_TOLERANCE_SECONDS=0.05;

function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function text(value,max=120){const s=String(value??'').replace(/\s+/g,' ').trim();return s?s.slice(0,max):null;}
function boolOrNull(value){return value===true||value===false?value:null;}
function observedAt(value){return text(value,80);}

function evidence(project,field,value,source,details,at){
  return makeTechnicalEvidence(value,{source,field,renderSignature:renderSignature(project),observedAt:observedAt(at),details});
}

export function browserFinalMediaFacts(project,facts={}){
  const width=finite(facts.width),height=finite(facts.height),duration=finite(facts.duration),fileSize=finite(facts.fileSize),mimeType=text(facts.mimeType,120);
  return {
    schema:1,
    kind:'aivm-v2-browser-final-media-facts',
    renderSignature:renderSignature(project),
    raw:{width,height,duration,fileSize,mimeType},
    evidence:{
      width:evidence(project,'width',width===null?null:width>0,'browser',{actual:width},facts.observedAt),
      height:evidence(project,'height',height===null?null:height>0,'browser',{actual:height},facts.observedAt),
      duration:evidence(project,'duration',duration===null?null:duration>=0,'browser',{actual:duration},facts.observedAt),
      fileSize:evidence(project,'fileSize',fileSize===null?null:fileSize>=0,'browser',{actual:fileSize},facts.observedAt),
      mimeType:evidence(project,'mimeType',mimeType===null?null:true,'browser',{actual:mimeType},facts.observedAt)
    },
    note:'Browser facts are limited to values the browser can directly observe. They do not establish stream presence, FPS, codecs or container internals.'
  };
}

export function machineFinalMediaFacts(project,facts={},source='ffprobe'){
  if(source!=='ffprobe'&&source!=='bridge')throw Error('Machine final media facts require ffprobe or bridge source.');
  const width=finite(facts.width),height=finite(facts.height),duration=finite(facts.duration),fps=finite(facts.fps);
  const audioStream=boolOrNull(facts.audioStream),videoCodec=text(facts.videoCodec),audioCodec=text(facts.audioCodec),container=text(facts.container);
  const signature=renderSignature(project);
  const at=facts.observedAt;
  return {
    schema:1,
    kind:'aivm-v2-machine-final-media-facts',
    source,
    renderSignature:signature,
    raw:{width,height,duration,fps,audioStream,videoCodec,audioCodec,container},
    evidence:{
      width:evidence(project,'width',width===null?null:width>0,source,{actual:width},at),
      height:evidence(project,'height',height===null?null:height>0,source,{actual:height},at),
      duration:evidence(project,'duration',duration===null?null:duration>=0,source,{actual:duration},at),
      fps:evidence(project,'fps',fps===null?null:fps>0,source,{actual:fps},at),
      audioStream:evidence(project,'audioStream',audioStream,source,{actual:audioStream},at),
      videoCodec:evidence(project,'videoCodec',videoCodec===null?null:true,source,{actual:videoCodec},at),
      audioCodec:evidence(project,'audioCodec',audioCodec===null?null:true,source,{actual:audioCodec},at),
      container:evidence(project,'container',container===null?null:true,source,{actual:container},at),
      resolution1080x1920:evidence(project,'resolution1080x1920',width===null||height===null?null:width===1080&&height===1920,source,{width,height},at),
      resolution2160x3840:evidence(project,'resolution2160x3840',width===null||height===null?null:width===2160&&height===3840,source,{width,height},at)
    },
    note:'Machine facts describe the current rendered file only. Audio-stream evidence does not prove native generated audio, and dimensions do not prove artistic quality.'
  };
}

function contradiction(field,a,b){
  const av=a?.raw?.[field],bv=b?.raw?.[field];
  if(av===null||av===undefined||bv===null||bv===undefined)return null;
  if(field==='duration'){
    const left=Number(av),right=Number(bv);
    if(Number.isFinite(left)&&Number.isFinite(right)){
      const delta=Math.abs(left-right);
      if(delta<=DURATION_CONTRADICTION_TOLERANCE_SECONDS)return null;
      return {
        field,
        left:{kind:a.kind,source:a.source||'browser',value:av},
        right:{kind:b.kind,source:b.source||'browser',value:bv},
        deltaSeconds:delta,
        toleranceSeconds:DURATION_CONTRADICTION_TOLERANCE_SECONDS
      };
    }
  }
  return Object.is(av,bv)?null:{field,left:{kind:a.kind,source:a.source||'browser',value:av},right:{kind:b.kind,source:b.source||'browser',value:bv}};
}

function currentEvidence(project,set,field){
  const candidate=set?.evidence?.[field];
  return candidate?evidenceForCurrentRender(project,candidate):null;
}

function selectFieldEvidence(project,field,machine,browser){
  const candidates=[];
  for(const set of machine){
    const current=currentEvidence(project,set,field);
    if(current)candidates.push(current);
  }
  if(BROWSER_OBSERVABLE_FIELDS.has(field)){
    for(const set of browser){
      const current=currentEvidence(project,set,field);
      if(current)candidates.push(current);
    }
  }
  if(!candidates.length)return null;
  candidates.sort((a,b)=>{
    const aCurrent=a.stale===true?0:1,bCurrent=b.stale===true?0:1;
    if(aCurrent!==bCurrent)return bCurrent-aCurrent;
    const aTrusted=a.trusted===true?1:0,bTrusted=b.trusted===true?1:0;
    if(aTrusted!==bTrusted)return bTrusted-aTrusted;
    const aExplicit=a.value===null?0:1,bExplicit=b.value===null?0:1;
    if(aExplicit!==bExplicit)return bExplicit-aExplicit;
    const source=(SOURCE_PRIORITY[b.source]||0)-(SOURCE_PRIORITY[a.source]||0);
    if(source)return source;
    return String(b.observedAt||'').localeCompare(String(a.observedAt||''));
  });
  return candidates[0];
}

export function reconcileFinalMediaFacts(project,...sets){
  const signature=renderSignature(project);
  const current=sets.filter(Boolean).filter(set=>set.renderSignature===signature);
  const machine=current.filter(set=>set.kind==='aivm-v2-machine-final-media-facts');
  const browser=current.filter(set=>set.kind==='aivm-v2-browser-final-media-facts');
  const contradictions=[];
  for(const b of browser)for(const m of machine)for(const field of ['width','height','duration']){
    const item=contradiction(field,b,m);if(item)contradictions.push(item);
  }
  const selected={};
  for(const field of ['width','height','duration','fileSize','mimeType','fps','audioStream','videoCodec','audioCodec','container','resolution1080x1920','resolution2160x3840']){
    selected[field]=selectFieldEvidence(project,field,machine,browser);
  }
  return {
    schema:1,
    kind:'aivm-v2-final-media-fact-reconciliation',
    projectId:project?.id||null,
    renderSignature:signature,
    selected,
    contradictions,
    hasContradictions:contradictions.length>0,
    durationContradictionToleranceSeconds:DURATION_CONTRADICTION_TOLERANCE_SECONDS,
    portable:true,
    publishAuthorized:false,
    note:'Current trusted explicit machine evidence is preferred. Browser-observable fields may fall back to current trusted browser evidence when machine evidence is unknown. Stream, FPS, codec, container and resolution claims never fall back to browser facts. Unknown stays unknown and no local file paths are included.'
  };
}
