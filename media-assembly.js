"use strict";
(function () {
  const clean = v => String(v ?? "").trim();

  function plan(input = {}) {
    const shots = Array.isArray(input.shots) ? input.shots : [];
    const duration = Number(input.duration) || shots.reduce((n, s) => n + Math.max(0, (Number(s.end) || 0) - (Number(s.start) || 0)), 0);
    const tracks = {
      video: shots.map((s, i) => ({ shotId: clean(s.id) || `shot-${i + 1}`, source: s.outputAssetId || null, start: Number(s.start) || i * 5, duration: Math.max(0, (Number(s.end) || i * 5 + 5) - (Number(s.start) || i * 5)) })),
      voice: input.voiceAssetId ? [{ source: clean(input.voiceAssetId), start: 0, duration }] : [],
      music: input.musicAssetId ? [{ source: clean(input.musicAssetId), start: 0, duration, duckUnderVoice: true }] : [],
      sfx: Array.isArray(input.sfx) ? input.sfx.map(x => ({ source: clean(x.source), start: Number(x.start) || 0, duration: Number(x.duration) || 1 })) : [],
      captions: input.captions === false ? [] : [{ source: "generated-captions", start: 0, duration, safeMargins: true }]
    };
    return {
      schemaVersion: 1, type: "aivm-assembly-plan", duration, aspectRatio: "9:16", resolution: "1080x1920", fps: 30,
      output: { container: "mp4", videoCodec: "h264", audioCodec: "aac", targetLoudness: -14, captionBurnIn: input.captionBurnIn !== false },
      tracks,
      readiness: { missingVideo: tracks.video.filter(x => !x.source).map(x => x.shotId), missingVoice: input.voiceRequired === true && !input.voiceAssetId }
    };
  }

  function validate(planObject) {
    const p = planObject || {};
    const missing = [...(p.readiness?.missingVideo || [])];
    if (p.readiness?.missingVoice) missing.push("voiceover");
    return { ready: missing.length === 0, missing };
  }

  window.AIVM_ASSEMBLY = Object.freeze({ plan, validate });
})();
