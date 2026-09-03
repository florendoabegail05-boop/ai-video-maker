# AI Video Maker — All-in-One Engine Plan

## Goal

The creator should experience one application: **Create → Generate → Review → Export**. Local AI engines are implementation details behind the app, not separate products the creator has to operate.

## Architecture

```text
AI Video Maker UI
       |
       v
AI Orchestrator
       |
       +-- Project / Character Lock / World Lock
       +-- Story / Shot / Prompt generation
       +-- Job Queue (one heavy generation at a time by default)
       +-- Hardware + capability gate
       |
       v
Local Media Bridge (loopback only)
       |
       +-- Image engine (ComfyUI workflow or localhost runner)
       +-- Video engine (Wan 2.2 workflow or another local engine)
       +-- Voice / audio engine
       +-- FFmpeg assembly + media inspection
       +-- Safe preview fallbacks
       |
       v
QC / Continuity / Automatic Improvement
       |
       v
YouTube-ready 9:16 / 16:9 exports
```

## Current implementation

- The bridge remains loopback-only and rejects non-local runner URLs.
- ComfyUI API workflows can receive prompt, image, dimensions, frames, FPS, seed, kind, and request ID placeholders.
- Heavy generation is serialized through `local-bridge/job-queue.mjs` so multiple video jobs cannot overload a laptop at once.
- Each generation receives a stable `requestId`/`jobId` and exposes `/v1/jobs` and `/v1/jobs/:id` for status.
- Existing image and motion fallbacks remain available for smoke tests and low-end hardware; they are explicitly not presented as production AI generation.
- Hardware diagnostics continue to gate unsafe local routes.

## Important reality

A truly dependency-free AI video generator is not physically possible: model weights, operating-system graphics support, and compute hardware are required somewhere. The product goal is therefore **user-facing dependency-free**, not literally dependency-free.

The next packaging phase should bundle the application shell, bridge, runtime dependencies, FFmpeg, model installer/manager, and a supported local AI runtime into one installer where licensing and hardware permit. The app should then detect and configure the runtime automatically.

## Safety rule for Wan 2.2

Do not automatically retry a native-process crash. A Windows access-violation such as `0xC0000005` can indicate a native library or GPU/runtime problem. The bridge should surface the failure, preserve the project, and allow a controlled recovery instead of repeatedly launching the same failing workload.
