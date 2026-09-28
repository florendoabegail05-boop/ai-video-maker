import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseProject,sortedProjects,selectedProject} from './project-selection.mjs';

const projects=[
  {id:'a',name:'Same',prompt:'one',updatedAt:'2026-09-01T00:00:00Z'},
  {id:'b',name:'Same',prompt:'two',updatedAt:'2026-09-02T00:00:00Z'},
  {id:'c',name:'Other',prompt:'one',updatedAt:'2026-09-03T00:00:00Z'}
];

test('project id wins even when names are duplicated',()=>{
  assert.equal(chooseProject(projects,{projectId:'b',name:'Same',prompt:'one'}).id,'b');
});

test('ambiguous text selection returns null instead of guessing',()=>{
  assert.equal(chooseProject(projects,{name:'Same',prompt:'missing'}),null);
  assert.equal(chooseProject(projects,{name:'missing',prompt:'one'}),null);
});

test('unique exact text match remains available as fallback',()=>{
  assert.equal(chooseProject(projects,{name:'Same',prompt:'two'}).id,'b');
});

test('sorting matches the live project list order',()=>{
  assert.deepEqual(sortedProjects(projects).map(p=>p.id),['c','b','a']);
  assert.equal(selectedProject(projects,'a').name,'Same');
});
