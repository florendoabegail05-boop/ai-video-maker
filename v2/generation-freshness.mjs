function isGeneratedMedia(asset){
  return !!asset && ['image','video'].includes(asset.kind) && !!asset.provider && asset.provider!=='local-import';
}

export function invalidateGeneratedAssets(project,{sceneIds=null,reason='generation inputs changed'}={}){
  const scoped=sceneIds?new Set(sceneIds):null;
  let changed=0;
  const assets=(project?.assets||[]).map(asset=>{
    if(!isGeneratedMedia(asset)||asset.locked||asset.status==='kept'||(scoped&&!scoped.has(asset.sceneId)))return asset;
    if(asset.status==='needs regeneration'&&asset.staleReason===reason)return asset;
    changed+=1;
    return {...asset,status:'needs regeneration',staleReason:reason};
  });
  return changed?{...project,assets}:{...project};
}

export function generatedFreshnessSummary(project){
  const assets=(project?.assets||[]).filter(isGeneratedMedia);
  const stale=assets.filter(asset=>asset.status==='needs regeneration');
  const lockedStale=stale.filter(asset=>asset.locked);
  return {generated:assets.length,stale:stale.length,lockedStale:lockedStale.length};
}
