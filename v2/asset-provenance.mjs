const ORIGINS=new Set(['owner-created','local-generated','imported','licensed','public-domain','unknown']);
const RIGHTS=new Set(['owner-confirmed','license-confirmed','public-domain-confirmed','needs-review','unknown']);

function clean(value,max=240){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function normalizeAssetProvenance(values={}){
  const origin=ORIGINS.has(values.origin)?values.origin:'unknown';
  const rightsStatus=RIGHTS.has(values.rightsStatus)?values.rightsStatus:'unknown';
  const sourceLabel=clean(values.sourceLabel,160);
  const credit=clean(values.credit,240);
  const note=clean(values.note,400);
  return {origin,rightsStatus,sourceLabel,credit,note};
}

export function inferredAssetOrigin(asset={}){
  if(asset.provenance?.origin&&ORIGINS.has(asset.provenance.origin))return asset.provenance.origin;
  if(asset.provider==='local-import')return 'imported';
  if(asset.provider&&asset.provider!=='local-import')return 'local-generated';
  return 'unknown';
}

export function assetProvenance(asset={}){
  const explicit=normalizeAssetProvenance(asset.provenance||{});
  return {...explicit,origin:explicit.origin==='unknown'?inferredAssetOrigin(asset):explicit.origin};
}

export function setAssetProvenance(project,assetId,values={}){
  const asset=project?.assets?.find(item=>item.id===assetId);
  if(!asset)throw Error('Asset missing.');
  const provenance=normalizeAssetProvenance(values);
  return {...project,assets:project.assets.map(item=>item.id===assetId?{...item,provenance}:item)};
}

export function provenanceAudit(project){
  const assets=Array.isArray(project?.assets)?project.assets:[];
  const items=assets.map(asset=>{
    const provenance=assetProvenance(asset);
    const confirmed=['owner-confirmed','license-confirmed','public-domain-confirmed'].includes(provenance.rightsStatus);
    const needsReview=!confirmed;
    return {
      assetId:asset.id,
      name:asset.name||asset.id,
      kind:asset.kind||'file',
      origin:provenance.origin,
      rightsStatus:provenance.rightsStatus,
      credit:provenance.credit||null,
      needsReview,
      message:confirmed
        ?'Owner-recorded provenance/rights status is present.'
        :'Owner rights/source review is still required before publishing.'
    };
  });
  const needingReview=items.filter(item=>item.needsReview).length;
  const confirmed=items.length-needingReview;
  return {
    complete:items.length>0&&needingReview===0,
    items,
    summary:{assets:items.length,confirmed,needingReview},
    note:'This records owner-supplied provenance metadata only. It does not determine copyright ownership, licensing validity, platform policy compliance, or legal permission automatically.'
  };
}

export function portableProvenanceSummary(project){
  const audit=provenanceAudit(project);
  return {
    schema:1,
    kind:'aivm-v2-provenance-summary',
    projectId:project?.id||null,
    complete:audit.complete,
    summary:audit.summary,
    assets:audit.items.map(item=>({assetId:item.assetId,name:item.name,kind:item.kind,origin:item.origin,rightsStatus:item.rightsStatus,credit:item.credit,needsReview:item.needsReview})),
    note:audit.note
  };
}
