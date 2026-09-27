import test from 'node:test';
import assert from 'node:assert/strict';
import {exportPreset,listExportPresets,validateExportCapability,upscaleLabel,fourKAvailability} from './export-presets.mjs';

test('three future aspect presets are defined without enabling unverified routes',()=>{
  assert.deepEqual(listExportPresets().map(p=>p.id),['9:16','16:9','1:1']);
  assert.equal(exportPreset('9:16').width,1080);
  assert.equal(validateExportCapability('16:9',{}).enabled,false);
  assert.equal(validateExportCapability('1:1',{}).enabled,false);
});

test('verified capability may enable non-default aspect route',()=>{
  assert.equal(validateExportCapability('16:9',{landscape1080:true}).enabled,true);
  assert.equal(validateExportCapability('1:1',{square1080:true}).enabled,true);
});

test('dimension scaling is not mislabeled as detail enhancement',()=>{
  assert.match(upscaleLabel({sourceWidth:512,sourceHeight:512,targetWidth:2048,targetHeight:2048}),/does not create missing visual detail/i);
  assert.match(upscaleLabel({sourceWidth:512,sourceHeight:512,targetWidth:2048,targetHeight:2048,detailEnhancing:true}),/Detail-enhancing/);
});

test('4K stays unavailable unless both route and upscale are verified',()=>{
  assert.equal(fourKAvailability({quality:{output4k:true}}).enabled,false);
  assert.equal(fourKAvailability({quality:{output4k:true},upscale:{verified:true}}).enabled,true);
});

test('unknown preset fails',()=>assert.throws(()=>exportPreset('4:3'),/Unsupported/));
