"use strict";
const fs = require("fs");
const vm = require("vm");
const files = ["generation-contract.js", "generation-orchestrator.js", "provider-adapters.js"];
for (const file of files) {
  const code = fs.readFileSync(file, "utf8");
  new vm.Script(code, { filename: file });
}
const context = { console, crypto: { randomUUID: () => "test-job" } };
context.window = context;
vm.createContext(context);
for (const file of files) vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });
const C = context.AIVM_GENERATION;
const O = context.AIVM_ORCHESTRATOR;
const A = context.AIVM_PROVIDER_ADAPTERS;
O.clear();
O.registerProvider({ id: "local-preview", name: "Local Preview", kinds: ["image", "video", "voice", "audio", "assembly"], requiresSecret: false }, A.localPreviewAdapter());
if (O.listProviders("video").length !== 1) throw new Error("Provider registry failed.");
const job = O.createJob({ kind: "video", providerId: "local-preview", prompt: "A child walks through a rainbow garden." });
O.run(job.jobId).then(result => {
  if (result.status !== "succeeded") throw new Error("Preview job did not succeed.");
  if (!result.outputAssetId) throw new Error("Preview asset was not created.");
  console.log("generation orchestrator smoke tests passed");
}).catch(error => { console.error(error); process.exit(1); });
