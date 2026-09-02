"use strict";
(function () {
  const BRIDGE = "http://127.0.0.1:8787";
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const link = (href, text) => `<a href="${href}" target="_blank" rel="noreferrer noopener">${esc(text)}</a>`;

  function status(label, ok, detail) {
    return `<div class="setup-status"><span class="setup-dot ${ok ? "ok" : "warn"}"></span><div><b>${esc(label)}</b><small>${esc(detail)}</small></div></div>`;
  }

  function recommendations(h) {
    const vram = Number(h?.gpu?.vramGb || 0);
    const ram = Number(h?.memory?.totalGb || 0);
    if (h?.comfyui?.reachable && vram >= 12) return "Best local target: Wan 2.2 5B or a higher-quality 14B workflow if your GPU can sustain it. Start with short 5-second shots and upscale only after the pipeline is stable.";
    if (h?.comfyui?.reachable && vram >= 8) return "Best local target: Wan 2.2 5B. ComfyUI's 5B workflow is designed to be much more practical on lower VRAM; use shorter clips and reduced resolution when needed.";
    if (h?.comfyui?.reachable && ram >= 16) return "Your system can attempt local generation, but video generation may be slow without enough VRAM. Prefer the 5B workflow, short clips, and lower resolution.";
    return "First get ComfyUI running locally, then use its Wan 2.2 5B video template. If the machine cannot run it reliably, the app will keep the blueprint ready without silently spending money.";
  }

  async function inspect() {
    const summary = $("setupSummary"), details = $("setupDetails");
    if (!summary || !details) return;
    summary.textContent = "Checking local generation…";
    try {
      const response = await fetch(BRIDGE + "/v1/capabilities", { cache: "no-store" });
      const h = await response.json();
      const comfy = h.comfyui || {};
      const image = h.routes?.image?.provider === "local";
      const video = h.routes?.video?.provider === "local";
      summary.textContent = image && video ? "Your local video pipeline is ready." : "One more setup step is needed before real generation.";
      details.innerHTML = [
        status("Local bridge", true, "Connected at 127.0.0.1:8787"),
        status("ComfyUI", comfy.reachable, comfy.reachable ? `Running locally${comfy.maxVramGb ? ` · ${comfy.maxVramGb} GB VRAM detected` : ""}` : "Not reachable at 127.0.0.1:8188"),
        status("Image generation", image, image ? "Configured local workflow" : "Configure an image workflow or local runner"),
        status("Video generation", video, video ? "Configured local workflow" : "Configure a video workflow or local runner"),
        status("FFmpeg export", h.tools?.ffmpeg?.available, h.tools?.ffmpeg?.available ? h.tools.ffmpeg.version : "Install FFmpeg and ensure it is on PATH"),
        `<div class="setup-recommendation"><b>Recommended path</b><p>${esc(recommendations(h))}</p></div>`
      ].join("");
    } catch (error) {
      summary.textContent = "Local bridge is not running yet.";
      details.innerHTML = `${status("Local bridge", false, "Start local-bridge/start.mjs")}${status("ComfyUI", false, "After the bridge starts, ComfyUI should be available at 127.0.0.1:8188")}`;
    }
  }

  function render() {
    const anchor = document.getElementById("generationHealth");
    if (!anchor || document.getElementById("localSetup")) return;
    const card = document.createElement("section");
    card.id = "localSetup";
    card.className = "panel local-setup-panel";
    card.innerHTML = `<div class="setup-head"><div><div class="eyebrow">LOCAL AI SETUP</div><h3>Get from blueprint to real MP4</h3><p id="setupSummary" class="health-summary">Checking local generation…</p></div><button id="setupRefresh" class="secondary-button" type="button">↻ Check again</button></div><div id="setupDetails" class="setup-details"></div><details class="setup-guide"><summary>Show the $0 setup checklist</summary><ol><li>Install/update ComfyUI on the laptop.</li><li>In ComfyUI open <b>Workflow → Browse Templates → Video</b> and use the <b>Wan 2.2 5B</b> video workflow. ComfyUI documents this template as the lower-resource Wan 2.2 option. ${link("https://www.comfy.org/", "Official ComfyUI")}</li><li>Export the workflow in API format and save it as <code>local-bridge/workflows/video-api.json</code>. Create a matching image workflow as <code>image-api.json</code>.</li><li>Copy <code>local-bridge/.env.example</code> to <code>local-bridge/.env</code>. Keep the ComfyUI URL at <code>http://127.0.0.1:8188</code> unless you intentionally changed it.</li><li>Start the bridge with <code>node local-bridge/start.mjs</code>. The app will re-check hardware, ComfyUI and workflow readiness automatically.</li><li>Then press <b>Create / update blueprint</b>. Automatic production will generate, retry failed shots, resume completed shots and assemble the final MP4.</li></ol><p class="setup-note">The app never treats mock responses as real media and never silently switches to a paid service.</p></details>`;
    anchor.insertAdjacentElement("afterend", card);
    $("setupRefresh").onclick = inspect;
    inspect();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render); else render();
  window.addEventListener("aivm:health-refresh", inspect);
})();
