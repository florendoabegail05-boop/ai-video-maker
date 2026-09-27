import test from 'node:test';
import assert from 'node:assert/strict';
import {directorBrief,qualityTargets} from './director.mjs';

function project(style='custom',hardwareMode='light'){
  return {style,hardwareMode,scenes:[
    {id:'s1',beat:'A mother enters the kitchen',prompt:'Mother enters a bright kitchen'},
    {id:'s2',beat:'A glowing portal opens',prompt:'A glowing portal opens beside the table'},
    {id:'s3',beat:'She steps into another world',prompt:'She steps through the portal'}
  ]};
}

test('photorealistic director asks for real-footage physics and capability honesty',()=>{
  const brief=directorBrief(project('photorealistic'),'s2');
  assert.match(brief,/real-footage realism/i);
  assert.match(brief,/physically plausible lighting/i);
  assert.match(brief,/Previous beat: A mother enters the kitchen/);
  assert.match(brief,/Next beat: She steps into another world/);
  assert.match(brief,/do not claim photorealism/i);
});

test('surreal mode explicitly allows impossible worlds while keeping continuity',()=>{
  const brief=directorBrief(project('surreal','strong'),'s2');
  assert.match(brief,/out-of-this-world/i);
  assert.match(brief,/impossible rules consistent/i);
  assert.match(brief,/richer detail/i);
});

test('custom mode stays flexible and light mode avoids fake quality claims',()=>{
  const brief=directorBrief(project('unknown-style','light'),'s1');
  assert.match(brief,/Visual mode: custom/);
  assert.match(brief,/completely impossible/i);
  assert.match(brief,/opening scene/i);
  assert.match(brief,/do not fake unavailable resolution/i);
});

test('global targets include motion, identity, audio and prompt accuracy',()=>{
  const text=qualityTargets().join('\n');
  assert.match(text,/PROMPT ACCURACY/);
  assert.match(text,/CHARACTER CONSISTENCY/);
  assert.match(text,/MOTION QUALITY/);
  assert.match(text,/AUDIO INTENT/);
});

test('missing scene fails',()=>assert.throws(()=>directorBrief(project(),'missing'),/Scene missing/));
