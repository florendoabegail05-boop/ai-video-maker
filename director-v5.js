"use strict";
(function(){
  const KEY="aivm.creatorStudio.v1";
  const $=id=>document.getElementById(id);
  const clean=v=>String(v??"").replace(/\s+/g," ").trim();
  const esc=v=>clean(v).replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch{return{}}};
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));return true}catch{return false}};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const active=s=>(s.projects||[]).find(p=>p.id===s.activeProjectId)||(s.projects||[])[0]||null;
  function sceneWordCount(s){return clean(s.voiceover).split(/\s+/).filter(Boolean).length;}
  function pacing(scenes){
    const n=scenes.length;
    const maxWords=Math.max(1,Math.floor(n*5*2.15));
    const words=scenes.reduce((a,s)=>a+sceneWordCount(s),0);
    return {words,maxWords,comfortable:words<=maxWords,wordsPerSecond:Math.round(words/Math.max(1,n*5)*10)/10};
  }
  function transitions(scenes){
    return scenes.map((s,i)=>({
      from:i+1,
      to:i<nMinusOne(scenes)?i+2:null,
      handoff:clean(s.lastFrameState||s.nextShotHandoff||s.continuityInput),
      direction:clean(s.camera||"stable camera"),
      ready:clean(s.lastFrameState||s.nextShotHandoff||s.continuityInput).length>=20
    }));
  }
  function nMinusOne(a){return a.length-1;}
  function analyze(b){
    const scenes=Array.isArray(b.scenes)?b.scenes:[];
    const roles=scenes.map(s=>clean(s.role).toUpperCase());
    const has=r=>roles.includes(r);
    const actionCoverage=scenes.length?scenes.filter(s=>clean(s.dominantAction||s.action).length>=12).length/scenes.length:0;
    const visualCoverage=scenes.length?scenes.filter(s=>clean(s.imagePrompt).length>=100).length/scenes.length:0;
    const motionCoverage=scenes.length?scenes.filter(s=>clean(s.videoPrompt).length>=80).length/scenes.length:0;
    const continuityCoverage=scenes.length?scenes.filter(s=>clean(s.continuityInput||s.nextShotHandoff||s.lastFrameState).length>=20).length/scenes.length:0;
    const p=pacing(scenes);
    const story=[has("HOOK"),has("SETUP")||has("DESIRE"),has("OBSTACLE")||has("ESCALATION"),scenes.length<7||has("TURN"),has("PAYOFF"),has("ENDING")].filter(Boolean).length;
    const causeEffect=has("PAYOFF")&&scenes.some(s=>/cause|result|completes|desired result/i.test(`${s.action} ${s.videoPrompt}`));
    const audienceClarity=clean(b.idea).length>=45 && clean(b.hook).length>=20;
    const score=Math.round(clamp(story/6*40 + actionCoverage*15 + visualCoverage*10 + motionCoverage*10 + continuityCoverage*10 + (p.comfortable?5:0) + (causeEffect?5:0) + (audienceClarity?5:0),0,100));
    const issues=[];
    if(!has("HOOK"))issues.push("Make shot 1 an immediate visual hook with one unanswered question.");
    if(!(has("SETUP")||has("DESIRE")))issues.push("Show a visible protagonist goal before the problem.");
    if(!(has("OBSTACLE")||has("ESCALATION")))issues.push("Add one understandable obstacle so the payoff feels earned.");
    if(scenes.length>=7&&!has("TURN"))issues.push("Add a meaningful turn before the final attempt/payoff.");
    if(!has("PAYOFF"))issues.push("Create visible cause-and-effect payoff.");
    if(!has("ENDING"))issues.push("End with a clean emotional or informational resolution.");
    if(actionCoverage<.85)issues.push("Give every shot one dominant physical action.");
    if(visualCoverage<.9)issues.push("Strengthen image prompts with subject, composition, continuity and style anchors.");
    if(motionCoverage<.9)issues.push("Strengthen motion prompts with one action, camera behavior and a stable end state.");
    if(continuityCoverage<1)issues.push("Add a concrete final-frame/next-shot handoff for every transition.");
    if(!p.comfortable)issues.push(`Voiceover is dense (${p.words} words). Target ${p.maxWords} or fewer for comfortable pacing.`);
    return {score,issues,storyBeats:story,actionCoverage,visualCoverage,motionCoverage,continuityCoverage,pacing:p,causeEffect,audienceClarity};
  }
  function productionChecklist(b){
    const scenes=Array.isArray(b.scenes)?b.scenes:[];
    return [
      ["Story spine",!!b.storyPlan&&clean(b.storyPlan.protagonistGoal).length>10],
      ["Hook",scenes[0]&&clean(scenes[0].role).toUpperCase()==="HOOK"],
      ["Goal before obstacle",scenes.some(s=>/SETUP|DESIRE/i.test(s.role||""))],
      ["Payoff",scenes.some(s=>/PAYOFF/i.test(s.role||""))],
      ["Ending",scenes.some(s=>/ENDING/i.test(s.role||""))],
      ["Image prompts",scenes.length>0&&scenes.every(s=>clean(s.imagePrompt).length>=100)],
      ["Motion prompts",scenes.length>0&&scenes.every(s=>clean(s.videoPrompt).length>=80)],
      ["Continuity handoffs",scenes.length>0&&scenes.every(s=>clean(s.lastFrameState||s.nextShotHandoff||s.continuityInput).length>=20)],
      ["Audio direction",scenes.length>0&&scenes.every(s=>clean(s.audioDirection).length>=15)],
      ["Voiceover fit",analyze(b).pacing.comfortable]
    ];
  }
  function providerPack(b){
    const safe=clean(b.idea).slice(0,180);
    return {format:"AI Video Maker Production Pack v5",createdAt:new Date().toISOString(),project:{idea:safe,type:b.type,length:b.length,style:b.style},story:b.storyPlan||null,shots:(b.scenes||[]).map(s=>({shot:s.number,time:`${s.start}-${s.end}s`,role:s.role,action:s.action,emotion:s.emotion,camera:s.camera,imagePrompt:s.imagePrompt,videoPrompt:s.videoPrompt,negativePrompt:s.negativePrompt,audio:s.audioDirection,firstFrame:s.firstFrameState||s.continuityInput,lastFrame:s.lastFrameState||s.nextShotHandoff,nextShot:s.nextShotHandoff||"Final shot."}))};
  }
  function render(b){
    const q=analyze(b), checks=productionChecklist(b), panel=document.getElementById("directorV5");
    if(!panel)return;
    const status=q.score>=90&&q.issues.length===0?"PRODUCTION READY":q.score>=80?"GOOD — POLISH RECOMMENDED":"NEEDS STORY/SHOT WORK";
    panel.innerHTML=`<div class="director-top"><div><div class="section-label">DIRECTOR V5</div><h3>${status}</h3><p>Pre-generation control center: story, pacing, shot quality, continuity and production readiness.</p></div><div class="director-score"><strong>${q.score}</strong><small>/100</small></div></div><div class="director-metrics"><span>Story ${q.storyBeats}/6</span><span>Action ${Math.round(q.actionCoverage*100)}%</span><span>Visual ${Math.round(q.visualCoverage*100)}%</span><span>Motion ${Math.round(q.motionCoverage*100)}%</span><span>Continuity ${Math.round(q.continuityCoverage*100)}%</span><span>VO ${q.pacing.wordsPerSecond} w/s</span></div><div class="director-grid"><div><b>Production checklist</b>${checks.map(x=>`<div class="director-check ${x[1]?"ok":"warn"}">${x[1]?"✓":"!"} ${esc(x[0])}</div>`).join("")}</div><div><b>Director recommendations</b>${(q.issues.length?q.issues:["All core gates passed. Keep the first frame visually strong and avoid adding extra actions during generation."]).map(x=>`<div class="director-note">${esc(x)}</div>`).join("")}</div></div><div class="director-actions"><button id="directorPackBtn" class="secondary-button" type="button">↓ Production JSON</button><button id="directorCopyBtn" class="secondary-button" type="button">Copy shot prompts</button><button id="directorRefreshBtn" class="secondary-button" type="button">↻ Recheck</button></div>`;
    $("directorPackBtn").onclick=()=>downloadJSON(providerPack(b),`ai-video-maker-${Date.now()}.json`);
    $("directorCopyBtn").onclick=()=>copyText((b.scenes||[]).map(s=>`SHOT ${s.number} ${s.start}-${s.end}s\nIMAGE: ${s.imagePrompt}\nVIDEO: ${s.videoPrompt}\nAUDIO: ${s.audioDirection||""}\nNEGATIVE: ${s.negativePrompt||""}`).join("\n\n"));
    $("directorRefreshBtn").onclick=()=>{const s=read(),p=active(s);if(!p?.blueprint)return;render(p.blueprint);};
  }
  function downloadJSON(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function copyText(text){try{await navigator.clipboard.writeText(text);if(window.showToast)window.showToast("Copied to clipboard.");}catch{window.showToast?.("Copy unavailable; use the export instead.");}}
  function mount(){
    const results=$("results"); if(!results||document.getElementById("directorV5"))return;
    const p=document.createElement("div");p.id="directorV5";p.className="result-section director-v5";results.insertBefore(p,results.firstElementChild);
    const refresh=()=>{const s=read(),a=active(s);if(a?.blueprint)render(a.blueprint);};
    $("createBtn")?.addEventListener("click",()=>setTimeout(refresh,350));
    $("regenerateBtn")?.addEventListener("click",()=>setTimeout(refresh,350));
    $("results")?.addEventListener("input",()=>{clearTimeout(mount.t);mount.t=setTimeout(refresh,500);});
    refresh();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
  window.AIVMDirectorV5={analyze,productionChecklist,providerPack};
})();
