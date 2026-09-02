export { LocalImageAdapter } from './local-image-adapter.js';
export { LocalVideoAdapter } from './local-video-adapter.js';
export { LocalVoiceAdapter } from './local-voice-adapter.js';
export { LocalAudioAdapter } from './local-audio-adapter.js';

export function createLocalOpenSourceAdapters(options = {}) {
  return {
    image: new LocalImageAdapter(options.image),
    video: new LocalVideoAdapter(options.video),
    voice: new LocalVoiceAdapter(options.voice),
    audio: new LocalAudioAdapter(options.audio)
  };
}
