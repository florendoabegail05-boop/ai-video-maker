"use strict";
(function () {
  const CONTRACT = window.AIVM_GENERATION;
  if (!CONTRACT) throw new Error("AIVM_GENERATION must load before generation-orchestrator.js");

  const STATES = Object.freeze(["queued", "running", "succeeded", "failed", "cancelled"]);
  const registry = new Map();
  const jobs = new Map();

  function registerProvider(provider, adapter) {
    const safe = CONTRACT.validateProvider(provider);
    if (!adapter || typeof adapter.start !== "function") throw new Error("Provider adapter requires start().");
    if (safe.requiresSecret && !adapter.secureBoundary) {
      throw new Error("Secret-bearing providers must run behind a secure server boundary.");
    }
    registry.set(safe.id, Object.freeze({ provider: safe, adapter }));
    return safe;
  }

  function listProviders(kind) {
    return [...registry.values()]
      .filter(entry => entry.provider.enabled && (!kind || entry.provider.kinds.includes(kind)))
      .map(entry => entry.provider);
  }

  function createJob(input) {
    const job = CONTRACT.makeJob(input);
    if (job.providerId && !registry.has(job.providerId)) throw new Error("Selected provider is not registered.");
    jobs.set(job.jobId, job);
    return job;
  }

  async function run(jobId, context = {}) {
    const original = jobs.get(jobId);
    if (!original) throw new Error("Unknown generation job.");
    if (original.status !== "queued") throw new Error("Job is not queued.");
    const entry = registry.get(original.providerId);
    if (!entry) throw new Error("No provider is available for this job.");

    const running = Object.freeze({ ...original, status: "running", startedAt: new Date().toISOString() });
    jobs.set(jobId, running);
    try {
      const result = await entry.adapter.start(running, context);
      const output = Object.freeze({ ...running, status: "succeeded", outputAssetId: result?.assetId || null, result: result || null, finishedAt: new Date().toISOString() });
      jobs.set(jobId, output);
      return output;
    } catch (error) {
      const failed = Object.freeze({ ...running, status: "failed", error: String(error?.message || error), finishedAt: new Date().toISOString() });
      jobs.set(jobId, failed);
      throw error;
    }
  }

  function getJob(jobId) { return jobs.get(jobId) || null; }
  function clear() { jobs.clear(); registry.clear(); }

  window.AIVM_ORCHESTRATOR = Object.freeze({ STATES, registerProvider, listProviders, createJob, run, getJob, clear });
})();
