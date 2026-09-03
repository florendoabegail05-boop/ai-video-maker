/** Device-safe filesystem and input guards for AI Video Maker local services. */
import path from 'node:path';

export function appDataRoot(env = process.env) {
  return path.resolve(env.AIVM_DATA_ROOT || path.join(process.cwd(), 'aivm-data'));
}

export function safeChildPath(root, candidate) {
  const base = path.resolve(root);
  const target = path.resolve(base, candidate);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error('Path is outside the AI Video Maker data directory.');
  }
  return target;
}

export function safeOutputName(name, fallback = 'output') {
  const clean = String(name || fallback)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\.\.(?=\.)/g, '_')
    .trim();
  return clean.slice(0, 180) || fallback;
}

export function validateLoopbackUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP(S) URLs are supported.');
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) {
    throw new Error('Remote network targets are disabled for local workers.');
  }
  return url;
}

export function resourceGuard({ bytesFree, requiredBytes = 0, safetyMargin = 0.15 } = {}) {
  if (!Number.isFinite(bytesFree) || !Number.isFinite(requiredBytes)) return { ok: false, reason: 'resource-information-unavailable' };
  const required = requiredBytes * (1 + safetyMargin);
  return bytesFree >= required
    ? { ok: true, bytesFree, requiredBytes: required }
    : { ok: false, reason: 'insufficient-disk-space', bytesFree, requiredBytes: required };
}

export function crashGuard(error) {
  const message = String(error?.message || error || '').toLowerCase();
  if (/0xc0000005|access violation|segmentation fault|segfault|illegal instruction/.test(message)) {
    return { retry: false, action: 'stop-worker', reason: 'native-runtime-crash' };
  }
  if (/out of memory|cuda out of memory|allocation failed/.test(message)) {
    return { retry: false, action: 'reduce-workload', reason: 'resource-exhaustion' };
  }
  return { retry: false, action: 'report', reason: 'unknown-runtime-failure' };
}
