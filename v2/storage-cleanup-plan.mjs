import {reusableAsset,selectedProjectAudio} from './core.mjs';

function protectReason(asset,project){
  if(asset.locked)return 'locked owner-approved asset';
  if(asset.reference===true)return 'active character/world reference';
  if(asset.kind==='audio'){
    if(selectedProjectAudio(project,asset.role)?.id===asset.id)return 'selected project audio';
    return null;
  }
  if(asset.sceneId&&['image','video'].includes(asset.kind)){
    if(reusableAsset(project,asset.sceneId,asset.kind)?.id===asset.id)return `selected ${asset.kind} for a scene`;
  }
  return null;
}

export function storageCleanupPlan(project){
  const assets=Array.isArray(project?.assets)?project.assets:[];
  const items=assets.map(asset=>{
    const protectedBy=protectReason(asset,project);
    const missing=asset.hasFile===false||!asset.sourcePath;
    const stale=asset.status==='needs regeneration'||asset.status==='missing local file';
    const derived=!!asset.parentAssetId;
    const candidate=!protectedBy&&!missing&&stale&&derived;
    return {
      assetId:asset.id,
      name:asset.name||asset.id,
      kind:asset.kind||null,
      size:Number(asset.size)||0,
      status:asset.status||null,
      protected:!!protectedBy,
      protectedBy:protectedBy||null,
      candidateForOwnerReview:candidate,
      reason:protectedBy
        ?`Preserve: ${protectedBy}.`
        :missing
          ?'No connected local file is available to clean up.'
          :candidate
            ?'Unlocked derived media is stale and may be reviewed by the owner for optional cleanup.'
            :'Preserve by default; no safe cleanup suggestion was established.'
    };
  });
  const review=items.filter(item=>item.candidateForOwnerReview);
  const bytes=review.reduce((sum,item)=>sum+item.size,0);
  return {
    schema:1,
    kind:'aivm-v2-storage-cleanup-plan',
    projectId:project?.id||null,
    automaticDeletionAllowed:false,
    reviewCandidates:review.length,
    estimatedReviewBytes:bytes,
    items,
    note:'Advisory only. No file or asset record is deleted. Locked, referenced, selected scene media and selected project audio are always protected.'
  };
}

export function cleanupCandidateIds(project){
  return storageCleanupPlan(project).items.filter(item=>item.candidateForOwnerReview).map(item=>item.assetId);
}
