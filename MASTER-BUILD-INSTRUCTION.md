# AI Video Maker — Master Build Instruction

This document is the canonical build specification for this repository.

## Mission
Transform the existing repository into a production-ready, all-in-one, cross-platform AI Video Maker. Inspect and preserve existing working functionality; do not rebuild from zero.

## Non-destructive hard rules
- Preserve existing projects, media, models, workflows, configuration, and Git history.
- Never force-push, destructive-reset, or delete working branches/files as a shortcut.
- Never automatically delete or overwrite user files or models.
- Never recursively delete arbitrary directories.
- Never disable antivirus/firewall/security protections.
- Never modify drivers, registry, or system configuration unnecessarily.
- Never require administrator/root privileges unless technically unavoidable.
- Never expose local services publicly by default; local bridge is loopback-only.
- Never execute arbitrary shell commands from prompts, workflows, downloads, or remote responses.
- Never silently upload user content.
- Never create unlimited retry/restart/resource-consumption loops.
- Destructive or irreversible operations require explicit authorization.
- Safe, reversible engineering changes should proceed without unnecessary permission requests.

## Product flow
OPEN → CREATE PROJECT → STORY → CHARACTER LOCK → WORLD LOCK → SCENES → IMAGES → IMAGE-TO-VIDEO → VOICE/AUDIO → QC → IMPROVE → ASSEMBLE → SHORTS → YOUTUBE METADATA → EXPORT.

## Architecture
Use a platform-neutral core with adapters for image, video, voice, audio, enhancement, transcription, and export engines. ComfyUI/Wan is an engine/provider, not the product itself. Keep the existing local bridge and ComfyUI integration behind stable interfaces so another engine can be added without rewriting the app.

## Platforms
Target Windows, macOS, Linux, Android, iPhone/iPad, modern browsers, and PWA. Desktop can act as a local AI worker. Mobile is a first-class creator/control/review client and may delegate heavy inference to a desktop/local or explicitly selected remote worker.

## Local worker/bridge
Provide safe start/stop, health checks, capability detection, model detection, job queue, persistence, progress, cancellation, bounded retry, crash containment, resource monitoring, and result management. Keep network access loopback-only by default. No arbitrary shell execution.

## Device safety
Before heavy generation, check GPU/VRAM, RAM, CPU, disk, OS/runtime compatibility, model requirements, and expected workload. Use conservative defaults for concurrency, memory, disk, timeout, and queue limits. If unsafe, block generation and explain safer alternatives. Detect OOM/access violations/segmentation faults/native crashes; stop and preserve completed work rather than looping.

## Storage safety
Use dedicated application-managed directories for app data, models, projects, generated media, cache, logs, and temporary files. Use safe path resolution, traversal prevention, atomic writes, versioned metadata, collision-safe names, and resumable work. Never delete user media automatically. Cleanup only application-managed data and only with clear user intent.

## Model manager
Detect installed models, requirements, versions, sizes, compatibility, missing/corrupt state, and duplicates. Support explicit, resumable downloads and integrity verification when available. Never silently delete or overwrite verified models.

## Character Lock
First-class project entity containing canonical name, reference images, appearance, clothing, colors, proportions, personality, style, constraints, and continuity notes. Pass resolved character data to every relevant generation request without allowing engines to mutate the canonical definition.

## World Lock
First-class environment definition containing setting, architecture/geography, palette, lighting, atmosphere, recurring objects, style, time/season, and continuity rules. Pass resolved world data to relevant scenes.

## Continuity
Track character appearance, clothing, props, environment, camera, lighting, colors, scene progression, and reusable references. Cache approved assets and avoid unnecessary regeneration.

## Production pipeline
Idea → story → script → locks → storyboard → scene plan → keyframes → image-to-video → voice → music/SFX → QC → improvement → assembly. Version every stage and resume from failed stages rather than regenerating everything.

