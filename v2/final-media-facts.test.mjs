import test from 'node:test';
import assert from 'node:assert/strict';
import {browserFinalMediaFacts,machineFinalMediaFacts,reconcileFinalMediaFacts} from './final-media-facts.mjs';

function project(){return {id:'p1',revision:1,scenes:[{id:'s1',order:1,duration:5,prompt:'x',caption:'',assetIds:[]}],assets:[]};}

test('browser facts do not invent stream or fps evidence',()=>{
  const p=project();
  const facts=browserFinalMediaFacts(p,{width:1080,height:1920,duration:5,fileSize:123,mimeType:'video/mp4'});
  assert.equal(facts.evidence.width.trusted,true);
  assert.equal(facts.evidence.height.trusted,true);
  assert.equal(facts.evidence.audioStream,undefined);
  assert.equal(facts.evidence.fps,undefined);
});

test('ffprobe facts can verify audio stream, fps and target resolution',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:true,videoCodec:'h264',audioCodec:'aac',container:'mov,mp4'},'ffprobe');
  assert.equal(facts.evidence.audioStream.value,true);
  assert.equal(facts.evidence.audioStream.trusted,true);
  assert.equal(facts.evidence.fps.value,true);
  assert.equal(facts.evidence.resolution1080x1920.value,true);
  assert.equal(facts.evidence.resolution2160x3840.value,false);
});

test('audio stream does not become native audio claim',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{audioStream:true},'ffprobe');
  assert.equal(facts.evidence.nativeAudio,undefined);
  assert.match(facts.note,/does not prove native generated audio/i);
});

test('reconciliation prefers machine facts and surfaces contradictions',()=>{
  const p=project();
  const browser=browserFinalMediaFacts(p,{width:720,height:1280,duration:5});
  const machine=machineFinalMediaFacts(p,{width:1080,height:1920,duration:5,fps:30,audioStream:false},'ffprobe');
  const out=reconcileFinalMediaFacts(p,browser,machine);
  assert.equal(out.selected.width.source,'ffprobe');
  assert.equal(out.selected.audioStream.value,false);
  assert.equal(out.hasContradictions,true);
  assert.ok(out.contradictions.some(item=>item.field==='width'));
  assert.equal(out.publishAuthorized,false);
});

test('stale render-bound fact sets are ignored',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,audioStream:true},'ffprobe');
  const changed={...p,scenes:[{...p.scenes[0],duration:6}]};
  const out=reconcileFinalMediaFacts(changed,facts);
  assert.equal(out.selected.audioStream,null);
  assert.equal(out.selected.width,null);
});

test('portable reconciliation excludes local paths',()=>{
  const p=project();
  const facts=machineFinalMediaFacts(p,{width:1080,height:1920,audioStream:true,sourcePath:'C:\\secret\\video.mp4'},'bridge');
  const out=reconcileFinalMediaFacts(p,facts);
  const json=JSON.stringify(out);
  assert.equal(json.includes('C:\\secret'),false);
  assert.equal(out.portable,true);
});
