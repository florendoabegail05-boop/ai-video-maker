"use strict";

const clean = v => String(v ?? "").trim();
const DEFAULT_KEY = "aivm.production.jobs.v1";
const STATES = Object.freeze(["queued", "generating", "complete", "failed", "retrying", "assembled", "qc-passed"]);

function memoryStore() {
  const data = new Map();
  return { get: key => data.get(key) || null, set: (key, value) => data.set(key, value) };
}

function createJobStore(storage) {
  const backend = storage || (typeof localStorage !== "undefined" ? localStorage : memoryStore());
  const read = key => { try { return JSON.parse(backend.getItem ? backend.getItem(key) : backend.get(key)); } catch { return null; } };
  const write = (key, value) => { const text = JSON.stringify(value); if (backend.setItem) backend.setItem(key, text); else backend.set(key, value); };
  return { read, write };
}

function createJob({ id, projectId, shots = [], maxRetries = 2, metadata = {} } = {}, storage) {
  const store = createJobStore(storage); const jobId = clean(id) || `render-${Date.now().toString(36)}`;
  const existing = store.read(DEFAULT_KEY) || {};
  if (existing[jobId]) return existing[jobId];
  const now = new Date().toISOString();
  const job = { schemaVersion: 2, jobId, projectId: clean(projectId), state: "queued", createdAt: now, updatedAt: now, maxRetries: Math.max(0, Math.min(5, Number(maxRetries) || 2)), metadata, shots: shots.map((shot, i) => ({ shotId: clean(shot.shotId) || `shot-${i + 1}`, state: "queued", attempts: 0, assetPath: null, error: null })) };
  existing[jobId] = job; store.write(DEFAULT_KEY, existing); return job;
}

function updateJob(jobId, patch, storage) {
  const store = createJobStore(storage); const all = store.read(DEFAULT_KEY) || {}; const job = all[clean(jobId)];
  if (!job) throw new Error("Production job not found");
  const nextState = patch?.state || job.state; if (!STATES.includes(nextState)) throw new Error(`Invalid job state: ${nextState}`);
  all[job.jobId] = { ...job, ...patch, state: nextState, updatedAt: new Date().toISOString() }; store.write(DEFAULT_KEY, all); return all[job.jobId];
}

function updateShot(jobId, shotId, patch, storage) {
  const store = createJobStore(storage); const all = store.read(DEFAULT_KEY) || {}; const job = all[clean(jobId)];
  if (!job) throw new Error("Production job not found"); const index = job.shots.findIndex(s => s.shotId === clean(shotId));
  if (index < 0) throw new Error("Shot not found");
  const shot = { ...job.shots[index], ...patch, attempts: Math.max(job.shots[index].attempts, Number(patch?.attempts || 0)) };
  job.shots[index] = shot; job.updatedAt = new Date().toISOString(); all[job.jobId] = job; store.write(DEFAULT_KEY, all); return shot;
}

function resumePlan(job, maxParallel = 1) {
  const available = (job?.shots || []).filter(s => s.state !== "complete" && s.state !== "qc-passed" && s.attempts < (job.maxRetries + 1));
  return available.slice(0, Math.max(1, Math.min(4, Number(maxParallel) || 1))).map(s => s.shotId);
}

function listJobs(storage) { return Object.values(createJobStore(storage).read(DEFAULT_KEY) || {}).slice(-50); }

const api = Object.freeze({ STATES, createJob, updateJob, updateShot, resumePlan, listJobs });
if (typeof window !== "undefined") window.AIVM_JOB_MANAGER = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
