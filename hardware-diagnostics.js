(() => {
  const BRIDGE = 'http://127.0.0.1:8787';
  const panel = document.getElementById('generationHealth');
  const summary = document.getElementById('generationHealthSummary');
  const details = document.getElementById('generationHealthDetails');
  const refresh = document.getElementById('refreshHealthBtn');
  if (!panel) return;
  const labels = { ready: 'READY', limited: 'LIMITED', unavailable: 'NOT READY' };
  const icon = s => s === 'ready' ? '✓' : s === 'limited' ? '!' : '—';
  function show(report) {
    const c = report.capabilities || {}; const rec = report.recommendation || 'plan-only';
    summary.textContent = rec === 'hybrid' ? 'Best mode: Hybrid — your laptop handles the app and assembly; generation can use another configured provider.' : rec === 'local' ? 'Best mode: Local — your computer appears suitable for the configured workflows.' : rec === 'local-light' ? 'Best mode: Light local — keep clips short and resolution modest.' : 'Best mode: Planning — connect a real generation provider before rendering.';
    const cards = [['Story & planning', 'ready'], ['Images', c.local_image], ['Video', c.local_video], ['Voice', c.local_tts], ['Final assembly', c.assembly]].map(([name, status]) => `<div class="health-item"><span>${icon(status)}</span><div><b>${name}</b><small>${labels[status] || 'CHECK'}</small></div></div>`).join('');
    details.innerHTML = cards + `<div class="health-tech"><b>Computer</b><span>${report.cpu?.model || 'Unknown CPU'} · ${report.memory?.totalGb ?? '?'} GB RAM · ${report.gpu?.vramGb ?? 'No detected'} GB VRAM</span><span>${report.storage?.freeGb ?? '?'} GB free · FFmpeg ${report.tools?.ffmpeg?.available ? '✓' : 'missing'} · ComfyUI ${report.comfyui?.reachable ? '✓ connected' : 'not connected'}</span></div>`;
  }
  async function check() {
    summary.textContent = 'Checking your computer…'; refresh.disabled = true;
    try { const r = await fetch(`${BRIDGE}/v1/capabilities`, { cache: 'no-store' }); if (!r.ok) throw new Error('Bridge unavailable'); show(await r.json()); }
    catch { summary.textContent = 'Start the local bridge to detect your computer. Nothing is sent to a remote server.'; details.innerHTML = '<div class="health-tech"><b>Local bridge not detected</b><span>Open the bridge, then tap Refresh.</span></div>'; }
    finally { refresh.disabled = false; }
  }
  refresh.addEventListener('click', check); check();
})();
