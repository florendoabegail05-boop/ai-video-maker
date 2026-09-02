"use strict";
(function () {
  const clean = v => String(v ?? "").trim();
  const has = (text, words) => words.some(w => new RegExp(`\\b${w}\\b`, "i").test(text));
  const score = (value, max) => Math.max(0, Math.min(max, value));

  function analyze(input = {}) {
    const idea = clean(input.idea);
    const scenes = Array.isArray(input.scenes) ? input.scenes : [];
    const script = clean(input.script);
    const full = `${idea} ${script} ${scenes.map(s => `${s.action || ""} ${s.voiceover || ""}`).join(" ")}`;
    const checks = {
      premise: idea.length >= 25,
      protagonist: scenes.some(s => clean(s.action).length > 12),
      goal: has(full, ["goal", "wants", "tries", "learns", "finds", "discover", "discovering", "help"]),
      obstacle: has(full, ["challenge", "problem", "obstacle", "tries", "but", "cannot", "can't", "hard"]),
      escalation: scenes.length >= 4,
      turn: has(full, ["surprise", "suddenly", "then", "twist", "realizes", "discovers"]),
      payoff: has(full, ["solves", "solution", "success", "did it", "payoff", "learns"]),
      ending: scenes.length >= 3 && has(full, ["end", "ending", "goodbye", "celebrate", "celebrates", "final"]),
      clarity: scenes.length > 0 && scenes.every(s => clean(s.action).length >= 12),
      pacing: scenes.length >= 3 && scenes.length <= 16
    };
    const weights = { premise: 10, protagonist: 10, goal: 10, obstacle: 10, escalation: 10, turn: 10, payoff: 15, ending: 10, clarity: 10, pacing: 5 };
    const total = Object.keys(checks).reduce((n, key) => n + (checks[key] ? weights[key] : 0), 0);
    const warnings = [];
    if (!checks.goal) warnings.push("Make the protagonist's goal obvious within the first few seconds.");
    if (!checks.obstacle) warnings.push("Add a simple obstacle so the story has tension.");
    if (!checks.payoff) warnings.push("Give the setup a visible payoff rather than simply stopping.");
    if (!checks.ending) warnings.push("Give the final shot a clear emotional or visual ending.");
    if (!checks.turn) warnings.push("Add a small discovery, reversal, or change to avoid a flat middle.");
    if (!checks.clarity) warnings.push("Keep every shot focused on one understandable action.");
    return { version: 1, score: score(total, 100), checks, warnings, ready: total >= 82 && warnings.length <= 2 };
  }

  function pacingPlan(seconds = 30) {
    const length = Number(seconds) || 30;
    const beats = length <= 30 ? ["hook", "setup", "obstacle", "turn", "payoff", "ending"] : length <= 45 ? ["hook", "setup", "goal", "obstacle", "escalation", "turn", "payoff", "ending"] : ["hook", "setup", "goal", "relationship", "obstacle", "escalation", "turn", "attempt", "payoff", "memory", "ending"];
    return beats.map((beat, i) => ({ beat, index: i + 1 }));
  }

  window.AIVM_STORY = Object.freeze({ analyze, pacingPlan });
})();
