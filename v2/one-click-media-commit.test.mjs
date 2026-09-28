import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {createOneClickSession} from './one-click-orchestrator.mjs';
import {updateDraftJobState} from './draft-execution-ledger.mjs';
import {prepareNextOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {commitOneClickGeneratedMedia,prepareGeneratedMediaRegistration} from './one-click-media-commit.mjs';

function project(){
  return planScenes(createProject('A child waves beside a tree.'),5);
}

function report(){
  return {
    imageFallback:{enabled:true},
    motionFallback:{enabled:true},
    tools:{ffmpeg:{available:true},ffprobe:{available:true}}
  };
}

function options(){return {creation:{wantAudio:false,wantMotion:true,wantCaptions:true}};}

function afterDirector(p,r){
  let s=createOneClickSession(p,r,options());
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,'director:project','DONE')};
  return s;
}

test('successful image output is registered additively and session revision is rebased',()=>{
  const p=project(),r=report();
  const s=afterDirector(p,r);
  const prepared=prepareNextOneClickDispatch(p,r,s,options());
  assert.equal(prepared.envelope.jobType,'image');
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{
    ok:true,
    sourcePath:'C:\\AIVM\\media\\scene-1.png',
    name:'scene-1.png',
    size:1234,
    message:'Local image created.'
  },options());
  assert.equal(result.accepted,true);
  assert.equal(result.registeredMedia,true);
  assert.equal(result.project.assets.length,1);
  assert.equal(result.project.assets[0].kind,'image');
  assert.equal(result.project.assets[0].provider,'fallback');
  assert.equal(result.project.assets[0].status,'candidate');
  assert.equal(result.session.projectRevision,result.project.revision);
  const entry=result.session.ledger.entries.find(item=>item.jobId===prepared.envelope.jobId);
  assert.equal(entry.state,'DONE');
  assert.deepEqual(entry.resultAssetIds,[result.asset.id]);
});

test('external URL output is rejected without project or session mutation',()=>{
  const p=project(),r=report();
  const s=afterDirector(p,r);
  const prepared=prepareNextOneClickDispatch(p,r,s,options());
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{
    ok:true,
    sourcePath:'https://example.com/generated.png'
  },options());
  assert.equal(result.accepted,false);
  assert.equal(result.registeredMedia,false);
  assert.equal(result.reason,'external-or-uri-path-not-allowed');
  assert.equal(result.project,p);
  assert.equal(result.session,prepared.session);
});

test('motion output derives a same-scene image parent and registers a new video candidate',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  p=addAsset(p,scene.id,{kind:'image',name:'source.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\source.png',provider:'fallback'});
  let s=afterDirector(p,r);
  const imageJob=`image:${scene.id}`;
  s={...s,ledger:updateDraftJobState(s.ledger,imageJob,'RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,imageJob,'DONE')};
  const prepared=prepareNextOneClickDispatch(p,r,s,options());
  assert.equal(prepared.envelope.jobType,'motion');
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{
    ok:true,
    sourcePath:'C:\\AIVM\\media\\scene-motion.mp4',
    name:'scene-motion.mp4',
    duration:5
  },options());
  assert.equal(result.accepted,true);
  assert.equal(result.registeredMedia,true);
  assert.equal(result.asset.kind,'video');
  assert.equal(result.asset.parentAssetId,p.assets.at(-1).id);
  assert.equal(result.project.assets.at(-1).parentAssetId,p.assets.at(-1).id);
});

test('non-media jobs delegate to the normal result processor without registering media',()=>{
  const p=project(),r=report();
  const s=createOneClickSession(p,r,options());
  const prepared=prepareNextOneClickDispatch(p,r,s,options());
  assert.equal(prepared.envelope.jobType,'director');
  const result=commitOneClickGeneratedMedia(p,r,prepared.session,prepared.envelope,{ok:true,message:'Director complete.'},options());
  assert.equal(result.accepted,true);
  assert.equal(result.registeredMedia,false);
  assert.equal(result.project,p);
  assert.equal(result.project.assets.length,0);
});

test('motion registration refuses a stale requested parent image',()=>{
  const r=report();
  let p=project();
  const scene=p.scenes[0];
  p=addAsset(p,scene.id,{kind:'image',name:'stale.png',hasFile:true,sourcePath:'C:\\AIVM\\media\\stale.png',provider:'fallback'});
  const parent=p.assets.at(-1);
  p={...p,assets:p.assets.map(asset=>asset.id===parent.id?{...asset,status:'needs regeneration'}:asset)};
  let s=afterDirector(p,r);
  const imageJob=`image:${scene.id}`;
  s={...s,ledger:updateDraftJobState(s.ledger,imageJob,'RUNNING')};
  s={...s,ledger:updateDraftJobState(s.ledger,imageJob,'DONE')};
  const prepared=prepareNextOneClickDispatch(p,r,s,options());
  assert.equal(prepared.envelope.jobType,'motion');
  const staged=prepareGeneratedMediaRegistration(p,prepared.envelope,{
    ok:true,
    sourcePath:'C:\\AIVM\\media\\motion.mp4',
    parentAssetId:parent.id
  });
  assert.equal(staged.ok,false);
  assert.equal(staged.reason,'motion-parent-stale');
});
