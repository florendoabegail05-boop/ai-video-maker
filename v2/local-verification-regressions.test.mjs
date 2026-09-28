import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,updateAsset,editScene,moveScene,compileScenePrompt,setBible} from './core.mjs';
import {decorateProjectButtons} from './project-selection.mjs';
import {adapterAvailabilitySummary} from './adapter-registry.mjs';
import {validateFinalOutput} from './final-output.mjs';
import {runTechnicalQc} from './technical-qc.mjs';

test('automatic invalidation preserves kept, locked and imported media and no-op edits',()=>{
 let p=planScenes(createProject('Garden'),15);const scene=p.scenes[0];
 for(const [name,provider] of [['kept','fallback'],['locked','fallback'],['import','local-import'],['candidate','fallback']])p=addAsset(p,scene.id,{kind:'image',name,provider,hasFile:true,sourcePath:'/media/'+name});
 p=updateAsset(p,p.assets[0].id,'keep');p=updateAsset(p,p.assets[1].id,'lock');
 const before=structuredClone(p.assets);
 assert.deepEqual(editScene(p,scene.id,scene.prompt).assets,before);
 p=setBible(p,{character:'New character'});
 assert.deepEqual(p.assets.slice(0,3),before.slice(0,3));assert.equal(p.assets[3].status,'needs regeneration');
 assert.equal(p.assets[3].sourcePath,before[3].sourcePath);
});

test('scene reorder invalidates exactly changed compiled prompts, preserving source files',()=>{
 let p=planScenes(createProject('A journey'),30);
 for(const scene of p.scenes)p=addAsset(p,scene.id,{kind:'video',name:scene.id+'.mp4',provider:'motion-fallback',hasFile:true,sourcePath:'/media/'+scene.id,duration:5});
 const original=structuredClone(p),next=moveScene(p,p.scenes[1].id,1);
 const changed=p.scenes.filter(s=>compileScenePrompt(p,s.id)!==compileScenePrompt(next,s.id)).map(s=>s.id);
 assert.ok(changed.length>0&&changed.length<p.scenes.length);
 for(const asset of next.assets){assert.equal(asset.status,changed.includes(asset.sceneId)?'needs regeneration':'candidate');assert.equal(asset.sourcePath,p.assets.find(a=>a.id===asset.id).sourcePath);}
 assert.deepEqual(p,original);
});

test('button IDs are not reassigned when saving changes project sort order',()=>{
 const buttons=[{dataset:{projectId:'a'}},{dataset:{projectId:'b'}}];
 decorateProjectButtons({querySelectorAll:()=>buttons},[{id:'b',updatedAt:'2026-02'},{id:'a',updatedAt:'2026-01'}]);
 assert.deepEqual(buttons.map(b=>b.dataset.projectId),['a','b']);
});

test('actual bridge fallback capability shape yields honest image and motion adapters',()=>{
 const report={routes:{image:{provider:'unavailable'},video:{provider:'unavailable'}},imageFallback:{enabled:true},motionFallback:{enabled:true},tools:{ffmpeg:{available:true},ffprobe:{available:true}}};
 const summary=adapterAvailabilitySummary(report);
 assert.equal(summary.image[0].id,'image:fallback');assert.equal(summary.video[0].id,'video:motion-fallback');
 for(const kind of ['voice','music','sfx','lipsync','upscale'])assert.equal(summary[kind].length,0);
 assert.equal(adapterAvailabilitySummary({...report,mock:true}).image.length,0);
 assert.equal(adapterAvailabilitySummary({...report,tools:{}}).video.length,0);
});

test('browser unknown facts stay unknown; FFprobe rational FPS is parsed',()=>{
 const p={scenes:[{duration:5}]};
 const browser=validateFinalOutput(p,{video:{width:1080,height:1920},duration:5,bytes:2048,audio:null});
 assert.equal(browser.actual.fps,null);assert.equal(browser.actual.hasAudio,null);assert.equal(browser.passed,true);
 const bridge=validateFinalOutput(p,{video:{width:1080,height:1920,fps:'30/1'},duration:5,bytes:2048,audio:{codec:'aac'}});
 assert.equal(bridge.actual.fps,30);assert.equal(bridge.actual.hasAudio,true);
 assert.equal(validateFinalOutput(p,{video:{width:1080,height:1920},duration:null,bytes:2048}).passed,false);
});

test('QC blocks missing local clips but an unused short candidate cannot block a valid selected clip',()=>{
 let p=planScenes(createProject('Garden'),5);
 assert.equal(runTechnicalQc(p,{requireLocalClips:true}).passed,false);
 p=addAsset(p,p.scenes[0].id,{kind:'video',name:'short.mp4',duration:1,hasFile:true,sourcePath:'/media/short.mp4',provider:'local-import'});
 p=addAsset(p,p.scenes[0].id,{kind:'video',name:'usable.mp4',duration:5,hasFile:true,sourcePath:'/media/usable.mp4',provider:'local-import'});
 const qc=runTechnicalQc(p,{requireLocalClips:true});assert.equal(qc.passed,true);assert.ok(qc.issues.some(i=>i.code==='SHORT_VIDEO'&&i.severity==='warning'));
 assert.equal(runTechnicalQc({...p,assets:p.assets.map(a=>({...a,sourcePath:null}))},{requireLocalClips:true}).passed,false);
});
