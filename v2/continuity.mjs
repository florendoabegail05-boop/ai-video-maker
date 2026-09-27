function clean(value,max=500){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function sceneContinuityState(project,sceneId){
  const scenes=Array.isArray(project?.scenes)?project.scenes:[];
  const index=scenes.findIndex(scene=>scene.id===sceneId);
  if(index<0)throw Error('Scene missing.');
  const current=scenes[index];
  const previous=index>0?scenes[index-1]:null;
  const anchors={
    character:clean(project?.bible?.character,700),
    world:clean(project?.bible?.world,700),
    visualRules:clean(project?.bible?.visualRules,700)
  };
  return {
    sceneId,
    order:current.order??index+1,
    previousSceneId:previous?.id||null,
    previousBeat:clean(previous?.beat||previous?.prompt,500),
    currentBeat:clean(current.beat||current.prompt,500),
    anchors,
    instruction:previous
      ?'Carry forward identity, wardrobe, age, important props, environment layout, lighting direction and story state unless this scene explicitly changes them.'
      :'Establish stable identity, wardrobe, age, prop, environment and lighting anchors for later scenes.'
  };
}

export function continuityPrompt(project,sceneId){
  const state=sceneContinuityState(project,sceneId);
  const lines=['CONTINUITY STATE'];
  if(state.previousBeat)lines.push(`FROM PRIOR SCENE: ${state.previousBeat}`);
  lines.push(`CURRENT STORY STATE: ${state.currentBeat}`);
  if(state.anchors.character)lines.push(`CHARACTER ANCHOR: ${state.anchors.character}`);
  if(state.anchors.world)lines.push(`WORLD ANCHOR: ${state.anchors.world}`);
  if(state.anchors.visualRules)lines.push(`VISUAL ANCHOR: ${state.anchors.visualRules}`);
  lines.push(`CONTINUITY RULE: ${state.instruction}`);
  return lines.join('\n');
}

export function continuityReport(project){
  return (project?.scenes||[]).map(scene=>sceneContinuityState(project,scene.id));
}
