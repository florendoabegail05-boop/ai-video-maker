import test from 'node:test';
import assert from 'node:assert/strict';
import {outputReadinessSummary,outputReadinessLabel} from './output-readiness-summary.mjs';
import {browserFinalMediaFacts,machineFinalMediaFacts} from './final-media-facts.mjs';

function project(){return {id:'p1',revision:1,scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:[]}],assets:[],audio:{}};}

test('technical blocker remains a blocker',()=>{
  const p=project();
  const facts=[browserFinalMediaFacts(p,{width:720,height:1280,duration:5})];
  const summary=outputReadinessSummary(p,facts);
  assert.equal(summary.technicallyReady,false);
  assert.ok(summary.blockers.includes('technical-verification'));
  assert.equal(outputReadinessLabel(summary),'BLOCKED');
  assert.equal(summary.publishAuthorized,false);
});

test('technical pass can advance to rights review without implying approval',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,audioStream:true},'ffprobe')];
  const summary=outputReadinessSummary(p,facts);
  assert.equal(summary.technicallyReady,true);
  assert.equal(summary.readyForOwnerReview,true);
  assert.equal(summary.manualPublishEligible,false);
  assert.equal(outputReadinessLabel(summary),'RIGHTS REVIEW REQUIRED');
});

test('rights complete still requires owner approval',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const summary=outputReadinessSummary(p,facts,{rights:{complete:true}});
  assert.equal(summary.manualPublishEligible,false);
  assert.equal(outputReadinessLabel(summary),'OWNER APPROVAL REQUIRED');
});

test('all checks only allow manual owner-controlled publish state',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')];
  const summary=outputReadinessSummary(p,facts,{rights:{complete:true},ownerApproval:{current:true}});
  assert.equal(summary.manualPublishEligible,true);
  assert.equal(outputReadinessLabel(summary),'OWNER APPROVED — MANUAL PUBLISH ONLY');
  assert.equal(summary.publishAuthorized,false);
  assert.equal(summary.automaticPublishingAllowed,false);
});
