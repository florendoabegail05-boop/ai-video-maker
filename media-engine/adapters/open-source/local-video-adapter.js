const DEFAULT_MODEL = 'Wan-AI/Wan2.1-T2V-1.3B';

export class LocalVideoAdapter {
  constructor({ endpoint = 'http://127.0.0.1:8188', model = DEFAULT_MODEL } = {}) {
    this.id = 'local-video-wan';
    this.kind = 'video';
    this.endpoint = endpoint;
    this.model = model;
  }

  capabilities() {
    return { textToVideo: true, imageToVideo: true, local: true, model: this.model };
  }

  async generate(request) {
    return {
      status: 'queued', provider: this.id, model: this.model, request,
      endpoint: this.endpoint, transport: 'local-http',
      note: 'Adapter contract only; a local Wan/ComfyUI runner must be installed separately.'
    };
  }
}
