const MAX_SNAPSHOTS=20;

function clone(value){return JSON.parse(JSON.stringify(value));}
function cleanLabel(value,max=120){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function makeRecoverySnapshot(project,{label='Autosave',reason='autosave'}={}){
  if(!project?.id||!Array.isArray(project.scenes)||!Array.isArray(project.assets))throw Error('Project is not valid for recovery snapshot.');
  const now=new Date().toISOString();
  return {
    schema:1,
    snapshotId:crypto.randomUUID(),
    projectId:project.id,
    projectRevision:Number(project.revision)||0,
    label:cleanLabel(label)||'Autosave',
    reason:cleanLabel(reason,80)||'autosave',
    createdAt:now,
    project:clone(project)
  };
}

export function addRecoverySnapshot(collection,snapshot,{limit=MAX_SNAPSHOTS}={}){
  const list=Array.isArray(collection)?collection:[];
  if(!snapshot?.snapshotId||!snapshot?.projectId||!snapshot?.project)throw Error('Recovery snapshot is invalid.');
  const safeLimit=Math.max(1,Math.min(100,Number(limit)||MAX_SNAPSHOTS));
  const next=[...list.filter(item=>item?.snapshotId!==snapshot.snapshotId),clone(snapshot)]
    .sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));
  return next.slice(-safeLimit);
}

export function snapshotsForProject(collection,projectId){
  return (Array.isArray(collection)?collection:[])
    .filter(item=>item?.projectId===projectId&&item?.project)
    .sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function restoreRecoverySnapshot(snapshot,currentProject=null){
  if(!snapshot?.project||snapshot.schema!==1)throw Error('Recovery snapshot is invalid.');
  if(currentProject&&currentProject.id!==snapshot.projectId)throw Error('Snapshot belongs to a different project.');
  const restored=clone(snapshot.project);
  restored.updatedAt=new Date().toISOString();
  restored.recovery={
    restoredFromSnapshotId:snapshot.snapshotId,
    restoredFromRevision:snapshot.projectRevision,
    restoredAt:restored.updatedAt,
    label:snapshot.label
  };
  return restored;
}

export function recoverySummary(collection,projectId){
  const items=snapshotsForProject(collection,projectId);
  return {
    count:items.length,
    newest:items[0]?{snapshotId:items[0].snapshotId,revision:items[0].projectRevision,label:items[0].label,createdAt:items[0].createdAt}:null,
    oldest:items.at(-1)?{snapshotId:items.at(-1).snapshotId,revision:items.at(-1).projectRevision,label:items.at(-1).label,createdAt:items.at(-1).createdAt}:null
  };
}

export const RECOVERY_SNAPSHOT_LIMIT=MAX_SNAPSHOTS;
