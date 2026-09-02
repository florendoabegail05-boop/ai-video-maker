import { createLocalOpenSourceAdapters } from './index.js';

const adapters = createLocalOpenSourceAdapters();

for (const [kind, adapter] of Object.entries(adapters)) {
  if (adapter.kind !== kind) throw new Error(`${kind}: incorrect adapter kind`);
  if (!adapter.id.startsWith('local-')) throw new Error(`${kind}: adapter must be local`);
  if (!adapter.endpoint.startsWith('http://127.0.0.1:')) throw new Error(`${kind}: endpoint must remain loopback`);
  const caps = adapter.capabilities();
  if (!caps.local) throw new Error(`${kind}: adapter must declare local capability`);
}

const video = await adapters.video.generate({ prompt: 'test', durationSeconds: 5 });
if (video.status !== 'queued' || video.provider !== 'local-video-wan') throw new Error('video contract failed');

const voice = await adapters.voice.generate({ text: 'test', voice: 'af_heart' });
if (voice.status !== 'queued' || voice.provider !== 'local-voice-kokoro') throw new Error('voice contract failed');

console.log('Local open-source adapter contracts: PASS');
