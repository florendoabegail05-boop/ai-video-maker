import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,addProjectAudio,updateAsset} from './core.mjs';
import {auditProjectIntegrity,integrityGate} from './project-integrity.mjs';

test('normal project metadata passes integrity audit',()=>{
  let project=planScenes(createProject('A small story'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'image',name:'still.png',hasFile:true,sourcePath:'/media/still.png',provider:'local-import'});
  const report=auditProjectIntegrity(project);
  assert.equal(report.passed,true);
  assert.equal(report.summary.errors,0);
  assert.equal(integrityGate(project).allowed,true);
});

test('duplicate IDs, missing links and cross-scene parent lineage are detected',()=>{
  let project=planScenes(createProject('Two scenes'),10);
  const [first,second]=project.scenes;
  project=addAsset(project,first.id,{kind:'image',name:'parent.png',hasFile:true,sourcePath:'/media/parent.png',provider:'fallback'});
  const parent=project.assets.at(-1);
  project=addAsset(project,second.id,{kind:'video',name:'child.mp4',hasFile:true,sourcePath:'/media/child.mp4',provider:'motion-fallback',parentAssetId:parent.id,duration:5});
  const child=project.assets.at(-1);
  const broken={...project,
    scenes:[project.scenes[0],{...project.scenes[1],id:project.scenes[0].id,assetIds:[child.id,'missing-asset']}],
    assets:[...project.assets,{...child,id:parent.id}]
  };
  const report=auditProjectIntegrity(broken);
  assert.equal(report.passed,false);
  assert.ok(report.issues.some(item=>item.code==='DUPLICATE_SCENE_ID'));
  assert.ok(report.issues.some(item=>item.code==='DUPLICATE_ASSET_ID'));
  assert.ok(report.issues.some(item=>item.code==='SCENE_ASSET_MISSING'));
  assert.ok(report.issues.some(item=>item.code==='PARENT_CROSS_SCENE'));
});

test('invalid reference and audio metadata are blocked',()=>{
  let project=planScenes(createProject('One scene'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'video',name:'bad-reference.mp4',hasFile:false,sourcePath:'/media/bad.mp4',provider:'motion-fallback',duration:5});
  const bad=project.assets.at(-1);
  project={...project,assets:project.assets.map(asset=>asset.id===bad.id?{...asset,reference:true,referenceRole:'actor'}:asset)};
  project=addProjectAudio(project,{role:'music',name:'music.wav',sourcePath:'/media/music.wav',size:1000});
  const audio=project.assets.at(-1);
  project={...project,assets:project.assets.map(asset=>asset.id===audio.id?{...asset,role:'paid',sceneId:scene.id}:asset)};
  const report=auditProjectIntegrity(project);
  assert.equal(report.passed,false);
  assert.ok(report.issues.some(item=>item.code==='REFERENCE_KIND'));
  assert.ok(report.issues.some(item=>item.code==='REFERENCE_ROLE'));
  assert.ok(report.issues.some(item=>item.code==='REFERENCE_FILE_MISSING'));
  assert.ok(report.issues.some(item=>item.code==='AUDIO_ROLE'));
  assert.ok(report.issues.some(item=>item.code==='PROJECT_AUDIO_SCENE'));
});

test('locked stale assets are warnings, never auto-fix errors',()=>{
  let project=planScenes(createProject('One scene'),5);
  const scene=project.scenes[0];
  project=addAsset(project,scene.id,{kind:'image',name:'approved.png',hasFile:true,sourcePath:'/media/approved.png',provider:'fallback'});
  const id=project.assets.at(-1).id;
  project=updateAsset(project,id,'lock');
  project={...project,assets:project.assets.map(asset=>asset.id===id?{...asset,status:'needs regeneration'}:asset)};
  const report=auditProjectIntegrity(project);
  assert.equal(report.passed,true);
  assert.ok(report.issues.some(item=>item.code==='LOCKED_STALE'&&item.severity==='warning'));
});
