const ROLES=new Set(['character','world']);

function clean(value,max=120){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function normalizeReferenceRole(role){
  const value=String(role||'').trim().toLowerCase();
  if(!ROLES.has(value))throw Error('Reference role must be character or world.');
  return value;
}

export function setReferenceAsset(project,assetId,{role,label='',locked=true}={}){
  const normalized=normalizeReferenceRole(role);
  const asset=project?.assets?.find(item=>item.id===assetId);
  if(!asset)throw Error('Asset missing.');
  if(asset.kind!=='image')throw Error('Only image assets can be used as visual references.');
  if(!asset.hasFile)throw Error('Reference image file is missing.');
  const reference={role:normalized,label:clean(label)||asset.name||`${normalized} reference`};
  return {
    ...project,
    assets:project.assets.map(item=>item.id===assetId?{...item,reference:true,referenceRole:normalized,referenceLabel:reference.label,locked:locked?true:item.locked,status:item.status==='needs regeneration'?'kept':item.status}:item)
  };
}

export function clearReferenceAsset(project,assetId){
  if(!project?.assets?.some(item=>item.id===assetId))throw Error('Asset missing.');
  return {...project,assets:project.assets.map(item=>item.id===assetId?{...item,reference:false,referenceRole:null,referenceLabel:null}:item)};
}

export function referenceAssets(project,role){
  const normalized=normalizeReferenceRole(role);
  return (project?.assets||[]).filter(asset=>asset.kind==='image'&&asset.reference===true&&asset.referenceRole===normalized&&asset.hasFile&&asset.status!=='missing local file');
}

export function referenceSummary(project){
  const characters=referenceAssets(project,'character');
  const worlds=referenceAssets(project,'world');
  return {
    characters:characters.map(asset=>({id:asset.id,label:asset.referenceLabel||asset.name,locked:!!asset.locked,sourcePath:asset.sourcePath||null})),
    worlds:worlds.map(asset=>({id:asset.id,label:asset.referenceLabel||asset.name,locked:!!asset.locked,sourcePath:asset.sourcePath||null}))
  };
}

export function referencePromptLines(project){
  const summary=referenceSummary(project);
  const lines=[];
  if(summary.characters.length)lines.push(`APPROVED CHARACTER REFERENCES: ${summary.characters.map(item=>item.label).join('; ')}. Preserve identity, age, proportions, wardrobe and distinctive features.`);
  if(summary.worlds.length)lines.push(`APPROVED WORLD REFERENCES: ${summary.worlds.map(item=>item.label).join('; ')}. Preserve environment layout, recurring objects, palette and lighting anchors.`);
  return lines;
}

export function bridgeReferenceInputs(project,{supportsCharacterReferences=false,supportsWorldReferences=false}={}){
  const summary=referenceSummary(project);
  return {
    character:supportsCharacterReferences?summary.characters.filter(item=>item.sourcePath).map(item=>item.sourcePath):[],
    world:supportsWorldReferences?summary.worlds.filter(item=>item.sourcePath).map(item=>item.sourcePath):[]
  };
}
