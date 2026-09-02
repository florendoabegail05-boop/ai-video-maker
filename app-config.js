"use strict";
(function () {
  const VERSION = 3;
  const config = {
    schemaVersion: VERSION,
    appVersion: "0.9.0",
    storage: { projectKey: "aivm.creatorStudio.v1", pipelineKey: "aivm.productionPipeline.v2", monetizationKey: "aivm.monetization.v1", youtubeKey: "aivm.youtubeUpload.v1" },
    limits: { projectName: 80, idea: 800, maxScenes: 24, maxPromptLength: 6000, maxBatchItems: 200 },
    features: { storyDirector: true, productionPipeline: true, providerRegistry: true, localExport: true, localGenerationBridge: true, monetizationGuard: true, originalityChecker: true, batchStudio: true, automaticImprovement: true, youtubeUploadPack: true, batchMetadata: true, remoteGeneration: false },
    security: { localFirst: true, allowRuntimeNetwork: false, allowLoopbackBridge: true, allowFrontendSecrets: false, noFakeEngagement: true, noAutoPublish: true }
  };
  window.AIVM_CONFIG = Object.freeze(config);
  const loadScript = (src, key) => {
    if (document.querySelector(`script[data-aivm="${key}"]`)) return;
    const s = document.createElement("script"); s.src = src; s.defer = true; s.dataset.aivm = key; document.head.appendChild(s);
  };
  const load = () => {
    loadScript("monetization-engine.js", "monetization-engine");
    loadScript("youtube-upload-engine.js", "youtube-upload-engine");
    if (!document.querySelector('link[data-aivm="youtube-upload-css"]')) { const l=document.createElement("link"); l.rel="stylesheet"; l.href="youtube-upload.css"; l.dataset.aivm="youtube-upload-css"; document.head.appendChild(l); }
  };
  load();
})();
