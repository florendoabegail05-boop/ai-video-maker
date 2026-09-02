"use strict";

(function () {
  const PROJECT_KEY = "aivm.creatorStudio.v1";
  const PIPE_KEY = "aivm.productionPipeline.v2";
  const BRIDGE = "http://127.0.0.1:8787";
  const MAX_RETRIES = 2;

  const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const project = () => { const s = read(PROJECT_KEY); return (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0] || null; };

  function directorInput(p) {
    const profiles = p?.blueprint?.profiles || {};
    const c = profiles.character || {}, e = profiles.environment || {}, s = profiles.style || {};
    return { projectId: p?.id || "project", idea: clean(p?.idea), seconds: Number(p?.length || 30), platform: clean(p?.type || "YouTube Short"), genre: p?.type === "Educational Video" ? "education" : "story", audience: "general", tone: "warm", characters: [{ id: "main-character", name: clean(c.name || "Main character"), description: clean(c.description), constraints: [c.age && `Age: ${c.age}`, c.traits && `Traits: ${c.traits}`, c.wardrobe && `Wardrobe: ${c.wardrobe}`].filter(Boolean) }], locations: [{ id: "main-world", name: clean(e.name || "Main world"), description: clean(e.description), constraints: [e.details, e.lighting].map(clean).filter(Boolean) }], props: clean(e.props) ? [{ id: "master-props", name: "Master props", description: clean(e.props) }] : [], style: { id: "style-master", name: clean(s.name || p.style || "Master style"), description: clean(s.description), palette: clean(s.palette), camera: clean(s.camera), lighting: clean(e.lighting || "Soft natural light"), negative: ["text", "watermark", "logo", "extra limbs", "duplicate subjects", "unstable identity", "flicker"] } };
  }

  function mergePlan(p, plan) {
    const old = p.blueprint || {}, oldScenes = old.scenes || [];
    const scenes = plan.shots.map((shot, i) => { const prior = oldScenes[i] || {}; return { number: i + 1, start: plan.story.beats[i].start, end: plan.story.beats[i].start + plan.story.beats[i].duration, action: prior.action || plan.story.beats[i].objective, camera: shot.cameraMovement, emotion: shot.emotion, environment: prior.environment || "Locked master world", voiceover: prior.voiceover || "", imagePrompt: shot.visualPrompt, videoPrompt: `${shot.motionPrompt} Duration ${shot.durationSeconds}s.`, director: { shotId: shot.shotId, beat: shot.beat, objective: shot.objective, continuityIn: shot.continuityIn, continuityOut: shot.continuityOut, references: shot.references } }; });
    return { ...old, scenes, length: plan.story.durationSeconds, hook: plan.story.hook, storyDirector: plan.story, continuityBible: plan.bible, shotDirector: plan.shots, productionPlan: plan, score: Math.max(Number(old.score || 72), 90), updatedAt: Date.now() };
  }

  function resetPipeline(p) { const x = { projectId: p.id, mode: "automatic", state: "queued", shots: (p.blueprint?.scenes || []).map((s, i) => ({ index: i, shotId: s.director?.shotId || `shot-${String(i + 1).padStart(3, "0")}`, status: "planned", approved: false, generation: null, attempts: 0 })), updatedAt: Date.now() }; write(PIPE_KEY, x); return x; }
  async function health() { const r = await fetch(BRIDGE + "/health", { cache: "no-store" }); if (!r.ok) throw new Error(`Local bridge HTTP ${r.status}`); return r.json(); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  function pipeline() { return read(PIPE_KEY); }
  function statusElement() { return document.getElementById("lgStatus"); }
  function setStatus(text) { const el = statusElement(); if (el) el.textContent = text; }
  function shotButton(i) { return document.querySelector(`.lg-generate[data-i="${i}"]`); }

  async function waitForShot(index, timeoutMs = 180000) { const started = Date.now(); while (Date.now() - started < timeoutMs) { const x = pipeline(), s = x.shots?.[index]; if (s?.status === "video-complete") return true; if (s?.status === "failed") return false; await sleep(700); } return false; }
  async function generateWithRepair(index) {
    for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) { const button = shotButton(index); if (!button) throw new Error(`Generate control missing for shot ${index + 1}.`); setStatus(`Generating shot ${index + 1}/${pipeline().shots.length} (attempt ${attempt})…`); button.click(); const ok = await waitForShot(index); if (ok) return true; const x = pipeline(); if (x.shots?.[index]) { x.shots[index].attempts = attempt; x.shots[index].status = "retrying"; x.updatedAt = Date.now(); write(PIPE_KEY, x); } if (attempt <= MAX_RETRIES) { setStatus(`Shot ${index + 1} needs repair. Retrying…`); await sleep(500); } }
    return false;
  }

  async function assemble() {
    const p = project(), x = pipeline();
    const clips = (x.shots || []).map(s => s.generation?.video?.asset?.path || s.generation?.video?.asset?.file || s.generation?.video?.path || s.generation?.video?.outputPath || s.generation?.video?.file).filter(Boolean);
    if (clips.length !== (p?.blueprint?.scenes || []).length) throw new Error("Not every shot produced a local video asset.");
    const r = await fetch(BRIDGE + "/v1/assemble", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clips, outputName: `${(p.name || "ai-video").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.mp4`, preset: "9:16", fps: 30, expectedDuration: Number(p.blueprint.length || 0), captions: p.blueprint.scenes.map(s => ({ start: s.start, end: s.end, text: s.voiceover })).filter(c => c.text) }) });
    const data = await r.json(); if (!r.ok) throw new Error(data.error || "Assembly failed."); return data;
  }

  async function runAutomaticProduction() {
    if (window.AIVM_AUTOPROD_RUNNING) return; const p = project(); if (!p?.blueprint) return; window.AIVM_AUTOPROD_RUNNING = true;
    try { const h = await health(); const ready = h.runners?.image && h.runners?.video; if (!ready) { setStatus("Blueprint ready. Automatic generation is paused until local image + video generation is configured. $0 mode will not use paid services."); return; }
      resetPipeline(p); for (let i = 0; i < p.blueprint.scenes.length; i++) { if (!(await generateWithRepair(i))) throw new Error(`Shot ${i + 1} failed after ${MAX_RETRIES + 1} attempts.`); }
      setStatus("All shots passed generation. Running final assembly + technical QC…"); const result = await assemble(); const x = pipeline(); x.state = result.qc?.passed ? "qc-passed" : "failed"; x.export = { jobId: result.jobId, bytes: result.bytes, qc: result.qc, media: result.media, downloadUrl: BRIDGE + result.downloadUrl }; x.updatedAt = Date.now(); write(PIPE_KEY, x);
      setStatus(`✓ Production complete. Technical QC passed. ${Math.round((result.bytes || 0) / 1024 / 1024 * 10) / 10} MB · ${result.width}×${result.height}. `); const link = document.createElement("a"); link.href = x.export.downloadUrl; link.download = `${(p.name || "ai-video").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.mp4`; link.textContent = "Download final MP4"; link.className = "secondary-button"; statusElement()?.appendChild(document.createTextNode(" ")); statusElement()?.appendChild(link);
    } catch (error) { const x = pipeline(); x.state = "failed"; x.error = clean(error.message); x.updatedAt = Date.now(); write(PIPE_KEY, x); setStatus(`✕ Automatic production stopped: ${error.message}`); } finally { window.AIVM_AUTOPROD_RUNNING = false; }
  }

  function install() { const start = () => setTimeout(async () => { const p = project(); if (!p?.blueprint) return; try { const input = directorInput(p); const plan = window.AIVM_CREATOR_ORCHESTRATOR.createProductionPlan(input); const validation = window.AIVM_CREATOR_ORCHESTRATOR.validateProductionPlan(plan); if (!validation.ok) { setStatus(`✕ Director validation failed: ${validation.issues.join("; ")}`); return; } p.blueprint = mergePlan(p, plan); p.updatedAt = Date.now(); const state = read(PROJECT_KEY); state.projects = (state.projects || []).map(x => x.id === p.id ? p : x); write(PROJECT_KEY, state); setStatus(`✓ Story Director locked ${plan.shots.length} shots. Starting zero-cost local production…`); await sleep(350); await runAutomaticProduction(); } catch (error) { setStatus(`✕ Director setup failed: ${error.message}`); } }, 850); document.addEventListener("click", e => { if (e.target.closest("#createBtn,#regenerateBtn,#qualityCreateBtn")) start(); }); }

  const api = Object.freeze({ directorInput, mergePlan, resetPipeline, runAutomaticProduction });
  if (typeof window !== "undefined") { window.AIVM_AUTOMATIC_PRODUCTION = api; install(); }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
