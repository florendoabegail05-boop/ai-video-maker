# Long-Form Movie Engine

Future-facing orchestration layer for projects from short videos through feature-length productions.

## Design goals

- Story-first: premise -> acts -> sequences -> scenes -> shots.
- Continuity-first: durable character, location, style and plot state.
- Provider-neutral: generation models are adapters, not application dependencies.
- Resumable: every shot/asset is independently addressable and can be retried.
- Quality-gated: a project is not render-ready until story and shot contracts pass validation.
- Security-conscious: provider secrets belong behind a server boundary; never ship them to the browser.
- Versioned: schemas use explicit versions so future migrations can be introduced safely.

## Planned production layers

1. Story planner and screenplay compiler
2. Character/world/style bible
3. Continuity graph and shot handoff compiler
4. Image/video/voice/music/SFX provider adapters
5. Render queue with retries and checkpoints
6. Timeline/FFmpeg assembly adapter
7. Audio mix and caption pipeline
8. Scene/act/movie QC
9. Export profiles for Shorts, social video and long-form 16:9

This directory intentionally contains orchestration contracts rather than provider credentials or proprietary model weights.
