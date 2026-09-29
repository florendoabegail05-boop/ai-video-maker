import {storySteps} from './story-steps.mjs';

export function promptGuide(prompt){
  const raw=String(prompt??'');
  const text=raw.replace(/\s+/g,' ').trim();
  if(!text){
    return {
      state:'empty',
      stepCount:0,
      message:'Describe the subject, setting, action and outcome. If order matters, write the actions in sequence.'
    };
  }

  // Pass the original line structure to storySteps so numbered/bulleted prompts
  // remain detectable. The guide never rewrites the owner prompt.
  const steps=storySteps(raw);
  if(steps.length>1){
    return {
      state:'sequenced',
      stepCount:steps.length,
      message:`Detected ${steps.length} ordered story steps. The local planner will distribute them across scenes; you can review and edit the scene plan before final production.`
    };
  }

  return {
    state:'descriptive',
    stepCount:1,
    message:'One broad video idea detected. If a specific order matters, use separate numbered/bulleted lines or sequence words such as Then, Next, Tapos, Sunod, Pagkatapos or Finally.'
  };
}
