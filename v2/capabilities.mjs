import {buildRoutePlan,qualityClaims} from './provider-router.mjs';

const labelRoute=(route,labels)=>labels[route?.kind]||route?.kind||'Unavailable';

export function capabilityRows(report){
  const plan=buildRoutePlan(report,{costMode:'FREE ONLY'});
  const claims=qualityClaims(plan);
  const ffmpeg=!!report?.tools?.ffmpeg?.available;
  const ffprobe=!!report?.tools?.ffprobe?.available;
  return [
    ['Selected image route',labelRoute(plan.image,{
      'local-comfyui':'Verified local ComfyUI (FREE ONLY)',
      'basic-local-still':'Basic local draft still',
      unavailable:'Unavailable in FREE ONLY'
    })],
    ['Selected motion route',labelRoute(plan.video,{
      'ffmpeg-camera-motion':'Local FFmpeg draft camera motion',
      unavailable:'Unavailable in FREE ONLY'
    })],
    ['Final MP4',ffmpeg&&ffprobe?'1080×1920 route; final quality check required':'FFmpeg and FFprobe required'],
    ['Voice / music',plan.audio.voice.verified||plan.audio.music.verified?'Verified local generation route detected':'Import your own audio files'],
    ['Photorealistic image',claims.photorealisticImage?'Verified by active capability report':'Quality target only — not verified'],
    ['Photorealistic AI motion',claims.photorealisticMotion?'Verified by active capability report':'Quality target only — not verified'],
    ['Native generated audio',claims.nativeAudio?'Verified by active capability report':'Not verified; import remains fallback'],
    ['Lip-sync',claims.lipSync?'Verified by active capability report':'Not connected / verified'],
    ['4K output',claims.output4k?'Verified route available':'Not enabled or verified']
  ];
}
