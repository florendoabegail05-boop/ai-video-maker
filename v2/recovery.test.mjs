import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRecoverySnapshot,addRecoverySnapshot,snapshotsForProject,restoreRecoverySnapshot,recoverySummary,RECOVERY_SNAPSHOT_LIMIT} from './recovery.mjs';

const project=(id='p1',revision=3)=>({schema:1,id,name:'Demo',prompt:'Make a short',style:'custom',hardwareMode:'light',costMode:'FREE ONLY',revision,updatedAt:'2026-09-28T00:00:00.000Z',scenes:[{id:'s1',prompt:'scene',duration:5}],assets:[{id:'a1',sceneId:'s1',name:'still.png',kind:'image',locked:true}]});

test('snapshot clones project and preserves locked assets without mutation',()=>{
  const source=project();
  const snap=makeRecoverySnapshot(source,{label:'Before scene edit',reason:'manual'});
  assert.equal(snap.projectId,'p1');
  assert.equal(snap.projectRevision,3);
  assert.equal(snap.project.assets[0].locked,true);
  source.assets[0].locked=false;
  assert.equal(snap.project.assets[0].locked,true);
});

test('collection stays bounded and can filter by project',()=>{
  let list=[];
  for(let i=0;i<RECOVERY_SNAPSHOT_LIMIT+5;i++){
    const snap=makeRecoverySnapshot(project(i%2?'p1':'p2',i+1),{label:`r${i}`});
    snap.createdAt=new Date(Date.UTC(2026,8,28,0,0,i)).toISOString();
    list=addRecoverySnapshot(list,snap);
  }
  assert.equal(list.length,RECOVERY_SNAPSHOT_LIMIT);
  assert.ok(snapshotsForProject(list,'p1').every(item=>item.projectId==='p1'));
});

test('restore refuses cross-project snapshots and records recovery provenance',()=>{
  const snap=makeRecoverySnapshot(project('p1',7),{label:'Known good'});
  assert.throws(()=>restoreRecoverySnapshot(snap,project('other',8)),/different project/);
  const restored=restoreRecoverySnapshot(snap,project('p1',9));
  assert.equal(restored.id,'p1');
  assert.equal(restored.recovery.restoredFromRevision,7);
  assert.equal(restored.recovery.label,'Known good');
});

test('summary reports newest and oldest snapshot metadata',()=>{
  const one=makeRecoverySnapshot(project('p1',1),{label:'one'});one.createdAt='2026-09-28T00:00:01.000Z';
  const two=makeRecoverySnapshot(project('p1',2),{label:'two'});two.createdAt='2026-09-28T00:00:02.000Z';
  const summary=recoverySummary([one,two],'p1');
  assert.equal(summary.count,2);
  assert.equal(summary.newest.revision,2);
  assert.equal(summary.oldest.revision,1);
});
