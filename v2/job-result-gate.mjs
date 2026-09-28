import {validateOperationGuard} from './operation-guard.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';

function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function jobGuardOptions(job={}){
  if(job.type==='assemble'||job.type==='verify')return {allowUnrelatedRevision:false,requireRenderMatch:true};
  if(job.type==='image'||job.type==='motion')return {allowUnrelatedRevision:true,requireRenderMatch:false};
  return {allowUnrelatedRevision:false,requireRenderMatch:false};
}

export function evaluateDraftJobResult(project,ledger,job,result,{guard}={}){
  if(!project?.id)throw Error('Project is required.');
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  if(!job?.id)throw Error('Draft job is required.');
  const entry=(ledger.entries||[]).find(item=>item.jobId===job.id);
  if(!entry)return {accepted:false,reason:'job-not-in-ledger'};
  if(entry.stale)return {accepted:false,reason:'ledger-entry-stale'};
  if(entry.state!=='RUNNING')return {accepted:false,reason:'job-not-running'};
  const guardCheck=validateOperationGuard(project,guard,jobGuardOptions(job));
  if(!guardCheck.ok)return {accepted:false,reason:`stale-result:${guardCheck.reason}`};
  const resultAssetIds=[...new Set((result?.assetIds||[]).filter(Boolean))];
  const currentAssets=new Set((project.assets||[]).map(asset=>asset.id));
  const unknownAssets=resultAssetIds.filter(id=>!currentAssets.has(id));
  if(unknownAssets.length)return {accepted:false,reason:'result-assets-not-in-project',unknownAssetIds:unknownAssets};
  const protectedAssets=resultAssetIds.filter(id=>project.assets.find(asset=>asset.id===id)?.locked===true);
  if(protectedAssets.length&&job.type!=='verify')return {accepted:false,reason:'result-target-locked',protectedAssetIds:protectedAssets};
  return {
    accepted:true,
    reason:'match',
    resultAssetIds,
    ledger:updateDraftJobState(ledger,job.id,'DONE',{
      message:clean(result?.message||'Guarded result accepted.'),
      resultAssetIds
    }),
    note:'This acceptance updates progress metadata only. Applying bytes or replacing media must remain a separate non-destructive step.'
  };
}

export function rejectDraftJobResult(ledger,jobId,reason='result rejected'){
  if(!ledger||ledger.kind!=='aivm-v2-draft-execution-ledger')throw Error('Draft execution ledger is required.');
  return updateDraftJobState(ledger,jobId,'FAILED',{message:clean(reason)});
}
