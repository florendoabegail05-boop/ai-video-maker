"use strict";
(function () {
  const VERSION = 1;
  const KINDS = Object.freeze(["image", "video", "voice", "audio", "assembly"]);
  const clean = v => String(v ?? "").trim();
  const assertKind = kind => { if (!KINDS.includes(kind)) throw new Error("Unsupported generation kind."); return kind; };
  const assertHttps = endpoint => { if (endpoint && !/^https:\/\//i.test(endpoint)) throw new Error("Provider endpoints must use HTTPS."); return endpoint || null; };

  function makeJob(input = {}) {
    const kind = assertKind(clean(input.kind));
    const prompt = clean(input.prompt);
    if (!prompt && kind !== "assembly") throw new Error("Generation jobs require a prompt.");
    const cryptoApi = globalThis.crypto;
    return Object.freeze({
      schemaVersion: VERSION,
      jobId: cryptoApi?.randomUUID?.() || `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      providerId: clean(input.providerId) || null,
      prompt,
      sourceAssetId: clean(input.sourceAssetId) || null,
      previousFrameAssetId: clean(input.previousFrameAssetId) || null,
      outputAssetId: null,
      status: "queued",
      createdAt: new Date().toISOString()
    });
  }

  function validateProvider(provider = {}) {
    if (!clean(provider.id) || !clean(provider.name)) throw new Error("Provider requires id and name.");
    if (!Array.isArray(provider.kinds) || !provider.kinds.length || provider.kinds.some(k => !KINDS.includes(k))) throw new Error("Provider kinds are invalid.");
    assertHttps(provider.endpoint);
    return Object.freeze({
      id: clean(provider.id), name: clean(provider.name), version: clean(provider.version) || "1",
      kinds: Object.freeze([...new Set(provider.kinds)]), endpoint: provider.endpoint ? clean(provider.endpoint) : null,
      requiresSecret: provider.requiresSecret === true, enabled: provider.enabled !== false
    });
  }

  function createProductionPackage(project = {}) {
    const scenes = Array.isArray(project.scenes) ? project.scenes : [];
    return {
      schemaVersion: VERSION,
      packageType: "aivm-production-package",
      project: {
        name: clean(project.name) || "Untitled Video",
        idea: clean(project.idea), type: clean(project.type), length: Number(project.length) || scenes.length * 5,
        aspectRatio: "9:16"
      },
      assets: { characters: [], environments: [], styles: [], references: [], generated: [] },
      shots: scenes.map((scene, index) => ({
        id: clean(scene.id) || `shot-${index + 1}`,
        number: index + 1, start: Number(scene.start) || index * 5, end: Number(scene.end) || index * 5 + 5,
        action: clean(scene.action), camera: clean(scene.camera), emotion: clean(scene.emotion),
        imagePrompt: clean(scene.imagePrompt), videoPrompt: clean(scene.videoPrompt), voiceover: clean(scene.voiceover),
        inputFrameAssetId: index ? `shot-${index}-last-frame` : null,
        outputAssetId: null,
        status: "planned"
      })),
      assembly: {
        canvas: "1080x1920", fps: 30, format: "mp4", videoCodec: "h264", audioCodec: "aac",
        captions: { enabled: true, safeMargins: true },
        audio: { voiceover: true, music: true, sfx: true, targetLoudness: -14 }
      },
      createdAt: new Date().toISOString()
    };
  }

  function migratePackage(pkg) {
    const copy = JSON.parse(JSON.stringify(pkg || {}));
    if (!copy.schemaVersion) copy.schemaVersion = 1;
    if (!copy.assets) copy.assets = { characters: [], environments: [], styles: [], references: [], generated: [] };
    if (!copy.shots) copy.shots = [];
    if (!copy.assembly) copy.assembly = { canvas: "1080x1920", fps: 30, format: "mp4", videoCodec: "h264", audioCodec: "aac", captions: { enabled: true, safeMargins: true }, audio: { voiceover: true, music: true, sfx: true, targetLoudness: -14 } };
    return copy;
  }

  window.AIVM_GENERATION = Object.freeze({ VERSION, KINDS, makeJob, validateProvider, createProductionPackage, migratePackage });
})();
