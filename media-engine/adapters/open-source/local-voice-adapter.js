const DEFAULT_MODEL = 'hexgrad/Kokoro-82M';

export class LocalVoiceAdapter {
  constructor({ endpoint = 'http://127.0.0.1:8880', model = DEFAULT_MODEL } = {}) {
    this.id = 'local-voice-kokoro';
    this.kind = 'voice';
    this.endpoint = endpoint;
    this.model = model;
  }

  capabilities() {
    return { textToSpeech: true, streaming: true, local: true, model: this.model };
  }

  async generate(request) {
    return {
      status: 'queued', provider: this.id, model: this.model, request,
      endpoint: this.endpoint, transport: 'local-http',
      note: 'Adapter contract only; a local Kokoro TTS service must be installed separately.'
    };
  }
}
