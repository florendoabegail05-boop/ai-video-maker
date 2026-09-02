#!/usr/bin/env node
/** AI Video Maker — zero-cost local media bridge. Loopback only. */
import http from 'node:http';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { assemble, inspectMedia } from './assembler.mjs';
import { comfyConfigured, runComfyWorkflow } from './comfyui-runner.mjs';
import { createMotionFallback } from './motion-fallback.mjs';
import { diagnostics, routeKind } from './hardware-diagnostics.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.AIVM_PORT || 8787);
const MAX_BODY = 2 * 1024 * 1024;
const MEDIA_ROOT = process.env.AIVM_MEDIA_ROOT || process.cwd();
const RUNNERS = Object.freeze({ image: process.env.AIVM_IMAGE_RUNNER || '', video: process.env.AIVM_VIDEO_RUNNER || '', voice: process.env.AIVM_VOICE_RUNNER || '', audio: process.env.AIVM_AUDIO_RUNNER || '' });
const exportsByJob = new Map();
const diagnosticsCache = { value: null, expires: 0 };
function json(res, status, payload) { const body = JSON.stringify(payload); res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(body); }
function readJson(req) { return new Promise((resolve, reject) => { let size = 0; const chunks = []; req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Request body too large.'), { status: 413 })); req.destroy(); return; } chunks.push(chunk); }); req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); } }); req.on('error', reject); }); }
function runnerFor(kind) { const url = RUNNERS[kind]; if (!url) return null; try { const parsed = new URL(url); if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) return null; return parsed; } catch { return null; } }
function comfyFor(kind) { return process.env.AIVM_COMFYUI_URL && comfyConfigured(kind) ? new URL(process.env.AIVM_COMFYUI_URL) : null; }
function workflowFor(kind) { return process.env[`AIVM_COMFYUI_WORKFLOW_${kind.toUpperCase()}`] || ''; }
async function workflowStatus(kind) {
  const configured = !!workflowFor(kind);
  if (!configured) return { configured: false, exists: false, path: null };
  const file = path.resolve(workflowFor(kind));
  try { await fsp.access(file, fs.constants.R_OK); return { configured: true, exists: true, path: file }; }
  catch { return { configured: true, exists: false, path: file }; }
}
async function getWorkflowStatuses() { return Object.fromEntries(await Promise.all(['image', 'video', 'voice', 'audio'].map(async kind => [kind, await workflowStatus(kind)]))); }
async function getDiagnostics(force = false) { if (!force && diagnosticsCache.value && diagnosticsCache.expires > Date.now()) return diagnosticsCache.value; const value = await diagnostics(); diagnosticsCache.value = value; diagnosticsCache.expires = Date.now() + 15000; return value; }
async function forward(kind, request) {
  const report = await getDiagnostics();
  const route = routeKind(kind, report);

  // Prefer a real configured ComfyUI workflow even when hardware diagnostics are
  // conservative. The workflow itself is the source of truth for whether it can run.
  const comfy = comfyFor(kind);
  if (comfy) return { status: 200, body: await runComfyWorkflow({ base: comfy.toString(), workflowFile: workflowFor(kind), request, kind, mediaRoot: MEDIA_ROOT }) };

  const runner = runnerFor(kind);
  if (runner) {
    const response = await fetch(runner, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...request, requestId: request.requestId || randomUUID(), kind }) });
    const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = { status: response.ok ? 'completed' : 'failed', raw: text.slice(0, 10000) }; }
    return { status: response.status, body: { ...body, route } };
  }

  // Critical zero-cost path: a still image can always become an uploadable MP4
  // through FFmpeg. This keeps the production pipeline usable on machines that
  // cannot run modern I2V models, while clearly identifying the result as a fallback.
  const inputImage = request.imageInput || request.sourceAsset || request.input;
  const fallbackEnabled = process.env.AIVM_ENABLE_MOTION_FALLBACK !== '0';
  if (kind === 'video' && fallbackEnabled && inputImage) {
    try {
      return { status: 200, body: await createMotionFallback({ inputImage, mediaRoot: MEDIA_ROOT, duration: request.duration, fps: request.fps || 24, width: request.width, height: request.height, motion: request.motion || 'push-in' }) };
    } catch (error) {
      return { status: 422, body: { status: 'failed', kind, route, error: error.message, fallback: true } };
    }
  }

  if (route.provider === 'unavailable') return { status: 503, body: { status: 'unavailable', kind, route, diagnostics: report } };
  return { status: 503, body: { status: 'unavailable', kind, route, error: `No safe local ${kind} runner configured.` } };
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'aivm-local-bridge', version: 6, loopbackOnly: true, mock: process.env.AIVM_MOCK === '1', ffmpeg: process.env.AIVM_FFMPEG || 'ffmpeg', mediaRoot: MEDIA_ROOT, runners: Object.fromEntries(Object.entries(RUNNERS).map(([k]) => [k, !!runnerFor(k) || !!comfyFor(k)])), comfyui: { enabled: !!process.env.AIVM_COMFYUI_URL, image: comfyConfigured('image'), video: comfyConfigured('video'), voice: comfyConfigured('voice'), audio: comfyConfigured('audio') }, workflows: await getWorkflowStatuses(), motionFallback: { enabled: process.env.AIVM_ENABLE_MOTION_FALLBACK !== '0', video: true } });
  if (req.method === 'GET' && req.url === '/v1/diagnostics') { try { return json(res, 200, await getDiagnostics(true)); } catch (error) { return json(res, 502, { status: 'failed', error: error.message }); } }
  if (req.method === 'GET' && req.url === '/v1/capabilities') { try { const report = await getDiagnostics(); return json(res, 200, { ...report, routes: Object.fromEntries(['image', 'video', 'voice', 'audio'].map(kind => [kind, routeKind(kind, report)])), workflows: await getWorkflowStatuses(), motionFallback: { enabled: process.env.AIVM_ENABLE_MOTION_FALLBACK !== '0', video: true } }); } catch (error) { return json(res, 502, { status: 'failed', error: error.message }); } }
  const exportMatch = req.method === 'GET' && /^\/v1\/exports\/([a-f0-9-]+)$/.exec(req.url || '');
  if (exportMatch) { const file = exportsByJob.get(exportMatch[1]); if (!file) return json(res, 404, { status: 'not_found', error: 'Export job not found or bridge was restarted.' }); return fs.stat(file, (error, stat) => { if (error) return json(res, 404, { status: 'not_found', error: 'Export file is no longer available.' }); res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': stat.size, 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'content-disposition': 'attachment; filename="ai-video-maker.mp4"' }); fs.createReadStream(file).pipe(res); }); }
  if (req.method === 'POST' && req.url === '/v1/inspect') { try { const request = await readJson(req); return json(res, 200, await inspectMedia(request.path)); } catch (error) { return json(res, error.status || 422, { status: 'failed', error: error.message || 'Inspection failed.' }); } }
  if (req.method === 'POST' && req.url === '/v1/assemble') { try { const request = await readJson(req); const result = await assemble(request.clips, request); exportsByJob.set(result.jobId, result.outputPath); while (exportsByJob.size > 10) exportsByJob.delete(exportsByJob.keys().next().value); return json(res, 200, { ...result, downloadUrl: `/v1/exports/${result.jobId}`, qc: result.qc }); } catch (error) { return json(res, error.status || 502, { status: 'failed', error: error.message || 'Assembly failed.' }); } }
  const match = req.method === 'POST' && /^\/v1\/generate\/(image|video|voice|audio)$/.exec(req.url || '');
  if (match) { const kind = match[1]; try { const request = await readJson(req); if (!request.prompt && !request.text && !request.input && !request.imageInput && !request.sourceAsset) return json(res, 400, { status: 'invalid', error: 'A prompt, text, or input is required.' }); if (process.env.AIVM_MOCK === '1') return json(res, 200, { status: 'completed', mock: true, kind, requestId: request.requestId || randomUUID(), asset: null, note: 'Mock contract response only; no media was generated.' }); const result = await forward(kind, request); return json(res, result.status, result.body); } catch (error) { return json(res, error.status || 502, { status: 'failed', error: error.message || 'Local runner request failed.' }); } }
  return json(res, 404, { status: 'not_found' });
});
server.listen(PORT, HOST, () => { console.log(`AI Video Maker local bridge listening on http://${HOST}:${PORT}`); console.log('Loopback only. No arbitrary shell execution.'); });
