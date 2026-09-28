import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalGeneratedMediaPath,generatedMediaBasename} from './local-generated-path-policy.mjs';

test('accepts absolute Windows and POSIX generated-media paths with supported extensions',()=>{
  const win=validateLocalGeneratedMediaPath('C:\\AIVM\\media\\generated\\scene.png','image');
  const posix=validateLocalGeneratedMediaPath('/tmp/aivm/generated/scene.mp4','video');
  assert.equal(win.ok,true);
  assert.equal(win.extension,'.png');
  assert.equal(posix.ok,true);
  assert.equal(posix.extension,'.mp4');
  assert.equal(generatedMediaBasename(posix.path),'scene.mp4');
});

test('rejects relative paths so executor output cannot escape through cwd-relative registration',()=>{
  const out=validateLocalGeneratedMediaPath('generated/scene.png','image');
  assert.equal(out.ok,false);
  assert.equal(out.reason,'relative-generated-media-path-not-allowed');
});

test('rejects parent traversal even inside an absolute-looking path',()=>{
  const win=validateLocalGeneratedMediaPath('C:\\AIVM\\media\\..\\outside.png','image');
  const posix=validateLocalGeneratedMediaPath('/tmp/aivm/../outside.mp4','video');
  assert.equal(win.ok,false);
  assert.equal(win.reason,'generated-media-path-traversal');
  assert.equal(posix.ok,false);
  assert.equal(posix.reason,'generated-media-path-traversal');
});

test('rejects URLs UNC paths and Windows device paths',()=>{
  assert.equal(validateLocalGeneratedMediaPath('https://example.com/a.png','image').reason,'external-or-uri-path-not-allowed');
  assert.equal(validateLocalGeneratedMediaPath('\\\\server\\share\\a.png','image').reason,'network-path-not-allowed');
  assert.equal(validateLocalGeneratedMediaPath('\\\\?\\C:\\AIVM\\media\\a.png','image').reason,'device-path-not-allowed');
});

test('rejects unsupported generated-media extensions and kinds',()=>{
  const image=validateLocalGeneratedMediaPath('C:\\AIVM\\media\\scene.exe','image');
  assert.equal(image.ok,false);
  assert.equal(image.reason,'generated-media-extension-not-allowed');
  const audio=validateLocalGeneratedMediaPath('C:\\AIVM\\media\\voice.wav','audio');
  assert.equal(audio.ok,false);
  assert.equal(audio.reason,'unsupported-generated-media-kind');
});
