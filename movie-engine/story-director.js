"use strict";

const BEATS = Object.freeze(["hook", "setup", "inciting", "escalation", "payoff", "resolution"]);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();

function buildHook(idea, genre = "story") {
  const i = clean(idea).replace(/[.!?]+$/, "");
  if (!i) return "A surprising moment is about to change everything.";
  if (/education|learn/i.test(genre)) return `What if ${i.toLowerCase()} could teach us something surprising?`;
  return `Wait—what happens when ${i.toLowerCase()}?`;
}

function distributeBeats(seconds) {
  const weights = [0.10, 0.15, 0.15, 0.25, 0.20, 0.15];
  let cursor = 0;
  return weights.map((weight, index) => {
    const duration = index === weights.length - 1 ? seconds - cursor : Math.max(2, Math.round(seconds * weight));
    const beat = { id: `beat-${index + 1}`, type: BEATS[index], start: cursor, duration };
    cursor += duration;
    return beat;
  });
}

function planShort({ idea, seconds = 30, platform = "YouTube Short", genre = "story", audience = "general", tone = "warm" } = {}) {
  const cleanIdea = clean(idea);
  const duration = clamp(Math.round(Number(seconds) || 30), 10, 180);
  if (!cleanIdea) throw new Error("A story idea is required.");
  const beats = distributeBeats(duration);
  const objectives = {
    hook: "Stop the scroll and establish a clear question.",
    setup: "Make the character, world and goal instantly understandable.",
    inciting: "Introduce the change that forces action.",
    escalation: "Increase curiosity, stakes or emotional movement.",
    payoff: "Deliver the promised visual or emotional reward.",
    resolution: "End cleanly and leave the viewer satisfied."
  };
  return {
    schemaVersion: 2, title: cleanIdea.slice(0, 70), premise: cleanIdea,
    platform: clean(platform) || "YouTube Short", genre: clean(genre) || "story",
    audience: clean(audience) || "general", tone: clean(tone) || "warm", durationSeconds: duration,
    hook: buildHook(cleanIdea, genre), beats: beats.map(b => ({ ...b, objective: objectives[b.type], storyQuestion: b.type === "hook" ? "Why should I keep watching?" : `What changes during the ${b.type}?` })),
    pacing: duration <= 45 ? "fast, readable, escalating" : "measured, cinematic, escalating",
    endingRule: "Resolve the main promise before the final second; never end on an unresolved production beat."
  };
}

function validateStory(story) {
  const issues = [];
  if (!story?.premise) issues.push("Premise is required");
  if (!Number.isFinite(Number(story?.durationSeconds)) || Number(story.durationSeconds) < 10) issues.push("Duration must be at least 10 seconds");
  const beats = new Set((story?.beats || []).map(b => b.type));
  for (const beat of BEATS) if (!beats.has(beat)) issues.push(`Missing beat: ${beat}`);
  const total = (story?.beats || []).reduce((sum, b) => sum + Number(b.duration || 0), 0);
  if (Math.abs(total - Number(story?.durationSeconds || 0)) > 1) issues.push("Beat durations do not cover the requested runtime");
  return { ok: issues.length === 0, issues };
}

const api = Object.freeze({ BEATS, planShort, validateStory });
if (typeof window !== "undefined") window.AIVM_STORY_DIRECTOR = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
