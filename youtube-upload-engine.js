"use strict";

/* YouTube Upload Pack + automatic improvement layer.
   Local-first: prepares metadata/checklists and improves weak blueprints.
   It never fabricates metrics, bypasses YouTube policy, or auto-publishes. */
const YT_UPLOAD_KEY = "aivm.youtubeUpload.v1";

const YouTubeUploadEngine = (() => {
  const esc = s => String(s || "").replace(/[<>]/g, "");
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const keywords = text => [...new Set(norm(text).split(" ").filter(w => w.length > 3))].slice(0, 20);

  function makePack(bp) {
    const idea = bp.idea || "Untitled adventure";
    const title = (bp.title || idea).replace(/\s+/g, " ").trim().slice(0, 100);
    const description = `${bp.description || `A short, original ${bp.type || "video"} about ${idea}.`}\n\nMade for clear, family-friendly storytelling with original characters and visuals.\n\n#Shorts #Animation`;
    const tags = keywords(`${idea} ${bp.style || "animation"} ${bp.type || "YouTube Short"}`).join(", ");
    return {
      title,
      description,
      hashtags: bp.hashtags || "#Shorts #Animation",
      tags,
      thumbnailPrompt: `Create a clear, colorful 16:9 YouTube thumbnail for: ${idea}. Feature the locked main character and one strong story moment. Big readable facial expression, simple composition, strong subject separation, no misleading imagery, no text unless added separately.`,
      audience: /kids|baby|toddler|preschool|children|nursery/i.test(`${idea} ${bp.type || ""}`) ? "Review carefully: likely Made for Kids" : "Review audience setting before upload",
      formatChecklist: [
        "Vertical 9:16 for Shorts",
        `${bp.length || 0}s runtime",
        "Original/authorized visuals, music and audio",
        "No watermark or accidental third-party branding",
        "Review title, description, hashtags and tags",
        "Set the correct audience designation in YouTube",
        "Run the originality/quality guard before publishing"
      ]
    };
  }

  function improve(bp, analysis) {
    const out = JSON.parse(JSON.stringify(bp));
    const issues = analysis?.issues || [];
    if (analysis?.matches?.[0]?.score >= 75) {
      out.idea = `${out.idea} with a new goal, setting detail, discovery and unexpected but child-friendly ending`;
      out.hook = `A brand-new surprise is waiting: can our hero discover what happens next?`;
    }
    if (!out.hook || out.hook.length < 20) out.hook = `Wait and see what our little hero discovers!`;
    if (!out.script || out.script.length < 80) out.script = `${out.hook} Our hero explores, faces a tiny challenge, discovers something new, and celebrates the result.`;
    const scenes = out.scenes || [];
    scenes.forEach((s, i) => {
      if (!s.action || issues.some(x => /repetitive|thin|few scenes/i.test(x))) {
        const beats = ["notice a clue", "make a playful choice", "discover a surprise", "try a new action", "solve a tiny challenge", "share the discovery", "celebrate the lesson", "finish with a memorable visual payoff"];
        s.action = `The hero ${beats[i % beats.length]} connected to ${out.idea}. Make the action visibly different from the previous shot and advance the story.`;
      }
    });
    out.ideas = [...(out.ideas || []), `A completely different challenge inspired by ${out.idea}`].slice(0, 10);
    out.updatedAt = Date.now();
    return out;
  }

  function savePack(projectId, pack) {
    try { const all = JSON.parse(localStorage.getItem(YT_UPLOAD_KEY) || "{}"); all[projectId || "active"] = { pack, savedAt: Date.now() }; localStorage.setItem(YT_UPLOAD_KEY, JSON.stringify(all)); } catch {}
  }
  return { makePack, improve, savePack };
})();

function initYouTubeUploadEngine() {
  if (document.getElementById("youtubeUploadPanel")) return;
  const results = document.getElementById("results");
  if (!results) return;
  const panel = document.createElement("section");
  panel.id = "youtubeUploadPanel";
  panel.className = "result-section youtube-upload-panel";
  panel.innerHTML = `<div class="section-top"><div><div class="section-label">YOUTUBE UPLOAD PACK</div><h3>Prepare everything before publishing</h3></div><span class="local-badge">LOCAL</span></div><div class="upload-actions"><button id="ytPrepareBtn" class="primary-button" type="button">📦 Prepare for YouTube</button><button id="ytImproveBtn" class="secondary-button" type="button">✨ Automatically improve</button></div><div id="ytPack" class="yt-pack hidden"></div><p id="ytImproveStatus" class="helper"></p>`;
  results.appendChild(panel);
  const packEl = document.getElementById("ytPack");
  const statusEl = document.getElementById("ytImproveStatus");
  const current = () => window.currentBlueprint || (typeof currentBlueprint !== "undefined" ? currentBlueprint : null);
  function renderPack() {
    const bp = current(); if (!bp) return statusEl.textContent = "Create a blueprint first.";
    const pack = YouTubeUploadEngine.makePack(bp); YouTubeUploadEngine.savePack(activeProject()?.id, pack);
    packEl.innerHTML = `<div class="yt-pack-grid"><div><b>Title</b><p>${esc(pack.title)}</p><button class="tiny-copy" data-copy="${esc(pack.title)}">Copy</button></div><div><b>Description</b><p>${esc(pack.description)}</p><button class="tiny-copy" data-copy="${esc(pack.description)}">Copy</button></div><div><b>Hashtags</b><p>${esc(pack.hashtags)}</p><button class="tiny-copy" data-copy="${esc(pack.hashtags)}">Copy</button></div><div><b>Tags / keywords</b><p>${esc(pack.tags)}</p><button class="tiny-copy" data-copy="${esc(pack.tags)}">Copy</button></div><div><b>Thumbnail prompt</b><p>${esc(pack.thumbnailPrompt)}</p></div><div><b>Audience</b><p>${esc(pack.audience)}</p></div></div><h4>Final upload checklist</h4><ul>${pack.formatChecklist.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    packEl.classList.remove("hidden");
    packEl.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); showToast("Copied."); } catch { showToast("Copy unavailable."); } });
  }
  document.getElementById("ytPrepareBtn").onclick = renderPack;
  document.getElementById("ytImproveBtn").onclick = () => {
    const bp = current(); if (!bp) return statusEl.textContent = "Create a blueprint first.";
    const analysis = window.MonetizationEngine ? MonetizationEngine.analyze(bp, MonetizationEngine.get()) : { issues: [] };
    const improved = YouTubeUploadEngine.improve(bp, analysis);
    window.currentBlueprint = improved;
    if (typeof persistBlueprintOnly === "function") persistBlueprintOnly();
    if (typeof renderBlueprint === "function") renderBlueprint(improved);
    statusEl.textContent = "Improved blueprint generated and saved. Run the originality check again before adding it to the batch.";
    renderPack();
  };
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initYouTubeUploadEngine); else initYouTubeUploadEngine();
