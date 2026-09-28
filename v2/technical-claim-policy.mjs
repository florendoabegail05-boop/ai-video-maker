import {chooseBestTechnicalEvidence,evidenceForCurrentRender} from './verification-evidence.mjs';

const STRICT_FIELDS=new Set(['audioStream','fps','codec','bitrate','nativeAudio','lipSync','fourK','resolutionClass']);

function normalizeFacts(project,facts={}){
  const out={};
  for(const [field,value] of Object.entries(facts)){
    out[field]=Array.isArray(value)
      ?chooseBestTechnicalEvidence(project,...value)
      :evidenceForCurrentRender(project,value);
  }
  return out;
}

export function claimDecision(project,field,evidence){
  const current=evidenceForCurrentRender(project,evidence);
  const strict=STRICT_FIELDS.has(field);
  const verified=current.value===true&&current.trusted===true&&current.stale===false;
  const disproved=current.value===false&&current.trusted===true&&current.stale===false;
  let state='UNKNOWN';
  if(verified)state='VERIFIED TRUE';
  else if(disproved)state='VERIFIED FALSE';
  else if(current.stale)state='STALE';
  else if(current.value!==null&&!current.trusted)state='UNTRUSTED';
  return {
    field,
    state,
    mayClaimAvailable:verified,
    mayClaimUnavailable:disproved,
    strict,
    source:current.source||'unknown',
    trusted:current.trusted===true,
    stale:current.stale===true,
    note:verified
      ?'Positive capability/output claim is supported by current trusted evidence.'
      :disproved
        ?'Negative capability/output claim is supported by current trusted evidence.'
        :'Do not convert missing, stale, unsupported or untrusted evidence into a positive or negative technical claim.'
  };
}

export function technicalClaimReport(project,facts={}){
  const normalized=normalizeFacts(project,facts);
  const claims={};
  for(const [field,evidence] of Object.entries(normalized))claims[field]=claimDecision(project,field,evidence);
  const blockedPositiveClaims=Object.values(claims).filter(item=>!item.mayClaimAvailable).map(item=>item.field);
  return {
    schema:1,
    kind:'aivm-v2-technical-claim-report',
    projectId:project?.id||null,
    claims,
    blockedPositiveClaims,
    note:'Capability and output labels must follow evidence. Unknown is not false, and a configured route is not proof that a feature actually worked in the current output.'
  };
}

export function safeCapabilityLabel(project,field,evidence,{availableLabel='Verified available',unavailableLabel='Verified unavailable',unknownLabel='Not verified'}={}){
  const decision=claimDecision(project,field,evidence);
  if(decision.mayClaimAvailable)return availableLabel;
  if(decision.mayClaimUnavailable)return unavailableLabel;
  return unknownLabel;
}
