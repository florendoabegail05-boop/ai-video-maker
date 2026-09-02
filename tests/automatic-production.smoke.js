"use strict";

const assert = require("node:assert/strict");
const auto = require("../movie-engine/automatic-production.js");

const project = {
  id: "p-test", name: "Test Story", idea: "A tiny bear finds a rainbow.", type: "YouTube Short", length: 30, style: "Kids 3D Animation",
  blueprint: { profiles: {
    character: { name: "Biboy", description: "A warm brown baby bear.", age: "10 months", traits: "curious", wardrobe: "blue shirt" },
    environment: { name: "Rainbow World", description: "Soft green hills and flowers.", details: "friendly rounded trees", lighting: "soft daylight", props: "yellow adventure bag" },
    style: { name: "Kids 3D Animation", description: "Polished child-friendly 3D", palette: "bright", camera: "gentle cinematic", rules: "no text" }
  }, scenes: Array.from({ length: 6 }, (_, i) => ({ action: `Action ${i + 1}`, voiceover: `Line ${i + 1}`, environment: "Rainbow World" })) }
};

const input = auto.directorInput(project);
assert.equal(input.seconds, 30);
assert.equal(input.characters[0].name, "Biboy");
assert.equal(input.locations[0].name, "Rainbow World");
assert.equal(input.style.name, "Kids 3D Animation");

const plan = {
  story: { durationSeconds: 30, hook: "Hook", beats: Array.from({ length: 6 }, (_, i) => ({ start: i * 5, duration: 5, objective: `Objective ${i + 1}` })) },
  bible: { projectId: "p-test" },
  shots: Array.from({ length: 6 }, (_, i) => ({ shotId: `shot-${String(i + 1).padStart(3, "0")}`, cameraMovement: "push-in", emotion: "curious", visualPrompt: "visual", motionPrompt: "motion", beat: "story", objective: "objective", continuityIn: i ? `shot-${String(i).padStart(3, "0")}` : null, continuityOut: i < 5 ? `shot-${String(i + 2).padStart(3, "0")}` : null, references: { characters: ["main-character"], locations: ["main-world"], props: [] }, durationSeconds: 5 }))
};
const merged = auto.mergePlan(project, plan);
assert.equal(merged.scenes.length, 6);
assert.equal(merged.scenes[0].director.shotId, "shot-001");
assert.equal(merged.scenes[5].videoPrompt.includes("Duration 5s"), true);

const store = { getItem: () => null, setItem: () => {} };
const job = auto.resetPipeline({ ...project, blueprint: merged });
assert.equal(job.mode, "automatic");
assert.equal(job.shots.length, 6);

console.log("Automatic production smoke tests passed.");
