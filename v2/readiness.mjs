// Shared by the studio and the local command-line check. Never runs a provider.
export function draftReadiness(report) {
  const issues = [];
  if (report.mock) issues.push('Restart the bridge without AIVM_MOCK=1 to create real media.');
  for (const [key, setting] of [['ffmpeg', 'AIVM_FFMPEG'], ['ffprobe', 'AIVM_FFPROBE']]) {
    if (!report.tools?.[key]?.available) issues.push(`${key === 'ffmpeg' ? 'FFmpeg' : 'FFprobe'} is missing or cannot run. Add it to PATH or set ${setting} to its executable path, then restart the bridge.`);
  }
  if (report.tools?.ffmpeg?.available && report.tools.ffmpeg.libx264 === false) issues.push('FFmpeg lacks the libx264 video encoder required for local MP4 drafts. Use a free FFmpeg build with libx264 support.');
  if (!report.imageFallback?.enabled && !report.freeOnlyImageWorkflow) issues.push('No verified FREE ONLY image route is available. Enable the basic local still fallback or configure a verified free local workflow.');
  if (!report.motionFallback?.enabled) issues.push('Enable the local motion fallback to create draft clips.');
  return {ready: issues.length === 0, issues};
}
