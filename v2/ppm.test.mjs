import test from 'node:test';import assert from 'node:assert/strict';import {decodePPM} from './ppm.mjs';
test('decodes binary pixels even when first pixel begins with whitespace byte',()=>{const h=new TextEncoder().encode('P6\n2 1\n255\n');const b=new Uint8Array([...h,10,20,30,255,0,1]);const x=decodePPM(b);assert.deepEqual([...x.rgba],[10,20,30,255,255,0,1,255]);});
test('rejects oversized and truncated input',()=>{assert.throws(()=>decodePPM(new TextEncoder().encode('P6\n99999 99999\n255\n')));assert.throws(()=>decodePPM(new TextEncoder().encode('P6\n1 1\n255\n')));});
