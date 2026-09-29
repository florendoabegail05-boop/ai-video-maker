import {renderSignature} from './render-signature.mjs';
import {browserFinalMediaFacts,machineFinalMediaFacts} from './final-media-facts.mjs';

function number(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function frameRate(value){if(typeof value==='string'&&/^\d+\/\d+$/.test(value)){const [n,d]=value.split('/').map(Number);return d?n/d:null;}return number(value);}
function clean(value,max=240){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}
function portableProvider(value){
  const provider=clean(value,120);
  if(!provider)return null;
  if(/[\\/]/.test(provider))return null;
  if(/^(?:[a-zA-Z]:|[a-z][a-z0-9+.-]*:)/i.test(provider))return null;
  return provider;
}

export function expectedOutput(project,{aspect='9:16',width=1080,height=1920,fps=30}={}){
  const duration=(project?.scenes||[]).reduce((sum,scene)=>sum+(Number(scene.duration)||0),0);
  return {aspect,width,height,fps,duration};
}

export function validateFinalOutput(project,media,{aspect='9:16',width=1080,height=1920,fps=30,durationTolerance=0.35}={}){
  const expected=expectedOutput(project,{aspect,width,height,fps});
  const issues=[];
  const video=media?.video||{};
  const actual={
    width:number(video.width),
    height:number(video.height),
    fps:frameRate(video.fps??media?.fps),
    duration:number(media?.duration),
    bytes:number(media?.bytes),
    hasVideo:!!media?.video,
    hasAudio:media?.audio==null?null:!!media.audio
  };
  if(!actual.hasVideo)issues.push({code:'NO_VIDEO_STREAM',severity:'error',message:'Final output has no verified video stream.'});
  if(actual.width!==expected.width||actual.height!==expected.height)issues.push({code:'OUTPUT_DIMENSIONS',severity:'error',message:`Expected ${expected.width}×${expected.height}, got ${actual.width||'?'}×${actual.height||'?'}.`});
  if(actual.duration===null)issues.push({code:'OUTPUT_DURATION_UNKNOWN',severity:'error',message:'Final output duration was not verified.'});
  else if(Math.abs(actual.duration-expected.duration)>durationTolerance)issues.push({code:'OUTPUT_DURATION_MISMATCH',severity:'error',message:`Expected about ${expected.duration.toFixed(2)}s, got ${actual.duration.toFixed(2)}s.`});
  if(actual.fps!==null&&actual.fps<20)issues.push({code:'LOW_FPS',severity:'warning',message:`Verified frame rate is ${actual.fps.toFixed(2)} fps.`});
  if(actual.bytes!==null&&actual.bytes<1024)issues.push({code:'OUTPUT_TOO_SMALL',severity:'error',message:'Final output file is unexpectedly small.'});
  return {passed:issues.every(item=>item.severity!=='error'),expected,actual,issues};
}

export function makeFinalOutputManifest(project,media,options={}){
  const report=validateFinalOutput(project,media,options);
  const machine=['bridge','ffprobe'].includes(options.evidenceSource);
  const factSets=[machine?machineFinalMediaFacts(project,{width:report.actual.width,height:report.actual.height,duration:report.actual.duration,fps:report.actual.fps,
    audioStream:Object.hasOwn(media||{},'audio')?(media.audio===null?false:typeof media.audio==='object'?true:null):null,
    videoCodec:media.video?.codec,audioCodec:media.audio?.codec,container:media.format},options.evidenceSource):
    browserFinalMediaFacts(project,{width:report.actual.width,height:report.actual.height,duration:report.actual.duration,fileSize:report.actual.bytes})];
  return {
    schema:1,
    kind:'aivm-v2-final-output-manifest',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    renderSignature:renderSignature(project),
    verifiedAt:new Date().toISOString(),
    verified:report.passed,
    expected:report.expected,
    actual:{...report.actual,fps:machine?report.actual.fps:null,hasAudio:machine?factSets[0].raw.audioStream:null},
    factSets,
    issues:report.issues,
    provider:portableProvider(media?.provider||media?.encoder||''),
    note:'Portable verification metadata only. Local file paths, media bytes and bridge URLs are intentionally excluded.'
  };
}

export function publishingVerificationPatch(manifest){
  if(!manifest||manifest.kind!=='aivm-v2-final-output-manifest')throw Error('Final-output manifest is invalid.');
  return {
    finalVideoVerified:manifest.verified===true,
    finalOutput:{
      verifiedAt:manifest.verifiedAt,
      renderSignature:manifest.renderSignature||null,
      width:manifest.actual?.width??null,
      height:manifest.actual?.height??null,
      duration:manifest.actual?.duration??null,
      fps:manifest.actual?.fps??null,
      hasAudio:manifest.actual?.hasAudio??null,
      issues:(manifest.issues||[]).map(item=>({code:item.code,severity:item.severity,message:item.message}))
    }
  };
}
