# Local Media Bridge

The bridge is the secure boundary between the static browser app, local AI runners, and the final video assembler.

## Start

Requires Node.js 18+ and FFmpeg available as `ffmpeg` on PATH (or set `AIVM_FFMPEG` to a fixed executable path).

```bash
node local-bridge/server.mjs
```

Optional generation runners:

```bash
AIVM_PORT=8787 \
AIVM_IMAGE_RUNNER=http://127.0.0.1:8188/image \
AIVM_VIDEO_RUNNER=http://127.0.0.1:8188/video \
AIVM_VOICE_RUNNER=http://127.0.0.1:8188/voice \
AIVM_AUDIO_RUNNER=http://127.0.0.1:8188/audio \
node local-bridge/server.mjs
```

The runner protocol is intentionally small: receive a JSON generation request and return JSON describing the resulting asset. A video runner should return a local file path such as `{ "asset": { "path": "/home/me/aivm-media/shot-01.mp4" } }` inside the configured media root.

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
- FFmpeg is invoked only with fixed executable + generated argument arrays; no shell command strings are accepted.
- Assembly inputs must stay inside `AIVM_MEDIA_ROOT`.
- No browser API keys.
- JSON body limit is 2 MiB.
- Export downloads use opaque in-memory job IDs and are served only by the loopback bridge.
