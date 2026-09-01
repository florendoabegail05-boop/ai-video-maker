function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createVideo() {
  const idea = document.getElementById("idea").value.trim();
  const type = document.getElementById("type").value;
  const length = Number(document.getElementById("length").value);
  const style = document.getElementById("style").value;

  if (!idea) {
    alert("Please enter a video idea first.");
    return;
  }

  const sceneCount = Math.max(3, Math.round(length / 5));

  const scenes = buildScenes(idea, sceneCount, style);

  const hook = buildHook(idea);
  const script = buildScript(idea, scenes);
  const score = calculateScore(idea, type, style);

  document.getElementById("videoSummary").textContent =
    `${type} • ${length} seconds • ${style}`;

  document.getElementById("hook").textContent = hook;
  document.getElementById("script").textContent = script;
  document.getElementById("score").textContent = score;

  renderScenes(scenes);

  document.getElementById("title").textContent = createTitle(idea);

  document.getElementById("description").textContent =
    `Join this ${type.toLowerCase()} adventure as we discover ${idea.toLowerCase()}. Created in a fun ${style.toLowerCase()} style.`;

  document.getElementById("hashtags").textContent =
    "#YouTubeShorts #Kids #Animation #Story #Adventure #AIVideo";

  document.getElementById("results").classList.remove("hidden");

  window.currentBlueprint = {
    idea,
    type,
    length,
    style,
    hook,
    script,
    scenes,
    score
  };

  document.getElementById("results").scrollIntoView({
    behavior: "smooth"
  });
}


/* =========================
   STORY ENGINE
========================= */

function buildHook(idea) {
  const hooks = [
    `Wait! Something amazing is about to happen with ${idea.toLowerCase()}!`,
    `What happens when ${idea.toLowerCase()}? Let's find out!`,
    `Come with us on a tiny adventure: ${idea.toLowerCase()}!`,
    `Look closely... something magical is about to happen!`
  ];

  return hooks[Math.floor(Math.random() * hooks.length)];
}


function buildScript(idea, scenes) {
  let script = "";

  script += `Come along on a fun adventure! `;

  script += `Today, we're discovering ${idea.toLowerCase()}. `;

  scenes.forEach((scene, index) => {
    if (index === 0) {
      script += `${scene.voiceover} `;
    } else {
      script += `${scene.voiceover} `;
    }
  });

  script += `And that's our adventure! What should we discover next?`;

  return script;
}


/* =========================
   SCENE ENGINE
========================= */

