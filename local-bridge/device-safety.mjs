import fs from 'node:fs';
import path from 'node:path';

export function assertSafeMediaRoot(root) {
  if (!root || typeof root !== 'string') throw new Error('A dedicated media root is required.');
  const resolved = path.resolve(root);
  if (resolved === path.parse(resolved).root) throw new Error('Refusing to use a filesystem root as the media directory.');
  return resolved;
}

export function safeProjectPath(root, relativePath) {
  const base = assertSafeMediaRoot(root);
  if (typeof relativePath !== 'string' || !relativePath.trim()) throw new Error('A relative project path is required.');
  if (path.isAbsolute(relativePath)) throw new Error('Absolute paths are not allowed.');
  const target = path.resolve(base, relativePath);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) throw new Error('Path escapes the application media root.');
  return target;
}

export function hasEnoughDiskSpace(targetPath, requiredBytes, safetyFactor = 1.2) {
  if (!Number.isFinite(requiredBytes) || requiredBytes < 0) return true;
  try {
    const stat = fs.statfsSync(path.resolve(targetPath));
    return stat.bavail * stat.bsize >= requiredBytes * safetyFactor;
  } catch {
    return true;
  }
}

export function preflightGeneration({ mediaRoot, estimatedBytes = 0, allowNative = false } = {}) {
  const root = assertSafeMediaRoot(mediaRoot);
  if (!hasEnoughDiskSpace(root, estimatedBytes)) {
    return { ok: false, code: 'INSUFFICIENT_DISK', message: 'Not enough free storage for this generation.' };
  }
  return { ok: true, root, allowNative: !!allowNative };
}
