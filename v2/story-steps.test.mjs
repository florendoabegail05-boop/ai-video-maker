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
