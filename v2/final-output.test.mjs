import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedOutput,validateFinalOutput,makeFinalOutputManifest,publishingVerificationPatch} from './final-output.mjs';

const project={id:'p1',revision:4,scenes:[{duration:5},{duration:5},{duration:5}]};

test('expected output derives planned duration',()=>{
  assert.deepEqual(expectedOutput(project),{aspect:'9:16',width:1080,height:1920,fps:30,duration:15});
});

test('verified 1080x1920 output passes deterministic checks',()=>{
  const report=validateFinalOutput(project,{video:{width:1080,height:1920,fps:30},audio:{codec:'aac'},duration:15.1,bytes:5_000_000});
  assert.equal(report.passed,true);
  assert.equal(report.actual.hasAudio,true);
});

test('wrong dimensions and duration fail without pretending quality was checked',()=>{
  const report=validateFinalOutput(project,{video:{width:720,height:1280,fps:24},duration:12,bytes:2_000_000});
  assert.equal(report.passed,false);
  assert.ok(report.issues.some(item=>item.code==='OUTPUT_DIMENSIONS'));
  assert.ok(report.issues.some(item=>item.code==='OUTPUT_DURATION_MISMATCH'));
  assert.ok(!report.issues.some(item=>item.code==='PHOTOREALISM'));
});

test('portable manifest excludes local paths and can patch publishing verification state',()=>{
  const manifest=makeFinalOutputManifest(project,{video:{width:1080,height:1920,fps:30},audio:{codec:'aac'},duration:15,bytes:9_000_000,provider:'ffmpeg',path:'C:/private/final.mp4',url:'http://127.0.0.1/file'});
  const text=JSON.stringify(manifest);
  assert.equal(manifest.verified,true);
  assert.equal(manifest.provider,'ffmpeg');
  assert.doesNotMatch(text,/C:\/private/);
  assert.doesNotMatch(text,/127\.0\.0\.1/);
  const patch=publishingVerificationPatch(manifest);
  assert.equal(patch.finalVideoVerified,true);
  assert.equal(patch.finalOutput.width,1080);
});

test('path-like or URL-like provider values are not copied into portable verification manifests',()=>{
  const base={video:{width:1080,height:1920,fps:30},duration:15,bytes:9_000_000};
  assert.equal(makeFinalOutputManifest(project,{...base,provider:'C:\\Users\\Abe\\ffmpeg.exe'}).provider,null);
  assert.equal(makeFinalOutputManifest(project,{...base,provider:'/usr/local/bin/ffmpeg'}).provider,null);
  assert.equal(makeFinalOutputManifest(project,{...base,provider:'https://private.example.test/tool?token=SECRET'}).provider,null);
  assert.equal(makeFinalOutputManifest(project,{...base,provider:'bridge-local'}).provider,'bridge-local');
});
