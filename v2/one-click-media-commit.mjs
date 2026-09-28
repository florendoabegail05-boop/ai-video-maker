import {addAsset,reusableAsset} from './core.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {inspectOneClickSession} from './one-click-orchestrator.mjs';
import {validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {validateGenerationInputGuard} from './generation-input-guard.mjs';
import {validateLocalGeneratedMediaPath,generatedMediaBasename} from './local-generated-path-policy.mjs';
import {processOneClickDispatchResult} from './one-click-result-processor.mjs';

const MEDIA_KIND_BY_JOB={image:'image',motion:'video'};

function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function finite(value){const n=Number(value);return Number.isFinite(n)&&n>=0?n:null;}
function resultOk(result){return result?.ok===true||result?.success===true||result?.status==='ok'||result?.status==='success';}
function staleReason(reason=''){return String(reason).startsWith('stale-dispatch:')||String(reason).startsWith('stale-generation:');}

function parentForMotion(project,sceneId,result={}){
  const requested=clean(result.parentAssetId,120);
  if(requested){
    const parent=(project.assets||[]).find(asset=>asset.id===requested);
    if(!parent)return {ok:false,reason:'motion-parent-missing'};
    if(parent.kind!=='image')return {ok:false,reason:'motion-parent-not-image'};
    if(parent.sceneId!==sceneId)return {ok:false,reason:'motion-parent-cross-scene'};
    if(!parent.sourcePath||parent.hasFile===false)return {ok:false,reason:'motion-parent-file-missing'};
    if(parent.status==='needs regeneration')return {ok:false,reason:'motion-parent-stale'};
    return {ok:true,parentAssetId:parent.id};
  }
  const reusable=reusableAsset(project,sceneId,'image');
  return reusable?{ok:true,parentAssetId:reusable.id}:{ok:false,reason:'motion-source-image-missing'};
}

function staleMotionGenerationReason(project,envelope,result,dispatchReason){
  if(envelope?.jobType!=='motion'||!String(dispatchReason||'').startsWith('stale-dispatch:'))return null;
  const expectedParentId=clean(envelope.payload?.sourceAssetId||envelope.generationGuard?.parentAssetId,120);
  const reportedParentId=clean(result?.parentAssetId,120);
  if(!expectedParentId||!reportedParentId||reportedParentId===expectedParentId)return null;
  const route=clean(envelope.payload?.route||'local-generated',120);
  const generation=validateGenerationInputGuard(project,envelope.generationGuard,{route,parentAssetId:reportedParentId});
  return generation.ok?null:`stale-generation:${generation.reason}`;
}

export function prepareGeneratedMediaRegistration(project,envelope,result={}){
  if(!project?.id)return {ok:false,reason:'project-missing'};
  if(!envelope||envelope.kind!=='aivm-v2-one-click-dispatch-envelope')return {ok:false,reason:'invalid-envelope'};
  const kind=MEDIA_KIND_BY_JOB[envelope.jobType];
  if(!kind)return {ok:false,reason:'job-does-not-produce-scene-media'};
  const dispatch=validateOneClickDispatch(project,envelope);
  if(!dispatch.ok){
    const generationReason=staleMotionGenerationReason(project,envelope,result,dispatch.reason);
    return {ok:false,reason:generationReason||dispatch.reason};
  }
  if(!resultOk(result))return {ok:false,reason:'executor-result-not-successful'};
  const sceneId=envelope.sceneId;
  const scene=(project.scenes||[]).find(item=>item.id===sceneId);
  if(!scene)return {ok:false,reason:'target-scene-missing'};
  const source=validateLocalGeneratedMediaPath(result.sourcePath,kind);
  if(!source.ok)return source;
  const route=clean(envelope.payload?.route||'local-generated',120);
  if(/paid|future-provider/i.test(route))return {ok:false,reason:'unsafe-or-paid-route'};
  let parentAssetId=null;
  if(kind==='video'){
    const expectedParentId=clean(envelope.payload?.sourceAssetId||envelope.generationGuard?.parentAssetId,120);
    const reportedParentId=clean(result.parentAssetId,120);
    if(!expectedParentId)return {ok:false,reason:'motion-source-image-missing'};
    if(!reportedParentId)return {ok:false,reason:'motion-parent-evidence-missing'};
    if(reportedParentId!==expectedParentId)return {ok:false,reason:'motion-parent-mismatch',expectedParentAssetId:expectedParentId,reportedParentAssetId:reportedParentId};
    const parent=parentForMotion(project,sceneId,{...result,parentAssetId:expectedParentId});
    if(!parent.ok)return parent;
    parentAssetId=parent.parentAssetId;
    const generation=validateGenerationInputGuard(project,envelope.generationGuard,{route,parentAssetId});
    if(!generation.ok)return {ok:false,reason:`stale-generation:${generation.reason}`};
  }
  const name=clean(result.name,180)||clean(generatedMediaBasename(source.path),180)||`${envelope.jobType}-${scene.order||sceneId}`;
  return {
    ok:true,
    reason:'registration-ready',
    asset:{
      kind,
      name,
      hasFile:true,
      size:finite(result.size)||0,
      duration:kind==='video'?(finite(result.duration)||Number(scene.duration)||null):null,
      sourcePath:source.path,
      provider:route||'local-generated',
      parentAssetId
    },
    sceneId,
    jobId:envelope.jobId,
    note:'Registration is additive only. Generated media paths must be absolute local paths with supported media extensions; existing assets are never overwritten or deleted.'
  };
}

export function commitOneClickGeneratedMedia(project,report,session,envelope,result={},options={}){
  if(!MEDIA_KIND_BY_JOB[envelope?.jobType]){
    const processed=processOneClickDispatchResult(project,report,session,envelope,result,options);
    return {...processed,project,registeredMedia:false};
  }
  if(!resultOk(result)){
    const processed=processOneClickDispatchResult(project,report,session,envelope,result,options);
    return {...processed,project,registeredMedia:false};
  }
  const prepared=prepareGeneratedMediaRegistration(project,envelope,result);
  if(!prepared.ok){
    return {
      accepted:false,
      registeredMedia:false,
      reason:prepared.reason,
      nextAction:staleReason(prepared.reason)?'REPLAN':'REVIEW_BLOCKERS',
      project,
      session,
      publishAuthorized:false,
      note:'Generated media was not registered and the current project/session remain unchanged.'
    };
  }

  const processed=processOneClickDispatchResult(project,report,session,envelope,{...result,assetIds:[]},options);
  if(!processed.accepted)return {...processed,project,registeredMedia:false};

  const updatedProject=addAsset(project,prepared.sceneId,prepared.asset);
  const newAsset=updatedProject.assets.at(-1);
  let ledger=updateDraftJobState(processed.session.ledger,envelope.jobId,'DONE',{
    message:clean(result.message||'Generated media registered after guarded executor success.'),
    resultAssetIds:[newAsset.id]
  });
  const rebasedRevision=Number(updatedProject.revision)||0;
  ledger={...ledger,projectRevision:rebasedRevision};
  const plan={...processed.session.plan,projectRevision:rebasedRevision};
  const updatedSession={...processed.session,projectRevision:rebasedRevision,plan,ledger};
  const execution=inspectOneClickSession(updatedProject,report,updatedSession,{creation:options.creation||{}});
  return {
    accepted:true,
    registeredMedia:true,
    reason:'guarded-media-registered',
    project:updatedProject,
    session:updatedSession,
    asset:{id:newAsset.id,sceneId:newAsset.sceneId,kind:newAsset.kind,name:newAsset.name,provider:newAsset.provider,parentAssetId:newAsset.parentAssetId||null},
    nextAction:execution.valid?execution.nextAction:'REPLAN',
    nextJob:execution.valid?execution.nextJob:null,
    execution,
    automaticPublishingAllowed:false,
    destructiveReplacementAllowed:false,
    publishAuthorized:false,
    note:'The generated file is registered as a new candidate asset. Existing media is preserved; Keep/Lock/selection decisions remain owner- or workflow-controlled.'
  };
}
