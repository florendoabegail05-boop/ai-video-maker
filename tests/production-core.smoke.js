"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

function load(path) {
  const context = { window: {}, globalThis: {}, crypto: { randomUUID: () => "test-id" }, Date, Math, console };
  context.globalThis = context.window;
  vm.runInNewContext(fs.readFileSync(path, "utf8"), context, { filename: path });
  return context.window;
}

const root = process.cwd();
const generation = load(`${root}/generation-contract.js`).AIVM_GENERATION;
const story = load(`${root}/story-engine.js`).AIVM_STORY;
const assembly = load(`${root}/media-assembly.js`).AIVM_ASSEMBLY;

const job = generation.makeJob({ kind: "video", providerId: "demo", prompt: "A gentle camera push-in" });
assert.equal(job.schemaVersion, 1);
assert.equal(job.status, "queued");
assert.equal(job.kind, "video");
assert.throws(() => generation.makeJob({ kind: "video" }));
assert.throws(() => generation.validateProvider({ id: "x", name: "X", kinds: ["video"], endpoint: "http://unsafe" }));

const packageData = generation.createProductionPackage({ name: "Demo", idea: "A hero finds a lost star", type: "YouTube Short", length: 10, scenes: [{ action: "Finds the star", camera: "Push in", emotion: "Curious", imagePrompt: "hero and star", videoPrompt: "hero reaches", voiceover: "Look!" }, { action: "Returns the star", camera: "Track", emotion: "Happy", imagePrompt: "hero returns", videoPrompt: "hero walks", voiceover: "We did it!" }] });
assert.equal(packageData.shots.length, 2);
assert.equal(packageData.assembly.canvas, "1080x1920");
assert.equal(generation.migratePackage({}).schemaVersion, 1);

const analysis = story.analyze({ idea: "A curious hero discovers a secret and wants to help a friend", script: "Then a challenge appears. Suddenly the hero discovers a solution and celebrates at the end.", scenes: [{ action: "The hero discovers the secret" }, { action: "A challenge appears" }, { action: "The hero solves the problem" }, { action: "The friends celebrate at the end" }] });
assert(analysis.score >= 80);
assert(Array.isArray(story.pacingPlan(30)));

const plan = assembly.plan({ duration: 10, shots: packageData.shots.map(s => ({ ...s, outputAssetId: `asset-${s.id}` })), voiceAssetId: "voice-1", musicAssetId: "music-1" });
assert.equal(plan.tracks.video.length, 2);
assert.equal(assembly.validate(plan).ready, true);
assert.equal(assembly.validate(assembly.plan({ shots: packageData.shots })).ready, false);

console.log("production core smoke tests passed");
