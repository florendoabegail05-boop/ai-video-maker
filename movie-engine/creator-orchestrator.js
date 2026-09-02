"use strict";

function requireApi(name) { const api = globalThis[name]; if (!api) throw new Error(`${name} is not loaded`); return api; }

function createProductionPlan(input = {}) {
  const storyApi = requireApi("AIVM_STORY_DIRECTOR");
  const bibleApi = requireApi("AIVM_CONTINUITY_BIBLE");
  const shotApi = requireApi("AIVM_SHOT_DIRECTOR");
  const story = storyApi.planShort(input);
  const bible = bibleApi.createBible({ projectId: input.projectId || "project", characters: input.characters || [], locations: input.locations || [], props: input.props || [], style: input.style || {} });
  const actions = input.actions || story.beats.map(b => b.objective);
  const shots = shotApi.buildShotList({ story, bible, actions, format: input.format || "9:16" });
  return { schemaVersion: 2, projectId: input.projectId || "project", story, bible, shots, generation: shots.map(shot => ({ shotId: shot.shotId, image: { kind: "image", prompt: shot.visualPrompt }, video: { kind: "video", prompt: shot.motionPrompt, sourceShot: shot.continuityIn } })), costPolicy: { mode: input.freeMode === false ? "paid-enabled" : "zero-cost", paidCallsAllowed: input.freeMode === false } };
}

function validateProductionPlan(plan) {
  const story = requireApi("AIVM_STORY_DIRECTOR").validateStory(plan?.story);
  const bible = requireApi("AIVM_CONTINUITY_BIBLE").validateBible(plan?.bible);
  const issues = [...story.issues, ...bible.issues];
  const ids = new Set();
  for (const shot of plan?.shots || []) {
    if (!shot.shotId || ids.has(shot.shotId)) issues.push(`Invalid or duplicate shot: ${shot.shotId || "missing"}`);
    ids.add(shot.shotId);
    if (!shot.visualPrompt || !shot.motionPrompt) issues.push(`Incomplete generation prompts: ${shot.shotId || "missing"}`);
  }
  return { ok: issues.length === 0, issues, score: Math.max(0, 100 - issues.length * 10) };
}

const api = Object.freeze({ createProductionPlan, validateProductionPlan });
if (typeof window !== "undefined") window.AIVM_CREATOR_ORCHESTRATOR = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
