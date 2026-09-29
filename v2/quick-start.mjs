import {createProject,planScenes,revise} from './core.mjs';

const HARDWARE_MODES=new Set(['light','balanced','strong']);

function clean(value,max=1200){return String(value??'').trim().slice(0,max);}
function normalizedBible(values={}){
  const bible={
    character:clean(values.character,1200),
    world:clean(values.world,1200),
    visualRules:clean(values.visualRules,1200)
  };
  return bible;
}

function durationSeconds(value){
  const seconds=Number(value);
  if(!Number.isInteger(seconds)||seconds<5||seconds>60)throw Error('Choose a duration from 5 to 60 seconds.');
  return seconds;
}

export function quickStartNeedsPlanning(current,prompt){
  const idea=String(prompt??'').trim();
  if(!idea)throw Error('Enter a video idea.');
  return !current||current.prompt!==idea||!Array.isArray(current.scenes)||current.scenes.length===0;
}

export function prepareOnePromptProject({
  current=null,
  prompt='',
  name='',
  style='custom',
  hardwareMode='light',
  seconds=30,
  bible={}
}={}){
  const idea=String(prompt??'').trim();
  if(!idea)throw Error('Enter a video idea.');
  if(idea.length>10000)throw Error('Video idea is too long.');
  const duration=durationSeconds(seconds);
  const visualStyle=clean(style,80)||'custom';
  const hardware=HARDWARE_MODES.has(hardwareMode)?hardwareMode:'light';
  const references=normalizedBible(bible);
  const samePrompt=current?.prompt===idea;

  // Starting production on an already-planned project must never rebuild the plan
  // or replace media just because the owner pressed the one-click button again.
  if(!quickStartNeedsPlanning(current,idea)){
    return {
      project:current,
      created:false,
      planned:false,
      reusedPlan:true,
      reason:'existing-plan-preserved'
    };
  }

  let base;
  let created=false;
  if(samePrompt&&current){
    if((current.assets||[]).length>0)throw Error('This project has assets but no scene plan. Repair or create the scene plan before one-click production.');
    base=revise(current,{
      ...current,
      name:clean(name,80)||current.name,
      style:visualStyle,
      hardwareMode:hardware,
      bible:references
    });
  }else{
    base=createProject(idea,clean(name,80)||'Untitled project');
    base={...base,style:visualStyle,hardwareMode:hardware,bible:references};
    created=true;
  }

  const project=planScenes(base,duration);
  return {
    project,
    created,
    planned:true,
    reusedPlan:false,
    reason:created?'new-project-planned':'empty-project-planned'
  };
}
