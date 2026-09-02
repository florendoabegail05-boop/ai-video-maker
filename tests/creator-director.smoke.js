"use strict";
const assert = require("node:assert/strict");
const story = require("../movie-engine/story-director.js");
const bible = require("../movie-engine/continuity-bible.js");
const shots = require("../movie-engine/shot-director.js");
const jobs = require("../movie-engine/job-manager.js");
const orchestrator = require("../movie-engine/creator-orchestrator.js");

globalThis.AIVM_STORY_DIRECTOR = story;
globalThis.AIVM_CONTINUITY_BIBLE = bible;
globalThis.AIVM_SHOT_DIRECTOR = shots;

const plan = orchestrator.createProductionPlan({
  projectId: "smoke", idea: "A baby bear discovers a hidden rainbow and learns to share it", seconds: 30,
  format: "9:16", style: { name: "Kids 3D", description: "polished friendly animation", palette: "bright", camera: "gentle cinematic", lighting: "soft", negative: ["text"] },
  characters: [{ id: "bear", name: "Biboy", description: "small brown baby bear with blue shirt" }],
  locations: [{ id: "rainbow-world", name: "Rainbow World", description: "green hills and colorful flowers" }]
});
assert.equal(plan.story.durationSeconds, 30);
assert.equal(plan.shots.length, 6);
assert.equal(orchestrator.validateProductionPlan(plan).ok, true);
assert.match(plan.shots[1].visualPrompt, /Biboy/);
assert.match(plan.shots[1].motionPrompt, /Continue directly/);

const memory = new Map();
const storage = { get: key => memory.get(key) || null, set: (key, value) => memory.set(key, value) };
const job = jobs.createJob({ id: "job-smoke", projectId: "smoke", shots: plan.shots, maxRetries: 2 }, storage);
assert.equal(jobs.resumePlan(job).length, 1);
jobs.updateShot(job.jobId, "shot-001", { state: "complete", assetPath: "shot-001.mp4", attempts: 1 }, storage);
const resumed = jobs.listJobs(storage)[0];
assert.equal(jobs.resumePlan(resumed)[0], "shot-002");
jobs.updateJob(job.jobId, { state: "generating" }, storage);
assert.equal(jobs.listJobs(storage)[0].state, "generating");
console.log("Creator director smoke tests passed.");
