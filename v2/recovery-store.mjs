import {addRecoverySnapshot,makeRecoverySnapshot,snapshotsForProject,restoreRecoverySnapshot} from './recovery.mjs';

export const RECOVERY_KEY='aivm.v2.recovery.v1';

function parse(raw){
  if(!raw)return [];
  try{const value=JSON.parse(raw);return Array.isArray(value)?value:[];}catch{return [];}
}

export function loadRecoverySnapshots(storage){
  return parse(storage?.getItem?.(RECOVERY_KEY));
}

export function saveRecoverySnapshots(storage,snapshots){
  if(!storage?.setItem)throw Error('Recovery storage is unavailable.');
  storage.setItem(RECOVERY_KEY,JSON.stringify(Array.isArray(snapshots)?snapshots:[]));
}

export function captureRecoverySnapshot(storage,project,options={}){
  const snapshot=makeRecoverySnapshot(project,options);
  const next=addRecoverySnapshot(loadRecoverySnapshots(storage),snapshot,options);
  saveRecoverySnapshots(storage,next);
  return snapshot;
}

export function recoverySnapshotsFor(storage,projectId){
  return snapshotsForProject(loadRecoverySnapshots(storage),projectId);
}

export function restoreStoredSnapshot(storage,snapshotId,currentProject){
  const snapshot=loadRecoverySnapshots(storage).find(item=>item?.snapshotId===snapshotId);
  if(!snapshot)throw Error('Recovery snapshot was not found.');
  return restoreRecoverySnapshot(snapshot,currentProject);
}

export function removeRecoverySnapshot(storage,snapshotId){
  const next=loadRecoverySnapshots(storage).filter(item=>item?.snapshotId!==snapshotId);
  saveRecoverySnapshots(storage,next);
  return next;
}
