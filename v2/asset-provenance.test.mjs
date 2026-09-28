import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {inferredAssetOrigin,setAssetProvenance,provenanceAudit,portableProvenanceSummary,portableAssetName} from './asset-provenance.mjs';

test('origin inference distinguishes imported and local generated assets without inventing rights',()=>{
  let project=planScenes(createProject('A short story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'imported.png',sourcePath:'/local/imported.png',provider:'local-import'});
  const imported=project.assets.at(-1);
  project=addAsset(project,scene,{kind:'image',name:'generated.png',sourcePath:'/local/generated.png',provider:'fallback'});
  const generated=project.assets.at(-1);
  assert.equal(inferredAssetOrigin(imported),'imported');
  assert.equal(inferredAssetOrigin(generated),'local-generated');
  const audit=provenanceAudit(project);
  assert.equal(audit.summary.needingReview,2);
  assert.equal(audit.complete,false);
});

test('owner-recorded rights metadata can complete provenance review without changing media fields',()=>{
  let project=planScenes(createProject('A short story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'my-art.png',sourcePath:'C:/private/my-art.png',provider:'local-import'});
  const id=project.assets.at(-1).id;
  const before={sourcePath:project.assets.at(-1).sourcePath,status:project.assets.at(-1).status,locked:project.assets.at(-1).locked};
  project=setAssetProvenance(project,id,{origin:'owner-created',rightsStatus:'owner-confirmed',sourceLabel:'Created by owner',credit:'Owner',note:'Original source note'});
  const asset=project.assets.find(item=>item.id===id);
  assert.equal(asset.provenance.origin,'owner-created');
  assert.equal(asset.provenance.rightsStatus,'owner-confirmed');
  assert.deepEqual({sourcePath:asset.sourcePath,status:asset.status,locked:asset.locked},before);
  const audit=provenanceAudit(project);
  assert.equal(audit.complete,true);
  assert.equal(audit.items[0].sourceLabel,'Created by owner');
  assert.equal(audit.items[0].note,'Original source note');
});

test('portable provenance summary excludes local paths and internal provenance note',()=>{
  let project=planScenes(createProject('PRIVATE PROMPT'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'video',name:'clip.mp4',sourcePath:'C:/private/clip.mp4',provider:'local-import'});
  const id=project.assets.at(-1).id;
  project=setAssetProvenance(project,id,{origin:'licensed',rightsStatus:'license-confirmed',sourceLabel:'Stock library',credit:'Creator credit',note:'PRIVATE INTERNAL NOTE'});
  const summary=portableProvenanceSummary(project);
  const text=JSON.stringify(summary);
  assert.equal(summary.complete,true);
  assert.doesNotMatch(text,/C:\/private|PRIVATE PROMPT|PRIVATE INTERNAL NOTE|sourcePath/);
  assert.equal(summary.assets[0].sourceLabel,'Stock library');
  assert.match(summary.note,/does not determine copyright ownership/i);
});

test('portable provenance summary redacts path-like source labels but keeps them in the internal audit',()=>{
  let project=planScenes(createProject('Story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'licensed.png',sourcePath:'C:/private/licensed.png',provider:'local-import'});
  const first=project.assets.at(-1).id;
  project=setAssetProvenance(project,first,{origin:'licensed',rightsStatus:'license-confirmed',sourceLabel:'C:\\Users\\Abe\\license.txt',credit:'Creator'});
  project=addAsset(project,scene,{kind:'image',name:'second.png',sourcePath:'/private/second.png',provider:'local-import'});
  const second=project.assets.at(-1).id;
  project=setAssetProvenance(project,second,{origin:'licensed',rightsStatus:'license-confirmed',sourceLabel:'/home/abe/license.txt',credit:'Creator 2'});
  const audit=provenanceAudit(project);
  assert.equal(audit.items.find(item=>item.assetId===first).sourceLabel,'C:\\Users\\Abe\\license.txt');
  assert.equal(audit.items.find(item=>item.assetId===second).sourceLabel,'/home/abe/license.txt');
  const summary=portableProvenanceSummary(project);
  assert.equal(summary.assets.find(item=>item.assetId===first).sourceLabel,null);
  assert.equal(summary.assets.find(item=>item.assetId===second).sourceLabel,null);
  assert.doesNotMatch(JSON.stringify(summary),/Users\\Abe|\/home\/abe/);
});

test('portable asset names keep only a safe display basename from paths or URLs',()=>{
  assert.equal(portableAssetName('C:\\Users\\Abe\\Videos\\private-final.mp4'),'private-final.mp4');
  assert.equal(portableAssetName('/home/abe/private/final.png'),'final.png');
  assert.equal(portableAssetName('file:///C:/Users/Abe/secret/audio.wav'),'audio.wav');
  assert.equal(portableAssetName('https://example.test/private/clip.mp4?token=SECRET'),'clip.mp4');
  assert.equal(portableAssetName('Friendly clip name.mp4'),'Friendly clip name.mp4');
  assert.equal(portableAssetName('C:'),null);
});

test('portable provenance summary sanitizes path-like asset names',()=>{
  let project=planScenes(createProject('Story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'video',name:'C:\\Users\\Abe\\Private\\family.mp4',sourcePath:'C:/private/family.mp4',provider:'local-import'});
  const id=project.assets.at(-1).id;
  project=setAssetProvenance(project,id,{origin:'owner-created',rightsStatus:'owner-confirmed'});
  const summary=portableProvenanceSummary(project);
  assert.equal(summary.assets[0].name,'family.mp4');
  assert.doesNotMatch(JSON.stringify(summary),/Users\\Abe|C:\\\\Users/);
});

test('unknown or unrecognized values remain review-required rather than being upgraded',()=>{
  let project=planScenes(createProject('Story'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'image',name:'mystery.png',sourcePath:'/x',provider:null});
  const id=project.assets.at(-1).id;
  project=setAssetProvenance(project,id,{origin:'internet',rightsStatus:'probably-fine'});
  const audit=provenanceAudit(project);
  assert.equal(audit.items[0].origin,'unknown');
  assert.equal(audit.items[0].rightsStatus,'unknown');
  assert.equal(audit.items[0].needsReview,true);
});
