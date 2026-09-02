# Local Media Bridge

The bridge is the secure boundary between the static browser app and optional local AI runners.

## Why it exists

The browser app is deliberately secret-free. The bridge listens only on `127.0.0.1`, accepts JSON, and forwards only to explicitly configured localhost HTTP runners. It never executes shell commands and never accepts a destination URL from the browser.

## Start

Requires Node.js 18+.

```bash
node local-bridge/server.mjs
```

Optional configuration:

```bash
AIVM_PORT=8787 \
AIVM_IMAGE_RUNNER=http://127.0.0.1:8188/image \
AIVM_VIDEO_RUNNER=http://127.0.0.1:8188/video \
AIVM_VOICE_RUNNER=http://127.0.0.1:8188/voice \
AIVM_AUDIO_RUNNER=http://127.0.0.1:8188/audio \
node local-bridge/server.mjs
```

The runner protocol is intentionally small: receive a JSON generation request and return JSON describing the resulting job or asset. This lets ComfyUI, a custom local worker, or another open-source runner sit behind the same application contract.

## Contract test mode

Set `AIVM_MOCK=1` to test the bridge without a model or GPU. Mock mode confirms routing and request validation but does **not** generate media.

```bash
AIVM_MOCK=1 node local-bridge/server.mjs
```

Then open `http://127.0.0.1:8787/health` to verify the service.

## Security boundary

- Loopback binding only.
- Runner URLs must resolve to `127.0.0.1` or `localhost` over HTTP.
- No arbitrary shell execution.
- No browser API keys.
- JSON body limit is 2 MiB.
- The bridge does not expose model weights or files directly.
