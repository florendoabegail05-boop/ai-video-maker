import {publishingReadiness} from './publishing-readiness.mjs';
import {publishingDetails} from './publishing.mjs';
import {renderSignature} from './render-signature.mjs';
import {provenanceAudit} from './asset-provenance.mjs';

function stableStringify(value){
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stableStringify(value[key])).join(',')+'}';
}
function hash32(text){let hash=0x811c9dc5;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function clean(value,max=160){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function releaseDescriptor(project){
  const details=publishingDetails(project);
  const provenance=provenanceAudit(project);
  return {
    schema:1,
    projectId:project?.id||null,
    renderSignature:renderSignature(project),
    publishing:{title:details.title||'',description:details.description||''},
    provenance:provenance.items.map(item=>({assetId:item.assetId,rightsStatus:item.rightsStatus,credit:item.credit||null})).sort((a,b)=>String(a.assetId).localeCompare(String(b.assetId)))
  };
}

export function releaseSignature(project){return `rel1-${hash32(stableStringify(releaseDescriptor(project)))}`;}

export function releaseApprovalPreflight(project){
  const readiness=publishingReadiness(project);
  const provenance=provenanceAudit(project);
  const blockers=[];
  if(!readiness.readyForOwnerReview)blockers.push('Deterministic publishing readiness still has blocking items.');
  if(!provenance.complete)blockers.push(`${provenance.summary.needingReview} asset rights/source record${provenance.summary.needingReview===1?'':'s'} still need owner review.`);
  return {
    allowed:blockers.length===0,
    blockers,
    releaseSignature:releaseSignature(project),
    renderSignature:readiness.renderSignature||renderSignature(project),
    readinessState:readiness.state,
    provenanceSummary:provenance.summary,
    note:'Passing preflight does not publish anything. Explicit owner approval is still required.'
  };
}

export function makeOwnerReleaseApproval(project,values={}){
  const preflight=releaseApprovalPreflight(project);
  if(!preflight.allowed)throw Error(preflight.blockers.join(' '));
  if(values.visualAudioApproved!==true)throw Error('Owner visual/audio approval is required.');
  if(values.rightsApproved!==true)throw Error('Owner rights/credits approval is required.');
  if(values.platformSettingsReviewed!==true)throw Error('Owner platform-settings review is required.');
  return {
    schema:1,
    kind:'aivm-v2-owner-release-approval',
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    releaseSignature:preflight.releaseSignature,
    renderSignature:preflight.renderSignature,
    approvedAt:new Date().toISOString(),
    visualAudioApproved:true,
    rightsApproved:true,
    platformSettingsReviewed:true,
    ownerNote:clean(values.ownerNote,300)||null,
    publishAuthorized:false,
    note:'Owner review record only. It does not upload, publish, schedule, or authorize automatic publishing.'
  };
}

export function releaseApprovalFreshness(project,approval){
  if(!approval||approval.kind!=='aivm-v2-owner-release-approval'||approval.projectId!==project?.id){return{fresh:false,reason:'missing-or-invalid'};}
  const current=releaseSignature(project);
  if(approval.releaseSignature!==current)return{fresh:false,reason:'release-inputs-changed',currentSignature:current,approvedSignature:approval.releaseSignature||null};
  return{fresh:true,reason:'match',currentSignature:current,approvedSignature:approval.releaseSignature};
}
