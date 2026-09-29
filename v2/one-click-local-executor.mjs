import * as local from './local-provider.mjs';
import {compileScenePrompt,reusableAsset,selectedProjectAudio,captionsForTimeline} from './core.mjs';
import {validateOneClickDispatch} from './one-click-dispatch-envelope.mjs';
import {buildRoutePlan} from './provider-router.mjs';
import {runTechnicalQc} from './technical-qc.mjs';
import {makeFinalOutputManifest} from './final-output.mjs';
import {machineFinalMediaFacts} from './final-media-facts.mjs';
import {finalVerificationGate} from './final-verification-gate.mjs';

export function bridgeFinalFacts(project,media){
  const rate=media?.video?.fps;
  const fps=typeof rate==='string'&&/^\d+\/\d+$/.test(rate)?(()=>{const [n,d]=rate.split('/').map(Number);return d?n/d:null;})():typeof rate==='number'?rate:null;
  return machineFinalMediaFacts(project,{width:media?.video?.width,height:media?.video?.height,duration:media?.duration,fps,
    audioStream:Object.hasOwn(media||{},'audio')?(media.audio===null?false:media.audio&&typeof media.audio==='object'?true:null):null,
    videoCodec:media?.video?.codec,audioCodec:media?.audio?.codec,container:media?.format,observedAt:new Date().toISOString()},'bridge');
}

// I/O adapter only: scheduling, progress, guards and release decisions remain in
// the existing one-click modules. Every mutation is left to the guarded caller.
export async function executeOneClickLocalJob(getProject,envelope,{output=null,api=local}={}){
  const check=()=>{const p=getProject();const verdict=validateOneClickDispatch(p,envelope);if(!verdict.ok)throw Error(verdict.reason);if(p.costMode!=='FREE ONLY')throw Error('FREE ONLY is required.');return p;};
  let project=check();
  const report=await api.bridgeCapabilities();project=check();
  if(report.mock===true)throw Error('Mock bridge cannot execute creation jobs.');
  const routes=buildRoutePlan(report,{costMode:'FREE ONLY'});
  const type=envelope.jobType;
  if(['image','motion'].includes(type)){
    const route=type==='image'?routes.image:routes.video;
    if(!route.verified||route.kind!==envelope.payload.route)throw Error('Route unavailable or changed; replan required.');
  }
  if(type==='director'||type==='captions')return {ok:true,message:type==='director'?'Using saved scene plan.':'Using saved captions; no transcription claimed.'};
  if(type==='image'||type==='motion'){
    const kind=type==='image'?'image':'video';
    const existing=reusableAsset(project,envelope.sceneId,kind);
    if(existing){await api.inspectLocalMedia(existing.sourcePath);check();return {ok:true,reused:true,message:'Reused existing local media; original preserved.'};}
    const scene=project.scenes.find(s=>s.id===envelope.sceneId);
    const parent=type==='motion'?project.assets.find(a=>a.id===envelope.payload.sourceAssetId):null;
    if(type==='motion'&&(!parent?.sourcePath||parent.sceneId!==scene.id))throw Error('Guarded motion source missing.');
    const result=type==='image'?await api.generateImage(compileScenePrompt(project,scene.id),project.hardwareMode):await api.animateImage(parent.sourcePath,scene.duration,project.hardwareMode);
    project=check();
    if(parent&&project.assets.find(a=>a.id===parent.id)?.sourcePath!==parent.sourcePath)throw Error('Guarded motion source changed.');
    const expectedProvider={'basic-local-still':'fallback','local-comfyui':'comfyui','ffmpeg-camera-motion':'motion-fallback'}[envelope.payload.route];
    if(!expectedProvider||result.provider!==expectedProvider||result.route!==envelope.payload.route)throw Error('Provider switched from the guarded route; result preserved but not accepted.');
    if(!result.blob?.size||!result.sourcePath)throw Error('Generated media bytes or local path missing.');
    return {...result,ok:true,size:result.blob.size,duration:scene.duration,parentAssetId:parent?.id||null};
  }
  if(type==='assemble'){
    const qc=runTechnicalQc(project,{requireLocalClips:true});if(!qc.passed)throw Error(qc.issues.filter(i=>i.severity==='error').map(i=>i.message).join(' '));
    const result=await api.assembleVideo(project.scenes.map(s=>reusableAsset(project,s.id,'video')?.sourcePath),project.scenes.reduce((n,s)=>n+s.duration,0),project.id,{
      musicPath:selectedProjectAudio(project,'music')?.sourcePath,voicePath:selectedProjectAudio(project,'voice')?.sourcePath,
      captions:captionsForTimeline(project),clipDurations:project.scenes.map(s=>s.duration)});
    check();return {ok:true,output:result,message:'Local FFmpeg assembly completed.'};
  }
  if(type==='verify'){
    if(!output?.outputPath)throw Error('Current final output is unavailable. Replan and assemble again.');
    const media=await api.inspectLocalMedia(output.outputPath);project=check();
    const manifest=makeFinalOutputManifest(project,media,{evidenceSource:'bridge'});
    if(!manifest.verified)throw Error(manifest.issues.filter(i=>i.severity==='error').map(i=>i.message).join(' '));
    const factSets=[bridgeFinalFacts(project,media)];
    const gate=finalVerificationGate(project,factSets,{requireFps:true,requireCodecs:true,requireContainer:true,requireAudioStream:!!(selectedProjectAudio(project,'music')||selectedProjectAudio(project,'voice'))});
    if(!gate.passed)throw Error(gate.checks.filter(i=>i.state==='BLOCKED').map(i=>i.message).join(' '));
    return {ok:true,manifest,factSets,media,message:'Final file independently inspected by local FFprobe.'};
  }
  throw Error('Unsupported local job; manual input required.');
}
