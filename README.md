# AI Video Maker

A zero-cost, local-first video production studio designed to grow from Shorts to long-form films without locking the product to one AI provider.

## What it does today

- Hook and short-form script generation
- 5-second scene breakdowns for 30/45/60 second videos
- Image and motion/video prompts
- Character/environment/style continuity guidance
- Story-first shot structure and quality checks
- Reusable local projects and profiles
- Editable scene cards with reorder/delete controls
- Voiceover option
- Platform-aware publishing metadata
- 10 idea variations
- TXT and JSON export
- Responsive mobile-friendly interface
- Installable/offline-ready PWA foundation

## Long-form foundation

The repository now includes a provider-neutral movie engine foundation for projects from short videos through feature-length productions. The target workflow is:

**IDEA → STORY BIBLE → ACTS → SEQUENCES → SCENES → SHOTS → ASSETS → ASSEMBLY → QC → MASTER**

The movie layer includes versioned contracts, long-form story planning, persistent continuity state, shot handoffs, movie-level QC, render manifests and resumable media jobs. See `docs/ARCHITECTURE.md` and `movie-engine/`.

## Zero-budget architecture

The core product remains usable as a static HTML + CSS + vanilla JavaScript application with no paid API, framework, database or build step required. Planning, contracts and validation run locally in the browser.

Actual high-quality AI generation may require local compute or an optional external provider. Providers are adapters rather than application dependencies, so a future open/local model can replace a hosted provider without changing the project format or story engine.

## Security principles

- No secrets or API keys in frontend code.
- Secret-bearing providers belong behind a trusted server/worker boundary.
- No third-party scripts, fonts, analytics or trackers by default.
- Content Security Policy remains restrictive.
- User content is escaped before generated HTML insertion.
- Local project data stays under user control unless explicitly exported.
- Provider endpoints must use HTTPS.
- Media jobs support idempotency/checkpoints so retries do not require destructive regeneration.
- CI and CodeQL validate changes before production branches are updated.

## Quality pipeline

**IDEA → STORY → CHARACTER LOCK → WORLD LOCK → STYLE LOCK → STORYBOARD → SHOT DIRECTOR → IMAGE PROMPT → VIDEO/MOTION PROMPT → CONTINUITY HANDOFF → AUDIO PLAN → QC → ASSEMBLY → FINAL QC → EXPORT**

Quality scores are diagnostics; deterministic contract validation is the release gate.

## Future media stack

Provider-neutral capabilities are planned for image, video, voice, music/audio, SFX, captions and final assembly. The system is intentionally designed so generation models and vendors can be changed independently of story, continuity, project data and UI.

## Roadmap

1. Strengthen story diagnostics and genre-specific structures.
2. Build character/world/style bible tooling.
3. Add richer scene and shot generation with continuity-aware handoffs.
4. Add secure optional provider adapters.
5. Add resumable render queues and asset lineage.
6. Add local/open model integrations where practical on $0 hardware.
7. Add FFmpeg-based assembly, audio mix and captions.
8. Add scene/act/movie quality gates and export profiles.
9. Validate with real creator workflows and improve from measured failures.

## Run

Open `index.html` in a modern browser or deploy the repository as a static site. No installation is required.
