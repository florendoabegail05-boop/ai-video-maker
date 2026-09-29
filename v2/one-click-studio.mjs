import {createOneClickSession,oneClickCompletionStatus} from './one-click-orchestrator.mjs';
import {oneClickStatusView} from './one-click-status-view.mjs';
import {prepareNextOneClickDispatch,validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {commitOneClickGeneratedMedia} from './one-click-media-commit.mjs';
import {processOneClickDispatchResult} from './one-click-result-processor.mjs';
import {prepareOneClickRetryDispatch} from './one-click-retry-dispatch.mjs';
import {resolveManualOneClickJob} from './one-click-manual-resolution.mjs';
import {executeOneClickLocalJob} from './one-click-local-executor.mjs';
import {bridgeCapabilities,inspectLocalMedia} from './local-provider.mjs';
import {putFile} from './file-store.mjs';
import {revise,selectedProjectAudio} from './core.mjs';
import {setFinalVerification} from './publishing.mjs';
import {assetProvenance,setAssetProvenance} from './asset-provenance.mjs';
import {verifiedReleaseApprovalPreflight,makeVerifiedOwnerReleaseApproval,verifiedReleaseApprovalFreshness} from './verified-release-approval.mjs';
import {reconcileFinalMediaFacts} from './final-media-facts.mjs';

const KEY='aivm-v2-one-click-live-1';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function installOneClickStudio({getProject,saveProject,notice}){
  let records;try{records=JSON.parse(localStorage.getItem(KEY)||'{}');}catch{records={};}
  let busy=false;
  const host=el('section');host.id='oneClickStudio';host.className='asset-board';
  document.getElementById('createDraft').parentElement.after(host);
  const save=()=>localStorage.setItem(KEY,JSON.stringify(records));
  const state=()=>records[getProject()?.id];
  const options=record=>({creation:record.creation,factSets:record.factSets||[],technical:{requireFps:true,requireCodecs:true,requireContainer:true,requireAudioStream:!!(selectedProjectAudio(getProject(),'music')||selectedProjectAudio(getProject(),'voice'))},ownerReleaseApproval:record.approval||null});
  function rebaseMetadata(record,next){const revision=next.revision;record.session={...record.session,projectRevision:revision,plan:{...record.session.plan,projectRevision:revision},ledger:{...record.session.ledger,projectRevision:revision}};}
  function button(label,handler,disabled=false){const node=el('button',label);node.type='button';node.disabled=busy||disabled;node.addEventListener('click',()=>Promise.resolve().then(handler).catch(e=>notice(e.message)));return node;}
  function render(){
    host.replaceChildren(el('h2','One-click local production'));
    const project=getProject(),record=state();
    if(!project){host.append(el('p','Create or select a scene plan first.'));return;}
    if(!record){for(const name of ['Plan','Create','Verify','Owner Review'])host.append(el('p',name+': WAITING'));host.append(el('p','Create draft video starts the guarded FREE ONLY workflow. Audio is optional unless already imported; generated voice/music routes are not enabled.'));return;}
    const opt=options(record),view=oneClickStatusView(project,record.report,record.session,opt);
    host.append(el('strong',view.headline));
    const stages=view.sections?.length?view.sections:['Plan','Create','Verify','Owner Review'].map(label=>({label,state:'UNRESOLVED',detail:'Project changed; replan required.'}));
    for(const stage of stages)host.append(el('p',`${stage.label}: ${stage.state} · ${stage.detail}`));
    host.append(el('p',view.detail));
    host.append(button('Continue one-click',()=>run(),view.nextAction==='REPLAN'),button('Start fresh guarded plan',()=>runNew()));
    for(const entry of record.session.ledger.entries){
      if(['FAILED','BLOCKED','MANUAL','RUNNING'].includes(entry.state))host.append(el('p',`${entry.jobId}: ${entry.state} · ${entry.message||'Required work unresolved'}`));
      if(entry.state==='FAILED')host.append(button('Retry '+entry.jobId,()=>run(entry.jobId)));
      if(entry.state==='MANUAL')host.append(button('Resolve using local media: '+entry.jobId,()=>resolve(entry.jobId)));
    }
    const facts=reconcileFinalMediaFacts(project,...(record.factSets||[]));
    const factHost=el('div');factHost.id='oneClickFacts';
    for(const [field,label] of [['width','Width'],['height','Height'],['duration','Duration'],['fps','FPS'],['audioStream','Audio stream'],['videoCodec','Video codec'],['audioCodec','Audio codec'],['container','Container']]){
      const fact=facts.selected[field],known=fact?.trusted&&fact?.stale!==true&&fact?.value!==null;
      factHost.append(el('p',`${label}: ${known?(fact.value?'VERIFIED TRUE':'VERIFIED FALSE'):'UNKNOWN'}${known&&fact.details?.actual!==undefined?' · '+fact.details.actual:''} · ${fact?.source||'unknown'}`));
    }
    factHost.append(el('p','Native generated audio, lip-sync and artistic quality: UNKNOWN.'));
    host.append(factHost);
    const completion=oneClickCompletionStatus(project,record.report,record.session,opt);
    const preflight=verifiedReleaseApprovalPreflight(project,record.factSets||[],opt);
    const ready=completion.execution?.valid&&completion.execution.progress?.readyForVerification===true&&preflight.allowed;
    if(record.approval){const approval=verifiedReleaseApprovalFreshness(project,record.approval,record.factSets||[],opt);host.append(el('p',approval.fresh?'Verified owner approval current · MANUAL publish only':'Owner approval stale or invalid: '+approval.reason));}
    host.append(el('p',preflight.blockers.join(' ')||'Technical and rights preflight passed; explicit owner review still required.'));
    const rights=el('details');rights.append(el('summary','Review asset source, rights and credits'));
    for(const asset of project.assets){
      const row=el('div'),p=assetProvenance(asset);row.append(el('p',asset.name));
      const origin=el('select');origin.setAttribute('aria-label','Origin for '+asset.name);
      for(const value of ['unknown','owner-created','local-generated','imported','licensed','public-domain']){const option=el('option',value);option.value=value;origin.append(option);}origin.value=p.origin;
      const rightsStatus=el('select');rightsStatus.setAttribute('aria-label','Rights for '+asset.name);
      for(const value of ['unknown','needs-review','owner-confirmed','license-confirmed','public-domain-confirmed']){const option=el('option',value);option.value=value;rightsStatus.append(option);}rightsStatus.value=p.rightsStatus;
      const credit=el('input');credit.value=p.credit;credit.maxLength=240;credit.setAttribute('aria-label','Credit for '+asset.name);
      row.append(origin,rightsStatus,credit,button('Save rights record',()=>{
        const current=getProject();if(current.id!==project.id||current.revision!==project.revision)throw Error('Project changed; reopen rights review.');
        const next=revise(current,setAssetProvenance(current,asset.id,{...p,origin:origin.value,rightsStatus:rightsStatus.value,credit:credit.value}));
        if(record.session.projectRevision===current.revision)rebaseMetadata(record,next);
        saveProject(next);save();render();
      }));rights.append(row);
    }
    host.append(rights);
    const flags={};for(const [key,label] of [['visualAudioApproved','I reviewed the complete final video and audio'],['rightsApproved','I reviewed rights and credits'],['platformSettingsReviewed','I reviewed destination platform settings']]){
      const labelNode=el('label'),input=el('input');input.type='checkbox';input.disabled=busy||!ready;flags[key]=input;labelNode.append(input,document.createTextNode(label));host.append(labelNode);
    }
    host.append(button('Record verified owner review',()=>{
      const current=getProject();if(current.id!==project.id||current.revision!==project.revision)throw Error('Release changed; review it again.');
      const done=oneClickCompletionStatus(current,record.report,record.session,options(record));
      if(done.execution?.progress?.readyForVerification!==true)throw Error('Required creation work is not successful.');
      record.approval=makeVerifiedOwnerReleaseApproval(current,record.factSets,Object.fromEntries(Object.entries(flags).map(([key,input])=>[key,input.checked])),options(record));save();render();
    },!ready));
    host.append(el('p','Publishing remains manual. publishAuthorized: false · automaticPublishingAllowed: false'));
  }
  async function dispatch(record,prepared){
    record.session=prepared.session;save();render();const envelope=prepared.envelope;
    try{
      const result=await executeOneClickLocalJob(getProject,envelope,{output:record.output});
      let processed;
      if(['image','motion'].includes(envelope.jobType)&&!result.reused){
        processed=commitOneClickGeneratedMedia(getProject(),record.report,record.session,envelope,result,{creation:record.creation});
        if(processed.registeredMedia){await putFile(processed.asset.id,result.blob);const guard=validateOneClickDispatch(getProject(),envelope);if(!guard.ok)throw Error(guard.reason);saveProject(processed.project);}
      }else processed=processOneClickDispatchResult(getProject(),record.report,record.session,envelope,result,{creation:record.creation});
      record.session=processed.session;
      if(!processed.accepted)throw Error(processed.reason);
      if(result.output){record.output=result.output;showOutput(result.output);}
      if(result.factSets){record.factSets=result.factSets;const next=setFinalVerification(getProject(),result.manifest);rebaseMetadata(record,next);saveProject(next);showOutput(record.output);}
      notice(result.message||'Guarded local job completed.');save();return true;
    }catch(error){
      const rejected=processOneClickDispatchResult(getProject(),record.report,record.session,envelope,{ok:false,error:error.message},{creation:record.creation});
      record.session=rejected.session;save();notice('One-click stopped: '+error.message+'. Files were preserved; retry is explicit.');return false;
    }finally{render();}
  }
  function showOutput(output){if(!output?.url||!/^http:\/\/127\.0\.0\.1:8787\/v1\/exports\/[a-f0-9-]+$/.test(output.url))return;const link=el('a','Download one-click final MP4');link.href=output.url;link.download='aivm-v2-final.mp4';document.getElementById('finalVideo').replaceChildren(link);}
  async function runNew(){
    if(busy)return;const project=getProject();if(!project?.scenes.length)throw Error('Create a scene plan first.');
    busy=true;document.getElementById('createDraft').disabled=true;let report;
    try{report=await bridgeCapabilities();}finally{busy=false;document.getElementById('createDraft').disabled=false;}if(getProject()?.id!==project.id||getProject().revision!==project.revision)throw Error('Project changed during setup.');
    if(report.mock)throw Error('Mock bridge cannot run production.');
    const creation={wantMotion:true,wantAudio:!!(selectedProjectAudio(project,'music')||selectedProjectAudio(project,'voice')),wantCaptions:true};
    const previous=records[project.id];records[project.id]={session:createOneClickSession(project,report,{creation}),creation,report,factSets:[],approval:previous?.approval||null};save();await run();
  }
  async function run(retryId=null){
    if(busy)return;const record=state();if(!record)return runNew();busy=true;document.getElementById('createDraft').disabled=true;
    try{
      if(retryId){const retry=prepareOneClickRetryDispatch(getProject(),record.report,record.session,retryId,{creation:record.creation,explicitRetry:true});if(!retry.prepared)throw Error(retry.reason);if(!await dispatch(record,retry))return;}
      for(let step=0;step<100;step++){
        if(state()!==record)throw Error('Selected project changed.');
        const prepared=prepareNextOneClickDispatch(getProject(),record.report,record.session,{creation:record.creation});
        if(!prepared.prepared){notice(prepared.nextAction+': '+prepared.reason);break;}
        if(!await dispatch(record,prepared))break;
      }
    }finally{busy=false;document.getElementById('createDraft').disabled=false;render();}
  }
  async function resolve(jobId){
    if(busy)return;const project=getProject(),record=state();if(!record)return;
    busy=true;
    try{
      const result=resolveManualOneClickJob(project,record.report,record.session,jobId,{creation:record.creation,explicitResolution:true});
      if(!result.resolved)throw Error(result.reason);
      for(const id of result.resultAssetIds||[]){const asset=project.assets.find(a=>a.id===id);if(!asset?.sourcePath)throw Error('Local media path missing.');await inspectLocalMedia(asset.sourcePath);}
      if(getProject()?.id!==project.id||getProject().revision!==project.revision)throw Error('Project changed during media inspection.');
      record.session=result.session;save();notice('Manual step resolved from inspected local media.');
    }finally{busy=false;render();}
  }
  new MutationObserver(()=>queueMicrotask(render)).observe(document.getElementById('summary'),{childList:true,characterData:true,subtree:true});
  render();return {runNew,render};
}
