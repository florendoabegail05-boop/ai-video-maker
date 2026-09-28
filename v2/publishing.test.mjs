import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject, planScenes, addAsset, updateAsset, moveScene, setSceneCaption, undoProject, addProjectAudio} from './core.mjs';
import {setPublishingDetails, publishingDetails, captionSrt, makePublishingPackage, setFinalVerification} from './publishing.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {setAssetProvenance} from './asset-provenance.mjs';

test('publishing details persist in revisions and undo without changing approved assets', () => {
  let project = planScenes(createProject('A quiet garden', 'Garden'), 10);
  project = addAsset(project, project.scenes[0].id, {kind: 'image', name: 'approved.png', hasFile: true});
  project = updateAsset(project, project.assets[0].id, 'lock');
  const before = structuredClone(project);
  project = setPublishingDetails(project, {title: ' Garden walk ', description: 'Line one\r\nLine two'});
  assert.deepEqual(publishingDetails(project), {title: 'Garden walk', description: 'Line one\nLine two'});
  assert.deepEqual(project.assets, before.assets);
  assert.deepEqual(project.scenes, before.scenes);
  const next = setPublishingDetails(project, {title: 'New title', description: ''});
  assert.deepEqual(publishingDetails(undoProject(next)), publishingDetails(project));
  assert.deepEqual(publishingDetails(undoProject(project)), {title: 'Garden', description: ''});
  assert.deepEqual(before.assets, project.assets);
});

test('SRT follows reordered scenes, retains gaps and rounds fractional timestamps', () => {
  let project = planScenes(createProject('Three scenes'), 15);
  const [first, second, third] = project.scenes;
  project = setSceneCaption(project, first.id, 'First');
  project = setSceneCaption(project, third.id, 'Third');
  project = moveScene(project, first.id, 1);
  assert.equal(captionSrt(project), '1\n00:00:05,000 --> 00:00:10,000\nFirst\n\n2\n00:00:10,000 --> 00:00:15,000\nThird\n');
  project.scenes[0].duration = 1.125;
  assert.match(captionSrt(project), /00:00:01,125 --> 00:00:06,125/);
  project = setSceneCaption(project, first.id, '');
  project = setSceneCaption(project, third.id, '');
  assert.equal(captionSrt(project), '');
});

test('package records approved clip selection and audio without local paths or false QC claims', () => {
  let project = planScenes(createProject('PRIVATE PROMPT', 'Garden'), 10);
  const scene = project.scenes[0].id;
  project = addAsset(project, scene, {kind: 'video', name: 'approved.mp4', sourcePath: 'C:\\private\\approved.mp4', duration: 5});
  const approved = project.assets.at(-1).id;
  project = updateAsset(project, approved, 'keep');
  project = addAsset(project, scene, {kind: 'video', name: 'candidate.mp4', sourcePath: '/private/candidate.mp4', duration: 5});
  project = addProjectAudio(project, {role: 'music', name: 'music.wav', sourcePath: '/private/music.wav'});
  const before = JSON.stringify(project);
  const result = makePublishingPackage(project);
  assert.equal(JSON.stringify(project), before);
  assert.equal(result.scenes[0].selectedClipId, approved);
  assert.equal(result.scenes[1].selectedClipId, null);
  assert.equal(result.audio.music, project.assets.at(-1).id);
  assert.equal(result.finalVideoVerified, false);
  assert.equal(result.costMode, 'FREE ONLY');
  assert.equal(result.provenance.complete,false);
  assert.match(result.warnings.join(' '), /scene\(s\): 2/);
  assert.match(result.warnings.join(' '), /rights\/source record/i);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE PROMPT|sourcePath|C:\\\\private|\/private\/|"history"/);
});

