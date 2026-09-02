# Local Media Bridge

The bridge is the secure boundary between the static browser app, local AI runners, and the final video assembler.

## Start

Requires Node.js 18+ and FFmpeg available as `ffmpeg` on PATH (or set `AIVM_FFMPEG` to a fixed executable path).

```bash
node local-bridge/server.mjs
```

## ComfyUI — recommended zero-cost local path

The bridge can run **API-format ComfyUI workflows** directly. ComfyUI stays local; the browser never receives a model key. The adapter submits a workflow, polls the job, downloads the resulting media into `AIVM_MEDIA_ROOT`, and returns a safe local asset path.

Configure one local ComfyUI server plus a workflow for each media kind you want to enable:

```bash
AIVM_COMFYUI_URL=http://127.0.0.1:8188 \
AIVM_COMFYUI_WORKFLOW_IMAGE=/absolute/path/image-api.json \
AIVM_COMFYUI_WORKFLOW_VIDEO=/absolute/path/video-api.json \
AIVM_MEDIA_ROOT=/absolute/path/aivm-media \
node local-bridge/server.mjs
```

Optional voice/audio workflows use the same pattern:

```bash
AIVM_COMFYUI_WORKFLOW_VOICE=/absolute/path/voice-api.json
AIVM_COMFYUI_WORKFLOW_AUDIO=/absolute/path/audio-api.json
```

Workflows are normal ComfyUI **API prompt graphs**. Add these placeholders wherever the workflow needs values supplied by the app:

- `{{PROMPT}}` — scene prompt/text
- `{{INPUT_IMAGE}}` — uploaded source-image filename for image-to-video workflows
- `{{WIDTH}}`, `{{HEIGHT}}` — requested dimensions
- `{{FRAMES}}`, `{{FPS}}` — requested duration settings
- `{{SEED}}` — generated/requested seed
- `{{KIND}}` — image/video/voice/audio
- `{{REQUEST_ID}}` — unique request identifier

If any placeholder remains unresolved, the bridge fails closed instead of silently producing the wrong workflow.

### Practical model choice

For a modest local machine, start with a smaller video workflow rather than assuming a large 14B model will fit. ComfyUI's current official documentation includes a Wan2.2 5B video workflow intended to work with native offloading on around 8 GB VRAM. Larger Wan2.2 workflows can require substantially more VRAM. See the official ComfyUI documentation for the exact workflow/model requirements.

The app does not claim a runner is ready merely because ComfyUI is installed: health only reports a media kind as configured when both the ComfyUI URL and that kind's workflow file are present.

## Generic local runners

If you already have your own local HTTP worker, the original adapter remains supported:

```bash
AIVM_IMAGE_RUNNER=http://127.0.0.1:8188/image \
AIVM_VIDEO_RUNNER=http://127.0.0.1:8188/video \
AIVM_VOICE_RUNNER=http://127.0.0.1:8188/voice \
AIVM_AUDIO_RUNNER=http://127.0.0.1:8188/audio \
node local-bridge/server.mjs
```

A runner receives JSON and should return JSON describing the generated asset. A video runner should return a local file path inside `AIVM_MEDIA_ROOT`, for example `{ "asset": { "path": "/home/me/aivm-media/shot-01.mp4" } }`.

## Assembly

The app exposes `POST /v1/assemble` through the same loopback bridge. It normalizes every clip to the selected resolution/FPS, concatenates them with FFmpeg, enables fast-start MP4 output, and returns an opaque download URL.

Default paths:

- `AIVM_MEDIA_ROOT=~/aivm-media`
- `AIVM_OUTPUT_ROOT=~/aivm-media/exports`
- `AIVM_FFMPEG=ffmpeg`

Inputs outside the media root are rejected. The bridge never executes arbitrary shell commands.

## Contract test mode

Set `AIVM_MOCK=1` to test the bridge without a model or GPU. Mock mode confirms routing and request validation but does **not** generate real media or assemble a real MP4.

```bash
AIVM_MOCK=1 node local-bridge/server.mjs
```

Then open `http://127.0.0.1:8787/health` to verify the service.

## Security boundary

- Loopback binding only.
- Runner URLs must resolve to `127.0.0.1` or `localhost` over HTTP.
- ComfyUI URLs are also restricted to loopback.
- FFmpeg is invoked only with fixed executable + generated argument arrays; no shell command strings are accepted.
- Assembly inputs must stay inside `AIVM_MEDIA_ROOT`.
- No browser API keys.
- JSON body limit is 2 MiB.
- Export downloads use opaque in-memory job IDs and are served only by the loopback bridge.
