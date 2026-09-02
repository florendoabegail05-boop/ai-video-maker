"use strict";

const MOVIE_SCHEMA_VERSION = 1;
const PROJECT_STATES = Object.freeze(["draft", "planning", "ready", "rendering", "complete", "failed"]);
const SHOT_KINDS = Object.freeze(["establishing", "wide", "medium", "closeup", "insert", "action", "transition"]);

function text(value) { return String(value ?? "").trim(); }
function positiveInt(value, fallback = 1) { const n = Number(value); return Number.isInteger(n) && n > 0 ? n : fallback; }

function createMovieProject({ title = "Untitled Movie", targetMinutes = 60, fps = 24, width = 1920, height = 1080 } = {}) {
  const minutes = Number(targetMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 180) throw new Error("targetMinutes must be between 1 and 180");
  return Object.freeze({
    schemaVersion: MOVIE_SCHEMA_VERSION,
    projectId: globalThis.crypto?.randomUUID?.() || `movie-${Date.now()}`,
    title: text(title) || "Untitled Movie",
    targetMinutes: minutes,
    output: { fps: positiveInt(fps, 24), width: positiveInt(width, 1920), height: positiveInt(height, 1080), format: "mp4" },
    state: "draft",
    acts: [],
    characters: [],
    locations: [],
    styleBible: {},
    continuity: { facts: [], relationships: [], locks: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function createShot({ id, sceneId, index = 1, durationSeconds = 5, kind = "medium", purpose = "", action = "", dialogue = "", visualPrompt = "", motionPrompt = "", previousShotId = null } = {}) {
  if (!text(sceneId)) throw new Error("sceneId is required");
  if (!SHOT_KINDS.includes(kind)) throw new Error(`Unsupported shot kind: ${kind}`);
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0 || duration > 30) throw new Error("durationSeconds must be between 0 and 30");
  return Object.freeze({
    shotId: text(id) || `shot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sceneId, index: positiveInt(index), durationSeconds: duration, kind,
    purpose: text(purpose), action: text(action), dialogue: text(dialogue),
    visualPrompt: text(visualPrompt), motionPrompt: text(motionPrompt), previousShotId: previousShotId ? text(previousShotId) : null,
    requiredAssets: [], generatedAssets: [], qc: { status: "pending", issues: [] }
  });
}

const api = Object.freeze({ MOVIE_SCHEMA_VERSION, PROJECT_STATES, SHOT_KINDS, createMovieProject, createShot });
if (typeof window !== "undefined") window.AIVM_MOVIE_CONTRACTS = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
