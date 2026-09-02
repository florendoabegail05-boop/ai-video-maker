"use strict";

const KINDS = Object.freeze(["image", "video", "voice", "audio", "assembly"]);
const STATES = Object.freeze(["queued", "running", "succeeded", "failed", "cancelled"]);

function clean(value) { return String(value ?? "").trim(); }
function assertKind(kind) { if (!KINDS.includes(kind)) throw new Error(`Unsupported media kind: ${kind}`); }
function assertState(state) { if (!STATES.includes(state)) throw new Error(`Unsupported job state: ${state}`); }

function createJob({ kind, providerId, prompt = "", sourceAsset = "", metadata = {} } = {}) {
  assertKind(kind);
  if (!clean(providerId)) throw new Error("providerId is required");
  const id = globalThis.crypto?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return Object.freeze({ schemaVersion: 1, jobId: id, kind, providerId: clean(providerId), prompt: clean(prompt), sourceAsset: clean(sourceAsset), metadata: { ...metadata }, state: "queued", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}

function transition(job, nextState, patch = {}) {
  assertState(nextState);
  const allowed = { queued: ["running", "cancelled", "failed"], running: ["succeeded", "failed", "cancelled"], succeeded: [], failed: [], cancelled: [] };
  if (!allowed[job.state].includes(nextState)) throw new Error(`Invalid job transition: ${job.state} -> ${nextState}`);
  return Object.freeze({ ...job, ...patch, state: nextState, updatedAt: new Date().toISOString() });
}

const api = Object.freeze({ KINDS, STATES, createJob, transition });
if (typeof window !== "undefined") window.AIVM_MEDIA_CONTRACTS = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
