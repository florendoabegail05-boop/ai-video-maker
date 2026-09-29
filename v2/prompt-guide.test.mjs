import test from 'node:test';
import assert from 'node:assert/strict';
import {promptGuide} from './prompt-guide.mjs';

test('empty prompt guidance asks for a usable idea without inventing content',()=>{
  const guide=promptGuide('   ');
  assert.equal(guide.state,'empty');
  assert.equal(guide.stepCount,0);
  assert.match(guide.message,/subject, setting, action and outcome/i);
});

test('single descriptive idea stays broad and explains how to add order',()=>{
  const guide=promptGuide('A tiny silver robot waits beside a rainy window');
  assert.equal(guide.state,'descriptive');
  assert.equal(guide.stepCount,1);
  assert.match(guide.message,/Then, Next, After that or Finally/);
});

test('explicit ordered actions are surfaced without modifying the prompt',()=>{
  const prompt='Maya enters the forest. Then she finds a glowing door. Finally she opens it.';
  const guide=promptGuide(prompt);
  assert.equal(guide.state,'sequenced');
  assert.equal(guide.stepCount,3);
  assert.match(guide.message,/Detected 3 ordered story steps/);
  assert.equal(prompt,'Maya enters the forest. Then she finds a glowing door. Finally she opens it.');
});
