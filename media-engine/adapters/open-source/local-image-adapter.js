const DEFAULT_MODEL = 'black-forest-labs/FLUX.1-schnell';

export class LocalImageAdapter {
  constructor({ endpoint = 'http://127.0.0.1:8188', model = DEFAULT_MODEL } = {}) {
    this.id = 'local-image-flux';
    this.kind = 'image';
    this.endpoint = endpoint;
    this.model = model;
  }

  capabilities() {
    return { textToImage: true, imageToImage: false, local: true, model: this.model };
  }

  async generate(request) {
    return {
      status: 'queued',
      provider: this.id,
      model: this.model,
      request,
      endpoint: this.endpoint,
      transport: 'local-http',
      note: 'Adapter contract only; a local ComfyUI/Flux runner must be installed separately.'
    };
  }
}
