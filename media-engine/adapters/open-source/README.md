# Local/open-source media adapters

These adapters provide the stable application-side contracts for local models. They intentionally do not download model weights or execute arbitrary local commands from the browser.

## Initial model targets

- Image: FLUX.1 [schnell] — Apache-2.0 model card. Verify current model terms before commercial distribution.
- Video: Wan2.1 T2V 1.3B — open model; hardware requirements vary substantially.
- Voice: Kokoro-82M — open-weight TTS with local/offline implementations.
- Audio: Stable Audio Open 1.0 — check the current license/terms before commercial use.

## Runtime boundary

The adapter talks to a separately installed local service (for example ComfyUI or a local TTS server). The web app must never execute shell commands, download arbitrary model files, or expose secrets. Production remote providers must use a server-side credential boundary.

## Why contracts first?

Model runners change faster than the creator application. The app depends on capabilities and normalized jobs, not vendor-specific request formats. A future model can therefore replace one adapter without changing story, continuity, project storage, or the editor.
