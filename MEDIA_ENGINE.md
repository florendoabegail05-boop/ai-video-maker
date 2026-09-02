# AI Media Engine

## Goal
Build an owned, provider-neutral media layer that can use local/open models first and securely add remote providers later. The application owns story direction, continuity, job orchestration, quality gates, asset lineage and assembly plans; providers are replaceable implementations.

## Layers
1. Story/Director: story spine, pacing, shot design, character/world/style locks.
2. Media contracts: versioned jobs and deterministic state transitions.
3. Provider registry: image, video, voice, audio and assembly adapters.
4. Secure adapter boundary: secret-bearing providers are never browser-safe; remote endpoints must be HTTPS.
5. Asset lineage: every generated asset can reference its source shot and previous frame.
6. Assembly: normalized 1080x1920 MP4 target, captions, voice, music and SFX.

## Future model strategy
- Local/open model adapters can be added without changing the core schema.
- Cloud providers are optional adapters and must keep credentials server-side.
- Model/provider changes are isolated to adapters and versioned metadata.
- Do not hard-code a provider into story logic or UI.
- Never claim a provider is free; availability, quotas and licenses must be verified at integration time.

## Quality gates
A production package should be rejected before generation when it lacks a clear goal, obstacle/payoff, visual prompt, motion prompt, continuity anchor or valid duration. Generation failures must be retryable without mutating the source story.

## Security gates
- No secrets in frontend files.
- No insecure HTTP provider endpoint.
- No arbitrary remote runtime scripts.
- Least-privilege CI permissions.
- Validate imported project/package schemas before use.
- Treat provider output and imported metadata as untrusted data.

## Compatibility
All persisted media packages carry `schemaVersion`. Future migrations should be additive where possible and must preserve older projects. Provider adapters carry their own version so a provider implementation can evolve independently.
