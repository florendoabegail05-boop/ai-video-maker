import os from 'node:os';
import { preflightGeneration } from './device-safety.mjs';

const GB = 1024 ** 3;

export function getSystemResources() {
  return {
    totalMemoryBytes: os.totalmem(),
    freeMemoryBytes: os.freemem(),
    cpuCount: os.cpus().length,
  };
}

export function preflightHeavyGeneration({ mediaRoot, estimatedBytes = 0, minFreeMemoryBytes = 2 * GB } = {}) {
  const base = preflightGeneration({ mediaRoot, estimatedBytes });
  if (!base.ok) return base;

  const resources = getSystemResources();
  if (resources.freeMemoryBytes < minFreeMemoryBytes) {
    return {
      ok: false,
      code: 'LOW_SYSTEM_MEMORY',
      message: 'Not enough free system memory to start a heavy generation safely.',
      resources,
    };
  }

  return { ok: true, root: base.root, resources };
}
