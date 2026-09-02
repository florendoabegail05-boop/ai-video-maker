import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function hashText(text = '') { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

// Dependency-free still-image fallback for smoke testing and low-end machines.
// It deliberately creates a simple original illustration-like frame, not an AI image.
export async function createImageFallback({ prompt = '', mediaRoot, width = 576, height = 1024 } = {}) {
  const w = Math.max(144, Math.min(1536, Math.round(Number(width) || 576)));
  const h = Math.max(144, Math.min(1536, Math.round(Number(height) || 1024)));
  const id = randomUUID();
  const dir = path.join(path.resolve(mediaRoot), 'generated', 'image-fallback');
  const file = path.join(dir, `${id}.ppm`);
  await fs.mkdir(dir, { recursive: true });
  const seed = hashText(prompt);
  const hue = seed % 360;
  const buf = Buffer.alloc(w * h * 3);
  const put = (x, y, r, g, b) => { if (x < 0 || x >= w || y < 0 || y >= h) return; const i = (y * w + x) * 3; buf[i] = clamp(r); buf[i + 1] = clamp(g); buf[i + 2] = clamp(b); };
  const skyA = [(hue * 0.25) % 80 + 150, 205, 235];
  const skyB = [245, 225, 190];
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const r = skyA[0] * (1 - t) + skyB[0] * t;
    const g = skyA[1] * (1 - t) + skyB[1] * t;
    const b = skyA[2] * (1 - t) + skyB[2] * t;
    for (let x = 0; x < w; x++) put(x, y, r, g, b);
  }
  const cx = Math.round(w * 0.78), cy = Math.round(h * 0.18), sr = Math.round(Math.min(w, h) * 0.09);
  for (let y = cy - sr; y <= cy + sr; y++) for (let x = cx - sr; x <= cx + sr; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= sr ** 2) put(x, y, 255, 221, 92);
  const ground = Math.round(h * 0.68);
  for (let y = ground; y < h; y++) {
    const t = (y - ground) / Math.max(1, h - ground);
    for (let x = 0; x < w; x++) put(x, y, 105 - 25 * t, 178 - 30 * t, 108 - 20 * t);
  }
  const hill = (center, base, radius, color) => {
    for (let y = base - radius; y <= base; y++) {
      const dy = y - (base - radius), half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
      for (let x = Math.max(0, Math.floor(center - half)); x <= Math.min(w - 1, Math.ceil(center + half)); x++) put(x, y, ...color);
    }
  };
  hill(w * 0.25, ground + 20, Math.round(h * 0.28), [88, 155, 105]);
  hill(w * 0.78, ground + 10, Math.round(h * 0.34), [72, 143, 94]);
  // A simple central subject silhouette makes the fallback visibly different from a blank frame.
  const bx = Math.round(w * 0.5), by = Math.round(h * 0.59), br = Math.round(Math.min(w, h) * 0.075);
  for (let y = by - br; y <= by + br; y++) for (let x = bx - br; x <= bx + br; x++) if ((x - bx) ** 2 + (y - by) ** 2 <= br ** 2) put(x, y, 112, 76, 54);
  for (const [dx, dy] of [[-br * 0.55, -br * 0.65], [br * 0.55, -br * 0.65]]) {
    for (let y = by + dy - br * 0.45; y <= by + dy + br * 0.45; y++) for (let x = bx + dx - br * 0.45; x <= bx + dx + br * 0.45; x++) if ((x - (bx + dx)) ** 2 + (y - (by + dy)) ** 2 <= (br * 0.45) ** 2) put(x, y, 112, 76, 54);
  }
  const header = Buffer.from(`P6\n${w} ${h}\n255\n`);
  await fs.writeFile(file, Buffer.concat([header, buf]));
  const stat = await fs.stat(file);
  return { status: 'completed', provider: 'generated-still-fallback', kind: 'image', requestId: id, asset: { path: file, file, type: 'image', filename: path.basename(file) }, width: w, height: h, bytes: stat.size, note: 'Zero-cost dependency-free preview still. Configure a real ComfyUI/local image workflow for production-quality images.' };
}
