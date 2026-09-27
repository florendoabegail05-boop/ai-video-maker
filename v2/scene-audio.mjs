function clean(value,max){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

export function normalizeSceneAudio(values={}){
  return {
    dialogue:clean(values.dialogue,500),
    voiceId:clean(values.voiceId,80),
    ambience:clean(values.ambience,300),
    sfx:clean(values.sfx,300),
    musicCue:clean(values.musicCue,300)
  };
}

export function setSceneAudio(project,sceneId,values={}){
  if(!project?.scenes?.some(scene=>scene.id===sceneId))throw Error('Scene missing.');
  const audio=normalizeSceneAudio(values);
  return {...project,scenes:project.scenes.map(scene=>scene.id===sceneId?{...scene,...audio}:scene)};
}

export function sceneAudioSummary(project,sceneId){
  const scene=project?.scenes?.find(item=>item.id===sceneId);
  if(!scene)throw Error('Scene missing.');
  const audio=normalizeSceneAudio(scene);
  return {
    ...audio,
    hasDialogue:!!audio.dialogue,
    hasAudioCue:!!(audio.ambience||audio.sfx||audio.musicCue),
    needsVoiceAssignment:!!audio.dialogue&&!audio.voiceId
  };
}

export function projectAudioPlan(project){
  return (project?.scenes||[]).map(scene=>({sceneId:scene.id,order:scene.order,...sceneAudioSummary(project,scene.id)}));
}

export function generatedAudioAvailability(capabilities={}){
  return {
    voice:capabilities?.freeOnlyVoiceWorkflow===true,
    ambience:capabilities?.freeOnlyAmbienceWorkflow===true,
    sfx:capabilities?.freeOnlySfxWorkflow===true,
    music:capabilities?.freeOnlyMusicWorkflow===true,
    lipSync:capabilities?.freeOnlyLipSyncWorkflow===true,
    note:'Manual local audio import remains available even when generated-audio routes are unavailable.'
  };
}
