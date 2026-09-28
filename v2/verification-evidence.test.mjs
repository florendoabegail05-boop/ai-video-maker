import test from 'node:test';
import assert from 'node:assert/strict';
import {makeTechnicalEvidence,evidenceForCurrentRender,chooseBestTechnicalEvidence,verifiedTechnicalClaim,technicalFactSummary,sourceSupportsTechnicalField} from './verification-evidence.mjs';
import {renderSignature} from './render-signature.mjs';

function project(){return{id:'p1',scenes:[],assets:[],revision:1};}

test('unknown remains unknown and is never promoted to false',()=>{
  const p=project();
  const evidence=makeTechnicalEvidence(null,{source:'browser',field:'audioStream',renderSignature:renderSignature(p)});
  const current=evidenceForCurrentRender(p,evidence);
  assert.equal(current.value,null);
  assert.equal(current.trusted,false);
  assert.equal(verifiedTechnicalClaim(p,evidence),false);
});

test('browser may verify dimensions but not audio stream or fps',()=>{
  assert.equal(sourceSupportsTechnicalField('browser','width'),true);
  assert.equal(sourceSupportsTechnicalField('browser','duration'),true);
  assert.equal(sourceSupportsTechnicalField('browser','audioStream'),false);
  assert.equal(sourceSupportsTechnicalField('browser','fps'),false);
});

test('ffprobe explicit evidence outranks browser unknown evidence',()=>{
  const p=project(),sig=renderSignature(p);
  const browser=makeTechnicalEvidence(null,{source:'browser',field:'audioStream',renderSignature:sig});
  const ffprobe=makeTechnicalEvidence(true,{source:'ffprobe',field:'audioStream',renderSignature:sig});
  const best=chooseBestTechnicalEvidence(p,browser,ffprobe);
  assert.equal(best.value,true);
  assert.equal(best.source,'ffprobe');
  assert.equal(best.trusted,true);
  assert.equal(verifiedTechnicalClaim(p,best),true);
});

test('stale render-bound evidence becomes unknown',()=>{
  const p=project(),sig=renderSignature(p);
  const evidence=makeTechnicalEvidence(true,{source:'ffprobe',field:'audioStream',renderSignature:sig});
  p.scenes=[{id:'s1',order:1,duration:5,caption:'',assetIds:[]}];
  const current=evidenceForCurrentRender(p,evidence);
  assert.equal(current.value,null);
  assert.equal(current.stale,true);
  assert.equal(current.reason,'render-inputs-changed');
});

test('higher-trust current machine evidence wins conflicts',()=>{
  const p=project(),sig=renderSignature(p);
  const bridge=makeTechnicalEvidence(false,{source:'bridge',field:'fps',renderSignature:sig});
  const ffprobe=makeTechnicalEvidence(true,{source:'ffprobe',field:'fps',renderSignature:sig});
  const best=chooseBestTechnicalEvidence(p,bridge,ffprobe);
  assert.equal(best.source,'ffprobe');
  assert.equal(best.value,true);
});

test('summary never claims verified true from unsupported browser field',()=>{
  const p=project(),sig=renderSignature(p);
  const summary=technicalFactSummary(p,{
    width:makeTechnicalEvidence(true,{source:'browser',field:'width',renderSignature:sig}),
    audioStream:makeTechnicalEvidence(true,{source:'browser',field:'audioStream',renderSignature:sig})
  });
  assert.equal(summary.facts.width.verifiedTrue,true);
  assert.equal(summary.facts.audioStream.verifiedTrue,false);
});
