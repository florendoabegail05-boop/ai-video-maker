"use strict";

const CAPABILITIES = Object.freeze(["image", "video", "voice", "audio", "assembly"]);

function clean(value) { return String(value ?? "").trim(); }

function validateProvider(provider) {
  if (!provider || !clean(provider.id) || !clean(provider.kind)) throw new Error("Provider id and kind are required");
  if (!CAPABILITIES.includes(provider.kind)) throw new Error("Unsupported provider kind");
  if (provider.endpoint && !/^https:\/\//i.test(provider.endpoint)) throw new Error("Provider endpoint must use HTTPS");
  if (provider.requiresSecret && provider.browserSafe) throw new Error("Secret-bearing providers cannot be browser-safe");
  const capabilities = Array.isArray(provider.capabilities) && provider.capabilities.length
    ? [...new Set(provider.capabilities)]
    : [provider.kind];
  if (capabilities.some(capability => !CAPABILITIES.includes(capability))) throw new Error("Unsupported provider capability");
  return Object.freeze({
    ...provider,
    id: clean(provider.id),
    version: clean(provider.version) || "1",
    capabilities: Object.freeze(capabilities),
    browserSafe: provider.browserSafe === true,
    requiresSecret: provider.requiresSecret === true
  });
}

function createRegistry() {
  const providers = new Map();
  return Object.freeze({
    register(provider) {
      const p = validateProvider(provider);
      if (providers.has(p.id)) throw new Error(`Provider already exists: ${p.id}`);
      providers.set(p.id, p);
      return p;
    },
    get(id) { return providers.get(clean(id)) || null; },
    find(kind, preferredId = null) {
      const preferred = preferredId ? providers.get(clean(preferredId)) : null;
      if (preferred?.capabilities.includes(kind)) return preferred;
      for (const provider of providers.values()) if (provider.capabilities.includes(kind)) return provider;
      return null;
    },
    list(kind) {
      return [...providers.values()]
        .filter(p => !kind || p.capabilities.includes(kind))
        .map(p => ({ ...p, capabilities: [...p.capabilities] }));
    }
  });
}

const api = Object.freeze({ CAPABILITIES, validateProvider, createRegistry });
if (typeof window !== "undefined") window.AIVM_MEDIA_PROVIDERS = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
