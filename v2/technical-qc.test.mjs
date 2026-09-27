import test from 'node:test';
import assert from 'node:assert/strict';
import {runTechnicalQc,visualQcAvailability} from './technical-qc.mjs';

test('technical QC catches missing media and short clips without replacing anything',()=>{const project={scenes:[{id:'s1',order:1,duration:5,caption:'ok'},{id:'s2',order:2,duration:5,caption:'ok'}],assets:[{id:'a1',sceneId:'s1',kind:'video',name:'short.mp4',duration:2,hasFile:true,status:'kept',locked:true},{id:'a2',sceneId:'s2',kind:'image',name:'missing.png',hasFile:false,status:'missing local file',locked:true}]};const qc=runTechnicalQc(project);assert.equal(qc.passed,false);assert.ok(qc.issues.some(i=>i.code==='SHORT_VIDEO'));assert.ok(qc.issues.some(i=>i.code==='MISSING_FILE'));assert.ok(qc.issues.some(i=>i.code==='LOCKED_FILE_MISSING'));assert.equal(project.assets[0].locked,true);});

test('technical QC can pass a basic valid timeline',()=>{const project={scenes:[{id:'s1',order:1,duration:5,caption:'hello'}],assets:[{id:'v1',sceneId:'s1',kind:'video',name:'ok.mp4',duration:5,hasFile:true,status:'kept',width:1080,height:1920}]};const qc=runTechnicalQc(project);assert.equal(qc.passed,true);assert.equal(qc.summary.errors,0);});

test('visual QC never becomes available by implication',()=>{assert.deepEqual(visualQcAvailability({}),{identityDrift:false,flicker:false,anatomyObjects:false,note:'Visual AI QC must remain unavailable unless an evaluator actually ran on the generated output.'});});
