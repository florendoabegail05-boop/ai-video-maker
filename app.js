"use strict";

const EXAMPLE_IDEA = "A baby bear discovers the colors of the rainbow and learns them one by one.";
let currentBlueprint = null;

const $ = (id) => document.getElementById(id);

function escapeHTML(text) {
  return String(text).replace(/[&<>\"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;"
  }[char]));
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function createVideo() {
  const idea = $("idea").value.trim();
  if (!idea) {
    $("idea").focus();
    showToast("Add a video idea first.");
    return;
  }

  const type = $("type").value;
  const length = Number($("length").value);
  const style = $("style").value;
  const includeCta = $("includeCta").checked;
  const includeVoice = $("includeVoice").checked;
  const sceneCount = Math.max(3, Math.round(length / 5));
  const scenes = buildScenes(idea, sceneCount, style, includeVoice);
  const hook = buildHook(idea, type);
  const script = buildScript(idea, scenes, includeCta);
  const title = createTitle(idea, type);
  const description = createDescription(idea, type, includeCta);
  const hashtags = createHashtags(idea, type);
  const score = calculateScore(idea, type, style);
  const ideas = makeIdeaList(idea);

  currentBlueprint = { idea, type, length, style, includeCta, includeVoice, hook, script, scenes, score, title, description, hashtags, ideas };
  renderBlueprint(currentBlueprint);
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Blueprint created locally.");
}

function buildHook(idea, type) {
  const subject = slug(idea);
  if (type === "Educational Video") return `Can you discover the surprising lesson hidden in ${subject}?`;
  return `Wait! You won't believe what happens when ${subject}!`;
}

function buildScript(idea, scenes, includeCta) {
  const lines = scenes.map((scene) => scene.voiceover).filter(Boolean);
  let script = [`Here's a tiny adventure about ${idea.toLowerCase()}.`, ...lines];
  if (includeCta) script.push("What should we discover next? Follow for the next adventure!");
  return script.join(" ");
}

function buildScenes(idea, count, style, includeVoice) {
  const templates = [
    { action: `Open on the main subject noticing the key idea: ${idea}.`, camera: "Gentle cinematic push-in; keep the subject centered.", emotion: "Curious", environment: "Bright, uncluttered setting with soft light.", voiceover: "Look closely... something is about to happen!" },
    { action: `The subject moves toward the discovery and investigates ${idea}.`, camera: "Smooth tracking shot matching the subject's movement.", emotion: "Playful", environment: "Colorful environment with one clear visual focus.", voiceover: "Let's take a closer look!" },
    { action: `Reveal the most interesting part of ${idea} with a clear visual reaction.`, camera: "Medium shot into a gentle close-up on the discovery.", emotion: "Surprised", environment: "Warm, magical details without visual clutter.", voiceover: "Wow! Look what we found!" },
    { action: `The subject interacts with the discovery and demonstrates what is happening in ${idea}.`, camera: "Stable side angle followed by a small push-in.", emotion: "Fascinated", environment: "Friendly setting with consistent props and lighting.", voiceover: "We're learning something amazing!" },
    { action: `Introduce a tiny challenge connected to ${idea}; make the goal instantly understandable.`, camera: "Brief wider shot, then close on the character's reaction.", emotion: "Excited", environment: "Energetic but readable composition.", voiceover: "Oh! What happens next?" },
    { action: `The subject solves the challenge and celebrates the discovery.`, camera: "Slow pull-back to reveal the complete scene.", emotion: "Joyful", environment: "Cheerful bright setting with gentle glow.", voiceover: "We did it! That was amazing!" },
    { action: `Give the audience a memorable final look at ${idea}.`, camera: "Friendly front-facing shot with a subtle push-in.", emotion: "Warm", environment: "Clean background with strong subject separation.", voiceover: "What a wonderful discovery!" },
    { action: `End with a simple visual payoff and a wave goodbye.`, camera: "Wide ending shot, then a slow cinematic pull-back.", emotion: "Happy", environment: "Peaceful colorful environment with soft light.", voiceover: "See you on our next adventure!" }
  ];

  return Array.from({ length: count }, (_, index) => {
    const t = templates[index % templates.length];
    const start = index * 5;
    const end = start + 5;
    const continuity = "Keep the same character identity, clothing, proportions, props, lighting direction and environment across every shot.";
    return {
      number: index + 1, start, end, action: t.action, camera: t.camera, emotion: t.emotion,
      environment: t.environment, voiceover: includeVoice ? t.voiceover : "",
      imagePrompt: `${style}; vertical 9:16; ${t.environment} ${t.action} Camera: ${t.camera} Emotion: ${t.emotion}. ${continuity} High visual consistency, child-friendly, polished, clear silhouette, no text, no watermark.`,
      videoPrompt: `${t.action} ${t.camera} ${continuity} Natural smooth movement, stable framing, consistent appearance, subtle expressive motion, 5 seconds, vertical 9:16, no text, no watermark.`
    };
  });
}

