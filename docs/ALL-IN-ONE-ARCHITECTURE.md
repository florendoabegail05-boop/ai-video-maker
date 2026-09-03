# AI Video Maker — All-in-One Architecture

## Product goal

AI Video Maker is a cross-platform creator application. The creator should use one interface and should not need to understand ComfyUI, Python environments, workflow JSON, FFmpeg, model folders, ports, or individual AI runtimes.

## Supported clients

- Desktop: Windows first; macOS/Linux-compatible architecture where practical.
- Mobile: responsive web/PWA first, with Android/iOS packaging later.
- The mobile client is a control and review client by default. Heavy local generation is delegated to an available desktop/local worker or an optional remote provider.

## Core architecture

`Client -> Project API -> Orchestrator -> Local Worker Manager -> Engine Adapter -> Media Pipeline -> Project Storage`

The orchestrator owns jobs, retries, cancellation, progress, capability checks, and routing. Engine adapters hide implementation details.

## Engine abstraction

The app must never depend on one AI engine. Define adapters for:

- image generation
- image-to-video / video generation
- speech / voice
- music / sound
- upscaling / enhancement
- transcription

ComfyUI/Wan is one local adapter. It is not the product API.

## Local-first policy

1. Prefer local generation when compatible hardware and required models are available.
2. Never launch a heavy model without passing capability/memory checks.
3. Serialize heavy video jobs by default on low-memory systems.
4. Persist job state so UI reconnects do not lose progress.
5. Treat native runtime crashes as non-retryable until the runtime is restarted safely.
6. Provide a deterministic non-AI preview fallback for pipeline testing only; never label it production AI.

## Model manager

The application should expose a single Models screen that can:

- detect installed models
- verify filenames and checksums where available
- report disk/RAM/VRAM requirements
- show missing/incompatible models
- explain where a model belongs
- download only when the user explicitly requests it
- avoid duplicate downloads
- track model versions

## Character Lock and World Lock

Locks are first-class project assets. Every generation request receives resolved lock references and a continuity package. The orchestrator converts locks into engine-specific inputs. Engine adapters must not modify the canonical lock definitions.

## Scene pipeline

Idea -> Script -> Character/World Lock -> Storyboard -> Keyframe images -> Image-to-video shots -> Voice -> Music/SFX -> QC -> Assembly -> Shorts variants -> Metadata -> Export.

Each stage creates versioned artifacts so failed stages can be retried without regenerating everything.

## Mobile architecture

Mobile uses the same project/job API and receives real-time job progress. Uploads are resumable. Generated media is streamed or downloaded only when requested. A mobile device may execute lightweight tasks, but heavy local video inference is not required.

## Packaging target

Long term, provide an installer that includes the application shell, local bridge/worker, runtime health checks, model manager, and media tools where licensing permits. Large AI models remain separately managed assets when redistribution licenses do not permit bundling them.

## Security

- Local worker binds to loopback by default.
- No arbitrary shell execution from remote requests.
- Validate all file paths against project/media roots.
- Do not expose local worker ports publicly by default.
- Cloud providers are opt-in and use explicit credentials.

## Definition of done

A new user can install/open AI Video Maker, create a project, import a reference image, define Character Lock and World Lock, request an image-to-video shot, see progress, recover from a failed worker, review the result, assemble a project, and export a YouTube-ready Short without manually operating the underlying AI engine.
