import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTechnicalEvidence} from './verification-evidence.mjs';
import {claimDecision,safeCapabilityLabel,technicalClaimReport} from './technical-claim-policy.mjs';
import {renderSignature} from './render-signature.mjs';

function project(){return{id:'p1',revision:1,scenes:[],assets:[]};}

test('unknown evidence never becomes a false or positive claim',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(null,{source:'browser',field:'audioStream'});
  const result=claimDecision(p,'audioStream',evidence);
  assert.equal(result.state,'UNKNOWN');
  assert.equal(result.mayClaimAvailable,false);
  assert.equal(result.mayClaimUnavailable,false);
  assert.equal(safeCapabilityLabel(p,'audioStream',evidence),'Not verified');
});

test('unsupported browser stream claim is untrusted even when true',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(true,{source:'browser',field:'audioStream'});
  const result=claimDecision(p,'audioStream',evidence);
  assert.equal(result.state,'UNTRUSTED');
  assert.equal(result.mayClaimAvailable,false);
});

test('current ffprobe evidence can verify an audio stream',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(true,{source:'ffprobe',field:'audioStream',renderSignature:renderSignature(p)});
  const result=claimDecision(p,'audioStream',evidence);
  assert.equal(result.state,'VERIFIED TRUE');
  assert.equal(result.mayClaimAvailable,true);
  assert.equal(safeCapabilityLabel(p,'audioStream',evidence),'Verified available');
});

test('trusted false evidence may support verified-unavailable without implying unknown',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(false,{source:'ffprobe',field:'audioStream',renderSignature:renderSignature(p)});
  const result=claimDecision(p,'audioStream',evidence);
  assert.equal(result.state,'VERIFIED FALSE');
  assert.equal(result.mayClaimUnavailable,true);
});

test('stale render evidence cannot support current positive claim',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(true,{source:'ffprobe',field:'fps',renderSignature:renderSignature(p)});
  p.scenes=[{id:'s1',order:1,duration:5,caption:'',assetIds:[]}];
  const result=claimDecision(p,'fps',evidence);
  assert.equal(result.state,'STALE');
  assert.equal(result.mayClaimAvailable,false);
});

test('report blocks unverified positive claims and prefers strongest supplied evidence',()=>{
  const p=project();
  const browser=makeTechnicalEvidence(null,{source:'browser',field:'width'});
  const ffprobe=makeTechnicalEvidence(true,{source:'ffprobe',field:'width',renderSignature:renderSignature(p)});
  const report=technicalClaimReport(p,{width:[browser,ffprobe],fps:makeTechnicalEvidence(null,{source:'browser',field:'fps'})});
  assert.equal(report.claims.width.mayClaimAvailable,true);
  assert.equal(report.claims.fps.mayClaimAvailable,false);
  assert.deepEqual(report.blockedPositiveClaims,['fps']);
});
