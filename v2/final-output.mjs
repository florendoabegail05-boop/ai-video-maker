function number(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function clean(value,max=240){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max);}

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
    fps:number(video.fps||media?.fps),
    duration:number(media?.duration),
    bytes:number(media?.bytes),
    hasVideo:!!media?.video,
    hasAudio:!!media?.audio
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
  return {
    schema:1,
    kind:'aivm-v2-final-output-manifest',
    projectId:project?.id||null,
    projectRevision:Number(project?.revision)||0,
    verifiedAt:new Date().toISOString(),
    verified:report.passed,
    expected:report.expected,
    actual:report.actual,
    issues:report.issues,
    provider:clean(media?.provider||media?.encoder||'',120)||null,
    note:'Portable verification metadata only. Local file paths, media bytes and bridge URLs are intentionally excluded.'
  };
}

export function publishingVerificationPatch(manifest){
  if(!manifest||manifest.kind!=='aivm-v2-final-output-manifest')throw Error('Final-output manifest is invalid.');
  return {
    finalVideoVerified:manifest.verified===true,
    finalOutput:{
      verifiedAt:manifest.verifiedAt,
      width:manifest.actual?.width??null,
      height:manifest.actual?.height??null,
      duration:manifest.actual?.duration??null,
      fps:manifest.actual?.fps??null,
      hasAudio:manifest.actual?.hasAudio===true,
      issues:(manifest.issues||[]).map(item=>({code:item.code,severity:item.severity,message:item.message}))
    }
  };
}
