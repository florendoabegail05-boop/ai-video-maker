const PAID_MODES=new Set(['LOWEST COST','FASTEST','BEST QUALITY']);

export function normalizeCostMode(mode){
  const value=String(mode||'FREE ONLY').trim().toUpperCase();
  if(value==='FREE ONLY')return 'FREE ONLY';
  if(PAID_MODES.has(value))return value;
  throw Error('Unknown cost mode.');
}

export function assertOwnerApprovedCostMode(mode,{ownerApproved=false}={}){
  const normalized=normalizeCostMode(mode);
  if(normalized!=='FREE ONLY'&&!ownerApproved)throw Error('Paid-capable mode requires explicit owner approval.');
  return normalized;
}

export function imageRoute(report,{costMode='FREE ONLY',ownerApproved=false}={}){
  const mode=assertOwnerApprovedCostMode(costMode,{ownerApproved});
  if(mode!=='FREE ONLY')return {kind:'future-provider',reason:'Paid-capable provider routing is not connected yet.',verified:false};
  if(report?.freeOnlyImageWorkflow===true)return {kind:'local-comfyui',reason:'Verified loopback FREE ONLY image workflow is available.',verified:true};
  if(report?.imageFallback?.enabled===true)return {kind:'basic-local-still',reason:'Using the built-in local draft still fallback.',verified:true};
  return {kind:'unavailable',reason:'No verified FREE ONLY image route is available.',verified:false};
}

export function videoRoute(report,{costMode='FREE ONLY',ownerApproved=false}={}){
  const mode=assertOwnerApprovedCostMode(costMode,{ownerApproved});
  if(mode!=='FREE ONLY')return {kind:'future-provider',reason:'Paid-capable provider routing is not connected yet.',verified:false};
  const ffmpeg=report?.tools?.ffmpeg?.available===true;
  if(report?.motionFallback?.enabled===true&&ffmpeg)return {kind:'ffmpeg-camera-motion',reason:'Using local FFmpeg draft motion.',verified:true};
  return {kind:'unavailable',reason:'No verified FREE ONLY video route is available.',verified:false};
}

export function audioRoutes(report,{costMode='FREE ONLY',ownerApproved=false}={}){
  assertOwnerApprovedCostMode(costMode,{ownerApproved});
  return {
    voice: report?.freeOnlyVoiceWorkflow===true?{kind:'local-voice',verified:true}:{kind:'import-only',verified:false},
    music: report?.freeOnlyMusicWorkflow===true?{kind:'local-music',verified:true}:{kind:'import-only',verified:false},
    sfx: report?.freeOnlySfxWorkflow===true?{kind:'local-sfx',verified:true}:{kind:'import-only',verified:false},
    lipSync: report?.freeOnlyLipSyncWorkflow===true?{kind:'local-lipsync',verified:true}:{kind:'unavailable',verified:false}
  };
}

export function buildRoutePlan(report,options={}){
  const costMode=assertOwnerApprovedCostMode(options.costMode||'FREE ONLY',options);
  return {
    costMode,
    image:imageRoute(report,{...options,costMode}),
    video:videoRoute(report,{...options,costMode}),
    audio:audioRoutes(report,{...options,costMode}),
    quality:{
      photorealisticImage:report?.quality?.photorealisticImage===true,
      photorealisticMotion:report?.quality?.photorealisticMotion===true,
      nativeAudio:report?.quality?.nativeAudio===true,
      lipSync:report?.quality?.lipSync===true,
      output4k:report?.quality?.output4k===true
    }
  };
}

export function qualityClaims(plan){
  return {
    photorealisticImage:!!plan?.quality?.photorealisticImage,
    photorealisticMotion:!!plan?.quality?.photorealisticMotion,
    nativeAudio:!!plan?.quality?.nativeAudio,
    lipSync:!!plan?.quality?.lipSync,
    output4k:!!plan?.quality?.output4k
  };
}
