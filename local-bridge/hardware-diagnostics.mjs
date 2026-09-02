import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';

const exec = promisify(execFile);
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const FFMPEG = process.env.AIVM_FFMPEG || 'ffmpeg';
const FFPROBE = process.env.AIVM_FFPROBE || 'ffprobe';
const MEDIA_ROOT = path.resolve(process.env.AIVM_MEDIA_ROOT || path.join(os.homedir(), 'aivm-media'));

function safeNumber(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function bytesToGb(bytes) { return bytes == null ? null : Math.round((bytes / 1024 ** 3) * 10) / 10; }
function localUrl(value) {
  if (!value) return null;
  try { const u = new URL(value); return u.protocol === 'http:' && LOCAL_HOSTS.has(u.hostname) ? u : null; } catch { return null; }
}
async function commandVersion(command, args = ['-version']) {
  try { const { stdout, stderr } = await exec(command, args, { timeout: 5000, windowsHide: true, maxBuffer: 1024 * 1024 }); return { available: true, version: String(stdout || stderr).split(/\r?\n/)[0].trim() }; }
  catch { return { available: false, version: null }; }
}
async function freeDisk(target) {
  try {
    const stat = await fs.statfs(target);
    return { freeBytes: stat.bavail * stat.bsize, totalBytes: stat.blocks * stat.bsize };
  } catch { return { freeBytes: null, totalBytes: null }; }
}
async function probeComfy(url) {
  const base = url ? url.toString().replace(/\/$/, '') : '';
  if (!base) return { configured: false, reachable: false };
  try {
    const response = await fetch(`${base}/system_stats`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return { configured: true, reachable: false, status: response.status };
    const data = await response.json();
    const devices = Array.isArray(data?.devices) ? data.devices : [];
    const vram = devices.map(d => safeNumber(d.vram_total)).filter(v => v != null);
    return { configured: true, reachable: true, devices: devices.map(d => ({ name: d.name || null, type: d.type || null, vramGb: bytesToGb(d.vram_total), vramFreeGb: bytesToGb(d.vram_free) })), maxVramGb: vram.length ? Math.max(...vram) / 1024 ** 3 : null };
  } catch (error) { return { configured: true, reachable: false, error: error.message }; }
}
function scoreCapability({ ramGb, vramGb, ffmpeg, comfy, kind }) {
  if (kind === 'assembly') return ffmpeg.available ? 'ready' : 'unavailable';
  if (!comfy.reachable) return 'unavailable';
  if (kind === 'image') return vramGb >= 6 ? 'ready' : vramGb >= 4 ? 'limited' : 'limited';
  if (kind === 'video') return vramGb >= 12 ? 'ready' : vramGb >= 8 ? 'limited' : ramGb >= 16 ? 'limited' : 'unavailable';
  if (kind === 'voice') return ramGb >= 8 ? 'ready' : 'limited';
  return 'limited';
}
function runnerMap() {
  return Object.fromEntries(['image', 'video', 'voice', 'audio'].map(kind => [kind, !!localUrl(process.env[`AIVM_${kind.toUpperCase()}_RUNNER`]) || !!(process.env.AIVM_COMFYUI_URL && process.env[`AIVM_COMFYUI_WORKFLOW_${kind.toUpperCase()}`])]));
}
export async function diagnostics() {
  const totalMemGb = bytesToGb(os.totalmem());
  const freeMemGb = bytesToGb(os.freemem());
  const disk = await freeDisk(MEDIA_ROOT);
  const ffmpeg = await commandVersion(FFMPEG);
  const ffprobe = await commandVersion(FFPROBE);
  const comfyUrl = localUrl(process.env.AIVM_COMFYUI_URL);
  const comfy = await probeComfy(comfyUrl);
  const gpu = comfy.devices?.find(d => d.vramGb != null) || null;
  const vramGb = comfy.maxVramGb || gpu?.vramGb || 0;
  const ramGb = totalMemGb || 0;
  const capabilities = {
    local_image: scoreCapability({ ramGb, vramGb, ffmpeg, comfy, kind: 'image' }),
    local_video: scoreCapability({ ramGb, vramGb, ffmpeg, comfy, kind: 'video' }),
    local_tts: scoreCapability({ ramGb, vramGb, ffmpeg, comfy, kind: 'voice' }),
    assembly: scoreCapability({ ramGb, vramGb, ffmpeg, comfy, kind: 'assembly' })
  };
  const remote = runnerMap();
  const recommendation = capabilities.local_video === 'ready' ? 'local' : remote.video ? 'hybrid' : capabilities.local_image !== 'unavailable' ? 'local-light' : 'plan-only';
  return {
    status: 'ready', timestamp: new Date().toISOString(), os: { platform: process.platform, release: os.release(), arch: process.arch },
    cpu: { model: os.cpus()[0]?.model || 'Unknown', cores: os.cpus().length },
    memory: { totalGb: totalMemGb, freeGb: freeMemGb }, gpu: { name: gpu?.name || null, vendor: gpu?.type || null, vramGb: vramGb || null },
    storage: { mediaRoot: MEDIA_ROOT, freeGb: bytesToGb(disk.freeBytes), totalGb: bytesToGb(disk.totalBytes) },
    tools: { ffmpeg, ffprobe }, comfyui: comfy,
    runners: remote, capabilities, recommendation,
    notes: ['Hardware detection is advisory; actual workflow/model requirements may be higher.', 'Real generation requires a compatible local model/workflow or a configured provider.']
  };
}

export function routeKind(kind, report) {
  const localKey = kind === 'voice' ? 'local_tts' : kind === 'audio' ? 'local_tts' : `local_${kind}`;
  const local = report.capabilities[localKey] || 'unavailable';
  const remote = !!report.runners[kind];
  if (local === 'ready') return { provider: 'local', reason: 'Local hardware is suitable.' };
  if (remote) return { provider: 'remote', reason: 'Local capability is insufficient or limited; configured local HTTP provider is available.' };
  if (local === 'limited') return { provider: 'local', reason: 'No alternate provider is configured; use reduced resolution/short clips.' };
  return { provider: 'unavailable', reason: `No suitable ${kind} generation provider is configured.` };
}
