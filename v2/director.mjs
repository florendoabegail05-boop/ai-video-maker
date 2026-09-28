const STYLE_PROFILES={
  photorealistic:[
    'Aim for real-footage realism: natural skin and materials, physically plausible lighting, shadows, reflections and contact points.',
    'Use believable camera optics, exposure and depth of field; avoid plastic skin, warped anatomy, floating objects and impossible motion unless explicitly requested.'
  ],
  cinematic:[
    'Use cinematic composition, motivated lighting, controlled depth of field and coherent camera movement.',
    'Keep anatomy, materials, shadows and object interactions physically believable unless the story intentionally breaks reality.'
  ],
  '3D animation':[
    'Use polished stylized 3D animation with stable character proportions, readable silhouettes and consistent materials.',
    'Motion should feel intentional and smooth, with grounded contact, weight and clean facial expressions.'
  ],
  storybook:[
    'Use a cohesive illustrated storybook look with stable character design, palette and recurring environment details.',
    'Preserve readable staging and emotional expressions from shot to shot.'
  ],
  fantasy:[
    'Allow magical and impossible elements while keeping the world internally consistent.',
    'Magic may bend normal physics, but lighting, shadows, scale, contact and cause-and-effect should remain visually coherent.'
  ],
  'sci-fi':[
    'Use advanced futuristic design with consistent technology language, scale and materials.',
    'Impossible technology is allowed, but scene geometry, lighting, interaction and motion must remain coherent.'
  ],
  surreal:[
    'Allow dreamlike, impossible and out-of-this-world imagery without forcing ordinary realism.',
    'Keep the chosen impossible rules consistent within the scene and across cuts so surrealism feels intentional rather than broken.'
  ],
  custom:[
    'Follow the user-defined visual direction exactly. It may be realistic, stylized or completely impossible.',
    'Preserve internal consistency, subject identity and scene logic unless the prompt explicitly asks for a deliberate violation.'
  ]
};

const GLOBAL_TARGETS=[
  'PROMPT ACCURACY: include every explicit subject, action, environment and important object from the scene; do not silently replace requested details.',
  'CHARACTER CONSISTENCY: preserve identity, age, body proportions, wardrobe, hairstyle and distinctive features across scenes.',
  'CONTINUITY: preserve recurring environment layout, important objects, lighting direction and story state from prior scenes unless the story changes them.',
  'MOTION QUALITY: prefer stable temporal motion, natural acceleration/deceleration and clean camera movement; avoid flicker, identity drift, morphing and unexplained object jumps.',
  'FACIAL PERFORMANCE: expressions should match the beat. If visible speech is present, keep mouth motion suitable for later lip-sync rather than random exaggerated movement.',
  'AUDIO INTENT: preserve clear space for dialogue, ambience, sound effects and music decisions even when the current provider cannot generate native audio.',
  'QUALITY HONESTY: requested quality is a target only; do not claim photorealism, native audio, lip-sync, 4K or AI motion unless the active provider actually supports and verifies it.'
];

const SHOTS=['wide establishing shot','medium character shot','medium action shot','closer action shot','reaction / result shot','closing payoff shot'];
const CAMERAS=['mostly locked camera with subtle natural drift','gentle push-in','controlled lateral follow','short motivated tracking move','subtle push-in or hold for expression','clean settling move designed for a loopable ending'];
const AUDIO=['establish ambience and location tone','introduce a clear story cue','support the main action with restrained SFX','build action with coherent ambience and SFX','leave space for expression, dialogue or reaction','resolve with a clean final sound cue or musical button'];

function clean(value,max=1200){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function sceneDirection(index,count){
  const slot=Math.min(5,Math.floor(index*6/Math.max(1,count)));
  return {
    shot:SHOTS[slot],
    camera:CAMERAS[slot],
    motion:'Keep subject and camera motion simple enough to remain temporally stable; prioritize one readable primary action.',
    continuityGoal:index===0?'Establish identity, wardrobe, key props, environment layout and lighting anchors.':'Continue the prior scene state unless the story explicitly changes it.',
    audioIntent:AUDIO[slot]
  };
}

export function directorBrief(project,sceneId){
  const scenes=Array.isArray(project?.scenes)?project.scenes:[];
  const index=scenes.findIndex(scene=>scene.id===sceneId);
  if(index<0)throw Error('Scene missing.');
  const scene=scenes[index];
  const style=STYLE_PROFILES[project.style]?project.style:'custom';
  const previous=index>0?scenes[index-1]:null;
  const next=index<scenes.length-1?scenes[index+1]:null;
  const continuity=[];
  if(!previous)continuity.push('Opening scene: establish stable visual anchors for later scenes.');
  if(previous)continuity.push(`Previous beat: ${clean(previous.beat||previous.prompt,500)}`);
  if(next)continuity.push(`Next beat: ${clean(next.beat||next.prompt,500)}`);
  const direction=scene.direction||sceneDirection(index,scenes.length);
  return [
    'AI DIRECTOR BRIEF',
    `Visual mode: ${style}`,
    ...STYLE_PROFILES[style],
    `SHOT: ${direction.shot}`,
    `CAMERA: ${direction.camera}`,
    `PRIMARY MOTION: ${direction.motion}`,
    `CONTINUITY GOAL: ${direction.continuityGoal}`,
    `AUDIO INTENT: ${direction.audioIntent}`,
    ...GLOBAL_TARGETS,
    continuity.length?`STORY HANDOFF: ${continuity.join(' | ')}`:'STORY HANDOFF: opening scene; establish stable visual anchors for later scenes.',
    project.hardwareMode==='light'
      ? 'RENDER STRATEGY: favor efficient draft composition and preserve high-detail intent for later capable providers; do not fake unavailable resolution or effects.'
      : project.hardwareMode==='strong'
        ? 'RENDER STRATEGY: richer detail is acceptable when the active provider and hardware report support it.'
        : 'RENDER STRATEGY: balance detail and speed; capability checks remain authoritative.'
  ].join('\n');
}

export function qualityTargets(){return [...GLOBAL_TARGETS];}
