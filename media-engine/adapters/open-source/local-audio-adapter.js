const DEFAULT_MODEL = 'stabilityai/stable-audio-open-1.0';

export class LocalAudioAdapter {
  constructor({ endpoint = 'http://127.0.0.1:7860', model = DEFAULT_MODEL } = {}) {
    this.id = 'local-audio-stable-open';
    this.kind = 'audio';
    this.endpoint = endpoint;
    this.model = model;
  }

  capabilities() {
    return { textToAudio: true, music: true, soundEffects: true, local: true, model: this.model };
  }

  async generate(request) {
    return {
      status: 'queued', provider: this.id, model: this.model, request,
      endpoint: this.endpoint, transport: 'local-http',
      note: 'Adapter contract only; verify the model license for your intended commercial use before shipping generated audio.'
    };
  }
}