## Image/video
Support text-to-image, reference-image generation, seeds where supported, negative prompts, 9:16/16:9/1:1, and image-to-video with start image, optional end image, motion/camera prompts, duration, FPS, resolution, and continuity context. Split long productions into manageable shots based on hardware.

## Audio
Support narration, character voices, dialogue, music, SFX, ambience, and synchronization. Local-first; remote providers are opt-in.

## QC and improvement
Check missing/broken media, aspect ratio, duration mismatch, silence, corruption, scene order, black frames, duplicate frames, and detectable continuity errors. Return PASS/WARNING/FAIL with actionable fixes. Improvements create new versions; do not destroy originals.

## Assembly/export
Use an engine abstraction for FFmpeg or equivalent. Support scene ordering, transitions, audio, captions, intro/outro, resolution, FPS, loudness normalization, export presets, and upload-ready packages. FFmpeg/runtime should be isolated or bundled where legally and technically appropriate.

## YouTube/Shorts
Support 9:16 Shorts, captions, clean audio, batch production, and generated title, description, tags/keywords, hashtags, filename, and metadata package. Do not auto-upload unless explicitly enabled and authorized.

## Mobile/PWA
Provide project creation/editing, reference upload, locks, scenes, generation requests, progress, review/approval, export, resumable transfer, and reconnection without losing state. Keep UI touch-friendly and platform-neutral.

## Project format
Use a portable, versioned format containing metadata, story/script, characters, worlds, scenes/shots, prompts, references, assets, approvals, versions, audio, metadata, and export settings. Add safe migrations; never silently corrupt or replace projects.

## Security/privacy
Protect against path traversal, command injection, malicious workflows, unsafe downloads, arbitrary code execution, unauthorized bridge access, credential leakage, and accidental public exposure. Prompt text is never code. Keep user media local unless a user explicitly selects a remote provider; clearly identify when data leaves the device. Never expose secrets to the browser unnecessarily.

## Cost
Optimize for a $0 local workflow when hardware permits. Paid/cloud providers are optional, never mandatory for the core product.

## UX
Make the main experience CREATE, EDIT, GENERATE, REVIEW, EXPORT. Put technical diagnostics under Advanced/Diagnostics. Errors must explain what happened, what is safe, and what the user can do next.

## Testing
Automate tests for project lifecycle/migration, path safety, storage limits, low RAM, unsupported GPU, model errors, interrupted downloads, queue/cancel/retry behavior, native crash/OOM handling, worker restart, app restart, media corruption, assembly, mobile reconnect, and uninstall safety. A failed safety check blocks release.

## Git workflow
Use feature branches for major changes. Keep `main` protected and untouched until verified. Make small, descriptive commits. Never rewrite history or force-push as a shortcut.

## Definition of done
Do not call a feature complete because files, endpoints, placeholders, or mocks exist. The real user journey must work: open app → device check → project → story → character/world locks → scenes → reference images → image-to-video → job monitoring/recovery → voice/audio → assembly → QC → improvement → Shorts → YouTube metadata → export → reopen without loss.

## Execution protocol
1. Inspect the whole repository before changing architecture.
2. Map existing working features and dependencies.
3. Identify gaps and conflicts with this specification.
4. Preserve working functionality.
5. Implement the highest-value missing subsystem.
6. Test it.
7. Continue incrementally through the roadmap.
8. Fix regressions before advancing.
9. Do not stop at documentation or placeholders.
10. Report exactly what was implemented and tested.

### Priority
Safety → Reliability → Core generation → Character/World consistency → UX → Performance → Cross-platform → Automation → Advanced features.

### Operating rule
SAFE + REVERSIBLE → proceed.
DESTRUCTIVE + IRREVERSIBLE → stop and request explicit authorization.
Existing works → preserve it.
Existing can be improved → improve it safely.
Fragile engine → isolate it.
Crash → contain it.
Insufficient hardware → refuse unsafe generation and offer a safer route.
Unfinished → do not pretend finished.

BUILD FORWARD. BUILD SAFELY. BUILD THE COMPLETE PRODUCT.
