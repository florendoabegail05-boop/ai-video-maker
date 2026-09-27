import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneContinuityState,continuityPrompt,continuityReport} from './continuity.mjs';

const project={bible:{character:'10-month-old baby in blue shirt',world:'soft green valley with rainbow',visualRules:'warm morning light'},scenes:[
 {id:'a',order:1,beat:'Baby crawls beside a red ball',prompt:'opening'},
 {id:'b',order:2,beat:'Baby reaches the ball',prompt:'middle'}
]};

test('opening scene establishes anchors',()=>{const state=sceneContinuityState(project,'a');assert.equal(state.previousSceneId,null);assert.match(state.instruction,/Establish stable identity/);assert.equal(state.anchors.character,'10-month-old baby in blue shirt');});

test('later scene carries prior story state',()=>{const text=continuityPrompt(project,'b');assert.match(text,/Baby crawls beside a red ball/);assert.match(text,/Baby reaches the ball/);assert.match(text,/Carry forward identity/);assert.match(text,/WORLD ANCHOR/);});

test('continuity report follows timeline and missing scene fails',()=>{assert.equal(continuityReport(project).length,2);assert.throws(()=>sceneContinuityState(project,'x'),/Scene missing/);});
