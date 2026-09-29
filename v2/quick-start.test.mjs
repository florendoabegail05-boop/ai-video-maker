import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset} from './core.mjs';
import {prepareOnePromptProject,quickStartNeedsPlanning,suggestProjectName} from './quick-start.mjs';

test('fresh one-prompt quick start creates a FREE ONLY planned project',()=>{
  const result=prepareOnePromptProject({
    prompt:'A tiny robot finds a glowing seed.',
    name:'Robot Seed',
    style:'cinematic',
    hardwareMode:'light',
    seconds:15,
    bible:{character:'Small silver robot',world:'Warm greenhouse',visualRules:'Soft morning light'}
  });
  assert.equal(result.created,true);
  assert.equal(result.planned,true);
  assert.equal(result.reusedPlan,false);
  assert.equal(result.project.costMode,'FREE ONLY');
  assert.equal(result.project.name,'Robot Seed');
  assert.equal(result.project.style,'cinematic');
  assert.equal(result.project.hardwareMode,'light');
  assert.equal(result.project.scenes.length,3);
  assert.equal(result.project.bible.character,'Small silver robot');
});

test('quick start derives a readable project name only when the owner leaves it blank',()=>{
  assert.equal(suggestProjectName('  A tiny robot finds a glowing seed. Then it grows.  '),'A tiny robot finds a glowing seed');
  assert.equal(suggestProjectName('One two three four five six seven eight nine ten'),'One two three four five six seven eight');
  assert.equal(suggestProjectName('   '),'Untitled project');
  const result=prepareOnePromptProject({prompt:'A lantern floats over the sleeping village.',seconds:10});
  assert.equal(result.project.name,'A lantern floats over the sleeping village');
  const named=prepareOnePromptProject({prompt:'A second idea.',name:'Owner Name',seconds:10});
  assert.equal(named.project.name,'Owner Name');
});

test('starting one-click again preserves an existing plan and its assets exactly',()=>{
  let project=planScenes(createProject('A cat watches the rain','Rain Cat'),10);
  const sceneId=project.scenes[0].id;
  project=addAsset(project,sceneId,{kind:'image',name:'kept.png',hasFile:true,sourcePath:'C:/media/kept.png',provider:'local-import'});
  const before=structuredClone(project);
  const result=prepareOnePromptProject({current:project,prompt:project.prompt,name:'Different UI name',style:'fantasy',hardwareMode:'strong',seconds:60});
  assert.equal(result.reason,'existing-plan-preserved');
  assert.equal(result.reusedPlan,true);
  assert.strictEqual(result.project,project);
  assert.deepEqual(result.project,before);
});

test('planning decision only asks for a plan when the selected project cannot be safely reused',()=>{
  const project=planScenes(createProject('Same idea','Same'),10);
  assert.equal(quickStartNeedsPlanning(project,' Same idea '),false);
  assert.equal(quickStartNeedsPlanning(project,'Different idea'),true);
  assert.equal(quickStartNeedsPlanning(createProject('Same idea'),'Same idea'),true);
  assert.equal(quickStartNeedsPlanning(null,'Fresh idea'),true);
  assert.throws(()=>quickStartNeedsPlanning(project,'   '),/Enter a video idea/);
});

test('a changed prompt creates a separate new project instead of replacing the selected one',()=>{
  const current=planScenes(createProject('Original idea','Original'),10);
  const before=structuredClone(current);
  const result=prepareOnePromptProject({current,prompt:'Completely new idea',name:'New',seconds:10});
  assert.equal(result.created,true);
  assert.notEqual(result.project.id,current.id);
  assert.equal(result.project.prompt,'Completely new idea');
  assert.deepEqual(current,before);
});

test('an existing empty project can be planned without inventing paid routes',()=>{
  const current=createProject('Plan this later','Later');
  const result=prepareOnePromptProject({current,prompt:current.prompt,style:'storybook',hardwareMode:'balanced',seconds:20,bible:{world:'Paper village'}});
  assert.equal(result.created,false);
  assert.equal(result.reason,'empty-project-planned');
  assert.equal(result.project.costMode,'FREE ONLY');
  assert.equal(result.project.scenes.length,4);
  assert.equal(result.project.style,'storybook');
  assert.equal(result.project.hardwareMode,'balanced');
  assert.equal(result.project.bible.world,'Paper village');
});

test('quick start rejects missing ideas, invalid durations and inconsistent unplanned projects',()=>{
  assert.throws(()=>prepareOnePromptProject({prompt:'',seconds:30}),/Enter a video idea/);
  assert.throws(()=>prepareOnePromptProject({prompt:'x',seconds:0}),/duration/i);
  let broken=createProject('Broken');
  broken={...broken,assets:[{id:'a1',sceneId:null,kind:'audio'}]};
  assert.throws(()=>prepareOnePromptProject({current:broken,prompt:broken.prompt,seconds:30}),/assets but no scene plan/i);
});
