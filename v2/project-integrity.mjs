import {verificationFreshness} from './render-signature.mjs';

function issue(code,severity,message,details={}){return{code,severity,message,...details};}
function ids(items=[]){return items.map(item=>item?.id).filter(Boolean);}
function duplicates(values=[]){const seen=new Set(),dupes=new Set();for(const value of values){if(seen.has(value))dupes.add(value);else seen.add(value);}return [...dupes];}

export function auditProjectIntegrity(project){
  const issues=[];
  if(!project||typeof project!=='object')return{passed:false,issues:[issue('PROJECT_MISSING','error','Project metadata is missing or invalid.')],summary:{errors:1,warnings:0,scenes:0,assets:0}};
  const scenes=Array.isArray(project.scenes)?project.scenes:[];
  const assets=Array.isArray(project.assets)?project.assets:[];
  const sceneIds=new Set(ids(scenes));
  const assetIds=new Set(ids(assets));

  if(project.costMode!=='FREE ONLY')issues.push(issue('COST_MODE','error','Project cost mode is not FREE ONLY.'));
  if(!project.id)issues.push(issue('PROJECT_ID','error','Project ID is missing.'));
  for(const id of duplicates(ids(scenes)))issues.push(issue('DUPLICATE_SCENE_ID','error',`Duplicate scene ID: ${id}.`,{sceneId:id}));
  for(const id of duplicates(ids(assets)))issues.push(issue('DUPLICATE_ASSET_ID','error',`Duplicate asset ID: ${id}.`,{assetId:id}));

  const orders=scenes.map(scene=>Number(scene.order)).filter(Number.isFinite);
  const expected=scenes.map((_,index)=>index+1);
  if(orders.length!==scenes.length||orders.some((value,index)=>value!==expected[index]))issues.push(issue('SCENE_ORDER','warning','Scene order metadata is not a contiguous 1..N sequence.'));

  for(const scene of scenes){
    const linked=Array.isArray(scene.assetIds)?scene.assetIds:[];
    for(const assetId of linked){
      if(!assetIds.has(assetId))issues.push(issue('SCENE_ASSET_MISSING','error',`Scene ${scene.order||scene.id} references an asset record that does not exist.`,{sceneId:scene.id,assetId}));
      else{
        const asset=assets.find(item=>item.id===assetId);
        if(asset?.sceneId!==scene.id)issues.push(issue('SCENE_ASSET_CROSS_LINK','error',`Asset ${asset.name||asset.id} is linked from a different scene than its sceneId.`,{sceneId:scene.id,assetId}));
      }
    }
  }

  for(const asset of assets){
    if(asset.sceneId!==null&&!sceneIds.has(asset.sceneId))issues.push(issue('ASSET_SCENE_MISSING','error',`Asset ${asset.name||asset.id} points to a missing scene.`,{sceneId:asset.sceneId,assetId:asset.id}));
    if(asset.sceneId!==null){
      const scene=scenes.find(item=>item.id===asset.sceneId);
      if(scene&&Array.isArray(scene.assetIds)&&!scene.assetIds.includes(asset.id))issues.push(issue('ASSET_NOT_LINKED_BACK','warning',`Asset ${asset.name||asset.id} is not listed in its scene assetIds.`,{sceneId:asset.sceneId,assetId:asset.id}));
    }
    if(asset.parentAssetId){
      const parent=assets.find(item=>item.id===asset.parentAssetId);
      if(!parent)issues.push(issue('PARENT_ASSET_MISSING','error',`Derived asset ${asset.name||asset.id} references a missing parent asset.`,{assetId:asset.id,parentAssetId:asset.parentAssetId}));
      else{
        if(parent.kind!=='image')issues.push(issue('PARENT_KIND','warning',`Derived video ${asset.name||asset.id} does not reference an image parent.`,{assetId:asset.id,parentAssetId:parent.id}));
        if(asset.sceneId!==parent.sceneId)issues.push(issue('PARENT_CROSS_SCENE','error',`Derived asset ${asset.name||asset.id} and its parent belong to different scenes.`,{assetId:asset.id,parentAssetId:parent.id}));
      }
    }
    if(asset.reference===true){
      if(asset.kind!=='image')issues.push(issue('REFERENCE_KIND','error',`Reference asset ${asset.name||asset.id} is not an image.`,{assetId:asset.id}));
      if(!['character','world'].includes(asset.referenceRole))issues.push(issue('REFERENCE_ROLE','error',`Reference asset ${asset.name||asset.id} has an invalid reference role.`,{assetId:asset.id}));
      if(asset.hasFile===false)issues.push(issue('REFERENCE_FILE_MISSING','error',`Reference asset ${asset.name||asset.id} is missing its local file.`,{assetId:asset.id}));
    }
    if(asset.kind==='audio'){
      if(asset.sceneId!==null)issues.push(issue('PROJECT_AUDIO_SCENE','warning',`Project audio ${asset.name||asset.id} unexpectedly points to a scene.`,{assetId:asset.id}));
      if(!['music','voice'].includes(asset.role))issues.push(issue('AUDIO_ROLE','error',`Audio asset ${asset.name||asset.id} has an unsupported role.`,{assetId:asset.id}));
    }
    if(asset.locked&&asset.status==='needs regeneration')issues.push(issue('LOCKED_STALE','warning',`Locked asset ${asset.name||asset.id} is marked stale; owner approval is preserved and automatic replacement must stay disabled.`,{assetId:asset.id}));
  }

  if(Array.isArray(project.history)&&project.history.length>10)issues.push(issue('HISTORY_BOUND','warning','Project history exceeds the intended 10-revision bound.'));
  const savedVerification=project.publishing?.finalVerification;
  if(savedVerification){
    const freshness=verificationFreshness(project,savedVerification);
    if(!freshness.fresh)issues.push(issue('FINAL_VERIFICATION_STALE','warning','Saved final MP4 verification is stale or does not match current render inputs.'));
  }

  const errors=issues.filter(item=>item.severity==='error').length;
  const warnings=issues.filter(item=>item.severity==='warning').length;
  return{passed:errors===0,issues,summary:{errors,warnings,scenes:scenes.length,assets:assets.length}};
}

export function integrityGate(project){
  const report=auditProjectIntegrity(project);
  return{
    allowed:report.passed,
    report,
    message:report.passed
      ?`Project metadata integrity passed with ${report.summary.warnings} warning${report.summary.warnings===1?'':'s'}.`
      :`Project metadata integrity failed with ${report.summary.errors} error${report.summary.errors===1?'':'s'}.`
  };
}
