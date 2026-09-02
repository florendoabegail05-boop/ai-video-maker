"use strict";
(function () {
  function localPreviewAdapter() {
    return Object.freeze({
      secureBoundary: true,
      async start(job) {
        return { assetId: `preview-${job.jobId}`, kind: job.kind, mode: "preview", note: "Preview job only; no remote generation performed." };
      }
    });
  }

  function secureRemoteAdapter() {
    return Object.freeze({
      secureBoundary: true,
      async start(job, context = {}) {
        if (!context.transport || typeof context.transport.submit !== "function") {
          throw new Error("Secure provider transport is required.");
        }
        return context.transport.submit(job);
      }
    });
  }

  window.AIVM_PROVIDER_ADAPTERS = Object.freeze({ localPreviewAdapter, secureRemoteAdapter });
})();
