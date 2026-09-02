"use strict";

function validateProvider(provider) {
  if (!provider || !provider.id || !provider.kind) throw new Error("Provider id and kind are required");
  if (!["image", "video", "voice", "audio", "assembly"].includes(provider.kind)) throw new Error("Unsupported provider kind");
  if (provider.endpoint && !/^https:\/\//i.test(provider.endpoint)) throw new Error("Provider endpoint must use HTTPS");
  if (provider.requiresSecret && provider.browserSafe) throw new Error("Secret-bearing providers cannot be browser-safe");
  return Object.freeze({ ...provider, version: provider.version || "1", browserSafe: provider.browserSafe === true, requiresSecret: provider.requiresSecret === true });
}

function createRegistry() {
  const providers = new Map();
  return Object.freeze({
    register(provider) { const p = validateProvider(provider); if (providers.has(p.id)) throw new Error(`Provider already exists: ${p.id}`); providers.set(p.id, p); return p; },
    get(id) { return providers.get(String(id)) || null; },
    list(kind) { return [...providers.values()].filter(p => !kind || p.kind === kind).map(p => ({ ...p })); }
  });
}

const api = Object.freeze({ validateProvider, createRegistry });
if (typeof window !== "undefined") window.AIVM_MEDIA_PROVIDERS = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
