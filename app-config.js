"use strict";
(function () {
  const VERSION = 2;
  const config = {
    schemaVersion: VERSION,
    appVersion: "0.8.0",
    storage: { projectKey: "aivm.creatorStudio.v1", pipelineKey: "aivm.productionPipeline.v2", monetizationKey: "aivm.monetization.v1" },
    limits: { projectName: 80, idea: 800, maxScenes: 24, maxPromptLength: 6000 },
    features: { storyDirector: true, productionPipeline: true, providerRegistry: true, localExport: true, localGenerationBridge: true, monetizationGuard: true, originalityChecker: true, batchStudio: true, remoteGeneration: false },
    security: { localFirst: true, allowRuntimeNetwork: false, allowLoopbackBridge: true, allowFrontendSecrets: false, noFakeEngagement: true }
  };
  window.AIVM_CONFIG = Object.freeze(config);
  const load = () => {
    if (document.querySelector('script[data-aivm="monetization-engine"]')) return;
    const s = document.createElement("script"); s.src = "monetization-engine.js"; s.defer = true; s.dataset.aivm = "monetization-engine"; document.head.appendChild(s);
  };
  load();
})();
