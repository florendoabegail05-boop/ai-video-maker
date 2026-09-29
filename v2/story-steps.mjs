// A local, deterministic reading of explicit story order. No model or provider is called.
export function storySteps(prompt){
  const text=String(prompt||'').replace(/\s+/g,' ').trim();
  if(!text)return [];
  // Split only at clear sentence or sequence boundaries; commas inside a visual
  // description stay together so a character's attributes are not scattered.
  const sentences=text.split(/(?<=[.!?])\s+(?=[A-Z\d])/u);
  const steps=sentences.flatMap(sentence=>sentence.split(/(?:[,;]\s*|\s+)\b(?:then|next|after that|finally)\b[,]?:?\s*/iu))
    .map(step=>step.trim().replace(/^[,;\s]+|[,;\s]+$/g,''))
    .filter(Boolean);
  return steps.length>1?steps.slice(0,12):[text];
}

export function sceneStoryFocus(prompt,index,count){
  const steps=storySteps(prompt);
  if(steps.length<2)return null;
  const start=Math.min(steps.length-1,Math.floor(index*steps.length/count));
  const end=Math.min(steps.length,Math.max(start+1,Math.floor((index+1)*steps.length/count)));
  return {action:steps.slice(start,end).join(' Then '),previous:start>0?steps[start-1]:null,next:end<steps.length?steps[end]:null};
}
