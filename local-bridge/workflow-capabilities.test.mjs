import test from 'node:test';
import assert from 'node:assert/strict';
import {detectWorkflowReferenceCapabilities,referencePayloadAllowed} from './workflow-capabilities.mjs';

test('reference support is opt-in only',()=>{
  assert.deepEqual(detectWorkflowReferenceCapabilities('{"nodes":[]}'),{
    supportsCharacterReferences:false,
    supportsWorldReferences:false,
    declarationRequired:true
  });
});

test('explicit workflow markers enable only declared reference roles',()=>{
  const caps=detectWorkflowReferenceCapabilities('{"note":"AIVM_CHARACTER_REFERENCE"}');
  assert.equal(caps.supportsCharacterReferences,true);
  assert.equal(caps.supportsWorldReferences,false);
});

test('reference payload strips unsupported roles',()=>{
  const result=referencePayloadAllowed({supportsCharacterReferences:true,supportsWorldReferences:false},{character:['c.png'],world:['w.png']});
  assert.deepEqual(result,{character:['c.png'],world:[]});
});
