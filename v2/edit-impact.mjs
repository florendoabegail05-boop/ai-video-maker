function isGeneratedVisual(asset){
  return !!asset && ['image','video'].includes(asset.kind) && !!asset.provider && asset.provider!=='local-import';
}

function eligibleGenerated(project,sceneIds=null){
  const scope=sceneIds?new Set(sceneIds):null;
  return (project?.assets||[]).filter(asset=>isGeneratedVisual(asset)&&(!scope||scope.has(asset.sceneId)));
}

function summarizeAssets(assets){
  return {
    total:assets.length,
    unlocked:assets.filter(asset=>!asset.locked).length,
    locked:assets.filter(asset=>asset.locked).length,
    images:assets.filter(asset=>asset.kind==='image').length,
    videos:assets.filter(asset=>asset.kind==='video').length,
    ids:assets.map(asset=>asset.id)
  };
}

function sceneIndex(project,sceneId){return (project?.scenes||[]).findIndex(scene=>scene.id===sceneId);}

export function previewScenePromptImpact(project,sceneId){
  if(sceneIndex(project,sceneId)<0)throw Error('Scene missing.');
  const assets=eligibleGenerated(project,[sceneId]);
  const summary=summarizeAssets(assets);
  return {
    change:'scene-prompt',
    scope:{sceneIds:[sceneId]},
    ...summary,
    wouldInvalidate:assets.filter(asset=>!asset.locked).map(asset=>asset.id),
    wouldPreserveLocked:assets.filter(asset=>asset.locked).map(asset=>asset.id),
    note:'Only unlocked generated visuals in this scene should become stale. Imported media and locked generated assets remain preserved.'
  };
}

export function previewBibleImpact(project){
  const assets=eligibleGenerated(project);
  const summary=summarizeAssets(assets);
  return {
    change:'character-world-guidance',
    scope:{sceneIds:(project?.scenes||[]).map(scene=>scene.id)},
    ...summary,
    wouldInvalidate:assets.filter(asset=>!asset.locked).map(asset=>asset.id),
    wouldPreserveLocked:assets.filter(asset=>asset.locked).map(asset=>asset.id),
    note:'Character/world/visual-rule changes can affect all generated visuals. Imported media and locked generated assets remain preserved.'
  };
}

export function previewReferenceImpact(project){
  const result=previewBibleImpact(project);
  return {...result,change:'visual-reference',note:'Changing Character/World references can affect all generated visuals. Preserve imported reference files and all locked assets.'};
}

export function previewSceneMoveImpact(project,sceneId,direction){
  if(![-1,1].includes(direction))throw Error('Direction must be -1 or 1.');
  const from=sceneIndex(project,sceneId);
  const to=from+direction;
  if(from<0||to<0||to>=(project?.scenes||[]).length)throw Error('Cannot move scene there.');
  const start=Math.min(from,to);
  const affected=(project.scenes||[]).slice(start).map(scene=>scene.id);
  const assets=eligibleGenerated(project,affected);
  const summary=summarizeAssets(assets);
  return {
    change:'scene-reorder',
    scope:{movedSceneId:sceneId,fromIndex:from,toIndex:to,continuityAffectedSceneIds:affected},
    ...summary,
    suggestedReview:assets.map(asset=>asset.id),
    autoInvalidate:false,
    note:'Scene order changes alter continuity context from the earliest moved position onward. Review these generated visuals first; do not auto-invalidate until local prompt/continuity tests confirm the safest scope.'
  };
}

export function previewEditImpact(project,change){
  switch(change?.type){
    case 'scene-prompt': return previewScenePromptImpact(project,change.sceneId);
    case 'bible': return previewBibleImpact(project);
    case 'reference': return previewReferenceImpact(project);
    case 'scene-move': return previewSceneMoveImpact(project,change.sceneId,change.direction);
    default: throw Error('Unsupported edit-impact change type.');
  }
}
