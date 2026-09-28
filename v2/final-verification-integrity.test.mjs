import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,planScenes} from './core.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {setFinalVerification,finalVerificationStatus,makePublishingPackage} from './publishing.mjs';

function project(){return planScenes(createProject('Integrity test','Integrity'),5);}

test('setFinalVerification rejects a caller-tampered passed manifest whose dimensions no longer match its expected facts',()=>{
  const p=project();
  const manifest=makeFinalOutputManifest(p,{video:{width:1080,height:1920,fps:30},duration:5,bytes:2_000_000,provider:'ffmpeg'});
  assert.equal(manifest.verified,true);
  const tampered={...manifest,actual:{...manifest.actual,width:720,height:1280}};
  assert.throws(()=>setFinalVerification(p,tampered),/internally inconsistent/i);
});

test('setFinalVerification rejects a caller-tampered passed manifest with no verified video or non-positive duration',()=>{
  const p=project();
  const manifest=makeFinalOutputManifest(p,{video:{width:1080,height:1920,fps:30},duration:5,bytes:2_000_000});
  assert.throws(()=>setFinalVerification(p,{...manifest,actual:{...manifest.actual,hasVideo:false}}),/internally inconsistent/i);
  assert.throws(()=>setFinalVerification(p,{...manifest,actual:{...manifest.actual,duration:0}}),/internally inconsistent/i);
});

test('a historical current-signature snapshot with inconsistent facts is no longer exported as verified',()=>{
  let p=project();
  const manifest=makeFinalOutputManifest(p,{video:{width:1080,height:1920,fps:30},duration:5,bytes:2_000_000,provider:'ffmpeg'});
  p=setFinalVerification(p,manifest);
  p={...p,publishing:{...p.publishing,finalVerification:{...p.publishing.finalVerification,actual:{...p.publishing.finalVerification.actual,width:720}}}};
  const status=finalVerificationStatus(p);
  const pack=makePublishingPackage(p);
  assert.equal(status.fresh,false);
  assert.equal(status.reason,'verification-facts-inconsistent');
  assert.equal(pack.finalVideoVerified,false);
  assert.equal(pack.finalOutput,null);
  assert.match(pack.warnings.join(' '),/inconsistent/i);
});
