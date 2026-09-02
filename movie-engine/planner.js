"use strict";

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function clean(value) { return String(value ?? "").trim(); }

function planMovie({ title = "Untitled Movie", premise = "", targetMinutes = 60, genre = "drama", audience = "general", acts = 3 } = {}) {
  const minutes = Number(targetMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) throw new Error("targetMinutes must be between 1 and 180");
  const actCount = clamp(Math.round(Number(acts) || 3), 1, 5);
  const beats = ["opening", "inciting", "progress", "midpoint", "escalation", "crisis", "climax", "resolution"];
  const weights = actCount === 3 ? [0.25, 0.5, 0.25] : Array.from({ length: actCount }, () => 1 / actCount);
  let cursor = 0;
  const actPlans = weights.map((weight, index) => {
    const durationMinutes = Number((minutes * weight).toFixed(2));
    const startMinute = Number(cursor.toFixed(2));
    cursor += durationMinutes;
    const actBeats = beats.filter((_, i) => {
      if (actCount === 1) return true;
      const bucket = Math.floor(i * actCount / beats.length);
      return bucket === index || (index === actCount - 1 && i === beats.length - 1);
    });
    return { actId: `act-${index + 1}`, number: index + 1, title: `Act ${index + 1}`, startMinute, durationMinutes, beats: actBeats };
  });

  const sceneSeconds = 60 / 2.5;
  const estimatedScenes = Math.max(actCount, Math.ceil(minutes * 2.5));
  return {
    schemaVersion: 1,
    title: clean(title) || "Untitled Movie",
    premise: clean(premise),
    genre: clean(genre) || "drama",
    audience: clean(audience) || "general",
    targetMinutes: minutes,
    estimatedScenes,
    estimatedShots: Math.ceil(estimatedScenes * 5),
    averageSceneSeconds: sceneSeconds,
    acts: actPlans
  };
}

function validateStoryPlan(plan) {
  const issues = [];
  if (!plan || !Array.isArray(plan.acts) || !plan.acts.length) issues.push("At least one act is required");
  if (!clean(plan?.premise)) issues.push("Premise is missing");
  const total = (plan?.acts || []).reduce((sum, act) => sum + Number(act.durationMinutes || 0), 0);
  if (Math.abs(total - Number(plan?.targetMinutes || 0)) > 0.1) issues.push("Act durations do not match target duration");
  const allBeats = new Set((plan?.acts || []).flatMap(act => act.beats || []));
  for (const beat of ["opening", "inciting", "crisis", "climax", "resolution"]) if (!allBeats.has(beat)) issues.push(`Missing core story beat: ${beat}`);
  return { ok: issues.length === 0, issues };
}

const api = Object.freeze({ planMovie, validateStoryPlan });
if (typeof window !== "undefined") window.AIVM_MOVIE_PLANNER = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