function calculateScore(idea, type, style) {
  let score = 72;
  if (idea.length >= 25) score += 7;
  if (idea.length >= 60) score += 4;
  if (type === "YouTube Short" || type === "Instagram Reel" || type === "TikTok") score += 5;
  if (["Kids 3D Animation", "Cartoon", "Storybook"].includes(style)) score += 5;
  if (/who|how|why|discover|learn|secret|surprise/i.test(idea)) score += 4;
  return Math.min(97, score);
}

function createTitle(idea, type) {
  const clean = idea.replace(/[.!?]+$/g, "").trim();
  if (type === "Educational Video") return `Learn Something Amazing: ${clean} 📚`;
  return `${clean} ✨ | A Tiny Adventure`;
}

function createDescription(idea, type, cta) {
  const base = `A fun ${type.toLowerCase()} about ${idea.toLowerCase()}. Short, simple and designed for clear visual storytelling.`;
  return cta ? `${base} Follow for more creative adventures and new stories.` : base;
}

function createHashtags(idea, type) {
  const tags = new Set(["#AIVideo", "#Shorts"]);
  if (/kids|baby|bear|child|rainbow|cartoon/i.test(idea)) ["#Kids", "#Animation", "#KidsContent"].forEach((x) => tags.add(x));
  if (type === "Educational Video") tags.add("#LearnWithMe");
  if (type === "TikTok") tags.add("#TikTok");
  if (type === "Instagram Reel") tags.add("#Reels");
  return [...tags].join(" ");
}

function makeIdeaList(idea) {
  const base = idea.replace(/[.!?]+$/g, "").trim();
  return [
    `A surprising twist on ${base}`,
    `The tiny hero's biggest challenge: ${base}`,
    `What happens next? ${base}`,
    `A funny mistake while exploring ${base}`,
    `A simple lesson hidden inside ${base}`,
    `A magical version of ${base}`,
    `A friendship adventure inspired by ${base}`,
    `The secret behind ${base}`,
    `A 30-second challenge based on ${base}`,
    `The happiest ending for ${base}`
  ];
}

function renderBlueprint(data) {
  $("videoSummary").textContent = `${data.type} • ${data.length}s • ${data.style} • ${data.scenes.length} shots`;
  $("resultTitle").textContent = data.title;
  $("hook").textContent = data.hook;
  $("script").textContent = data.script;
  $("score").textContent = data.score;
  $("sceneCountBadge").textContent = `${data.scenes.length} × 5s shots`;
  $("title").textContent = data.title;
  $("description").textContent = data.description;
  $("hashtags").textContent = data.hashtags;
  $("ideaList").innerHTML = data.ideas.map((idea, i) => `<div class="idea-item"><b>${i + 1}.</b> ${escapeHTML(idea)}</div>`).join("");

  $("scenes").innerHTML = data.scenes.map((scene) => `
    <div class="scene">
      <div class="scene-head"><h4>Scene ${scene.number}</h4><span class="timing">${scene.start}s–${scene.end}s</span></div>
      <div class="scene-meta">
        <div><strong>Action</strong><p>${escapeHTML(scene.action)}</p></div>
        <div><strong>Camera</strong><p>${escapeHTML(scene.camera)}</p></div>
        <div><strong>Emotion</strong><p>${escapeHTML(scene.emotion)}</p></div>
      </div>
      <strong>Image prompt</strong><div class="prompt-box"><p>${escapeHTML(scene.imagePrompt)}</p><button class="copy-button" type="button" data-copy-value="${escapeHTML(scene.imagePrompt)}">📋 Copy</button></div>
      <strong>Video prompt</strong><div class="prompt-box"><p>${escapeHTML(scene.videoPrompt)}</p><button class="copy-button" type="button" data-copy-value="${escapeHTML(scene.videoPrompt)}">📋 Copy</button></div>
      ${scene.voiceover ? `<strong>Voiceover</strong><p>${escapeHTML(scene.voiceover)}</p>` : ""}
    </div>`).join("");
}

