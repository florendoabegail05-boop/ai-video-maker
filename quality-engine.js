"use strict";

/* Quality Director v2: story-first planning, continuity control and provider-neutral prompts. */
(function () {
  const KEY = "aivm.creatorStudio.v1";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const state = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };
  const active = s => (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0];

  function locks(s) {
    const p=s.profiles||{}, c=p.character||{}, e=p.environment||{}, v=p.style||{};
    return {
      character: clean(`${c.name||"Main character"}. ${c.description||"Consistent identity and proportions."} ${c.age?`Age: ${c.age}.`:""} ${c.traits?`Traits: ${c.traits}.`:""} ${c.wardrobe?`Wardrobe: ${c.wardrobe}.`:""}`),
      world: clean(`${e.name||"Main world"}. ${e.description||"Consistent setting."} ${e.details||""} ${e.lighting?`Lighting: ${e.lighting}.`:""} ${e.props?`Props: ${e.props}.`:""}`),
      style: clean(`${v.name||"Polished visual style"}. ${v.description||""} ${v.palette?`Palette: ${v.palette}.`:""} ${v.camera?`Camera language: ${v.camera}.`:""} ${v.rules||"No text, logos or watermarks."}`)
    };
  }
  function parts(idea){ const x=clean(idea).replace(/[.!?]+$/g,""); return {raw:x||"the main character", lower:(x||"the main character").toLowerCase()}; }
  function storyPlan(p){
    const x=parts(p.idea), n=Math.max(3,Math.min(12,Math.round(Number(p.length||30)/5)));
    const beats = n<=4 ? ["HOOK","SETUP","PAYOFF","ENDING"] : n===5 ? ["HOOK","SETUP","ESCALATION","PAYOFF","ENDING"] : ["HOOK","SETUP","DESIRE","OBSTACLE","ESCALATION","TURN","PAYOFF","MEMORY","ENDING"];
    return {goal:`Make the audience care about ${x.lower} within the first few seconds.`,promise:`A simple, emotionally clear mini-story with one central question and one satisfying answer.`,beats:beats.slice(0,n)};
  }
  function beatFor(role,x,i,total){
    const last=i===total-1;
    const map={
      HOOK:`Open on ${x.raw}. Reveal one unusual visual detail or unanswered question immediately.`,
      SETUP:`Clarify what the character wants and why it matters. Keep the goal visually obvious.`,
      DESIRE:`Show the character choosing a simple goal connected to ${x.raw}; make the audience anticipate the result.`,
      OBSTACLE:`Introduce one small, understandable obstacle that blocks the goal. Do not add a second conflict.`,
      ESCALATION:`Increase the consequence of the obstacle through one stronger attempt and a readable reaction.`,
      TURN:`Change the situation in a clear way: a discovery, idea, helper or unexpected opportunity that points toward the solution.`,
      PAYOFF:`Show direct cause-and-effect: the character solves the central problem and gets an emotionally satisfying result.`,
      MEMORY:`Pause on the strongest visual result so the audience can feel and remember the payoff.`,
      ENDING:`Close on a clean emotional button that feels earned; leave a natural invitation for another adventure without weakening the ending.`
    };
    return map[role] || (last?map.ENDING:`Advance the central story goal connected to ${x.raw}.`);
  }
  function cameraFor(role){
    return ({HOOK:"Medium-wide for instant context, then a gentle push-in to the key discovery.",SETUP:"Eye-level medium shot; keep face, goal and important object readable together.",DESIRE:"Simple tracking shot following the character's choice; stable framing.",OBSTACLE:"Stable medium shot, then a controlled close-up on the reaction.",ESCALATION:"Slightly tighter framing with measured forward movement; no frantic shake.",TURN:"Reveal shot that clearly separates the new information from the old situation.",PAYOFF:"Close on the key action, then widen enough to capture the full emotional reaction.",MEMORY:"Hero composition with gentle parallax and slow controlled movement.",ENDING:"Friendly medium shot; tiny push-in or pull-back and a stable final frame."})[role]||"Stable cinematic framing with one intentional camera move.";
  }
  function audioFor(role){ return ({HOOK:"Tiny attention cue followed by a musical lift.",SETUP:"Light room tone and gentle rhythmic bed.",DESIRE:"Curious, forward-moving musical pulse.",OBSTACLE:"Brief tension accent, then space for the reaction.",ESCALATION:"Music rises slightly; one clear action cue.",TURN:"Small reveal accent and renewed hopeful music.",PAYOFF:"Warm musical resolution with one satisfying sound cue.",MEMORY:"Music opens, then settles to let the visual breathe.",ENDING:"Short musical button and a clean tail."})[role]||"Natural ambience with restrained music."; }
  function make(p,s){
    const x=parts(p.idea), l=locks(s), plan=storyPlan(p), count=plan.beats.length;
    const scenes=plan.beats.map((role,i)=>{
      const action=beatFor(role,x,i,count), camera=cameraFor(role), emotion=({HOOK:"curious",SETUP:"hopeful",DESIRE:"determined",OBSTACLE:"worried",ESCALATION:"frustrated then brave",TURN:"surprised and hopeful",PAYOFF:"delighted",MEMORY:"joyful calm",ENDING:"warm and happy"})[role]||"engaged";
      const start=i*5,end=start+5;
      const image=`Vertical 9:16. ${p.style||"polished cinematic animation"}. Story beat: ${role}. ${action} Character anchor: ${l.character} World anchor: ${l.world} Style anchor: ${l.style} Composition: one dominant focal point, readable silhouette, clear foreground/midground/background separation, intentional depth, clean visual hierarchy. Emotion: ${emotion}. Keep object count simple. Preserve established wardrobe, proportions, palette, lighting direction and world geometry. No text, captions, logos, UI, watermark, duplicate subjects, extra limbs, warped hands, distorted face, flicker or identity drift.`;
      const motion=`Image-to-video, 5 seconds. Starting from the supplied image, ${role.toLowerCase()} beat. ${camera} Subject motion: one dominant physical action, natural weight and timing, subtle secondary motion only where useful. Environmental motion: restrained and physically coherent. Preserve the exact subject identity, composition, lighting and scene layout from the source image. Timing: begin clearly, develop the action, end in a stable readable pose. Avoid morphing, sudden scene redesign, camera shake, object duplication, anatomy changes, identity drift and unintended new actions.`;
      const voice=p.includeVoice!==false?(role==="HOOK"?`Look closely... ${x.lower} is about to change!`:role==="PAYOFF"?"We did it! Look at that!":role==="ENDING"?"What should we discover next?":"Let's see what happens next!"):"";
      return {number:i+1,start,end,role,action,camera,emotion,environment:l.world,voiceover:voice,imagePrompt:image,videoPrompt:motion,audioDirection:audioFor(role)};
    });
    const hook=`HOOK: In the first 2 seconds, make the audience ask a question about ${x.lower}.`;
    const script=scenes.map(z=>z.voiceover).filter(Boolean).join(" ")+(p.includeCta!==false?" Follow for the next little adventure!":"");
    const qc=qualityCheck({idea:p.idea,scenes,script,profiles:s.profiles});
    return {idea:p.idea,type:p.type,length:scenes.length*5,style:p.style,includeCta:p.includeCta,includeVoice:p.includeVoice,hook,script,scenes,score:qc.score,title:title(x.raw,p.type),description:`A story-first short about ${x.lower}, built around a clear goal, obstacle, payoff and consistent visual language.`,hashtags:"#Shorts #AIVideo #Animation #Storytelling",ideas:[],profiles:s.profiles||{},qualityDirector:true,storyPlan:plan,qc,updatedAt:Date.now()};
  }
  function title(x,type){ return type==="Educational Video"?`Learn This: ${x} 📚`:`${x} ✨ | A Tiny Adventure`; }
  function qualityCheck(b){
    const text=clean(b.idea), scenes=b.scenes||[], script=clean(b.script), roles=scenes.map(s=>s.role), hasGoal=roles.includes("SETUP")||roles.includes("DESIRE"), hasConflict=roles.includes("OBSTACLE")||roles.includes("ESCALATION"), hasPayoff=roles.includes("PAYOFF"), hasEnding=roles.includes("ENDING");
    const oneAction=scenes.filter(s=>(s.action.match(/\band\b|then|followed by/gi)||[]).length<2).length;
    const visual=scenes.filter(s=>s.imagePrompt.length>160).length, motion=scenes.filter(s=>s.videoPrompt.length>100).length, audio=scenes.filter(s=>s.audioDirection).length;
    const continuity=scenes.filter(s=>/Character anchor|World anchor|Style anchor/.test(s.imagePrompt)&&/preserve the exact subject identity/i.test(s.videoPrompt)).length;
    const scores={story:(hasGoal?20:10)+(hasConflict?10:0)+(hasPayoff?15:0)+(hasEnding?5:0),visual:Math.round((visual/scenes.length)*15),motion:Math.round((motion/scenes.length)*15),continuity:Math.round((continuity/scenes.length)*15),audio:Math.round((audio/scenes.length)*5),input:text.length>=30?5:0};
    const total=Math.min(99,Object.values(scores).reduce((a,v)=>a+v,0));
    const issues=[]; if(text.length<30) issues.push("Give the idea a character, goal or desired outcome."); if(!hasConflict) issues.push("Add one simple obstacle so the payoff feels earned."); if(!hasPayoff) issues.push("Add a visible cause-and-effect payoff."); if(oneAction<Math.ceil(scenes.length*.7)) issues.push("Some shots contain multiple actions; simplify to one dominant action per shot."); if(continuity<scenes.length) issues.push("Use an approved reference image and keep character/world/style locks unchanged.");
    return {score:total,scores,issues,pass:total>=85};
  }
  function renderQuality(b){
    let panel=$("qualityPanel"); if(!panel){ panel=document.createElement("div"); panel.id="qualityPanel"; panel.className="result-section highlight"; const r=$("results"); r.insertBefore(panel,r.firstElementChild); }
    const q=b.qc||qualityCheck(b), status=q.pass?"READY TO GENERATE":"NEEDS REFINEMENT";
    panel.innerHTML=`<div class="section-label">QUALITY CONTROL</div><h3>${status} · ${q.score}/100</h3><p class="helper">Story ${q.scores.story}/50 · Visual ${q.scores.visual}/15 · Motion ${q.scores.motion}/15 · Continuity ${q.scores.continuity}/15 · Audio ${q.scores.audio}/5</p>${q.issues.length?`<div class="idea-list">${q.issues.map(x=>`<div class="idea-item">⚠ ${esc(x)}</div>`).join("")}</div>`:'<div class="idea-item">✓ Story structure, visual prompts, motion direction and continuity checks passed.</div>'}<button id="qualityRecheckBtn" class="secondary-button" type="button">↻ Recheck quality</button>`;
    $("qualityRecheckBtn").addEventListener("click",()=>{ const s=state(),p=active(s); if(!p?.blueprint)return; p.blueprint.qc=qualityCheck(p.blueprint); p.blueprint.score=p.blueprint.qc.score; save(s); renderQuality(p.blueprint); $("score").textContent=p.blueprint.score; });
  }
  function render(b){
    $("videoSummary").textContent=`${b.type} • ${b.length}s • ${b.style} • ${b.scenes.length} shots • Quality Director v2`;
    $("resultTitle").textContent=b.title; $("hook").textContent=b.hook; $("script").textContent=b.script; $("score").textContent=b.score; $("sceneCountBadge").textContent=`${b.scenes.length} × 5s shots`;
    $("title").textContent=b.title; $("description").textContent=b.description; $("hashtags").textContent=b.hashtags;
    $("ideaList").innerHTML=b.scenes.map((x,i)=>`<div class="idea-item"><b>${i+1}.</b> ${esc(x.role)} — ${esc(x.action)}</div>`).join("");
    $("scenes").innerHTML=b.scenes.map((x,i)=>`<div class="scene" data-scene-index="${i}"><div class="scene-head"><h4>Scene ${i+1} · ${esc(x.role)}</h4><div class="scene-tools"><span class="timing">${x.start}s–${x.end}s</span></div></div><div class="scene-editor"><label>Story action<textarea data-field="action">${esc(x.action)}</textarea></label><label>Camera<input data-field="camera" value="${esc(x.camera)}"></label><label>Emotion<input data-field="emotion" value="${esc(x.emotion)}"></label><label>Environment<input data-field="environment" value="${esc(x.environment)}"></label><label>Voiceover<textarea data-field="voiceover">${esc(x.voiceover)}</textarea></label><label>Image prompt<textarea data-field="imagePrompt">${esc(x.imagePrompt)}</textarea></label><label>Image-to-video motion<textarea data-field="videoPrompt">${esc(x.videoPrompt)}</textarea></label><label>Audio direction<input data-field="audioDirection" value="${esc(x.audioDirection||"")}"></label></div></div>`).join("");
    $("results").classList.remove("hidden"); renderQuality(b);
  }
  function run(){
    const s=state(),p=active(s); if(!p){$("newProjectBtn")?.click();return;} if(!clean($("idea").value)){ $("idea").focus(); return; }
    p.name=$("projectName").value.trim()||p.name||"Untitled Video"; p.idea=$("idea").value.trim(); p.type=$("type").value; p.length=Number($("length").value); p.style=$("style").value; p.includeCta=$("includeCta").checked; p.includeVoice=$("includeVoice").checked;
    const b=make(p,s); p.blueprint=b; p.updatedAt=Date.now(); s.activeProjectId=p.id; save(s); render(b); $("results").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function install(){
    if($("qualityCreateBtn"))return;
    const btn=document.createElement("button"); btn.id="qualityCreateBtn"; btn.type="button"; btn.className="primary-button quality-button"; btn.innerHTML="<span>✦</span> Create EXCELLENT video plan";
    const create=$("createBtn"); if(create)create.insertAdjacentElement("afterend",btn); btn.addEventListener("click",run);
    const note=document.createElement("p"); note.className="privacy-note"; note.textContent="Story Director builds a goal, obstacle, escalation, payoff and ending, then creates separate visual and motion prompts. Quality Control checks the result before generation — still local and free."; btn.insertAdjacentElement("afterend",note);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
