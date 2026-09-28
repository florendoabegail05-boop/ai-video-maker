import {renderSignature} from './render-signature.mjs';
import {makeTechnicalEvidence,evidenceForCurrentRender} from './verification-evidence.mjs';

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
  return Object.is(av,bv)?null:{field,left:{kind:a.kind,source:a.source||'browser',value:av},right:{kind:b.kind,source:b.source||'browser',value:bv}};
}

export function reconcileFinalMediaFacts(project,...sets){
  const current=sets.filter(Boolean).filter(set=>set.renderSignature===renderSignature(project));
  const machine=current.filter(set=>set.kind==='aivm-v2-machine-final-media-facts');
  const browser=current.filter(set=>set.kind==='aivm-v2-browser-final-media-facts');
  const contradictions=[];
  for(const b of browser)for(const m of machine)for(const field of ['width','height','duration']){
    const item=contradiction(field,b,m);if(item)contradictions.push(item);
  }
  const bestMachine=machine.find(set=>set.source==='ffprobe')||machine[0]||null;
  const bestBrowser=browser[0]||null;
  const selected={};
  for(const field of ['width','height','duration','fileSize','mimeType','fps','audioStream','videoCodec','audioCodec','container','resolution1080x1920','resolution2160x3840']){
    const candidate=bestMachine?.evidence?.[field]||bestBrowser?.evidence?.[field]||null;
    selected[field]=candidate?evidenceForCurrentRender(project,candidate):null;
  }
  return {
    schema:1,
    kind:'aivm-v2-final-media-fact-reconciliation',
    projectId:project?.id||null,
    renderSignature:renderSignature(project),
    selected,
    contradictions,
    hasContradictions:contradictions.length>0,
    portable:true,
    publishAuthorized:false,
    note:'Trusted machine evidence is preferred for stream, FPS, codec, container and resolution claims. Unknown stays unknown. No local file paths are included.'
  };
}
