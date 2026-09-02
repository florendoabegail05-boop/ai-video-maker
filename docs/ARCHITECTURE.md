# AI Video Maker Architecture

## North-star

AI Video Maker is designed as a provider-neutral production system that can grow from Shorts to long-form films without rewriting the core project model.

## Stable layers

1. **Experience** — browser UI, project editor, previews, export controls.
2. **Story** — premise, outline, screenplay, characters, world, style, continuity.
3. **Director** — scenes, shots, visual direction, motion direction, dialogue, audio intent.
4. **Media orchestration** — durable jobs, retries, checkpoints, asset lineage and provider adapters.
5. **Assembly** — timeline, video, voice, music, SFX, captions, muxing and export.
6. **Quality** — story, continuity, visual, audio and technical gates.
7. **Storage** — versioned project manifests and user-controlled local/cloud storage.

## Core rule

The application must depend on **capabilities**, not vendors. A provider adapter may implement image, video, voice, music or SFX generation, but the story and project layers must never depend on a vendor SDK or API response shape.

## Long-form production model

`idea -> story bible -> acts -> sequences -> scenes -> shots -> assets -> assembly -> QC -> master`

A 60-minute project is treated as a graph of independently addressable production units. A failed shot must be retryable without regenerating the movie.

## Continuity model

Every shot may consume a continuity snapshot and emit a new snapshot. The snapshot can contain character appearance/state, wardrobe, props, location state, time-of-day, lighting, camera continuity and unresolved story facts.

Continuity data is versioned and serializable. Never depend on JavaScript `Map`/`Set` objects as the persisted project format.

## Provider boundary

Provider credentials belong only in a trusted server/worker environment. Browser code receives opaque job IDs and safe status/asset metadata. Never place API keys, provider tokens or secret signing material in HTML, CSS, client JavaScript, exported project files or logs.

## Resumability

Every long-running operation should have:

- stable job ID
- idempotency key
- input fingerprint
- provider/model version
- attempt count
- checkpoint/status
- output asset IDs
- structured error code

Retries must not create duplicate logical assets.

## Versioning and migrations

Project schemas, shot contracts and provider capability contracts carry explicit versions. Breaking changes require a migration rather than silently changing old projects.

## Quality gates

No final render should be considered complete until required technical checks pass and story/continuity checks are not blocking. Quality scores are diagnostics; deterministic validation is the release gate.

## $0-first strategy

The core planner, project format, validation, prompt compilation and local asset management remain usable without paid APIs. Optional generation providers are adapters. Local/open models can be introduced later without changing the public project contracts.
