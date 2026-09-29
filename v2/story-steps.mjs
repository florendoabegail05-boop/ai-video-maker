// A local, deterministic reading of explicit story order. No model or provider is called.
const ORDER_WORDS='then|next|after that|finally|tapos|sunod|pagkatapos(?: nito)?|sa huli';
const LIST_MARKER=/^(?:[-*•]\s+|\d{1,2}[.)]\s+)/u;
const LEADING_ORDER=new RegExp(`^(?:${ORDER_WORDS})\\b[,:-]?\\s*`,'iu');
const INLINE_ORDER=new RegExp(`(?:\\s*(?:->|→)\\s*|(?:[,;]?\\s+)\\b(?:${ORDER_WORDS})\\b[,]?:?\\s*)`,'iu');

function cleanStep(value){
  return String(value||'')
    .trim()
    .replace(LIST_MARKER,'')
    .replace(LEADING_ORDER,'')
    .replace(/^[,;\s]+|[,;\s]+$/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

function splitCandidate(value){
  const numbered=String(value||'').split(/\s+(?=\d{1,2}[.)]\s+)/u);
  return numbered.flatMap(part=>part.replace(LIST_MARKER,'')
    .split(/(?<=[.!?])\s+(?=(?:[A-Z\d]|then\b|next\b|after that\b|finally\b|tapos\b|sunod\b|pagkatapos\b|sa huli\b))/iu)
    .flatMap(sentence=>sentence.split(INLINE_ORDER))
  );
}

export function storySteps(prompt){
  const raw=String(prompt||'').replace(/\r\n?/g,'\n').trim();
  if(!raw)return [];
  const lines=raw.split(/\n+/).map(line=>line.trim()).filter(Boolean);
  const explicitList=lines.length>1&&lines.filter(line=>LIST_MARKER.test(line)).length>=2;
  const candidates=explicitList?lines:[lines.join(' ')];
  const steps=candidates.flatMap(splitCandidate).map(cleanStep).filter(Boolean);
  const normalized=raw.replace(/\s+/g,' ').trim();
  return steps.length>1?steps.slice(0,12):[normalized];
}

export function sceneStoryFocus(prompt,index,count){
  const steps=storySteps(prompt);
  if(steps.length<2)return null;
  const start=Math.min(steps.length-1,Math.floor(index*steps.length/count));
  const end=Math.min(steps.length,Math.max(start+1,Math.floor((index+1)*steps.length/count)));
  return {action:steps.slice(start,end).join(' Then '),previous:start>0?steps[start-1]:null,next:end<steps.length?steps[end]:null};
}
