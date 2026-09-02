"use strict";

/* Production Pipeline v1 — local-first orchestration, continuity ledger, shot readiness and asset handoff. */
(function () {
  const KEY = "aivm.creatorStudio.v1";
  const PIPE_KEY = "aivm.productionPipeline.v1";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const load = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const appState = () => load(KEY);
  const active = () => { const s=appState(); return (s.projects||[]).find(p=>p.id===s.activeProjectId)||(s.projects||[])[0]||null; };
  const pipeState = () => load(PIPE_KEY);

  function ensure() {
    const p=active(); if(!p) return null;
    const ps=pipeState();
    if(ps.projectId!==p.id || !Array.isArray(ps.shots)) {
      ps.projectId=p.id; ps.shots=(p.blueprint?.scenes||[]).map((s,i)=>({index:i,status:"planned",assetType:"",assetName:"",firstFrame:"",lastFrame:"",notes:"",approved:false}));
      ps.createdAt=Date.now(); save(PIPE_KEY,ps);
    } else if(p.blueprint?.scenes?.length && ps.shots.length!==p.blueprint.scenes.length) {
      ps.shots=p.blueprint.scenes.map((s,i)=>ps.shots[i]||({index:i,status:"planned",assetType:"",assetName:"",firstFrame:"",lastFrame:"",notes:"",approved:false})); save(PIPE_KEY,ps);
    }
    return ps;
  }

  function injectStyles(){
    if($("pipelineStyles")) return;
    const st=document.createElement("style"); st.id="pipelineStyles"; st.textContent=`
      .pipeline-card{margin-top:18px}.pipeline-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.pipeline-kicker{font-size:11px;letter-spacing:.12em;font-weight:800;opacity:.65}.pipeline-flow{display:flex;gap:6px;overflow:auto;padding:12px 0}.pipeline-flow span{white-space:nowrap;padding:7px 10px;border-radius:999px;background:rgba(0,0,0,.05);font-size:12px;font-weight:700}.pipeline-flow span.done{background:rgba(22,163,74,.12)}.pipeline-score{font-weight:800}.pipeline-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}.shot-card{border:1px solid rgba(0,0,0,.1);border-radius:14px;padding:14px;background:rgba(255,255,255,.5)}.shot-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.shot-card h4{margin:0}.shot-status{font-size:11px;font-weight:800;padding:5px 8px;border-radius:999px;background:rgba(0,0,0,.06)}.shot-card label{display:block;font-size:12px;font-weight:700;margin-top:10px}.shot-card input,.shot-card textarea{width:100%;box-sizing:border-box;margin-top:5px}.shot-check{display:flex!important;align-items:center;gap:7px}.shot-check input{width:auto;margin:0}.pipeline-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.pipeline-actions button{cursor:pointer}.handoff{font-size:12px;line-height:1.5;padding:10px;border-radius:10px;background:rgba(0,0,0,.04);margin-top:10px}.pipeline-good{color:#15803d}.pipeline-warn{color:#b45309}.pipeline-danger{color:#b91c1c}.asset-input{font-size:12px}.pipeline-muted{opacity:.7;font-size:12px}
      @media(max-width:700px){.pipeline-head{flex-direction:column}.pipeline-flow{padding-bottom:4px}}
    `; document.head.appendChild(st);
  }

  function score(p,ps){
    const scenes=p?.blueprint?.scenes||[]; if(!scenes.length) return {value:0,issues:["Create a blueprint first."]};
    const issues=[]; let points=0;
    const approved=ps.shots.filter(x=>x.approved).length;
    const named=ps.shots.filter(x=>clean(x.assetName)).length;
    const handoffs=ps.shots.filter((x,i)=>i===0 || clean(x.firstFrame)).length;
    const continuity=scenes.filter(s=>/Character anchor|World anchor|Style anchor/i.test(s.imagePrompt||"")).length;
    points += Math.round((approved/scenes.length)*30);
    points += Math.round((named/scenes.length)*15);
    points += Math.round((handoffs/scenes.length)*15);
    points += Math.round((continuity/scenes.length)*20);
    points += p.blueprint.qc?.score ? Math.round(Math.min(100,p.blueprint.qc.score)*.2) : Math.round((p.blueprint.score||70)*.2);
    if(!approved) issues.push("Approve the strongest version of each shot before assembly.");
    if(approved<scenes.length) issues.push(`${scenes.length-approved} shot(s) still need approval.`);
    if(named<scenes.length) issues.push(`${scenes.length-named} shot(s) have no asset/handoff name yet.");
    if(handoffs<scenes.length) issues.push("Record the first-frame state for every shot so continuity can be checked at the cut.");
    return {value:Math.min(99,points),issues};
  }

  function buildHandoff(scene,index,ps){
    const prev=ps.shots[index-1];
    if(index===0) return "MASTER START: begin from the approved character/world/style reference.";
    return `CONTINUITY HANDOFF: start from Scene ${index} final state${prev?.lastFrame?` (${prev.lastFrame})`:""}. Preserve screen direction, character identity, wardrobe, prop state, lighting direction, world geometry and camera side. Change only what this shot's action requires.`;
  }

  function render(){
    injectStyles();
    const p=active(); const ps=ensure();
    let card=$("productionPipeline");
    if(!card){ card=document.createElement("section"); card.id="productionPipeline"; card.className="panel pipeline-card"; const results=$("results"); if(!results) return; results.appendChild(card); }
    if(!p?.blueprint){ card.innerHTML=`<div class="pipeline-kicker">PRODUCTION PIPELINE</div><h3>Create a blueprint to unlock production control.</h3><p class="pipeline-muted">This workspace stays local and does not require an AI API.</p>`; return; }
    const q=score(p,ps), scenes=p.blueprint.scenes||[];
    const statuses=ps.shots.map(s=>s.approved).filter(Boolean).length;
    card.innerHTML=`<div class="pipeline-head"><div><div class="pipeline-kicker">PRODUCTION PIPELINE</div><h3>Turn the blueprint into a controlled video build</h3><p class="pipeline-muted">Generate one shot at a time, preserve continuity, review the cut, then assemble.</p></div><div class="pipeline-score">Readiness ${q.value}/100</div></div>
      <div class="pipeline-flow"><span class="done">1 Story</span><span class="done">2 Storyboard</span><span>3 Reference</span><span>4 Generate</span><span>5 Continuity QC</span><span>6 Audio</span><span>7 Assemble</span><span>8 Publish</span></div>
      <div class="handoff"><b>Golden rule:</b> the source image establishes appearance; the motion prompt should mainly direct camera, subject movement, environmental movement and timing. For sequential shots, preserve the previous shot's final state instead of reinventing the world. </div>
      <div class="pipeline-actions"><button id="pipelineExport" class="secondary-button" type="button">↓ Export production package</button><button id="pipelineReset" class="secondary-button" type="button">Reset shot tracking</button></div>
      ${q.issues.length?`<div class="handoff pipeline-warn">${q.issues.map(esc).map(x=>`⚠ ${x}`).join("<br>")}</div>`:`<div class="handoff pipeline-good">✓ All pipeline readiness checks are currently satisfied.</div>`}
      <p class="pipeline-muted">${statuses}/${scenes.length} shots approved</p>
      <div class="pipeline-grid">${scenes.map((s,i)=>{const t=ps.shots[i];return `<article class="shot-card"><div class="shot-top"><h4>Shot ${i+1} · ${esc(s.role||"Beat")}</h4><span class="shot-status">${t.approved?"APPROVED":t.status.toUpperCase()}</span></div><p class="pipeline-muted">${s.start}s–${s.end}s · ${esc(s.action||"")}</p><div class="handoff">${esc(buildHandoff(s,i,ps))}</div><label>Generation asset / file name<input class="asset-input" data-pipe="assetName" data-index="${i}" value="${esc(t.assetName)}" placeholder="shot-01.mp4 or image-01.png"></label><label>First-frame state<input data-pipe="firstFrame" data-index="${i}" value="${esc(t.firstFrame)}" placeholder="e.g. standing, facing right, holding red key"></label><label>Last-frame state<input data-pipe="lastFrame" data-index="${i}" value="${esc(t.lastFrame)}" placeholder="Stable end pose for next shot"></label><label>QC notes<textarea data-pipe="notes" data-index="${i}" rows="2" placeholder="Identity, motion, physics, framing issues">${esc(t.notes)}</textarea></label><label class="shot-check"><input type="checkbox" data-pipe="approved" data-index="${i}" ${t.approved?"checked":""}> Approve this shot</label></article>`}).join("")}</div>`;
    $("pipelineExport").addEventListener("click",exportPackage); $("pipelineReset").addEventListener("click",()=>{if(confirm("Reset shot tracking for this project?")){const s=pipeState();s.shots=(p.blueprint.scenes||[]).map((_,i)=>({index:i,status:"planned",assetType:"",assetName:"",firstFrame:"",lastFrame:"",notes:"",approved:false}));save(PIPE_KEY,s);render();}});
    card.querySelectorAll("[data-pipe]").forEach(el=>el.addEventListener("change",()=>{const s=pipeState(); const i=Number(el.dataset.index); const field=el.dataset.pipe; s.shots[i][field]=el.type==="checkbox"?el.checked:el.value; if(field==="approved")s.shots[i].status=el.checked?"approved":"review"; save(PIPE_KEY,s); render();}));
  }

  function exportPackage(){
    const p=active(); const ps=ensure(); if(!p?.blueprint)return;
    const scenes=p.blueprint.scenes||[];
    const pkg={version:1,project:{name:p.name,idea:p.idea,type:p.type,length:p.length,style:p.style},quality:p.blueprint.qc||{score:p.blueprint.score},storyPlan:p.blueprint.storyPlan||null,profiles:p.blueprint.profiles||{},shots:scenes.map((s,i)=>({...s,pipeline:ps.shots[i],continuityHandoff:buildHandoff(s,i,ps)})),createdAt:Date.now()};
    const blob=new Blob([JSON.stringify(pkg,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`${(p.name||"ai-video-production").replace(/[^a-z0-9_-]+/gi,"-").toLowerCase()}-production.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function boot(){
    const hook=()=>{ if($("results")&&!$("results").classList.contains("hidden")) render(); };
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(hook,300)); else setTimeout(hook,300);
    document.addEventListener("click",e=>{if(e.target.closest("#createBtn")||e.target.closest("#qualityCreateBtn")||e.target.closest("#regenerateBtn"))setTimeout(render,250);});
  }
  boot();
})();
