/** AI Video Maker — local engine manager. Keeps the product independent of any single AI runtime. */

const ENGINES = Object.freeze(['image', 'video', 'voice', 'audio', 'upscale']);

export function engineManagerStatus({ diagnostics = {}, workflows = {} } = {}) {
  const result = {};
  for (const kind of ENGINES) {
    const capability = diagnostics.capabilities?.[`local_${kind === 'voice' || kind === 'audio' ? 'tts' : kind}`] ?? 'unknown';
    result[kind] = {
      preferred: 'local',
      capability,
      workflowConfigured: !!workflows[kind]?.configured,
      workflowExists: !!workflows[kind]?.exists,
      safeToAttempt: capability !== 'unavailable' && (!workflows[kind] || workflows[kind].exists !== false),
    };
  }
  return result;
}

export function shouldAttemptHeavyLocal({ kind, diagnostics = {} } = {}) {
  if (!kind || !['video', 'image', 'voice', 'audio', 'upscale'].includes(kind)) return false;
  const key = `local_${kind === 'voice' || kind === 'audio' ? 'tts' : kind}`;
  return diagnostics.capabilities?.[key] !== 'unavailable';
}

export function classifyEngineFailure(error) {
  const message = String(error?.message || error || '').toLowerCase();
  const nativeCrash = /access violation|0xc0000005|segmentation fault|segfault|illegal instruction|stack overflow/.test(message);
  const outOfMemory = /out of memory|cuda out of memory|not enough memory|allocation failed/.test(message);
  return { nativeCrash, outOfMemory, retryable: !nativeCrash };
}

export { ENGINES };
