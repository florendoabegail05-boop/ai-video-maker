import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSceneGenerationContract,normalizeGenerationStyle} from './generation-prompt-contract.mjs';

function project(){
  return {
    id:'p1',prompt:'A child explores a moonlit garden.',style:'3D animation',
    bible:{
      character:'Mina, age 7, yellow raincoat and red boots.',
      world:'A compact moonlit garden with a stone path and blue gate.',
      visualRules:'Soft cool moonlight from camera left; warm window fill.'
    },
    scenes:[
      {id:'s1',order:1,beat:'Mina opens the blue gate.',prompt:'Mina opens the blue gate.',direction:{shot:'wide establishing shot',camera:'gentle push-in'},assetIds:[]},
      {id:'s2',order:2,beat:'Mina follows the stone path.',prompt:'Mina follows the stone path.',direction:{shot:'medium action shot',camera:'controlled lateral follow'},assetIds:[]}
    ],
    assets:[
      {id:'char-ref',kind:'image',name:'mina.png',hasFile:true,sourcePath:'C:\\AIVM\\mina.png',status:'kept',locked:true,reference:true,referenceRole:'character',referenceLabel:'Mina master'},
      {id:'world-ref',kind:'image',name:'garden.png',hasFile:true,sourcePath:'C:\\AIVM\\garden.png',status:'kept',locked:true,reference:true,referenceRole:'world',referenceLabel:'Garden master'}
    ]
  };
}

test('builds deterministic backend-neutral scene intent without leaking local reference paths',()=>{
  const contract=buildSceneGenerationContract(project(),'s2');
  assert.equal(contract.kind,'aivm-v2-generation-prompt-contract');
  assert.equal(contract.projectId,'p1');
  assert.equal(contract.sceneId,'s2');
  assert.equal(contract.style,'3d-animation');
  assert.equal(contract.subject,'Mina, age 7, yellow raincoat and red boots.');
  assert.equal(contract.action,'Mina follows the stone path.');
  assert.equal(contract.setting,'A compact moonlit garden with a stone path and blue gate.');
  assert.equal(contract.shot,'medium action shot');
  assert.equal(contract.camera,'controlled lateral follow');
  assert.equal(contract.continuity.previousSceneId,'s1');
  assert.match(contract.continuity.instruction,/Carry forward identity/i);
  assert.deepEqual(contract.referenceImageAssetIds,['char-ref','world-ref']);
  assert.deepEqual(contract.characterReferenceAssetIds,['char-ref']);
  assert.deepEqual(contract.worldReferenceAssetIds,['world-ref']);
  assert.equal(contract.referenceMode,'metadata-only');
  assert.match(contract.negativePrompt,/identity drift/i);
  assert.doesNotMatch(JSON.stringify(contract),/C:\\\\AIVM/i);
});

test('unknown visual styles become stable custom tokens',()=>{
  assert.equal(normalizeGenerationStyle('Anime Watercolor'),'custom-anime-watercolor');
  assert.equal(normalizeGenerationStyle(''),'custom');
  assert.equal(normalizeGenerationStyle('sci fi'),'sci-fi');
});

test('missing project or scene fails closed',()=>{
  assert.throws(()=>buildSceneGenerationContract(null,'s1'),/Project is required/);
  assert.throws(()=>buildSceneGenerationContract(project(),'missing'),/Scene missing/);
});
