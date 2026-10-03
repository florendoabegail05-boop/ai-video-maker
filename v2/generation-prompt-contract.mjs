import {sceneContinuityState} from './continuity.mjs';
import {referenceSummary} from './references.mjs';

const KNOWN_STYLES=new Map([
  ['photorealistic','photorealistic'],
  ['cinematic','cinematic'],
  ['3d animation','3d-animation'],
  ['3d-animation','3d-animation'],
  ['storybook','storybook'],
  ['fantasy','fantasy'],
  ['sci-fi','sci-fi'],
  ['sci fi','sci-fi'],
  ['surreal','surreal'],
  ['custom','custom']
]);

const NEGATIVE_BASE=[
  'unrequested identity drift',
  'age drift',
  'wardrobe drift',
  'inconsistent body proportions',
  'extra or missing limbs',
  'malformed anatomy',
  'warped hands',
  'duplicate subjects',
  'unrequested floating objects',
  'inconsistent environment layout',
  'lighting discontinuity',
  'unexplained object jumps',
  'text artifacts',
  'watermark artifacts',
  'flicker',
  'temporal morphing'
];

function clean(value,max=6000){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function slug(value){
  return clean(value,120).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64);
}

export function normalizeGenerationStyle(style){
  const raw=clean(style,120).toLowerCase();
  if(KNOWN_STYLES.has(raw))return KNOWN_STYLES.get(raw);
  const token=slug(raw);
  return token?`custom-${token}`:'custom';
}

export function buildSceneGenerationContract(project,sceneId){
  if(!project?.id)throw Error('Project is required.');
  const scene=(project.scenes||[]).find(item=>item.id===sceneId);
  if(!scene)throw Error('Scene missing.');
  const continuity=sceneContinuityState(project,sceneId);
  const refs=referenceSummary(project);
  const characterReferenceAssetIds=refs.characters.map(item=>item.id);
  const worldReferenceAssetIds=refs.worlds.map(item=>item.id);
  const referenceImageAssetIds=[...new Set([...characterReferenceAssetIds,...worldReferenceAssetIds])];
  const character=clean(project.bible?.character,1200);
  const world=clean(project.bible?.world,1200);
  const visualRules=clean(project.bible?.visualRules,1200);
  const projectPrompt=clean(project.prompt,4000);
  const scenePrompt=clean(scene.prompt,6000);
  const action=clean(scene.beat||scene.prompt||project.prompt,1200);

  return {
    schema:1,
    kind:'aivm-v2-generation-prompt-contract',
    projectId:project.id,
    sceneId:scene.id,
    sceneOrder:Number(scene.order)||0,
    subject:character||projectPrompt,
    action,
    setting:world||projectPrompt,
    shot:clean(scene.direction?.shot,500),
    camera:clean(scene.direction?.camera,500),
    lighting:visualRules||'Preserve the established lighting direction and exposure across connected scenes.',
    style:normalizeGenerationStyle(project.style),
    continuity:{
      previousSceneId:continuity.previousSceneId,
      previousBeat:continuity.previousBeat,
      currentBeat:continuity.currentBeat,
      instruction:continuity.instruction,
      characterAnchor:continuity.anchors.character,
      worldAnchor:continuity.anchors.world,
      visualAnchor:continuity.anchors.visualRules
    },
    negativePrompt:NEGATIVE_BASE.join(', '),
    referenceImageAssetIds,
    characterReferenceAssetIds,
    worldReferenceAssetIds,
    referenceMode:'metadata-only',
    sourcePrompt:scenePrompt||projectPrompt,
    note:'Backend-neutral generation intent only. Reference asset IDs identify approved project media but do not claim that the active provider can forward reference-image bytes.'
  };
}