function buildScenes(idea, sceneCount, style) {

  const sceneTemplates = [

    {
      action:
        `Open with the main subject noticing something unusual connected to ${idea}.`,
      camera:
        "Slow cinematic push-in toward the main subject.",
      emotion:
        "Curious and excited.",
      environment:
        "Bright, colorful environment with soft lighting.",
      voiceover:
        `Look! Something interesting is happening!`
    },

    {
      action:
        `The main subject moves closer and investigates ${idea}.`,
      camera:
        "Gentle tracking shot following the character.",
      emotion:
        "Curious and playful.",
      environment:
        "Colorful surroundings with small visual details to discover.",
      voiceover:
        `Let's take a closer look!`
    },

    {
      action:
        `The main subject discovers an important part of ${idea} and reacts with surprise.`,
      camera:
        "Medium shot followed by a gentle zoom toward the discovery.",
      emotion:
        "Surprised and delighted.",
      environment:
        "Bright magical environment with soft glowing details.",
      voiceover:
        `Wow! Look what we found!`
    },

    {
      action:
        `The main subject interacts with the discovery and learns something new about ${idea}.`,
      camera:
        "Smooth side-to-side camera movement showing the interaction.",
      emotion:
        "Happy and fascinated.",
      environment:
        "Warm colorful setting with playful background elements.",
      voiceover:
        `We're learning something amazing!`
    },

    {
      action:
        `A small unexpected moment happens, creating a fun challenge involving ${idea}.`,
      camera:
        "Quick but gentle camera movement followed by a close-up reaction.",
      emotion:
        "Excited and playful.",
      environment:
        "Energetic colorful environment with clear visual storytelling.",
      voiceover:
        `Oh! What happens next?`
    },

    {
      action:
        `The main subject solves the tiny challenge and celebrates the discovery.`,
      camera:
        "Camera slowly pulls back to reveal the whole scene.",
      emotion:
        "Proud, joyful and excited.",
      environment:
        "Beautiful bright setting with a cheerful atmosphere.",
      voiceover:
        `We did it! That was amazing!`
    },

    {
      action:
        `The main subject shares the discovery with the audience.`,
      camera:
        "Friendly front-facing camera shot with a gentle push-in.",
      emotion:
        "Warm and happy.",
      environment:
        "Clean colorful background designed for children.",
      voiceover:
        `What a wonderful discovery!`
    },

    {
      action:
        `The adventure reaches its happiest moment as the main subject enjoys ${idea}.`,
      camera:
        "Wide cinematic shot revealing the complete environment.",
      emotion:
        "Joyful and amazed.",
      environment:
        "Magical colorful environment with soft glowing light.",
      voiceover:
        `This adventure was so much fun!`
    },

    {
      action:
        `The main subject waves goodbye after completing the adventure.`,
      camera:
        "Slow pull-back ending shot.",
      emotion:
        "Happy and peaceful.",
      environment:
        "Warm colorful environment with gentle light.",
      voiceover:
        `See you on our next adventure!`
    },

    {
      action:
        `Finish with a memorable visual moment connected to ${idea}.`,
      camera:
        "Slow cinematic reveal ending on the main subject.",
      emotion:
        "Happy and satisfied.",
      environment:
        "Bright magical setting with a cheerful ending.",
      voiceover:
        `Until next time, keep discovering!`
    }

  ];

  const scenes = [];

  for (let i = 0; i < sceneCount; i++) {

    const template =
      sceneTemplates[i % sceneTemplates.length];

    const start = i * 5;
    const end = start + 5;

    scenes.push({
      number: i + 1,
      start,
      end,
      action: template.action,
      camera: template.camera,
      emotion: template.emotion,
      environment: template.environment,
      voiceover: template.voiceover,

      imagePrompt:
        `${style}, high-quality polished animation, vertical 9:16 composition, consistent main character design, consistent clothing and appearance, ${template.environment} ${template.action} Camera composition: ${template.camera} Emotion: ${template.emotion}. Clear subject, appealing children's visual storytelling, no text, no watermark.`,

      videoPrompt:
        `${template.action} ${template.camera} Character emotion: ${template.emotion}. Natural smooth movement, gentle animation, stable character appearance, consistent environment, child-friendly visual storytelling, polished ${style} animation, vertical 9:16 video, 5 seconds.`
    });
  }

  return scenes;
}


/* =========================
   SCENE DISPLAY
========================= */

function renderScenes(scenes) {

  const container = document.getElementById("scenes");

  container.innerHTML = "";

  scenes.forEach(scene => {

    const sceneElement = document.createElement("div");

    sceneElement.className = "scene";

    sceneElement.innerHTML = `

      <h4>
        Scene ${scene.number} — ${scene.start}s–${scene.end}s
      </h4>

      <strong>🎬 Action</strong>
      <p>${escapeHTML(scene.action)}</p>

      <strong>📷 Camera</strong>
      <p>${escapeHTML(scene.camera)}</p>

      <strong>🎭 Emotion</strong>
      <p>${escapeHTML(scene.emotion)}</p>

      <strong>🎨 Image Prompt</strong>

      <div class="prompt-box">
        <p>${escapeHTML(scene.imagePrompt)}</p>
        <button
          class="copy-button"
          onclick="copyText(this)"
          data-copy="${escapeHTML(scene.imagePrompt)}"
        >
          📋 Copy Image Prompt
        </button>
      </div>

      <strong>🎥 Video Prompt</strong>

      <div class="prompt-box">
        <p>${escapeHTML(scene.videoPrompt)}</p>
        <button
          class="copy-button"
          onclick="copyText(this)"
          data-copy="${escapeHTML(scene.videoPrompt)}"
        >
          📋 Copy Video Prompt
        </button>
      </div>

      <strong>🎙 Voiceover</strong>
      <p>${escapeHTML(scene.voiceover)}</p>

    `;

    container.appendChild(sceneElement);
  });
}


