import {promises as fsp} from 'node:fs';

const CHARACTER_MARKERS=['AIVM_CHARACTER_REFERENCE','character_reference','characterReference'];
const WORLD_MARKERS=['AIVM_WORLD_REFERENCE','world_reference','worldReference'];

function includesMarker(text,markers){return markers.some(marker=>text.includes(marker));}

export function detectWorkflowReferenceCapabilities(workflowText=''){
  const text=String(workflowText||'');
  return {
    supportsCharacterReferences:includesMarker(text,CHARACTER_MARKERS),
    supportsWorldReferences:includesMarker(text,WORLD_MARKERS),
    declarationRequired:true
  };
}

export async function workflowReferenceCapabilities(workflowFile=''){
  if(!workflowFile)return {supportsCharacterReferences:false,supportsWorldReferences:false,declarationRequired:true,workflowReadable:false};
  try{
    const text=await fsp.readFile(workflowFile,'utf8');
    return {...detectWorkflowReferenceCapabilities(text),workflowReadable:true};
  }catch{
    return {supportsCharacterReferences:false,supportsWorldReferences:false,declarationRequired:true,workflowReadable:false};
  }
}

export function referencePayloadAllowed(capabilities={},references={}){
  return {
    character:capabilities.supportsCharacterReferences===true?Array.isArray(references.character)?references.character:[]:[],
    world:capabilities.supportsWorldReferences===true?Array.isArray(references.world)?references.world:[]:[]
  };
}

// A marker is a declaration, not a tested node mapping. Until an actual local
// workflow is inspected, report the declaration but never enable path forwarding.
export async function liveWorkflowReferenceCapabilities(file='', verified=false){
  const declared=await workflowReferenceCapabilities(verified?file:'');
  return {declaredCharacterReferences:declared.supportsCharacterReferences,
    declaredWorldReferences:declared.supportsWorldReferences,
    workflowReadable:declared.workflowReadable,
    supportsCharacterReferences:false,supportsWorldReferences:false,
    referenceForwardingEnabled:false,
    referenceReason:verified?'Reference node mapping has not been locally verified.':'No verified local image workflow is configured.'};
}
