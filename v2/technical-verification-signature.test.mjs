import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFinalMediaFacts,machineFinalMediaFacts} from './final-media-facts.mjs';
import {currentTechnicalVerificationStamp,technicalVerificationDescriptor} from './technical-verification-signature.mjs';

function project(){return {
  id:'p1',revision:1,prompt:'x',style:'cinematic',hardwareMode:'light',bible:{character:'',world:'',visualRules:''},
  scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:[]}],assets:[]
};}

test('browser-only technical pass cannot mint a verified approval stamp',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:1000,mimeType:'video/mp4'});
  const stamp=currentTechnicalVerificationStamp(p,[browser]);
  assert.equal(stamp.descriptor.gatePassed,true);
  assert.equal(stamp.descriptor.machineCoreVerified,false);
  assert.equal(stamp.eligible,false);
  assert.equal(stamp.signature,null);
});

test('ffprobe-class core facts create a stable portable stamp',()=>{
  const p=project();
  const first=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',container:'mov,mp4',observedAt:'2026-09-29T00:00:00Z'},'ffprobe');
  const second=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',container:'mov,mp4',observedAt:'2026-09-29T00:05:00Z'},'ffprobe');
  const a=currentTechnicalVerificationStamp(p,[first]);
  const b=currentTechnicalVerificationStamp(p,[second]);
  assert.equal(a.eligible,true);
  assert.match(a.signature,/^tvs1-/);
  assert.equal(a.signature,b.signature);
  assert.equal(JSON.stringify(a).includes('/media/'),false);
});

test('required gate configuration participates in the stamp',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',container:'mov,mp4'},'ffprobe')];
  const base=currentTechnicalVerificationStamp(p,facts);
  const stricter=currentTechnicalVerificationStamp(p,facts,{requireAudioStream:true,requireFps:true,requireCodecs:true,requireContainer:true});
  assert.equal(base.eligible,true);
  assert.equal(stricter.eligible,true);
  assert.notEqual(base.signature,stricter.signature);
});

test('changed trusted measured duration changes the approval evidence stamp',()=>{
  const p=project();
  const a=currentTechnicalVerificationStamp(p,[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5},'ffprobe')]);
  const b=currentTechnicalVerificationStamp(p,[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5.1},'ffprobe')]);
  assert.equal(a.eligible,true);
  assert.equal(b.eligible,true);
  assert.notEqual(a.signature,b.signature);
});

test('descriptor includes only fields required by the configured gate beyond core facts',()=>{
  const p=project();
  const facts=[machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',container:'mov,mp4'},'ffprobe')];
  const base=technicalVerificationDescriptor(p,facts);
  assert.deepEqual(Object.keys(base.selected).sort(),['duration','height','width']);
  const strict=technicalVerificationDescriptor(p,facts,{requireAudioStream:true,requireFps:true,requireCodecs:true,requireContainer:true});
  assert.deepEqual(Object.keys(strict.selected).sort(),['audioStream','container','duration','fps','height','videoCodec','width'].sort());
});
