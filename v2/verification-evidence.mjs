import {renderSignature} from './render-signature.mjs';

const SOURCES=new Set(['browser','bridge','ffprobe','unknown']);
const SOURCE_RANK={unknown:0,browser:1,bridge:2,ffprobe:3};
const BROWSER_FIELDS=new Set(['width','height','duration','fileSize','mimeType']);

function tri(value){
  if(value===true||value===false||value===null)return value;
  throw Error('Verification evidence value must be true, false, or null.');
}

function clean(value,max=120){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function sourceSupportsTechnicalField(source,field){
  source=SOURCES.has(source)?source:'unknown';
  field=clean(field,80);
  if(source==='ffprobe'||source==='bridge')return true;
  if(source==='browser')return BROWSER_FIELDS.has(field);
  return false;
}

export function makeTechnicalEvidence(value,{source='unknown',field='unknown',renderSignature:signature=null,observedAt=null,details=null}={}){
  source=SOURCES.has(source)?source:'unknown';
  field=clean(field,80)||'unknown';
  const normalized=tri(value);
  const trusted=sourceSupportsTechnicalField(source,field);
  return {
    schema:1,
    kind:'aivm-v2-technical-evidence',
    field,
    value:normalized,
    source,
    trusted,
    renderSignature:signature||null,
    observedAt:observedAt||null,
    details:details??null
  };
}

export function evidenceForCurrentRender(project,evidence){
  if(!evidence||evidence.kind!=='aivm-v2-technical-evidence')return{...makeTechnicalEvidence(null),stale:true,reason:'missing-or-invalid'};
  const current=renderSignature(project);
  if(evidence.renderSignature&&evidence.renderSignature!==current){
    return {...evidence,value:null,stale:true,reason:'render-inputs-changed',currentRenderSignature:current};
  }
  return {...evidence,stale:false,reason:'current',currentRenderSignature:current};
}

export function chooseBestTechnicalEvidence(project,...facts){
  const current=facts.filter(Boolean).map(item=>evidenceForCurrentRender(project,item));
  if(!current.length)return evidenceForCurrentRender(project,makeTechnicalEvidence(null));
  current.sort((a,b)=>{
    const aExplicit=a.value===null?0:1,bExplicit=b.value===null?0:1;
    if(aExplicit!==bExplicit)return bExplicit-aExplicit;
    const aTrusted=a.trusted?1:0,bTrusted=b.trusted?1:0;
    if(aTrusted!==bTrusted)return bTrusted-aTrusted;
    const sourceDiff=(SOURCE_RANK[b.source]||0)-(SOURCE_RANK[a.source]||0);
    if(sourceDiff)return sourceDiff;
    return String(b.observedAt||'').localeCompare(String(a.observedAt||''));
  });
  return current[0];
}

export function verifiedTechnicalClaim(project,evidence){
  const current=evidenceForCurrentRender(project,evidence);
  return current.value===true&&current.trusted===true&&current.stale===false;
}

export function technicalFactSummary(project,facts={}){
  const output={};
  for(const [field,value] of Object.entries(facts)){
    const evidence=Array.isArray(value)?chooseBestTechnicalEvidence(project,...value):evidenceForCurrentRender(project,value);
    output[field]={value:evidence.value,source:evidence.source,trusted:evidence.trusted===true,stale:evidence.stale===true,verifiedTrue:evidence.value===true&&evidence.trusted===true&&!evidence.stale};
  }
  return {
    schema:1,
    kind:'aivm-v2-technical-fact-summary',
    projectId:project?.id||null,
    renderSignature:renderSignature(project),
    facts:output,
    note:'Unknown stays unknown. Browser evidence is limited to fields the browser can directly establish. Stream, codec and FPS claims require bridge/FFprobe-class evidence.'
  };
}
