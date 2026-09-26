export function capabilityRows(report){const fallback=!!report.imageFallback?.enabled,motion=!!report.motionFallback?.enabled,ffmpeg=!!report.tools?.ffmpeg?.available,ffprobe=!!report.tools?.ffprobe?.available;return [
 ['Image previews',report.freeOnlyImageWorkflow?'Verified free local image workflow':fallback?'Basic draft still only':'Unavailable in FREE ONLY'],
 ['Motion clips',motion&&ffmpeg?'Basic FFmpeg camera motion':'Unavailable locally'],
 ['Final MP4',ffmpeg&&ffprobe?'1080×1920 route; final quality check required':'FFmpeg and FFprobe required'],
 ['Voice / music','Import your own audio files'],
 ['Photorealistic AI motion','No verified FREE ONLY route connected'],
 ['Lip-sync','Not connected'],
 ['4K output','Not enabled or verified']
];}
