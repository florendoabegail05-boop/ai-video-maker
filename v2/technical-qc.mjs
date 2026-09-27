function issue(code,message,severity='error',sceneId=null,assetId=null){return{code,message,severity,sceneId,assetId};}

export function runTechnicalQc(project,{targetAspect='9:16'}={}){
  const issues=[];
  const scenes=Array.isArray(project?.scenes)?project.scenes:[];
  const assets=Array.isArray(project?.assets)?project.assets:[];
  if(!scenes.length)issues.push(issue('NO_SCENES','Project has no scenes.'));
  const sceneIds=new Set(scenes.map(s=>s.id));
  for(const asset of assets){
    if(asset.sceneId!==null&&!sceneIds.has(asset.sceneId))issues.push(issue('BROKEN_SCENE_LINK',`Asset ${asset.name||asset.id} points to a missing scene.`,'error',asset.sceneId,asset.id));
    if(asset.hasFile===false)issues.push(issue('MISSING_FILE',`Asset ${asset.name||asset.id} is missing its local file.`,'error',asset.sceneId,asset.id));
  }
  for(const scene of scenes){
    const sceneAssets=assets.filter(a=>a.sceneId===scene.id&&a.status!=='needs regeneration');
    const videos=sceneAssets.filter(a=>a.kind==='video'&&a.hasFile!==false);
    if(!videos.length)issues.push(issue('NO_VIDEO',`Scene ${scene.order} has no usable video clip.`,'warning',scene.id));
    for(const video of videos){
      if(Number.isFinite(video.duration)&&video.duration<scene.duration-0.05)issues.push(issue('SHORT_VIDEO',`Scene ${scene.order} clip ${video.name||video.id} is shorter than the scene duration.`,'error',scene.id,video.id));
      if(video.width&&video.height){
        const ratio=video.width/video.height;
        const expected=targetAspect==='16:9'?16/9:targetAspect==='1:1'?1:9/16;
        if(Math.abs(ratio-expected)>0.03)issues.push(issue('ASPECT_MISMATCH',`Scene ${scene.order} clip aspect ratio does not match ${targetAspect}.`,'warning',scene.id,video.id));
      }
    }
    if((scene.caption||'').length>160)issues.push(issue('CAPTION_OVERFLOW',`Scene ${scene.order} caption exceeds 160 characters.`,'error',scene.id));
  }
  const lockedBroken=assets.filter(a=>a.locked&&(a.hasFile===false||a.status==='missing local file'));
  for(const asset of lockedBroken)issues.push(issue('LOCKED_FILE_MISSING',`Locked asset ${asset.name||asset.id} is unavailable and will not be auto-replaced.`,'error',asset.sceneId,asset.id));
  return {passed:issues.every(i=>i.severity!=='error'),issues,summary:{errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length,scenes:scenes.length,assets:assets.length}};
}

export function visualQcAvailability(capabilityPlan){
  return {
    identityDrift:!!capabilityPlan?.visualQc?.identityDrift,
    flicker:!!capabilityPlan?.visualQc?.flicker,
    anatomyObjects:!!capabilityPlan?.visualQc?.anatomyObjects,
    note:'Visual AI QC must remain unavailable unless an evaluator actually ran on the generated output.'
  };
}
