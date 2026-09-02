import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const FFMPEG = process.env.AIVM_FFMPEG || 'ffmpeg';

function inside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function safeInput(value, mediaRoot) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('An image input is required for motion fallback.');
  const file = path.resolve(value);
  if (!inside(mediaRoot, file)) throw new Error('Source image must be inside AIVM_MEDIA_ROOT.');
  return file;
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`${command} failed (${code}): ${stderr.trim()}`)));
  });
}

function dimensions(request = {}) {
  const width = Math.max(144, Math.min(3840, Math.round(Number(request.width) || (request.aspectRatio === '9:16' ? 576 : 1024))));
  const height = Math.max(144, Math.min(3840, Math.round(Number(request.height) || (request.aspectRatio === '9:16' ? 1024 : 576))));
  return [width, height];
}

export async function createMotionFallback({ inputImage, mediaRoot, duration = 5, fps = 24, width, height, motion = 'push-in' }) {
  const source = safeInput(inputImage, mediaRoot);
  const [w, h] = dimensions({ width, height, aspectRatio: width && height ? undefined : '9:16' });
  const seconds = Math.max(1, Math.min(60, Number(duration) || 5));
  const rate = Math.max(12, Math.min(60, Number(fps) || 24));
  const jobId = randomUUID();
  const outputDir = path.join(path.resolve(mediaRoot), 'generated', 'motion-fallback');
  const output = path.join(outputDir, `${jobId}.mp4`);
  await fs.mkdir(outputDir, { recursive: true });

  // Deterministic Ken Burns-style motion. It is intentionally a fallback, not an AI I2V claim.
  const zoom = motion === 'pull-out' ? '1.12-0.0008*on' : '1+0.0008*on';
  const vf = `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase,crop=${w * 2}:${h * 2},zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${w}x${h}:fps=${rate},format=yuv420p`;
  await run(FFMPEG, ['-y', '-loop', '1', '-i', source, '-t', String(seconds), '-vf', vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', output]);
  const stat = await fs.stat(output);
  if (stat.size < 1024) throw new Error('Motion fallback produced an invalid video file.');
  return {
    status: 'completed',
    provider: 'ffmpeg-motion-fallback',
    kind: 'video',
    requestId: jobId,
    asset: { path: output, file: output, type: 'video', filename: path.basename(output) },
    duration: seconds,
    width: w,
    height: h,
    fps: rate,
    note: 'Zero-cost motion fallback from a still image. Use a configured ComfyUI I2V workflow for true AI video generation.'
  };
}
