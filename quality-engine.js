"use strict";

/* Quality Director v4 — deterministic story craft + controlled image-to-video shot design. */
(function () {
  const KEY = "aivm.creatorStudio.v1";
  const $ = (id) => document.getElementById(id);
  const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
  const esc = (s) => String(s ?? "").replace(/[&<>\"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[c]));
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (s) => { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } };
  const active = (s) => (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0] || null;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  function locks(s) {
    const p = s.profiles || {}, c = p.character || {}, e = p.environment || {}, v = p.style || {};
    return {
      character: clean(`${c.name || "Main character"}. ${c.description || "Stable recognizable identity."} ${c.age ? `Age ${c.age}.` : ""} ${c.traits ? `Traits: ${c.traits}.` : ""} ${c.wardrobe ? `Wardrobe: ${c.wardrobe}.` : ""}`),
      world: clean(`${e.name || "Main world"}. ${e.description || "Stable setting."} ${e.details || ""} ${e.lighting ? `Lighting: ${e.lighting}.` : ""} ${e.props ? `Key props: ${e.props}.` : ""}`),
      style: clean(`${v.name || "Polished cinematic style"}. ${v.description || ""} ${v.palette ? `Palette: ${v.palette}.` : ""} ${v.camera ? `Camera language: ${v.camera}.` : ""}`),
      rules: clean(v.rules || "Stable design, clean composition, no text, no watermark")
    };
  }

  function subjectFromIdea(text) {
    const x = clean(text).replace(/[.!?]+$/g, "");
    return x || "the main character's discovery";
  }

  function storyPlan(text, type) {
    const subject = subjectFromIdea(text), educational = type === "Educational Video";
    return {
      premise: `A character faces a simple situation involving ${subject}.`,
      centralQuestion: educational ? `What can the viewer learn from ${subject}?` : `What will happen when the character encounters ${subject}?`,
      protagonistGoal: educational ? `Understand or demonstrate the key idea behind ${subject}.` : `Discover, solve, reach, or understand something connected to ${subject}.`,
      obstacle: `One small, visible problem makes the goal harder and creates a reason to keep watching.`,
      payoff: `The final result visibly follows from the character's earlier choice or action.`,
      emotionalArc: "curiosity → hope → tension → determination → relief → joy",
      audiencePromise: educational ? "Deliver one clear, memorable takeaway." : "Deliver one clear question, rising anticipation, and an earned emotional payoff."
    };
  }

  const beatTemplates = {
    HOOK: { action: x => `Open on ${x} with an immediately readable visual mystery or surprising detail. The viewer should understand what to look at within the first second.`, camera: "Start in a clear medium-wide composition, then use a gentle push-in.", emotion: "curious", audio: "Tiny attention cue followed by a light musical lift." },
    SETUP: { action: x => `Show the character noticing ${x} and making one clear choice that establishes what they want next.`, camera: "Eye-level medium shot with a restrained tracking move.", emotion: "hopeful", audio: "Light ambience with a simple rhythmic bed." },
    DESIRE: { action: x => `Show the character actively pursuing the goal connected to ${x}; make the desired result visually obvious.`, camera: "Smooth follow shot with one intentional camera move.", emotion: "determined", audio: "Curious forward-moving pulse." },
    OBSTACLE: { action: x => `Introduce one small, understandable obstacle related to ${x}. The obstacle should interrupt the plan without changing the world.`, camera: "Stable medium shot, then a controlled close-up on the reaction.", emotion: "concerned", audio: "Brief tension accent, then space for the reaction." },
    ESCALATION: { action: x => `The character makes one stronger attempt involving ${x}; the difficulty increases slightly while remaining easy to follow.`, camera: "Slightly tighter framing with measured forward movement.", emotion: "frustrated then brave", audio: "Music rises one step with a single action cue." },
    TURN: { action: x => `Reveal one clear discovery, idea, helper, or opportunity that changes how the character can solve the problem involving ${x}.`, camera: "Clean reveal with a small lateral move; keep the new information visually isolated.", emotion: "surprised and hopeful", audio: "Short reveal accent followed by renewed hopeful music." },
    ATTEMPT: { action: x => `The character uses the new idea to make one focused attempt toward the goal involving ${x}.`, camera: "Purposeful side angle with a gentle push toward the action.", emotion: "focused", audio: "Rhythmic build with one clear movement cue." },
    PAYOFF: { action: x => `Show direct cause and effect: the character's action produces the desired result involving ${x}, followed by a readable emotional reaction.`, camera: "Close on the key action, then widen slightly for the reaction.", emotion: "delighted", audio: "Warm musical resolution and one satisfying result cue." },
    MEMORY: { action: x => `Hold on the strongest visual result of ${x} so the audience can absorb the emotion and remember the moment.`, camera: "Hero framing with very gentle parallax or a slow controlled drift.", emotion: "joyful calm", audio: "Music opens and settles so the visual can breathe." },
    ENDING: { action: x => `Close with a warm, earned final reaction that confirms the story is complete and leaves a natural emotional aftertaste.`, camera: "Friendly medium shot with a tiny push-in; finish stable.", emotion: "warm and happy", audio: "Short musical button with a clean tail." }
  };

  function beatsFor(n) {
    const maps = {
      3: ["HOOK", "PAYOFF", "ENDING"], 4: ["HOOK", "SETUP", "PAYOFF", "ENDING"],
      5: ["HOOK", "SETUP", "OBSTACLE", "PAYOFF", "ENDING"],
      6: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "PAYOFF", "ENDING"],
      7: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "TURN", "PAYOFF", "ENDING"],
      8: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "ESCALATION", "PAYOFF", "MEMORY", "ENDING"],
      9: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "ESCALATION", "TURN", "PAYOFF", "MEMORY", "ENDING"],
      10: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "ESCALATION", "TURN", "ATTEMPT", "PAYOFF", "MEMORY", "ENDING"],
      11: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "ESCALATION", "TURN", "ATTEMPT", "PAYOFF", "MEMORY", "ENDING", "ENDING"],
      12: ["HOOK", "SETUP", "DESIRE", "OBSTACLE", "ESCALATION", "TURN", "ATTEMPT", "PAYOFF", "MEMORY", "MEMORY", "ENDING", "ENDING"]
    };
    return maps[n] || maps[6];
  }

  function makeImagePrompt(p, role, template, l, i, n) {
    return [
      `Vertical 9:16 ${p.style || "cinematic animation"}.`,
      `Story beat: ${role}. ${template.action(subjectFromIdea(p.idea))}`,
      `Character anchor: ${l.character}`,
      `World anchor: ${l.world}`,
      `Style anchor: ${l.style}`,
      `Composition: one dominant focal point; readable silhouette; clean foreground, midground and background separation; intentional depth; leave safe space for captions when needed.`,
      `Emotion: ${template.emotion}.`,
      `Continuity: preserve identity, proportions, wardrobe, props, lighting direction, palette, world geometry, and established screen direction across all shots.`,
      `Shot ${i + 1} of ${n}; frame the action so the next shot can begin from a stable state.`,
      `Quality rules: ${l.rules}.`
    ].join(" ");
  }

  function makeMotionPrompt(role, template) {
    const subjectAction = role === "PAYOFF" ? "completes the key action and reacts with visible delight" : role === "ENDING" ? "settles into a warm final reaction and holds the ending pose" : role === "MEMORY" ? "makes only a tiny natural movement while the result remains clear" : "performs one clear physical action connected to the story";
    return [
      `Use the supplied image as the approved first frame.`, `${template.camera}`,
      `The subject ${subjectAction}.`, `Add only subtle secondary environmental motion that already exists in the image.`,
      `5 seconds: action starts clearly, develops smoothly, reaches a readable result, then settles into a stable final state.`,
      `Preserve face/character identity, wardrobe, props, scene geometry, lighting direction, framing and screen direction. Do not redesign the scene.`
    ].join(" ");
  }

  function check(ideaText, scenes, script) {
    const text = clean(ideaText), roles = scenes.map(s => s.role);
    const hasHook = roles[0] === "HOOK", hasSetup = roles.includes("SETUP"), hasDesire = roles.includes("DESIRE"), conflict = roles.includes("OBSTACLE") || roles.includes("ESCALATION"), turn = roles.includes("TURN"), payoff = roles.includes("PAYOFF"), ending = roles.includes("ENDING");
    const oneAction = scenes.filter(s => (s.videoPrompt.match(/\band\b|then|followed by/gi) || []).length <= 1).length;
    const continuity = scenes.filter(s => clean(s.continuityInput).length > 25 && /Character anchor|identity/i.test(s.imagePrompt)).length;
    const distinctEmotions = new Set(scenes.map(s => s.emotion)).size;
    const voiceWords = clean(script).split(/\s+/).filter(Boolean).length, voiceFit = voiceWords <= Math.max(45, Math.round((scenes.length * 5) * 2.2));
    const story = (hasHook ? 7 : 0) + (hasSetup ? 8 : 0) + (hasDesire ? 7 : 0) + (conflict ? 10 : 0) + (turn ? 4 : 0) + (payoff ? 9 : 0) + (ending ? 5 : 0);
    const visual = 15, motion = Math.round(15 * oneAction / Math.max(1, scenes.length)), continuityScore = Math.round(15 * continuity / Math.max(1, scenes.length)), audio = voiceFit ? 5 : 2, input = text.length >= 60 ? 5 : text.length >= 30 ? 4 : 2;
    const penalties = (distinctEmotions < Math.min(4, scenes.length) ? 2 : 0) + (!turn && scenes.length >= 7 ? 2 : 0);
    const score = clamp(story + visual + motion + continuityScore + audio + input - penalties, 0, 94), issues = [];
    if (text.length < 30) issues.push("Strengthen the idea with a specific subject, goal, and desired outcome.");
    if (!hasHook) issues.push("The first shot must be a true hook, not a generic introduction.");
    if (!hasSetup || !hasDesire) issues.push("Make the protagonist's goal visible before the obstacle.");
    if (!conflict) issues.push("Add one simple obstacle so the payoff feels earned.");
    if (scenes.length >= 7 && !turn) issues.push("Add a meaningful turn or discovery before the payoff.");
    if (!payoff) issues.push("Add visible cause-and-effect payoff.");
    if (!ending) issues.push("Give the audience a clean ending rather than stopping after the payoff.");
    if (oneAction < Math.ceil(scenes.length * 0.85)) issues.push("Simplify motion prompts so each shot has one dominant action.");
    if (continuity < scenes.length) issues.push("Every shot needs a continuity handoff/state note.");
    if (!voiceFit) issues.push("Shorten voiceover so it can be delivered comfortably within the runtime.");
    return { score, pass: score >= 85 && issues.length === 0, scores: { story, visual, motion, continuity: continuityScore, audio, input }, issues, gates: { hook: hasHook, goal: hasSetup && hasDesire, conflict, turn: scenes.length < 7 || turn, payoff, ending, oneDominantAction: oneAction >= Math.ceil(scenes.length * 0.85), continuity: continuity === scenes.length, voiceFit } };
  }

  function make(p, s) {
    const n = clamp(Math.round(Number(p.length || 30) / 5), 3, 12), subject = subjectFromIdea(p.idea), plan = storyPlan(p.idea, p.type), roles = beatsFor(n), l = locks(s);
    const scenes = roles.map((role, i) => {
      const t = beatTemplates[role], start = i * 5, end = start + 5, nextRole = roles[i + 1] || null;
      const firstState = i === 0 ? "Master reference: approved starting pose, facing direction and prop state." : `Begin from Shot ${i} final state; preserve pose, facing direction, prop state and lighting before movement.`;
      const lastState = role === "PAYOFF" ? "Stable happy result; hold for transition." : role === "ENDING" ? "Stable final reaction; clean hold for final frame." : `Stable end state that clearly sets up the next beat (${nextRole || "end"}).`;
      return {
        number: i + 1, start, end, role, action: t.action(subject), camera: t.camera, emotion: t.emotion, environment: l.world,
        voiceover: p.includeVoice !== false ? (role === "HOOK" ? "Look closely... something is about to happen!" : role === "PAYOFF" ? "We did it!" : role === "ENDING" ? "What a wonderful little adventure!" : role === "TURN" ? "Wait... I know what we can do!" : "Let's see what happens next!") : "",
        imagePrompt: makeImagePrompt(p, role, t, l, i, n), videoPrompt: makeMotionPrompt(role, t), audioDirection: t.audio,
        continuityInput: firstState, firstFrameState: firstState, lastFrameState: lastState,
        nextShotHandoff: nextRole ? `Next shot begins from this final state: ${lastState}` : "Final state: hold cleanly for the ending/export.",
        negativePrompt: "Avoid identity drift, face changes, extra fingers/limbs, duplicated objects, warped props, texture flicker, sudden lighting changes, background redesign, camera jitter, unintended zooms, text, logos and watermarks."
      };
    });
    const script = scenes.map(x => x.voiceover).filter(Boolean).join(" ") + (p.includeCta !== false ? " Follow for the next little adventure!" : ""), qc = check(p.idea, scenes, script);
    return {
      version: 4, idea: p.idea, type: p.type, length: scenes.length * 5, style: p.style, includeCta: p.includeCta, includeVoice: p.includeVoice,
      hook: `First 2 seconds: create one unanswered question about ${subject.toLowerCase()}.`, script, scenes, score: qc.score,
      title: p.type === "Educational Video" ? `Learn This: ${subject} 📚` : `${subject} ✨ | A Tiny Adventure`,
      description: `A story-first short built around a clear goal, rising tension, visual cause-and-effect, an earned payoff, and continuity-controlled shots.`,
      hashtags: "#Shorts #AIVideo #Animation #Storytelling", ideas: [], profiles: s.profiles || {}, qualityDirector: true,
      storyPlan: { ...plan, beats: roles }, qc, updatedAt: Date.now()
    };
  }

  function renderQC(b) {
    let panel = $("qualityPanel");
    if (!panel) { panel = document.createElement("div"); panel.id = "qualityPanel"; panel.className = "result-section quality-panel"; const r = $("results"); if (r) r.insertBefore(panel, r.firstElementChild); }
    const q = b.qc || check(b.idea, b.scenes, b.script), status = q.pass ? "READY TO GENERATE" : "NEEDS REFINEMENT";
    const gateList = Object.entries(q.gates).map(([k, v]) => `<span class="qc-gate ${v ? "pass" : "fail"}">${v ? "✓" : "!"} ${esc(k)}</span>`).join("");
    panel.innerHTML = `<div class="section-label">QUALITY GATE</div><div class="qc-heading"><h3>${status}</h3><strong>${q.score}/100</strong></div><p class="helper">Story ${q.scores.story}/50 · Visual ${q.scores.visual}/15 · Motion ${q.scores.motion}/15 · Continuity ${q.scores.continuity}/15 · Audio ${q.scores.audio}/5 · Input ${q.scores.input}/5</p><div class="qc-gates">${gateList}</div>${q.issues.length ? q.issues.map(x => `<div class="idea-item qc-issue">⚠ ${esc(x)}</div>`).join("") : `<div class="idea-item qc-pass">✓ All quality gates passed.</div>`}<button id="qualityRecheckBtn" class="secondary-button" type="button">↻ Recheck quality</button>`;
    $("qualityRecheckBtn").onclick = () => { const s = read(), p = active(s); if (!p?.blueprint) return; p.blueprint.qc = check(p.blueprint.idea, p.blueprint.scenes, p.blueprint.script); p.blueprint.score = p.blueprint.qc.score; save(s); render(p.blueprint); };
  }

  function render(b) {
    $("videoSummary").textContent = `${b.type} • ${b.length}s • ${b.style} • ${b.scenes.length} shots • Quality Director v4`;
    $("resultTitle").textContent = b.title; $("hook").textContent = b.hook; $("script").textContent = b.script; $("score").textContent = b.score; $("sceneCountBadge").textContent = `${b.scenes.length} × 5s shots`;
    $("title").textContent = b.title; $("description").textContent = b.description; $("hashtags").textContent = b.hashtags;
    $("ideaList").innerHTML = b.scenes.map((x, i) => `<div class="idea-item"><b>${i + 1}.</b> ${esc(x.role)} — ${esc(x.action)}</div>`).join("");
    $("scenes").innerHTML = b.scenes.map((x, i) => `<div class="scene" data-scene-index="${i}"><div class="scene-head"><h4>Scene ${i + 1} · ${esc(x.role)}</h4><div class="scene-tools"><span class="timing">${x.start}s–${x.end}s</span></div></div><div class="scene-editor"><label>Story action<textarea data-field="action">${esc(x.action)}</textarea></label><label>Camera<input data-field="camera" value="${esc(x.camera)}"></label><label>Emotion<input data-field="emotion" value="${esc(x.emotion)}"></label><label>Environment<input data-field="environment" value="${esc(x.environment)}"></label><label>Voiceover<textarea data-field="voiceover">${esc(x.voiceover)}</textarea></label><label>Image prompt<textarea data-field="imagePrompt">${esc(x.imagePrompt)}</textarea></label><label>Image-to-video motion<textarea data-field="videoPrompt">${esc(x.videoPrompt)}</textarea></label><label>Audio direction<input data-field="audioDirection" value="${esc(x.audioDirection)}"></label><label>First-frame state<input data-field="firstFrameState" value="${esc(x.firstFrameState)}"></label><label>Last-frame state<input data-field="lastFrameState" value="${esc(x.lastFrameState)}"></label><label>Next-shot handoff<input data-field="nextShotHandoff" value="${esc(x.nextShotHandoff)}"></label><label>Continuity handoff<input data-field="continuityInput" value="${esc(x.continuityInput)}"></label><label>Negative / failure safeguards<textarea data-field="negativePrompt">${esc(x.negativePrompt)}</textarea></label></div></div>`).join("");
    $("results").classList.remove("hidden"); renderQC(b);
  }

  function persistBlueprint(s, p, b) { p.blueprint = b; p.updatedAt = Date.now(); s.activeProjectId = p.id; save(s); }

  function run() {
    const s = read(), p = active(s); if (!p) { $("newProjectBtn")?.click(); return; }
    const ideaInput = $("idea"), idea = clean(ideaInput?.value); if (!idea) { ideaInput?.focus(); return; }
    p.name = clean($("projectName")?.value) || p.name || "Untitled Video"; p.idea = idea; p.type = $("type")?.value || p.type; p.length = Number($("length")?.value || p.length || 30); p.style = $("style")?.value || p.style; p.includeCta = $("includeCta")?.checked !== false; p.includeVoice = $("includeVoice")?.checked !== false;
    const b = make(p, s); persistBlueprint(s, p, b); render(b); $("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function install() {
    const create = $("createBtn");
    if (create && !create.dataset.qdBound) { create.dataset.qdBound = "1"; create.addEventListener("click", (e) => { e.preventDefault(); e.stopImmediatePropagation(); run(); }, true); }
    if (!$("qualityCreateBtn") && create) { const b = document.createElement("button"); b.id = "qualityCreateBtn"; b.type = "button"; b.className = "primary-button quality-button"; b.textContent = "✦ Create EXCELLENT video plan"; create.insertAdjacentElement("afterend", b); b.addEventListener("click", run); const note = document.createElement("p"); note.className = "privacy-note"; note.textContent = "Quality Director v4: story gates, controlled motion, continuity states and generation-ready shot packages — local and free."; b.insertAdjacentElement("afterend", note); }
  }

  window.AIVMQualityDirector = { make, check, run, version: 4 };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
