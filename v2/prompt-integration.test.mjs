import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes,addAsset,compileScenePrompt} from './core.mjs';
import {setReferenceAsset} from './references.mjs';

test('compiled prompt includes director, continuity, text locks and approved visual reference labels',()=>{
  let project=createProject('A baby explores a magical valley','Continuity demo');
  project.style='fantasy';
  project.bible={character:'10-month-old baby in blue shirt',world:'soft green hills and complete rainbow',visualRules:'warm morning light'};
  project=planScenes(project,10);
  project=addAsset(project,project.scenes[0].id,{kind:'image',name:'baby-approved.png',hasFile:true,sourcePath:'/media/baby-approved.png'});
  project=setReferenceAsset(project,project.assets.at(-1).id,{role:'character',label:'approved baby face and outfit'});
  const text=compileScenePrompt(project,project.scenes[1].id);
  assert.match(text,/AI DIRECTOR BRIEF/);
  assert.match(text,/CONTINUITY STATE/);
  assert.match(text,/APPROVED CHARACTER REFERENCES/);
  assert.match(text,/approved baby face and outfit/);
  assert.match(text,/10-month-old baby in blue shirt/);
  assert.match(text,/soft green hills and complete rainbow/);
});
