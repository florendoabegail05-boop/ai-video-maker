import test from 'node:test';
import assert from 'node:assert/strict';
import {capabilityDisclosure,capabilityDisclosureRows,safeQualityLabel} from './capability-disclosure.mjs';
import {makeTechnicalEvidence} from './verification-evidence.mjs';
import {renderSignature} from './render-signature.mjs';

function project(){return {id:'p1',revision:1,scenes:[],assets:[]};}

test('configured routes stay separate from output quality proof',()=>{
  const p=project();
  const report={freeOnlyImageWorkflow:true,motionFallback:{enabled:true},tools:{ffmpeg:{available:true}},quality:{photorealisticImage:true,output4k:true}};
  const out=capabilityDisclosure(report,{project:p});
  assert.equal(out.routes.image.verified,true);
  assert.equal(out.routes.video.verified,true);
  assert.equal(out.quality.photorealisticImage.targetPossible,true);
  assert.equal(out.quality.photorealisticImage.verifiedOutput,false);
  assert.equal(out.quality.output4k.targetPossible,true);
  assert.equal(out.quality.output4k.verifiedOutput,false);
});

test('trusted current evidence can verify a quality output claim',()=>{
  const p=project(),signature=renderSignature(p);
  const evidence={fourK:makeTechnicalEvidence(true,{source:'ffprobe',field:'fourK',renderSignature:signature})};
  const out=capabilityDisclosure({quality:{output4k:true}},{project:p,evidence});
  assert.equal(out.quality.output4k.verifiedOutput,true);
});

test('stale evidence cannot support current output claim',()=>{
  const p=project();
  const evidence={fourK:makeTechnicalEvidence(true,{source:'ffprobe',field:'fourK',renderSignature:'old'})};
  const out=capabilityDisclosure({quality:{output4k:true}},{project:p,evidence});
  assert.equal(out.quality.output4k.verifiedOutput,false);
});

test('rows label quality target without pretending output verification',()=>{
  const p=project();
  const rows=capabilityDisclosureRows({quality:{photorealisticImage:true}},{project:p});
  const row=rows.find(item=>item.name==='photorealisticImage');
  assert.equal(row.state,'QUALITY TARGET / NOT OUTPUT-VERIFIED');
});

test('safe label keeps unknown distinct from unavailable',()=>{
  const p=project();
  assert.equal(safeQualityLabel(p,'fourK',null,{targetPossible:true}),'Quality target only — output not verified');
});
