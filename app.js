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

  const hooks = [
    `Wait until you see what happens when ${idea.toLowerCase()}!`,
    `Something magical is about to happen...`,
    `Come discover this amazing adventure!`
  ];

  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const script = `
Welcome to a fun adventure!

Today we are exploring:
${idea}

Let's discover something exciting together.

Watch closely, because something wonderful is about to happen!

And that's the end of our adventure. See you next time!
  `.trim();

  document.getElementById("videoSummary").textContent =
    `${type} • ${length} seconds • ${style}`;

  document.getElementById("hook").textContent = hook;

  document.getElementById("script").textContent = script;

  document.getElementById("score").textContent =
    Math.floor(Math.random() * 11) + 85;

  const scenes = document.getElementById("scenes");

  scenes.innerHTML = "";

  for (let i = 1; i <= sceneCount; i++) {

    const scene = document.createElement("div");

    scene.className = "scene";

    const start = (i - 1) * 5;
    const end = Math.min(i * 5, length);

    scene.innerHTML = `
      <h4>Scene ${i} — ${start}s–${end}s</h4>

      <strong>🎬 Action</strong>
      <p>
        Create an engaging moment related to:
        ${idea}
      </p>

      <strong>🎨 Image Prompt</strong>
      <p>
        ${style}, high-quality children's animation,
        friendly characters, bright engaging environment,
        visually clear composition, scene showing:
        ${idea}
      </p>

      <strong>🎥 Video Prompt</strong>
      <p>
        Smooth cinematic movement, gentle camera motion,
        expressive character action, joyful atmosphere,
        clear visual storytelling.
      </p>

      <strong>🎙 Voiceover</strong>
      <p>
        Let's explore ${idea.toLowerCase()}!
      </p>
    `;

    scenes.appendChild(scene);
  }

  document.getElementById("title").textContent =
    createTitle(idea);

  document.getElementById("description").textContent =
    `Join us for a fun ${type.toLowerCase()} adventure about ${idea.toLowerCase()}.`;

  document.getElementById("hashtags").textContent =
    "#YouTubeShorts #Kids #Animation #Fun #Adventure";

  document.getElementById("results").classList.remove("hidden");

  document.getElementById("results").scrollIntoView({
    behavior: "smooth"
  });
}


function createTitle(idea) {

  const cleanIdea = idea
    .replace(/[.!?]/g, "")
    .trim();

  if (cleanIdea.length <= 55) {
    return `${cleanIdea} 🌈✨`;
  }

  return cleanIdea.substring(0, 52) + "...";
}


function makeMore() {

  const idea = document.getElementById("idea").value.trim();

  if (!idea) {
    alert("Create a video first.");
    return;
  }

  const ideas = [
    `A surprising discovery involving ${idea}`,
    `A magical adventure with ${idea}`,
    `Learning something new through ${idea}`,
    `The mystery behind ${idea}`,
    `A funny challenge involving ${idea}`,
    `A colorful journey with ${idea}`,
    `Finding something unexpected during ${idea}`,
    `A tiny hero's adventure with ${idea}`,
    `A friendship story involving ${idea}`,
    `The ultimate ${idea} adventure`
  ];

  let message = "10 NEW VIDEO IDEAS\n\n";

  ideas.forEach((item, index) => {
    message += `${index + 1}. ${item}\n`;
  });

  alert(message);
}
