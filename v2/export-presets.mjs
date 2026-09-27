const PRESETS={
  '9:16':{id:'9:16',label:'Vertical',width:1080,height:1920,uses:['YouTube Shorts','TikTok','Reels']},
  '16:9':{id:'16:9',label:'Landscape',width:1920,height:1080,uses:['YouTube','desktop video']},
  '1:1':{id:'1:1',label:'Square',width:1080,height:1080,uses:['social feed']}
};

export function exportPreset(id='9:16'){
  const preset=PRESETS[id];
  if(!preset)throw Error('Unsupported export aspect ratio.');
  return {...preset,uses:[...preset.uses]};
}

export function listExportPresets(){return Object.keys(PRESETS).map(exportPreset);}

export function validateExportCapability(id,capabilities={}){
  const preset=exportPreset(id);
  if(id==='9:16')return {enabled:true,preset,verified:capabilities.vertical1080!==false,reason:'Existing vertical 1080p route remains the default; final media QC is still required.'};
  const key=id==='16:9'?'landscape1080':'square1080';
  const verified=capabilities?.[key]===true;
  return {enabled:verified,preset,verified,reason:verified?'This aspect ratio is reported as locally supported.':`${preset.label} export stays disabled until the local bridge route is tested and verified.`};
}

export function upscaleLabel({sourceWidth,sourceHeight,targetWidth,targetHeight,detailEnhancing=false}={}){
  if(![sourceWidth,sourceHeight,targetWidth,targetHeight].every(Number.isFinite))throw Error('Source and target dimensions are required.');
  const growing=targetWidth>sourceWidth||targetHeight>sourceHeight;
  if(!growing)return 'No upscale';
  return detailEnhancing?'Detail-enhancing upscale (provider must be verified)':'Dimension scaling only; does not create missing visual detail';
}

export function fourKAvailability(capabilities={}){
  const enabled=capabilities?.quality?.output4k===true&&capabilities?.upscale?.verified===true;
  return {enabled,label:enabled?'Verified 4K-capable route':'4K unavailable',reason:enabled?'Active route reports verified 4K output and upscale capability.':'Do not label an export 4K-quality until a real route and output validation pass.'};
}
