import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const FFMPEG = process.env.AIVM_FFMPEG || 'ffmpeg';
const MEDIA_ROOT = path.resolve(process.env.AIVM_MEDIA_ROOT || path.join(os.homedir(), 'aivm-media'));
const OUTPUT_ROOT = path.resolve(process.env.AIVM_OUTPUT_ROOT || path.join(MEDIA_ROOT, 'exports'));

function inside(root, candidate) {
  const relative = path.relative(root, path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeInput(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Each clip needs a file path.');
  const file = path.resolve(value);
  if (!inside(MEDIA_ROOT, file)) throw new Error('Input file is outside the configured media root.');
  return file;
}

function safeOutput(name) {
  const clean = String(name || 'final-video.mp4').replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!clean.toLowerCase().endsWith('.mp4')) return `${clean}.mp4`;
  return clean;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk.toString(); if (stderr.length > 12000) stderr = stderr.slice(-12000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg failed (${code}): ${stderr.trim()}`)));
  });
}

export async function assemble(clips, options = {}) {
  if (!Array.isArray(clips) || clips.length === 0) throw new Error('At least one video clip is required.');
  if (clips.length > 200) throw new Error('A maximum of 200 clips is supported per export.');
  const inputs = clips.map(safeInput);
  await fs.mkdir(OUTPUT_ROOT, { recursive: true });
  const jobDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aivm-assemble-'));
  const normalized = [];
  try {
    const width = Math.max(144, Math.min(3840, Number(options.width || 1080)));
    const height = Math.max(144, Math.min(3840, Number(options.height || 1920)));
    const fps = Math.max(1, Math.min(60, Number(options.fps || 30)));
    for (let i = 0; i < inputs.length; i++) {
      const out = path.join(jobDir, `clip-${String(i).padStart(3, '0')}.mp4`);
      await run(FFMPEG, ['-y', '-i', inputs[i], '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${fps},format=yuv420p`, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', out]);
      normalized.push(out);
    }
    const listFile = path.join(jobDir, 'concat.txt');
    await fs.writeFile(listFile, normalized.map(file => `file '${file.replaceAll("'", "'\\''")}'`).join('\n'));
    const output = path.join(OUTPUT_ROOT, safeOutput(options.outputName || `aivm-${Date.now()}.mp4`));
    await run(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', output]);
    const stat = await fs.stat(output);
    return { status: 'completed', jobId: randomUUID(), outputPath: output, bytes: stat.size, clips: inputs.length, width, height, fps };
  } finally {
    await fs.rm(jobDir, { recursive: true, force: true }).catch(() => {});
  }
}
