import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,compileScenePrompt} from './core.mjs';
import {storySteps} from './story-steps.mjs';

test('explicit story sequence gives scenes distinct actions in order',()=>{
  const project=planScenes(createProject('Maya enters the forest. Then she finds a glowing door. Finally she opens it.'),15);
  assert.equal(project.scenes.length,3);
  assert.match(project.scenes[0].beat,/enters the forest/);
  assert.match(project.scenes[1].beat,/finds a glowing door/);
  assert.match(project.scenes[2].beat,/opens it/);
  assert.doesNotMatch(project.scenes[0].prompt,/Current scene action:.*opens it/);
  assert.match(compileScenePrompt(project,project.scenes[1].id),/FROM PRIOR SCENE: Maya enters the forest/);
  assert.equal(project.prompt,'Maya enters the forest. Then she finds a glowing door. Finally she opens it.');
});

test('single descriptive idea stays intact and commas do not invent actions',()=>{
  const idea='A silver robot, with blue eyes and a red scarf, stands in a rainy city';
  assert.deepEqual(storySteps(idea),[idea]);
  const project=planScenes(createProject(idea),10);
  assert.ok(project.scenes.every(scene=>scene.prompt.includes(idea)));
});

test('short duration still includes every explicit action',()=>{
  const project=planScenes(createProject('A bird flies. Then it lands. Finally it sings.'),10);
  assert.equal(project.scenes.length,2);
  assert.match(project.scenes[1].beat,/it lands.*it sings/);
});

test('Taglish sequence words are recognized without changing the original project prompt',()=>{
  const idea='Baby gumapang sa playmat, tapos tumayo sa sofa, sunod kumaway kay Mommy, sa huli ngumiti sa camera.';
  assert.deepEqual(storySteps(idea),[
    'Baby gumapang sa playmat',
    'tumayo sa sofa',
    'kumaway kay Mommy',
    'ngumiti sa camera.'
  ]);
  const project=planScenes(createProject(idea),20);
  assert.equal(project.scenes.length,4);
  assert.match(project.scenes[0].beat,/gumapang/);
  assert.match(project.scenes[3].beat,/ngumiti/);
  assert.equal(project.prompt,idea);
});

test('numbered and bulleted multiline prompts preserve explicit owner order',()=>{
  assert.deepEqual(storySteps('1. Open the magic door\n2. Enter the rainbow room\n3. Find the missing star'),[
    'Open the magic door',
    'Enter the rainbow room',
    'Find the missing star'
  ]);
  assert.deepEqual(storySteps('- Pick up the toy\n- Put it in the box\n- Close the lid'),[
    'Pick up the toy',
    'Put it in the box',
    'Close the lid'
  ]);
});

test('ordinary multiline description is not treated as an ordered list just because it has line breaks',()=>{
  const idea='A small red robot\ninside a warm kitchen\nsoft morning light';
  assert.deepEqual(storySteps(idea),['A small red robot inside a warm kitchen soft morning light']);
});
