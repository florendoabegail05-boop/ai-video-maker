import test from 'node:test';
import assert from 'node:assert/strict';
import {captureGenerationInputGuard,validateGenerationInputGuard,generationInputSignature} from './generation-input-guard.mjs';

function project(){
  return {
    id:'project-1',
    revision:1,
    style:'cinematic',
    hardwareMode:'light',
    bible:{character:'Mika has short black hair and a yellow dress.',world:'A sunny garden.',visualRules:'Warm natural light.'},
    scenes:[
      {id:'scene-1',order:1,duration:5,beat:'Mika finds a kite.',prompt:'Mika stands beside a red kite.',caption:'Look!',direction:{shot:'wide',camera:'locked',motion:'Mika points to the kite.',continuityGoal:'Establish Mika and the garden.',audioIntent:'soft garden ambience'},assetIds:['ref-char','source-image']},
      {id:'scene-2',order:2,duration:5,beat:'The kite lifts into the air.',prompt:'The red kite rises above Mika.',caption:'',direction:{shot:'medium',camera:'gentle push-in',motion:'The kite rises.',continuityGoal:'Keep Mika and kite consistent.',audioIntent:'wind cue'},assetIds:[]}
    ],
    assets:[
      {id:'ref-char',sceneId:'scene-1',kind:'image',name:'mika.png',hasFile:true,sourcePath:'C:\\media\\mika.png',provider:'local-import',status:'kept',locked:true,reference:true,referenceRole:'character',referenceLabel:'Mika approved reference',size:100},
      {id:'source-image',sceneId:'scene-1',kind:'image',name:'scene.png',hasFile:true,sourcePath:'C:\\media\\scene.png',provider:'basic-local-still',status:'kept',locked:false,reference:false,size:200}
    ]
  };
}

test('unchanged image generation inputs validate',()=>{
  const p=project();
  const guard=captureGenerationInputGuard(p,'scene-1',{type:'image',route:'basic-local-still'});
  assert.deepEqual(validateGenerationInputGuard(p,guard),{ok:true,reason:'match',currentSignature:guard.signature});
});

test('scene prompt, bible and neighbor story changes invalidate generation results',()=>{
  const p=project();
  const guard=captureGenerationInputGuard(p,'scene-1',{type:'image',route:'basic-local-still'});
  const promptChanged={...p,scenes:p.scenes.map(scene=>scene.id==='scene-1'?{...scene,prompt:'Mika kneels beside the kite.'}:scene)};
  assert.equal(validateGenerationInputGuard(promptChanged,guard).reason,'generation-inputs-changed');
  const bibleChanged={...p,bible:{...p.bible,character:'Mika now wears a blue jacket.'}};
  assert.equal(validateGenerationInputGuard(bibleChanged,guard).reason,'generation-inputs-changed');
  const neighborChanged={...p,scenes:p.scenes.map(scene=>scene.id==='scene-2'?{...scene,beat:'A bird steals the kite.'}:scene)};
  assert.equal(validateGenerationInputGuard(neighborChanged,guard).reason,'generation-inputs-changed');
});

test('reference identity or label changes invalidate but sourcePath-only relocation does not',()=>{
  const p=project();
  const guard=captureGenerationInputGuard(p,'scene-1',{type:'image',route:'basic-local-still'});
  const relabeled={...p,assets:p.assets.map(asset=>asset.id==='ref-char'?{...asset,referenceLabel:'Mika alternate reference'}:asset)};
  assert.equal(validateGenerationInputGuard(relabeled,guard).reason,'generation-inputs-changed');
  const moved={...p,assets:p.assets.map(asset=>asset.id==='ref-char'?{...asset,sourcePath:'D:\\portable\\mika.png'}:asset)};
  assert.equal(validateGenerationInputGuard(moved,guard).ok,true);
});

test('route changes invalidate image generation',()=>{
  const p=project();
  const guard=captureGenerationInputGuard(p,'scene-1',{type:'image',route:'basic-local-still'});
  const result=validateGenerationInputGuard(p,guard,{route:'local-comfyui'});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'generation-inputs-changed');
});

test('motion guard tracks the selected source image identity',()=>{
  const p=project();
  const guard=captureGenerationInputGuard(p,'scene-1',{type:'motion',route:'ffmpeg-camera-motion',parentAssetId:'source-image'});
  const alternate={...p,assets:[...p.assets,{id:'alternate-image',sceneId:'scene-1',kind:'image',name:'alt.png',hasFile:true,sourcePath:'C:\\media\\alt.png',provider:'basic-local-still',status:'kept',locked:false,reference:false,size:200}]};
  const result=validateGenerationInputGuard(alternate,guard,{parentAssetId:'alternate-image'});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'generation-inputs-changed');
});

test('signature is deterministic and excludes reference local path',()=>{
  const p=project();
  const first=generationInputSignature(p,'scene-1',{type:'image',route:'basic-local-still'});
  const moved={...p,assets:p.assets.map(asset=>asset.id==='ref-char'?{...asset,sourcePath:'E:\\elsewhere\\mika.png'}:asset)};
  const second=generationInputSignature(moved,'scene-1',{type:'image',route:'basic-local-still'});
  assert.equal(first,second);
});
