import test from 'node:test';
import assert from 'node:assert/strict';
import {setReferenceAsset,clearReferenceAsset,referenceAssets,referenceSummary,referencePromptLines,bridgeReferenceInputs} from './references.mjs';

function project(){return {assets:[
  {id:'c1',kind:'image',name:'face.png',hasFile:true,sourcePath:'/media/face.png',status:'candidate',locked:false},
  {id:'w1',kind:'image',name:'room.png',hasFile:true,sourcePath:'/media/room.png',status:'kept',locked:false},
  {id:'v1',kind:'video',name:'clip.mp4',hasFile:true,sourcePath:'/media/clip.mp4',status:'candidate',locked:false}
]};}

test('character reference locks image and remains individually addressable',()=>{
  const p=setReferenceAsset(project(),'c1',{role:'character',label:'Main character'});
  const asset=p.assets.find(a=>a.id==='c1');
  assert.equal(asset.reference,true);
  assert.equal(asset.referenceRole,'character');
  assert.equal(asset.locked,true);
  assert.equal(referenceAssets(p,'character')[0].id,'c1');
  assert.match(referencePromptLines(p).join('\n'),/Main character/);
});

test('world references stay separate from character references',()=>{
  let p=setReferenceAsset(project(),'c1',{role:'character'});
  p=setReferenceAsset(p,'w1',{role:'world',label:'Kitchen world'});
  const summary=referenceSummary(p);
  assert.equal(summary.characters.length,1);
  assert.equal(summary.worlds.length,1);
  assert.match(referencePromptLines(p).join('\n'),/environment layout/i);
});

test('bridge receives reference paths only when workflow declares support',()=>{
  let p=setReferenceAsset(project(),'c1',{role:'character'});
  p=setReferenceAsset(p,'w1',{role:'world'});
  assert.deepEqual(bridgeReferenceInputs(p,{}),{character:[],world:[]});
  assert.deepEqual(bridgeReferenceInputs(p,{supportsCharacterReferences:true}),{character:['/media/face.png'],world:[]});
  assert.deepEqual(bridgeReferenceInputs(p,{supportsCharacterReferences:true,supportsWorldReferences:true}),{character:['/media/face.png'],world:['/media/room.png']});
});

test('non-image and missing reference files are rejected',()=>{
  assert.throws(()=>setReferenceAsset(project(),'v1',{role:'character'}),/Only image/);
  const p=project();p.assets[0].hasFile=false;
  assert.throws(()=>setReferenceAsset(p,'c1',{role:'character'}),/missing/);
  assert.throws(()=>setReferenceAsset(project(),'c1',{role:'prop'}),/character or world/);
});

test('reference may be cleared without deleting or unlocking original file',()=>{
  let p=setReferenceAsset(project(),'c1',{role:'character'});
  p=clearReferenceAsset(p,'c1');
  const asset=p.assets.find(a=>a.id==='c1');
  assert.equal(asset.reference,false);
  assert.equal(asset.locked,true);
  assert.equal(asset.hasFile,true);
  assert.equal(asset.sourcePath,'/media/face.png');
});
