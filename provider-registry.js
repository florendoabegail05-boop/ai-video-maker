"use strict";
(function () {
  const registry = new Map();
  const allowedKinds = new Set(["image", "video", "audio", "voice", "assembly"]);
  const clean = value => String(value ?? "").trim();

  function validate(def) {
    if (!def || !clean(def.id) || !clean(def.name)) throw new Error("Provider requires id and name.");
    if (!Array.isArray(def.kinds) || !def.kinds.length || def.kinds.some(k => !allowedKinds.has(k))) throw new Error("Provider kinds are invalid.");
    if (def.endpoint && !/^https:\/\//i.test(def.endpoint) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(def.endpoint)) throw new Error("Provider endpoint must be HTTPS or local loopback.");
    const cost = Number(def.costPerJob ?? 0);
    if (!Number.isFinite(cost) || cost < 0) throw new Error("Provider cost must be a non-negative number.");
    return { id: clean(def.id), name: clean(def.name), version: clean(def.version) || "1", kinds: Object.freeze([...new Set(def.kinds)]), endpoint: def.endpoint ? clean(def.endpoint) : null, enabled: def.enabled !== false, requiresSecret: def.requiresSecret === true, costPerJob: cost, adapterVersion: clean(def.adapterVersion) || "1" };
  }
  function register(def) { const provider = validate(def); if (registry.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`); registry.set(provider.id, provider); return provider; }
  function list(kind, { freeOnly = false } = {}) { return [...registry.values()].filter(p => p.enabled && (!kind || p.kinds.includes(kind)) && (!freeOnly || p.costPerJob === 0)).map(p => ({ ...p, kinds: [...p.kinds] })); }
  function get(id) { const p = registry.get(clean(id)); return p ? { ...p, kinds: [...p.kinds] } : null; }
  function select(kind, { freeMode = true, preferred = [] } = {}) {
    const candidates = list(kind, { freeOnly: freeMode });
    for (const id of preferred) { const hit = candidates.find(p => p.id === id); if (hit) return hit; }
    return candidates[0] || null;
  }
  function createJob(input) {
    const kind = clean(input?.kind); if (!allowedKinds.has(kind)) throw new Error("Unsupported generation kind.");
    const provider = get(input?.providerId); if (!provider || !provider.enabled || !provider.kinds.includes(kind)) throw new Error("Provider is not available for this job.");
    if (input?.freeMode !== false && provider.costPerJob > 0) throw new Error("Paid provider blocked by $0 mode. Enable paid generation explicitly before using it.");
    return Object.freeze({ schemaVersion: 1, jobId: globalThis.crypto?.randomUUID?.() || `job-${Date.now()}`, providerId: provider.id, kind, prompt: clean(input?.prompt), sourceAsset: clean(input?.sourceAsset), estimatedCost: provider.costPerJob, createdAt: new Date().toISOString() });
  }
  window.AIVM_PROVIDERS = Object.freeze({ register, list, get, select, createJob, kinds: [...allowedKinds] });
})();
