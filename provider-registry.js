"use strict";
(function () {
  const registry = new Map();
  const allowedKinds = new Set(["image", "video", "audio", "voice", "assembly"]);
  const clean = value => String(value ?? "").trim();

  function validate(def) {
    if (!def || !clean(def.id) || !clean(def.name)) throw new Error("Provider requires id and name.");
    if (!Array.isArray(def.kinds) || !def.kinds.length || def.kinds.some(k => !allowedKinds.has(k))) {
      throw new Error("Provider kinds must contain only supported media types.");
    }
    if (def.endpoint && !/^https:\/\//i.test(def.endpoint)) throw new Error("Provider endpoints must use HTTPS.");
    return {
      id: clean(def.id), name: clean(def.name), version: clean(def.version) || "1",
      kinds: Object.freeze([...new Set(def.kinds)]), endpoint: def.endpoint ? clean(def.endpoint) : null,
      enabled: def.enabled !== false, requiresSecret: def.requiresSecret === true,
      adapterVersion: clean(def.adapterVersion) || "1"
    };
  }

  function register(def) {
    const provider = validate(def);
    if (registry.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    registry.set(provider.id, provider);
    return provider;
  }

  function list(kind) {
    return [...registry.values()].filter(p => p.enabled && (!kind || p.kinds.includes(kind))).map(p => ({ ...p, kinds: [...p.kinds] }));
  }

  function get(id) {
    const p = registry.get(clean(id));
    return p ? { ...p, kinds: [...p.kinds] } : null;
  }

  function createJob(input) {
    const kind = clean(input?.kind);
    if (!allowedKinds.has(kind)) throw new Error("Unsupported generation kind.");
    const provider = get(input?.providerId);
    if (!provider || !provider.enabled || !provider.kinds.includes(kind)) throw new Error("Provider is not available for this job.");
    const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
    return Object.freeze({
      schemaVersion: 1, jobId: webCrypto?.randomUUID?.() || `job-${Date.now()}`,
      providerId: provider.id, kind, prompt: clean(input?.prompt), sourceAsset: clean(input?.sourceAsset),
      createdAt: new Date().toISOString()
    });
  }

  // Deliberately empty: future providers are adapters, not hard-coded runtime dependencies.
  window.AIVM_PROVIDERS = Object.freeze({ register, list, get, createJob, kinds: [...allowedKinds] });
})();
