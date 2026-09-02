"use strict";

const JOB_STATES = Object.freeze(["queued", "running", "succeeded", "failed", "cancelled"]);
const TERMINAL_STATES = new Set(["succeeded", "failed", "cancelled"]);
const ALLOWED = Object.freeze({
  queued: new Set(["running", "cancelled"]),
  running: new Set(["succeeded", "failed", "cancelled"]),
  succeeded: new Set(),
  failed: new Set(["queued"]),
  cancelled: new Set(["queued"])
});

function clean(value) { return String(value ?? "").trim(); }
function id(prefix) {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? `${prefix}-${uuid}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createJob({ type, input = {}, id: jobId = null, idempotencyKey = null, providerId = null, providerVersion = null } = {}) {
  const jobType = clean(type);
  if (!jobType) throw new Error("Job type is required");
  const key = clean(idempotencyKey);
  return {
    schemaVersion: 1,
    jobId: clean(jobId) || id("job"),
    type: jobType,
    state: "queued",
    input,
    inputFingerprint: null,
    idempotencyKey: key || null,
    providerId: clean(providerId) || null,
    providerVersion: clean(providerVersion) || null,
    attempt: 0,
    checkpoint: null,
    outputs: [],
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function transition(job, nextState, patch = {}) {
  if (!JOB_STATES.includes(nextState)) throw new Error(`Unsupported job state: ${nextState}`);
  if (job.state !== nextState && !ALLOWED[job.state]?.has(nextState)) {
    throw new Error(`Invalid job transition: ${job.state} -> ${nextState}`);
  }
  if (nextState === "running") job.attempt += 1;
  Object.assign(job, patch, { state: nextState, updatedAt: new Date().toISOString() });
  return job;
}

function isTerminal(job) { return TERMINAL_STATES.has(job?.state); }

const api = Object.freeze({ JOB_STATES, createJob, transition, isTerminal });
if (typeof window !== "undefined") window.AIVM_MEDIA_JOBS = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
