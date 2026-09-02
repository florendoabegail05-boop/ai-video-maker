"use strict";
(function () {
  const VERSION = 1;
  const config = {
    schemaVersion: VERSION,
    appVersion: "0.7.0",
    storage: {
      projectKey: "aivm.creatorStudio.v1",
      pipelineKey: "aivm.productionPipeline.v2"
    },
    limits: {
      projectName: 80,
      idea: 800,
      maxScenes: 24,
      maxPromptLength: 6000
    },
    features: {
      storyDirector: true,
      productionPipeline: true,
      providerRegistry: true,
      localExport: true,
      localGenerationBridge: true,
      remoteGeneration: false
    },
    security: {
      localFirst: true,
      allowRuntimeNetwork: false,
      allowLoopbackBridge: true,
      allowFrontendSecrets: false
    }
  };
  window.AIVM_CONFIG = Object.freeze(config);
})();