function blueprintText(data) {
  return [
    "AI VIDEO MAKER — VIDEO BLUEPRINT", "=================================", "",
    `IDEA: ${data.idea}`, `TYPE: ${data.type}`, `LENGTH: ${data.length} seconds`, `STYLE: ${data.style}`, `SCORE: ${data.score}/100`, "",
    `HOOK: ${data.hook}`, `SCRIPT: ${data.script}`, "", "SCENES", "======", "",
    ...data.scenes.flatMap((s) => [`SCENE ${s.number} — ${s.start}s–${s.end}s`, `ACTION: ${s.action}`, `CAMERA: ${s.camera}`, `EMOTION: ${s.emotion}`, `IMAGE PROMPT: ${s.imagePrompt}`, `VIDEO PROMPT: ${s.videoPrompt}`, s.voiceover ? `VOICEOVER: ${s.voiceover}` : "", ""]),
    "PUBLISHING", "==========", `TITLE: ${data.title}`, `DESCRIPTION: ${data.description}`, `HASHTAGS: ${data.hashtags}`
  ].join("\n");
}

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadBlueprint() {
  if (!currentBlueprint) return showToast("Create a blueprint first.");
  downloadFile("ai-video-blueprint.txt", blueprintText(currentBlueprint), "text/plain;charset=utf-8");
}

function downloadJSON() {
  if (!currentBlueprint) return showToast("Create a blueprint first.");
  downloadFile("ai-video-blueprint.json", JSON.stringify(currentBlueprint, null, 2), "application/json;charset=utf-8");
}

async function copyAll() {
  if (!currentBlueprint) return showToast("Create a blueprint first.");
  try { await navigator.clipboard.writeText(blueprintText(currentBlueprint)); showToast("Blueprint copied."); }
  catch { showToast("Copy unavailable in this browser."); }
}

async function copyValue(value) {
  try { await navigator.clipboard.writeText(value); showToast("Copied."); }
  catch { showToast("Copy unavailable in this browser."); }
}

function regenerate() {
  if (!currentBlueprint) return showToast("Create a blueprint first.");
  createVideo();
}

function init() {
  const idea = $("idea");
  idea.addEventListener("input", () => { $("charCount").textContent = `${idea.value.length} / 500`; });
  $("exampleBtn").addEventListener("click", () => { idea.value = EXAMPLE_IDEA; idea.dispatchEvent(new Event("input")); idea.focus(); });
  $("createBtn").addEventListener("click", createVideo);
  $("downloadTxtBtn").addEventListener("click", downloadBlueprint);
  $("downloadJsonBtn").addEventListener("click", downloadJSON);
  $("copyAllBtn").addEventListener("click", copyAll);
  $("regenerateBtn").addEventListener("click", regenerate);
  document.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-value]");
    if (copyButton) copyValue(copyButton.getAttribute("data-copy-value"));
    const tiny = event.target.closest("[data-copy-target]");
    if (tiny) copyValue($(tiny.dataset.copyTarget).textContent);
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); createVideo(); }
  });
}

document.addEventListener("DOMContentLoaded", init);
