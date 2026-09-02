"use strict";
(function () {
  const KEY = "aivm.creatorStudio.v1", PIPE = "aivm.productionPipeline.v2";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const load = k => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; } };
  const save = (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const app = () => load(KEY);
  const active = () => { const s = app(); return (s.projects || []).find(p => p.id === s.activeProjectId) || (s.projects || [])[0] || null; };

  function blankShot(i) { return { index:i, status:"planned", assetName:"", firstFrame:"", lastFrame:"", notes:"", approved:false }; }
  function ensure() {
    const p = active(); if (!p) return null;
    let x = load(PIPE), scenes = p.blueprint?.scenes || [];
    if (x.projectId !== p.id || !Array.isArray(x.shots)) x = { projectId:p.id, shots:scenes.map((_,i)=>blankShot(i)), updatedAt:Date.now() };
    else if (x.shots.length !== scenes.length) x.shots = scenes.map((_,i)=>x.shots[i] || blankShot(i));
    x.shots.forEach((s,i)=>s.index=i);
    save(PIPE,x); return x;
  }

  function readiness(p,x) {
    const scenes = p.blueprint?.scenes || [], total = scenes.length || 1, qcPass = !!p.blueprint?.qc?.pass;
    const approved = x.shots.filter(s=>s.approved).length;
    const assets = x.shots.filter(s=>String(s.assetName||"").trim()).length;
    const first = x.shots.filter(s=>String(s.firstFrame||"").trim()).length;
    const last = x.shots.filter(s=>String(s.lastFrame||"").trim()).length;
    const handoffs = scenes.filter((s,i)=>i===0 || String(s.continuityInput||"").trim().length>25).length;
    const value = Math.round((approved/total)*30 + (assets/total)*15 + (first/total)*10 + (last/total)*10 + (handoffs/total)*10 + (qcPass?25:0));
    const issues=[];
    if(!qcPass) issues.push("Story Quality Gate must pass before production is marked ready.");
    if(approved<total) issues.push(`${total-approved} shot(s) need approval.`);
    if(assets<total) issues.push(`${total-assets} shot(s) need an asset/file name.`);
    if(first<total) issues.push(`${total-first} shot(s) need a first-frame state.`);
    if(last<total) issues.push(`${total-last} shot(s) need a last-frame state.`);
    if(handoffs<total) issues.push(`${total-handoffs} shot(s) need continuity handoff data.`);
    return { value:Math.min(100,value), issues, ready:qcPass && issues.length===0 };
  }

  function handoff(i,x) {
    if(i===0) return "MASTER START: use the approved character, world and style references.";
    const prev=x.shots[i-1];
    return `CONTINUITY HANDOFF: begin from Shot ${i} final state${prev?.lastFrame?` (${prev.lastFrame})`:""}. Preserve identity, wardrobe, prop state, lighting direction, world geometry, screen direction and camera side. Change only what the next action requires.`;
  }

  function exportPkg(p,x) {
    const b=p.blueprint, scenes=b?.scenes||[], q=readiness(p,x);
    const pkg={version:2,project:{name:p.name,idea:p.idea,type:p.type,length:p.length,style:p.style},quality:b?.qc||null,storyPlan:b?.storyPlan||null,profiles:b?.profiles||{},readiness:q,shots:scenes.map((s,i)=>({...s,pipeline:x.shots[i],continuityHandoff:handoff(i,x)})),createdAt:Date.now()};
    const url=URL.createObjectURL(new Blob([JSON.stringify(pkg,null,2)],{type:"application/json"})),a=document.createElement("a");a.href=url;a.download=`${(p.name||"ai-video-production").replace(/[^a-z0-9_-]+/gi,"-").toLowerCase()}-production.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function render() {
    const p=active(), x=ensure(), results=$("results"); if(!results) return;
    let card=$("productionPipeline"); if(!card){card=document.createElement("section");card.id="productionPipeline";card.className="panel pipeline-card";results.appendChild(card);}
    if(!p?.blueprint){card.innerHTML='<div class="pp-muted">Production Pipeline unlocks after you create a blueprint.</div>';return;}
    const sc=p.blueprint.scenes||[], q=readiness(p,x);
    card.innerHTML=`<div class="pp-head"><div><div class="eyebrow">PRODUCTION PIPELINE</div><h3>Controlled shot-by-shot production</h3><p class="pp-muted">Generate, review, preserve continuity, then assemble. The pipeline never claims readiness until the story gate and every shot gate pass.</p></div><strong>Readiness ${q.value}/100</strong></div><div class="pp-flow"><span class="done">1 Story</span><span class="done">2 Storyboard</span><span class="done">3 References</span><span>4 Generate</span><span>5 QC</span><span>6 Audio</span><span>7 Assemble</span><span>8 Publish</span></div><div class="pp-handoff"><b>Generation rule:</b> use the source image as the visual anchor; image-to-video prompts should mainly direct subject motion, camera motion, timing and necessary environmental motion. Carry forward each shot's final state when the tool supports it.</div><div class="pp-actions"><button id="ppExport" class="secondary-button" type="button">↓ Export production package</button><button id="ppReset" class="secondary-button" type="button">Reset tracking</button></div>${q.issues.length?`<div class="pp-handoff pp-warn">⚠ ${q.issues.map(esc).join("<br>⚠ ")}</div>`:'<div class="pp-handoff pp-good">✓ Production gates passed. Ready for assembly.</div>'}<p class="pp-muted">${x.shots.filter(s=>s.approved).length}/${sc.length} shots approved</p><div class="pp-grid">${sc.map((s,i)=>{const t=x.shots[i];return`<article class="pp-shot"><div class="pp-top"><h4>Shot ${i+1} · ${esc(s.role||"Beat")}</h4><span class="pp-status">${t.approved?'APPROVED':String(t.status||'planned').toUpperCase()}</span></div><p class="pp-muted">${s.start}s–${s.end}s · ${esc(s.action||"")}</p><div class="pp-handoff">${esc(handoff(i,x))}</div><label>Asset / file name<input data-pp="assetName" data-i="${i}" value="${esc(t.assetName)}" placeholder="shot-01.mp4"></label><label>First-frame state<input data-pp="firstFrame" data-i="${i}" value="${esc(t.firstFrame)}" placeholder="pose, facing, prop state"></label><label>Last-frame state<input data-pp="lastFrame" data-i="${i}" value="${esc(t.lastFrame)}" placeholder="stable state for next shot"></label><label>QC notes<textarea data-pp="notes" data-i="${i}" rows="2" placeholder="identity, motion, physics, framing">${esc(t.notes)}</textarea></label><label class="pp-check"><input type="checkbox" data-pp="approved" data-i="${i}" ${t.approved?'checked':''}> Approve shot</label></article>`}).join("")}</div>`;
    $("ppExport").onclick=()=>exportPkg(p,x);
    $("ppReset").onclick=()=>{if(confirm("Reset shot tracking?")){x.shots=sc.map((_,i)=>blankShot(i));x.updatedAt=Date.now();save(PIPE,x);render();}};
    card.querySelectorAll("[data-pp]").forEach(el=>el.onchange=()=>{const i=+el.dataset.i,f=el.dataset.pp;x.shots[i][f]=el.type==='checkbox'?el.checked:el.value;if(f==='approved')x.shots[i].status=el.checked?'approved':'review';x.updatedAt=Date.now();save(PIPE,x);render();});
  }

  function boot(){const r=()=>{if($("results")&&!$("results").classList.contains("hidden"))render();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(r,350));else setTimeout(r,350);document.addEventListener('click',e=>{if(e.target.closest('#createBtn')||e.target.closest('#qualityCreateBtn')||e.target.closest('#regenerateBtn'))setTimeout(r,350);});}
  boot();
})();
