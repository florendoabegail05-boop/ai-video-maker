import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {inferredAssetOrigin,setAssetProvenance,provenanceAudit,portableProvenanceSummary} from './asset-provenance.mjs';

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
