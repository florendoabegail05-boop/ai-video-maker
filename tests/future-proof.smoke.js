"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const configSource = fs.readFileSync("app-config.js", "utf8");
const providerSource = fs.readFileSync("provider-registry.js", "utf8");
const loadedElements = [];
const document = {
  querySelector(selector) {
    const match = /^(script|link)\[data-aivm="([^"]+)"\]$/.exec(selector);
    assert.ok(match, `Unexpected selector: ${selector}`);
    return loadedElements.find(element => element.tagName === match[1] && element.dataset.aivm === match[2]) || null;
  },
  createElement(tagName) { return { tagName, dataset: {} }; },
  head: { appendChild(element) { loadedElements.push(element); } }
};
const context = { window: {}, document, crypto: { randomUUID: () => "test-job-id" } };
vm.runInNewContext(configSource, context);
vm.runInNewContext(providerSource, context);

assert.deepEqual(loadedElements.map(element => element.src || element.href), [
  "monetization-engine.js", "youtube-upload-engine.js", "youtube-upload.css"
]);
vm.runInNewContext(configSource, context);
assert.equal(loadedElements.length, 3, "Config reload must not duplicate scripts or styles");
assert.equal(context.window.AIVM_CONFIG.schemaVersion, 3);
assert.equal(context.window.AIVM_CONFIG.security.allowFrontendSecrets, false);
assert.equal(context.window.AIVM_CONFIG.security.allowRuntimeNetwork, false);
assert.equal(context.window.AIVM_PROVIDERS.kinds.includes("video"), true);
assert.throws(() => context.window.AIVM_PROVIDERS.register({ id: "bad", name: "Bad", kinds: ["video"], endpoint: "http://insecure" }), /HTTPS/);
const provider = context.window.AIVM_PROVIDERS.register({ id: "test-video", name: "Test Video", kinds: ["video"] });
assert.equal(provider.id, "test-video");
const job = context.window.AIVM_PROVIDERS.createJob({ providerId: "test-video", kind: "video", prompt: "gentle camera push" });
assert.equal(job.schemaVersion, 1);
assert.equal(job.providerId, "test-video");
assert.equal(job.jobId, "test-job-id");
assert.throws(() => context.window.AIVM_PROVIDERS.createJob({ providerId: "test-video", kind: "image" }), /not available/);

const html = fs.readFileSync("index.html", "utf8");
for (const asset of ["app-config.js", "provider-registry.js", "app.js", "quality-engine.js", "production-pipeline.js", "local-generation.js"]) {
  assert.match(html, new RegExp(`<script src=[\"']${asset.replace(/[-.]/g, "\\$&")}['\"] defer>`));
}
assert.match(html, /connect-src 'self' http:\/\/127\.0\.0\.1:8787 http:\/\/localhost:8787/);
assert.doesNotMatch(html, /<script\s*>/i);
assert.doesNotMatch(html, /style\s*=/i);
console.log("future-proof foundation smoke tests passed");
