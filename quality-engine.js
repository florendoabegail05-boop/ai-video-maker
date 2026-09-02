"use strict";

/* Quality Director: deterministic, provider-neutral prompt engineering for stronger video results. */
(function () {
  const KEY = "aivm.creatorStudio.v1";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();

  function state() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
  function active(s) { return (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0]; }
  function profile(s) {
    const p = s.profiles || {}, c = p.character || {}, e = p.environment || {}, v = p.style || {};
    return clean(`CHARACTER LOCK — ${c.name || "Main character"}. ${c.description || "Consistent identity and proportions."} ${c.age ? `Age: ${c.age}.` : ""} ${c.traits ? `Traits: ${c.traits}.` : ""} ${c.wardrobe ? `Wardrobe: ${c.wardrobe}.` : ""} WORLD LOCK — ${e.name || "Main world"}. ${e.description || "Consistent setting."} ${e.details || ""} ${e.lighting ? `Lighting: ${e.lighting}.` : ""} ${e.props ? `Props: ${e.props}.` : ""} STYLE LOCK — ${v.name || "Polished animation"}. ${v.description || ""} ${v.palette ? `Palette: ${v.palette}.` : ""} ${v.camera ? `Camera: ${v.camera}.` : ""} ${v.rules || "No text or watermark; preserve visual consistency."}`);
  }
  function ideaParts(idea) {
    const x = clean(idea).replace(/[.!?]+$/g, "");
    return { subject: x || "the main character", lower: (x || "the main character").toLowerCase() };
  }
  function shotTemplates(parts) {
    const s = parts.subject;
    return [
      { role:"HOOK", action:`Open with ${s}. The character notices one visually unusual detail that immediately creates curiosity.`, camera:"0–2s: medium-wide establishing shot; 2–5s: gentle push-in to the character's eyes and the discovery.", emotion:"Curious surprise", audio:"Soft opening sound, then a tiny musical lift." },
      { role:"SETUP", action:`Show the character clearly choosing to investigate ${s}. Give the audience one simple goal to understand.`, camera:"Eye-level tracking shot; keep the character's face readable and the goal visible in the same frame.", emotion:"Interested and hopeful", audio:"Light footsteps/cloth movement with quiet rhythmic music." },
      { role:"ESCALATION", action:`Create a small, safe obstacle connected to ${s}. The character tries one simple action and reacts when it does not work immediately.`, camera:"Start in a stable medium shot, then a subtle close-up at the reaction; no abrupt camera shake.", emotion:"Determined, then surprised", audio:"Music rises slightly; one soft comedic or magical accent." },
      { role:"PAYOFF", action:`The character discovers the solution to ${s}. Make the cause-and-effect visually obvious and satisfying without adding extra story elements.`, camera:"Clean reveal: close-up on the key action, then pull back enough to show the character's joyful reaction.", emotion:"Delighted wonder", audio:"Warm musical resolution and a clear satisfying sound cue." },
      { role:"MEMORY", action:`Hold on the most beautiful, memorable result of ${s}. Let the character enjoy the moment so the audience can absorb it.`, camera:"Hero shot with gentle parallax; slow, controlled movement and strong subject separation.", emotion:"Joyful calm", audio:"Music opens up, then begins to settle." },
      { role:"ENDING", action:`Finish with a simple visual goodbye or final reaction that naturally invites another adventure.`, camera:"Friendly front-facing medium shot; tiny push-in or slow pull-back; end on a stable frame.", emotion:"Warm and happy", audio:"Short musical button; leave a little breathing room at the end." }
    ];
  }
  function countFor(length) { return Math.max(3, Math.min(12, Math.round(Number(length || 30) / 5))); }
  function makeBlueprint(p, s) {
    const parts = ideaParts(p.idea), lock = profile(s), templates = shotTemplates(parts), count = countFor(p.length);
    const shots = Array.from({length:count}, (_, i) => {
      const t = templates[i === count - 1 ? templates.length - 1 : i % (templates.length - 1)];
      const start=i*5, end=start+5;
      const image = `Vertical 9:16, premium ${p.style || "cinematic animation"}. ${t.action} ${lock} Composition: clear foreground/midground/background separation, readable silhouette, one visual focal point, appealing depth, consistent scale and wardrobe. Lighting: soft, intentional, cinematic, physically coherent. Materials and textures are polished but uncluttered. ${t.emotion}. No text, captions, logos, UI, watermark, extra limbs, duplicate characters, distorted hands, warped faces, flicker, frame-to-frame identity changes.`;
      const video = `5-second image-to-video shot. ${t.action} ${t.camera} ${lock} Motion: natural body movement, subtle secondary motion, believable weight and timing, stable anatomy, stable facial features, smooth transitions, no sudden morphing. Start from the supplied image and preserve its composition and character design. ${t.emotion}. ${t.audio} No text, no camera shake, no object duplication, no identity drift, no scene redesign.`;
      return {number:i+1,start,end,role:t.role,action:t.action,camera:t.camera,emotion:t.emotion,environment:"Use the locked world exactly; preserve layout, lighting direction, props and scale.",voiceover:p.includeVoice!==false ? (i===0?`Look! Something amazing is happening with ${parts.lower}.`:i===count-1?"What should we discover next?":"Let's see what happens next!") : "",imagePrompt:image,videoPrompt:video,audioDirection:t.audio};
    });
    const hook = `STOP-SCROLL HOOK: ${templates[0].action.replace("Open with ","")}`;
    const script = shots.map(x=>x.voiceover).filter(Boolean).join(" ") + (p.includeCta!==false ? " Follow for the next little adventure!" : "");
    const score = Math.min(99, 84 + (p.idea.length>=60?5:0) + (shots.length>=6?3:0) + (s.profiles?.character?.description?2:0) + (s.profiles?.environment?.description?2:0) + (s.profiles?.style?.rules?2:0));
    return {idea:p.idea,type:p.type,length:shots.length*5,style:p.style,includeCta:p.includeCta,includeVoice:p.includeVoice,hook,script,scenes:shots,score,title:createTitle(parts.subject,p.type),description:`A polished short built around ${parts.lower}, with consistent character design, clear visual storytelling and a satisfying payoff.`,hashtags:"#Shorts #AIVideo #Animation #Storytelling",ideas:[],profiles:s.profiles||{},qualityDirector:true,updatedAt:Date.now()};
  }
  function createTitle(x,type){ return type==="Educational Video"?`Learn This in 30 Seconds: ${x} 📚`:`${x} ✨ | A Tiny Adventure`; }
  function render(b) {
    $("videoSummary").textContent=`${b.type} • ${b.length}s • ${b.style} • ${b.scenes.length} shots • Quality Director`;
    $("resultTitle").textContent=b.title; $("hook").textContent=b.hook; $("script").textContent=b.script; $("score").textContent=b.score; $("sceneCountBadge").textContent=`${b.scenes.length} × 5s shots`;
    $("title").textContent=b.title; $("description").textContent=b.description; $("hashtags").textContent=b.hashtags;
    $("ideaList").innerHTML=b.scenes.map((x,i)=>`<div class="idea-item"><b>${i+1}.</b> ${esc(x.role)} — ${esc(x.action)}</div>`).join("");
    $("scenes").innerHTML=b.scenes.map((x,i)=>`<div class="scene" data-scene-index="${i}"><div class="scene-head"><h4>Scene ${i+1} · ${esc(x.role)}</h4><div class="scene-tools"><span class="timing">${x.start}s–${x.end}s</span></div></div><div class="scene-editor"><label>Action<textarea data-field="action">${esc(x.action)}</textarea></label><label>Camera<input data-field="camera" value="${esc(x.camera)}"></label><label>Emotion<input data-field="emotion" value="${esc(x.emotion)}"></label><label>Environment<input data-field="environment" value="${esc(x.environment)}"></label><label>Voiceover<textarea data-field="voiceover">${esc(x.voiceover)}</textarea></label><label>Image prompt<textarea data-field="imagePrompt">${esc(x.imagePrompt)}</textarea></label><label>Video prompt<textarea data-field="videoPrompt">${esc(x.videoPrompt)}</textarea></label></div></div>`).join("");
    $("results").classList.remove("hidden");
  }
  function run(){
    const s=state(), p=active(s); if(!p){ $("newProjectBtn")?.click(); return; }
    if(!clean(p.idea)){ $("idea").focus(); return; }
    p.name=$("projectName").value.trim()||p.name||"Untitled Video"; p.idea=$("idea").value.trim(); p.type=$("type").value; p.length=Number($("length").value); p.style=$("style").value; p.includeCta=$("includeCta").checked; p.includeVoice=$("includeVoice").checked;
    const b=makeBlueprint(p,s); p.blueprint=b; p.updatedAt=Date.now(); s.activeProjectId=p.id; save(s); render(b); $("results").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function install(){
    const btn=document.createElement("button"); btn.id="qualityCreateBtn"; btn.type="button"; btn.className="primary-button quality-button"; btn.innerHTML="<span>✦</span> Create EXCELLENT video plan";
    const create=$("createBtn"); if(create) create.insertAdjacentElement("afterend",btn); btn.addEventListener("click",run);
    const note=document.createElement("p"); note.className="privacy-note"; note.textContent="Quality Director adds story arc, shot purpose, continuity locks, image-to-video motion, negative prompts and audio direction — still 100% local and free."; btn.insertAdjacentElement("afterend",note);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",install); else install();
})();
