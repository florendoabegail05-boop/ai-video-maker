"use strict";

const contracts = typeof require === "function" ? require("./contracts") : globalThis.AIVM_MOVIE_CONTRACTS;
const planner = typeof require === "function" ? require("./planner") : globalThis.AIVM_MOVIE_PLANNER;
const continuity = typeof require === "function" ? require("./continuity") : globalThis.AIVM_CONTINUITY;
const qc = typeof require === "function" ? require("./qc") : globalThis.AIVM_MOVIE_QC;

function createMovieBlueprint(options = {}) {
  const project = contracts.createMovieProject(options);
  const plan = planner.planMovie(options);
  const validation = planner.validateStoryPlan(plan);
  return { project, plan, validation };
}

function buildMovieRenderManifest(shots = []) {
  const segments = shots.map((shot, index) => ({
    order: index + 1,
    shotId: shot.shotId,
    assetId: shot.generatedAssets?.[0]?.assetId || null,
    durationSeconds: Number(shot.durationSeconds),
    previousShotId: shot.previousShotId || null
  }));
  return { schemaVersion: 1, segments };
}

const api = Object.freeze({ contracts, planner, continuity, qc, createMovieBlueprint, buildMovieRenderManifest });
if (typeof window !== "undefined") window.AIVM_MOVIE_ENGINE = api;
if (typeof module !== "undefined" && module.exports) module.exports = api;
