import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {draftReadiness} from './readiness.mjs';
import {checkLocalSetup} from './check.mjs';

const ready = () => ({tools:{ffmpeg:{available:true},ffprobe:{available:true}},imageFallback:{enabled:true},motionFallback:{enabled:true}});
test('draft requires both media tools and explains their local configuration', () => {
  const report=ready();report.tools.ffprobe.available=false;
  const result=draftReadiness(report);
  assert.equal(result.ready,false);
  assert.equal(result.issues.length,1);
  assert.match(result.issues[0],/AIVM_FFPROBE/);
  assert.equal(draftReadiness(ready()).ready,true);
});
test('mock and disabled free routes cannot advertise a ready draft', () => {
  const report=ready();report.mock=true;report.imageFallback.enabled=false;report.motionFallback.enabled=false;
  assert.equal(draftReadiness(report).issues.length,3);
  report.mock=false;report.freeOnlyImageWorkflow=true;report.motionFallback.enabled=true;
  assert.equal(draftReadiness(report).ready,true);
});
test('missing capabilities fail closed', () => {
  assert.equal(draftReadiness({}).ready,false);
  assert.equal(draftReadiness({}).issues.length,4);
});
test('CLI checks explicit executable paths without launching providers or writing media', async () => {
  const env={...process.env,AIVM_FFMPEG:fileURLToPath(new URL('./missing tool/ffmpeg.exe',import.meta.url)),AIVM_FFPROBE:fileURLToPath(new URL('./missing tool/ffprobe.exe',import.meta.url)),AIVM_IMAGE_RUNNER:'https://must-not-be-called.invalid'};
  const result=await checkLocalSetup(env);
  assert.equal(result.ready,false);
  assert.equal(result.costMode,'FREE ONLY');
  assert.equal(result.tools.ffmpeg.available,false);
  assert.equal(result.tools.ffprobe.available,false);
  await assert.rejects(promisify(execFile)(process.execPath,[fileURLToPath(new URL('./check.mjs',import.meta.url)),'--json'],{env,windowsHide:true}),error=>{
    assert.equal(error.code,1);
    const output=JSON.parse(error.stdout);
    assert.equal(output.ready,false);
    assert.match(output.issues.join(' '),/AIVM_FFMPEG/);
    return true;
  });
});
test('an executable with the wrong version signature is not accepted as FFmpeg', async () => {
  const result=await checkLocalSetup({...process.env,AIVM_FFMPEG:process.execPath,AIVM_FFPROBE:process.execPath});
  assert.equal(result.ready,false);
  assert.equal(result.tools.ffmpeg.available,false);
});
