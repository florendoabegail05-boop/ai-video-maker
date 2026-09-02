"use strict";

const REQUIRED_STORY_BEATS = Object.freeze(["opening", "inciting", "crisis", "climax", "resolution"]);

function validateMovie({ project, plan, shots = [] } = {}) {
  const issues = [];
  if (!project) issues.push("Movie project is missing");
  if (!plan) issues.push("Story plan is missing");
  if (plan && (!Array.isArray(plan.acts) || !plan.acts.length)) issues.push("No acts found");
  const beats = new Set((plan?.acts || []).flatMap(act => act.beats || []));
  for (const beat of REQUIRED_STORY_BEATS) if (!beats.has(beat)) issues.push(`Missing story beat: ${beat}`);
  if (!Array.isArray(shots) || !shots.length) issues.push("No shots planned");
  const seen = new Set();
  for (const shot of shots) {
    if (!shot?.shotId) issues.push("Shot without ID");
    if (seen.has(shot?.shotId)) issues.push(`Duplicate shot ID: ${shot.shotId}`);
    if (shot?.shotId) seen.add(shot.shotId);
    if (Number(shot?.durationSeconds || 0) <= 0) issues.push(`Invalid duration: ${shot?.shotId || "unknown"}`);
    if (!String(shot?.visualPrompt || "").trim()) issues.push(`Missing visual prompt: ${shot?.shotId || "unknown"}`);
    if (!String(shot?.motionPrompt || "").trim()) issues.push(`Missing motion prompt: ${shot?.shotId || "unknown"}`);
  }
  return { ok: issues.length === 0, score: issues.length ? Math.max(0, 100 - issues.length * 8) : 100, issues };
}

function validateRenderManifest(manifest) {
  const issues = [];
  if (!manifest || !Array.isArray(manifest.segments)) issues.push("Render manifest segments are required");
  const segments = manifest?.segments || [];
  let duration = 0;
  for (const segment of segments) {
    if (!segment.assetId) issues.push("Render segment missing assetId");
    if (!Number.isFinite(Number(segment.durationSeconds)) || Number(segment.durationSeconds) <= 0) issues.push("Render segment has invalid duration");
    duration += Number(segment.durationSeconds || 0);
  }
  return { ok: issues.length === 0, durationSeconds: duration, issues };
}

const api = Object.freeze({ REQUIRED_STORY_BEATS, validateMovie, validateRenderManifest });
if (typeof window !== "undefined") window.AIVM_MOVIE_QC = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
