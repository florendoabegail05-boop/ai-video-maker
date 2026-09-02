"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("quality-engine.js", "utf8");
const sandbox = {
  window: {},
  document: { readyState: "loading", addEventListener() {} },
  localStorage: { getItem() { return null; }, setItem() {} },
  console
};
vm.runInNewContext(source, sandbox, { filename: "quality-engine.js" });
const director = sandbox.window.AIVMQualityDirector;
assert.equal(director.version, 4);

const state = {
  profiles: {
    character: { name: "Milo", description: "A small friendly bear", age: "10 months", traits: "curious", wardrobe: "blue shirt" },
    environment: { name: "Rainbow World", description: "soft green hills", details: "colorful flowers", lighting: "soft morning light", props: "yellow bag" },
    style: { name: "Kids 3D Animation", description: "polished child-friendly 3D", palette: "bright harmonious", camera: "gentle cinematic", rules: "stable design, no text, no watermark" }
  }
};
const project = { idea: "A baby bear wants to reach a glowing rainbow flower but a tiny stream blocks the path", type: "YouTube Short", length: 30, style: "Kids 3D Animation", includeCta: true, includeVoice: true };
const blueprint = director.make(project, state);

assert.equal(blueprint.version, 4);
assert.equal(blueprint.scenes.length, 6);
assert.deepEqual(blueprint.scenes.map(s => s.role), ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "PAYOFF", "ENDING"]);
assert.equal(blueprint.scenes[0].start, 0);
assert.equal(blueprint.scenes[5].end, 30);
assert.ok(blueprint.scenes.every(s => s.imagePrompt.includes("Character anchor:")));
assert.ok(blueprint.scenes.every(s => s.videoPrompt.includes("approved first frame")));
assert.ok(blueprint.scenes.every(s => s.lastFrameState.length > 10));
assert.ok(blueprint.scenes.every(s => s.nextShotHandoff.length > 10));
assert.ok(blueprint.scenes.every(s => s.negativePrompt.includes("identity drift")));
assert.equal(blueprint.qc.gates.hook, true);
assert.equal(blueprint.qc.gates.goal, true);
assert.equal(blueprint.qc.gates.conflict, true);
assert.equal(blueprint.qc.gates.payoff, true);
assert.equal(blueprint.qc.gates.ending, true);
assert.equal(blueprint.qc.pass, true);
assert.ok(blueprint.qc.score >= 85 && blueprint.qc.score <= 94);

const weak = director.make({ ...project, idea: "cat" }, state);
assert.equal(weak.qc.pass, false);
assert.ok(weak.qc.issues.length > 0);

const long = director.make({ ...project, length: 60 }, state);
assert.equal(long.scenes.length, 12);
assert.ok(long.scenes.some(s => s.role === "TURN"));
assert.ok(long.qc.gates.turn);

console.log("Quality Director smoke tests passed.");
