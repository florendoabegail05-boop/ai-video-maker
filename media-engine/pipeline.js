"use strict";

function makePipeline({ story, shots = [], references = {}, output = {}, providers = {} } = {}) {
  const safeShots = shots.map((shot, index) => ({
    id: shot.id || `shot-${index + 1}`,
    durationSeconds: Math.max(2, Math.min(10, Number(shot.durationSeconds || 5))),
    image: { providerId: providers.image || "local-preview", prompt: String(shot.imagePrompt || "") },
    video: { providerId: providers.video || "local-preview", prompt: String(shot.videoPrompt || ""), sourceAsset: String(shot.sourceAsset || "") },
    voice: shot.voiceover ? { providerId: providers.voice || "local-preview", text: String(shot.voiceover), characterId: shot.characterId || null } : null,
    audio: { providerId: providers.audio || "local-preview", prompt: String(shot.audioPrompt || "") },
    continuity: { previousFrame: shot.previousFrame || null, expectedCharacter: references.character || null, expectedWorld: references.environment || null, expectedStyle: references.style || null }
  }));
  return Object.freeze({ schemaVersion: 1, story: String(story || ""), references: { ...references }, shots: safeShots, output: { width: output.width || 1080, height: output.height || 1920, fps: output.fps || 30, container: output.container || "mp4" }, createdAt: new Date().toISOString() });
}

function validatePipeline(pipeline) {
  const errors = [];
  if (!pipeline || pipeline.schemaVersion !== 1) errors.push("Unsupported pipeline schema");
  if (!pipeline?.shots?.length) errors.push("At least one shot is required");
  pipeline?.shots?.forEach((shot, i) => {
    if (!shot.image.prompt) errors.push(`Shot ${i + 1}: missing image prompt`);
    if (!shot.video.prompt) errors.push(`Shot ${i + 1}: missing video prompt`);
    if (shot.durationSeconds < 2 || shot.durationSeconds > 10) errors.push(`Shot ${i + 1}: duration outside supported range`);
  });
  return Object.freeze({ valid: errors.length === 0, errors });
}

const api = Object.freeze({ makePipeline, validatePipeline });
if (typeof window !== "undefined") window.AIVM_MEDIA_PIPELINE = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