test('publishing package carries portable rights status and credits but not private provenance notes or path-like labels',()=>{
  let project=planScenes(createProject('PRIVATE SOURCE PROMPT','Rights package'),5);
  const scene=project.scenes[0].id;
  project=addAsset(project,scene,{kind:'video',name:'C:\\Users\\Abe\\Private\\licensed.mp4',sourcePath:'C:\\private\\licensed.mp4',duration:5,provider:'C:\\Tools\\private-generator.exe'});
  const id=project.assets.at(-1).id;
  project=updateAsset(project,id,'keep');
  project=setAssetProvenance(project,id,{origin:'licensed',rightsStatus:'license-confirmed',sourceLabel:'C:\\Users\\Abe\\license.txt',credit:'Creator Name',note:'PRIVATE LICENSE NOTE'});
  const result=makePublishingPackage(project);
  const item=result.provenance.assets.find(asset=>asset.assetId===id);
  const packagedAsset=result.assets.find(asset=>asset.id===id);
  assert.equal(result.provenance.complete,true);
  assert.equal(item.origin,'licensed');
  assert.equal(item.rightsStatus,'license-confirmed');
  assert.equal(item.credit,'Creator Name');
  assert.equal(item.sourceLabel,null);
  assert.equal(item.name,'licensed.mp4');
  assert.equal(packagedAsset.name,'licensed.mp4');
  assert.equal(packagedAsset.provider,null);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE SOURCE PROMPT|PRIVATE LICENSE NOTE|Users\\Abe|Tools\\private-generator|sourcePath/);
});

test('passed final-output manifest is preserved when publishing details change and exported without local paths', () => {
  let project=planScenes(createProject('PRIVATE FINAL PROMPT','Verified video'),10);
  project=setPublishingDetails(project,{title:'Verified video',description:'Ready for review'});
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:10,bytes:2_000_000,provider:'browser-file-metadata'});
  assert.equal(manifest.verified,true);
  project=setFinalVerification(project,manifest);
  project=setPublishingDetails(project,{title:'Updated verified video',description:'Still verified'});
  assert.equal(project.publishing.finalVerification.verified,true);
  const pack=makePublishingPackage(project);
  assert.equal(pack.finalVideoVerified,true);
  assert.equal(pack.finalOutput.actual.width,1080);
  assert.equal(pack.finalOutput.actual.height,1920);
  assert.equal(pack.finalOutput.provider,'browser-file-metadata');
  assert.match(pack.warnings.join(' '),/deterministic media facts were verified/);
  assert.doesNotMatch(JSON.stringify(pack),/PRIVATE FINAL PROMPT|sourcePath|bridgeUrl|outputPath/);
});

test('setFinalVerification strips path-like provider labels even from an otherwise valid manifest',()=>{
  let project=planScenes(createProject('PRIVATE VERIFY PROMPT','Verified video'),5);
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:5,bytes:2_000_000,provider:'ffmpeg'});
  assert.equal(manifest.verified,true);
  project=setFinalVerification(project,{...manifest,provider:'C:\\Users\\Abe\\ffmpeg.exe'});
  assert.equal(project.publishing.finalVerification.provider,null);
  const pack=makePublishingPackage(project);
  assert.equal(pack.finalOutput.provider,null);
  assert.doesNotMatch(JSON.stringify(pack),/Users\\Abe|PRIVATE VERIFY PROMPT/);
});

test('failed, wrong-project or malformed verification cannot be saved as verified',()=>{
  const project=planScenes(createProject('Verify me','Verify'),5);
  const failed=makeFinalOutputManifest(project,{video:{width:720,height:1280},duration:5,bytes:2_000_000});
  assert.equal(failed.verified,false);
  assert.throws(()=>setFinalVerification(project,failed),/Only a passed/);
  const passed=makeFinalOutputManifest(project,{video:{width:1080,height:1920},duration:5,bytes:2_000_000});
  assert.throws(()=>setFinalVerification(project,{...passed,projectId:'other-project'}),/different project/);
  assert.throws(()=>setFinalVerification(project,{}),/invalid/);
});

test('invalid or paid projects and oversized metadata are refused', () => {
  const project = planScenes(createProject('Garden'), 5);
  assert.throws(() => makePublishingPackage({...project, costMode: 'PAID'}), /FREE ONLY/);
  assert.throws(() => makePublishingPackage({...project, scenes: []}), /scene plan/);
  assert.throws(() => setPublishingDetails(project, {title: ' '}), /title/);
  assert.throws(() => setPublishingDetails(project, {title: 'x'.repeat(101)}), /title/);
  assert.throws(() => setPublishingDetails(project, {title: 'Valid', description: 'x'.repeat(5001)}), /5000/);
});
