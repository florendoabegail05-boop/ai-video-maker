"use strict";
const assert = require("node:assert/strict");
const contracts = require("../media-engine/contracts.js");
const pipeline = require("../media-engine/pipeline.js");
const providers = require("../media-engine/providers.js");
const config = require("../media-engine/config.js");

assert.equal(config.output.defaultWidth, 1080);
assert.equal(config.output.defaultHeight, 1920);
assert.equal(config.providerPolicy.allowSecretInBrowser, false);

const registry = providers.createRegistry();
registry.register({ id: "local-preview", kind: "video", browserSafe: true, requiresSecret: false });
assert.equal(registry.get("local-preview").id, "local-preview");
assert.throws(() => providers.validateProvider({ id: "bad", kind: "video", endpoint: "http://insecure.test" }), /HTTPS/);
assert.throws(() => providers.validateProvider({ id: "bad-secret", kind: "video", endpoint: "https://example.test", browserSafe: true, requiresSecret: true }), /browser-safe/);

const job = contracts.createJob({ kind: "video", providerId: "local-preview", prompt: "A gentle camera push-in" });
assert.equal(job.state, "queued");
const running = contracts.transition(job, "running");
const done = contracts.transition(running, "succeeded", { outputAsset: "asset-1" });
assert.equal(done.state, "succeeded");
assert.throws(() => contracts.transition(done, "running"), /Invalid job transition/);

const plan = pipeline.makePipeline({ story: "A tiny hero discovers a rainbow.", shots: [{ imagePrompt: "hero near rainbow", videoPrompt: "hero looks up and smiles", durationSeconds: 5 }] });
assert.equal(plan.output.width, 1080);
assert.equal(plan.output.height, 1920);
assert.equal(pipeline.validatePipeline(plan).valid, true);
assert.equal(pipeline.validatePipeline(pipeline.makePipeline({ shots: [{ imagePrompt: "", videoPrompt: "" }] })).valid, false);

console.log("Media engine smoke tests passed.");
