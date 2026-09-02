"use strict";

/* YouTube-safe creator layer: local-only diagnostics, originality/repetition checks,
   batch planning and publishing schedule export. It never fakes YouTube metrics or
   claims YPP approval. */
const AIVM_MONETIZATION_KEY = "aivm.monetization.v1";
const MonetizationEngine = (() => {
  const load = () => { try { return JSON.parse(localStorage.getItem(AIVM_MONETIZATION_KEY)) || { library: [], batch: [] }; } catch { return { library: [], batch: [] }; } };
  const save = s => { try { localStorage.setItem(AIVM_MONETIZATION_KEY, JSON.stringify(s)); } catch {} };
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = s => new Set(norm(s).split(" ").filter(w => w.length > 2));
  const similarity = (a,b) => { const A=words(a), B=words(b); if(!A.size||!B.size) return 0; let n=0; A.forEach(w=>{if(B.has(w))n++;}); return Math.round((2*n/(A.size+B.size))*100); };
  const signature = bp => [bp.title,bp.hook,bp.idea,...(bp.scenes||[]).map(s=>`${s.action} ${s.camera} ${s.environment}`)].join(" ");
  function analyze(bp, state) {
    const text=signature(bp), library=state.library||[];
    const matches=library.map(x=>({title:x.title||"Untitled", score:similarity(text,x.signature||"")})).filter(x=>x.score>=55).sort((a,b)=>b.score-a.score).slice(0,5);
    const issues=[];
    if((bp.scenes||[]).length<3) issues.push("Too few scenes for a complete short.");
    if(!bp.idea || norm(bp.idea).split(" ").length<5) issues.push("Story premise is too thin; add a clear subject, goal and change.");
    if(!bp.hook || bp.hook.length<20) issues.push("Hook is weak or too short.");
    if(!bp.script || bp.script.length<80) issues.push("Story/script may not provide enough original substance.");
    if(matches[0]?.score>=75) issues.push(`High similarity to an existing project (${matches[0].score}%). Rewrite before publishing.`);
    const empty=(bp.scenes||[]).filter(s=>!s.action||!s.imagePrompt||!s.videoPrompt).length;
    if(empty) issues.push(`${empty} scene(s) have incomplete production prompts.`);
    const uniqueActions=new Set((bp.scenes||[]).map(s=>norm(s.action))).size;
    if(uniqueActions < Math.max(2, Math.ceil((bp.scenes||[]).length*0.5))) issues.push("Scene actions are highly repetitive.");
    const score=Math.max(0,Math.min(100,92-issues.length*12-(matches[0]?.score>=75?15:0)));
    return {score, status:score>=80?"READY TO REVIEW":score>=60?"NEEDS IMPROVEMENT":"DO NOT PUBLISH", issues, matches};
  }
  function add(bp) { const s=load(); const item={id:`v-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, title:bp.title||"Untitled", signature:signature(bp), blueprint:bp, addedAt:Date.now()}; s.library=[item,...s.library.filter(x=>x.signature!==item.signature)].slice(0,500); s.batch=[...s.batch,item].slice(0,200); save(s); return item; }
  function remove(id) { const s=load(); s.batch=s.batch.filter(x=>x.id!==id); save(s); return s; }
  function clearBatch(){const s=load();s.batch=[];save(s);return s;}
  function get(){return load();}
  function exportBatch(){const s=load(); const rows=s.batch.map((x,i)=>({order:i+1,title:x.title,status:"SCHEDULE IN YOUTUBE STUDIO",addedAt:new Date(x.addedAt).toISOString()})); return JSON.stringify({createdAt:new Date().toISOString(),notice:"Planning/export data only. Publishing must occur through YouTube and its official tools/API.",items:rows},null,2);}
  return {analyze,add,remove,clearBatch,get,exportBatch,similarity};
})();

window.addEventListener("DOMContentLoaded", () => {
  const results=document.getElementById("results"); if(!results) return;
  const panel=document.createElement("section"); panel.className="panel monetization-panel"; panel.id="monetizationPanel";
  panel.innerHTML=`<div class="panel-heading"><div><span class="step">YT</span><div><h2>YouTube Growth & Monetization Guard</h2><p>Originality, repetition, batch planning and pre-publish quality checks — all local.</p></div></div><span class="local-badge">LOCAL-ONLY</span></div><div class="yt-grid"><article><div class="section-label">PUBLISH CHECK</div><div id="ytGuardScore" class="guard-score">—</div><p id="ytGuardStatus">Create a blueprint to run the check.</p><ul id="ytGuardIssues" class="guard-issues"></ul><button id="ytAnalyzeBtn" class="secondary-button" type="button">Run originality & quality check</button></article><article><div class="section-label">BATCH STUDIO</div><div class="batch-controls"><button id="ytAddBatchBtn" class="secondary-button" type="button">＋ Add current video</button><button id="ytClearBatchBtn" class="secondary-button" type="button">Clear batch</button><button id="ytExportBatchBtn" class="secondary-button" type="button">↓ Export batch plan</button></div><div id="ytBatchSummary" class="batch-summary"></div><div id="ytBatchList" class="batch-list"></div></article></div><p class="guard-note">This guard is a safety/quality aid, not a guarantee of YouTube Partner Program approval. It does not create fake views, automate engagement, or bypass YouTube policies.</p>`;
  results.parentNode.insertBefore(panel, results);
  const scoreEl=document.getElementById("ytGuardScore"), statusEl=document.getElementById("ytGuardStatus"), issuesEl=document.getElementById("ytGuardIssues"), listEl=document.getElementById("ytBatchList"), summaryEl=document.getElementById("ytBatchSummary");
  function current(){return window.currentBlueprint || null;}
  function renderBatch(){const s=MonetizationEngine.get(); summaryEl.textContent=`${s.batch.length} video${s.batch.length===1?"":"s"} queued locally`; listEl.innerHTML=s.batch.slice(0,30).map((x,i)=>`<div class="batch-item"><span>${i+1}</span><b>${String(x.title).replace(/[&<>]/g,"")}</b><button type="button" data-remove="${x.id}">Remove</button></div>`).join("")||'<div class="empty-batch">No videos queued. Add a finished blueprint.</div>'; listEl.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{MonetizationEngine.remove(b.dataset.remove);renderBatch();});}
  function analyze(){const bp=current();if(!bp){statusEl.textContent="Create a blueprint first.";return;}const r=MonetizationEngine.analyze(bp,MonetizationEngine.get());scoreEl.textContent=r.score+"/100";statusEl.textContent=r.status;issuesEl.innerHTML=r.issues.length?r.issues.map(x=>`<li>${String(x).replace(/[&<>]/g,"")}</li>`).join(""):"<li>✓ No major local quality/repetition flags.</li>";}
  document.getElementById("ytAnalyzeBtn").onclick=analyze;
  document.getElementById("ytAddBatchBtn").onclick=()=>{const bp=current();if(!bp){statusEl.textContent="Create a blueprint first.";return;}MonetizationEngine.add(bp);renderBatch();analyze();};
  document.getElementById("ytClearBatchBtn").onclick=()=>{MonetizationEngine.clearBatch();renderBatch();};
  document.getElementById("ytExportBatchBtn").onclick=()=>{const blob=new Blob([MonetizationEngine.exportBatch()],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="youtube-batch-plan.json";a.click();URL.revokeObjectURL(a.href);};
  renderBatch();
});
