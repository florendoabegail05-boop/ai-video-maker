import {buildRoutePlan} from './provider-router.mjs';
import {technicalClaimReport,safeCapabilityLabel} from './technical-claim-policy.mjs';

function routeState(route){
  if(!route)return {configured:false,verified:false,kind:'unavailable'};
  return {
    configured:route.kind!=='unavailable',
    verified:route.verified===true,
    kind:route.kind||'unavailable',
    reason:route.reason||null
  };
}

export function capabilityDisclosure(report,{project=null,evidence={},costMode='FREE ONLY',ownerApproved=false}={}){
  const plan=buildRoutePlan(report,{costMode,ownerApproved});
  const claims=project?technicalClaimReport(project,evidence):{claims:{},blockedPositiveClaims:[]};
  const quality={
    photorealisticImage:{targetPossible:plan.quality.photorealisticImage===true,verifiedOutput:claims.claims.photorealisticImage?.mayClaimAvailable===true},
    photorealisticMotion:{targetPossible:plan.quality.photorealisticMotion===true,verifiedOutput:claims.claims.photorealisticMotion?.mayClaimAvailable===true},
    nativeAudio:{targetPossible:plan.quality.nativeAudio===true,verifiedOutput:claims.claims.nativeAudio?.mayClaimAvailable===true},
    lipSync:{targetPossible:plan.quality.lipSync===true,verifiedOutput:claims.claims.lipSync?.mayClaimAvailable===true},
    output4k:{targetPossible:plan.quality.output4k===true,verifiedOutput:claims.claims.fourK?.mayClaimAvailable===true}
  };
  return {
    schema:1,
    kind:'aivm-v2-capability-disclosure',
    costMode:plan.costMode,
    routes:{
      image:routeState(plan.image),
      video:routeState(plan.video),
      voice:routeState(plan.audio.voice),
      music:routeState(plan.audio.music),
      sfx:routeState(plan.audio.sfx),
      lipSync:routeState(plan.audio.lipSync)
    },
    quality,
    blockedPositiveClaims:claims.blockedPositiveClaims||[],
    note:'A configured or verified route proves only that the route is available. It does not prove the requested quality was achieved in the current output. Quality targets and verified output claims must remain separate.'
  };
}

export function capabilityDisclosureRows(report,{project=null,evidence={},costMode='FREE ONLY',ownerApproved=false}={}){
  const disclosure=capabilityDisclosure(report,{project,evidence,costMode,ownerApproved});
  const rows=[];
  for(const [name,route] of Object.entries(disclosure.routes)){
    rows.push({section:'route',name,state:route.verified?'VERIFIED ROUTE':route.configured?'CONFIGURED / NOT VERIFIED':'UNAVAILABLE',detail:route.kind});
  }
  for(const [name,item] of Object.entries(disclosure.quality)){
    rows.push({
      section:'quality',
      name,
      state:item.verifiedOutput?'VERIFIED IN CURRENT OUTPUT':item.targetPossible?'QUALITY TARGET / NOT OUTPUT-VERIFIED':'NOT VERIFIED',
      detail:item.verifiedOutput?'Current trusted evidence supports this output claim.':item.targetPossible?'The active route may target this quality, but current output evidence does not verify it.':'No verified capability/output evidence supports this claim.'
    });
  }
  return rows;
}

export function safeQualityLabel(project,field,evidence,{targetPossible=false}={}){
  if(!project)return targetPossible?'Quality target only — output not verified':'Not verified';
  const verified=safeCapabilityLabel(project,field,evidence,{availableLabel:'Verified in current output',unavailableLabel:'Verified unavailable',unknownLabel:null});
  if(verified)return verified;
  return targetPossible?'Quality target only — output not verified':'Not verified';
}
