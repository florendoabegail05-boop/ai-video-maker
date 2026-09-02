#!/usr/bin/env node
/** AI Video Maker — zero-cost local media bridge. Loopback only. */
import http from 'node:http';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { assemble } from './assembler.mjs';

const HOST = '127.0.0.1';
const PORT = Number(process.env.AIVM_PORT || 8787);
const MAX_BODY = 2 * 1024 * 1024;
const RUNNERS = Object.freeze({ image: process.env.AIVM_IMAGE_RUNNER || '', video: process.env.AIVM_VIDEO_RUNNER || '', voice: process.env.AIVM_VOICE_RUNNER || '', audio: process.env.AIVM_AUDIO_RUNNER || '' });
const exportsByJob = new Map();
function json(res, status, payload) { const body = JSON.stringify(payload); res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); res.end(body); }
function readJson(req) { return new Promise((resolve, reject) => { let size = 0; const chunks = []; req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Request body too large.'), { status: 413 })); req.destroy(); return; } chunks.push(chunk); }); req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); } }); req.on('error', reject); }); }
function runnerFor(kind) { const url = RUNNERS[kind]; if (!url) return null; try { const parsed = new URL(url); if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) return null; return parsed; } catch { return null; } }
async function forward(kind, request) { const runner = runnerFor(kind); if (!runner) return { status: 503, body: { status: 'unavailable', kind, error: `No safe local ${kind} runner configured.`, hint: `Set AIVM_${kind.toUpperCase()}_RUNNER to a localhost HTTP endpoint.` } }; const response = await fetch(runner, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...request, requestId: request.requestId || randomUUID(), kind }) }); const text = await response.text(); let body; try { body = JSON.parse(text); } catch { body = { status: response.ok ? 'completed' : 'failed', raw: text.slice(0, 10000) }; } return { status: response.status, body }; }
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true, service: 'aivm-local-bridge', version: 2, loopbackOnly: true, mock: process.env.AIVM_MOCK === '1', ffmpeg: process.env.AIVM_FFMPEG || 'ffmpeg', runners: Object.fromEntries(Object.entries(RUNNERS).map(([k]) => [k, !!runnerFor(k)])) });
  const exportMatch = req.method === 'GET' && /^\/v1\/exports\/([a-f0-9-]+)$/.exec(req.url || '');
  if (exportMatch) { const file = exportsByJob.get(exportMatch[1]); if (!file) return json(res, 404, { status: 'not_found', error: 'Export job not found or bridge was restarted.' }); return fs.stat(file, (error, stat) => { if (error) return json(res, 404, { status: 'not_found', error: 'Export file is no longer available.' }); res.writeHead(200, { 'content-type': 'video/mp4', 'content-length': stat.size, 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'content-disposition': 'attachment; filename="ai-video-maker.mp4"' }); fs.createReadStream(file).pipe(res); }); }
  if (req.method === 'POST' && req.url === '/v1/assemble') { try { const request = await readJson(req); const result = await assemble(request.clips, request); exportsByJob.set(result.jobId, result.outputPath); while (exportsByJob.size > 10) exportsByJob.delete(exportsByJob.keys().next().value); return json(res, 200, { ...result, downloadUrl: `/v1/exports/${result.jobId}` }); } catch (error) { return json(res, error.status || 502, { status: 'failed', error: error.message || 'Assembly failed.' }); } }
  const match = req.method === 'POST' && /^\/v1\/generate\/(image|video|voice|audio)$/.exec(req.url || '');
  if (match) { const kind = match[1]; try { const request = await readJson(req); if (!request.prompt && !request.text && !request.input) return json(res, 400, { status: 'invalid', error: 'A prompt, text, or input is required.' }); if (process.env.AIVM_MOCK === '1') return json(res, 200, { status: 'completed', mock: true, kind, requestId: request.requestId || randomUUID(), asset: null, note: 'Mock contract response only; no media was generated.' }); const result = await forward(kind, request); return json(res, result.status, result.body); } catch (error) { return json(res, error.status || 502, { status: 'failed', error: error.message || 'Local runner request failed.' }); } }
  return json(res, 404, { status: 'not_found' });
});
server.listen(PORT, HOST, () => { console.log(`AI Video Maker local bridge listening on http://${HOST}:${PORT}`); console.log('Loopback only. No arbitrary shell execution.'); });
