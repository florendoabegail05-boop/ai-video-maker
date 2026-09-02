"use strict";

/* Quality Director v3 — story-first, continuity-aware, provider-neutral video planning. */
(function(){
  const KEY="aivm.creatorStudio.v1";
  const $=id=>document.getElementById(id);
  const clean=s=>String(s||"").replace(/\s+/g," ").trim();
  const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return {}}};
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};
  const active=s=>(s.projects||[]).find(p=>p.id===s.activeProjectId)||(s.projects||[])[0];

  function locks(s){
    const p=s.profiles||{},c=p.character||{},e=p.environment||{},v=p.style||{};
    return {
      character:clean(`${c.name||"Main character"}. ${c.description||"Stable recognizable identity."} ${c.age?`Age ${c.age}.`:""} ${c.traits?`Traits: ${c.traits}.`:""} ${c.wardrobe?`Wardrobe: ${c.wardrobe}.`:""}`),
      world:clean(`${e.name||"Main world"}. ${e.description||"Stable setting."} ${e.details||""} ${e.lighting?`Lighting: ${e.lighting}.`:""} ${e.props?`Key props: ${e.props}.`:""}`),
      style:clean(`${v.name||"Polished cinematic style"}. ${v.description||""} ${v.palette?`Palette: ${v.palette}.`:""} ${v.camera?`Camera language: ${v.camera}.`:""}`)
    };
  }
  function idea(idea){const x=clean(idea).replace(/[.!?]+$/g,"");return x||"the main character";}
  function beats(n){
    if(n<=4)return ["HOOK","SETUP","PAYOFF","ENDING"];
    if(n===5)return ["HOOK","SETUP","OBSTACLE","PAYOFF","ENDING"];
    if(n<=7)return ["HOOK","SETUP","DESIRE","OBSTACLE","PAYOFF","MEMORY","ENDING"];
    return ["HOOK","SETUP","DESIRE","OBSTACLE","ESCALATION","TURN","PAYOFF","MEMORY","ENDING"].slice(0,n);
  }
  const action={
    HOOK:x=>`Reveal ${x} immediately through a visually intriguing detail that creates one clear question.`,
    SETUP:x=>`Make the character's goal connected to ${x} obvious through a simple choice or action.`,
    DESIRE:x=>`Show the character actively pursuing the goal related to ${x}; make the desired result easy to anticipate.`,
    OBSTACLE:x=>`Introduce one small, understandable obstacle blocking the goal related to ${x}.`,
    ESCALATION:x=>`The character makes one stronger attempt; the obstacle briefly becomes more difficult, producing a readable reaction.`,
    TURN:x=>`A clear discovery, idea, helper or opportunity changes the situation and points toward the solution.`,
    PAYOFF:x=>`Show direct cause and effect: the character's action solves the central problem related to ${x}, followed by a clear emotional reaction.`,
    MEMORY:x=>`Hold on the strongest visual result of ${x}; let the audience absorb the emotion and beauty of the moment.`,
    ENDING:x=>`Close with a warm, earned final reaction that leaves the story complete while naturally suggesting another adventure.`
  };
  const camera={HOOK:"Medium-wide context, then gentle push-in to the discovery.",SETUP:"Eye-level medium tracking shot; keep character and goal readable.",DESIRE:"Smooth follow shot; one intentional camera move.",OBSTACLE:"Stable medium shot, then controlled close-up on the reaction.",ESCALATION:"Slightly tighter framing with measured forward movement.",TURN:"Clean reveal that separates the new information from the previous situation.",PAYOFF:"Close on the key action, then widen for the emotional reaction.",MEMORY:"Hero framing with gentle parallax and slow controlled movement.",ENDING:"Friendly medium shot with a tiny push-in or pull-back; finish stable."};
  const emotion={HOOK:"curious",SETUP:"hopeful",DESIRE:"determined",OBSTACLE:"concerned",ESCALATION:"frustrated then brave",TURN:"surprised and hopeful",PAYOFF:"delighted",MEMORY:"joyful calm",ENDING:"warm and happy"};
  const audio={HOOK:"A tiny attention cue and musical lift.",SETUP:"Light ambience and gentle rhythmic bed.",DESIRE:"Curious forward-moving musical pulse.",OBSTACLE:"Brief tension accent, then space for the reaction.",ESCALATION:"Music rises slightly with one clear action cue.",TURN:"Small reveal accent and renewed hopeful music.",PAYOFF:"Warm musical resolution and one satisfying sound cue.",MEMORY:"Music opens, then settles so the visual can breathe.",ENDING:"Short musical button with a clean tail."};

  function make(p,s){
    const subject=idea(p.idea), n=Math.max(3,Math.min(12,Math.round(Number(p.length||30)/5))), roles=beats(n), l=locks(s);
    const scenes=roles.map((role,i)=>{
      const a=action[role](subject), start=i*5,end=start+5, em=emotion[role];
      const visual=`Vertical 9:16. ${p.style||"polished cinematic animation"}. Story beat: ${role}. ${a} Character anchor: ${l.character} World anchor: ${l.world} Style anchor: ${l.style} Composition: one dominant focal point, readable silhouette, clean foreground/midground/background separation, intentional depth and clear visual hierarchy. Emotion: ${em}. Keep the frame uncluttered and preserve established proportions, wardrobe, props, palette, lighting direction and world geometry.`;
      /* Image-to-video prompts intentionally describe motion, not a second visual description. */
      const motion=`Continuous 5-second shot. ${camera[role]||camera.SETUP} The subject ${role==="PAYOFF"?"completes the key action and reacts with delight":role==="ENDING"?"settles into a warm final reaction":"performs one clear physical action connected to the story"}. Motion is natural, readable and physically coherent, with subtle secondary environmental movement. The shot begins clearly, develops the action, and ends in a stable readable pose. Preserve the supplied image's identity, composition, lighting and spatial relationships throughout.`;
      const voice=p.includeVoice!==false?(role==="HOOK"?`Look closely... something is about to happen!`:role==="PAYOFF"?"We did it!":"Let's see what happens next!"):"";
      return {number:i+1,start,end,role,action:a,camera:camera[role]||camera.SETUP,emotion:em,environment:l.world,voiceover:voice,imagePrompt:visual,videoPrompt:motion,audioDirection:audio[role]||audio.SETUP,continuityInput:i?`Use the previous shot's final frame as the visual starting reference when the generation tool supports it.`:"Establish the approved character, world and style reference as the master starting image."};
    });
    const script=scenes.map(x=>x.voiceover).filter(Boolean).join(" ")+(p.includeCta!==false?" Follow for the next little adventure!":"");
    const qc=check(p.idea,scenes,script,s.profiles);
    return {idea:p.idea,type:p.type,length:scenes.length*5,style:p.style,includeCta:p.includeCta,includeVoice:p.includeVoice,hook:`In the first 2 seconds, create one unanswered question about ${subject.toLowerCase()}.`,script,scenes,score:qc.score,title:p.type==="Educational Video"?`Learn This: ${subject} 📚`:`${subject} ✨ | A Tiny Adventure`,description:`A story-first short with a clear goal, obstacle, escalation, payoff and consistent visual language.`,hashtags:"#Shorts #AIVideo #Animation #Storytelling",ideas:[],profiles:s.profiles||{},qualityDirector:true,storyPlan:{centralQuestion:`What will happen with ${subject.toLowerCase()}?`,goal:`Make the audience care about the outcome quickly.`,beats:roles},qc,updatedAt:Date.now()};
  }
  function check(ideaText,scenes,script,profiles){
    const roles=scenes.map(s=>s.role), hasGoal=roles.includes("SETUP")||roles.includes("DESIRE"), conflict=roles.includes("OBSTACLE")||roles.includes("ESCALATION"), payoff=roles.includes("PAYOFF"), ending=roles.includes("ENDING");
    const simple=scenes.filter(s=>(s.action.match(/\band\b|then|followed by/gi)||[]).length<=1).length;
    const continuity=scenes.filter(s=>s.continuityInput&&/Character anchor|identity/i.test(s.imagePrompt)).length;
    const scores={story:(hasGoal?20:8)+(conflict?10:0)+(payoff?15:0)+(ending?5:0),visual:15,motion:15,continuity:Math.round(15*continuity/scenes.length),audio:5,input:clean(ideaText).length>=30?5:2};
    const score=Math.min(99,Object.values(scores).reduce((a,b)=>a+b,0)),issues=[];
    if(clean(ideaText).length<30)issues.push("Strengthen the premise with a character, goal and desired outcome.");
    if(!conflict)issues.push("Add one simple obstacle so the payoff feels earned.");
    if(!payoff)issues.push("Add a visible cause-and-effect payoff.");
    if(simple<Math.ceil(scenes.length*.8))issues.push("Simplify some shots to one dominant physical action.");
    return {score,scores,issues,pass:score>=85};
  }
  function renderQC(b){
    let p=$("qualityPanel");if(!p){p=document.createElement("div");p.id="qualityPanel";p.className="result-section highlight";$("results").insertBefore(p,$("results").firstElementChild)}
    const q=b.qc||check(b.idea,b.scenes,b.script,b.profiles),status=q.pass?"READY TO GENERATE":"NEEDS REFINEMENT";
    p.innerHTML=`<div class="section-label">QUALITY CONTROL</div><h3>${status} · ${q.score}/100</h3><p class="helper">Story ${q.scores.story}/50 · Visual ${q.scores.visual}/15 · Motion ${q.scores.motion}/15 · Continuity ${q.scores.continuity}/15 · Audio ${q.scores.audio}/5</p>${q.issues.length?q.issues.map(x=>`<div class="idea-item">⚠ ${esc(x)}</div>`).join(""):'<div class="idea-item">✓ Story, visual direction, motion, continuity and audio checks passed.</div>'}<button id="qualityRecheckBtn" class="secondary-button" type="button">↻ Recheck quality</button>`;
    $("qualityRecheckBtn").onclick=()=>{const s=read(),p=active(s);if(!p?.blueprint)return;p.blueprint.qc=check(p.blueprint.idea,p.blueprint.scenes,p.blueprint.script,p.blueprint.profiles);p.blueprint.score=p.blueprint.qc.score;save(s);renderQC(p.blueprint);$("score").textContent=p.blueprint.score};
  }
  function render(b){
    $("videoSummary").textContent=`${b.type} • ${b.length}s • ${b.style} • ${b.scenes.length} shots • Quality Director v3`;
    $("resultTitle").textContent=b.title;$("hook").textContent=b.hook;$("script").textContent=b.script;$("score").textContent=b.score;$("sceneCountBadge").textContent=`${b.scenes.length} × 5s shots`;
    $("title").textContent=b.title;$("description").textContent=b.description;$("hashtags").textContent=b.hashtags;
    $("ideaList").innerHTML=b.scenes.map((x,i)=>`<div class="idea-item"><b>${i+1}.</b> ${esc(x.role)} — ${esc(x.action)}</div>`).join("");
    $("scenes").innerHTML=b.scenes.map((x,i)=>`<div class="scene" data-scene-index="${i}"><div class="scene-head"><h4>Scene ${i+1} · ${esc(x.role)}</h4><div class="scene-tools"><span class="timing">${x.start}s–${x.end}s</span></div></div><div class="scene-editor"><label>Story action<textarea data-field="action">${esc(x.action)}</textarea></label><label>Camera<input data-field="camera" value="${esc(x.camera)}"></label><label>Emotion<input data-field="emotion" value="${esc(x.emotion)}"></label><label>Environment<input data-field="environment" value="${esc(x.environment)}"></label><label>Voiceover<textarea data-field="voiceover">${esc(x.voiceover)}</textarea></label><label>Image prompt<textarea data-field="imagePrompt">${esc(x.imagePrompt)}</textarea></label><label>Image-to-video motion<textarea data-field="videoPrompt">${esc(x.videoPrompt)}</textarea></label><label>Audio direction<input data-field="audioDirection" value="${esc(x.audioDirection)}"></label><label>Continuity handoff<input data-field="continuityInput" value="${esc(x.continuityInput)}"></label></div></div>`).join("");
    $("results").classList.remove("hidden");renderQC(b);
  }
  function run(){const s=read(),p=active(s);if(!p){$("newProjectBtn")?.click();return}if(!clean($("idea").value)){$("idea").focus();return}p.name=$("projectName").value.trim()||p.name||"Untitled Video";p.idea=$("idea").value.trim();p.type=$("type").value;p.length=Number($("length").value);p.style=$("style").value;p.includeCta=$("includeCta").checked;p.includeVoice=$("includeVoice").checked;const b=make(p,s);p.blueprint=b;p.updatedAt=Date.now();s.activeProjectId=p.id;save(s);render(b);$("results").scrollIntoView({behavior:"smooth",block:"start"})}
  function install(){if($("qualityCreateBtn"))return;const b=document.createElement("button");b.id="qualityCreateBtn";b.type="button";b.className="primary-button quality-button";b.innerHTML="<span>✦</span> Create EXCELLENT video plan";const c=$("createBtn");if(c)c.insertAdjacentElement("afterend",b);b.onclick=run;const n=document.createElement("p");n.className="privacy-note";n.textContent="Story Director + Quality Control: stronger story beats, simpler motion prompts, continuity handoffs and generation checks — local and free.";b.insertAdjacentElement("afterend",n)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();
