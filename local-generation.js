"use strict";
(function () {
  const PROJECT_KEY = "aivm.creatorStudio.v1", PIPE_KEY = "aivm.productionPipeline.v2", BRIDGE = "http://127.0.0.1:8787";
  const $ = id => document.getElementById(id);
  const load = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  function activeProject() { const s = load(PROJECT_KEY); return (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0] || null; }
  async function request(path, body) { const response = await fetch(BRIDGE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json().catch(() => ({ status: "failed", error: "Bridge returned invalid JSON." })); if (!response.ok) throw new Error(data.error || `Bridge returned HTTP ${response.status}.`); return data; }
  async function health() { const response = await fetch(BRIDGE + "/health", { cache: "no-store" }); if (!response.ok) throw new Error(`Bridge returned HTTP ${response.status}.`); return response.json(); }
  function pipelineState(p) { const x = load(PIPE_KEY); if (x.projectId !== p.id || !Array.isArray(x.shots)) return { projectId: p.id, shots: (p.blueprint?.scenes || []).map((_, i) => ({ index: i, status: "planned", approved: false, generation: null })) }; x.shots.forEach((s, i) => { s.index = i; }); return x; }
  function savePipeline(x) { x.updatedAt = Date.now(); save(PIPE_KEY, x); }
  function promptFor(scene, p, kind, previous) {
    const duration = Math.max(1, Number(scene?.end || 0) - Number(scene?.start || 0) || 5);
    if (kind === "image") return { prompt: scene.imagePrompt, project: p.name, shot: scene.number, duration, aspectRatio: "9:16", continuityHandoff: previous || "MASTER START: use the approved character, world and style references." };
    return { prompt: scene.videoPrompt, project: p.name, shot: scene.number, duration, aspectRatio: "9:16", mode: "image-to-video", imageInput: previous?.asset || previous?.url || previous?.path || null, continuityHandoff: `Preserve the exact visual state from the source image. ${scene.videoPrompt}` };
  }
  async function generateShot(index, button) {
    const p = activeProject(), scene = p?.blueprint?.scenes?.[index]; if (!p || !scene) throw new Error("Create a blueprint first.");
    const x = pipelineState(p), shot = x.shots[index] || (x.shots[index] = { index, status: "planned", approved: false });
    button.disabled = true; button.textContent = "Generating…";
    try { shot.status = "generating-image"; savePipeline(x); render(); const image = await request("/v1/generate/image", promptFor(scene, p, "image")); shot.generation = { image, startedAt: Date.now() }; shot.status = "image-complete"; savePipeline(x); render(); const video = await request("/v1/generate/video", promptFor(scene, p, "video", image)); shot.generation.video = video; shot.status = "video-complete"; savePipeline(x); render(); return { image, video }; }
    catch (error) { shot.status = "failed"; shot.error = error.message; savePipeline(x); render(); throw error; }
    finally { button.disabled = false; button.textContent = "Generate shot"; }
  }
  function assetPath(video) { const a = video?.asset; return a?.path || a?.file || video?.path || video?.outputPath || video?.file || null; }
  async function assembleAll() {
    const p = activeProject(), x = pipelineState(p), clips = x.shots.map(s => assetPath(s.generation?.video)).filter(Boolean);
    if (!p?.blueprint) throw new Error("Create a blueprint first.");
    if (clips.length !== (p.blueprint.scenes || []).length) throw new Error("Every shot needs a local video file path from the runner before assembly.");
    return request("/v1/assemble", { clips, outputName: `${(p.name || "ai-video").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase()}.mp4`, preset: "9:16", width: 1080, height: 1920, fps: 30, expectedDuration: Number(p.blueprint.length || 0), captions: p.blueprint.scenes.map(s => ({ start: s.start, end: s.end, text: s.voiceover })).filter(c => c.text) });
  }
  function render() {
    const results = $("results"); if (!results || results.classList.contains("hidden")) return;
    const p = activeProject(); let card = $("localGeneration"); if (!card) { card = document.createElement("section"); card.id = "localGeneration"; card.className = "panel local-generation-card"; results.appendChild(card); }
    if (!p?.blueprint) { card.innerHTML = '<div class="pp-muted">Local generation unlocks after you create a blueprint.</div>'; return; }
    const x = pipelineState(p), shots = p.blueprint.scenes || [], completed = x.shots.filter(s => s.status === "video-complete").length;
    card.innerHTML = `<div class="lg-head"><div><div class="eyebrow">LOCAL AI GENERATION</div><h3>Generate, assemble and export</h3><p class="pp-muted">Secure loopback bridge at <code>127.0.0.1:8787</code>. No cloud key is stored in the browser.</p></div><div class="lg-actions"><button id="lgHealth" class="secondary-button" type="button">Test bridge</button><button id="lgAll" class="primary-button" type="button">Generate all shots</button><button id="lgAssemble" class="primary-button" type="button">Assemble final MP4</button></div></div><div id="lgStatus" class="pp-handoff">${completed}/${shots.length} shots have completed video generation.</div><div class="lg-grid">${shots.map((s,i)=>{const t=x.shots[i]||{};return `<article class="lg-shot"><div class="pp-top"><h4>Shot ${i+1}</h4><span class="pp-status">${esc(t.status||"planned").toUpperCase()}</span></div><p class="pp-muted">${esc(s.action||"")}</p><button class="secondary-button lg-generate" data-i="${i}" type="button">Generate shot</button><details><summary>Runner response</summary><pre>${esc(JSON.stringify(t.generation||null,null,2))}</pre></details></article>`}).join("")}</div>`;
    $("lgHealth").onclick = async () => { const status = $("lgStatus"); try { const h = await health(); status.textContent = `✓ Bridge online. FFmpeg: ${h.ffmpeg}. Image: ${h.runners.image?'ready':'not configured'} · Video: ${h.runners.video?'ready':'not configured'} · Voice: ${h.runners.voice?'ready':'not configured'} · Audio: ${h.runners.audio?'ready':'not configured'}`; } catch (e) { status.textContent = `✕ Bridge unavailable: ${e.message}. Start local-bridge/server.mjs first.`; } };
    card.querySelectorAll(".lg-generate").forEach(button => button.onclick = async () => { const status = $("lgStatus"); try { await generateShot(Number(button.dataset.i), button); status.textContent = "✓ Shot generation request completed."; } catch (e) { status.textContent = `✕ Generation failed: ${e.message}`; } });
    $("lgAll").onclick = async () => { const button = $("lgAll"); button.disabled = true; button.textContent = "Generating…"; try { for (let i = 0; i < shots.length; i++) { const local = card.querySelector(`.lg-generate[data-i="${i}"]`); await generateShot(i, local); } $("lgStatus").textContent = `✓ All ${shots.length} shot generation requests completed.`; } catch (e) { $("lgStatus").textContent = `✕ Stopped: ${e.message}`; } finally { button.disabled = false; button.textContent = "Generate all shots"; } };
    $("lgAssemble").onclick = async () => { const button = $("lgAssemble"), status = $("lgStatus"); button.disabled = true; button.textContent = "Assembling…"; try { const result = await assembleAll(); const link = BRIDGE + result.downloadUrl; status.innerHTML = `✓ Final MP4 assembled (${Math.round((result.bytes || 0) / 1024 / 1024 * 10) / 10} MB). <a href="${esc(link)}" download>Download final video</a>`; } catch (e) { status.textContent = `✕ Assembly failed: ${e.message}`; } finally { button.disabled = false; button.textContent = "Assemble final MP4"; } };
  }
  function boot() { const refresh = () => setTimeout(render, 450); if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh); else refresh(); document.addEventListener("click", e => { if (e.target.closest("#createBtn,#regenerateBtn,#qualityCreateBtn")) refresh(); }); }
  boot();
})();
