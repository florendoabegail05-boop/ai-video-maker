import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes} from './core.mjs';
import {captureRecoverySnapshot,recoverySnapshotsFor,restoreStoredSnapshot,removeRecoverySnapshot,RECOVERY_KEY} from './recovery-store.mjs';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}

test('recovery snapshots persist metadata without mutating current project',()=>{
  const storage=memoryStorage();
  let project=planScenes(createProject('A tiny robot waves','Demo'),10);
  const before=JSON.stringify(project);
  const snapshot=captureRecoverySnapshot(storage,project,{label:'Before edit',reason:'manual'});
  assert.equal(JSON.stringify(project),before);
  assert.equal(recoverySnapshotsFor(storage,project.id).length,1);
  assert.equal(recoverySnapshotsFor(storage,project.id)[0].snapshotId,snapshot.snapshotId);
  assert.ok(storage.getItem(RECOVERY_KEY));
});

test('stored snapshot restores only its own project',()=>{
  const storage=memoryStorage();
  const first=createProject('One','Same name');
  const second=createProject('Two','Same name');
  const snapshot=captureRecoverySnapshot(storage,first,{label:'Safe point'});
  assert.throws(()=>restoreStoredSnapshot(storage,snapshot.snapshotId,second),/different project/i);
  const restored=restoreStoredSnapshot(storage,snapshot.snapshotId,first);
  assert.equal(restored.id,first.id);
  assert.equal(restored.recovery.restoredFromSnapshotId,snapshot.snapshotId);
});

test('snapshot can be removed without touching project data',()=>{
  const storage=memoryStorage();
  const project=createProject('Keep me','Project');
  const snapshot=captureRecoverySnapshot(storage,project);
  removeRecoverySnapshot(storage,snapshot.snapshotId);
  assert.equal(recoverySnapshotsFor(storage,project.id).length,0);
  assert.equal(project.prompt,'Keep me');
});
