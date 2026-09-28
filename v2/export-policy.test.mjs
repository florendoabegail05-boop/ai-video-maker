import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyExport,exportPolicyCatalog} from './export-policy.mjs';

test('known portable envelope is review-before-sharing',()=>{
  const result=classifyExport({kind:'aivm-v2-release-envelope',filename:'release.json',value:{kind:'aivm-v2-release-envelope',projectId:'p1'}});
  assert.equal(result.classification,'PORTABLE — REVIEW BEFORE SHARING');
  assert.equal(result.shareable,true);
  assert.equal(result.requiresOwnerReview,true);
});

test('local paths or prompts downgrade a nominally portable export',()=>{
  const result=classifyExport({kind:'aivm-v2-release-envelope',filename:'release.json',value:{kind:'aivm-v2-release-envelope',prompt:'private idea',sourcePath:'C:\\private\\clip.mp4'}});
  assert.equal(result.classification,'REVIEW REQUIRED');
  assert.equal(result.shareable,false);
  assert.ok(result.reasons.includes('PRIVATE_PROJECT_FIELD'));
  assert.ok(result.reasons.includes('LOCAL_PATH'));
});

test('zip and binary exports are private recovery only',()=>{
  assert.equal(classifyExport({filename:'project-backup.zip'}).classification,'PRIVATE RECOVERY ONLY');
  assert.equal(classifyExport({filename:'anything.bin',binary:true}).classification,'PRIVATE RECOVERY ONLY');
});

test('unknown export type never becomes shareable by default',()=>{
  const result=classifyExport({kind:'custom-json',filename:'custom.json',value:{hello:'world'}});
  assert.equal(result.classification,'REVIEW REQUIRED');
  assert.equal(result.shareable,false);
});

test('catalog keeps owner review requirement explicit',()=>{
  const catalog=exportPolicyCatalog();
  assert.equal(catalog.kind,'aivm-v2-export-policy-catalog');
  assert.ok(catalog.entries.some(entry=>entry.classification==='PRIVATE RECOVERY ONLY'));
  assert.match(catalog.note,/does not determine copyright/i);
});