/* =========================
   COPY TOOL
========================= */

function copyText(button) {

  const text = button.getAttribute("data-copy");

  navigator.clipboard.writeText(text)
    .then(() => {

      const original = button.textContent;

      button.textContent = "✅ Copied!";

      setTimeout(() => {
        button.textContent = original;
      }, 1500);

    })
    .catch(() => {
      alert("Copy failed. Please select the text manually.");
    });
}


/* =========================
   VIDEO SCORE
========================= */

function calculateScore(idea, type, style) {

  let score = 82;

  if (idea.length >= 15) score += 3;

  if (idea.length >= 30) score += 2;

  if (type === "YouTube Short") score += 3;

  if (
    style === "Kids 3D Animation" ||
    style === "Cartoon"
  ) {
    score += 3;
  }

  score += Math.floor(Math.random() * 5);

  return Math.min(score, 99);
}


/* =========================
   TITLE ENGINE
========================= */

function createTitle(idea) {

  const cleanIdea = idea
    .replace(/[.!?]/g, "")
    .trim();

  const titlePatterns = [
    `${cleanIdea} 🌈✨`,
    `The Amazing Adventure: ${cleanIdea} 🚀`,
    `Let's Discover ${cleanIdea}! 🎬`,
    `${cleanIdea} | Fun Kids Adventure 🌟`
  ];

  return titlePatterns[
    Math.floor(Math.random() * titlePatterns.length)
  ];
}


/* =========================
   10 MORE IDEAS
========================= */

function makeMore() {

  const idea = document.getElementById("idea").value.trim();

  if (!idea) {
    alert("Enter an idea first.");
    return;
  }

  const ideas = [

    `A surprising discovery involving ${idea}`,

    `A tiny hero's adventure with ${idea}`,

    `The magical mystery behind ${idea}`,

    `A funny challenge involving ${idea}`,

    `Learning something new through ${idea}`,

    `A colorful journey inspired by ${idea}`,

    `A friendship adventure involving ${idea}`,

    `The unexpected surprise hidden inside ${idea}`,

    `A brave little character explores ${idea}`,

    `The most exciting ${idea} adventure ever`

  ];

  const message =
    "10 NEW VIDEO IDEAS\n\n" +
    ideas
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n\n");

  alert(message);
}


/* =========================
   DOWNLOAD BLUEPRINT
========================= */

function downloadBlueprint() {

  if (!window.currentBlueprint) {
    alert("Create a video first.");
    return;
  }

  const data = window.currentBlueprint;

  let text = "";

  text += "AI VIDEO MAKER — VIDEO BLUEPRINT\n";
  text += "=================================\n\n";

  text += `IDEA:\n${data.idea}\n\n`;

  text += `TYPE:\n${data.type}\n\n`;

  text += `LENGTH:\n${data.length} seconds\n\n`;

  text += `STYLE:\n${data.style}\n\n`;

  text += `SCORE:\n${data.score}/100\n\n`;

  text += `HOOK:\n${data.hook}\n\n`;

  text += `SCRIPT:\n${data.script}\n\n`;

  text += "SCENES\n======\n\n";

  data.scenes.forEach(scene => {

    text += `SCENE ${scene.number} — ${scene.start}s–${scene.end}s\n\n`;

    text += `ACTION:\n${scene.action}\n\n`;

    text += `CAMERA:\n${scene.camera}\n\n`;

    text += `EMOTION:\n${scene.emotion}\n\n`;

    text += `IMAGE PROMPT:\n${scene.imagePrompt}\n\n`;

    text += `VIDEO PROMPT:\n${scene.videoPrompt}\n\n`;

    text += `VOICEOVER:\n${scene.voiceover}\n\n`;

    text += "---------------------------------\n\n";
  });

  const blob = new Blob([text], {
    type: "text/plain"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = "ai-video-blueprint.txt";

  link.click();

  URL.revokeObjectURL(url);
}
