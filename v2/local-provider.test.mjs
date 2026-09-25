import test from 'node:test';import assert from 'node:assert/strict';import {uniqueExportName} from './local-provider.mjs';
test('each final export gets a distinct safe name',()=>{const first=uniqueExportName('my project/../');const next=uniqueExportName('my project/../');assert.notEqual(first,next);assert.match(first,/^aivm-v2-[a-z0-9-]+\.mp4$/);});
