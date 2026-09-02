import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;
const POLL_MS = 1200;

function clean(value) { return String(value ?? '').trim(); }
function assetPath(value) { if (typeof value === 'string') return value; if (value && typeof value === 'object') return value.path || value.file || value.url || ''; return ''; }
function baseUrl(value) { return clean(value).replace(/\/$/, ''); }
function assertLocalUrl(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(parsed.hostname)) throw new Error('ComfyUI URL must point to localhost or 127.0.0.1.');
  return parsed;
}
function safeMediaInput(filePath, mediaRoot) {
  const root = path.resolve(mediaRoot);
  const target = path.resolve(filePath);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Source asset must be inside AIVM_MEDIA_ROOT.');
  return target;
}
async function readWorkflow(file) {
  if (!file) throw new Error('ComfyUI workflow file is not configured.');
  const text = await fs.readFile(file, 'utf8');
  const workflow = JSON.parse(text);
  if (!workflow || typeof workflow !== 'object' || Array.isArray(workflow)) throw new Error('ComfyUI workflow must be a JSON object.');
  return workflow;
}
function replaceTokens(value, vars) {
  if (typeof value === 'string') return value.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  if (Array.isArray(value)) return value.map(item => replaceTokens(item, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceTokens(v, vars)]));
  return value;
}
function findUnresolved(value, found = []) {
  if (typeof value === 'string' && /\{\{[A-Z0-9_]+\}\}/.test(value)) found.push(value);
  else if (Array.isArray(value)) value.forEach(v => findUnresolved(v, found));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => findUnresolved(v, found));
  return found;
}
async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text(); let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 10000) }; }
  if (!response.ok) throw new Error(`ComfyUI HTTP ${response.status}: ${data.error?.message || data.error || data.raw || 'request failed'}`);
  return data;
}
async function uploadImage(url, filePath) {
  const bytes = await fs.readFile(filePath);
  const boundary = `----AIVM${randomUUID().replaceAll('-', '')}`;
  const filename = path.basename(filePath).replace(/[^a-zA-Z0-9._-]/g, '_');
  const head = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const response = await fetch(`${url}/upload/image`, { method: 'POST', headers: { 'content-type': `multipart/form-data; boundary=${boundary}` }, body: Buffer.concat([head, bytes, tail]) });
  const text = await response.text(); let data;
  try { data = JSON.parse(text); } catch { data = {}; }
  if (!response.ok || !data.name) throw new Error(`ComfyUI image upload failed (HTTP ${response.status}).`);
  return data.name;
}
function outputRecords(history) {
  const records = [];
  for (const node of Object.values(history?.outputs || {})) for (const type of ['images', 'gifs', 'videos', 'audio']) for (const item of node?.[type] || []) records.push({ ...item, mediaType: type });
  return records;
}
function outputUrl(base, item) {
  const qs = new URLSearchParams({ filename: item.filename, subfolder: item.subfolder || '', type: item.type || 'output' });
  return `${base}/view?${qs}`;
}
async function downloadOutput(base, item, mediaRoot, jobId) {
  await fs.mkdir(mediaRoot, { recursive: true });
  const response = await fetch(outputUrl(base, item));
  if (!response.ok) throw new Error(`ComfyUI output download failed (HTTP ${response.status}).`);
  const safe = path.basename(item.filename || `${jobId}.bin`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const target = path.join(path.resolve(mediaRoot), `${jobId}-${safe}`);
  await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  return target;
}
export async function runComfyWorkflow({ base, workflowFile, request, kind, mediaRoot, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const comfy = assertLocalUrl(baseUrl(base));
  const workflow = await readWorkflow(workflowFile);
  const source = assetPath(request.imageInput || request.sourceAsset || request.input);
  let inputImage = '';
  if (source) inputImage = await uploadImage(baseUrl(comfy), safeMediaInput(source, mediaRoot));
  const vars = {
    PROMPT: clean(request.prompt || request.text), INPUT_IMAGE: inputImage,
    WIDTH: String(request.width || (request.aspectRatio === '9:16' ? 576 : 1024)), HEIGHT: String(request.height || (request.aspectRatio === '9:16' ? 1024 : 576)),
    FRAMES: String(request.frames || Math.max(16, Math.round((Number(request.duration) || 5) * 16))), FPS: String(request.fps || 16),
    SEED: String(request.seed ?? Math.floor(Math.random() * 2147483647)), KIND: kind, REQUEST_ID: clean(request.requestId || randomUUID())
  };
  const prepared = replaceTokens(workflow, vars);
  const unresolved = findUnresolved(prepared);
  if (unresolved.length) throw new Error(`ComfyUI workflow has unresolved placeholders: ${[...new Set(unresolved)].join(', ')}`);
  const promptResponse = await postJson(`${baseUrl(comfy)}/prompt`, { prompt: prepared, client_id: `aivm-${vars.REQUEST_ID}` });
  const promptId = clean(promptResponse.prompt_id);
  if (!promptId) throw new Error('ComfyUI did not return a prompt_id.');
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
    const response = await fetch(`${baseUrl(comfy)}/history/${encodeURIComponent(promptId)}`);
    if (!response.ok) continue;
    const history = await response.json(); const entry = history?.[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') throw new Error(`ComfyUI workflow failed for ${promptId}.`);
    const outputs = outputRecords(entry); if (!outputs.length) continue;
    const selected = outputs.find(item => kind === 'video' ? ['videos', 'gifs'].includes(item.mediaType) : kind === 'image' ? item.mediaType === 'images' : true) || outputs[0];
    const file = await downloadOutput(baseUrl(comfy), selected, mediaRoot, promptId);
    return { status: 'completed', provider: 'comfyui', kind, requestId: vars.REQUEST_ID, promptId, asset: { path: file, file, type: selected.mediaType, filename: selected.filename }, output: selected };
  }
  throw new Error(`ComfyUI job ${promptId} timed out after ${Math.round(timeoutMs / 60000)} minutes.`);
}
export function comfyConfigured(kind) {
  const suffix = kind.toUpperCase();
  return !!(process.env.AIVM_COMFYUI_URL && process.env[`AIVM_COMFYUI_WORKFLOW_${suffix}`]);
}
